from types import SimpleNamespace
from unittest.mock import Mock, patch

import requests
from django.core.cache import cache
from django.test import SimpleTestCase, override_settings

from apps.catalogo import ia


def respuesta(datos, status=200):
    resultado = Mock(spec=requests.Response)
    resultado.ok = 200 <= status < 300
    resultado.status_code = status
    resultado.json.return_value = datos
    return resultado


@override_settings(
    REPLICATE_API_TOKEN='replicate-test-only',
    CACHES={'default': {'BACKEND': 'django.core.cache.backends.locmem.LocMemCache'}},
)
class SugerenciaCLIPTests(SimpleTestCase):
    def setUp(self):
        cache.clear()
        self.url = 'https://res.cloudinary.com/example/image/upload/foto.jpg'
        self.categorias = [
            SimpleNamespace(pk=700, nombre='Tecnología y accesorios', descripcion=''),
            SimpleNamespace(pk=12, nombre='FERRETERÍA', descripcion=''),
            SimpleNamespace(pk=501, nombre='Panadería y repostería', descripcion=''),
        ]

    def completada(self, puntuaciones=None):
        return respuesta({'id': 'prediction-test', 'status': 'succeeded', 'output': puntuaciones or [0.05, 0.9, 0.05]})

    @patch('apps.catalogo.ia.requests.post')
    def test_compara_categorias_por_orden_y_conserva_contrato(self, post):
        post.return_value = self.completada()
        resultado = ia.sugerir_categoria(self.url, self.categorias)
        self.assertIs(resultado['categoria'], self.categorias[1])
        self.assertEqual(resultado['confianza'], 90)
        self.assertEqual(resultado['etiquetas'][0], {'nombre': 'FERRETERÍA', 'confianza': 90})
        llamada = post.call_args
        self.assertEqual(llamada.args, (ia.API_URL,))
        self.assertEqual(llamada.kwargs['json']['input']['image'], self.url)
        descripciones = llamada.kwargs['json']['input']['text'].split('|')
        self.assertIn('consumer electronics', descripciones[0])
        self.assertIn('padlock', descripciones[1])
        self.assertIn('bread', descripciones[2])
        self.assertEqual(llamada.kwargs['json']['version'], ia.VERSION_CLIP)
        self.assertFalse(llamada.kwargs['allow_redirects'])

    def test_categoria_nueva_no_inyecta_otro_candidato(self):
        categoria = SimpleNamespace(pk=55, nombre='Sports | Equipment', descripcion='Sports products | bicycles')
        descripcion = ia._descripcion_categoria(categoria)
        self.assertIn('Sports products', descripcion)
        self.assertNotIn('|', descripcion)

    @patch('apps.catalogo.ia.requests.post')
    def test_repetir_consulta_reutiliza_resultado_sin_otro_cobro(self, post):
        post.return_value = self.completada()
        primero = ia.sugerir_categoria(self.url, self.categorias)
        segundo = ia.sugerir_categoria(self.url, self.categorias)
        self.assertEqual(primero, segundo)
        post.assert_called_once()

    @patch('apps.catalogo.ia.requests.post')
    def test_cambiar_imagen_o_categorias_invalida_cache(self, post):
        post.return_value = self.completada()
        ia.sugerir_categoria(self.url, self.categorias)
        ia.sugerir_categoria(self.url + '?v=2', self.categorias)
        self.categorias[1].nombre = 'Herramientas'
        ia.sugerir_categoria(self.url, self.categorias)
        self.assertEqual(post.call_count, 3)

    @patch('apps.catalogo.ia.requests.post')
    def test_reordenar_categorias_no_reutiliza_scores_en_otro_orden(self, post):
        post.side_effect = [self.completada(), self.completada([0.9, 0.05, 0.05])]
        primero = ia.sugerir_categoria(self.url, self.categorias)
        segundo = ia.sugerir_categoria(self.url, [self.categorias[1], self.categorias[0], self.categorias[2]])
        self.assertIs(primero['categoria'], segundo['categoria'])
        self.assertEqual(post.call_count, 2)

    def test_consulta_simultanea_no_crea_segunda_inferencia(self):
        def analizar(url, descripciones):
            with self.assertRaisesMessage(ia.ServicioIANoDisponible, 'ya se está analizando'):
                ia.sugerir_categoria(self.url, self.categorias)
            return [0.05, 0.9, 0.05]

        with patch('apps.catalogo.ia._clasificar_imagen', side_effect=analizar) as clasificar:
            resultado = ia.sugerir_categoria(self.url, self.categorias)
        self.assertIs(resultado['categoria'], self.categorias[1])
        clasificar.assert_called_once()

    @patch('apps.catalogo.ia.requests.post')
    def test_no_consume_api_sin_categorias(self, post):
        with self.assertRaisesMessage(ia.ServicioIANoDisponible, 'No hay categorías'):
            ia.sugerir_categoria(self.url, [])
        post.assert_not_called()

    @patch('apps.catalogo.ia.requests.post')
    def test_rechaza_url_invalida_antes_de_consumir_api(self, post):
        for url in ('/foto.jpg', 'file:///foto.jpg', 'data:image/jpeg;base64,x', 'https://user:password@example.test/foto'):
            with self.subTest(url=url), self.assertRaisesMessage(ia.ServicioIANoDisponible, 'URL pública'):
                ia.sugerir_categoria(url, self.categorias)
        post.assert_not_called()

    @override_settings(REPLICATE_API_TOKEN='')
    @patch('apps.catalogo.ia.requests.post')
    def test_sin_token_no_crea_inferencia(self, post):
        with self.assertRaisesMessage(ia.ServicioIANoDisponible, 'token de Replicate'):
            ia.sugerir_categoria(self.url, self.categorias)
        post.assert_not_called()

    @patch('apps.catalogo.ia.requests.post')
    def test_errores_proveedor_no_filtran_respuesta_ni_reintentan(self, post):
        for status, mensaje in ((401, 'token'), (403, 'token'), (402, 'saldo'), (429, 'límite'), (500, 'Intenta más tarde')):
            with self.subTest(status=status):
                post.reset_mock()
                post.return_value = respuesta({'detail': 'private-provider-debug'}, status)
                with self.assertRaisesMessage(ia.ServicioIANoDisponible, mensaje) as error:
                    ia.sugerir_categoria(self.url, self.categorias)
                self.assertNotIn('private-provider-debug', str(error.exception))
                post.assert_called_once()

    @patch('apps.catalogo.ia.time.sleep')
    @patch('apps.catalogo.ia.requests.get')
    @patch('apps.catalogo.ia.requests.post')
    def test_prediccion_asincrona_consulta_id_sin_recrear_ni_seguir_url_externa(self, post, get, dormir):
        post.return_value = respuesta({
            'id': 'prediction-test', 'status': 'starting', 'urls': {'get': 'https://untrusted.example/prediction'},
        }, 201)
        get.side_effect = [respuesta({'status': 'processing'}), self.completada()]
        resultado = ia.sugerir_categoria(self.url, self.categorias)
        self.assertIs(resultado['categoria'], self.categorias[1])
        post.assert_called_once()
        self.assertEqual(get.call_count, 2)
        for llamada in get.call_args_list:
            self.assertEqual(llamada.args, (f'{ia.API_URL}/prediction-test',))
            self.assertEqual(llamada.kwargs['headers']['Authorization'], 'Bearer replicate-test-only')
            self.assertFalse(llamada.kwargs['allow_redirects'])

    @patch('apps.catalogo.ia.requests.post')
    def test_fallo_del_modelo_no_cachea_ni_divulga_logs(self, post):
        post.side_effect = [respuesta({'id': 'prediction-test', 'status': 'failed', 'error': 'private-log'}), self.completada()]
        with self.assertRaisesMessage(ia.ServicioIANoDisponible, 'Verifica que la foto') as error:
            ia.sugerir_categoria(self.url, self.categorias)
        self.assertNotIn('private-log', str(error.exception))
        self.assertIs(ia.sugerir_categoria(self.url, self.categorias)['categoria'], self.categorias[1])
        self.assertEqual(post.call_count, 2)

    @patch('apps.catalogo.ia.requests.post')
    def test_scores_invalidos_no_se_convierten_en_sugerencia(self, post):
        for scores in ([0.5], [0, 0, 0], [float('nan'), 0.5, 0.5], [float('inf'), 0.5, 0.5], [True, 0, 0], [-0.1, 0.5, 0.6], [1.1, 0, 0], ['0.9', 0.05, 0.05], None):
            with self.subTest(scores=scores):
                post.return_value = respuesta({'status': 'succeeded', 'output': scores})
                with self.assertRaisesMessage(ia.ServicioIANoDisponible, 'puntuaciones válidas'):
                    ia.sugerir_categoria(self.url, self.categorias)

    @patch('apps.catalogo.ia.requests.post')
    def test_json_invalido_se_convierte_en_error_controlado(self, post):
        post.return_value = respuesta(None)
        post.return_value.json.side_effect = ValueError('private-debug')
        with self.assertRaisesMessage(ia.ServicioIANoDisponible, 'respuesta inválida'):
            ia.sugerir_categoria(self.url, self.categorias)

    @patch('apps.catalogo.ia.requests.post')
    def test_prediccion_sin_id_o_con_id_inseguro_no_envia_token_a_otra_url(self, post):
        for identificador in (None, '../other', 'https://example.test'):
            with self.subTest(identificador=identificador):
                post.reset_mock()
                post.return_value = respuesta({'id': identificador, 'status': 'processing'})
                with self.assertRaisesMessage(ia.ServicioIANoDisponible, 'estado de análisis inválido'):
                    ia.sugerir_categoria(self.url, self.categorias)
                post.assert_called_once()

    @patch('apps.catalogo.ia.time.monotonic', side_effect=[0, 61])
    @patch('apps.catalogo.ia.requests.post')
    def test_agotar_tiempo_cancela_inferencia_sin_crear_otra(self, post, reloj):
        post.side_effect = [respuesta({'id': 'prediction-test', 'status': 'processing'}), respuesta({'status': 'canceled'})]
        with self.assertRaisesMessage(ia.ServicioIANoDisponible, 'tardó demasiado'):
            ia.sugerir_categoria(self.url, self.categorias)
        self.assertEqual([llamada.args[0] for llamada in post.call_args_list], [ia.API_URL, f'{ia.API_URL}/prediction-test/cancel'])
        self.assertEqual(post.call_args_list[0].kwargs['headers']['Cancel-After'], '60s')

    @patch('apps.catalogo.ia.requests.post')
    def test_error_red_no_reintenta_y_libera_marca_pendiente(self, post):
        post.side_effect = [requests.Timeout('private-debug'), self.completada()]
        with self.assertRaisesMessage(ia.ServicioIANoDisponible, 'comunicación con Replicate'):
            ia.sugerir_categoria(self.url, self.categorias)
        self.assertEqual(post.call_count, 1)
        self.assertIs(ia.sugerir_categoria(self.url, self.categorias)['categoria'], self.categorias[1])

    @patch('apps.catalogo.ia.time.sleep')
    @patch('apps.catalogo.ia.requests.get', side_effect=requests.Timeout('private-debug'))
    @patch('apps.catalogo.ia.requests.post')
    def test_perder_conexion_durante_consulta_cancela_prediccion_conocida(self, post, get, dormir):
        post.side_effect = [respuesta({'id': 'prediction-test', 'status': 'processing'}), respuesta({'status': 'canceled'})]
        with self.assertRaisesMessage(ia.ServicioIANoDisponible, 'comunicación con Replicate'):
            ia.sugerir_categoria(self.url, self.categorias)
        self.assertEqual(post.call_count, 2)
        self.assertEqual(post.call_args.args, (f'{ia.API_URL}/prediction-test/cancel',))
