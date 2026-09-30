from datetime import datetime

from django.http import HttpResponse
from rest_framework import status
from rest_framework.parsers import MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.auditoria.models import LogAuditoria
from apps.usuarios.permissions import EsSuperAdmin

from .backup import generar_backup_json, restaurar_backup_json
from .utils import get_client_ip


class BackupView(APIView):
    """Descarga un respaldo completo del sistema en JSON — exclusivo del
    SuperAdmin (punto 6 del parcial: Backup/Restore)."""

    permission_classes = [EsSuperAdmin]

    def get(self, request):
        contenido = generar_backup_json()
        nombre = f'vecinomarket_backup_{datetime.now():%Y%m%d_%H%M}.json'

        LogAuditoria.objects.create(
            usuario=request.user, accion='BACKUP_SISTEMA', ip_origen=get_client_ip(request),
        )

        response = HttpResponse(contenido, content_type='application/json')
        response['Content-Disposition'] = f'attachment; filename="{nombre}"'
        return response


class RestoreView(APIView):
    """Restaura el sistema desde un archivo de respaldo JSON (el que genera
    BackupView) — exclusivo del SuperAdmin. Hace upsert por PK, no vacía la
    base antes (ver docstring de restaurar_backup_json)."""

    permission_classes = [EsSuperAdmin]
    parser_classes = [MultiPartParser]

    def post(self, request):
        archivo = request.FILES.get('archivo')
        if not archivo:
            return Response({'detail': 'Falta el archivo de respaldo.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            restaurar_backup_json(archivo)
        except Exception as exc:
            return Response({'detail': f'No se pudo restaurar el respaldo: {exc}'}, status=status.HTTP_400_BAD_REQUEST)

        LogAuditoria.objects.create(
            usuario=request.user, accion='RESTORE_SISTEMA', ip_origen=get_client_ip(request),
            detalle={'archivo': archivo.name},
        )
        return Response({'detail': 'Respaldo restaurado correctamente.'})
