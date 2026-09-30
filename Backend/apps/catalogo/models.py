from django.db import models

from apps.core.models import BaseModel, TenantModel


class Categoria(BaseModel):
    nombre = models.CharField(max_length=80)
    descripcion = models.CharField(max_length=255, blank=True)
    categoria_padre = models.ForeignKey(
        'self', on_delete=models.SET_NULL, null=True, blank=True, related_name='subcategorias'
    )
    icono = models.CharField(max_length=50, blank=True)

    class Meta:
        verbose_name = 'Categoría'
        verbose_name_plural = 'Categorías'

    def __str__(self):
        return self.nombre


class Producto(TenantModel):
    class Estado(models.TextChoices):
        ACTIVO = 'ACTIVO', 'Activo'
        INACTIVO = 'INACTIVO', 'Inactivo'
        AGOTADO = 'AGOTADO', 'Agotado'

    categoria = models.ForeignKey(
        Categoria, on_delete=models.SET_NULL, null=True, blank=True, related_name='productos'
    )
    creado_por_empleado = models.ForeignKey(
        'usuarios.Empleado', on_delete=models.SET_NULL, null=True, blank=True, related_name='productos_creados'
    )
    nombre = models.CharField(max_length=150)
    descripcion = models.TextField(blank=True)
    sku = models.CharField(max_length=50, blank=True)
    precio = models.DecimalField(max_digits=10, decimal_places=2)
    precio_descuento = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    estado = models.CharField(max_length=20, choices=Estado.choices, default=Estado.ACTIVO)

    class Meta:
        verbose_name = 'Producto'
        verbose_name_plural = 'Productos'
        indexes = [
            models.Index(fields=['empresa']),
            models.Index(fields=['categoria']),
        ]
        constraints = [
            models.CheckConstraint(check=models.Q(precio__gte=0), name='producto_precio_gte_0'),
            models.CheckConstraint(
                check=models.Q(precio_descuento__isnull=True) | models.Q(precio_descuento__gte=0),
                name='producto_precio_descuento_gte_0',
            ),
        ]

    def __str__(self):
        return self.nombre


class ProductoImagen(models.Model):
    producto = models.ForeignKey(Producto, on_delete=models.CASCADE, related_name='imagenes')
    # Una imagen viene de una de las dos: un archivo subido (a Cloudinary en
    # producción, CU07) o una URL externa pegada a mano. url_efectiva()
    # decide cuál mostrar.
    archivo = models.ImageField(upload_to='productos/', blank=True, null=True)
    url = models.URLField(max_length=255, blank=True)
    orden = models.PositiveSmallIntegerField(default=1)

    class Meta:
        verbose_name = 'Imagen de producto'
        verbose_name_plural = 'Imágenes de producto'
        ordering = ['orden']

    def __str__(self):
        return f'{self.producto.nombre} #{self.orden}'

    @property
    def url_efectiva(self):
        return self.archivo.url if self.archivo else self.url


class CategorizacionIALog(models.Model):
    """CU08: sugerencia de categoría por visión artificial (trazabilidad del modelo IA)."""

    producto = models.ForeignKey(Producto, on_delete=models.CASCADE, related_name='categorizaciones_ia')
    categoria_sugerida = models.ForeignKey(
        Categoria, on_delete=models.SET_NULL, null=True, blank=True, related_name='+'
    )
    confianza = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    fecha = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Log de categorización IA'
        verbose_name_plural = 'Logs de categorización IA'

    def __str__(self):
        return f'{self.producto.nombre} -> {self.categoria_sugerida}'
