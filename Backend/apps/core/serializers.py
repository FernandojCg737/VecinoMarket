from rest_framework import serializers
from .models import BackupLog

class BackupLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = BackupLog
        fields = ['id', 'tipo', 'archivo', 'creado_en']

from .models import ConfiguracionSistema

class ConfiguracionSistemaSerializer(serializers.ModelSerializer):
    class Meta:
        model = ConfiguracionSistema
        fields = ['hora_backup']

