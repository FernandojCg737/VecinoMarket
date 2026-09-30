from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.db import DatabaseError, connection
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.exceptions import PermissionDenied
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.auditoria.models import LogAuditoria
from apps.core.utils import get_client_ip
from apps.usuarios.models import Empresa
from apps.usuarios.permissions import EsAdmin, TienePermisoEmpleado

from .models import ComentarioLive, LiveCommerceSesion, Promocion
from .serializers import (
    ComentarioLiveSerializer,
    LiveAdminSerializer,
    LiveEmpresaSerializer,
    LivePublicoSerializer,
    PromocionAdminSerializer,
    PromocionEmpresaSerializer,
)


def _log(request, accion, entidad_id, detalle=None, entidad_afectada='promocion'):
    LogAuditoria.objects.create(
        usuario=request.user,
        accion=accion,
        entidad_afectada=entidad_afectada,
        entidad_id=entidad_id,
        detalle=detalle or {},
        ip_origen=get_client_ip(request),
    )


class ListaResumenEmpresasPromocionesAdminView(APIView):
    """CU16: el SuperAdmin ve, por empresa, cuántas promociones activas y
    vigentes tiene, antes de entrar a ver el detalle."""

    permission_classes = [EsAdmin]

    def get(self, request):
        empresas = Empresa.objects.all().order_by('razon_social')
        q = request.query_params.get('q', '').strip()
        if q:
            empresas = empresas.filter(razon_social__icontains=q)

        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT empresa_id, COUNT(*)
                FROM promociones_promocion
                WHERE activo = true AND estado = 'ACTIVA' AND now() BETWEEN fecha_inicio AND fecha_fin
                GROUP BY empresa_id
            """)
            resumen = {row[0]: row[1] for row in cursor.fetchall()}

        resultados = [
            {
                'id': e.id, 'razon_social': e.razon_social, 'slug': e.slug,
                'logo_url': e.logo_url, 'ciudad': e.ciudad,
                'promociones_activas': resumen.get(e.id, 0),
            }
            for e in empresas
        ]
        return Response(resultados)


class ListaPromocionesAdminView(generics.ListAPIView):
    """CU16: el SuperAdmin/Admin ve las promociones de una empresa
    (?empresa=<id>) o de todas."""

    permission_classes = [EsAdmin]
    serializer_class = PromocionAdminSerializer
    pagination_class = None

    def get_queryset(self):
        qs = Promocion.objects.filter(activo=True).select_related('empresa').prefetch_related('productos').order_by('-fecha_inicio')
        empresa_id = self.request.query_params.get('empresa')
        if empresa_id:
            qs = qs.filter(empresa_id=empresa_id)
        estado = self.request.query_params.get('estado')
        if estado:
            qs = qs.filter(estado=estado)
        return qs


class EditarEliminarPromocionAdminView(APIView):
    """CU16: edita o elimina la promoción de cualquier empresa."""

    permission_classes = [EsAdmin]

    def patch(self, request, promocion_id):
        promocion = get_object_or_404(Promocion, id=promocion_id)
        serializer = PromocionAdminSerializer(promocion, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        _log(request, 'EDITAR_PROMOCION', promocion.id, {'nombre': promocion.nombre})
        return Response(PromocionAdminSerializer(promocion).data)

    def delete(self, request, promocion_id):
        promocion = get_object_or_404(Promocion, id=promocion_id)
        nombre = promocion.nombre
        promocion.delete()
        _log(request, 'ELIMINAR_PROMOCION', promocion_id, {'nombre': nombre})
        return Response(status=status.HTTP_204_NO_CONTENT)


class ListaCrearMisPromocionesView(generics.ListCreateAPIView):
    """CU16: la empresa (dueño o empleado con permiso 'gestionar_promociones')
    ve y crea SUS PROPIAS promociones."""

    permission_classes = [TienePermisoEmpleado]
    permiso_requerido = 'gestionar_promociones'
    serializer_class = PromocionEmpresaSerializer
    pagination_class = None

    def get_queryset(self):
        return Promocion.objects.filter(
            activo=True, empresa=self.request.user.get_empresa()
        ).prefetch_related('productos').order_by('-fecha_inicio')

    def get_serializer_context(self):
        return {**super().get_serializer_context(), 'empresa': self.request.user.get_empresa()}

    def perform_create(self, serializer):
        promocion = serializer.save(empresa=self.request.user.get_empresa())
        _log(self.request, 'CREAR_PROMOCION', promocion.id, {'nombre': promocion.nombre})


class EditarEliminarMiPromocionView(APIView):
    """CU16: la empresa edita o elimina una de SUS promociones."""

    permission_classes = [TienePermisoEmpleado]
    permiso_requerido = 'gestionar_promociones'

    def patch(self, request, promocion_id):
        promocion = get_object_or_404(Promocion, id=promocion_id, empresa=request.user.get_empresa())
        serializer = PromocionEmpresaSerializer(
            promocion, data=request.data, partial=True, context={'empresa': request.user.get_empresa()}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        _log(request, 'EDITAR_PROMOCION', promocion.id, {'nombre': promocion.nombre})
        return Response(PromocionEmpresaSerializer(promocion).data)

    def delete(self, request, promocion_id):
        promocion = get_object_or_404(Promocion, id=promocion_id, empresa=request.user.get_empresa())
        nombre = promocion.nombre
        promocion.delete()
        _log(request, 'ELIMINAR_PROMOCION', promocion_id, {'nombre': nombre})
        return Response(status=status.HTTP_204_NO_CONTENT)


class ListaLivesPublicoView(generics.ListAPIView):
    """CU17: lo que ve cualquier visitante desde el botón "LIVE" — las
    sesiones EN_VIVO ahora mismo, con qué empresa y qué productos."""

    permission_classes = [AllowAny]
    serializer_class = LivePublicoSerializer
    pagination_class = None

    def get_queryset(self):
        return LiveCommerceSesion.objects.filter(
            activo=True, estado=LiveCommerceSesion.Estado.EN_VIVO
        ).select_related('empresa').prefetch_related('productos')


class DetalleLiveView(generics.RetrieveAPIView):
    """CU17: detalle de UNA sesión puntual para la pantalla del espectador
    (`/live/<id>`) — a diferencia de ListaLivesPublicoView, no filtra por
    estado: así el visitante puede ver si todavía no empezó (PROGRAMADA) o
    si ya terminó (FINALIZADA), no solo cuando está EN_VIVO."""

    permission_classes = [AllowAny]
    serializer_class = LivePublicoSerializer
    queryset = LiveCommerceSesion.objects.filter(activo=True).select_related('empresa').prefetch_related('productos')


def _es_dueno_o_empleado_autorizado(usuario, empresa_id):
    """Mismo criterio que LiveSignalingConsumer._puede_transmitir, pero
    síncrono — para gatear la vista de la grabación/comentarios archivados
    a la propia empresa una vez que el live terminó."""
    if not (usuario and usuario.is_authenticated):
        return False
    if usuario.es_empresa():
        empresa = getattr(usuario, 'empresa', None)
        return bool(empresa) and empresa.id == empresa_id
    if usuario.es_empleado():
        empleado = getattr(usuario, 'empleado', None)
        return (
            bool(empleado)
            and empleado.empresa_id == empresa_id
            and empleado.permisos.filter(permiso__codigo='gestionar_promociones').exists()
        )
    return False


class ListaCrearComentariosLiveView(generics.ListCreateAPIView):
    """Chat en vivo de una sesión (comprador, empresa o empleado, cualquiera
    autenticado). Mientras la sesión está PROGRAMADA/EN_VIVO, el historial
    es público (como el resto de la pantalla del espectador). Una vez
    FINALIZADA, el chat queda archivado junto con la grabación — solo la
    propia empresa puede volver a leerlo. POST guarda el comentario Y lo
    reenvía en tiempo real por el mismo WebSocket de señalización
    (LiveSignalingConsumer, grupo `live_<id>`) a todos los que estén
    viendo/transmitiendo en ese momento."""

    serializer_class = ComentarioLiveSerializer
    pagination_class = None

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsAuthenticated()]
        return [AllowAny()]

    def get_queryset(self):
        sesion = get_object_or_404(LiveCommerceSesion, id=self.kwargs['live_id'], activo=True)
        if sesion.estado == LiveCommerceSesion.Estado.FINALIZADA:
            if not _es_dueno_o_empleado_autorizado(self.request.user, sesion.empresa_id):
                raise PermissionDenied('Esta transmisión ya terminó — solo la empresa puede ver el chat archivado.')
        return ComentarioLive.objects.filter(
            sesion_id=self.kwargs['live_id'], activo=True
        ).select_related('usuario').order_by('creado_en')[:200]

    def perform_create(self, serializer):
        sesion = get_object_or_404(LiveCommerceSesion, id=self.kwargs['live_id'], activo=True)
        comentario = serializer.save(sesion=sesion, usuario=self.request.user)

        payload = ComentarioLiveSerializer(comentario).data
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(f'live_{sesion.id}', {
            'type': 'live_relay',
            'payload': {'type': 'chat-message', **payload},
        })


class ListaCrearMisLivesView(generics.ListCreateAPIView):
    """CU17: la empresa (dueño o empleado con permiso 'gestionar_promociones')
    programa y emite sus propias sesiones de live commerce."""

    permission_classes = [TienePermisoEmpleado]
    permiso_requerido = 'gestionar_promociones'
    serializer_class = LiveEmpresaSerializer
    pagination_class = None

    def get_queryset(self):
        return LiveCommerceSesion.objects.filter(
            activo=True, empresa=self.request.user.get_empresa()
        ).prefetch_related('productos').order_by('-fecha_inicio')

    def get_serializer_context(self):
        return {**super().get_serializer_context(), 'empresa': self.request.user.get_empresa()}

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            sesion = serializer.save(empresa=request.user.get_empresa())
        except DatabaseError as exc:
            return Response({'detail': str(exc).split('\n')[0]}, status=status.HTTP_400_BAD_REQUEST)
        _log(request, 'CREAR_LIVE', sesion.id, {'titulo': sesion.titulo}, entidad_afectada='live')
        return Response(LiveEmpresaSerializer(sesion).data, status=status.HTTP_201_CREATED)


class EditarEliminarMiLiveView(APIView):
    """CU17: la empresa edita (incluido pasar a EN_VIVO o FINALIZADA) o
    elimina una de SUS sesiones. Pasar a EN_VIVO falla si la empresa tiene
    una sanción activa (trg_verificar_bloqueo_live)."""

    permission_classes = [TienePermisoEmpleado]
    permiso_requerido = 'gestionar_promociones'

    def patch(self, request, live_id):
        sesion = get_object_or_404(LiveCommerceSesion, id=live_id, empresa=request.user.get_empresa())
        estaba_en_vivo = sesion.estado == LiveCommerceSesion.Estado.EN_VIVO
        serializer = LiveEmpresaSerializer(
            sesion, data=request.data, partial=True, context={'empresa': request.user.get_empresa()}
        )
        serializer.is_valid(raise_exception=True)
        try:
            serializer.save()
        except DatabaseError as exc:
            return Response({'detail': str(exc).split('\n')[0]}, status=status.HTTP_400_BAD_REQUEST)
        _log(request, 'EDITAR_LIVE', sesion.id, {'estado': sesion.estado}, entidad_afectada='live')

        # Si esto la finalizó y estaba EN_VIVO, avisar por WebSocket — la
        # pestaña del anfitrión puede seguir abierta (transmitiendo de
        # fondo, o pausada pero conectada) sin enterarse de que alguien la
        # finalizó desde otro lado (ej. el botón de la lista "Mis lives");
        # este mensaje es lo que le dice "guarda la grabación ya".
        if estaba_en_vivo and sesion.estado == LiveCommerceSesion.Estado.FINALIZADA:
            channel_layer = get_channel_layer()
            async_to_sync(channel_layer.group_send)(f'live_{sesion.id}', {
                'type': 'live_relay',
                'payload': {'type': 'live-ended'},
            })

        return Response(LiveEmpresaSerializer(sesion).data)

    def delete(self, request, live_id):
        sesion = get_object_or_404(LiveCommerceSesion, id=live_id, empresa=request.user.get_empresa())
        titulo = sesion.titulo
        sesion.delete()
        _log(request, 'ELIMINAR_LIVE', live_id, {'titulo': titulo}, entidad_afectada='live')
        return Response(status=status.HTTP_204_NO_CONTENT)


class SubirGrabacionMiLiveView(APIView):
    """La empresa sube la grabación (MediaRecorder del navegador del
    anfitrión) al terminar su propia transmisión — multipart, campo
    "archivo". Solo existe si terminó con el botón "Terminar transmisión"
    (todo es peer-to-peer, nadie más tuvo el video para grabarlo)."""

    permission_classes = [TienePermisoEmpleado]
    permiso_requerido = 'gestionar_promociones'
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request, live_id):
        sesion = get_object_or_404(LiveCommerceSesion, id=live_id, empresa=request.user.get_empresa())
        archivo = request.FILES.get('archivo')
        if not archivo:
            return Response({'detail': 'Sube el archivo de la grabación.'}, status=status.HTTP_400_BAD_REQUEST)
        sesion.grabacion = archivo
        sesion.save(update_fields=['grabacion'])
        _log(request, 'SUBIR_GRABACION_LIVE', sesion.id, {'titulo': sesion.titulo}, entidad_afectada='live')
        return Response({'grabacion_url': sesion.grabacion_url}, status=status.HTTP_201_CREATED)


class GrabacionMiLiveView(APIView):
    """CU17: la empresa vuelve a ver una de sus transmisiones ya terminadas
    — video grabado + el chat completo tal cual quedó, ambos privados
    (nadie más puede acceder a esto, ni siquiera otro comprador que haya
    estado en el live)."""

    permission_classes = [TienePermisoEmpleado]
    permiso_requerido = 'gestionar_promociones'

    def get(self, request, live_id):
        sesion = get_object_or_404(LiveCommerceSesion, id=live_id, empresa=request.user.get_empresa())
        comentarios = ComentarioLive.objects.filter(sesion=sesion, activo=True).select_related('usuario').order_by('creado_en')
        return Response({
            **LiveEmpresaSerializer(sesion).data,
            'comentarios': ComentarioLiveSerializer(comentarios, many=True).data,
        })


class ListaLivesAdminView(generics.ListAPIView):
    """CU17: el SuperAdmin/Admin ve todas las sesiones (?empresa=<id>,
    ?estado=EN_VIVO) — para el panel de soporte."""

    permission_classes = [EsAdmin]
    serializer_class = LiveAdminSerializer
    pagination_class = None

    def get_queryset(self):
        qs = LiveCommerceSesion.objects.filter(activo=True).select_related('empresa').prefetch_related('productos').order_by('-fecha_inicio')
        empresa_id = self.request.query_params.get('empresa')
        if empresa_id:
            qs = qs.filter(empresa_id=empresa_id)
        estado = self.request.query_params.get('estado')
        if estado:
            qs = qs.filter(estado=estado)
        return qs


class DarDeBajaLiveAdminView(APIView):
    """CU17: el SuperAdmin corta cualquier live (lo pasa a FINALIZADA),
    por ejemplo por incumplimiento de las normas de servicio."""

    permission_classes = [EsAdmin]

    def post(self, request, live_id):
        sesion = get_object_or_404(LiveCommerceSesion, id=live_id)
        sesion.estado = LiveCommerceSesion.Estado.FINALIZADA
        sesion.fecha_fin = timezone.now()
        sesion.save(update_fields=['estado', 'fecha_fin'])
        _log(request, 'DAR_DE_BAJA_LIVE', sesion.id, {'titulo': sesion.titulo, 'empresa_id': sesion.empresa_id}, entidad_afectada='live')
        return Response(LiveAdminSerializer(sesion).data)


class BloquearEmpresaLiveAdminView(APIView):
    """CU17: sanciona a una empresa por incumplimiento — le impide emitir
    en vivo por N días (trg_verificar_bloqueo_live hace cumplir esto a
    nivel de base de datos, no solo en la vista)."""

    permission_classes = [EsAdmin]

    def post(self, request, empresa_id):
        try:
            dias = int(request.data.get('dias'))
        except (TypeError, ValueError):
            return Response({'detail': 'dias debe ser un número entero positivo.'}, status=status.HTTP_400_BAD_REQUEST)
        if dias <= 0:
            return Response({'detail': 'dias debe ser un número entero positivo.'}, status=status.HTTP_400_BAD_REQUEST)

        empresa = get_object_or_404(Empresa, id=empresa_id)
        empresa.bloqueo_live_hasta = timezone.now() + timezone.timedelta(days=dias)
        empresa.save(update_fields=['bloqueo_live_hasta'])

        LiveCommerceSesion.objects.filter(empresa=empresa, estado=LiveCommerceSesion.Estado.EN_VIVO).update(
            estado=LiveCommerceSesion.Estado.FINALIZADA, fecha_fin=timezone.now()
        )

        _log(request, 'BLOQUEAR_LIVE_EMPRESA', empresa.id, {'dias': dias, 'hasta': str(empresa.bloqueo_live_hasta)}, entidad_afectada='empresa')
        return Response({'empresa': empresa.id, 'bloqueo_live_hasta': empresa.bloqueo_live_hasta})
