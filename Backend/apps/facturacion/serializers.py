from rest_framework import serializers

from .models import ComisionVenta, Factura, MetodoPago, Referido


class _MetodoPagoBaseSerializer(serializers.ModelSerializer):
    empresa_nombre = serializers.CharField(source='empresa.razon_social', read_only=True)
    imagen_qr_url = serializers.SerializerMethodField()

    class Meta:
        model = MetodoPago
        fields = [
            'id', 'empresa', 'empresa_nombre', 'tipo', 'nombre',
            'banco', 'numero_cuenta', 'titular',
            'imagen_qr', 'imagen_qr_url',
            'proveedor_pasarela', 'referencia_pasarela',
            'predeterminado', 'creado_en',
        ]
        extra_kwargs = {'imagen_qr': {'write_only': True, 'required': False}}

    def get_imagen_qr_url(self, obj):
        url = obj.imagen_qr_url
        request = self.context.get('request')
        if request and url and url.startswith('/'):
            return request.build_absolute_uri(url)
        return url


class MetodoPagoAdminSerializer(_MetodoPagoBaseSerializer):
    """CU25: el SuperAdmin/Admin puede registrar el método a nombre de
    cualquier empresa (el campo 'empresa' es editable)."""


class MetodoPagoEmpresaSerializer(_MetodoPagoBaseSerializer):
    """CU25: la empresa (dueño o empleado con permiso) gestiona los suyos
    — 'empresa' es de solo lectura, la vista la fuerza a la propia."""

    class Meta(_MetodoPagoBaseSerializer.Meta):
        extra_kwargs = {
            **_MetodoPagoBaseSerializer.Meta.extra_kwargs,
            'empresa': {'read_only': True},
        }


class ComisionVentaSerializer(serializers.ModelSerializer):
    numero_pedido = serializers.CharField(source='pedido.numero_pedido', read_only=True)

    class Meta:
        model = ComisionVenta
        fields = ['id', 'pedido', 'numero_pedido', 'monto_venta', 'porcentaje_aplicado', 'monto_comision', 'creado_en']


class FacturaSerializer(serializers.ModelSerializer):
    """CU26: factura de la empresa hacia la plataforma — de suscripción
    (cobro mensual del plan) o de comisión (se genera sola, ver
    fn_generar_factura_comision, cuando un pedido se marca ENTREGADO).
    'empresa' y 'tipo' son de solo lectura: una factura de comisión nace
    ligada a su venta, no se reasigna a mano."""

    empresa_nombre = serializers.CharField(source='empresa.razon_social', read_only=True)
    comisiones = ComisionVentaSerializer(many=True, read_only=True)

    class Meta:
        model = Factura
        fields = [
            'id', 'empresa', 'empresa_nombre', 'suscripcion', 'tipo', 'monto',
            'periodo_desde', 'periodo_hasta', 'estado_pago', 'fecha_pago',
            'comisiones', 'creado_en',
        ]
        extra_kwargs = {'empresa': {'read_only': True}, 'tipo': {'read_only': True}}


class ReferidoSerializer(serializers.ModelSerializer):
    """CU27: una empresa refiere a otra pasándole su slug como "código de
    referido" al registrarse (SolicitudEmpresa.codigo_referido) — se crea
    sola en estado PENDIENTE (fn_crear_referido_por_empresa) cuando el
    SuperAdmin aprueba esa solicitud. El SuperAdmin la confirma con
    fn_confirmar_referido, que además le suma 30 días de suscripción a la
    empresa que refirió."""

    empresa_referente_nombre = serializers.CharField(source='empresa_referente.razon_social', read_only=True)
    empresa_referida_nombre = serializers.CharField(source='empresa_referida.razon_social', read_only=True)

    class Meta:
        model = Referido
        fields = [
            'id', 'empresa_referente', 'empresa_referente_nombre',
            'empresa_referida', 'empresa_referida_nombre',
            'estado', 'beneficio_aplicado', 'creado_en',
        ]
        read_only_fields = fields
