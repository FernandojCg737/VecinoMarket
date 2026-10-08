from datetime import datetime

from django.http import HttpResponse
from django.core.files.base import ContentFile
from django.db import DatabaseError, transaction
from rest_framework import status
from rest_framework.parsers import MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import generics

from apps.auditoria.models import LogAuditoria
from apps.usuarios.permissions import EsSuperAdmin

from .backup import (
    ErrorRespaldo, RestauracionEnCurso, RestauracionNoDisponible,
    generar_backup_json, restaurar_backup_json,
)
from .utils import get_client_ip
from .models import BackupLog, ConfiguracionSistema
from .serializers import BackupLogSerializer, ConfiguracionSistemaSerializer


class BackupView(APIView):
    """Descarga un respaldo completo del sistema en JSON — exclusivo del
    SuperAdmin (punto 6 del parcial: Backup/Restore)."""

    permission_classes = [EsSuperAdmin]

    def get(self, request):
        contenido = generar_backup_json()
        nombre = f'vecinomarket_backup_{datetime.now():%Y%m%d_%H%M}.json'

        LogAuditoria.objects.create(
            usuario=request.user, accion='BACKUP_SISTEMA', ip_origen=get_client_ip(request),
            user_agent=request.META.get('HTTP_USER_AGENT', ''),
        )
        
        # Guardar en la base de datos y nube
        backup_log = BackupLog(tipo=BackupLog.TipoBackup.MANUAL)
        backup_log.archivo.save(nombre, ContentFile(contenido.encode('utf-8')))

        response = HttpResponse(contenido, content_type='application/json')
        response['Content-Disposition'] = f'attachment; filename="{nombre}"'
        return response


class BackupLogListView(generics.ListAPIView):
    """Lista el historial de respaldos (manuales y automáticos)."""
    permission_classes = [EsSuperAdmin]
    queryset = BackupLog.objects.all()
    serializer_class = BackupLogSerializer


class BackupLogDeleteView(generics.DestroyAPIView):
    """Elimina un registro de respaldo."""
    permission_classes = [EsSuperAdmin]
    queryset = BackupLog.objects.all()


class RestoreView(APIView):
    """Restaura el sistema desde un archivo de respaldo JSON (el que genera
    BackupView) — exclusivo del SuperAdmin. Hace upsert por PK, no vacía la
    base antes. Conserva los datos del archivo sin ejecutar efectos de negocio."""

    permission_classes = [EsSuperAdmin]
    parser_classes = [MultiPartParser]

    def post(self, request):
        archivo = request.FILES.get('archivo')
        if not archivo:
            return Response({'detail': 'Falta el archivo de respaldo.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            # El registro de auditoría forma parte de la misma transacción:
            # no se anuncia un fallo después de haber confirmado los datos.
            with transaction.atomic():
                resultado = restaurar_backup_json(archivo)
                LogAuditoria.objects.create(
                    usuario=request.user, accion='RESTORE_SISTEMA', ip_origen=get_client_ip(request),
                    detalle={'archivo': archivo.name, **resultado},
                    user_agent=request.META.get('HTTP_USER_AGENT', ''),
                )
        except RestauracionEnCurso as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_409_CONFLICT)
        except RestauracionNoDisponible as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        except ErrorRespaldo as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        except DatabaseError as exc:
            codigo = getattr(exc.__cause__, 'pgcode', None)
            if codigo in ('55P03', '57014', '40P01'):
                return Response(
                    {'detail': 'La base estaba ocupada o superó el tiempo de espera. La restauración se revirtió; puedes intentarlo nuevamente.'},
                    status=status.HTTP_503_SERVICE_UNAVAILABLE,
                )
            return Response(
                {'detail': 'El respaldo contiene datos incompatibles con la base actual. No se aplicó ningún cambio.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response({'detail': f"Respaldo restaurado correctamente: {resultado['registros_restaurados']} registros.", **resultado})

class ConfiguracionSistemaView(APIView):
    """Obtiene y actualiza la configuración global del sistema (hora de backups automáticos)."""
    permission_classes = [EsSuperAdmin]

    def get(self, request):
        config = ConfiguracionSistema.get_config()
        serializer = ConfiguracionSistemaSerializer(config)
        return Response(serializer.data)

    def post(self, request):
        config = ConfiguracionSistema.get_config()
        serializer = ConfiguracionSistemaSerializer(config, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

