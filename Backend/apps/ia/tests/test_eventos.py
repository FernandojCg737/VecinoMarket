from datetime import timedelta
from types import SimpleNamespace

from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APITestCase

from apps.ia.models import EventoInteraccion
from apps.suscripciones.services import empresa_tiene_ia, ids_empresas_con_ia
from apps.usuarios.models import Usuario
from apps.usuarios.permissions import PlanPermiteIA

from . import fabricas as f


class RegistrarEventoTests(APITestCase):
    url = reverse('ia-eventos')

    def setUp(self):
        self.empresa = f.empresa()
        self.cat = f.categoria('Abarrotes')
        self.cafe = f.producto(self.empresa, self.cat, nombre='Café molido orgánico', descripcion='Café de los Yungas')

    def test_invitado_registra_vista_sin_comprador(self):
        res = self.client.post(self.url, {'tipo': 'VISTA', 'producto': self.cafe.id, 'departamento': 'Oruro'}, format='json')
        self.assertEqual(res.status_code, 204)
        evento = EventoInteraccion.objects.get()
        self.assertIsNone(evento.comprador)
        self.assertEqual(evento.producto, self.cafe)
        self.assertEqual(evento.departamento, 'Oruro')

    def test_comprador_queda_asociado_y_hereda_su_departamento(self):
        comprador = f.comprador(departamento='Cochabamba')
        self.client.force_authenticate(comprador.usuario)
        self.client.post(self.url, {'tipo': 'CARRITO', 'producto': self.cafe.id}, format='json')
        evento = EventoInteraccion.objects.get()
        self.assertEqual(evento.comprador, comprador)
        self.assertEqual(evento.departamento, 'Cochabamba')

    def test_vista_repetida_en_30_minutos_cuenta_una_vez(self):
        comprador = f.comprador()
        self.client.force_authenticate(comprador.usuario)
        for _ in range(3):
            self.assertEqual(self.client.post(self.url, {'tipo': 'VISTA', 'producto': self.cafe.id}, format='json').status_code, 204)
        self.assertEqual(EventoInteraccion.objects.count(), 1)

        EventoInteraccion.objects.update(fecha=timezone.now() - timedelta(hours=1))
        self.client.post(self.url, {'tipo': 'VISTA', 'producto': self.cafe.id}, format='json')
        self.assertEqual(EventoInteraccion.objects.count(), 2)

    def test_busqueda_guarda_cantidad_de_resultados(self):
        self.client.post(self.url, {'tipo': 'BUSQUEDA', 'termino_busqueda': '  café '}, format='json')
        self.client.post(self.url, {'tipo': 'BUSQUEDA', 'termino_busqueda': 'bicicleta', 'producto': self.cafe.id}, format='json')
        con, sin = EventoInteraccion.objects.order_by('id')
        self.assertEqual((con.termino_busqueda, con.resultados), ('café', 1))
        self.assertEqual((sin.termino_busqueda, sin.resultados, sin.producto), ('bicicleta', 0, None))
        self.assertEqual((con.categorias_coincidentes, con.productos_coincidentes), ([self.cat.id], [self.cafe.id]))
        self.assertEqual((sin.categorias_coincidentes, sin.productos_coincidentes), ([], []))

    def test_validaciones(self):
        casos = [
            {'tipo': 'COMPRA', 'producto': self.cafe.id},  # se deriva de los pedidos
            {'tipo': 'VISTA'},
            {'tipo': 'BUSQUEDA', 'termino_busqueda': 'a'},
            {'tipo': 'VISTA', 'producto': 999999},
            {'tipo': 'OTRO', 'producto': self.cafe.id},
        ]
        for payload in casos:
            with self.subTest(payload=payload):
                self.assertEqual(self.client.post(self.url, payload, format='json').status_code, 400)
        self.assertFalse(EventoInteraccion.objects.exists())

    def test_cuentas_que_no_son_comprador_se_ignoran(self):
        self.client.force_authenticate(self.empresa.usuario_dueno)
        res = self.client.post(self.url, {'tipo': 'VISTA', 'producto': self.cafe.id}, format='json')
        self.assertEqual(res.status_code, 204)
        self.assertFalse(EventoInteraccion.objects.exists())


class PlanPermiteIATests(APITestCase):
    """Decisión 4: plan con IA + suscripción ACTIVA y vigente. Se prueba con
    el chatbot de la empresa (CU15), que ya usaba PlanPermiteIA."""

    url = reverse('mis-faqs-chatbot')

    def acceso(self, empresa):
        self.client.force_authenticate(empresa.usuario_dueno)
        return self.client.get(self.url).status_code

    def test_plan_con_ia_y_suscripcion_vigente(self):
        empresa = f.empresa('BASICO', 'VIGENTE')
        self.assertTrue(empresa_tiene_ia(empresa))
        self.assertEqual(self.acceso(empresa), 200)
        # El front usa ia_vigente (misma regla) para mostrar u ocultar menús de IA.
        from apps.usuarios.serializers import UsuarioSerializer
        self.assertTrue(UsuarioSerializer(empresa.usuario_dueno).data['empresa_plan']['ia_vigente'])
        vencida = f.empresa('BASICO', 'VENCIDA')
        self.assertFalse(UsuarioSerializer(vencida.usuario_dueno).data['empresa_plan']['ia_vigente'])

    def test_sin_suscripcion_vigente_no_entra(self):
        for estado in ('VENCIDA', 'CANCELADA', None):
            with self.subTest(suscripcion=estado):
                empresa = f.empresa('PREMIUM', estado)
                self.assertFalse(empresa_tiene_ia(empresa))
                self.assertEqual(self.acceso(empresa), 403)

    def test_plan_sin_ia_no_entra_aunque_este_vigente(self):
        empresa = f.empresa('PRUEBA', 'VIGENTE')
        self.assertEqual(self.acceso(empresa), 403)

    def test_empleado_hereda_la_regla_de_su_empresa(self):
        from apps.usuarios.models import Empleado, EmpleadoPermiso, Permiso

        empresa = f.empresa('BASICO', 'VENCIDA')
        empleado = Empleado.objects.create(usuario=f.usuario(Usuario.Rol.EMPLEADO), empresa=empresa)
        permiso, _ = Permiso.objects.get_or_create(codigo='gestionar_chat', defaults={'descripcion': 'chat'})
        EmpleadoPermiso.objects.create(empleado=empleado, permiso=permiso)
        self.client.force_authenticate(empleado.usuario)
        self.assertEqual(self.client.get(self.url).status_code, 403)

    def test_staff_siempre_pasa(self):
        admin = f.usuario(Usuario.Rol.ADMIN)
        request = SimpleNamespace(user=admin)
        self.assertTrue(PlanPermiteIA().has_permission(request, None))

    def test_ids_empresas_con_ia(self):
        con_ia = f.empresa('BASICO', 'VIGENTE')
        f.empresa('BASICO', 'VENCIDA')
        f.empresa('PRUEBA', 'VIGENTE')
        self.assertEqual(list(ids_empresas_con_ia().values_list('id', flat=True)), [con_ia.id])
