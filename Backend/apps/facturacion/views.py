from django.db import DatabaseError, connection
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.auditoria.models import LogAuditoria
from apps.core.exportadores import responder_exportacion
from apps.core.utils import get_client_ip
from apps.usuarios.permissions import EsAdmin, TienePermisoEmpleado

from .models import Factura, MetodoPago, Referido
from .serializers import FacturaSerializer, MetodoPagoAdminSerializer, MetodoPagoEmpresaSerializer, ReferidoSerializer


def _log(request, accion, entidad_id, detalle=None, entidad_afectada='metodo_pago'):
    LogAuditoria.objects.create(
        usuario=request.user,
        accion=accion,
        entidad_afectada=entidad_afectada,
        entidad_id=entidad_id,
        detalle=detalle or {},
        ip_origen=get_client_ip(request),
    )


class ListaCrearMetodoPagoAdminView(generics.ListCreateAPIView):
    """CU25: el SuperAdmin/Admin ve y registra los métodos de pago de
    cualquier empresa (?empresa=<id> para filtrar a una en particular)."""

    permission_classes = [EsAdmin]
    serializer_class = MetodoPagoAdminSerializer
    pagination_class = None
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_queryset(self):
        qs = MetodoPago.objects.filter(activo=True).select_related('empresa').order_by('-predeterminado', '-creado_en')
        empresa_id = self.request.query_params.get('empresa')
        if empresa_id:
            qs = qs.filter(empresa_id=empresa_id)
        return qs

    def perform_create(self, serializer):
        metodo = serializer.save()
        _log(self.request, 'CREAR_METODO_PAGO', metodo.id, {'nombre': metodo.nombre, 'empresa_id': metodo.empresa_id})


class EditarEliminarMetodoPagoAdminView(APIView):
    """CU25: edita o elimina el método de pago de cualquier empresa."""

    permission_classes = [EsAdmin]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def patch(self, request, metodo_id):
        metodo = get_object_or_404(MetodoPago, id=metodo_id)
        serializer = MetodoPagoAdminSerializer(metodo, data=request.data, partial=True, context={'request': request})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        _log(request, 'EDITAR_METODO_PAGO', metodo.id, {'nombre': metodo.nombre})
        return Response(MetodoPagoAdminSerializer(metodo, context={'request': request}).data)

    def delete(self, request, metodo_id):
        metodo = get_object_or_404(MetodoPago, id=metodo_id)
        nombre = metodo.nombre
        metodo.delete()
        _log(request, 'ELIMINAR_METODO_PAGO', metodo_id, {'nombre': nombre})
        return Response(status=status.HTTP_204_NO_CONTENT)


class ListaCrearMisMetodosPagoView(generics.ListCreateAPIView):
    """CU25: la empresa (el dueño, o un empleado con el permiso
    'gestionar_pagos') ve y registra SUS PROPIOS métodos de pago —
    'empresa' se fuerza a la del usuario autenticado, nunca la manda el
    cliente, para que un empleado no pueda tocar los de otra empresa."""

    permission_classes = [TienePermisoEmpleado]
    permiso_requerido = 'gestionar_pagos'
    serializer_class = MetodoPagoEmpresaSerializer
    pagination_class = None
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_queryset(self):
        return MetodoPago.objects.filter(
            activo=True, empresa=self.request.user.get_empresa()
        ).order_by('-predeterminado', '-creado_en')

    def perform_create(self, serializer):
        metodo = serializer.save(empresa=self.request.user.get_empresa())
        _log(self.request, 'CREAR_METODO_PAGO', metodo.id, {'nombre': metodo.nombre})


class EditarEliminarMiMetodoPagoView(APIView):
    """CU25: la empresa edita o elimina uno de SUS métodos de pago —
    get_object_or_404 filtra por su propia empresa, así que no puede
    tocar el de otra aunque adivine el id."""

    permission_classes = [TienePermisoEmpleado]
    permiso_requerido = 'gestionar_pagos'
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def patch(self, request, metodo_id):
        metodo = get_object_or_404(MetodoPago, id=metodo_id, empresa=request.user.get_empresa())
        serializer = MetodoPagoEmpresaSerializer(metodo, data=request.data, partial=True, context={'request': request})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        _log(request, 'EDITAR_METODO_PAGO', metodo.id, {'nombre': metodo.nombre})
        return Response(MetodoPagoEmpresaSerializer(metodo, context={'request': request}).data)

    def delete(self, request, metodo_id):
        metodo = get_object_or_404(MetodoPago, id=metodo_id, empresa=request.user.get_empresa())
        nombre = metodo.nombre
        metodo.delete()
        _log(request, 'ELIMINAR_METODO_PAGO', metodo_id, {'nombre': nombre})
        return Response(status=status.HTTP_204_NO_CONTENT)


def _facturas_queryset():
    return Factura.objects.select_related('empresa').prefetch_related('comisiones__pedido').order_by('-creado_en')


def _filtrar_facturas(qs, params):
    tipo = params.get('tipo')
    if tipo:
        qs = qs.filter(tipo=tipo)
    estado_pago = params.get('estado_pago')
    if estado_pago:
        qs = qs.filter(estado_pago=estado_pago)
    return qs


class ListaFacturasAdminView(generics.ListAPIView):
    """CU26: el SuperAdmin/Admin ve las facturas (suscripción y comisión)
    de TODAS las empresas — ?empresa=<id> para filtrar a una."""

    permission_classes = [EsAdmin]
    serializer_class = FacturaSerializer
    pagination_class = None

    def get_queryset(self):
        qs = _filtrar_facturas(_facturas_queryset(), self.request.query_params)
        empresa_id = self.request.query_params.get('empresa')
        if empresa_id:
            qs = qs.filter(empresa_id=empresa_id)
        return qs


class EditarEliminarFacturaAdminView(APIView):
    """CU26: edita (monto/estado de pago/fecha de pago) o elimina
    cualquier factura."""

    permission_classes = [EsAdmin]

    def patch(self, request, factura_id):
        factura = get_object_or_404(Factura, id=factura_id)
        serializer = FacturaSerializer(factura, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        _log(request, 'EDITAR_FACTURA', factura.id, {'empresa_id': factura.empresa_id, 'monto': str(factura.monto)}, entidad_afectada='factura')
        return Response(FacturaSerializer(factura).data)

    def delete(self, request, factura_id):
        factura = get_object_or_404(Factura, id=factura_id)
        factura.delete()
        _log(request, 'ELIMINAR_FACTURA', factura_id, {}, entidad_afectada='factura')
        return Response(status=status.HTTP_204_NO_CONTENT)


class ListaMisFacturasView(generics.ListAPIView):
    """CU26: la empresa (dueño o empleado con permiso
    'gestionar_facturacion') ve SUS PROPIAS facturas."""

    permission_classes = [TienePermisoEmpleado]
    permiso_requerido = 'gestionar_facturacion'
    serializer_class = FacturaSerializer
    pagination_class = None

    def get_queryset(self):
        qs = _facturas_queryset().filter(empresa=self.request.user.get_empresa())
        return _filtrar_facturas(qs, self.request.query_params)


class EditarEliminarMiFacturaView(APIView):
    """CU26: la empresa edita o elimina una de SUS facturas."""

    permission_classes = [TienePermisoEmpleado]
    permiso_requerido = 'gestionar_facturacion'

    def patch(self, request, factura_id):
        factura = get_object_or_404(Factura, id=factura_id, empresa=request.user.get_empresa())
        serializer = FacturaSerializer(factura, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        _log(request, 'EDITAR_FACTURA', factura.id, {'monto': str(factura.monto)}, entidad_afectada='factura')
        return Response(FacturaSerializer(factura).data)

    def delete(self, request, factura_id):
        factura = get_object_or_404(Factura, id=factura_id, empresa=request.user.get_empresa())
        factura.delete()
        _log(request, 'ELIMINAR_FACTURA', factura_id, {}, entidad_afectada='factura')
        return Response(status=status.HTTP_204_NO_CONTENT)


ESTADOS_PAGO_LEGIBLES = dict(Factura.EstadoPago.choices)
TIPOS_FACTURA_LEGIBLES = dict(Factura.Tipo.choices)


def _secciones_factura(factura):
    datos = [
        ['Empresa', factura.empresa.razon_social],
        ['NIT', factura.empresa.nit or '—'],
        ['N° de factura', f'FAC-{factura.id:06d}'],
        ['Tipo', TIPOS_FACTURA_LEGIBLES.get(factura.tipo, factura.tipo)],
        ['Fecha de emisión', factura.creado_en.strftime('%d/%m/%Y %H:%M')],
        ['Estado de pago', ESTADOS_PAGO_LEGIBLES.get(factura.estado_pago, factura.estado_pago)],
        ['Fecha de pago', factura.fecha_pago.strftime('%d/%m/%Y %H:%M') if factura.fecha_pago else '—'],
    ]
    if factura.periodo_desde or factura.periodo_hasta:
        periodo = f"{factura.periodo_desde or '—'} al {factura.periodo_hasta or '—'}"
        datos.append(['Periodo facturado', periodo])

    secciones = [{'titulo': 'Datos de la factura', 'headers': ['Campo', 'Valor'], 'filas': datos}]

    if factura.tipo == Factura.Tipo.COMISION:
        comisiones = list(factura.comisiones.select_related('pedido').prefetch_related('pedido__items__producto'))

        filas_ventas = []
        for comision in comisiones:
            for item in comision.pedido.items.all():
                filas_ventas.append([
                    comision.pedido.numero_pedido,
                    comision.pedido.creado_en.strftime('%d/%m/%Y'),
                    item.producto.nombre,
                    item.cantidad,
                    f'{item.precio_unitario:.2f}',
                    f'{item.subtotal:.2f}',
                ])
        secciones.append({
            'titulo': 'Qué se vendió',
            'headers': ['Pedido', 'Fecha', 'Producto', 'Cantidad', 'Precio unitario (Bs)', 'Subtotal (Bs)'],
            'filas': filas_ventas,
        })

        filas_comisiones = [
            [c.pedido.numero_pedido, f'{c.monto_venta:.2f}', f'{c.porcentaje_aplicado}%', f'{c.monto_comision:.2f}']
            for c in comisiones
        ]
        secciones.append({
            'titulo': 'Comisión por pedido',
            'headers': ['Pedido', 'Monto de venta (Bs)', '% aplicado', 'Comisión (Bs)'],
            'filas': filas_comisiones,
        })

    secciones.append({
        'titulo': 'Total',
        'headers': ['Concepto', 'Monto (Bs)'],
        'filas': [['Total facturado', f'{factura.monto:.2f}']],
    })
    return secciones


class ExportarFacturaAdminView(APIView):
    """CU26: el SuperAdmin exporta cualquier factura como proforma
    (csv/xlsx/pdf/html, o al correo con ?formato=email) — para las de
    comisión, incluye el detalle de qué se vendió y a qué precio, no solo
    el monto agregado."""

    permission_classes = [EsAdmin]

    def get(self, request, factura_id):
        factura = get_object_or_404(Factura.objects.select_related('empresa'), id=factura_id)
        return responder_exportacion(
            request, f'factura-{factura.id}',
            f'Factura FAC-{factura.id:06d} · {factura.empresa.razon_social}',
            f'VecinoMarket · Generado el {timezone.now().strftime("%d/%m/%Y %H:%M")}',
            _secciones_factura(factura),
        )


class ExportarMiFacturaView(APIView):
    """CU26: la empresa exporta una de SUS facturas como proforma."""

    permission_classes = [TienePermisoEmpleado]
    permiso_requerido = 'gestionar_facturacion'

    def get(self, request, factura_id):
        factura = get_object_or_404(
            Factura.objects.select_related('empresa'), id=factura_id, empresa=request.user.get_empresa()
        )
        return responder_exportacion(
            request, f'factura-{factura.id}',
            f'Factura FAC-{factura.id:06d} · {factura.empresa.razon_social}',
            f'VecinoMarket · Generado el {timezone.now().strftime("%d/%m/%Y %H:%M")}',
            _secciones_factura(factura),
        )


class ListaReferidosAdminView(generics.ListAPIView):
    """CU27: el SuperAdmin ve todos los referidos (qué empresa invitó a
    cuál, y en qué estado va)."""

    permission_classes = [EsAdmin]
    serializer_class = ReferidoSerializer
    pagination_class = None

    def get_queryset(self):
        qs = Referido.objects.select_related('empresa_referente', 'empresa_referida').order_by('-creado_en')
        estado = self.request.query_params.get('estado')
        if estado:
            qs = qs.filter(estado=estado)
        return qs


class ConfirmarReferidoAdminView(APIView):
    """CU27: confirma un referido y aplica el beneficio (30 días extra de
    suscripción a la empresa que refirió) vía fn_confirmar_referido."""

    permission_classes = [EsAdmin]

    def post(self, request, referido_id):
        try:
            with connection.cursor() as cursor:
                cursor.execute('SELECT fn_confirmar_referido(%s)', [referido_id])
        except DatabaseError as exc:
            return Response({'detail': str(exc).split('\n')[0]}, status=status.HTTP_400_BAD_REQUEST)

        referido = get_object_or_404(Referido, id=referido_id)
        _log(request, 'CONFIRMAR_REFERIDO', referido.id, {
            'empresa_referente_id': referido.empresa_referente_id, 'empresa_referida_id': referido.empresa_referida_id,
        }, entidad_afectada='referido')
        return Response(ReferidoSerializer(referido).data)


class ListaMisReferidosView(generics.ListAPIView):
    """CU27: la empresa (dueño o empleado con permiso 'ver_reportes') ve
    las empresas que ha referido y en qué estado va cada una — de solo
    lectura, la confirmación es del SuperAdmin."""

    permission_classes = [TienePermisoEmpleado]
    permiso_requerido = 'ver_reportes'
    serializer_class = ReferidoSerializer
    pagination_class = None

    def get_queryset(self):
        return Referido.objects.filter(
            empresa_referente=self.request.user.get_empresa()
        ).select_related('empresa_referente', 'empresa_referida').order_by('-creado_en')
