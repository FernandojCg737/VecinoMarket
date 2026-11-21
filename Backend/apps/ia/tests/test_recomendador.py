import math
from datetime import timedelta
from io import StringIO

from django.core.management import call_command
from django.db import connection
from django.test import TestCase
from django.test.utils import CaptureQueriesContext
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient

from apps.catalogo.models import Producto
from apps.ia import datos, recomendaciones, recomendador
from apps.ia.models import EventoInteraccion, SimilitudProducto
from apps.reportes.models import RecomendacionIA

from . import fabricas as f


def sim(modelo, a, b):
    idx = modelo.indice_producto()
    return modelo.S[idx[a.id], idx[b.id]]


class MotorHibridoTests(TestCase):
    """recomendador.py: colaborativo + contenido, top-K, sin matriz densa."""

    def setUp(self):
        self.empresa = f.empresa()
        self.cat_a, self.cat_b = f.categoria('Panadería'), f.categoria('Ferretería')

    def test_colaborativo_acerca_lo_que_miran_los_mismos_compradores(self):
        pan = f.producto(self.empresa, self.cat_a, nombre='Pan integral')
        torta = f.producto(self.empresa, self.cat_a, nombre='Torta de chocolate')
        martillo = f.producto(self.empresa, self.cat_b, nombre='Martillo')
        candado = f.producto(self.empresa, self.cat_b, nombre='Candado')
        for _ in range(4):
            c = f.comprador()
            f.evento(c, pan)
            f.evento(c, martillo, 'CARRITO')
        f.evento(f.comprador(), torta)
        modelo = recomendador.entrenar()
        self.assertGreater(sim(modelo, pan, martillo), sim(modelo, pan, torta))
        self.assertGreater(sim(modelo, pan, martillo), sim(modelo, pan, candado))
        self.assertEqual(modelo.S.diagonal().sum(), 0)  # nunca "similar a sí mismo"
        self.assertLessEqual(modelo.S.max(), 1.0)

    def test_contenido_funciona_sin_interacciones(self):
        cafe = f.producto(self.empresa, self.cat_a, nombre='Café molido orgánico', descripcion='Café de altura')
        grano = f.producto(self.empresa, self.cat_a, nombre='Café en grano orgánico', descripcion='Tostado medio')
        martillo = f.producto(self.empresa, self.cat_b, nombre='Martillo de acero')
        modelo = recomendador.entrenar()
        self.assertGreater(sim(modelo, cafe, grano), 0)
        self.assertGreater(sim(modelo, cafe, grano), sim(modelo, cafe, martillo))
        # Solo contenido: como mucho el 30 % del híbrido.
        self.assertLessEqual(sim(modelo, cafe, grano), recomendador.PESO_CONTENIDO + 1e-9)

    def test_top_k_por_producto(self):
        productos = [f.producto(self.empresa, self.cat_a, nombre=f'Pan especial {i}') for i in range(6)]
        modelo = recomendador.entrenar(top_vecinos=2)
        por_fila = (modelo.S > 0).sum(axis=1)
        self.assertEqual(int(por_fila.max()), 2)
        self.assertEqual(modelo.S.shape, (len(productos), len(productos)))

    def test_shrinkage_castiga_pares_con_un_solo_comprador_en_comun(self):
        a, b = f.producto(self.empresa, self.cat_a, nombre='Alfa'), f.producto(self.empresa, self.cat_b, nombre='Beta')
        c, d = f.producto(self.empresa, self.cat_a, nombre='Gamma'), f.producto(self.empresa, self.cat_b, nombre='Delta')
        solo = f.comprador()
        f.evento(solo, a)
        f.evento(solo, b)
        for _ in range(5):
            u = f.comprador()
            f.evento(u, c)
            f.evento(u, d)
        modelo = recomendador.entrenar()
        # Ambos pares tienen coseno 1.0, pero el de 5 compradores pesa más.
        self.assertGreater(sim(modelo, c, d), sim(modelo, a, b))

    def test_peso_con_decaimiento(self):
        ahora = timezone.now()
        self.assertAlmostEqual(datos.peso_decaido('VISTA', ahora - timedelta(days=30), ahora), math.exp(-1), places=6)
        self.assertAlmostEqual(datos.peso_decaido('CARRITO', ahora, ahora), 3.0)
        self.assertAlmostEqual(datos.peso_decaido('COMPRA', ahora, ahora), 5.0)


class RecomendacionesCompradorTests(TestCase):
    def setUp(self):
        self.empresa = f.empresa()
        self.sin_ia = f.empresa('PRUEBA')
        self.cat = f.categoria('Belleza')
        self.base = f.producto(self.empresa, self.cat, nombre='Jabón de miel')
        self.valido = f.producto(self.empresa, self.cat, nombre='Jabón de avena')
        self.comprado = f.producto(self.empresa, self.cat, nombre='Jabón de coco')
        self.agotado = f.producto(self.empresa, self.cat, nombre='Jabón de lavanda', stock=0)
        self.inactivo = f.producto(self.empresa, self.cat, nombre='Jabón de rosas', estado=Producto.Estado.INACTIVO)
        self.de_otra = f.producto(self.sin_ia, self.cat, nombre='Jabón de oliva')
        self.todos = [self.base, self.valido, self.comprado, self.agotado, self.inactivo, self.de_otra]
        # Otros compradores miran todo junto: todos quedan como vecinos de `base`.
        for _ in range(3):
            otro = f.comprador()
            for p in self.todos:
                f.evento(otro, p)
        self.comprador = f.comprador()
        f.evento(self.comprador, self.base, 'CARRITO')
        f.venta(self.comprador, [self.comprado])

    def ids(self, pares):
        return [pid for pid, _ in pares]

    def test_solo_productos_recomendables_y_no_comprados(self):
        modelo = recomendador.entrenar()
        recos = dict(recomendador.recomendar(modelo))[self.comprador.id]
        self.assertIn(self.valido.id, self.ids(recos))
        for excluido in (self.comprado, self.agotado, self.inactivo, self.de_otra):
            self.assertNotIn(excluido.id, self.ids(recos))
        self.assertEqual(recos[0][1], 1.0)  # normalizado: el mejor vale 1
        self.assertTrue(all(0 < s <= 1 for _, s in recos))

    def test_comando_guarda_tablas_y_endpoint_personalizado(self):
        call_command('generar_recomendaciones', stdout=StringIO())
        self.assertTrue(SimilitudProducto.objects.exists())
        self.assertFalse(SimilitudProducto.objects.filter(producto_id=self.base.id, similar_id=self.base.id).exists())
        self.assertTrue(RecomendacionIA.objects.filter(comprador=self.comprador).exists())

        cliente = APIClient()
        cliente.force_authenticate(self.comprador.usuario)
        res = cliente.get(reverse('ia-recomendaciones'), {'limite': 5})
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['estrategia'], recomendaciones.PERSONALIZADA)
        self.assertIsNotNone(res.data['generado_en'])
        primero = res.data['resultados'][0]
        # Solo se excluye lo COMPRADO: lo que tiene en el carrito (base) puede salir.
        personalizados = {r['producto']['id'] for r in res.data['resultados'] if r['score'] > 0}
        self.assertTrue({self.valido.id, self.base.id} <= personalizados)
        self.assertNotIn(self.comprado.id, personalizados)
        self.assertEqual(primero['score'], 1.0)
        self.assertIn('imagenes', primero['producto'])  # misma forma que el catálogo
        self.assertEqual(primero['empresa_reputacion'], {'promedio': None, 'total': 0})

    def test_en_linea_coincide_con_batch(self):
        call_command('generar_recomendaciones', stdout=StringIO())
        batch = list(RecomendacionIA.objects.filter(comprador=self.comprador).order_by('-score', 'producto_id').values_list('producto_id', flat=True))
        en_linea = self.ids(recomendaciones.calcular_para_comprador(self.comprador.id))
        self.assertEqual(batch, en_linea)

    def test_comprador_nuevo_con_historia_se_calcula_en_linea_y_persiste(self):
        call_command('generar_recomendaciones', stdout=StringIO())
        nuevo = f.comprador()
        f.evento(nuevo, self.base)
        self.assertFalse(RecomendacionIA.objects.filter(comprador=nuevo).exists())
        datos_ = recomendaciones.para_comprador(nuevo, limite=3)
        self.assertEqual(datos_['estrategia'], recomendaciones.PERSONALIZADA)
        self.assertTrue(RecomendacionIA.objects.filter(comprador=nuevo).exists())

    def test_filtra_al_leer_lo_que_cambio_desde_la_ultima_corrida(self):
        call_command('generar_recomendaciones', stdout=StringIO())
        Producto.objects.filter(id=self.valido.id).update(estado=Producto.Estado.INACTIVO)
        resultado = recomendaciones.para_comprador(self.comprador, limite=10)
        self.assertNotIn(self.valido.id, [p.id for p, _ in resultado['resultados']])


class ArranqueEnFrioTests(TestCase):
    def setUp(self):
        self.empresa = f.empresa()
        cat = f.categoria()
        self.top, self.segundo, self.viejo, self.cancelado = (
            f.producto(self.empresa, cat, nombre=n) for n in ('Top', 'Segundo', 'Viejo', 'Cancelado')
        )
        c = f.comprador()
        f.venta(c, [self.top], dias_atras=2, cantidad=5)
        f.venta(c, [self.segundo], dias_atras=10, cantidad=2)
        f.venta(c, [self.viejo], dias_atras=60, cantidad=50)       # fuera de los 30 días
        f.venta(c, [self.cancelado], dias_atras=1, cantidad=99, estado='CANCELADO')
        f.venta(c, [self.cancelado], dias_atras=1, cantidad=99, estado_pago='PENDIENTE', estado='PENDIENTE')

    def test_mas_vendidos_de_30_dias_primero_y_ventas_invalidas_no_cuentan(self):
        ranking = [pid for pid, _ in datos.mas_vendidos(4)]
        self.assertEqual(ranking[:2], [self.top.id, self.segundo.id])
        self.assertEqual(ranking[2], self.viejo.id)  # completa con los de siempre
        self.assertEqual(ranking[3], self.cancelado.id)  # y por último sin ventas válidas (score 0)
        scores = dict(datos.mas_vendidos(4))
        self.assertEqual(scores[self.top.id], 1.0)
        self.assertEqual(scores[self.cancelado.id], 0.0)
        self.assertLess(scores[self.viejo.id], scores[self.segundo.id])

    def test_comprador_sin_historia_e_invitado_reciben_populares_sin_persistir(self):
        nuevo = f.comprador()
        cliente = APIClient()
        cliente.force_authenticate(nuevo.usuario)
        for c in (cliente, APIClient()):
            res = c.get(reverse('ia-recomendaciones'))
            self.assertEqual(res.data['estrategia'], recomendaciones.POPULAR)
            self.assertEqual(res.data['resultados'][0]['producto']['id'], self.top.id)
            self.assertIsNone(res.data['generado_en'])
        self.assertFalse(RecomendacionIA.objects.filter(comprador=nuevo).exists())


class SimilaresYCU21Tests(TestCase):
    def setUp(self):
        self.empresa = f.empresa()
        self.cat = f.categoria('Tecnología')
        self.audifonos = f.producto(self.empresa, self.cat, nombre='Audífonos inalámbricos')
        self.parlante = f.producto(self.empresa, self.cat, nombre='Parlante inalámbrico')
        self.funda = f.producto(self.empresa, self.cat, nombre='Funda para laptop')
        self.comprador = f.comprador()
        for p in (self.audifonos, self.parlante):
            f.evento(self.comprador, p)

    def test_similares_precalculados(self):
        call_command('generar_recomendaciones', stdout=StringIO())
        res = APIClient().get(reverse('ia-producto-similares', args=[self.audifonos.id]))
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['estrategia'], recomendaciones.HIBRIDA)
        ids = [r['producto']['id'] for r in res.data['resultados']]
        self.assertNotIn(self.audifonos.id, ids)
        self.assertEqual(ids[0], self.parlante.id)

    def test_producto_nuevo_cae_a_su_categoria(self):
        res = APIClient().get(reverse('ia-producto-similares', args=[self.funda.id]))
        self.assertEqual(res.data['estrategia'], recomendaciones.CATEGORIA)
        self.assertEqual({r['producto']['id'] for r in res.data['resultados']}, {self.audifonos.id, self.parlante.id})
        self.assertEqual(APIClient().get(reverse('ia-producto-similares', args=[999999])).status_code, 404)

    def test_urls_cu21_delegan_al_motor_nuevo_con_la_forma_antigua(self):
        call_command('generar_recomendaciones', stdout=StringIO())
        cliente = APIClient()
        cliente.force_authenticate(self.comprador.usuario)
        with CaptureQueriesContext(connection) as consultas:
            lista = cliente.get(reverse('mis-recomendaciones'))
            generar = cliente.post(reverse('generar-mis-recomendaciones'))
        self.assertFalse(any('fn_generar_recomendaciones' in q['sql'] for q in consultas.captured_queries))
        self.assertEqual(lista.status_code, 200)
        self.assertIn(self.funda.id, [r['producto'] for r in lista.data])
        self.assertTrue({'producto_nombre', 'producto_precio', 'empresa_nombre', 'imagen_url', 'score'} <= set(lista.data[0]))
        self.assertEqual(generar.data['total'], len(generar.data['recomendaciones']))

        empresa = APIClient()
        empresa.force_authenticate(self.empresa.usuario_dueno)
        self.assertEqual(empresa.get(reverse('mis-recomendaciones')).status_code, 403)

    def test_eventos_de_busqueda_no_entran_en_la_matriz(self):
        EventoInteraccion.objects.create(tipo='BUSQUEDA', termino_busqueda='laptop', comprador=self.comprador)
        modelo = recomendador.entrenar()
        self.assertEqual(modelo.R.shape, (1, 3))
