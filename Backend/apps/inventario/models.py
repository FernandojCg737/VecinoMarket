from django.contrib.gis.db import models as gis_models
from django.db import models

from apps.core.models import TenantModel


class Sucursal(TenantModel):
    class Estado(models.TextChoices):
        ACTIVA = 'ACTIVA', 'Activa'
        INACTIVA = 'INACTIVA', 'Inactiva'

    nombre = models.CharField(max_length=100)
    direccion_texto = models.CharField(max_length=255, blank=True)
    ubicacion = gis_models.PointField(geography=True, srid=4326, null=True, blank=True)
    telefono = models.CharField(max_length=20, blank=True)
    estado = models.CharField(max_length=20, choices=Estado.choices, default=Estado.ACTIVA)

    class Meta:
        verbose_name = 'Sucursal'
        verbose_name_plural = 'Sucursales'

    def __str__(self):
        return self.nombre


class InventarioSucursal(models.Model):
    producto = models.ForeignKey('catalogo.Producto', on_delete=models.CASCADE, related_name='inventarios')
    sucursal = models.ForeignKey(Sucursal, on_delete=models.CASCADE, related_name='inventarios')
    cantidad_disponible = models.PositiveIntegerField(default=0)
    stock_minimo = models.PositiveIntegerField(default=0)
    actualizado_en = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Inventario por sucursal'
        verbose_name_plural = 'Inventarios por sucursal'
        unique_together = ('producto', 'sucursal')

    def __str__(self):
        return f'{self.producto.nombre} @ {self.sucursal.nombre}: {self.cantidad_disponible}'
