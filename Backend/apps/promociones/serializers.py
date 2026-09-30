from rest_framework import serializers

from apps.catalogo.models import Producto

from .models import ComentarioLive, LiveCommerceSesion, Promocion


class _PromocionBaseSerializer(serializers.ModelSerializer):
    empresa_nombre = serializers.CharField(source='empresa.razon_social', read_only=True)
    productos = serializers.PrimaryKeyRelatedField(queryset=Producto.objects.all(), many=True, required=False)
    productos_nombres = serializers.SerializerMethodField()

    class Meta:
        model = Promocion
        fields = [
            'id', 'empresa', 'empresa_nombre', 'nombre', 'tipo', 'valor',
            'fecha_inicio', 'fecha_fin', 'estado', 'productos', 'productos_nombres',
        ]

    def get_productos_nombres(self, obj):
        return [p.nombre for p in obj.productos.all()]


class PromocionAdminSerializer(_PromocionBaseSerializer):
    """CU16: el SuperAdmin/Admin ve, edita o elimina la promoción de
    cualquier empresa (no crea — las promociones nacen del lado de la
    empresa)."""

    class Meta(_PromocionBaseSerializer.Meta):
        extra_kwargs = {'empresa': {'read_only': True}}


class PromocionEmpresaSerializer(_PromocionBaseSerializer):
    """CU16: la empresa (dueño o empleado con permiso 'gestionar_promociones')
    crea y gestiona sus propias promociones — 'empresa' es de solo lectura,
    la vista la fuerza a la propia. Los productos deben ser suyos."""

    class Meta(_PromocionBaseSerializer.Meta):
        extra_kwargs = {'empresa': {'read_only': True}}

    def validate_productos(self, productos):
        empresa = self.context['empresa']
        ajenos = [p for p in productos if p.empresa_id != empresa.id]
        if ajenos:
            raise serializers.ValidationError('Todos los productos deben ser de tu empresa.')
        return productos


class _LiveSerializerBase(serializers.ModelSerializer):
    empresa_nombre = serializers.CharField(source='empresa.razon_social', read_only=True)
    empresa_logo_url = serializers.CharField(source='empresa.logo_url', read_only=True)
    productos = serializers.PrimaryKeyRelatedField(queryset=Producto.objects.all(), many=True, required=False)
    productos_detalle = serializers.SerializerMethodField()
    pausado = serializers.SerializerMethodField()

    class Meta:
        model = LiveCommerceSesion
        fields = [
            'id', 'empresa', 'empresa_nombre', 'empresa_logo_url', 'titulo', 'url_stream',
            'estado', 'pausado', 'fecha_inicio', 'fecha_fin', 'productos', 'productos_detalle',
        ]

    def get_pausado(self, obj):
        return obj.pausado_desde is not None

    def get_productos_detalle(self, obj):
        return [{'id': p.id, 'nombre': p.nombre, 'precio': p.precio} for p in obj.productos.all()]


class LivePublicoSerializer(_LiveSerializerBase):
    """CU17: lo que ve cualquier visitante desde el botón "LIVE"."""

    class Meta(_LiveSerializerBase.Meta):
        pass


class LiveAdminSerializer(_LiveSerializerBase):
    """CU17: el SuperAdmin/Admin ve cualquier sesión — no crea (las
    sesiones nacen del lado de la empresa), pero puede darla de baja."""

    grabacion_url = serializers.CharField(read_only=True)

    class Meta(_LiveSerializerBase.Meta):
        fields = _LiveSerializerBase.Meta.fields + ['grabacion_url']
        extra_kwargs = {'empresa': {'read_only': True}}


class LiveEmpresaSerializer(_LiveSerializerBase):
    """CU17: la empresa (dueño o empleado con permiso 'gestionar_promociones')
    crea y gestiona sus propias sesiones — 'empresa' es de solo lectura, la
    vista la fuerza a la propia. 'grabacion_url' solo la ve la propia
    empresa, no aparece en LivePublicoSerializer."""

    grabacion_url = serializers.CharField(read_only=True)

    class Meta(_LiveSerializerBase.Meta):
        fields = _LiveSerializerBase.Meta.fields + ['grabacion_url']
        extra_kwargs = {'empresa': {'read_only': True}}

    def validate_productos(self, productos):
        empresa = self.context['empresa']
        ajenos = [p for p in productos if p.empresa_id != empresa.id]
        if ajenos:
            raise serializers.ValidationError('Todos los productos deben ser de tu empresa.')
        return productos


class ComentarioLiveSerializer(serializers.ModelSerializer):
    usuario_nombre = serializers.CharField(source='usuario.nombre', read_only=True)
    usuario_rol = serializers.CharField(source='usuario.rol', read_only=True)

    class Meta:
        model = ComentarioLive
        fields = ['id', 'sesion', 'usuario_nombre', 'usuario_rol', 'texto', 'creado_en']
        read_only_fields = ['id', 'sesion', 'usuario_nombre', 'usuario_rol', 'creado_en']
