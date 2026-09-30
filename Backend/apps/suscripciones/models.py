from django.db import models

from apps.core.models import BaseModel


class Plan(BaseModel):
    """CU20: catálogo de planes que vende el administrador.

    `precio_mensual` nació pensado como tarifa recurrente, pero los 3 planes
    de autoservicio (CU01) tienen precio y duración fijos que no son
    necesariamente "mensuales" (ej. Premium = Bs 129.90 por 1 año) — para
    esos planes el campo se interpreta como "precio total del plan", y
    `duracion_dias` manda sobre cualquier noción de "por mes".
    """

    class Estado(models.TextChoices):
        ACTIVO = 'ACTIVO', 'Activo'
        INACTIVO = 'INACTIVO', 'Inactivo'

    class Codigo(models.TextChoices):
        PRUEBA = 'PRUEBA', 'Prueba'
        BASICO = 'BASICO', 'Básico'
        PREMIUM = 'PREMIUM', 'Premium'

    codigo = models.CharField(
        max_length=20, blank=True, unique=True, null=True,
        help_text='CU01: identidad estable para los planes de autoservicio (PRUEBA/BASICO/PREMIUM). '
                   'Vacío para planes de catálogo que el SuperAdmin arma a mano.',
    )
    nombre = models.CharField(max_length=50)
    precio_mensual = models.DecimalField(max_digits=10, decimal_places=2)
    duracion_dias = models.PositiveIntegerField(
        default=30, help_text='CU01: cuántos días dura la suscripción al comprar este plan.'
    )
    limite_productos = models.PositiveIntegerField(null=True, blank=True)  # NULL = ilimitado
    incluye_live_commerce = models.BooleanField(default=False)
    incluye_ia = models.BooleanField(default=False)
    porcentaje_comision = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    estado = models.CharField(max_length=20, choices=Estado.choices, default=Estado.ACTIVO)

    class Meta:
        verbose_name = 'Plan'
        verbose_name_plural = 'Planes'
        constraints = [
            models.CheckConstraint(check=models.Q(precio_mensual__gte=0), name='plan_precio_mensual_gte_0'),
        ]

    def __str__(self):
        return self.nombre


class Suscripcion(BaseModel):
    class Estado(models.TextChoices):
        ACTIVA = 'ACTIVA', 'Activa'
        VENCIDA = 'VENCIDA', 'Vencida'
        SUSPENDIDA = 'SUSPENDIDA', 'Suspendida'
        CANCELADA = 'CANCELADA', 'Cancelada'

    empresa = models.ForeignKey('usuarios.Empresa', on_delete=models.CASCADE, related_name='suscripciones')
    plan = models.ForeignKey(Plan, on_delete=models.PROTECT, related_name='suscripciones')
    fecha_inicio = models.DateTimeField(help_text='CU01: fecha y hora exactas de adquisición del plan.')
    fecha_vencimiento = models.DateTimeField(help_text='CU01: fecha y hora exactas de vencimiento del plan.')
    estado = models.CharField(max_length=20, choices=Estado.choices, default=Estado.ACTIVA)
    renovacion_automatica = models.BooleanField(default=True)

    class Meta:
        verbose_name = 'Suscripción'
        verbose_name_plural = 'Suscripciones'
        indexes = [
            models.Index(fields=['empresa']),
            models.Index(fields=['fecha_vencimiento']),
        ]

    def __str__(self):
        return f'{self.empresa} - {self.plan} ({self.estado})'
