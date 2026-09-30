from django.db import Error as DatabaseError
from django.db import connection, models
from django.shortcuts import get_object_or_404
from rest_framework import generics, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.auditoria.models import LogAuditoria
from apps.core.utils import get_client_ip
from apps.usuarios.permissions import EsAdmin, TienePermisoEmpleado

from .models import InventarioSucursal, Sucursal
from .serializers import InventarioAdminSerializer, SucursalAdminSerializer


def _log(request, accion, entidad_id, detalle=None, entidad_afectada='inventario'):
    LogAuditoria.objects.create(
        usuario=request.user,
        accion=accion,
        entidad_afectada=entidad_afectada,
        entidad_id=entidad_id,
        detalle=detalle or {},
        ip_origen=get_client_ip(request),
        user_agent=request.META.get('HTTP_USER_AGENT', ''),
    )


class ListaSucursalesAdminView(generics.ListAPIView):
    """CU10: sucursales de una empresa (contexto para agrupar el inventario)."""

    permission_classes = [EsAdmin]
    serializer_class = SucursalAdminSerializer
    pagination_class = None

    def get_queryset(self):
        qs = Sucursal.objects.filter(activo=True).select_related('empresa').order_by('nombre')
        empresa_id = self.request.query_params.get('empresa')
        if empresa_id:
            qs = qs.filter(empresa_id=empresa_id)
        return qs


class ListaSucursalesPublicoView(generics.ListAPIView):
    """El comprador ve las sucursales activas de una empresa (?empresa=<id>)
    para elegir dónde recoger su pedido en el checkout — de solo lectura,
    sin datos sensibles (nombre, dirección, teléfono)."""

    permission_classes = [AllowAny]
    serializer_class = SucursalAdminSerializer
    pagination_class = None

    def get_queryset(self):
        empresa_id = self.request.query_params.get('empresa')
        if not empresa_id:
            return Sucursal.objects.none()
        return Sucursal.objects.filter(
            activo=True, estado=Sucursal.Estado.ACTIVA, empresa_id=empresa_id
        ).order_by('nombre')


class ListaInventarioAdminView(generics.ListAPIView):
    """CU10: el SuperAdmin/Admin ve el stock de todos los productos de una
    empresa en todas sus sucursales — ?empresa=<id> (obligatorio en la
    práctica: sin filtro devuelve el inventario de toda la plataforma)."""

    permission_classes = [EsAdmin]
    serializer_class = InventarioAdminSerializer
    pagination_class = None

    def get_queryset(self):
        qs = InventarioSucursal.objects.select_related('producto', 'sucursal').order_by('producto__nombre')

        empresa_id = self.request.query_params.get('empresa')
        if empresa_id:
            qs = qs.filter(sucursal__empresa_id=empresa_id)

        sucursal_id = self.request.query_params.get('sucursal')
        if sucursal_id:
            qs = qs.filter(sucursal_id=sucursal_id)

        if self.request.query_params.get('stock_bajo') == 'true':
            qs = qs.filter(cantidad_disponible__lte=models.F('stock_minimo'))

        return qs


class EditarInventarioAdminView(APIView):
    """CU10: edita el stock mínimo (umbral de alerta). El stock disponible
    se ajusta aparte, con AjustarStockAdminView."""

    permission_classes = [EsAdmin]

    def patch(self, request, inventario_id):
        registro = get_object_or_404(InventarioSucursal, id=inventario_id)
        serializer = InventarioAdminSerializer(registro, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        _log(request, 'EDITAR_INVENTARIO', registro.id, {'producto': registro.producto.nombre, 'stock_minimo': registro.stock_minimo})
        return Response(InventarioAdminSerializer(registro).data)


class AjustarStockAdminView(APIView):
    """CU10: suma o resta unidades al stock disponible (delta positivo o
    negativo) vía fn_ajustar_stock — la función es la única puerta de
    entrada que valida que el stock nunca quede negativo."""

    permission_classes = [EsAdmin]

    def post(self, request, inventario_id):
        try:
            delta = int(request.data.get('delta'))
        except (TypeError, ValueError):
            return Response({'detail': 'delta debe ser un número entero distinto de 0.'}, status=status.HTTP_400_BAD_REQUEST)
        if delta == 0:
            return Response({'detail': 'delta debe ser un número entero distinto de 0.'}, status=status.HTTP_400_BAD_REQUEST)

        registro = get_object_or_404(InventarioSucursal, id=inventario_id)

        try:
            with connection.cursor() as cursor:
                cursor.execute('SELECT fn_ajustar_stock(%s, %s)', [inventario_id, delta])
                nueva_cantidad = cursor.fetchone()[0]
        except DatabaseError as exc:
            return Response({'detail': str(exc).split('\n')[0]}, status=status.HTTP_400_BAD_REQUEST)

        registro.refresh_from_db()
        _log(request, 'AJUSTAR_STOCK', registro.id, {
            'producto': registro.producto.nombre, 'delta': delta, 'nueva_cantidad': nueva_cantidad,
        })
        return Response(InventarioAdminSerializer(registro).data)


# ---------------------------------------------------------------------------
# Endpoints de Inventario para Empresas (dueño o empleado con permiso 'gestionar_inventario')
# ---------------------------------------------------------------------------

class ListaMisSucursalesEmpresaView(generics.ListAPIView):
    """CU10: la empresa ve sus propias sucursales activas."""

    permission_classes = [TienePermisoEmpleado]
    permiso_requerido = 'gestionar_inventario'
    serializer_class = SucursalAdminSerializer
    pagination_class = None

    def get_queryset(self):
        empresa = self.request.user.get_empresa()
        return Sucursal.objects.filter(activo=True, empresa=empresa).order_by('nombre')


class ListaMiInventarioEmpresaView(generics.ListAPIView):
    """CU10: la empresa ve el stock de sus productos en sus propias sucursales."""

    permission_classes = [TienePermisoEmpleado]
    permiso_requerido = 'gestionar_inventario'
    serializer_class = InventarioAdminSerializer
    pagination_class = None

    def get_queryset(self):
        empresa = self.request.user.get_empresa()
        qs = InventarioSucursal.objects.filter(
            sucursal__empresa=empresa
        ).select_related('producto', 'sucursal').order_by('producto__nombre')

        sucursal_id = self.request.query_params.get('sucursal')
        if sucursal_id:
            qs = qs.filter(sucursal_id=sucursal_id)

        if self.request.query_params.get('stock_bajo') == 'true':
            qs = qs.filter(cantidad_disponible__lte=models.F('stock_minimo'))

        return qs


class EditarMiInventarioEmpresaView(APIView):
    """CU10: la empresa edita el stock mínimo de uno de sus registros de inventario."""

    permission_classes = [TienePermisoEmpleado]
    permiso_requerido = 'gestionar_inventario'

    def patch(self, request, inventario_id):
        empresa = request.user.get_empresa()
        registro = get_object_or_404(InventarioSucursal, id=inventario_id, sucursal__empresa=empresa)
        serializer = InventarioAdminSerializer(registro, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        _log(request, 'EDITAR_INVENTARIO', registro.id, {'producto': registro.producto.nombre, 'stock_minimo': registro.stock_minimo})
        return Response(InventarioAdminSerializer(registro).data)


class AjustarMiStockEmpresaView(APIView):
    """CU10: la empresa ajusta el stock de un producto en una de sus sucursales."""

    permission_classes = [TienePermisoEmpleado]
    permiso_requerido = 'gestionar_inventario'

    def post(self, request, inventario_id):
        try:
            delta = int(request.data.get('delta'))
        except (TypeError, ValueError):
            return Response({'detail': 'delta debe ser un número entero distinto de 0.'}, status=status.HTTP_400_BAD_REQUEST)
        if delta == 0:
            return Response({'detail': 'delta debe ser un número entero distinto de 0.'}, status=status.HTTP_400_BAD_REQUEST)

        empresa = request.user.get_empresa()
        registro = get_object_or_404(InventarioSucursal, id=inventario_id, sucursal__empresa=empresa)

        try:
            with connection.cursor() as cursor:
                cursor.execute('SELECT fn_ajustar_stock(%s, %s)', [inventario_id, delta])
                nueva_cantidad = cursor.fetchone()[0]
        except DatabaseError as exc:
            return Response({'detail': str(exc).split('\n')[0]}, status=status.HTTP_400_BAD_REQUEST)

        registro.refresh_from_db()
        _log(request, 'AJUSTAR_STOCK', registro.id, {
            'producto': registro.producto.nombre, 'delta': delta, 'nueva_cantidad': nueva_cantidad,
        })
        return Response(InventarioAdminSerializer(registro).data)
