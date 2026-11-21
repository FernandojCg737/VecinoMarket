from django.contrib.gis.geos import Point
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient

from apps.ia import cercania
from apps.inventario.models import InventarioSucursal, Sucursal
from apps.pedidos.models import Pedido
from apps.reportes.models import Valoracion
from apps.usuarios.models import Direccion

from . import fabricas as f

LON, LAT = f.LA_PAZ
KM_LAT = 1 / 111.0  # ~1 km en grados de latitud


def a_km(km):
    """Punto `km` kilómetros al norte del centro de prueba."""
    return (LON, LAT + km * KM_LAT)


class CercaniaTests(TestCase):
    url = reverse('ia-recomendaciones-cercanas')

    def setUp(self):
        self.cat_pan, self.cat_ferre = f.categoria('Panadería'), f.categoria('Ferretería')
        self.emp_a = f.empresa(ubicacion=a_km(1))
        self.emp_b = f.empresa(ubicacion=a_km(4))
        self.suc_a1 = f.sucursal(self.emp_a, a_km(1))
        self.suc_b4 = f.sucursal(self.emp_b, a_km(4))
        self.suc_b8 = f.sucursal(self.emp_b, a_km(8))  # fuera de 5 km
        self.pan = f.producto(self.emp_a, self.cat_pan, nombre='Pan integral', suc=self.suc_a1)
        self.martillo = f.producto(self.emp_b, self.cat_ferre, nombre='Martillo', suc=self.suc_b4)
        self.lejano = f.producto(self.emp_b, self.cat_ferre, nombre='Taladro', suc=self.suc_b8)

        # Ruido que nunca debe aparecer:
        sin_ia = f.empresa('PRUEBA', ubicacion=a_km(1))
        f.producto(sin_ia, self.cat_pan, nombre='Pan de otra empresa', suc=f.sucursal(sin_ia, a_km(1)))
        inactiva = f.sucursal(self.emp_a, a_km(0.5), estado=Sucursal.Estado.INACTIVA)
        f.producto(self.emp_a, self.cat_pan, nombre='Pan de sucursal inactiva', suc=inactiva)
        f.producto(self.emp_a, self.cat_pan, nombre='Pan agotado', stock=0, suc=self.suc_a1)

        self.comprador = f.comprador(ubicacion=f.LA_PAZ)
        self.cliente = APIClient()
        self.cliente.force_authenticate(self.comprador.usuario)

    def get(self, cliente=None, **params):
        return (cliente or self.cliente).get(self.url, params)

    def ids(self, res):
        return [p['producto']['id'] for p in res.data['productos']]

    # -----------------------------------------------------------------
    def test_solo_sucursales_activas_en_el_radio_con_stock_y_empresa_con_ia(self):
        res = self.get(radio_km=5)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(set(self.ids(res)), {self.pan.id, self.martillo.id})
        self.assertIn(self.lejano.id, self.ids(self.get(radio_km=10)))
        self.assertEqual(self.ids(self.get(radio_km=0.5)), [])

    def test_usa_la_sucursal_mas_cercana_con_stock(self):
        suc_b1 = f.sucursal(self.emp_b, a_km(1.5))
        InventarioSucursal.objects.create(producto=self.martillo, sucursal=suc_b1, cantidad_disponible=3)
        item = next(p for p in self.get(radio_km=5).data['productos'] if p['producto']['id'] == self.martillo.id)
        self.assertEqual(item['sucursal']['id'], suc_b1.id)
        self.assertAlmostEqual(item['distancia_km'], 1.5, delta=0.05)
        self.assertEqual(item['stock_sucursal'], 3)

    def test_formula_y_reputacion(self):
        for nota in (5, 3):  # promedio 4 -> 0.8
            orden = f.venta(f.comprador(), [self.pan])
            pedido = Pedido.objects.get(orden_compra=orden)
            Valoracion.objects.create(pedido=pedido, comprador=orden.comprador, empresa=self.emp_a, calificacion=nota)
        res = self.get(radio_km=5)
        por_id = {p['producto']['id']: p for p in res.data['productos']}
        pan, martillo = por_id[self.pan.id], por_id[self.martillo.id]
        self.assertAlmostEqual(pan['componentes']['reputacion'], 0.8)
        self.assertAlmostEqual(martillo['componentes']['reputacion'], cercania.REPUTACION_SIN_RESENAS)
        for item in (pan, martillo):
            c = item['componentes']
            self.assertAlmostEqual(c['cercania'], 1 - item['distancia_km'] / 5, delta=0.002)
            self.assertAlmostEqual(item['score'], 0.5 * c['preferencia'] + 0.3 * c['cercania'] + 0.2 * c['reputacion'], delta=0.0002)

    def test_preferencia_por_categoria_puede_ganarle_a_la_distancia(self):
        # El martillo está más lejos (4 km vs 1 km) pero el comprador vive en Ferretería.
        otro = f.producto(self.emp_b, self.cat_ferre, nombre='Serrucho', suc=self.suc_b4)
        for _ in range(3):
            f.evento(self.comprador, otro, 'CARRITO')
        res = self.get(radio_km=5)
        self.assertEqual(res.data['estrategia'], cercania.PERSONALIZADA)
        ids = self.ids(res)
        self.assertLess(ids.index(self.martillo.id), ids.index(self.pan.id))
        martillo = next(p for p in res.data['productos'] if p['producto']['id'] == self.martillo.id)
        self.assertGreater(martillo['componentes']['preferencia'], 0)

    def test_invitado_usa_popularidad(self):
        f.venta(f.comprador(), [self.martillo], cantidad=4)
        res = self.get(APIClient(), lat=LAT, lng=LON, radio_km=5)
        self.assertEqual(res.data['estrategia'], cercania.POPULAR)
        self.assertEqual(res.data['ubicacion']['fuente'], 'dispositivo')
        martillo = next(p for p in res.data['productos'] if p['producto']['id'] == self.martillo.id)
        self.assertEqual(martillo['componentes']['preferencia'], 1.0)

    def test_emprendedores_agrupados(self):
        res = self.get(radio_km=10)
        # Ordenados por cercanía: A (1 km) antes que B (4 km).
        self.assertEqual([e['empresa']['id'] for e in res.data['emprendedores']], [self.emp_a.id, self.emp_b.id])
        emprendedores = {e['empresa']['id']: e for e in res.data['emprendedores']}
        self.assertEqual(set(emprendedores), {self.emp_a.id, self.emp_b.id})
        b = emprendedores[self.emp_b.id]
        self.assertEqual(b['productos_cercanos'], 2)
        self.assertAlmostEqual(b['distancia_km'], 4, delta=0.1)
        self.assertEqual([s['id'] for s in b['sucursales']], [self.suc_b4.id, self.suc_b8.id])
        self.assertIn('lat', b['sucursales'][0])
        self.assertEqual(b['reputacion'], {'promedio': None, 'total': 0})
        self.assertEqual(b['categoria_principal'], 'Ferretería')

    # -----------------------------------------------------------------
    def test_ubicacion_de_respaldo(self):
        self.assertEqual(self.get().data['ubicacion']['fuente'], 'ubicacion_default')

        sin_default = f.comprador(ubicacion=None)
        Direccion.objects.create(
            comprador=sin_default, direccion_texto='Calle 1', ubicacion=Point(*a_km(4), srid=4326), es_predeterminada=True,
        )
        cliente = APIClient()
        cliente.force_authenticate(sin_default.usuario)
        res = self.get(cliente, radio_km=2)
        self.assertEqual(res.data['ubicacion']['fuente'], 'direccion_predeterminada')
        self.assertEqual(self.ids(res), [self.martillo.id])  # desde su casa, lo cercano es B

    def test_sin_ubicacion_responde_400_con_codigo(self):
        sin_nada = f.comprador(ubicacion=None)
        cliente = APIClient()
        cliente.force_authenticate(sin_nada.usuario)
        for c in (cliente, APIClient()):
            res = self.get(c)
            self.assertEqual(res.status_code, 400)
            self.assertEqual(res.data['codigo'], 'SIN_UBICACION')

    def test_validaciones(self):
        for params in ({'lat': LAT}, {'lat': 'abc', 'lng': LON}, {'lat': 95, 'lng': LON}, {'radio_km': 0}, {'radio_km': 80}):
            with self.subTest(params=params):
                self.assertEqual(self.get(**params).status_code, 400)
