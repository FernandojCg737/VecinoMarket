import json
from decimal import ROUND_HALF_UP, Decimal

from django.conf import settings
from django.db import connection, transaction
from django.db.models import Q, Sum
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.pagination import PageNumberPagination
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.auditoria.models import LogAuditoria
from apps.catalogo.models import Producto
from apps.core.utils import get_client_ip
from apps.inventario.models import InventarioSucursal, Sucursal
from apps.pagos.paypal_client import PaypalError
from apps.pagos import paypal_client
from apps.usuarios.models import Comprador, Direccion
from apps.usuarios.permissions import EsAdmin, EsComprador, TienePermisoEmpleado

from .models import Carrito, CarritoItem, Entrega, OrdenCompra, Pago, Pedido, PedidoItem
from .serializers import CarritoDetalleAdminSerializer, EntregaSerializer, PedidoSerializer


def _log(request, accion, entidad_id, detalle=None, entidad_afectada='pedido'):
    LogAuditoria.objects.create(
        usuario=request.user,
        accion=accion,
        entidad_afectada=entidad_afectada,
        entidad_id=entidad_id,
        detalle=detalle or {},
        ip_origen=get_client_ip(request),
        user_agent=request.META.get('HTTP_USER_AGENT', ''),
    )


class ListaCarritosAdminView(APIView):
    """CU11: el SuperAdmin/Admin ve, en vivo (el frontend re-consulta cada
    pocos segundos), qué está agregando cada comprador a su carrito. Es de
    solo lectura — el único que puede modificar un carrito es el propio
    comprador, desde su sesión de compra."""

    permission_classes = [EsAdmin]

    def get(self, request):
        qs = Carrito.objects.select_related('comprador__usuario').order_by('-actualizado_en')

        estado = request.query_params.get('estado', Carrito.Estado.ABIERTO)
        if estado:
            qs = qs.filter(estado=estado)
        if estado == Carrito.Estado.ABIERTO:
            # CU11: Los carritos abiertos en vivo solo se muestran si tienen productos activos
            qs = qs.filter(items__isnull=False).distinct()

        q = request.query_params.get('q', '').strip()
        if q:
            qs = qs.filter(Q(comprador__usuario__nombre__icontains=q) | Q(comprador__usuario__apellido__icontains=q) | Q(comprador__usuario__email__icontains=q))

        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT carrito_id, COALESCE(SUM(cantidad), 0), COALESCE(SUM(cantidad * precio_unitario), 0)
                FROM pedidos_carritoitem
                GROUP BY carrito_id
            """)
            resumen = {row[0]: {'total_items': row[1], 'total_monto': row[2]} for row in cursor.fetchall()}

        vacio = {'total_items': 0, 'total_monto': 0}
        resultados = [
            {
                'id': c.id,
                'comprador': c.comprador_id,
                'comprador_nombre': f"{c.comprador.usuario.nombre} {c.comprador.usuario.apellido}".strip() if (c.comprador.usuario.nombre or c.comprador.usuario.apellido) else c.comprador.usuario.email,
                'comprador_email': c.comprador.usuario.email,
                'estado': c.estado,
                'creado_en': c.creado_en,
                'actualizado_en': c.actualizado_en,
                **resumen.get(c.id, vacio),
            }
            for c in qs
        ]
        return Response(resultados)


class DetalleCarritoAdminView(generics.RetrieveAPIView):
    """CU11: detalle de un carrito (sus ítems) — solo lectura."""

    permission_classes = [EsAdmin]
    serializer_class = CarritoDetalleAdminSerializer
    queryset = Carrito.objects.select_related('comprador__usuario').prefetch_related('items__producto')


class SincronizarMiCarritoView(APIView):
    """CU11: el comprador sincroniza su carrito en vivo con la base de datos,
    permitiendo que el SuperAdmin/Admin lo monitoree en tiempo real desde /admin/carritos,
    y que el comprador conserve sus productos entre sesiones (Opción B)."""

    permission_classes = [EsComprador]

    def get(self, request):
        comprador = get_object_or_404(Comprador, usuario=request.user)
        carrito = Carrito.objects.filter(comprador=comprador, estado=Carrito.Estado.ABIERTO).order_by('-actualizado_en').first()
        if not carrito:
            return Response({'items': [], 'carrito_id': None})

        items = []
        for it in carrito.items.select_related('producto__empresa').prefetch_related('producto__imagenes').all():
            first_img = it.producto.imagenes.first()
            img_url = (first_img.archivo.url if first_img.archivo else first_img.url) if first_img else ''
            items.append({
                'id': it.producto.id,
                'nombre': it.producto.nombre,
                'precio': float(it.precio_unitario),
                'imagen': img_url,
                'empresa': it.producto.empresa.razon_social if it.producto.empresa else '',
                'empresaId': it.producto.empresa_id,
                'cantidad': it.cantidad,
            })
        return Response({'items': items, 'carrito_id': carrito.id})

    def post(self, request):
        comprador = get_object_or_404(Comprador, usuario=request.user)
        items_data = request.data.get('items', [])
        p_ids = [it.get('id') or it.get('producto_id') for it in items_data if it.get('id') or it.get('producto_id')]
        productos_validos = {p.id: p for p in Producto.objects.filter(id__in=p_ids, estado=Producto.Estado.ACTIVO)}

        with transaction.atomic():
            if not items_data or not productos_validos:
                # Si el comprador quitó todos los artículos (carrito vacío),
                # se elimina el carrito abierto para que no aparezca en tiempo real en el admin
                Carrito.objects.filter(comprador=comprador, estado=Carrito.Estado.ABIERTO).delete()
                return Response({'detail': 'Carrito vaciado y eliminado.', 'total_items': 0, 'carrito_id': None})

            carrito, _ = Carrito.objects.get_or_create(
                comprador=comprador,
                estado=Carrito.Estado.ABIERTO,
                defaults={'estado': Carrito.Estado.ABIERTO}
            )

            # Reemplazar los items actuales con los sincronizados
            carrito.items.all().delete()

            nuevos_items = []
            for it in items_data:
                producto_id = it.get('id') or it.get('producto_id')
                if producto_id in productos_validos:
                    prod = productos_validos[producto_id]
                    cantidad = int(it.get('cantidad', 1))
                    precio = it.get('precio') or it.get('precio_unitario') or prod.precio_descuento or prod.precio
                    if cantidad > 0:
                        nuevos_items.append(CarritoItem(
                            carrito=carrito,
                            producto=prod,
                            cantidad=cantidad,
                            precio_unitario=Decimal(str(precio)),
                        ))

            if nuevos_items:
                CarritoItem.objects.bulk_create(nuevos_items)
            else:
                carrito.delete()
                return Response({'detail': 'Carrito sin ítems válidos eliminado.', 'total_items': 0, 'carrito_id': None})

            carrito.save(update_fields=['actualizado_en'])

        return Response({'detail': 'Carrito sincronizado en tiempo real.', 'total_items': len(nuevos_items), 'carrito_id': carrito.id})


class PedidoPagination(PageNumberPagination):
    page_size = 30
    page_size_query_param = 'page_size'
    max_page_size = 100


def _pedidos_queryset():
    return (
        Pedido.objects.select_related('empresa', 'orden_compra__comprador__usuario')
        .prefetch_related('items__producto')
        .order_by('-creado_en')
    )


def _filtrar_pedidos(qs, params):
    """CU12: 'tipo=pedido' (estado_pago PENDIENTE) vs 'tipo=venta'
    (estado_pago PAGADO) — el criterio que separa los dos dashboards."""
    tipo = params.get('tipo')
    if tipo == 'pedido':
        qs = qs.filter(orden_compra__estado_pago=OrdenCompra.EstadoPago.PENDIENTE)
    elif tipo == 'venta':
        qs = qs.filter(orden_compra__estado_pago=OrdenCompra.EstadoPago.PAGADO)

    estado = params.get('estado')
    if estado:
        qs = qs.filter(estado=estado)

    metodo_pago = params.get('metodo_pago')
    if metodo_pago:
        qs = qs.filter(orden_compra__metodo_pago=metodo_pago)

    q = params.get('q', '').strip()
    if q:
        qs = qs.filter(Q(numero_pedido__icontains=q) | Q(orden_compra__comprador__usuario__nombre__icontains=q))

    return qs


def _aplicar_cambios_pedido(request, pedido):
    """Escribe estado (Pedido, ciclo de vida operativo) y/o estado_pago
    (OrdenCompra, lo que decide si es "Pedido" o "Venta") — ambos opcionales
    e independientes entre sí en el mismo PATCH."""
    nuevo_estado = request.data.get('estado')
    if nuevo_estado:
        if nuevo_estado not in Pedido.Estado.values:
            raise ValueError('Estado de pedido inválido.')
        pedido.estado = nuevo_estado
        pedido.save(update_fields=['estado'])

    nuevo_estado_pago = request.data.get('estado_pago')
    if nuevo_estado_pago:
        if nuevo_estado_pago not in OrdenCompra.EstadoPago.values:
            raise ValueError('Estado de pago inválido.')
        pedido.orden_compra.estado_pago = nuevo_estado_pago
        pedido.orden_compra.save(update_fields=['estado_pago'])
        if nuevo_estado_pago == OrdenCompra.EstadoPago.PAGADO:
            pedido.orden_compra.pagos.filter(estado=Pago.Estado.PENDIENTE).update(
                estado=Pago.Estado.APROBADO, fecha_pago=timezone.now()
            )
            if pedido.estado == Pedido.Estado.PENDIENTE:
                pedido.estado = Pedido.Estado.CONFIRMADO
                pedido.save(update_fields=['estado'])


class ListaPedidosAdminView(generics.ListAPIView):
    """CU12: el SuperAdmin/Admin ve los pedidos/ventas de TODAS las
    empresas — ?empresa=<id> para filtrar a una en particular, ?tipo=
    pedido|venta para el dashboard correspondiente."""

    permission_classes = [EsAdmin]
    serializer_class = PedidoSerializer
    pagination_class = PedidoPagination

    def get_queryset(self):
        qs = _filtrar_pedidos(_pedidos_queryset(), self.request.query_params)
        empresa_id = self.request.query_params.get('empresa')
        if empresa_id:
            qs = qs.filter(empresa_id=empresa_id)
        return qs


class EditarEliminarPedidoAdminView(APIView):
    """CU12: edita (estado del pedido y/o estado de pago) o elimina
    cualquier pedido/venta."""

    permission_classes = [EsAdmin]

    def patch(self, request, pedido_id):
        pedido = get_object_or_404(Pedido.objects.select_related('orden_compra'), id=pedido_id)
        try:
            _aplicar_cambios_pedido(request, pedido)
        except ValueError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        _log(request, 'EDITAR_PEDIDO', pedido.id, {'numero_pedido': pedido.numero_pedido, 'estado': pedido.estado})
        return Response(PedidoSerializer(pedido).data)

    def delete(self, request, pedido_id):
        pedido = get_object_or_404(Pedido, id=pedido_id)
        numero = pedido.numero_pedido
        pedido.delete()
        _log(request, 'ELIMINAR_PEDIDO', pedido_id, {'numero_pedido': numero})
        return Response(status=status.HTTP_204_NO_CONTENT)


class ListaMisPedidosView(generics.ListAPIView):
    """CU12: la empresa (dueño o empleado con permiso 'gestionar_pedidos')
    ve SUS PROPIOS pedidos/ventas."""

    permission_classes = [TienePermisoEmpleado]
    permiso_requerido = 'gestionar_pedidos'
    serializer_class = PedidoSerializer
    pagination_class = PedidoPagination

    def get_queryset(self):
        qs = _pedidos_queryset().filter(empresa=self.request.user.get_empresa())
        return _filtrar_pedidos(qs, self.request.query_params)


class EditarEliminarMiPedidoView(APIView):
    """CU12: la empresa edita o elimina uno de SUS pedidos/ventas —
    get_object_or_404 filtra por su propia empresa."""

    permission_classes = [TienePermisoEmpleado]
    permiso_requerido = 'gestionar_pedidos'

    def patch(self, request, pedido_id):
        pedido = get_object_or_404(
            Pedido.objects.select_related('orden_compra'), id=pedido_id, empresa=request.user.get_empresa()
        )
        try:
            _aplicar_cambios_pedido(request, pedido)
        except ValueError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        _log(request, 'EDITAR_PEDIDO', pedido.id, {'numero_pedido': pedido.numero_pedido, 'estado': pedido.estado})
        return Response(PedidoSerializer(pedido).data)

    def delete(self, request, pedido_id):
        pedido = get_object_or_404(Pedido, id=pedido_id, empresa=request.user.get_empresa())
        numero = pedido.numero_pedido
        pedido.delete()
        _log(request, 'ELIMINAR_PEDIDO', pedido_id, {'numero_pedido': numero})
        return Response(status=status.HTTP_204_NO_CONTENT)


def _entregas_queryset():
    return Entrega.objects.select_related(
        'pedido__empresa', 'pedido__direccion_envio', 'pedido__sucursal_recojo',
        'pedido__orden_compra__comprador__usuario',
    ).order_by('-id')


def _marcar_entregada(entrega):
    with connection.cursor() as cursor:
        cursor.execute('SELECT fn_marcar_entregada(%s)', [entrega.pedido_id])
    entrega.refresh_from_db()


class ListaEntregasAdminView(generics.ListAPIView):
    """CU13: el SuperAdmin/Admin ve las entregas de TODAS las empresas —
    solo de pedidos ya pagados (una Entrega nace junto con su Pedido, pero
    solo importa el envío una vez que el pago está confirmado)."""

    permission_classes = [EsAdmin]
    serializer_class = EntregaSerializer
    pagination_class = PedidoPagination

    def get_queryset(self):
        qs = _entregas_queryset().filter(pedido__orden_compra__estado_pago=OrdenCompra.EstadoPago.PAGADO)
        empresa_id = self.request.query_params.get('empresa')
        if empresa_id:
            qs = qs.filter(pedido__empresa_id=empresa_id)
        estado = self.request.query_params.get('estado')
        if estado:
            qs = qs.filter(estado=estado)
        return qs


class EditarEliminarEntregaAdminView(APIView):
    """CU13: edita (estado/fecha) o elimina la entrega de cualquier pedido."""

    permission_classes = [EsAdmin]

    def patch(self, request, entrega_id):
        entrega = get_object_or_404(Entrega, id=entrega_id)
        serializer = EntregaSerializer(entrega, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        _log(request, 'EDITAR_ENTREGA', entrega.id, {'numero_pedido': entrega.pedido.numero_pedido, 'estado': entrega.estado}, entidad_afectada='entrega')
        return Response(EntregaSerializer(entrega).data)

    def delete(self, request, entrega_id):
        entrega = get_object_or_404(Entrega, id=entrega_id)
        numero = entrega.pedido.numero_pedido
        entrega.delete()
        _log(request, 'ELIMINAR_ENTREGA', entrega_id, {'numero_pedido': numero}, entidad_afectada='entrega')
        return Response(status=status.HTTP_204_NO_CONTENT)


class MarcarEntregadaAdminView(APIView):
    """CU13: atajo que marca la entrega ENTREGADA y, en la misma
    transacción (vía fn_marcar_entregada), el pedido como ENTREGADO —
    disparando la comisión de venta automática (CU26)."""

    permission_classes = [EsAdmin]

    def post(self, request, entrega_id):
        entrega = get_object_or_404(Entrega, id=entrega_id)
        _marcar_entregada(entrega)
        _log(request, 'MARCAR_ENTREGADA', entrega.id, {'numero_pedido': entrega.pedido.numero_pedido}, entidad_afectada='entrega')
        return Response(EntregaSerializer(entrega).data)


class ListaMisEntregasView(generics.ListAPIView):
    """CU13: la empresa (dueño o empleado con permiso 'gestionar_pedidos')
    ve las entregas de SUS PROPIOS pedidos pagados."""

    permission_classes = [TienePermisoEmpleado]
    permiso_requerido = 'gestionar_pedidos'
    serializer_class = EntregaSerializer
    pagination_class = PedidoPagination

    def get_queryset(self):
        qs = _entregas_queryset().filter(
            pedido__empresa=self.request.user.get_empresa(),
            pedido__orden_compra__estado_pago=OrdenCompra.EstadoPago.PAGADO,
        )
        estado = self.request.query_params.get('estado')
        if estado:
            qs = qs.filter(estado=estado)
        return qs


class EditarEliminarMiEntregaView(APIView):
    """CU13: la empresa edita o elimina la entrega de uno de SUS pedidos."""

    permission_classes = [TienePermisoEmpleado]
    permiso_requerido = 'gestionar_pedidos'

    def patch(self, request, entrega_id):
        entrega = get_object_or_404(Entrega, id=entrega_id, pedido__empresa=request.user.get_empresa())
        serializer = EntregaSerializer(entrega, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        _log(request, 'EDITAR_ENTREGA', entrega.id, {'numero_pedido': entrega.pedido.numero_pedido, 'estado': entrega.estado}, entidad_afectada='entrega')
        return Response(EntregaSerializer(entrega).data)

    def delete(self, request, entrega_id):
        entrega = get_object_or_404(Entrega, id=entrega_id, pedido__empresa=request.user.get_empresa())
        numero = entrega.pedido.numero_pedido
        entrega.delete()
        _log(request, 'ELIMINAR_ENTREGA', entrega_id, {'numero_pedido': numero}, entidad_afectada='entrega')
        return Response(status=status.HTTP_204_NO_CONTENT)


class MarcarMiEntregaEntregadaView(APIView):
    """CU13: la empresa marca la entrega de uno de SUS pedidos como
    ENTREGADA (ver MarcarEntregadaAdminView)."""

    permission_classes = [TienePermisoEmpleado]
    permiso_requerido = 'gestionar_pedidos'

    def post(self, request, entrega_id):
        entrega = get_object_or_404(Entrega, id=entrega_id, pedido__empresa=request.user.get_empresa())
        _marcar_entregada(entrega)
        _log(request, 'MARCAR_ENTREGADA', entrega.id, {'numero_pedido': entrega.pedido.numero_pedido}, entidad_afectada='entrega')
        return Response(EntregaSerializer(entrega).data)


class ListaMisComprasView(generics.ListAPIView):
    """CU26: el comprador ve (y desde el frontend puede imprimir/exportar)
    sus propios recibos de compra pagada — solo lectura, no puede editar
    ni eliminar (eso es exclusivo de SuperAdmin/empresa, ver CU12)."""

    permission_classes = [EsComprador]
    serializer_class = PedidoSerializer
    pagination_class = PedidoPagination

    def get_queryset(self):
        return _pedidos_queryset().filter(
            orden_compra__comprador__usuario=self.request.user,
        ).exclude(orden_compra__estado_pago=OrdenCompra.EstadoPago.FALLIDO)


def _numero_pedido():
    with connection.cursor() as cursor:
        cursor.execute('SELECT fn_generar_numero_pedido()')
        return cursor.fetchone()[0]


def _stock_disponible(producto_id):
    return InventarioSucursal.objects.filter(producto_id=producto_id).aggregate(
        total=Sum('cantidad_disponible')
    )['total'] or 0


def _descontar_stock(producto_id, cantidad, sucursal_id=None):
    """Descuenta stock atómicamente bloqueando la fila con select_for_update()."""
    qs = InventarioSucursal.objects.select_for_update().filter(producto_id=producto_id, cantidad_disponible__gte=cantidad)
    registro = qs.filter(sucursal_id=sucursal_id).first() if sucursal_id else qs.order_by('-cantidad_disponible').first()
    if not registro:
        return False
    registro.cantidad_disponible -= cantidad
    registro.save(update_fields=['cantidad_disponible'])
    return True


def _restituir_stock_orden(orden):
    """Restaura el stock reservado de una orden si la transacción de pago falla o es rechazada."""
    for pedido in orden.pedidos.prefetch_related('items__producto'):
        for item in pedido.items.all():
            qs = InventarioSucursal.objects.filter(producto=item.producto)
            if pedido.sucursal_recojo_id:
                reg = qs.filter(sucursal_id=pedido.sucursal_recojo_id).first()
            else:
                reg = qs.order_by('-cantidad_disponible').first()
            if reg:
                reg.cantidad_disponible += item.cantidad
                reg.save(update_fields=['cantidad_disponible'])


class IniciarCheckoutView(APIView):
    """CU12/CU26: crea la orden de compra real a partir del carrito
    (dividida en un Pedido por empresa, como ya documentaba
    OrdenCompra.__doc__). Soporta pago por QR (con comprobante adjunto)
    o pasarela de pago PayPal."""

    permission_classes = [EsComprador]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def post(self, request):
        items = request.data.get('items')
        if isinstance(items, str):
            try:
                items = json.loads(items)
            except Exception:
                items = []
        items = items or []

        entregas = request.data.get('entregas')
        if isinstance(entregas, str):
            try:
                entregas = json.loads(entregas)
            except Exception:
                entregas = {}
        entregas = entregas or {}

        payment_token_id = request.data.get('payment_token_id')
        plataforma = request.data.get('plataforma')
        metodo_pago = (request.data.get('metodo_pago') or 'PAYPAL').upper()
        comprobante = request.FILES.get('comprobante')

        if not items:
            return Response({'detail': 'El carrito está vacío.'}, status=status.HTTP_400_BAD_REQUEST)

        comprador = get_object_or_404(Comprador, usuario=request.user)
        producto_ids = [it['producto_id'] for it in items]
        productos = {p.id: p for p in Producto.objects.select_related('empresa').filter(id__in=producto_ids)}

        por_empresa = {}
        for it in items:
            producto = productos.get(it['producto_id'])
            cantidad = int(it.get('cantidad', 0))
            if not producto or cantidad <= 0:
                return Response({'detail': 'Hay un producto inválido en el carrito.'}, status=status.HTTP_400_BAD_REQUEST)
            if cantidad > _stock_disponible(producto.id):
                return Response({'detail': f'"{producto.nombre}" no tiene suficiente stock.'}, status=status.HTTP_400_BAD_REQUEST)

            precio_unitario = producto.precio_descuento if producto.precio_descuento else producto.precio
            grupo = por_empresa.setdefault(producto.empresa_id, {'empresa': producto.empresa, 'items': []})
            grupo['items'].append({'producto': producto, 'cantidad': cantidad, 'precio_unitario': precio_unitario})

        monto_total = sum(
            it['cantidad'] * it['precio_unitario']
            for grupo in por_empresa.values() for it in grupo['items']
        )

        metodo_orden = (
            OrdenCompra.MetodoPago.QR if metodo_pago == 'QR'
            else OrdenCompra.MetodoPago.PAYPAL
        )

        try:
            with transaction.atomic():
                orden = OrdenCompra.objects.create(
                    comprador=comprador,
                    monto_total=monto_total,
                    metodo_pago=metodo_orden,
                    estado_pago=OrdenCompra.EstadoPago.PENDIENTE,
                    comprobante=comprobante,
                )

                # CU11: Marca el carrito abierto del comprador como CONVERTIDO
                Carrito.objects.filter(comprador=comprador, estado=Carrito.Estado.ABIERTO).update(estado=Carrito.Estado.CONVERTIDO)

                for empresa_id, grupo in por_empresa.items():
                    entrega_cfg = entregas.get(str(empresa_id)) or {}
                    modalidad = entrega_cfg.get('modalidad')
                    sucursal = None
                    direccion = None
                    if modalidad == Pedido.ModalidadEntrega.RECOJO_TIENDA:
                        sucursal = get_object_or_404(Sucursal, id=entrega_cfg.get('sucursal_id'), empresa_id=empresa_id)
                    elif modalidad == Pedido.ModalidadEntrega.ENVIO_DOMICILIO:
                        direccion = get_object_or_404(Direccion, id=entrega_cfg.get('direccion_id'), comprador=comprador)
                    else:
                        raise ValueError(f'Falta indicar cómo se entrega el pedido de {grupo["empresa"].razon_social}.')

                    subtotal = sum(it['cantidad'] * it['precio_unitario'] for it in grupo['items'])
                    pedido = Pedido.objects.create(
                        orden_compra=orden, empresa_id=empresa_id, numero_pedido=_numero_pedido(),
                        subtotal=subtotal, modalidad_entrega=modalidad,
                        sucursal_recojo=sucursal, direccion_envio=direccion,
                    )
                    Entrega.objects.create(pedido=pedido, estado=Entrega.Estado.PENDIENTE)
                    PedidoItem.objects.bulk_create([
                        PedidoItem(
                            pedido=pedido, producto=it['producto'], cantidad=it['cantidad'],
                            precio_unitario=it['precio_unitario'], subtotal=it['cantidad'] * it['precio_unitario'],
                        )
                        for it in grupo['items']
                    ])
                    for it in grupo['items']:
                        if not _descontar_stock(it['producto'].id, it['cantidad'], sucursal.id if sucursal else None):
                            raise ValueError(f'"{it["producto"].nombre}" ya no tiene suficiente stock.')

                if metodo_orden == OrdenCompra.MetodoPago.QR:
                    Pago.objects.create(
                        orden_compra=orden,
                        monto=monto_total,
                        metodo=Pago.Metodo.QR,
                        comprobante=comprobante,
                        estado=Pago.Estado.PENDIENTE,
                        fecha_pago=timezone.now(),
                    )
        except ValueError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        # Si el comprador eligió QR con comprobante, se completa el pedido sin ir a PayPal
        if metodo_orden == OrdenCompra.MetodoPago.QR:
            _log(request, 'INICIAR_CHECKOUT_QR', orden.id, {'monto_total': str(monto_total)}, entidad_afectada='orden_compra')
            return Response({
                'orden_compra_id': orden.id,
                'numeros_pedido': list(orden.pedidos.values_list('numero_pedido', flat=True)),
                'metodo': 'QR',
                'requiere_popup_paypal': False,
                'mensaje': 'Pedido registrado con éxito. El vendedor verificará tu comprobante de pago.',
            }, status=status.HTTP_201_CREATED)

        # Flujo PayPal:
        monto_usd = (monto_total / settings.TASA_CAMBIO_USD_BOB).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
        try:
            if plataforma == 'movil':
                paypal_orden = paypal_client.crear_orden(
                    monto_usd, payment_token_id,
                    return_url='vecinomarket://pago-exitoso',
                    cancel_url='vecinomarket://pago-cancelado',
                )
            else:
                paypal_orden = paypal_client.crear_orden(monto_usd, payment_token_id)
        except PaypalError as exc:
            with transaction.atomic():
                _restituir_stock_orden(orden)
                orden.estado_pago = OrdenCompra.EstadoPago.FALLIDO
                orden.save(update_fields=['estado_pago'])
            return Response({'detail': str(exc), 'paypal': exc.detalle}, status=status.HTTP_502_BAD_GATEWAY)

        _log(request, 'INICIAR_CHECKOUT', orden.id, {'monto_total': str(monto_total), 'monto_usd': str(monto_usd)}, entidad_afectada='orden_compra')
        enlace_aprobacion = next(
            (l['href'] for l in paypal_orden.get('links', []) if l.get('rel') == 'approve'), None
        )
        return Response({
            'orden_compra_id': orden.id,
            'paypal_order_id': paypal_orden['id'],
            'requiere_popup_paypal': payment_token_id is None,
            'monto_usd': str(monto_usd),
            'enlace_aprobacion_paypal': enlace_aprobacion,
        }, status=status.HTTP_201_CREATED)


class ConfirmarPagoCheckoutView(APIView):
    """Segundo paso del checkout: confirma (captura) el pago en PayPal y
    recién ahí marca la orden como PAGADO — antes de esto la orden ya
    existe pero no cuenta como venta real (no aparece en 'Mis compras',
    que filtra por estado_pago=PAGADO). Si el pago falla, restituye el stock."""

    permission_classes = [EsComprador]

    def post(self, request, orden_compra_id):
        orden = get_object_or_404(
            OrdenCompra, id=orden_compra_id, comprador__usuario=request.user,
            estado_pago=OrdenCompra.EstadoPago.PENDIENTE,
        )
        paypal_order_id = request.data.get('paypal_order_id')
        if not paypal_order_id:
            return Response({'detail': 'Falta paypal_order_id.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            resultado = paypal_client.capturar_orden(paypal_order_id)
        except PaypalError as exc:
            with transaction.atomic():
                orden.estado_pago = OrdenCompra.EstadoPago.FALLIDO
                orden.save(update_fields=['estado_pago'])
                _restituir_stock_orden(orden)
                Pago.objects.create(
                    orden_compra=orden, monto=orden.monto_total, metodo=Pago.Metodo.PAYPAL,
                    referencia_pasarela=paypal_order_id, estado=Pago.Estado.RECHAZADO,
                )
            return Response({'detail': str(exc), 'paypal': exc.detalle}, status=status.HTTP_502_BAD_GATEWAY)

        aprobado = resultado.get('status') == 'COMPLETED'

        with transaction.atomic():
            if aprobado:
                orden.estado_pago = OrdenCompra.EstadoPago.PAGADO
                orden.pedidos.update(estado=Pedido.Estado.CONFIRMADO)
            else:
                orden.estado_pago = OrdenCompra.EstadoPago.FALLIDO
                _restituir_stock_orden(orden)
            orden.save(update_fields=['estado_pago'])
            Pago.objects.create(
                orden_compra=orden, monto=orden.monto_total, metodo=Pago.Metodo.PAYPAL,
                referencia_pasarela=paypal_order_id,
                estado=Pago.Estado.APROBADO if aprobado else Pago.Estado.RECHAZADO,
                fecha_pago=timezone.now() if aprobado else None,
            )

        _log(request, 'CONFIRMAR_PAGO', orden.id, {'aprobado': aprobado, 'paypal_order_id': paypal_order_id}, entidad_afectada='orden_compra')
        if not aprobado:
            return Response({'detail': 'PayPal no aprobó el pago.'}, status=status.HTTP_402_PAYMENT_REQUIRED)
        return Response({
            'aprobado': True,
            'orden_compra_id': orden.id,
            'numeros_pedido': list(orden.pedidos.values_list('numero_pedido', flat=True)),
        })
