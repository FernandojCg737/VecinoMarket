from django.conf import settings
from django.core.files.storage import FileSystemStorage
from django.db import models

from apps.core.models import BaseModel, TenantModel


def _grabacion_live_storage():
    """Cloudinary si está configurado (con VideoMediaCloudinaryStorage —
    resource_type='video' fijo: acá no hay ambigüedad como en el chat, una
    grabación de MediaRecorder siempre es video. OJO: resource_type='auto'
    (el que usa ChatMediaCloudinaryStorage) sirve para la subida, pero la
    URL de descarga que arma esta librería para 'auto' queda rota — no es
    un resource_type válido para servir el archivo, hay que usar el tipo
    real). Si no, disco local en dev."""
    if settings.CLOUDINARY_STORAGE.get('CLOUD_NAME'):
        from cloudinary_storage.storage import VideoMediaCloudinaryStorage
        return VideoMediaCloudinaryStorage()
    return FileSystemStorage()


class Promocion(TenantModel):
    class Tipo(models.TextChoices):
        PORCENTAJE = 'PORCENTAJE', 'Porcentaje'
        MONTO_FIJO = 'MONTO_FIJO', 'Monto fijo'

    class Estado(models.TextChoices):
        ACTIVA = 'ACTIVA', 'Activa'
        FINALIZADA = 'FINALIZADA', 'Finalizada'
        CANCELADA = 'CANCELADA', 'Cancelada'

    nombre = models.CharField(max_length=100)
    tipo = models.CharField(max_length=20, choices=Tipo.choices)
    valor = models.DecimalField(max_digits=10, decimal_places=2)
    fecha_inicio = models.DateTimeField()
    fecha_fin = models.DateTimeField()
    estado = models.CharField(max_length=20, choices=Estado.choices, default=Estado.ACTIVA)
    productos = models.ManyToManyField(
        'catalogo.Producto', through='PromocionProducto', related_name='promociones'
    )

    class Meta:
        verbose_name = 'Promoción'
        verbose_name_plural = 'Promociones'
        constraints = [
            models.CheckConstraint(check=models.Q(valor__gt=0), name='promocion_valor_gt_0'),
            models.CheckConstraint(
                check=models.Q(fecha_fin__gt=models.F('fecha_inicio')), name='promocion_fechas_validas'
            ),
        ]

    def __str__(self):
        return self.nombre


class PromocionProducto(models.Model):
    promocion = models.ForeignKey(Promocion, on_delete=models.CASCADE)
    producto = models.ForeignKey('catalogo.Producto', on_delete=models.CASCADE)

    class Meta:
        verbose_name = 'Producto en promoción'
        verbose_name_plural = 'Productos en promoción'
        unique_together = ('promocion', 'producto')


class LiveCommerceSesion(TenantModel):
    class Estado(models.TextChoices):
        PROGRAMADA = 'PROGRAMADA', 'Programada'
        EN_VIVO = 'EN_VIVO', 'En vivo'
        FINALIZADA = 'FINALIZADA', 'Finalizada'

    titulo = models.CharField(max_length=150)
    url_stream = models.URLField(max_length=255, blank=True)
    estado = models.CharField(max_length=20, choices=Estado.choices, default=Estado.PROGRAMADA)
    fecha_inicio = models.DateTimeField(null=True, blank=True)
    fecha_fin = models.DateTimeField(null=True, blank=True)
    # Se llena cuando el anfitrión se desconecta sin terminar la transmisión
    # a propósito (cerró la pestaña, perdió señal) — mientras esté seteado,
    # los espectadores ven "Live pausado"; si pasan 30 min sin que vuelva
    # (LiveSignalingConsumer._auto_finalizar_tras_pausa), recién ahí se
    # finaliza sola. Se limpia a NULL en cuanto el anfitrión se reconecta.
    pausado_desde = models.DateTimeField(null=True, blank=True)
    # Grabación local del navegador del anfitrión (MediaRecorder), subida al
    # terminar la transmisión — no existe si cerró sin usar el botón
    # "Terminar" (nadie grabó nada en ese caso, todo es peer-to-peer).
    grabacion = models.FileField(
        upload_to='lives/grabaciones/', blank=True, null=True, storage=_grabacion_live_storage
    )
    productos = models.ManyToManyField(
        'catalogo.Producto', through='LiveCommerceProducto', related_name='sesiones_live'
    )

    @property
    def grabacion_url(self):
        return self.grabacion.url if self.grabacion else ''

    class Meta:
        verbose_name = 'Sesión de live commerce'
        verbose_name_plural = 'Sesiones de live commerce'

    def __str__(self):
        return self.titulo


class LiveCommerceProducto(models.Model):
    sesion = models.ForeignKey(LiveCommerceSesion, on_delete=models.CASCADE)
    producto = models.ForeignKey('catalogo.Producto', on_delete=models.CASCADE)

    class Meta:
        verbose_name = 'Producto en sesión live'
        verbose_name_plural = 'Productos en sesión live'
        unique_together = ('sesion', 'producto')


class ComentarioLive(BaseModel):
    """Chat en vivo de una sesión de live commerce — cualquier usuario
    autenticado (comprador, empresa o empleado) puede comentar mientras
    mira o transmite; se reenvía en tiempo real por el mismo WebSocket de
    señalización (ver LiveSignalingConsumer) y queda guardado para que
    quien se une tarde vea el historial."""

    sesion = models.ForeignKey(LiveCommerceSesion, on_delete=models.CASCADE, related_name='comentarios')
    usuario = models.ForeignKey('usuarios.Usuario', on_delete=models.CASCADE, related_name='+')
    texto = models.CharField(max_length=280)

    class Meta:
        verbose_name = 'Comentario de live'
        verbose_name_plural = 'Comentarios de live'
        indexes = [models.Index(fields=['sesion'])]

    def __str__(self):
        return f'{self.usuario.nombre}: {self.texto[:30]}'
