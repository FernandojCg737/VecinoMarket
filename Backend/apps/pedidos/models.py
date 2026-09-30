from django.db import models

from apps.core.models import BaseModel


class Carrito(BaseModel):
    class Estado(models.TextChoices):
        ABIERTO = 'ABIERTO', 'Abierto'
        CONVERTIDO = 'CONVERTIDO', 'Convertido'
        ABANDONADO = 'ABANDONADO', 'Abandonado'

    comprador = models.ForeignKey('usuarios.Comprador', on_delete=models.CASCADE, related_name='carritos')
    estado = models.CharField(max_length=20, choices=Estado.choices, default=Estado.ABIERTO)

    class Meta:
        verbose_name = 'Carrito'
        verbose_name_plural = 'Carritos'

    def __str__(self):
        return f'Carrito #{self.id} - {self.comprador}'


class CarritoItem(models.Model):
    carrito = models.ForeignKey(Carrito, on_delete=models.CASCADE, related_name='items')
    producto = models.ForeignKey('catalogo.Producto', on_delete=models.CASCADE, related_name='+')
    cantidad = models.PositiveIntegerField()
    precio_unitario = models.DecimalField(max_digits=10, decimal_places=2)

    class Meta:
        verbose_name = 'Ítem de carrito'
        verbose_name_plural = 'Ítems de carrito'
        constraints = [
            models.CheckConstraint(check=models.Q(cantidad__gt=0), name='carrito_item_cantidad_gt_0'),
        ]

    def __str__(self):
        return f'{self.producto.nombre} x{self.cantidad}'


class OrdenCompra(BaseModel):
    """Una orden agrupa el checkout; se divide en un pedido por cada empresa involucrada."""

    class MetodoPago(models.TextChoices):
        TARJETA = 'TARJETA', 'Tarjeta'
        QR = 'QR', 'QR'
        PAYPAL = 'PAYPAL', 'PayPal'

    class EstadoPago(models.TextChoices):
        PENDIENTE = 'PENDIENTE', 'Pendiente'
        PAGADO = 'PAGADO', 'Pagado'
        FALLIDO = 'FALLIDO', 'Fallido'
        REEMBOLSADO = 'REEMBOLSADO', 'Reembolsado'

    comprador = models.ForeignKey('usuarios.Comprador', on_delete=models.CASCADE, related_name='ordenes')
    monto_total = models.DecimalField(max_digits=10, decimal_places=2)
    metodo_pago = models.CharField(max_length=20, choices=MetodoPago.choices)
    estado_pago = models.CharField(max_length=20, choices=EstadoPago.choices, default=EstadoPago.PENDIENTE)

    class Meta:
        verbose_name = 'Orden de compra'
        verbose_name_plural = 'Órdenes de compra'
        constraints = [
            models.CheckConstraint(check=models.Q(monto_total__gte=0), name='orden_monto_total_gte_0'),
        ]

    def __str__(self):
        return f'Orden #{self.id} - {self.comprador}'


class Pago(models.Model):
    class Metodo(models.TextChoices):
        TARJETA = 'TARJETA', 'Tarjeta'
        QR = 'QR', 'QR'
        PAYPAL = 'PAYPAL', 'PayPal'

    class Estado(models.TextChoices):
        PENDIENTE = 'PENDIENTE', 'Pendiente'
        APROBADO = 'APROBADO', 'Aprobado'
        RECHAZADO = 'RECHAZADO', 'Rechazado'

    orden_compra = models.ForeignKey(OrdenCompra, on_delete=models.CASCADE, related_name='pagos')
    monto = models.DecimalField(max_digits=10, decimal_places=2)
    metodo = models.CharField(max_length=20, choices=Metodo.choices)
    referencia_pasarela = models.CharField(max_length=100, blank=True)
    estado = models.CharField(max_length=20, choices=Estado.choices, default=Estado.PENDIENTE)
    fecha_pago = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = 'Pago'
        verbose_name_plural = 'Pagos'
        constraints = [
            models.CheckConstraint(check=models.Q(monto__gte=0), name='pago_monto_gte_0'),
        ]

    def __str__(self):
        return f'Pago #{self.id} - {self.estado}'


class Pedido(BaseModel):
    class Estado(models.TextChoices):
        PENDIENTE = 'PENDIENTE', 'Pendiente'
        CONFIRMADO = 'CONFIRMADO', 'Confirmado'
        EN_PREPARACION = 'EN_PREPARACION', 'En preparación'
        ENVIADO = 'ENVIADO', 'Enviado'
        ENTREGADO = 'ENTREGADO', 'Entregado'
        CANCELADO = 'CANCELADO', 'Cancelado'

    class ModalidadEntrega(models.TextChoices):
        RECOJO_TIENDA = 'RECOJO_TIENDA', 'Recojo en tienda'
        ENVIO_DOMICILIO = 'ENVIO_DOMICILIO', 'Envío a domicilio'

    orden_compra = models.ForeignKey(OrdenCompra, on_delete=models.CASCADE, related_name='pedidos')
    empresa = models.ForeignKey('usuarios.Empresa', on_delete=models.CASCADE, related_name='pedidos')
    numero_pedido = models.CharField(max_length=30, unique=True)
    subtotal = models.DecimalField(max_digits=10, decimal_places=2)
    comision_monto = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    estado = models.CharField(max_length=20, choices=Estado.choices, default=Estado.PENDIENTE)
    modalidad_entrega = models.CharField(max_length=20, choices=ModalidadEntrega.choices)
    sucursal_recojo = models.ForeignKey(
        'inventario.Sucursal', on_delete=models.SET_NULL, null=True, blank=True, related_name='pedidos_recojo'
    )
    direccion_envio = models.ForeignKey(
        'usuarios.Direccion', on_delete=models.SET_NULL, null=True, blank=True, related_name='pedidos_envio'
    )

    class Meta:
        verbose_name = 'Pedido'
        verbose_name_plural = 'Pedidos'
        indexes = [
            models.Index(fields=['empresa']),
            models.Index(fields=['orden_compra']),
        ]
        constraints = [
            models.CheckConstraint(check=models.Q(subtotal__gte=0), name='pedido_subtotal_gte_0'),
            models.CheckConstraint(
                check=(
                    models.Q(modalidad_entrega='RECOJO_TIENDA', sucursal_recojo__isnull=False)
                    | models.Q(modalidad_entrega='ENVIO_DOMICILIO', direccion_envio__isnull=False)
                ),
                name='pedido_modalidad_entrega_consistente',
            ),
        ]

    def __str__(self):
        return self.numero_pedido


class PedidoItem(models.Model):
    pedido = models.ForeignKey(Pedido, on_delete=models.CASCADE, related_name='items')
    producto = models.ForeignKey('catalogo.Producto', on_delete=models.PROTECT, related_name='+')
    cantidad = models.PositiveIntegerField()
    precio_unitario = models.DecimalField(max_digits=10, decimal_places=2)
    subtotal = models.DecimalField(max_digits=10, decimal_places=2)

    class Meta:
        verbose_name = 'Ítem de pedido'
        verbose_name_plural = 'Ítems de pedido'
        constraints = [
            models.CheckConstraint(check=models.Q(cantidad__gt=0), name='pedido_item_cantidad_gt_0'),
        ]

    def __str__(self):
        return f'{self.producto.nombre} x{self.cantidad}'


class Entrega(models.Model):
    class Estado(models.TextChoices):
        PENDIENTE = 'PENDIENTE', 'Pendiente'
        EN_CAMINO = 'EN_CAMINO', 'En camino'
        ENTREGADA = 'ENTREGADA', 'Entregada'
        CANCELADA = 'CANCELADA', 'Cancelada'

    pedido = models.OneToOneField(Pedido, on_delete=models.CASCADE, related_name='entrega')
    estado = models.CharField(max_length=20, choices=Estado.choices, default=Estado.PENDIENTE)
    fecha_estimada = models.DateField(null=True, blank=True)
    fecha_entregada = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = 'Entrega'
        verbose_name_plural = 'Entregas'

    def __str__(self):
        return f'Entrega pedido {self.pedido.numero_pedido} - {self.estado}'
