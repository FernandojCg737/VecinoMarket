from django.db import models

from apps.core.models import BaseModel


class Valoracion(BaseModel):
    """CU04: reputación y valoraciones."""

    pedido = models.OneToOneField('pedidos.Pedido', on_delete=models.CASCADE, related_name='valoracion')
    comprador = models.ForeignKey('usuarios.Comprador', on_delete=models.CASCADE, related_name='valoraciones')
    empresa = models.ForeignKey('usuarios.Empresa', on_delete=models.CASCADE, related_name='valoraciones')
    calificacion = models.PositiveSmallIntegerField()
    comentario = models.CharField(max_length=500, blank=True)

    class Meta:
        verbose_name = 'Valoración'
        verbose_name_plural = 'Valoraciones'
        constraints = [
            models.CheckConstraint(
                check=models.Q(calificacion__gte=1) & models.Q(calificacion__lte=5),
                name='valoracion_calificacion_rango',
            ),
        ]

    def __str__(self):
        return f'{self.empresa} - {self.calificacion}★'


class RecomendacionIA(models.Model):
    comprador = models.ForeignKey('usuarios.Comprador', on_delete=models.CASCADE, related_name='recomendaciones')
    producto = models.ForeignKey('catalogo.Producto', on_delete=models.CASCADE, related_name='recomendaciones')
    score = models.DecimalField(max_digits=5, decimal_places=4)
    fecha_generada = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Recomendación IA'
        verbose_name_plural = 'Recomendaciones IA'

    def __str__(self):
        return f'{self.comprador} -> {self.producto} ({self.score})'
