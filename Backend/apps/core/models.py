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
