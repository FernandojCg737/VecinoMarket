from decimal import Decimal
from io import BytesIO
from tempfile import TemporaryDirectory
from unittest.mock import ANY, patch

from django.contrib.gis.geos import Point
from django.core.files.uploadedfile import SimpleUploadedFile
from django.db import connection
from django.test import TestCase, override_settings
from PIL import Image
from requests.exceptions import Timeout
from rest_framework.test import APIClient

from apps.auditoria.models import LogAuditoria
from apps.catalogo.models import Producto
from apps.inventario.models import InventarioSucursal, Sucursal
from apps.notificaciones.models import Notificacion
from apps.reportes.views import _dashboard_empresa
from apps.usuarios.models import Comprador, Direccion, Empleado, EmpleadoPermiso, Empresa, Permiso, Usuario

from .models import OrdenCompra, Pago, Pedido, PedidoItem, SolicitudDevolucion


class DevolucionesTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        def usuario(nombre, rol):
            return Usuario.objects.create_user(email=f'{nombre}@example.test', nombre=nombre, rol=rol)

        cls.buyer = usuario('cu29-comprador', 'COMPRADOR')
        cls.comprador = Comprador.objects.create(usuario=cls.buyer)
        cls.otro_comprador = usuario('cu29-otro', 'COMPRADOR')
        Comprador.objects.create(usuario=cls.otro_comprador)
        cls.admin = usuario('cu29-admin', 'ADMIN')
        cls.superadmin = usuario('cu29-super', 'SUPERADMIN')
        cls.vendedores = [usuario(f'cu29-empresa-{i}', 'EMPRESA') for i in range(2)]
        cls.empresas = [
            Empresa.objects.create(usuario_dueno=dueno, razon_social=dueno.nombre, slug=dueno.nombre, nit='CU29')
            for dueno in cls.vendedores
        ]
        cls.empleado = usuario('cu29-empleado', 'EMPLEADO')
        empleado = Empleado.objects.create(usuario=cls.empleado, empresa=cls.empresas[0])
        permiso, _ = Permiso.objects.get_or_create(codigo='gestionar_pedidos')
        EmpleadoPermiso.objects.create(empleado=empleado, permiso=permiso)
        cls.empleado_sin_permiso = usuario('cu29-empleado-sin-permiso', 'EMPLEADO')
        Empleado.objects.create(usuario=cls.empleado_sin_permiso, empresa=cls.empresas[0])
        cls.orden = OrdenCompra.objects.create(
            comprador=cls.comprador, monto_total=100, metodo_pago='QR', estado_pago='PAGADO',
        )
        cls.pago = Pago.objects.create(orden_compra=cls.orden, monto=100, metodo='QR', estado='APROBADO')
        cls.pedidos = []
        cls.inventarios = []
        for empresa, subtotal in zip(cls.empresas, [40, 60]):
            sucursal = Sucursal.objects.create(empresa=empresa, nombre='Principal')
            producto = Producto.objects.create(empresa=empresa, nombre='Artículo', precio=subtotal // 2)
            cls.inventarios.append(InventarioSucursal.objects.create(
                sucursal=sucursal, producto=producto, cantidad_disponible=4,
            ))
            pedido = Pedido.objects.create(
                orden_compra=cls.orden, empresa=empresa, numero_pedido=f'CU29-{empresa.pk}',
                subtotal=subtotal, estado='ENTREGADO', modalidad_entrega='RECOJO_TIENDA', sucursal_recojo=sucursal,
            )
            PedidoItem.objects.create(
                pedido=pedido, producto=producto, sucursal_stock=sucursal, cantidad=2,
                precio_unitario=subtotal // 2, subtotal=subtotal,
            )
            cls.pedidos.append(pedido)

    def setUp(self):
        self.client = APIClient(HTTP_HOST='localhost')
        carpeta = TemporaryDirectory()
        self.addCleanup(carpeta.cleanup)
        settings = override_settings(
            DEVOLUCIONES_EVIDENCIAS_LOCALES=True, DEVOLUCIONES_EVIDENCIAS_DIR=carpeta.name,
        )
        settings.enable()
        self.addCleanup(settings.disable)

    def crear(self, pedido, archivo=None):
        self.client.force_authenticate(self.buyer)
        if archivo is None:
            buffer = BytesIO()
            Image.new('RGB', (12, 12), 'white').save(buffer, 'PNG')
            archivo = SimpleUploadedFile('evidencia.png', buffer.getvalue(), 'image/png')
        return self.client.post('/api/pedidos/reclamos/crear/', {
            'pedido': pedido.pk, 'motivo': 'DANADO', 'descripcion': 'El producto llegó roto.',
            'evidencia': archivo,
        }, format='multipart')

    def accion(self, usuario, caso, accion, **datos):
        self.client.force_authenticate(usuario)
        return self.client.post(f'/api/pedidos/reclamos/{caso}/accion/', {'accion': accion, **datos}, format='json')

    def test_reclamo_exige_entrega_foto_valida_y_es_unico(self):
        pedido = self.pedidos[0]
        Pedido.objects.filter(pk=pedido.pk).update(estado='CONFIRMADO')
        self.assertEqual(self.crear(pedido).status_code, 409)
        Pedido.objects.filter(pk=pedido.pk).update(estado='ENTREGADO')
        invalido = SimpleUploadedFile('foto.png', b'no es una foto', 'image/png')
        self.assertEqual(self.crear(pedido, invalido).status_code, 400)
        self.assertEqual(self.crear(pedido).status_code, 201)
        self.assertEqual(self.crear(pedido).status_code, 409)
        self.assertEqual(SolicitudDevolucion.objects.filter(pedido=pedido).count(), 1)

    def test_tenant_empleado_y_acceso_a_evidencia(self):
        resultado = self.crear(self.pedidos[0])
        self.assertEqual(resultado.status_code, 201, resultado.data)
        evidencia = resultado.data['evidencia_path']
        caso = resultado.data['id']
        for usuario, esperado in [
            (None, 401), (self.otro_comprador, 404), (self.vendedores[1], 404),
            (self.empleado_sin_permiso, 403), (self.empleado, 200),
            (self.admin, 200), (self.superadmin, 200),
        ]:
            self.client.force_authenticate(usuario)
            foto = self.client.get(evidencia)
            self.assertEqual(foto.status_code, esperado)
            if esperado == 200:
                self.assertTrue(b''.join(foto.streaming_content).startswith(b'\xff\xd8'))
                self.assertEqual(foto['Cache-Control'], 'private, no-store')
        self.assertEqual(self.accion(self.admin, caso, 'rechazar', respuesta='Sin permiso').status_code, 403)
        self.assertEqual(self.accion(self.empleado, caso, 'rechazar', respuesta='Respuesta').status_code, 200)

    def test_filtros_de_empresa_y_estado_respetan_el_acceso_por_rol(self):
        casos = [self.crear(pedido).data['id'] for pedido in self.pedidos]
        self.assertEqual(self.accion(self.vendedores[0], casos[0], 'rechazar', respuesta='Revisado').status_code, 200)
        bandeja = '/api/pedidos/reclamos/'
        empresas = bandeja + 'empresas/'

        for personal in (self.superadmin, self.admin):
            self.client.force_authenticate(personal)
            opciones = self.client.get(empresas)
            self.assertEqual(opciones.status_code, 200)
            self.assertEqual(opciones.data, [
                {'id': empresa.pk, 'razon_social': empresa.razon_social} for empresa in self.empresas
            ])
            self.assertEqual(self.client.get(bandeja).data['count'], 2)
            filtros = {'empresa': self.empresas[0].pk, 'estado': 'RECHAZADA'}
            self.assertEqual([fila['id'] for fila in self.client.get(bandeja, filtros).data['results']], [casos[0]])
            self.assertEqual(self.client.get(bandeja, {**filtros, 'estado': 'PENDIENTE'}).data['count'], 0)
            self.assertEqual(self.client.get(bandeja, {'empresa': 'inválida'}).status_code, 400)

        for usuario, esperado in ((self.empleado, [casos[0]]), (self.vendedores[0], [casos[0]]), (self.otro_comprador, [])):
            self.client.force_authenticate(usuario)
            self.assertEqual(self.client.get(empresas).status_code, 403)
            resultado = self.client.get(bandeja, {'empresa': self.empresas[1].pk})
            self.assertEqual([fila['id'] for fila in resultado.data['results']], esperado)

    @override_settings(
        DEVOLUCIONES_EVIDENCIAS_LOCALES=False,
        CLOUDINARY_STORAGE={'CLOUD_NAME': 'cu29-prueba', 'API_KEY': 'key', 'API_SECRET': 'secret'},
    )
    @patch('apps.pedidos.evidencias.urlopen')
    @patch('apps.pedidos.evidencias.private_download_url')
    @patch('apps.pedidos.evidencias.cloudinary.uploader.upload')
    def test_cloudinary_guarda_y_sirve_la_foto_como_recurso_autenticado(self, subir, firmar, descargar):
        def almacenar(archivo, **opciones):
            self.assertTrue(archivo.read().startswith(b'\xff\xd8'))
            return {'public_id': opciones['public_id']}

        subir.side_effect = almacenar
        firmar.return_value = 'https://cloudinary.example.test/foto-firmada'
        descargar.return_value.__enter__.return_value = BytesIO(b'\xff\xd8foto')
        resultado = self.crear(self.pedidos[0])
        self.assertEqual(resultado.status_code, 201, resultado.data)
        public_id = subir.call_args.kwargs['public_id']
        self.assertTrue(public_id.startswith('vecinomarket/devoluciones/'))
        self.assertEqual(subir.call_args.kwargs['type'], 'authenticated')
        self.assertNotIn(firmar.return_value, str(resultado.data))

        self.client.force_authenticate(self.vendedores[1])
        self.assertEqual(self.client.get(resultado.data['evidencia_path']).status_code, 404)
        firmar.assert_not_called()

        self.client.force_authenticate(self.vendedores[0])
        foto = self.client.get(resultado.data['evidencia_path'])
        self.assertEqual(foto.status_code, 200)
        self.assertEqual(b''.join(foto.streaming_content), b'\xff\xd8foto')
        self.assertEqual(foto['Cache-Control'], 'private, no-store')
        firmar.assert_called_once_with(
            public_id, 'jpg', type='authenticated', expires_at=ANY,
            cloud_name='cu29-prueba', api_key='key', api_secret='secret',
        )
        descargar.assert_called_once_with(firmar.return_value, timeout=12)

    def test_mediacion_conserva_respuestas_y_notifica(self):
        caso = self.crear(self.pedidos[0]).data['id']
        self.assertEqual(self.accion(self.vendedores[0], caso, 'rechazar', respuesta='No procede').status_code, 200)
        self.assertEqual(self.accion(self.buyer, caso, 'escalar', respuesta='Solicito revisión').status_code, 200)
        final = self.accion(self.superadmin, caso, 'mediar_rechazar', respuesta='Se revisó la evidencia')
        self.assertEqual(final.status_code, 200, final.data)
        self.assertEqual(final.data['estado'], 'RECHAZADA_MEDIACION')
        self.assertEqual(final.data['respuesta'], 'No procede')
        self.assertEqual(final.data['motivo_mediacion'], 'Solicito revisión')
        self.assertEqual(final.data['resolucion_mediacion'], 'Se revisó la evidencia')
        self.assertEqual(LogAuditoria.objects.filter(entidad_afectada='solicitud_devolucion', entidad_id=caso).count(), 4)
        self.assertEqual(Notificacion.objects.filter(usuario=self.buyer, enlace=f'/mis-reclamos/{caso}').count(), 4)

    def test_qr_parcial_no_devuelve_stock_ajeno_y_segunda_confirmacion_es_unica(self):
        for indice, estado_pago in enumerate(['REEMBOLSO_PARCIAL', 'REEMBOLSADO']):
            caso = self.crear(self.pedidos[indice]).data['id']
            vendedor = self.vendedores[indice]
            aprobado = self.accion(vendedor, caso, 'aprobar', respuesta='Revisado')
            self.assertEqual(aprobado.status_code, 200, aprobado.data)
            self.assertEqual(aprobado.data['estado'], 'REEMBOLSO_PENDIENTE')
            self.inventarios[indice].refresh_from_db()
            self.assertEqual(self.inventarios[indice].cantidad_disponible, 4)
            final = self.accion(vendedor, caso, 'confirmar_qr', referencia=f'TRANSFERENCIA-{indice}')
            self.assertEqual(final.status_code, 200, final.data)
            self.assertEqual(final.data['estado'], 'APROBADA')
            self.assertEqual(self.accion(vendedor, caso, 'confirmar_qr', referencia='DUPLICADA').status_code, 409)
            self.pago.refresh_from_db()
            self.orden.refresh_from_db()
            self.assertEqual(self.pago.estado, estado_pago)
            self.assertEqual(self.orden.estado_pago, estado_pago)
            self.inventarios[indice].refresh_from_db()
            self.assertEqual(self.inventarios[indice].cantidad_disponible, 6)
            if indice == 0:
                self.inventarios[1].refresh_from_db()
                self.pedidos[1].refresh_from_db()
                self.assertEqual(self.inventarios[1].cantidad_disponible, 4)
                self.assertEqual(self.pedidos[1].estado, 'ENTREGADO')
                self.assertEqual(_dashboard_empresa(self.empresas[0].pk)['total_ventas'], 0)
                self.assertEqual(_dashboard_empresa(self.empresas[1].pk)['total_ventas'], 60)
                with connection.cursor() as cursor:
                    cursor.execute('SELECT total_ventas FROM fn_ventas_por_dia(%s, 1)', [self.empresas[1].pk])
                    self.assertEqual(cursor.fetchone()[0], 60)
        self.client.force_authenticate(self.buyer)
        compras = self.client.get('/api/pedidos/mis-compras/').data['results']
        self.assertEqual({p['estado'] for p in compras}, {'DEVUELTO'})
        self.assertTrue(all(p['reclamo_id'] for p in compras))

    @override_settings(DEVOLUCIONES_PAYPAL_SOLO_CHECKOUT_LOCAL=False)
    def test_paypal_confirma_por_captura_y_conserva_el_otro_pedido(self):
        OrdenCompra.objects.filter(pk=self.orden.pk).update(metodo_pago='PAYPAL')
        Pago.objects.filter(pk=self.pago.pk).update(
            metodo='PAYPAL', paypal_captura_id='CAPTURA-CU29', paypal_monto_capturado=Decimal('14.37'),
            paypal_moneda='USD',
        )
        caso = self.crear(self.pedidos[0]).data['id']
        payload = {'id': 'DEV-CU29', 'amount': {'value': '5.75', 'currency_code': 'USD'}}
        with patch('apps.pagos.paypal_client.reembolsar_captura', return_value={**payload, 'status': 'PENDING'}) as crear:
            respuesta = self.accion(self.vendedores[0], caso, 'aprobar', respuesta='Revisado')
            self.assertEqual(respuesta.status_code, 200, respuesta.data)
            self.assertEqual(respuesta.data['estado'], 'REEMBOLSO_PENDIENTE')
            self.assertEqual(crear.call_args.args, ('CAPTURA-CU29', Decimal('5.75'), 'USD'))
            self.assertEqual(crear.call_args.kwargs['clave'], SolicitudDevolucion.objects.get(pk=caso).clave_reembolso)
        with patch('apps.pagos.paypal_client.consultar_reembolso', return_value={**payload, 'status': 'COMPLETED'}) as consultar:
            respuesta = self.accion(self.vendedores[0], caso, 'verificar_paypal')
            self.assertEqual(respuesta.status_code, 200, respuesta.data)
            self.assertEqual(respuesta.data['estado'], 'APROBADA')
            consultar.assert_called_once_with('DEV-CU29')
        self.pago.refresh_from_db()
        self.inventarios[1].refresh_from_db()
        self.assertEqual(self.pago.estado, 'REEMBOLSO_PARCIAL')
        self.assertEqual(self.inventarios[1].cantidad_disponible, 4)

    @override_settings(DEVOLUCIONES_PAYPAL_SOLO_CHECKOUT_LOCAL=True)
    def test_paypal_historico_importado_no_sale_de_docker(self):
        OrdenCompra.objects.filter(pk=self.orden.pk).update(metodo_pago='PAYPAL')
        Pago.objects.filter(pk=self.pago.pk).update(metodo='PAYPAL', referencia_pasarela='IMPORTADO')
        caso = self.crear(self.pedidos[0]).data['id']
        with patch('apps.pagos.paypal_client.consultar_orden') as consultar:
            respuesta = self.accion(self.vendedores[0], caso, 'aprobar', respuesta='Revisado')
            self.assertEqual(respuesta.status_code, 409, respuesta.data)
            consultar.assert_not_called()
        self.assertEqual(SolicitudDevolucion.objects.get(pk=caso).estado, 'PENDIENTE')

    @override_settings(DEVOLUCIONES_PAYPAL_SOLO_CHECKOUT_LOCAL=False)
    def test_paypal_reintenta_timeout_con_la_misma_clave_y_restituye_una_vez(self):
        OrdenCompra.objects.filter(pk=self.orden.pk).update(metodo_pago='PAYPAL')
        Pago.objects.filter(pk=self.pago.pk).update(
            metodo='PAYPAL', paypal_captura_id='CAPTURA-CU29', paypal_monto_capturado=Decimal('14.37'),
            paypal_moneda='USD',
        )
        caso = self.crear(self.pedidos[0]).data['id']
        payload = {'id': 'DEV-CU29', 'amount': {'value': '5.75', 'currency_code': 'USD'}, 'status': 'COMPLETED'}
        with patch('apps.pagos.paypal_client.reembolsar_captura', side_effect=[Timeout(), payload]) as reembolsar:
            vendedor = self.vendedores[0]
            self.assertEqual(self.accion(vendedor, caso, 'aprobar', respuesta='Revisado').status_code, 502)
            self.inventarios[0].refresh_from_db()
            self.assertEqual(self.inventarios[0].cantidad_disponible, 4)
            self.assertEqual(SolicitudDevolucion.objects.get(pk=caso).estado, 'REEMBOLSO_PENDIENTE')

            final = self.accion(vendedor, caso, 'verificar_paypal')
            self.assertEqual(final.status_code, 200, final.data)
            self.assertEqual(final.data['estado'], 'APROBADA')
            self.assertEqual(self.accion(vendedor, caso, 'verificar_paypal').status_code, 409)
            primer_intento, segundo_intento = reembolsar.call_args_list
            self.assertEqual(primer_intento, segundo_intento)
        self.inventarios[0].refresh_from_db()
        self.assertEqual(self.inventarios[0].cantidad_disponible, 6)

    def test_checkout_domicilio_guarda_sucursal_que_desconto_stock(self):
        direccion = Direccion.objects.create(
            comprador=self.comprador, direccion_texto='Dirección de prueba', ubicacion=Point(-68.1, -16.5, srid=4326),
        )
        origen = self.inventarios[0]
        otra = Sucursal.objects.create(empresa=self.empresas[0], nombre='Segunda')
        InventarioSucursal.objects.create(sucursal=otra, producto=origen.producto, cantidad_disponible=1)
        self.client.force_authenticate(self.buyer)
        checkout = self.client.post('/api/pedidos/checkout/', {
            'items': [{'producto_id': origen.producto_id, 'cantidad': 2}],
            'entregas': {str(self.empresas[0].pk): {'modalidad': 'ENVIO_DOMICILIO', 'direccion_id': direccion.pk}},
            'metodo_pago': 'QR',
        }, format='json')
        self.assertEqual(checkout.status_code, 201, checkout.data)
        item = PedidoItem.objects.get(pedido__orden_compra_id=checkout.data['orden_compra_id'])
        origen.refresh_from_db()
        self.assertEqual(item.sucursal_stock_id, origen.sucursal_id)
        self.assertEqual(origen.cantidad_disponible, 2)

    def test_origen_historico_ambiguo_requiere_sucursal_del_tenant(self):
        pedido = self.pedidos[0]
        direccion = Direccion.objects.create(
            comprador=self.comprador, direccion_texto='Dirección de prueba', ubicacion=Point(-68.1, -16.5, srid=4326),
        )
        Pedido.objects.filter(pk=pedido.pk).update(
            modalidad_entrega='ENVIO_DOMICILIO', direccion_envio=direccion, sucursal_recojo=None,
        )
        item = pedido.items.get()
        PedidoItem.objects.filter(pk=item.pk).update(sucursal_stock=None)
        sucursal = Sucursal.objects.create(empresa=self.empresas[0], nombre='Segunda')
        caso = self.crear(pedido).data['id']
        for seleccion in [{}, {str(item.pk): self.inventarios[1].sucursal_id}]:
            respuesta = self.accion(self.vendedores[0], caso, 'aprobar', respuesta='Revisado', sucursales=seleccion)
            self.assertEqual(respuesta.status_code, 400, respuesta.data)
        aprobado = self.accion(
            self.vendedores[0], caso, 'aprobar', respuesta='Revisado', sucursales={str(item.pk): sucursal.pk},
        )
        self.assertEqual(aprobado.status_code, 200, aprobado.data)
        final = self.accion(self.vendedores[0], caso, 'confirmar_qr', referencia='TRANSFERENCIA-HISTORICA')
        self.assertEqual(final.status_code, 200, final.data)
        self.assertEqual(InventarioSucursal.objects.get(producto=item.producto, sucursal=sucursal).cantidad_disponible, 2)
