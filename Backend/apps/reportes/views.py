from django.db import connection
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.utils.dateparse import parse_date
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.auditoria.models import LogAuditoria
from apps.core.exportadores import responder_exportacion
from apps.core.utils import get_client_ip
from apps.pedidos.models import Pedido
from apps.usuarios.models import Comprador, Empresa
from apps.usuarios.permissions import EsAdmin, EsComprador, EsEmpresaOEmpleado, TienePermisoEmpleado

from . import reportes_dinamicos
from .models import RecomendacionIA, Valoracion
from .serializers import RecomendacionIASerializer, ValoracionSerializer


def _log(request, accion, entidad_id, detalle=None):
    LogAuditoria.objects.create(
        usuario=request.user,
        accion=accion,
        entidad_afectada='valoracion',
        entidad_id=entidad_id,
        detalle=detalle or {},
        ip_origen=get_client_ip(request),
    )


class ListaCrearMisValoracionesView(generics.ListCreateAPIView):
    """CU04: el comprador ve y crea SUS valoraciones — solo puede calificar
    un pedido propio ya ENTREGADO, y solo una vez (OneToOne pedido<->
    valoracion; el segundo intento cae en el 400 de abajo)."""

    permission_classes = [EsComprador]
    serializer_class = ValoracionSerializer
    pagination_class = None

    def get_queryset(self):
        return Valoracion.objects.filter(comprador__usuario=self.request.user, activo=True).order_by('-creado_en')

    def create(self, request, *args, **kwargs):
        pedido_id = request.data.get('pedido')
        pedido = get_object_or_404(
            Pedido.objects.select_related('empresa', 'orden_compra__comprador'),
            id=pedido_id, orden_compra__comprador__usuario=request.user,
        )
        if pedido.estado != Pedido.Estado.ENTREGADO:
            return Response({'detail': 'Solo puedes calificar pedidos ya entregados.'}, status=status.HTTP_400_BAD_REQUEST)
        if Valoracion.objects.filter(pedido=pedido).exists():
            return Response({'detail': 'Ya calificaste este pedido.'}, status=status.HTTP_400_BAD_REQUEST)

        comprador = get_object_or_404(Comprador, usuario=request.user)
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        valoracion = serializer.save(pedido=pedido, comprador=comprador, empresa=pedido.empresa)
        _log(request, 'CREAR_VALORACION', valoracion.id, {'empresa_id': valoracion.empresa_id, 'calificacion': valoracion.calificacion})
        return Response(ValoracionSerializer(valoracion).data, status=status.HTTP_201_CREATED)


class EditarEliminarMiValoracionView(APIView):
    """CU04: el comprador edita o elimina una de SUS valoraciones."""

    permission_classes = [EsComprador]

    def patch(self, request, valoracion_id):
        valoracion = get_object_or_404(Valoracion, id=valoracion_id, comprador__usuario=request.user)
        serializer = ValoracionSerializer(valoracion, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        _log(request, 'EDITAR_VALORACION', valoracion.id, {'calificacion': valoracion.calificacion})
        return Response(ValoracionSerializer(valoracion).data)

    def delete(self, request, valoracion_id):
        valoracion = get_object_or_404(Valoracion, id=valoracion_id, comprador__usuario=request.user)
        valoracion.delete()
        _log(request, 'ELIMINAR_VALORACION', valoracion_id, {})
        return Response(status=status.HTTP_204_NO_CONTENT)


class ListaValoracionesEmpresaView(generics.ListAPIView):
    """CU04: la empresa (dueño o empleado con permiso 'ver_reportes') ve
    las valoraciones que recibió — de solo lectura, no puede editar ni
    eliminar (eso es del comprador que la escribió, o del SuperAdmin para
    moderar)."""

    permission_classes = [TienePermisoEmpleado]
    permiso_requerido = 'ver_reportes'
    serializer_class = ValoracionSerializer
    pagination_class = None

    def get_queryset(self):
        return Valoracion.objects.filter(
            empresa=self.request.user.get_empresa(), activo=True
        ).select_related('comprador__usuario', 'pedido').order_by('-creado_en')


class ListaResumenEmpresasValoracionesAdminView(APIView):
    """CU04: el SuperAdmin ve, por empresa, su ponderación global en
    estrellas y cuántas reseñas tiene, antes de entrar a leer los
    comentarios de una en particular."""

    permission_classes = [EsAdmin]

    def get(self, request):
        empresas = Empresa.objects.all().order_by('razon_social')
        q = request.query_params.get('q', '').strip()
        if q:
            empresas = empresas.filter(razon_social__icontains=q)

        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT empresa_id, ROUND(AVG(calificacion)::numeric, 2), COUNT(*)
                FROM reportes_valoracion
                WHERE activo = true
                GROUP BY empresa_id
            """)
            resumen = {row[0]: {'promedio': float(row[1]), 'total': row[2]} for row in cursor.fetchall()}

        vacio = {'promedio': 0, 'total': 0}
        resultados = [
            {
                'id': e.id, 'razon_social': e.razon_social, 'slug': e.slug,
                'logo_url': e.logo_url, 'ciudad': e.ciudad,
                **resumen.get(e.id, vacio),
            }
            for e in empresas
        ]
        return Response(resultados)


class ListaValoracionesAdminView(generics.ListAPIView):
    """CU04: el SuperAdmin ve los comentarios de una empresa (?empresa=<id>)
    — de solo lectura salvo por la eliminación (moderación de reseñas
    falsas u ofensivas), ver EliminarValoracionAdminView."""

    permission_classes = [EsAdmin]
    serializer_class = ValoracionSerializer
    pagination_class = None

    def get_queryset(self):
        qs = Valoracion.objects.filter(activo=True).select_related('comprador__usuario', 'empresa', 'pedido').order_by('-creado_en')
        empresa_id = self.request.query_params.get('empresa')
        if empresa_id:
            qs = qs.filter(empresa_id=empresa_id)
        return qs


class EliminarValoracionAdminView(APIView):
    """CU04: el SuperAdmin elimina (modera) una reseña — no la edita, para
    no falsificar lo que escribió el comprador."""

    permission_classes = [EsAdmin]

    def delete(self, request, valoracion_id):
        valoracion = get_object_or_404(Valoracion, id=valoracion_id)
        _log(request, 'MODERAR_VALORACION', valoracion_id, {'empresa_id': valoracion.empresa_id})
        valoracion.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)






class ListaMisRecomendacionesView(generics.ListAPIView):
    """CU21: el comprador ve sus recomendaciones — si todavía no se
    generaron (o quiere refrescarlas), llama primero a
    GenerarMisRecomendacionesView."""

    permission_classes = [EsComprador]
    serializer_class = RecomendacionIASerializer
    pagination_class = None

    def get_serializer_context(self):
        return {**super().get_serializer_context(), 'request': self.request}

    def get_queryset(self):
        comprador = get_object_or_404(Comprador, usuario=self.request.user)
        return RecomendacionIA.objects.filter(comprador=comprador).select_related('producto__empresa').prefetch_related('producto__imagenes').order_by('-score')


class GenerarMisRecomendacionesView(APIView):
    """CU21: regenera las recomendaciones del comprador autenticado vía
    fn_generar_recomendaciones (filtrado colaborativo + respaldo por
    popularidad) y las devuelve."""

    permission_classes = [EsComprador]

    def post(self, request):
        comprador = get_object_or_404(Comprador, usuario=request.user)
        with connection.cursor() as cursor:
            cursor.execute('SELECT fn_generar_recomendaciones(%s, %s)', [comprador.id, 10])
            total = cursor.fetchone()[0]

        recomendaciones = RecomendacionIA.objects.filter(comprador=comprador).select_related(
            'producto__empresa'
        ).prefetch_related('producto__imagenes').order_by('-score')
        serializer = RecomendacionIASerializer(recomendaciones, many=True, context={'request': request})
        return Response({'total': total, 'recomendaciones': serializer.data})


def _ventas_por_dia(empresa_id, dias=14):
    with connection.cursor() as cursor:
        cursor.execute('SELECT dia, total_ventas, total_pedidos FROM fn_ventas_por_dia(%s, %s)', [empresa_id, dias])
        return [
            {'dia': row[0].isoformat(), 'total_ventas': float(row[1]), 'total_pedidos': row[2]}
            for row in cursor.fetchall()
        ]


def _dashboard_admin():
    with connection.cursor() as cursor:
        cursor.execute("SELECT rol, COUNT(*) FROM usuarios_usuario WHERE estado = 'ACTIVO' GROUP BY rol")
        usuarios_por_rol = {row[0]: row[1] for row in cursor.fetchall()}

        cursor.execute("SELECT estado, COUNT(*) FROM pedidos_pedido GROUP BY estado")
        pedidos_por_estado = {row[0]: row[1] for row in cursor.fetchall()}

        cursor.execute("""
            SELECT COALESCE(SUM(p.subtotal), 0), COUNT(*)
            FROM pedidos_pedido p
            JOIN pedidos_ordencompra oc ON oc.id = p.orden_compra_id
            WHERE oc.estado_pago = 'PAGADO'
        """)
        total_ventas, total_ventas_count = cursor.fetchone()

        cursor.execute("SELECT COALESCE(SUM(monto_comision), 0) FROM facturacion_comisionventa")
        total_comisiones = cursor.fetchone()[0]

        cursor.execute("SELECT COALESCE(ROUND(AVG(calificacion)::numeric, 2), 0) FROM reportes_valoracion WHERE activo = true")
        valoracion_promedio = cursor.fetchone()[0]

        cursor.execute("""
            SELECT e.id, e.razon_social, SUM(p.subtotal) AS ventas
            FROM pedidos_pedido p
            JOIN pedidos_ordencompra oc ON oc.id = p.orden_compra_id
            JOIN usuarios_empresa e ON e.id = p.empresa_id
            WHERE oc.estado_pago = 'PAGADO'
            GROUP BY e.id, e.razon_social
            ORDER BY ventas DESC
            LIMIT 5
        """)
        top_empresas = [{'empresa': row[1], 'ventas': float(row[2])} for row in cursor.fetchall()]

        cursor.execute("""
            SELECT prod.id, prod.nombre, SUM(pi.cantidad) AS unidades
            FROM pedidos_pedidoitem pi
            JOIN pedidos_pedido p ON p.id = pi.pedido_id
            JOIN pedidos_ordencompra oc ON oc.id = p.orden_compra_id
            JOIN catalogo_producto prod ON prod.id = pi.producto_id
            WHERE oc.estado_pago = 'PAGADO'
            GROUP BY prod.id, prod.nombre
            ORDER BY unidades DESC
            LIMIT 5
        """)
        top_productos = [{'producto': row[1], 'unidades': row[2]} for row in cursor.fetchall()]

    return {
        'total_empresas': Empresa.objects.count(),
        'usuarios_por_rol': usuarios_por_rol,
        'pedidos_por_estado': pedidos_por_estado,
        'total_ventas': float(total_ventas),
        'total_ventas_count': total_ventas_count,
        'total_comisiones': float(total_comisiones),
        'valoracion_promedio': float(valoracion_promedio),
        'top_empresas': top_empresas,
        'top_productos': top_productos,
        'ventas_por_dia': _ventas_por_dia(None, 14),
    }


class DashboardAdminView(APIView):
    """CU19: panel global del SuperAdmin — ventas, comisiones, usuarios,
    empresas y lo más vendido de toda la plataforma."""

    permission_classes = [EsAdmin]

    def get(self, request):
        return Response(_dashboard_admin())


def _dashboard_empresa(empresa_id):
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT COALESCE(SUM(p.subtotal), 0), COUNT(*)
            FROM pedidos_pedido p
            JOIN pedidos_ordencompra oc ON oc.id = p.orden_compra_id
            WHERE oc.estado_pago = 'PAGADO' AND p.empresa_id = %s
        """, [empresa_id])
        total_ventas, total_ventas_count = cursor.fetchone()

        cursor.execute("""
            SELECT COUNT(*)
            FROM pedidos_pedido p
            JOIN pedidos_ordencompra oc ON oc.id = p.orden_compra_id
            WHERE oc.estado_pago = 'PENDIENTE' AND p.empresa_id = %s
        """, [empresa_id])
        pedidos_pendientes = cursor.fetchone()[0]

        cursor.execute("SELECT COALESCE(SUM(monto_comision), 0) FROM facturacion_comisionventa WHERE empresa_id = %s", [empresa_id])
        total_comisiones = cursor.fetchone()[0]

        cursor.execute(
            "SELECT promedio, total FROM fn_resumen_valoraciones_empresa(%s)", [empresa_id]
        )
        row = cursor.fetchone()
        valoracion_promedio, total_valoraciones = (float(row[0]), row[1]) if row else (0, 0)

        cursor.execute("""
            SELECT prod.id, prod.nombre, SUM(pi.cantidad) AS unidades
            FROM pedidos_pedidoitem pi
            JOIN pedidos_pedido p ON p.id = pi.pedido_id
            JOIN pedidos_ordencompra oc ON oc.id = p.orden_compra_id
            JOIN catalogo_producto prod ON prod.id = pi.producto_id
            WHERE oc.estado_pago = 'PAGADO' AND p.empresa_id = %s
            GROUP BY prod.id, prod.nombre
            ORDER BY unidades DESC
            LIMIT 5
        """, [empresa_id])
        top_productos = [{'producto': row[1], 'unidades': row[2]} for row in cursor.fetchall()]

        cursor.execute(
            "SELECT COUNT(*) FROM catalogo_producto WHERE empresa_id = %s AND activo = true AND estado = 'ACTIVO'",
            [empresa_id],
        )
        productos_activos = cursor.fetchone()[0]

    return {
        'productos_activos': productos_activos,
        'total_ventas': float(total_ventas),
        'total_ventas_count': total_ventas_count,
        'pedidos_pendientes': pedidos_pendientes,
        'total_comisiones': float(total_comisiones),
        'valoracion_promedio': valoracion_promedio,
        'total_valoraciones': total_valoraciones,
        'top_productos': top_productos,
        'ventas_por_dia': _ventas_por_dia(empresa_id, 14),
    }


class DashboardEmpresaView(APIView):
    """CU18: panel de la empresa (dueño o empleado con permiso
    'ver_reportes') — sus propias ventas, pedidos pendientes, reputación
    y lo más vendido."""

    permission_classes = [TienePermisoEmpleado]
    permiso_requerido = 'ver_reportes'

    def get(self, request):
        empresa = request.user.get_empresa()
        return Response(_dashboard_empresa(empresa.id))


class ListaEmpresasDashboardAdminView(APIView):
    """CU18: el SuperAdmin elige una empresa (buscador) antes de entrar a
    ver su dashboard — mismo patrón que CU04/CU16."""

    permission_classes = [EsAdmin]

    def get(self, request):
        empresas = Empresa.objects.all().order_by('razon_social')
        q = request.query_params.get('q', '').strip()
        if q:
            empresas = empresas.filter(razon_social__icontains=q)
        return Response([
            {'id': e.id, 'razon_social': e.razon_social, 'slug': e.slug, 'logo_url': e.logo_url, 'ciudad': e.ciudad}
            for e in empresas
        ])


class DashboardEmpresaAdminView(APIView):
    """CU18: el SuperAdmin ve el dashboard de una empresa puntual (solo
    lectura — las métricas se calculan de los datos reales, no se editan)."""

    permission_classes = [EsAdmin]

    def get(self, request, empresa_id):
        empresa = get_object_or_404(Empresa, id=empresa_id)
        datos = _dashboard_empresa(empresa.id)
        datos['empresa'] = {'id': empresa.id, 'razon_social': empresa.razon_social, 'logo_url': empresa.logo_url}
        return Response(datos)


def _secciones_dashboard_empresa(datos):
    return [
        {
            'titulo': 'Resumen',
            'headers': ['Métrica', 'Valor'],
            'filas': [
                ['Ventas totales (Bs)', f"{datos['total_ventas']:.2f}"],
                ['Pedidos pagados', datos['total_ventas_count']],
                ['Pedidos pendientes de pago', datos['pedidos_pendientes']],
                ['Productos activos', datos['productos_activos']],
                ['Comisión pagada a la plataforma (Bs)', f"{datos['total_comisiones']:.2f}"],
                [
                    'Valoración promedio',
                    f"{datos['valoracion_promedio']} ★ ({datos['total_valoraciones']} reseñas)"
                    if datos['total_valoraciones'] else 'Sin reseñas',
                ],
            ],
        },
        {
            'titulo': 'Ventas de los últimos 14 días',
            'headers': ['Día', 'Ventas (Bs)', 'Pedidos'],
            'filas': [[d['dia'], f"{d['total_ventas']:.2f}", d['total_pedidos']] for d in datos['ventas_por_dia']],
        },
        {
            'titulo': 'Productos más vendidos',
            'headers': ['Producto', 'Unidades vendidas'],
            'filas': [[p['producto'], p['unidades']] for p in datos['top_productos']],
        },
    ]


def _secciones_dashboard_admin(datos):
    return [
        {
            'titulo': 'Resumen de la plataforma',
            'headers': ['Métrica', 'Valor'],
            'filas': [
                ['Ventas totales (Bs)', f"{datos['total_ventas']:.2f}"],
                ['Cantidad de ventas pagadas', datos['total_ventas_count']],
                ['Comisiones cobradas (Bs)', f"{datos['total_comisiones']:.2f}"],
                ['Empresas registradas', datos['total_empresas']],
                ['Valoración promedio de la plataforma', f"{datos['valoracion_promedio']} ★"],
            ],
        },
        {
            'titulo': 'Ventas de los últimos 14 días',
            'headers': ['Día', 'Ventas (Bs)', 'Pedidos'],
            'filas': [[d['dia'], f"{d['total_ventas']:.2f}", d['total_pedidos']] for d in datos['ventas_por_dia']],
        },
        {
            'titulo': 'Top empresas por ventas',
            'headers': ['Empresa', 'Ventas (Bs)'],
            'filas': [[e['empresa'], f"{e['ventas']:.2f}"] for e in datos['top_empresas']],
        },
        {
            'titulo': 'Productos más vendidos',
            'headers': ['Producto', 'Unidades vendidas'],
            'filas': [[p['producto'], p['unidades']] for p in datos['top_productos']],
        },
        {
            'titulo': 'Usuarios activos por rol',
            'headers': ['Rol', 'Cantidad'],
            'filas': [[rol, total] for rol, total in datos['usuarios_por_rol'].items()],
        },
        {
            'titulo': 'Pedidos por estado',
            'headers': ['Estado', 'Cantidad'],
            'filas': [[estado, total] for estado, total in datos['pedidos_por_estado'].items()],
        },
    ]


class DashboardEmpresaExportarView(APIView):
    """CU18: la empresa exporta su propio dashboard a csv/xlsx/pdf/html, o
    lo manda a su correo (?formato=email)."""

    permission_classes = [TienePermisoEmpleado]
    permiso_requerido = 'ver_reportes'

    def get(self, request):
        empresa = request.user.get_empresa()
        datos = _dashboard_empresa(empresa.id)
        return responder_exportacion(
            request, f'reporte_{empresa.slug}',
            f'Reporte de {empresa.razon_social}',
            f'VecinoMarket · Generado el {timezone.now().strftime("%d/%m/%Y %H:%M")}',
            _secciones_dashboard_empresa(datos),
        )


class DashboardEmpresaAdminExportarView(APIView):
    """CU18: el SuperAdmin exporta el dashboard de una empresa puntual."""

    permission_classes = [EsAdmin]

    def get(self, request, empresa_id):
        empresa = get_object_or_404(Empresa, id=empresa_id)
        datos = _dashboard_empresa(empresa.id)
        return responder_exportacion(
            request, f'reporte_{empresa.slug}',
            f'Reporte de {empresa.razon_social}',
            f'VecinoMarket · Generado el {timezone.now().strftime("%d/%m/%Y %H:%M")}',
            _secciones_dashboard_empresa(datos),
        )


class DashboardAdminExportarView(APIView):
    """CU19: el SuperAdmin exporta el dashboard administrativo global."""

    permission_classes = [EsAdmin]

    def get(self, request):
        datos = _dashboard_admin()
        return responder_exportacion(
            request, 'reporte_administrativo',
            'Reporte administrativo de VecinoMarket',
            f'Generado el {timezone.now().strftime("%d/%m/%Y %H:%M")}',
            _secciones_dashboard_admin(datos),
        )


# =====================================================================
# Punto 5 (Sprint_2, "Reportes personalizables"): reportes dinámicos.
# A diferencia del dashboard de arriba (siempre las mismas 3 tablas), aquí
# el usuario elige el dataset, las columnas, el rango de fechas y filtros
# extra en tiempo real (ver apps/reportes/reportes_dinamicos.py).
# =====================================================================

def _filtros_extra_desde_query(request):
    return {k[len('filtro_'):]: v for k, v in request.query_params.items() if k.startswith('filtro_')}


class CatalogoReportesDinamicosView(APIView):
    """CU18: catálogo de datasets/columnas/filtros disponibles para armar un
    reporte -- recortado a lo que el usuario (dueño o empleado) tiene
    permiso real de ver, igual que el menú 'Mi empresa' del frontend."""

    permission_classes = [EsEmpresaOEmpleado]

    def get(self, request):
        user = request.user
        datasets = reportes_dinamicos.catalogo()
        if user.es_empleado():
            empleado = getattr(user, 'empleado', None)
            codigos = set(empleado.permisos.values_list('permiso__codigo', flat=True)) if empleado else set()
            datasets = [d for d in datasets if d['permiso'] in codigos]
        return Response(datasets)


class GenerarReporteDinamicoView(APIView):
    """CU18: genera/exporta el reporte que el usuario armó (dataset +
    columnas + rango de fechas + filtros), acotado a su propia empresa."""

    permission_classes = [EsEmpresaOEmpleado]

    def get(self, request):
        dataset_key = request.query_params.get('dataset')
        cfg = reportes_dinamicos.REGISTRY.get(dataset_key)
        if not cfg:
            return Response({'detail': 'Dataset inválido.'}, status=status.HTTP_400_BAD_REQUEST)

        user = request.user
        if user.es_empleado():
            empleado = getattr(user, 'empleado', None)
            tiene = bool(empleado) and empleado.permisos.filter(permiso__codigo=cfg['permiso']).exists()
            if not tiene:
                return Response({'detail': 'No tienes permiso para este reporte.'}, status=status.HTTP_403_FORBIDDEN)

        empresa = user.get_empresa()
        columnas = [c for c in request.query_params.get('columnas', '').split(',') if c]
        fecha_inicio = parse_date(request.query_params.get('fecha_inicio') or '')
        fecha_fin = parse_date(request.query_params.get('fecha_fin') or '')

        headers, filas = reportes_dinamicos.generar(
            dataset_key, columnas, empresa_id=empresa.id,
            fecha_inicio=fecha_inicio, fecha_fin=fecha_fin,
            filtros_extra=_filtros_extra_desde_query(request),
        )
        return responder_exportacion(
            request, f'reporte_{dataset_key}_{empresa.slug}',
            f'{cfg["etiqueta"]} · {empresa.razon_social}',
            f'VecinoMarket · Generado el {timezone.now().strftime("%d/%m/%Y %H:%M")}',
            [{'titulo': cfg['etiqueta'], 'headers': headers, 'filas': filas}],
        )


class CatalogoReportesDinamicosAdminView(APIView):
    """CU19: mismo catálogo, pero completo (incluye el dataset 'Empresas',
    exclusivo de plataforma) para el SuperAdmin/Admin."""

    permission_classes = [EsAdmin]

    def get(self, request):
        return Response(reportes_dinamicos.catalogo(incluir_admin_extra=True))


class GenerarReporteDinamicoAdminView(APIView):
    """CU19: igual que la vista de empresa, pero sin acotar a un tenant --
    o acotado a una empresa puntual si se manda ?empresa=<id>."""

    permission_classes = [EsAdmin]

    def get(self, request):
        dataset_key = request.query_params.get('dataset')
        registro = dict(reportes_dinamicos.REGISTRY)
        registro.update(reportes_dinamicos.REGISTRY_ADMIN_EXTRA)
        cfg = registro.get(dataset_key)
        if not cfg:
            return Response({'detail': 'Dataset inválido.'}, status=status.HTTP_400_BAD_REQUEST)

        empresa_id = request.query_params.get('empresa') or None
        columnas = [c for c in request.query_params.get('columnas', '').split(',') if c]
        fecha_inicio = parse_date(request.query_params.get('fecha_inicio') or '')
        fecha_fin = parse_date(request.query_params.get('fecha_fin') or '')

        headers, filas = reportes_dinamicos.generar(
            dataset_key, columnas, empresa_id=empresa_id,
            fecha_inicio=fecha_inicio, fecha_fin=fecha_fin,
            filtros_extra=_filtros_extra_desde_query(request),
            incluir_admin_extra=True,
        )
        return responder_exportacion(
            request, f'reporte_{dataset_key}_admin',
            f'{cfg["etiqueta"]} · Plataforma',
            f'VecinoMarket · Generado el {timezone.now().strftime("%d/%m/%Y %H:%M")}',
            [{'titulo': cfg['etiqueta'], 'headers': headers, 'filas': filas}],
        )
