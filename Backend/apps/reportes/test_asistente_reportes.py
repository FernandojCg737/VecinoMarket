from datetime import date
from types import SimpleNamespace
from unittest.mock import Mock, patch

from django.test import SimpleTestCase
from rest_framework.test import APIRequestFactory, force_authenticate

from .clasificador_reportes import clasificar
from .periodos_consulta import reconocer_periodo
from .views import AsistenteVozReportesView


class PeriodosConsultaTests(SimpleTestCase):
    def test_periodos_relativos_y_absolutos(self):
        hoy = date(2026, 11, 22)
        casos = (
            ('ventas de ayer', date(2026, 11, 21), date(2026, 11, 21)),
            ('ventas del mes pasado', date(2026, 10, 1), date(2026, 10, 31)),
            ('ventas de la semana anterior', date(2026, 11, 9), date(2026, 11, 15)),
            ('del 1 al 15 de octubre', date(2026, 10, 1), date(2026, 10, 15)),
            ('del 25 de octubre al 2 de noviembre', date(2026, 10, 25), date(2026, 11, 2)),
            ('del 1 al 29 de febrero de 2024', date(2024, 2, 1), date(2024, 2, 29)),
            ('desde 2026-01-01 hasta 15/01/2026', date(2026, 1, 1), date(2026, 1, 15)),
            ('los últimos 14 días', date(2026, 11, 9), hoy),
        )
        for texto, inicio, fin in casos:
            with self.subTest(texto=texto):
                self.assertEqual(reconocer_periodo(texto, hoy), (inicio, fin))
        self.assertEqual(reconocer_periodo('inventario', hoy), (None, None))

    def test_fechas_invalidas_y_rangos_invertidos(self):
        for texto in ('del 31 al 35 de octubre', 'entre 2026-05-05 y 2026-01-10', 'últimos 0 días'):
            with self.subTest(texto=texto), self.assertRaises(ValueError):
                reconocer_periodo(texto, date(2026, 11, 22))


class AsistenteReportesTests(SimpleTestCase):
    def pedir(self, cuerpo, *, rol='ADMIN', permisos=(), empresa=None):
        request = APIRequestFactory().post('/reportes/asistente-voz/', cuerpo, format='json')
        gestor = Mock()
        gestor.values_list.return_value = permisos
        usuario = SimpleNamespace(
            pk=1,
            is_authenticated=True,
            es_admin=lambda: rol in ('ADMIN', 'SUPERADMIN'),
            es_empresa=lambda: rol == 'EMPRESA',
            es_empleado=lambda: rol == 'EMPLEADO',
            get_empresa=lambda: empresa,
            empleado=SimpleNamespace(permisos=gestor),
        )
        force_authenticate(request, user=usuario)
        return AsistenteVozReportesView.as_view()(request)

    @patch('apps.reportes.views.asistente_reportes.consultar', return_value='Respuesta calculada')
    @patch('apps.reportes.views.timezone.localdate', return_value=date(2026, 11, 22))
    def test_ml_clasifica_y_aplica_periodo_a_la_consulta(self, _, consultar):
        res = self.pedir({'pregunta': '¿Cuánto vendimos ayer?', 'modo': 'ml'})
        self.assertEqual(res.status_code, 200, res.data)
        self.assertEqual(res.data['intencion'], 'ventas')
        self.assertEqual(res.data['fecha_inicio'], '2026-11-21')
        consultar.assert_called_once_with('ventas', None, date(2026, 11, 21), date(2026, 11, 21))

    @patch('apps.reportes.views.clasificador_reportes.clasificar')
    @patch('apps.reportes.views.asistente_reportes.consultar', return_value='Respuesta calculada')
    def test_reglas_sigue_siendo_el_modo_por_defecto(self, consultar, clasificador):
        res = self.pedir({'pregunta': '¿Cuánto se vendió en total?'})
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['modo'], 'reglas')
        self.assertEqual(res.data['dataset'], 'pedidos')
        consultar.assert_called_once_with('ventas', None, None, None)
        clasificador.assert_not_called()

    @patch('apps.reportes.views.asistente_reportes.consultar')
    def test_ml_rechaza_una_pregunta_fuera_de_alcance_sin_consulta(self, consultar):
        res = self.pedir({'pregunta': '¿Cómo estará el clima mañana?', 'modo': 'ml'})
        self.assertEqual(res.status_code, 200)
        self.assertIsNone(res.data['intencion'])
        self.assertIsNone(res.data['dataset'])
        consultar.assert_not_called()

    @patch('apps.reportes.views.asistente_reportes.consultar')
    def test_empresa_y_empleado_no_consultan_datos_globales(self, consultar):
        empresa = SimpleNamespace(id=10)
        for modo in ('reglas', 'ml'):
            for rol in ('EMPRESA', 'EMPLEADO'):
                with self.subTest(modo=modo, rol=rol):
                    res = self.pedir(
                        {'pregunta': '¿Qué empresa vende más?', 'modo': modo},
                        rol=rol, empresa=empresa, permisos=['ver_reportes'],
                    )
                    self.assertEqual(res.status_code, 403, res.data)
        consultar.assert_not_called()

    @patch('apps.reportes.views.asistente_reportes.consultar', return_value='Datos de tu empresa')
    def test_empleado_respeta_su_empresa_y_permiso_por_dataset(self, consultar):
        empresa = SimpleNamespace(id=10)
        pregunta = {'modo': 'ml', 'empresa': 12, 'pregunta': '¿Cuánto se vendió en total?'}
        res = self.pedir(pregunta, rol='EMPLEADO', permisos=['gestionar_productos'], empresa=empresa)
        self.assertEqual(res.status_code, 403)
        consultar.assert_not_called()
        res = self.pedir(pregunta, rol='EMPLEADO', permisos=['gestionar_pedidos'], empresa=empresa)
        self.assertEqual(res.status_code, 200)
        consultar.assert_called_once_with('ventas', empresa, None, None)

    @patch('apps.reportes.views.asistente_reportes.consultar')
    def test_ml_no_presenta_inventario_actual_como_historico(self, consultar):
        res = self.pedir({'pregunta': 'Muéstrame el inventario general de ayer', 'modo': 'ml'})
        self.assertEqual(res.data['intencion'], 'inventario')
        self.assertIsNone(res.data['dataset'])
        self.assertIn('estado actual', res.data['respuesta'])
        consultar.assert_not_called()

    @patch('apps.reportes.views.clasificador_reportes.clasificar', side_effect=OSError)
    def test_modelo_ausente_reporta_el_fallo_sin_cambiar_de_modo(self, _):
        res = self.pedir({'pregunta': 'Ventas de ayer', 'modo': 'ml'})
        self.assertEqual(res.status_code, 503)
        self.assertIn('no está disponible', res.data['detail'])

    def test_datos_invalidos_y_rol_comprador(self):
        for cuerpo in (
            ['ventas'], {'pregunta': ['ventas']}, {'pregunta': 'x' * 501}, {'pregunta': 'ventas', 'modo': 'otro'},
        ):
            with self.subTest(cuerpo=cuerpo):
                self.assertEqual(self.pedir(cuerpo).status_code, 400)
        self.assertEqual(self.pedir({'pregunta': 'ventas'}, rol='COMPRADOR').status_code, 403)

    def test_modelo_distingue_consultas_cortas_y_de_dominio(self):
        self.assertEqual(clasificar('¿Cuál es el producto más vendido?'), 'producto_mas_vendido')
        self.assertEqual(clasificar('¿Cuánto se vendió en total?'), 'ventas')
        self.assertEqual(clasificar('Ventas de ayer'), 'ventas')
        self.assertEqual(clasificar('Stock actual'), 'inventario')
        self.assertEqual(clasificar('¿Qué empresa vende más?'), 'empresa_lider')
        self.assertIsNone(clasificar('¿Cómo estará el clima mañana?'))
        self.assertIsNone(clasificar('Haz una devolución al cliente'))
        self.assertIsNone(clasificar('Modifica el precio de un artículo'))
