from django.db import connection
from django.shortcuts import get_object_or_404
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.auditoria.models import LogAuditoria
from apps.core.utils import get_client_ip
from apps.usuarios.models import Usuario
from apps.usuarios.permissions import EsSuperAdmin

from .models import Notificacion
from .serializers import EnviarNotificacionSerializer, NotificacionAdminSerializer, NotificacionSerializer


def _log(request, accion, entidad_id, detalle=None):
    LogAuditoria.objects.create(
        usuario=request.user,
        accion=accion,
        entidad_afectada='notificacion',
        entidad_id=entidad_id,
        detalle=detalle or {},
        ip_origen=get_client_ip(request),
    )


class ListaMisNotificacionesView(generics.ListAPIView):
    """Cualquier usuario autenticado ve las suyas — ?leido=false para solo
    las pendientes (el timbre de notificaciones del header las consulta así)."""

    serializer_class = NotificacionSerializer
    pagination_class = None

    def get_queryset(self):
        qs = Notificacion.objects.filter(usuario=self.request.user, activo=True).order_by('-creado_en')
        leido = self.request.query_params.get('leido')
        if leido is not None:
            qs = qs.filter(leido=leido.lower() == 'true')
        return qs[:50]


class MarcarLeidaView(APIView):
    def post(self, request, notificacion_id):
        notif = get_object_or_404(Notificacion, id=notificacion_id, usuario=request.user)
        notif.leido = True
        notif.save(update_fields=['leido'])
        return Response(NotificacionSerializer(notif).data)


class MarcarTodasLeidasView(APIView):
    def post(self, request):
        actualizadas = Notificacion.objects.filter(usuario=request.user, leido=False).update(leido=True)
        return Response({'actualizadas': actualizadas})


class EliminarMiNotificacionView(APIView):
    def delete(self, request, notificacion_id):
        notif = get_object_or_404(Notificacion, id=notificacion_id, usuario=request.user)
        notif.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class EnviarNotificacionAdminView(APIView):
    """CU23: el SuperAdmin envía una notificación a una persona puntual o
    de forma masiva a todo un rol (fn_enviar_notificacion_masiva — un solo
    INSERT ... SELECT en vez de un create() por usuario desde Python)."""

    permission_classes = [EsSuperAdmin]

    def post(self, request):
        serializer = EnviarNotificacionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        if data.get('usuario_id'):
            usuario = get_object_or_404(Usuario, id=data['usuario_id'])
            Notificacion.objects.create(
                usuario=usuario, tipo=data['tipo'], titulo=data['titulo'],
                mensaje=data['mensaje'], enlace=data.get('enlace', ''),
            )
            total = 1
            detalle = {'usuario_id': usuario.id, 'titulo': data['titulo']}
        else:
            with connection.cursor() as cursor:
                cursor.execute(
                    'SELECT fn_enviar_notificacion_masiva(%s, %s, %s, %s, %s)',
                    [data['rol'], data['tipo'], data['titulo'], data['mensaje'], data.get('enlace', '')],
                )
                total = cursor.fetchone()[0]
            detalle = {'rol': data['rol'], 'titulo': data['titulo'], 'total_destinatarios': total}

        _log(request, 'ENVIAR_NOTIFICACION', None, detalle)
        return Response({'destinatarios': total}, status=status.HTTP_201_CREATED)


class ListaNotificacionesAdminView(generics.ListAPIView):
    """CU23: el SuperAdmin ve el historial de notificaciones enviadas —
    ?usuario_id=<id> para las de una persona puntual."""

    permission_classes = [EsSuperAdmin]
    serializer_class = NotificacionAdminSerializer
    pagination_class = None

    def get_queryset(self):
        qs = Notificacion.objects.filter(activo=True).select_related('usuario').order_by('-creado_en')
        usuario_id = self.request.query_params.get('usuario_id')
        if usuario_id:
            qs = qs.filter(usuario_id=usuario_id)
        return qs[:200]
