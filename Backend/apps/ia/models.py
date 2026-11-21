from django.contrib.postgres.fields import ArrayField
from django.db import models
from django.utils import timezone

# Tope de ids de producto guardados por búsqueda (un término muy genérico
# puede tocar cientos; las categorías se guardan todas).
MAX_PRODUCTOS_COINCIDENTES = 100


class EventoInteraccion(models.Model):
    """Historial de navegación del comprador (RF44–RF46): la materia prima
    del recomendador (CU1/CU2) y de las tendencias de consumo (CU3).

    - VISTA / CARRITO: llevan producto.
    - BUSQUEDA: lleva termino_busqueda y cuántos resultados devolvió el
      catálogo en ese momento (para "búsquedas sin resultados").
    - COMPRA: existe en el catálogo de tipos por completitud, pero NO se
      registra como evento: las compras se derivan de los pedidos pagados
      (pedidos_pedidoitem), así no hay dos fuentes de verdad.

    comprador es nulo para visitantes sin sesión (Invitado). `fecha` usa
    default (no auto_now_add) para que seed_interacciones pueda sembrar
    historia de semanas atrás.
    """

    class Tipo(models.TextChoices):
        VISTA = 'VISTA', 'Vista de producto'
        BUSQUEDA = 'BUSQUEDA', 'Búsqueda'
        CARRITO = 'CARRITO', 'Agregado al carrito'
        COMPRA = 'COMPRA', 'Compra'

    comprador = models.ForeignKey(
        'usuarios.Comprador', on_delete=models.SET_NULL, null=True, blank=True, related_name='eventos_interaccion'
    )
    producto = models.ForeignKey(
        'catalogo.Producto', on_delete=models.CASCADE, null=True, blank=True, related_name='eventos_interaccion'
    )
    tipo = models.CharField(max_length=20, choices=Tipo.choices)
    termino_busqueda = models.CharField(max_length=150, blank=True)
    resultados = models.PositiveIntegerField(
        null=True, blank=True, help_text='Solo BUSQUEDA: cuántos productos devolvió el catálogo.'
    )
    # Solo BUSQUEDA: qué tocó la búsqueda EN ESE MOMENTO. Se calcula al
    # registrar (con la misma consulta que cuenta los resultados) para que
    # CU3 no tenga que volver a cruzar cada término con todo el catálogo.
    categorias_coincidentes = ArrayField(models.BigIntegerField(), default=list, blank=True)
    productos_coincidentes = ArrayField(models.BigIntegerField(), default=list, blank=True)
    departamento = models.CharField(
        max_length=60, blank=True, help_text='Zona del comprador al momento del evento (CU3: demanda por zona).'
    )
    fecha = models.DateTimeField(default=timezone.now)

    class Meta:
        verbose_name = 'Evento de interacción'
        verbose_name_plural = 'Eventos de interacción'
        indexes = [
            models.Index(fields=['comprador', 'fecha'], name='ia_evento_comprador_fecha_idx'),
            models.Index(fields=['producto', 'fecha'], name='ia_evento_producto_fecha_idx'),
            models.Index(fields=['tipo', 'fecha'], name='ia_evento_tipo_fecha_idx'),
        ]

    def __str__(self):
        objetivo = self.producto_id or self.termino_busqueda
        return f'{self.tipo} {objetivo} ({self.fecha:%Y-%m-%d %H:%M})'


class SimilitudProducto(models.Model):
    """CU1: vecinos precalculados por `generar_recomendaciones` (top-50 por
    producto, nunca la matriz ítem×ítem completa). score = 0.7·colaborativo
    + 0.3·contenido (TF-IDF), en 0..1. Lo leen "Productos similares" y la
    recomendación en línea de un comprador nuevo, sin cargar scikit-learn
    en el proceso web."""

    producto = models.ForeignKey('catalogo.Producto', on_delete=models.CASCADE, related_name='similares_ia')
    similar = models.ForeignKey('catalogo.Producto', on_delete=models.CASCADE, related_name='+')
    score = models.DecimalField(max_digits=5, decimal_places=4)
    fecha_generada = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Similitud de producto (IA)'
        verbose_name_plural = 'Similitudes de producto (IA)'
        constraints = [
            models.UniqueConstraint(fields=['producto', 'similar'], name='ia_similitud_par_unico'),
        ]

    def __str__(self):
        return f'{self.producto_id} ~ {self.similar_id} ({self.score})'
