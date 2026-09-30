from django.conf import settings
from django.core.files.storage import FileSystemStorage
from django.db import models

from apps.core.models import BaseModel


def _chat_media_storage():
    """Cloudinary (resource_type 'auto', para que audio/video no se suban
    mal como 'image') si está configurado; si no, disco local — mismo
    criterio dev/prod que STORAGES['default'] en settings.py."""
    if settings.CLOUDINARY_STORAGE.get('CLOUD_NAME'):
        from .storage import ChatMediaCloudinaryStorage
        return ChatMediaCloudinaryStorage()
    return FileSystemStorage()


class ChatConversacion(BaseModel):
    class Estado(models.TextChoices):
        ABIERTA = 'ABIERTA', 'Abierta'
        CERRADA = 'CERRADA', 'Cerrada'

    comprador = models.ForeignKey('usuarios.Comprador', on_delete=models.CASCADE, related_name='conversaciones')
    empresa = models.ForeignKey('usuarios.Empresa', on_delete=models.CASCADE, related_name='conversaciones')
    empleado_asignado = models.ForeignKey(
        'usuarios.Empleado', on_delete=models.SET_NULL, null=True, blank=True, related_name='conversaciones_asignadas'
    )
    estado = models.CharField(max_length=20, choices=Estado.choices, default=Estado.ABIERTA)

    class Meta:
        verbose_name = 'Conversación'
        verbose_name_plural = 'Conversaciones'

    def __str__(self):
        return f'Conversación #{self.id} - {self.comprador} / {self.empresa}'


class ChatMensaje(models.Model):
    class Tipo(models.TextChoices):
        TEXTO = 'TEXTO', 'Texto'
        IMAGEN = 'IMAGEN', 'Imagen'
        AUDIO = 'AUDIO', 'Audio'
        VIDEO = 'VIDEO', 'Video'

    conversacion = models.ForeignKey(ChatConversacion, on_delete=models.CASCADE, related_name='mensajes')
    emisor_usuario = models.ForeignKey('usuarios.Usuario', on_delete=models.CASCADE, related_name='mensajes_enviados')
    contenido = models.TextField(blank=True)
    # CU14: la imagen/audio/video sube a Cloudinary (resource_type "auto",
    # ver apps/comunicacion/storage.py) — 'contenido' queda vacío o como
    # texto adicional/caption para esos tipos.
    archivo = models.FileField(upload_to='chat/', blank=True, null=True, storage=_chat_media_storage)
    tipo = models.CharField(max_length=20, choices=Tipo.choices, default=Tipo.TEXTO)
    fecha_envio = models.DateTimeField(auto_now_add=True)
    leido = models.BooleanField(default=False)

    class Meta:
        verbose_name = 'Mensaje de chat'
        verbose_name_plural = 'Mensajes de chat'
        ordering = ['fecha_envio']

    def __str__(self):
        return f'{self.emisor_usuario.email}: {self.contenido[:30]}'


class ChatbotFAQ(BaseModel):
    """CU15: pregunta frecuente que la empresa configura para su propio
    chatbot de atención — el comprador le pregunta directo a la tienda
    (no es un chatbot de soporte de la plataforma)."""

    empresa = models.ForeignKey('usuarios.Empresa', on_delete=models.CASCADE, related_name='+')
    palabras_clave = models.CharField(
        max_length=255,
        help_text='Palabras separadas por coma que activan esta respuesta (ej: "horario, hora, abierto")',
    )
    pregunta_ejemplo = models.CharField(max_length=200, blank=True)
    respuesta = models.TextField()

    class Meta:
        verbose_name = 'Pregunta frecuente del chatbot'
        verbose_name_plural = 'Preguntas frecuentes del chatbot'
        indexes = [models.Index(fields=['empresa'])]

    def __str__(self):
        return self.pregunta_ejemplo or self.palabras_clave[:50]


class ChatbotInteraccion(models.Model):
    comprador = models.ForeignKey(
        'usuarios.Comprador', on_delete=models.SET_NULL, null=True, blank=True, related_name='interacciones_chatbot'
    )
    empresa = models.ForeignKey(
        'usuarios.Empresa', on_delete=models.CASCADE, null=True, blank=True, related_name='interacciones_chatbot'
    )
    pregunta = models.TextField()
    respuesta = models.TextField(blank=True)
    fecha = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Interacción con chatbot'
        verbose_name_plural = 'Interacciones con chatbot'

    def __str__(self):
        return self.pregunta[:50]
