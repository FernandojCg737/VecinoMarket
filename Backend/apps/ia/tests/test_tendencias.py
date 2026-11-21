from datetime import datetime, timedelta

from django.test import SimpleTestCase, TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient

from apps.ia import tendencias
from apps.usuarios.models import Empleado, EmpleadoPermiso, Permiso, Usuario

from . import fabricas as f


class MatematicaTests(SimpleTestCase):
    def test_tendencia_pendiente_sobre_media(self):
        alza = tendencias.tendencia([10, 11, 12, 13])  # pendiente 1, media 11.5 -> 8.7 %
        self.assertEqual(alza, {'pct_semanal': 8.7, 'estado': tendencias.EN_ALZA})
        self.assertEqual(tendencias.tendencia([13, 12, 11, 10])['estado'], tendencias.EN_BAJA)
        self.assertEqual(tendencias.tendencia([10, 10.2, 10.1, 10.3])['estado'], tendencias.ESTABLE)  # < 5 %
        self.assertEqual(tendencias.tendencia([0, 0, 0]), {'pct_semanal': None, 'estado': tendencias.SIN_DATOS})

    def test_umbral_exacto_es_estable(self):
        # pendiente 0.5 sobre media 10 = 5 %: no supera el umbral.
        self.assertEqual(tendencias.tendencia([9.25, 9.75, 10.25, 10.75])['estado'], tendencias.ESTABLE)

    def test_pronostico_extiende_la_recta_y_no_es_negativo(self):
        self.assertEqual(tendencias.pronostico([1, 2, 3, 4]), [5.0, 6.0, 7.0, 8.0])
        self.assertEqual(tendencias.pronostico([3, 2, 1, 0]), [0.0, 0.0, 0.0, 0.0])

    def test_ventana_excluye_la_semana_en_curso(self):
        miercoles = timezone.make_aware(datetime(2026, 11, 11, 15, 30))  # hora local
        desde, hasta, lunes = tendencias.ventana(12, ahora=miercoles)
        self.assertEqual(timezone.localtime(hasta).date().isoformat(), '2026-11-09')  # lunes de esta semana
        self.assertEqual((timezone.localtime(hasta).hour, timezone.localtime(hasta).minute), (0, 0))
        self.assertEqual(len(lunes), 12)
        self.assertEqual(lunes[0].isoformat(), '2026-08-17')
        self.assertTrue(all(d.weekday() == 0 for d in lunes))


class TendenciasEndpointTests(TestCase):
    url = reverse('ia-tendencias')

    def setUp(self):
        self.desde, self.hasta, self.lunes = tendencias.ventana(4)
        self.tec, self.ropa = f.categoria('Tecnología'), f.categoria('Ropa')
        self.empresa = f.empresa(departamento='La Paz')
        self.competidor = f.empresa(departamento='La Paz')
        self.lejana = f.empresa(departamento='Santa Cruz')
        self.audifonos = f.producto(self.empresa, self.tec, nombre='Audífonos inalámbricos')
        self.parlante = f.producto(self.competidor, self.tec, nombre='Parlante portátil')
        self.polera = f.producto(self.competidor, self.ropa, nombre='Polera de algodón')
        self.funda = f.producto(self.lejana, self.tec, nombre='Funda de laptop')
        self.comprador = f.comprador()

    def dias_atras(self, semana, dia=2, hora=12):
        """Días hacia atrás para caer en el día `dia` de la semana `semana` (0 = la más antigua)."""
        momento = self.desde + timedelta(weeks=semana, days=dia, hours=hora)
        return (timezone.now() - momento).total_seconds() / 86400

    def como(self, usuario):
        cliente = APIClient()
        cliente.force_authenticate(usuario)
        return cliente

    def empleado(self, con_permiso):
        empleado = Empleado.objects.create(usuario=f.usuario(Usuario.Rol.EMPLEADO), empresa=self.empresa)
        if con_permiso:
            permiso, _ = Permiso.objects.get_or_create(codigo='ver_reportes', defaults={'descripcion': 'reportes'})
            EmpleadoPermiso.objects.create(empleado=empleado, permiso=permiso)
        return empleado.usuario

    # -----------------------------------------------------------------
    def test_permisos(self):
        self.assertEqual(self.como(self.comprador.usuario).get(self.url).status_code, 403)
        self.assertEqual(self.como(f.empresa('PRUEBA').usuario_dueno).get(self.url).status_code, 403)
        self.assertEqual(self.como(f.empresa('BASICO', 'VENCIDA').usuario_dueno).get(self.url).status_code, 403)
        self.assertEqual(self.como(self.empleado(con_permiso=False)).get(self.url).status_code, 403)
        self.assertEqual(self.como(self.empleado(con_permiso=True)).get(self.url).status_code, 200)
        self.assertEqual(APIClient().get(self.url).status_code, 401)
        admin = self.como(f.usuario(Usuario.Rol.ADMIN)).get(self.url)
        self.assertEqual((admin.status_code, admin.data['alcance'], admin.data['empresa']), (200, 'global', None))

    def test_parametro_semanas(self):
        cliente = self.como(self.empresa.usuario_dueno)
        for valor in ('3', '27', 'abc'):
            self.assertEqual(cliente.get(self.url, {'semanas': valor}).status_code, 400)
        self.assertEqual(len(cliente.get(self.url, {'semanas': 6}).data['semanas']), 6)

    def test_series_semanales_solo_ventas_validas_y_semanas_cerradas(self):
        for semana, cantidad in enumerate([1, 2, 3, 4]):  # tecnología en alza en La Paz
            f.venta(self.comprador, [self.parlante], dias_atras=self.dias_atras(semana), cantidad=cantidad)
        f.venta(self.comprador, [self.parlante], dias_atras=self.dias_atras(1), cantidad=50, estado='CANCELADO')
        f.venta(self.comprador, [self.parlante], dias_atras=self.dias_atras(1), cantidad=50, estado_pago='PENDIENTE')
        f.venta(self.comprador, [self.parlante], dias_atras=0.01, cantidad=50)  # semana en curso
        f.venta(self.comprador, [self.funda], dias_atras=self.dias_atras(0), cantidad=40)  # otra zona

        datos = self.como(self.empresa.usuario_dueno).get(self.url, {'semanas': 4}).data
        self.assertEqual((datos['alcance'], datos['zona']), ('empresa', 'La Paz'))
        tec = next(c for c in datos['categorias'] if c['id'] == self.tec.id)
        self.assertEqual(tec['serie']['unidades'], [1.0, 2.0, 3.0, 4.0])
        self.assertEqual(tec['tendencia']['estado'], tendencias.EN_ALZA)
        self.assertEqual(tec['pronostico_unidades'], [5.0, 6.0, 7.0, 8.0])
        self.assertTrue(tec['vende_empresa'])
        ropa = next(c for c in datos['categorias'] if c['id'] == self.ropa.id)
        self.assertFalse(ropa['vende_empresa'])
        self.assertEqual(ropa['tendencia']['estado'], tendencias.SIN_DATOS)

    def test_vistas_busquedas_y_demanda_vs_oferta_de_la_zona(self):
        for semana in range(4):
            for _ in range(semana + 1):
                f.evento(self.comprador, self.audifonos, dias_atras=self.dias_atras(semana), departamento='La Paz')
            f.evento(None, None, 'BUSQUEDA', dias_atras=self.dias_atras(semana), termino_busqueda='inalámbric',
                     resultados=2, departamento='La Paz')
        f.evento(self.comprador, self.audifonos, dias_atras=self.dias_atras(0), departamento='Santa Cruz')
        for termino, dep in (('bicicleta', 'La Paz'), ('bicicleta', 'La Paz'), ('pañales', 'La Paz'), ('kayak', 'Santa Cruz')):
            f.evento(None, None, 'BUSQUEDA', dias_atras=self.dias_atras(2), termino_busqueda=termino, resultados=0, departamento=dep)

        datos = self.como(self.empresa.usuario_dueno).get(self.url, {'semanas': 4}).data
        tec = next(c for c in datos['categorias'] if c['id'] == self.tec.id)
        self.assertEqual(tec['serie']['vistas'], [1.0, 2.0, 3.0, 4.0])  # sin la de Santa Cruz
        self.assertEqual(tec['serie']['busquedas'], [1.0, 1.0, 1.0, 1.0])  # coincide con "Audífonos inalámbricos"
        self.assertEqual(tec['demanda_oferta']['productos_activos'], 2)  # audífonos + parlante (La Paz)
        self.assertEqual(tec['demanda_oferta']['vistas_por_producto'], 5.0)
        self.assertEqual(
            [(b['termino'], b['veces']) for b in datos['busquedas_sin_resultados']], [('bicicleta', 2), ('pañales', 1)],
        )
        # Producto propio: cuenta también las vistas de otras zonas.
        audifonos = next(p for p in datos['productos'] if p['id'] == self.audifonos.id)
        self.assertEqual(sum(audifonos['serie']['vistas']), 11)
        self.assertEqual(sum(audifonos['serie']['busquedas']), 4)

    def test_picos_y_comparacion_con_el_mercado(self):
        # Empresa: 3 ventas los sábados a las 20 h; competidor: 1 venta.
        for semana in range(3):
            f.venta(self.comprador, [self.audifonos], dias_atras=self.dias_atras(semana, dia=5, hora=20))
        f.venta(self.comprador, [self.parlante], dias_atras=self.dias_atras(0, dia=1, hora=9))

        datos = self.como(self.empresa.usuario_dueno).get(self.url, {'semanas': 4}).data
        self.assertEqual((datos['picos']['dia_pico'], datos['picos']['hora_pico']), ('Sábado', 20))
        self.assertEqual(datos['picos']['dias'][5]['pedidos'], 3)
        comparacion = datos['comparacion_mercado']
        self.assertEqual(comparacion['empresas_en_zona'], 2)
        self.assertEqual(comparacion['participacion_pct'], 75.0)  # 30 de 40 Bs en La Paz
        self.assertEqual(sum(comparacion['ventas_empresa']), 30.0)
        self.assertEqual(sum(comparacion['ventas_promedio_mercado']), 20.0)  # 40 Bs / 2 empresas
        self.assertEqual(datos['resumen']['unidades_semanales'], [1.0, 1.0, 1.0, 0.0])  # solo las de la empresa
        self.assertEqual(len(datos['resumen']['pronostico_unidades']), 4)
        self.assertEqual([c['id'] for c in comparacion['por_categoria']], [self.tec.id])

    def test_admin_global_y_por_departamento(self):
        f.venta(self.comprador, [self.parlante], dias_atras=self.dias_atras(0), cantidad=2)
        f.venta(self.comprador, [self.funda], dias_atras=self.dias_atras(0), cantidad=5)
        admin = self.como(f.usuario(Usuario.Rol.SUPERADMIN))
        tec_global = next(c for c in admin.get(self.url, {'semanas': 4}).data['categorias'] if c['id'] == self.tec.id)
        self.assertEqual(sum(tec_global['serie']['unidades']), 7)
        datos = admin.get(self.url, {'semanas': 4, 'departamento': 'Santa Cruz'}).data
        self.assertEqual(datos['zona'], 'Santa Cruz')
        tec = next(c for c in datos['categorias'] if c['id'] == self.tec.id)
        self.assertEqual(sum(tec['serie']['unidades']), 5)
        self.assertIsNone(datos['comparacion_mercado'])
