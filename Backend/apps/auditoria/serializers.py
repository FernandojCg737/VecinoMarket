from rest_framework import serializers

from .models import LogAuditoria


class LogAuditoriaSerializer(serializers.ModelSerializer):
    usuario_email = serializers.EmailField(source='usuario.email', read_only=True, default=None)
    usuario_nombre = serializers.CharField(source='usuario.nombre', read_only=True, default=None)

    class Meta:
        model = LogAuditoria
        fields = [
            'id', 'usuario', 'usuario_email', 'usuario_nombre',
            'accion', 'entidad_afectada', 'entidad_id', 'detalle',
            'ip_origen', 'creado_en',
        ]
        read_only_fields = fields
