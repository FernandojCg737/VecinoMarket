from rest_framework import serializers

from .models import Carrito, CarritoItem, Entrega, Pedido, PedidoItem


class CarritoItemSerializer(serializers.ModelSerializer):
    producto_nombre = serializers.CharField(source='producto.nombre', read_only=True)
    subtotal = serializers.SerializerMethodField()

    class Meta:
        model = CarritoItem
        fields = ['id', 'producto', 'producto_nombre', 'cantidad', 'precio_unitario', 'subtotal']

    def get_subtotal(self, obj):
        return obj.cantidad * obj.precio_unitario


class CarritoDetalleAdminSerializer(serializers.ModelSerializer):
    """CU11: detalle de un carrito — el SuperAdmin/Admin solo puede VER, no
    hay create/update/delete acá (el único que modifica su carrito es el
    propio comprador, desde su sesión de compra)."""

    comprador_nombre = serializers.CharField(source='comprador.usuario.nombre', read_only=True)
    comprador_email = serializers.CharField(source='comprador.usuario.email', read_only=True)
    items = CarritoItemSerializer(many=True, read_only=True)

    class Meta:
        model = Carrito
        fields = ['id', 'comprador', 'comprador_nombre', 'comprador_email', 'estado', 'items', 'creado_en', 'actualizado_en']


class PedidoItemSerializer(serializers.ModelSerializer):
    producto_nombre = serializers.CharField(source='producto.nombre', read_only=True)

    class Meta:
        model = PedidoItem
        fields = ['id', 'producto', 'producto_nombre', 'cantidad', 'precio_unitario', 'subtotal']


class PedidoSerializer(serializers.ModelSerializer):
    """CU12: un Pedido es "Venta" o "Pedido" según orden_compra.estado_pago
    — no es un campo propio del modelo, así que va aparte como read-only
    (la vista es la que escribe estado/estado_pago, ver views.py). Se
    reutiliza tal cual tanto para el admin (cualquier empresa) como para
    la autogestión de la empresa (queryset ya viene filtrado a la suya)."""

    empresa_nombre = serializers.CharField(source='empresa.razon_social', read_only=True)
    comprador_nombre = serializers.CharField(source='orden_compra.comprador.usuario.nombre', read_only=True)
    comprador_email = serializers.CharField(source='orden_compra.comprador.usuario.email', read_only=True)
    metodo_pago = serializers.CharField(source='orden_compra.metodo_pago', read_only=True)
    estado_pago = serializers.CharField(source='orden_compra.estado_pago', read_only=True)
    fecha = serializers.DateTimeField(source='creado_en', read_only=True)
    items = PedidoItemSerializer(many=True, read_only=True)

    class Meta:
        model = Pedido
        fields = [
            'id', 'numero_pedido', 'empresa', 'empresa_nombre', 'comprador_nombre', 'comprador_email',
            'subtotal', 'comision_monto', 'estado', 'modalidad_entrega',
            'metodo_pago', 'estado_pago', 'fecha', 'items',
        ]


class EntregaSerializer(serializers.ModelSerializer):
    """CU13: el envío de un pedido pagado — a qué dirección (puesta por el
    comprador, geolocalizada) o a qué sucursal de recojo, y en qué estado
    va. 'pedido' es de solo lectura (una Entrega nace ligada 1 a 1 a su
    Pedido, no se reasigna)."""

    numero_pedido = serializers.CharField(source='pedido.numero_pedido', read_only=True)
    empresa_nombre = serializers.CharField(source='pedido.empresa.razon_social', read_only=True)
    comprador_nombre = serializers.CharField(source='pedido.orden_compra.comprador.usuario.nombre', read_only=True)
    modalidad_entrega = serializers.CharField(source='pedido.modalidad_entrega', read_only=True)
    destino = serializers.SerializerMethodField()

    class Meta:
        model = Entrega
        fields = [
            'id', 'pedido', 'numero_pedido', 'empresa_nombre', 'comprador_nombre',
            'modalidad_entrega', 'destino', 'estado', 'fecha_estimada', 'fecha_entregada',
        ]
        extra_kwargs = {'pedido': {'read_only': True}}

    def get_destino(self, obj):
        pedido = obj.pedido
        if pedido.modalidad_entrega == Pedido.ModalidadEntrega.ENVIO_DOMICILIO:
            d = pedido.direccion_envio
            return d.direccion_texto if d else '—'
        return pedido.sucursal_recojo.nombre if pedido.sucursal_recojo else '—'
