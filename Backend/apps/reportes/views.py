import datetime
from django.db import connection
from django.db.models import Count, F, Q, Sum
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.utils.dateparse import parse_date
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.auditoria.models import LogAuditoria
from apps.catalogo.models import Producto
from apps.core.exportadores import responder_exportacion
from apps.core.utils import get_client_ip
from apps.pedidos.models import Pedido, PedidoItem
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
        user_agent=request.META.get('HTTP_USER_AGENT', ''),
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
            if 'ver_reportes' not in codigos:
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
            tiene = bool(empleado) and (
                empleado.permisos.filter(permiso__codigo='ver_reportes').exists()
                or empleado.permisos.filter(permiso__codigo=cfg['permiso']).exists()
            )
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
        if request.query_params.get('formato') == 'json' or request.query_params.get('vista') == 'tabla':
            return Response({'headers': headers, 'filas': filas, 'total': len(filas), 'titulo': cfg['etiqueta']})

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
        if request.query_params.get('formato') == 'json' or request.query_params.get('vista') == 'tabla':
            return Response({'headers': headers, 'filas': filas, 'total': len(filas), 'titulo': cfg['etiqueta']})

        return responder_exportacion(
            request, f'reporte_{dataset_key}_admin',
            f'{cfg["etiqueta"]} · Plataforma',
            f'VecinoMarket · Generado el {timezone.now().strftime("%d/%m/%Y %H:%M")}',
            [{'titulo': cfg['etiqueta'], 'headers': headers, 'filas': filas}],
        )


class AsistenteVozReportesView(APIView):
    """CU18/CU19: Procesa una consulta analítica por comando de voz o texto libre,
    analiza métricas de ventas, productos más vendidos, stock e ingresos, y
    devuelve una descripción natural hablada junto con la configuración de la tabla."""

    def get_permissions(self):
        user = self.request.user
        if user.is_authenticated and (user.es_admin() or user.is_staff):
            return [EsAdmin()]
        return [EsEmpresaOEmpleado()]

    def post(self, request):
        pregunta = (request.data.get('pregunta') or '').strip().lower()
        if not pregunta:
            return Response({'detail': 'La pregunta es requerida.'}, status=status.HTTP_400_BAD_REQUEST)

        user = request.user
        if user.es_empleado():
            empleado = getattr(user, 'empleado', None)
            codigos = set(empleado.permisos.values_list('permiso__codigo', flat=True)) if empleado else set()
            tiene_acceso = 'ver_reportes' in codigos or any(cfg['permiso'] in codigos for cfg in reportes_dinamicos.REGISTRY.values())
            if not tiene_acceso:
                return Response({'detail': 'No tienes permisos para consultar reportes.'}, status=status.HTTP_403_FORBIDDEN)
        empresa = None
        if user.es_admin() or user.is_staff:
            empresa_id = request.data.get('empresa')
            if empresa_id:
                empresa = get_object_or_404(Empresa, id=empresa_id)
        else:
            empresa = user.get_empresa()

        hoy = timezone.now().date()
        fecha_inicio = None
        fecha_fin = None
        periodo_str = ''

        if 'hoy' in pregunta:
            fecha_inicio = hoy.isoformat()
            fecha_fin = hoy.isoformat()
            periodo_str = 'del día de hoy'
        elif 'semana' in pregunta:
            hace_7 = hoy - datetime.timedelta(days=7)
            fecha_inicio = hace_7.isoformat()
            fecha_fin = hoy.isoformat()
            periodo_str = 'de los últimos 7 días'
        elif 'mes' in pregunta:
            hace_30 = hoy - datetime.timedelta(days=30)
            fecha_inicio = hace_30.isoformat()
            fecha_fin = hoy.isoformat()
            periodo_str = 'del último mes'
        elif 'año' in pregunta or 'ano' in pregunta:
            fecha_inicio = f'{hoy.year}-01-01'
            fecha_fin = hoy.isoformat()
            periodo_str = 'de este año'

        p_str = f" {periodo_str}" if periodo_str else ""
        p_norm = pregunta.replace('á', 'a').replace('é', 'e').replace('í', 'i').replace('ó', 'o').replace('ú', 'u')

        # 1. ¿Cuál es la empresa que más vende / Top empresas?
        is_top_empresa = any(k in p_norm for k in [
            'top empresa', 'top empresas', 'empresa que mas vende', 'empresa con mas ventas',
            'mejor empresa', 'que tienda vende mas', 'tienda que mas vende', 'cual empresa vende mas',
            'empresas con mas ventas', 'empresa lider', 'empresas lideres', 'cual es la empresa'
        ]) or (
            ('empresa' in p_norm or 'tienda' in p_norm) and any(w in p_norm for w in ['mas vend', 'mayor vent', 'top vent', 'mas venta', 'mas ingreso', 'mas gananci', 'vende mas', 'vendio mas'])
        )
        if is_top_empresa:
            top_emp = (
                Pedido.objects.filter(orden_compra__estado_pago='PAGADO')
                .values('empresa__razon_social')
                .annotate(total_ventas=Sum('subtotal'), total_pedidos=Count('id'))
                .order_by('-total_ventas')
            )
            top = list(top_emp[:3])
            if top:
                t1 = top[0]
                extra = f" En segundo lugar se encuentra **{top[1]['empresa__razon_social']}** con Bs {top[1]['total_ventas']:.2f}." if len(top) > 1 else ""
                resp = f"La empresa con mayores ventas en la plataforma{p_str} es **{t1['empresa__razon_social']}**, con un total de Bs {t1['total_ventas']:.2f} recaudados en {t1['total_pedidos']} pedidos.{extra}"
            else:
                resp = f"Aún no se registran ventas de empresas en la plataforma{p_str}."
            return Response({
                'respuesta': resp,
                'dataset': 'empresas' if (user.es_admin() or user.is_staff) else 'pedidos',
                'columnas': ['razon_social', 'ciudad', 'plan', 'estado'] if (user.es_admin() or user.is_staff) else ['numero_pedido', 'fecha', 'cliente', 'estado', 'subtotal'],
                'fecha_inicio': fecha_inicio,
                'fecha_fin': fecha_fin,
            })

        # 2. ¿Cuál es el producto más vendido?
        is_top_vendido = (
            any(k in p_norm for k in [
                'mas vendido', 'mas vendida', 'mas vendidos', 'mas vendidas', 'mas vendidio',
                'mas vendio', 'mas vende', 'se vende mas', 'se vendio mas', 'vende mas', 'vendio mas',
                'mas venta', 'mas ventas', 'mayor venta', 'mayores ventas', 'top venta', 'top ventas',
                'top producto', 'top productos', 'producto estrella', 'artículo estrella', 'articulo estrella',
                'mas pedido', 'mas pedidos', 'mas popular', 'mas populares', 'mejor vendido', 'mejores productos',
                'que producto se vende', 'cual producto se vende', 'cual se vende mas', 'lo que mas se vende'
            ]) or (
                'vend' in p_norm and any(w in p_norm for w in ['mas', 'mayor', 'top', 'mejor', 'estrella', 'popular'])
                and not any(w in p_norm for w in ['cuanto', 'total vendido', 'ventas totales', 'empresa', 'tienda'])
            )
        ) and not any(w in p_norm for w in ['empresa', 'tienda'])

        if is_top_vendido:
            items_qs = PedidoItem.objects.all()
            if empresa:
                items_qs = items_qs.filter(pedido__empresa=empresa)
            if fecha_inicio:
                items_qs = items_qs.filter(pedido__creado_en__date__gte=fecha_inicio)
            if fecha_fin:
                items_qs = items_qs.filter(pedido__creado_en__date__lte=fecha_fin)

            agrupados = (
                items_qs.values('producto__nombre', 'producto__precio')
                .annotate(
                    total_unidades=Sum('cantidad'),
                    total_dinero=Sum(F('cantidad') * F('precio_unitario'))
                )
                .order_by('-total_unidades')
            )
            top = list(agrupados[:3])
            if top:
                top1 = top[0]
                monto_txt = f" y un total de Bs {top1['total_dinero']:.2f}" if top1.get('total_dinero') else ""
                extra = ""
                if len(top) > 1:
                    extra = f" En segundo lugar se encuentra **{top[1]['producto__nombre']}** con {top[1]['total_unidades']} unidades."
                prefijo = f"en tu tienda de **{empresa.razon_social}**" if empresa else "en toda la plataforma"
                resp = (
                    f"El producto más vendido {prefijo}{p_str} es **{top1['producto__nombre']}**, "
                    f"con {top1['total_unidades']} unidades vendidas{monto_txt}.{extra}"
                )
            else:
                prefijo = f"en **{empresa.razon_social}**" if empresa else "en el sistema"
                resp = f"Aún no se registran ventas de productos {prefijo}{p_str}."

            return Response({
                'respuesta': resp,
                'dataset': 'pedidos',
                'columnas': ['numero_pedido', 'fecha', 'cliente', 'estado', 'subtotal'],
                'fecha_inicio': fecha_inicio,
                'fecha_fin': fecha_fin,
            })

        # 1.6. Comisiones cobradas
        if any(k in p_norm for k in ['comision', 'comisiones', 'comision cobrada', 'cuanto cobro la plataforma', 'ganancia de la plataforma', 'comisiones cobradas']):
            from apps.facturacion.models import ComisionVenta
            com_qs = ComisionVenta.objects.all()
            if empresa:
                com_qs = com_qs.filter(empresa=empresa)
            if fecha_inicio:
                com_qs = com_qs.filter(creado_en__date__gte=fecha_inicio)
            if fecha_fin:
                com_qs = com_qs.filter(creado_en__date__lte=fecha_fin)
            tot_com = com_qs.aggregate(t=Sum('monto_comision'))['t'] or 0
            pref = f"de tu tienda en **{empresa.razon_social}**" if empresa else "en toda la plataforma"
            resp = f"Se ha registrado un total de Bs {tot_com:.2f} en comisiones por ventas {pref}{p_str}."
            return Response({
                'respuesta': resp,
                'dataset': 'pedidos',
                'columnas': ['numero_pedido', 'fecha', 'cliente', 'estado', 'subtotal'],
                'fecha_inicio': fecha_inicio,
                'fecha_fin': fecha_fin,
            })

        # 1.7. Cantidad de empresas o usuarios registrados
        if any(k in p_norm for k in ['cuantas empresas', 'total empresas', 'cuantos usuarios', 'usuarios activos', 'total usuarios']):
            from apps.usuarios.models import Usuario
            tot_emp = Empresa.objects.count()
            tot_usr = Usuario.objects.filter(estado='ACTIVO').count()
            resp = f"La plataforma cuenta actualmente con {tot_emp} empresas registradas y {tot_usr} usuarios activos en el sistema."
            return Response({
                'respuesta': resp,
                'dataset': 'empresas' if (user.es_admin() or user.is_staff) else 'pedidos',
                'columnas': ['razon_social', 'nit', 'ciudad', 'plan', 'estado'] if (user.es_admin() or user.is_staff) else ['numero_pedido', 'fecha', 'cliente', 'estado', 'subtotal'],
                'fecha_inicio': fecha_inicio,
                'fecha_fin': fecha_fin,
            })

        # 2. Producto más caro / mayor precio
        if any(k in p_norm for k in ['mas caro', 'mayor precio', 'mas costoso', 'precio mas alto', 'mas valor', 'el mas caro']):
            prods = Producto.objects.filter(estado=Producto.Estado.ACTIVO)
            if empresa:
                prods = prods.filter(empresa=empresa)
            pr = prods.order_by('-precio').first()
            if pr:
                prefijo = f"en tu catálogo de **{empresa.razon_social}**" if empresa else "en la plataforma"
                resp = f"El producto con mayor precio {prefijo} es **{pr.nombre}** con un valor de Bs {pr.precio:.2f}."
            else:
                resp = "No hay productos registrados actualmente."
            return Response({
                'respuesta': resp,
                'dataset': 'productos',
                'columnas': ['nombre', 'categoria', 'precio', 'precio_descuento', 'estado'],
                'fecha_inicio': fecha_inicio,
                'fecha_fin': fecha_fin,
            })

        # 3. Producto más económico / menor precio
        if any(k in p_norm for k in ['mas barato', 'menor precio', 'mas economico', 'precio mas bajo', 'el mas barato']):
            prods = Producto.objects.filter(estado=Producto.Estado.ACTIVO)
            if empresa:
                prods = prods.filter(empresa=empresa)
            pr = prods.order_by('precio').first()
            if pr:
                prefijo = f"en tu tienda de **{empresa.razon_social}**" if empresa else "en la plataforma"
                resp = f"El producto con menor precio {prefijo} es **{pr.nombre}** a Bs {pr.precio:.2f}."
            else:
                resp = "No hay productos registrados actualmente."
            return Response({
                'respuesta': resp,
                'dataset': 'productos',
                'columnas': ['nombre', 'categoria', 'precio', 'precio_descuento', 'estado'],
                'fecha_inicio': fecha_inicio,
                'fecha_fin': fecha_fin,
            })

        # 4. Stock / Inventario / Menor stock disponible
        if any(k in p_norm for k in ['menos stock', 'menor stock', 'agotando', 'por agotar', 'bajo stock', 'se esta agotando', 'quedan pocos', 'poco stock']):
            from apps.inventario.models import InventarioSucursal
            invs = InventarioSucursal.objects.filter(producto__estado=Producto.Estado.ACTIVO).select_related('producto')
            if empresa:
                invs = invs.filter(producto__empresa=empresa)
            inv = invs.order_by('cantidad_disponible').first()
            if inv:
                prefijo = f"en **{empresa.razon_social}**" if empresa else "en inventario"
                resp = (
                    f"El producto con menor stock disponible {prefijo} es **{inv.producto.nombre}**, "
                    f"con solo {inv.cantidad_disponible} unidades disponibles."
                )
            else:
                resp = "No se encontraron registros de inventario con stock bajo."
            return Response({
                'respuesta': resp,
                'dataset': 'productos',
                'columnas': ['nombre', 'categoria', 'precio', 'estado'],
                'fecha_inicio': fecha_inicio,
                'fecha_fin': fecha_fin,
            })

        # 5. Ventas / Ingresos totales / Cuánto vendí
        if any(k in p_norm for k in ['cuanto vendi', 'ventas', 'ingresos', 'ganancias', 'total vendido', 'pedidos', 'cuanto hemos vendido', 'cuanto dinero', 'total de ventas', 'cuanto se vendio']):
            pedidos_qs = Pedido.objects.all()
            if empresa:
                pedidos_qs = pedidos_qs.filter(empresa=empresa)
            if fecha_inicio:
                pedidos_qs = pedidos_qs.filter(creado_en__date__gte=fecha_inicio)
            if fecha_fin:
                pedidos_qs = pedidos_qs.filter(creado_en__date__lte=fecha_fin)

            total_count = pedidos_qs.count()
            pagados = pedidos_qs.filter(orden_compra__estado_pago='PAGADO')
            total_monto = pagados.aggregate(total=Sum('subtotal'))['total'] or 0

            if total_count > 0:
                if empresa:
                    resp = (
                        f"Registraste un total de {total_count} pedidos en tu tienda de **{empresa.razon_social}**{p_str}, "
                        f"con un total de ventas pagadas de Bs {total_monto:.2f}."
                    )
                else:
                    resp = (
                        f"En toda la plataforma se registra un total de {total_count} pedidos pagados{p_str}, "
                        f"con un volumen de ventas de Bs {total_monto:.2f}."
                    )
            else:
                prefijo = f"en **{empresa.razon_social}**" if empresa else "en la plataforma"
                resp = f"No registras pedidos ni ventas {prefijo}{p_str}."

            return Response({
                'respuesta': resp,
                'dataset': 'pedidos',
                'columnas': ['numero_pedido', 'fecha', 'cliente', 'estado', 'subtotal'],
                'fecha_inicio': fecha_inicio,
                'fecha_fin': fecha_fin,
            })

        # 6. Clientes
        if any(k in p_norm for k in ['cliente', 'comprador', 'quien compra', 'quien me compra', 'mejor cliente', 'mejor comprador']):
            pedidos_qs = Pedido.objects.filter(orden_compra__comprador__usuario__isnull=False)
            if empresa:
                pedidos_qs = pedidos_qs.filter(empresa=empresa)
            cli = (
                pedidos_qs.values('orden_compra__comprador__usuario__nombre', 'orden_compra__comprador__usuario__apellido')
                .annotate(pedidos_count=Count('id'), total_gasto=Sum('subtotal'))
                .order_by('-total_gasto')
                .first()
            )
            if cli:
                nom = f"{cli['orden_compra__comprador__usuario__nombre']} {cli.get('orden_compra__comprador__usuario__apellido') or ''}".strip()
                if empresa:
                    resp = f"Tu cliente más destacado es **{nom}**, con {cli['pedidos_count']} pedidos y un total de compras de Bs {cli['total_gasto']:.2f}."
                else:
                    resp = f"El comprador más destacado en toda la plataforma es **{nom}**, con {cli['pedidos_count']} pedidos realizados y un total acumulado de Bs {cli['total_gasto']:.2f}."
            else:
                resp = f"No se registran compras de clientes aún{p_str}."
            return Response({
                'respuesta': resp,
                'dataset': 'pedidos',
                'columnas': ['numero_pedido', 'fecha', 'cliente', 'estado', 'subtotal'],
                'fecha_inicio': fecha_inicio,
                'fecha_fin': fecha_fin,
            })

        # Fallback genérico inteligente
        etiqueta = 'Pedidos y ventas'
        dataset_key = 'pedidos'
        columnas = ['numero_pedido', 'fecha', 'cliente', 'estado', 'subtotal']
        if any(k in p_norm for k in ['producto', 'catalogo', 'articulos', 'articulo']):
            etiqueta = 'Productos'
            dataset_key = 'productos'
            columnas = ['nombre', 'categoria', 'precio', 'estado']
        elif any(k in p_norm for k in ['inventario', 'stock']):
            etiqueta = 'Productos'
            dataset_key = 'productos'
            columnas = ['nombre', 'categoria', 'precio', 'estado']
        elif any(k in p_norm for k in ['factura', 'facturacion', 'facturas']):
            etiqueta = 'Facturas'
            dataset_key = 'facturas'
            columnas = ['tipo', 'monto', 'estado_pago', 'fecha']

        resp = f"Generando reporte de {etiqueta}{p_str}. Mostrando los datos en pantalla."
        return Response({
            'respuesta': resp,
            'dataset': dataset_key,
            'columnas': columnas,
            'fecha_inicio': fecha_inicio,
            'fecha_fin': fecha_fin,
        })
