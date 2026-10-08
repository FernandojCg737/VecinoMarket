from django.db import models


class BaseModel(models.Model):
    """Campos comunes a (casi) todos los modelos del sistema."""

    creado_en = models.DateTimeField(auto_now_add=True)
    actualizado_en = models.DateTimeField(auto_now=True)
    activo = models.BooleanField(default=True)

    class Meta:
        abstract = True


class TenantQuerySet(models.QuerySet):
    def del_tenant(self, empresa_id):
        return self.filter(empresa_id=empresa_id)


class TenantManager(models.Manager):
    def get_queryset(self):
        return TenantQuerySet(self.model, using=self._db)


class TenantModel(BaseModel):
    """
    Modelo base para todo lo que pertenece a una empresa (tenant): productos,
    pedidos, promociones, etc. Aísla los datos por fila (shared schema).
    """

    empresa = models.ForeignKey(
        'usuarios.Empresa', on_delete=models.CASCADE, related_name='+'
    )

    objects = TenantManager()

    class Meta:
        abstract = True


from cloudinary_storage.storage import RawMediaCloudinaryStorage

class BackupLog(BaseModel):
    """Registro de las copias de seguridad (manuales y automáticas)."""

    class TipoBackup(models.TextChoices):
        MANUAL = 'MANUAL', 'Manual'
        AUTOMATICO = 'AUTOMATICO', 'Automático'

    tipo = models.CharField(max_length=20, choices=TipoBackup.choices, default=TipoBackup.MANUAL)
    archivo = models.FileField(upload_to='backups/', storage=RawMediaCloudinaryStorage())

    class Meta:
        ordering = ['-creado_en']

    def __str__(self):
        return f"Backup {self.tipo} - {self.creado_en.strftime('%Y-%m-%d %H:%M')}"


import datetime

class ConfiguracionSistema(BaseModel):
    """Configuraciones globales del sistema (Singleton)."""
    hora_backup = models.TimeField(default=datetime.time(3, 0), verbose_name='Hora de Backup Automático')

    class Meta:
        verbose_name = 'Configuración del Sistema'
        verbose_name_plural = 'Configuraciones del Sistema'

    def save(self, *args, **kwargs):
        self.pk = 1  # Forzar singleton
        super().save(*args, **kwargs)

    @classmethod
    def get_config(cls):
        obj, created = cls.objects.get_or_create(pk=1)
        return obj

