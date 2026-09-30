from rest_framework import serializers

from apps.usuarios.models import Empresa

from .models import Categoria, Producto, ProductoImagen


class CategoriaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Categoria
        fields = ['id', 'nombre', 'descripcion', 'icono', 'categoria_padre']


class CategoriaAdminSerializer(serializers.ModelSerializer):
    """CU06: el personal de la plataforma crea, edita y elimina categorías."""

    productos_count = serializers.SerializerMethodField()

    class Meta:
        model = Categoria
        fields = ['id', 'nombre', 'descripcion', 'icono', 'categoria_padre', 'productos_count', 'creado_en']
        read_only_fields = ['id', 'productos_count', 'creado_en']

    def get_productos_count(self, obj):
        # fn_contar_productos_categoria (catalogo/migrations funciones_y_triggers):
        # cuenta productos activos de la categoría a nivel de base de datos.
        from django.db import connection
        with connection.cursor() as cursor:
            cursor.execute('SELECT fn_contar_productos_categoria(%s)', [obj.id])
            return cursor.fetchone()[0]


class EmpresaResumenSerializer(serializers.ModelSerializer):
    class Meta:
        model = Empresa
        fields = ['id', 'razon_social', 'slug', 'logo_url', 'ciudad', 'departamento']


class ProductoImagenSerializer(serializers.ModelSerializer):
    # url_efectiva: el archivo subido (Cloudinary) si existe, si no la URL
    # externa que se haya pegado a mano.
    url = serializers.SerializerMethodField()

    class Meta:
        model = ProductoImagen
        fields = ['id', 'url', 'orden']

    def get_url(self, obj):
        url = obj.url_efectiva
        request = self.context.get('request')
        # Cloudinary ya devuelve una URL absoluta (https://...); esto solo
        # entra cuando el storage cayó al disco local (dev sin Cloudinary
        # configurado), donde archivo.url es relativa ("/media/...").
        if request and url and url.startswith('/'):
            return request.build_absolute_uri(url)
        return url


class ProductoSerializer(serializers.ModelSerializer):
    empresa = EmpresaResumenSerializer(read_only=True)
    categoria = CategoriaSerializer(read_only=True)
    imagenes = ProductoImagenSerializer(many=True, read_only=True)
    # Anotado en el queryset de la vista (suma de InventarioSucursal por producto).
    stock = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = Producto
        fields = [
            'id', 'nombre', 'descripcion', 'sku', 'precio', 'precio_descuento',
            'estado', 'categoria', 'empresa', 'imagenes', 'stock', 'creado_en',
        ]


class ProductoAdminSerializer(serializers.ModelSerializer):
    """CU07: el personal de la plataforma registra, edita y elimina
    productos de cualquier empresa (ve todo, no solo lo ACTIVO)."""

    empresa_nombre = serializers.CharField(source='empresa.razon_social', read_only=True)
    categoria_nombre = serializers.CharField(source='categoria.nombre', read_only=True, default=None)
    imagenes = ProductoImagenSerializer(many=True, read_only=True)
    stock = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = Producto
        fields = [
            'id', 'nombre', 'descripcion', 'sku', 'precio', 'precio_descuento', 'estado',
            'categoria', 'categoria_nombre', 'empresa', 'empresa_nombre', 'imagenes', 'stock', 'creado_en',
        ]
        read_only_fields = ['id', 'empresa_nombre', 'categoria_nombre', 'imagenes', 'stock', 'creado_en']

    def validate_precio_descuento(self, value):
        precio = self.initial_data.get('precio')
        if value is not None and precio is not None and float(value) >= float(precio):
            raise serializers.ValidationError('El precio de descuento debe ser menor al precio normal.')
        return value


class ProductoEmpresaSerializer(serializers.ModelSerializer):
    """CU07: la empresa (dueño o empleado con permiso 'gestionar_productos')
    registra, edita y ve SUS PROPIOS productos. A diferencia de
    ProductoAdminSerializer, 'empresa' no es un campo del payload — la
    vista siempre la fija a la del usuario autenticado."""

    categoria_nombre = serializers.CharField(source='categoria.nombre', read_only=True, default=None)
    imagenes = ProductoImagenSerializer(many=True, read_only=True)
    stock = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = Producto
        fields = [
            'id', 'nombre', 'descripcion', 'sku', 'precio', 'precio_descuento',
            'estado', 'categoria', 'categoria_nombre', 'imagenes', 'stock', 'creado_en',
        ]
        read_only_fields = ['id', 'categoria_nombre', 'imagenes', 'stock', 'creado_en']

    def validate_precio_descuento(self, value):
        precio = self.initial_data.get('precio')
        if value is not None and precio is not None and float(value) >= float(precio):
            raise serializers.ValidationError('El precio de descuento debe ser menor al precio normal.')
        return value
