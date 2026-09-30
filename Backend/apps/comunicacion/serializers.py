from rest_framework import serializers

from .models import ChatbotFAQ, ChatbotInteraccion, ChatConversacion, ChatMensaje


class ChatMensajeSerializer(serializers.ModelSerializer):
    emisor_nombre = serializers.CharField(source='emisor_usuario.nombre', read_only=True)
    emisor_rol = serializers.CharField(source='emisor_usuario.rol', read_only=True)
    archivo_url = serializers.SerializerMethodField()

    class Meta:
        model = ChatMensaje
        fields = [
            'id', 'conversacion', 'emisor_usuario', 'emisor_nombre', 'emisor_rol',
            'tipo', 'contenido', 'archivo', 'archivo_url', 'fecha_envio', 'leido',
        ]
        extra_kwargs = {
            'conversacion': {'read_only': True},
            'emisor_usuario': {'read_only': True},
            'archivo': {'write_only': True, 'required': False},
            'leido': {'read_only': True},
        }

    def get_archivo_url(self, obj):
        if not obj.archivo:
            return ''
        url = obj.archivo.url
        request = self.context.get('request')
        if request and url.startswith('/'):
            return request.build_absolute_uri(url)
        return url


class ChatConversacionSerializer(serializers.ModelSerializer):
    comprador_nombre = serializers.CharField(source='comprador.usuario.nombre', read_only=True)
    empresa_nombre = serializers.CharField(source='empresa.razon_social', read_only=True)
    ultimo_mensaje = serializers.SerializerMethodField()
    no_leidos = serializers.SerializerMethodField()

    class Meta:
        model = ChatConversacion
        fields = [
            'id', 'comprador', 'comprador_nombre', 'empresa', 'empresa_nombre',
            'estado', 'ultimo_mensaje', 'no_leidos', 'creado_en', 'actualizado_en',
        ]
        read_only_fields = ['id', 'comprador', 'empresa', 'creado_en', 'actualizado_en']

    def get_ultimo_mensaje(self, obj):
        ultimo = obj.mensajes.last()
        if not ultimo:
            return None
        return {
            'tipo': ultimo.tipo,
            'contenido': ultimo.contenido[:80],
            'fecha_envio': ultimo.fecha_envio,
        }

    def get_no_leidos(self, obj):
        usuario = self.context.get('usuario')
        if not usuario:
            return 0
        return obj.mensajes.filter(leido=False).exclude(emisor_usuario=usuario).count()


class ChatbotFAQSerializer(serializers.ModelSerializer):
    """CU15: pregunta frecuente que la empresa configura para su propio
    chatbot — 'empresa' es de solo lectura, la vista la fuerza a la propia."""

    class Meta:
        model = ChatbotFAQ
        fields = ['id', 'palabras_clave', 'pregunta_ejemplo', 'respuesta']


class ChatbotInteraccionSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChatbotInteraccion
        fields = ['id', 'empresa', 'pregunta', 'respuesta', 'fecha']
        read_only_fields = fields
