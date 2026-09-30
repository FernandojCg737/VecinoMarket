from django.db import models

from apps.core.models import BaseModel


class Notificacion(BaseModel):
    usuario = models.ForeignKey('usuarios.Usuario', on_delete=models.CASCADE, related_name='notificaciones')
    tipo = models.CharField(max_length=40)  # ej: PEDIDO_ENVIADO, PLAN_POR_VENCER, MENSAJE_NUEVO
    titulo = models.CharField(max_length=120)
    mensaje = models.CharField(max_length=255)
    enlace = models.URLField(max_length=255, blank=True)
    leido = models.BooleanField(default=False)

    class Meta:
        verbose_name = 'Notificación'
        verbose_name_plural = 'Notificaciones'
        indexes = [models.Index(fields=['usuario', 'leido'])]

    def __str__(self):
        return f'{self.titulo} -> {self.usuario.email}'
