"""Tareas programadas de IA, disparadas desde fuera (GitHub Actions).

El backend corre en Render free: sin Cron Jobs (son de pago) y el servicio
se duerme sin tráfico, así que un hilo programado dentro del proceso no es
confiable. En su lugar, un workflow de GitHub Actions
(.github/workflows/ia-recomendaciones-nocturnas.yml) llama cada noche a
este endpoint, protegido con una clave compartida (IA_CRON_KEY).
"""
import hmac

from django.conf import settings
from django.db import connection
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.auditoria.models import LogAuditoria
from apps.core.utils import get_client_ip

# Clave arbitraria del advisory lock de PostgreSQL que evita dos corridas a la vez.
LOCK_GENERAR_RECOMENDACIONES = 4401


def clave_valida(request):
    esperada = getattr(settings, 'IA_CRON_KEY', '')
    recibida = request.headers.get('X-Cron-Key', '')
    return bool(esperada) and hmac.compare_digest(esperada.encode(), recibida.encode())


class GenerarRecomendacionesTareaView(APIView):
    """CU1 (RF44): corrida nocturna de generar_recomendaciones.
    POST con la cabecera X-Cron-Key = IA_CRON_KEY. Sin la variable configurada
    en el servidor responde 503 (nunca queda abierto); con clave incorrecta,
    403; si ya hay una corrida en curso, 409. Devuelve el resumen de la corrida."""

    authentication_classes = []  # no usa JWT: la autenticación es la clave compartida
    permission_classes = [AllowAny]

    def post(self, request):
        if not getattr(settings, 'IA_CRON_KEY', ''):
            return Response({'detail': 'IA_CRON_KEY no está configurada en el servidor.'},
                            status=status.HTTP_503_SERVICE_UNAVAILABLE)
        if not clave_valida(request):
            return Response({'detail': 'Clave de tarea inválida.'}, status=status.HTTP_403_FORBIDDEN)

        with connection.cursor() as cursor:
            cursor.execute('SELECT pg_try_advisory_lock(%s)', [LOCK_GENERAR_RECOMENDACIONES])
            if not cursor.fetchone()[0]:
                return Response({'detail': 'Ya hay una corrida en curso.'}, status=status.HTTP_409_CONFLICT)
        try:
            from . import recomendador  # numpy/scikit-learn solo se cargan en esta tarea

            resumen = recomendador.ejecutar()
        finally:
            with connection.cursor() as cursor:
                cursor.execute('SELECT pg_advisory_unlock(%s)', [LOCK_GENERAR_RECOMENDACIONES])

        LogAuditoria.objects.create(
            usuario=None,
            accion='IA_GENERAR_RECOMENDACIONES',
            entidad_afectada='recomendacion_ia',
            detalle=resumen,
            ip_origen=get_client_ip(request),
            user_agent=request.META.get('HTTP_USER_AGENT', ''),
        )
        return Response(resumen)
