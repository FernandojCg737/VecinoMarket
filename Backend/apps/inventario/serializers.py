from rest_framework import serializers

from .models import InventarioSucursal, Sucursal


class SucursalAdminSerializer(serializers.ModelSerializer):
    empresa_nombre = serializers.CharField(source='empresa.razon_social', read_only=True)

    class Meta:
        model = Sucursal
        fields = ['id', 'empresa', 'empresa_nombre', 'nombre', 'direccion_texto', 'telefono', 'estado']


class InventarioAdminSerializer(serializers.ModelSerializer):
    producto_nombre = serializers.CharField(source='producto.nombre', read_only=True)
    sucursal_nombre = serializers.CharField(source='sucursal.nombre', read_only=True)
    stock_bajo = serializers.SerializerMethodField()

    class Meta:
        model = InventarioSucursal
        fields = [
            'id', 'producto', 'producto_nombre', 'sucursal', 'sucursal_nombre',
            'cantidad_disponible', 'stock_minimo', 'stock_bajo', 'actualizado_en',
        ]
        # cantidad_disponible no se edita directo por PATCH: se ajusta con
        # fn_ajustar_stock (ver AjustarStockAdminView) para que nunca quede
        # negativo y quede auditado como un único punto de entrada.
        extra_kwargs = {'cantidad_disponible': {'read_only': True}}

    def get_stock_bajo(self, obj):
        return obj.cantidad_disponible <= obj.stock_minimo
