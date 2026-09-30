from django.db import models

from apps.core.models import BaseModel


class Factura(BaseModel):
    class Tipo(models.TextChoices):
        SUSCRIPCION = 'SUSCRIPCION', 'Suscripción'
        COMISION = 'COMISION', 'Comisión'

    class EstadoPago(models.TextChoices):
        PENDIENTE = 'PENDIENTE', 'Pendiente'
        PAGADA = 'PAGADA', 'Pagada'
        VENCIDA = 'VENCIDA', 'Vencida'

    empresa = models.ForeignKey('usuarios.Empresa', on_delete=models.CASCADE, related_name='facturas')
    suscripcion = models.ForeignKey(
        'suscripciones.Suscripcion', on_delete=models.SET_NULL, null=True, blank=True, related_name='facturas'
    )
    tipo = models.CharField(max_length=20, choices=Tipo.choices)
    monto = models.DecimalField(max_digits=10, decimal_places=2)
    periodo_desde = models.DateField(null=True, blank=True)
    periodo_hasta = models.DateField(null=True, blank=True)
    estado_pago = models.CharField(max_length=20, choices=EstadoPago.choices, default=EstadoPago.PENDIENTE)
    fecha_pago = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = 'Factura'
        verbose_name_plural = 'Facturas'
        indexes = [models.Index(fields=['empresa'])]
        constraints = [
            models.CheckConstraint(check=models.Q(monto__gte=0), name='factura_monto_gte_0'),
        ]

    def __str__(self):
        return f'Factura #{self.id} - {self.empresa}'


class Referido(BaseModel):
    class Estado(models.TextChoices):
        PENDIENTE = 'PENDIENTE', 'Pendiente'
        CONFIRMADO = 'CONFIRMADO', 'Confirmado'

    empresa_referente = models.ForeignKey(
        'usuarios.Empresa', on_delete=models.CASCADE, related_name='referidos_hechos'
    )
    empresa_referida = models.ForeignKey(
        'usuarios.Empresa', on_delete=models.CASCADE, related_name='referidos_recibidos'
    )
    estado = models.CharField(max_length=20, choices=Estado.choices, default=Estado.PENDIENTE)
    beneficio_aplicado = models.CharField(max_length=100, blank=True)

    class Meta:
        verbose_name = 'Referido'
        verbose_name_plural = 'Referidos'
        constraints = [
            models.CheckConstraint(
                check=~models.Q(empresa_referente=models.F('empresa_referida')),
                name='referido_empresas_distintas',
            ),
        ]

    def __str__(self):
        return f'{self.empresa_referente} -> {self.empresa_referida}'


class MetodoPago(BaseModel):
    """CU25: cómo le pagan a una empresa (QR, cuenta bancaria o pasarela de
    pago). El SuperAdmin puede ver/editar/eliminar el de cualquier empresa."""

    class Tipo(models.TextChoices):
        QR = 'QR', 'Código QR'
        CUENTA_BANCARIA = 'CUENTA_BANCARIA', 'Cuenta bancaria'
        PASARELA = 'PASARELA', 'Pasarela de pago'

    empresa = models.ForeignKey('usuarios.Empresa', on_delete=models.CASCADE, related_name='+')
    tipo = models.CharField(max_length=20, choices=Tipo.choices)
    nombre = models.CharField(max_length=100, help_text='Ej: "QR BCP", "Cuenta Banco Unión", "Stripe"')

    # Cuenta bancaria
    banco = models.CharField(max_length=100, blank=True)
    numero_cuenta = models.CharField(max_length=50, blank=True)
    titular = models.CharField(max_length=150, blank=True)

    # QR (imagen subida a Cloudinary, igual que las fotos de producto)
    imagen_qr = models.ImageField(upload_to='metodos_pago/', blank=True, null=True)

    # Pasarela de pago
    proveedor_pasarela = models.CharField(max_length=100, blank=True, help_text='Ej: Stripe, PagoFácil')
    referencia_pasarela = models.CharField(
        max_length=150, blank=True, help_text='ID de cuenta/comercio en la pasarela (no credenciales secretas)'
    )

    predeterminado = models.BooleanField(default=False)

    class Meta:
        verbose_name = 'Método de pago'
        verbose_name_plural = 'Métodos de pago'
        indexes = [models.Index(fields=['empresa'])]

    @property
    def imagen_qr_url(self):
        return self.imagen_qr.url if self.imagen_qr else ''

    def __str__(self):
        return f'{self.nombre} ({self.empresa})'


class ComisionVenta(BaseModel):
    """CU26: registro detallado por venta, ligado a la factura de comisión."""

    pedido = models.ForeignKey('pedidos.Pedido', on_delete=models.CASCADE, related_name='comisiones')
    empresa = models.ForeignKey('usuarios.Empresa', on_delete=models.CASCADE, related_name='comisiones')
    monto_venta = models.DecimalField(max_digits=10, decimal_places=2)
    porcentaje_aplicado = models.DecimalField(max_digits=5, decimal_places=2)
    monto_comision = models.DecimalField(max_digits=10, decimal_places=2)
    factura = models.ForeignKey(
        Factura, on_delete=models.SET_NULL, null=True, blank=True, related_name='comisiones'
    )

    class Meta:
        verbose_name = 'Comisión de venta'
        verbose_name_plural = 'Comisiones de venta'

    def __str__(self):
        return f'Comisión pedido #{self.pedido_id}'
