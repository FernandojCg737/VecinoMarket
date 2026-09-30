from django.db import models

from apps.core.models import BaseModel


class LogAuditoria(BaseModel):
    """Registro inmutable de operaciones críticas del sistema (CU22)."""

    usuario = models.ForeignKey(
        'usuarios.Usuario', on_delete=models.SET_NULL, null=True, blank=True, related_name='logs_auditoria'
    )
    accion = models.CharField(max_length=100)
    entidad_afectada = models.CharField(max_length=50, blank=True)
    entidad_id = models.BigIntegerField(null=True, blank=True)
    detalle = models.JSONField(default=dict, blank=True)
    ip_origen = models.GenericIPAddressField(null=True, blank=True)

    class Meta:
        verbose_name = 'Log de auditoría'
        verbose_name_plural = 'Logs de auditoría'
        ordering = ['-creado_en']
        indexes = [
            models.Index(fields=['usuario']),
            models.Index(fields=['creado_en']),
        ]

    def __str__(self):
        return f'{self.accion} por {self.usuario} el {self.creado_en:%Y-%m-%d %H:%M}'
