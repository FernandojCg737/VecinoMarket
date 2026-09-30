from rest_framework import serializers

from .models import Notificacion


class NotificacionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notificacion
        fields = ['id', 'tipo', 'titulo', 'mensaje', 'enlace', 'leido', 'creado_en']
        read_only_fields = fields


class NotificacionAdminSerializer(NotificacionSerializer):
    usuario_email = serializers.CharField(source='usuario.email', read_only=True)

    class Meta(NotificacionSerializer.Meta):
        fields = NotificacionSerializer.Meta.fields + ['usuario_email']
        read_only_fields = fields


ROLES_DESTINO = ['TODOS', 'SUPERADMIN', 'ADMIN', 'EMPRESA', 'EMPLEADO', 'COMPRADOR']


class EnviarNotificacionSerializer(serializers.Serializer):
    """CU23: el SuperAdmin manda una notificación — a un usuario puntual
    (usuario_id) o masiva a todo un rol (rol), nunca ambos a la vez."""

    usuario_id = serializers.IntegerField(required=False)
    rol = serializers.ChoiceField(choices=ROLES_DESTINO, required=False)
    tipo = serializers.CharField(max_length=40)
    titulo = serializers.CharField(max_length=120)
    mensaje = serializers.CharField(max_length=255)
    enlace = serializers.CharField(max_length=255, required=False, allow_blank=True)

    def validate(self, data):
        if bool(data.get('usuario_id')) == bool(data.get('rol')):
            raise serializers.ValidationError('Indica exactamente uno: usuario_id (a una persona) o rol (masiva).')
        return data
