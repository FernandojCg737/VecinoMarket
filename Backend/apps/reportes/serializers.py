from rest_framework import serializers

from .models import RecomendacionIA, Valoracion


class ValoracionSerializer(serializers.ModelSerializer):
    """CU04: 'pedido' y 'empresa' son de solo lectura — la reseña nace
    ligada al pedido entregado que el comprador está calificando, la vista
    los deriva y los fuerza (ver ListaCrearMisValoracionesView)."""

    comprador_nombre = serializers.CharField(source='comprador.usuario.nombre', read_only=True)
    empresa_nombre = serializers.CharField(source='empresa.razon_social', read_only=True)
    numero_pedido = serializers.CharField(source='pedido.numero_pedido', read_only=True)

    class Meta:
        model = Valoracion
        fields = [
            'id', 'pedido', 'numero_pedido', 'comprador', 'comprador_nombre',
            'empresa', 'empresa_nombre', 'calificacion', 'comentario', 'creado_en',
        ]
        extra_kwargs = {
            'pedido': {'read_only': True},
            'empresa': {'read_only': True},
            'comprador': {'read_only': True},
        }


class RecomendacionIASerializer(serializers.ModelSerializer):
    """CU21: recomendación generada por fn_generar_recomendaciones
    (filtrado colaborativo + respaldo por popularidad, ver esa migración)."""

    producto_nombre = serializers.CharField(source='producto.nombre', read_only=True)
    producto_precio = serializers.DecimalField(source='producto.precio', max_digits=10, decimal_places=2, read_only=True)
    empresa_nombre = serializers.CharField(source='producto.empresa.razon_social', read_only=True)
    imagen_url = serializers.SerializerMethodField()

    class Meta:
        model = RecomendacionIA
        fields = ['id', 'producto', 'producto_nombre', 'producto_precio', 'empresa_nombre', 'imagen_url', 'score', 'fecha_generada']
        read_only_fields = fields

    def get_imagen_url(self, obj):
        imagen = obj.producto.imagenes.first()
        if not imagen or not imagen.url_efectiva:
            return ''
        url = imagen.url_efectiva
        request = self.context.get('request')
        if request and url.startswith('/'):
            return request.build_absolute_uri(url)
        return url
