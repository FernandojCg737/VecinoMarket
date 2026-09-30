from django.db import connection, models
from django.db.models import Sum
from django.db.models.functions import Coalesce
from django.shortcuts import get_object_or_404
from rest_framework import generics, status
from rest_framework.pagination import PageNumberPagination
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from decimal import Decimal

from apps.auditoria.models import LogAuditoria
from apps.core.utils import get_client_ip
from apps.usuarios.models import Empresa
from apps.usuarios.permissions import EsAdmin, TienePermisoEmpleado

from .ia import ServicioIANoDisponible, sugerir_categoria
from .models import Categoria, CategorizacionIALog, Producto, ProductoImagen
from .serializers import (
    CategoriaAdminSerializer,
    CategoriaSerializer,
    ProductoAdminSerializer,
    ProductoEmpresaSerializer,
    ProductoImagenSerializer,
    ProductoSerializer,
)


class CatalogoPagination(PageNumberPagination):
    page_size = 24
    page_size_query_param = 'page_size'
    max_page_size = 100


def _productos_queryset():
    return (
        Producto.objects.filter(activo=True, estado=Producto.Estado.ACTIVO)
        .select_related('categoria', 'empresa')
        .prefetch_related('imagenes')
        .annotate(stock=Coalesce(Sum('inventarios__cantidad_disponible'), 0))
    )


class ListaCategoriasView(generics.ListAPIView):
    """Catálogo público de categorías (no dependen de una empresa en particular)."""

    permission_classes = [AllowAny]
    serializer_class = CategoriaSerializer
    queryset = Categoria.objects.filter(activo=True, categoria_padre__isnull=True).order_by('nombre')


class ListaProductosView(generics.ListAPIView):
    """Catálogo público de productos: soporta ?categoria=<id>, ?empresa=<id> y ?q=<texto>."""

    permission_classes = [AllowAny]
    serializer_class = ProductoSerializer
    pagination_class = CatalogoPagination
    filterset_fields = ['categoria', 'empresa']

    def get_queryset(self):
        qs = _productos_queryset().order_by('-creado_en')
        q = self.request.query_params.get('q')
        if q:
            qs = qs.filter(nombre__icontains=q)
        return qs


class DetalleProductoView(generics.RetrieveAPIView):
    permission_classes = [AllowAny]
    serializer_class = ProductoSerializer
    queryset = _productos_queryset()


def _log(request, accion, entidad_id, detalle=None, entidad_afectada='categoria'):
    LogAuditoria.objects.create(
        usuario=request.user,
        accion=accion,
        entidad_afectada=entidad_afectada,
        entidad_id=entidad_id,
        detalle=detalle or {},
        ip_origen=get_client_ip(request),
    )


class ListaCrearCategoriaAdminView(generics.ListCreateAPIView):
    """CU06: el personal de la plataforma ve y crea categorías (incluye
    inactivas, a diferencia del catálogo público)."""

    permission_classes = [EsAdmin]
    serializer_class = CategoriaAdminSerializer
    pagination_class = None
    queryset = Categoria.objects.all().order_by('nombre')

    def perform_create(self, serializer):
        categoria = serializer.save()
        _log(self.request, 'CREAR_CATEGORIA', categoria.id, {'nombre': categoria.nombre})


class EditarEliminarCategoriaAdminView(APIView):
    """CU06: edita o elimina una categoría. Los productos que la tenían
    quedan sin categoría (on_delete=SET_NULL), no se borran."""

    permission_classes = [EsAdmin]

    def patch(self, request, categoria_id):
        categoria = get_object_or_404(Categoria, id=categoria_id)
        serializer = CategoriaAdminSerializer(categoria, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        _log(request, 'EDITAR_CATEGORIA', categoria.id, {'nombre': categoria.nombre})
        return Response(serializer.data)

    def delete(self, request, categoria_id):
        categoria = get_object_or_404(Categoria, id=categoria_id)
        nombre = categoria.nombre
        categoria.delete()
        _log(request, 'ELIMINAR_CATEGORIA', categoria_id, {'nombre': nombre})
        return Response(status=status.HTTP_204_NO_CONTENT)


class ProductosPorCategoriaAdminView(generics.ListAPIView):
    """CU06: qué productos (de cualquier empresa, cualquier estado) hay
    dentro de una categoría."""

    permission_classes = [EsAdmin]
    serializer_class = ProductoSerializer
    pagination_class = CatalogoPagination

    def get_queryset(self):
        return (
            Producto.objects.filter(categoria_id=self.kwargs['categoria_id'])
            .select_related('categoria', 'empresa')
            .prefetch_related('imagenes')
            .annotate(stock=Coalesce(Sum('inventarios__cantidad_disponible'), 0))
            .order_by('-creado_en')
        )


def _productos_admin_queryset():
    return (
        Producto.objects.select_related('categoria', 'empresa')
        .prefetch_related('imagenes')
        .annotate(stock=Coalesce(Sum('inventarios__cantidad_disponible'), 0))
    )


class ListaCrearProductoAdminView(generics.ListCreateAPIView):
    """CU07: el personal de la plataforma ve TODOS los productos (de
    cualquier empresa, cualquier estado) y puede registrar uno nuevo a
    nombre de cualquier empresa."""

    permission_classes = [EsAdmin]
    serializer_class = ProductoAdminSerializer
    pagination_class = CatalogoPagination

    def get_queryset(self):
        qs = _productos_admin_queryset().order_by('-creado_en')

        empresa_id = self.request.query_params.get('empresa')
        if empresa_id:
            qs = qs.filter(empresa_id=empresa_id)

        categoria_id = self.request.query_params.get('categoria')
        if categoria_id:
            qs = qs.filter(categoria_id=categoria_id)

        estado = self.request.query_params.get('estado')
        if estado:
            qs = qs.filter(estado=estado)

        q = self.request.query_params.get('q')
        if q:
            qs = qs.filter(nombre__icontains=q)

        return qs

    def perform_create(self, serializer):
        producto = serializer.save()
        _log(self.request, 'CREAR_PRODUCTO', producto.id, {'nombre': producto.nombre}, entidad_afectada='producto')


class EditarEliminarProductoAdminView(APIView):
    """CU07: edita o elimina cualquier producto de cualquier empresa."""

    permission_classes = [EsAdmin]

    def patch(self, request, producto_id):
        producto = get_object_or_404(Producto, id=producto_id)
        serializer = ProductoAdminSerializer(producto, data=request.data, partial=True, context={'request': request})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        _log(request, 'EDITAR_PRODUCTO', producto.id, {'nombre': producto.nombre}, entidad_afectada='producto')
        return Response(ProductoAdminSerializer(producto, context={'request': request}).data)

    def delete(self, request, producto_id):
        producto = get_object_or_404(Producto, id=producto_id)
        nombre = producto.nombre
        try:
            producto.delete()
            _log(request, 'ELIMINAR_PRODUCTO', producto_id, {'nombre': nombre}, entidad_afectada='producto')
            return Response(status=status.HTTP_204_NO_CONTENT)
        except models.ProtectedError:
            producto.activo = False
            producto.save(update_fields=['activo'])
            _log(request, 'DESACTIVAR_PRODUCTO_PROTEGIDO', producto_id, {'nombre': nombre}, entidad_afectada='producto')
            return Response({
                'detail': f'El producto "{nombre}" tiene historial de compras asociado y no puede eliminarse físicamente. Fue marcado como inactivo.'
            }, status=status.HTTP_200_OK)


class ImagenProductoAdminView(APIView):
    """CU07: agrega una imagen a un producto — subiendo un archivo
    (multipart, campo "archivo") o pegando una URL externa (campo "url") —
    o la quita (DELETE)."""

    permission_classes = [EsAdmin]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def post(self, request, producto_id):
        producto = get_object_or_404(Producto, id=producto_id)
        archivo = request.FILES.get('archivo')
        url = (request.data.get('url') or '').strip()
        if not archivo and not url:
            return Response({'detail': 'Sube un archivo o indica una URL.'}, status=status.HTTP_400_BAD_REQUEST)

        siguiente_orden = producto.imagenes.count() + 1
        imagen = ProductoImagen.objects.create(
            producto=producto, archivo=archivo, url=url, orden=siguiente_orden
        )
        return Response(ProductoImagenSerializer(imagen, context={'request': request}).data, status=status.HTTP_201_CREATED)

    def delete(self, request, producto_id, imagen_id):
        ProductoImagen.objects.filter(id=imagen_id, producto_id=producto_id).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class ListaCrearMisProductosView(generics.ListCreateAPIView):
    """CU07: la empresa (dueño o empleado con permiso 'gestionar_productos')
    ve y crea SUS PROPIOS productos — a diferencia del admin, no puede
    elegir 'empresa' en el body, siempre es la suya."""

    permission_classes = [TienePermisoEmpleado]
    permiso_requerido = 'gestionar_productos'
    serializer_class = ProductoEmpresaSerializer
    pagination_class = CatalogoPagination

    def get_queryset(self):
        qs = _productos_admin_queryset().filter(empresa=self.request.user.get_empresa()).order_by('-creado_en')

        categoria_id = self.request.query_params.get('categoria')
        if categoria_id:
            qs = qs.filter(categoria_id=categoria_id)

        estado = self.request.query_params.get('estado')
        if estado:
            qs = qs.filter(estado=estado)

        q = self.request.query_params.get('q')
        if q:
            qs = qs.filter(nombre__icontains=q)

        return qs

    def perform_create(self, serializer):
        empleado = getattr(self.request.user, 'empleado', None)
        producto = serializer.save(empresa=self.request.user.get_empresa(), creado_por_empleado=empleado)
        _log(self.request, 'CREAR_PRODUCTO', producto.id, {'nombre': producto.nombre}, entidad_afectada='producto')


class EditarEliminarMiProductoView(APIView):
    """CU07: la empresa edita o elimina uno de SUS PROPIOS productos — el
    filtro por empresa= en el get_object_or_404 es la verificación de
    tenant, para que no pueda tocar productos de otra empresa adivinando
    el id."""

    permission_classes = [TienePermisoEmpleado]
    permiso_requerido = 'gestionar_productos'

    def patch(self, request, producto_id):
        producto = get_object_or_404(Producto, id=producto_id, empresa=request.user.get_empresa())
        serializer = ProductoEmpresaSerializer(producto, data=request.data, partial=True, context={'request': request})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        _log(request, 'EDITAR_PRODUCTO', producto.id, {'nombre': producto.nombre}, entidad_afectada='producto')
        return Response(ProductoEmpresaSerializer(producto, context={'request': request}).data)

    def delete(self, request, producto_id):
        producto = get_object_or_404(Producto, id=producto_id, empresa=request.user.get_empresa())
        nombre = producto.nombre
        try:
            producto.delete()
            _log(request, 'ELIMINAR_PRODUCTO', producto_id, {'nombre': nombre}, entidad_afectada='producto')
            return Response(status=status.HTTP_204_NO_CONTENT)
        except models.ProtectedError:
            producto.activo = False
            producto.save(update_fields=['activo'])
            _log(request, 'DESACTIVAR_PRODUCTO_PROTEGIDO', producto_id, {'nombre': nombre}, entidad_afectada='producto')
            return Response({
                'detail': f'El producto "{nombre}" tiene compras o pedidos históricos y no puede eliminarse físicamente. Fue marcado como inactivo.'
            }, status=status.HTTP_200_OK)


class ImagenMiProductoView(APIView):
    """CU07: la empresa sube (multipart o URL) o quita una imagen de UNO DE
    SUS PROPIOS productos."""

    permission_classes = [TienePermisoEmpleado]
    permiso_requerido = 'gestionar_productos'
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def post(self, request, producto_id):
        producto = get_object_or_404(Producto, id=producto_id, empresa=request.user.get_empresa())
        archivo = request.FILES.get('archivo')
        url = (request.data.get('url') or '').strip()
        if not archivo and not url:
            return Response({'detail': 'Sube un archivo o indica una URL.'}, status=status.HTTP_400_BAD_REQUEST)

        siguiente_orden = producto.imagenes.count() + 1
        imagen = ProductoImagen.objects.create(
            producto=producto, archivo=archivo, url=url, orden=siguiente_orden
        )
        return Response(ProductoImagenSerializer(imagen, context={'request': request}).data, status=status.HTTP_201_CREATED)

    def delete(self, request, producto_id, imagen_id):
        get_object_or_404(Producto, id=producto_id, empresa=request.user.get_empresa())
        ProductoImagen.objects.filter(id=imagen_id, producto_id=producto_id).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class ListaCatalogosEmpresasView(APIView):
    """CU05: el SuperAdmin ve un vistazo del catálogo de cada empresa
    (total de productos, activos, categorías distintas — fn_resumen_
    catalogo_empresa) antes de entrar a ver/editar/eliminar su catálogo
    completo (reutiliza los mismos endpoints de CU07, filtrando por
    ?empresa=<id>)."""

    permission_classes = [EsAdmin]

    def get(self, request):
        empresas = Empresa.objects.all().order_by('razon_social')
        q = request.query_params.get('q', '').strip()
        if q:
            empresas = empresas.filter(razon_social__icontains=q)

        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT empresa_id,
                       COUNT(*),
                       COUNT(*) FILTER (WHERE estado = 'ACTIVO'),
                       COUNT(DISTINCT categoria_id)
                FROM catalogo_producto
                WHERE activo = true
                GROUP BY empresa_id
            """)
            resumen = {
                row[0]: {'total_productos': row[1], 'productos_activos': row[2], 'categorias_distintas': row[3]}
                for row in cursor.fetchall()
            }

        vacio = {'total_productos': 0, 'productos_activos': 0, 'categorias_distintas': 0}
        resultados = [
            {
                'id': e.id,
                'razon_social': e.razon_social,
                'slug': e.slug,
                'logo_url': e.logo_url,
                'ciudad': e.ciudad,
                **resumen.get(e.id, vacio),
            }
            for e in empresas
        ]
        return Response(resultados)


def _sugerir_categoria_response(request, producto):
    imagen = producto.imagenes.first()
    if not imagen or not imagen.url_efectiva:
        return Response({'detail': 'El producto no tiene ninguna imagen para analizar.'}, status=status.HTTP_400_BAD_REQUEST)

    categorias = list(Categoria.objects.filter(activo=True))
    if not categorias:
        return Response({'detail': 'No hay categorías registradas para sugerir.'}, status=status.HTTP_400_BAD_REQUEST)

    imagen_url = imagen.url_efectiva
    if imagen_url.startswith('/'):
        imagen_url = request.build_absolute_uri(imagen_url)

    try:
        resultado = sugerir_categoria(imagen_url, categorias)
    except ServicioIANoDisponible as exc:
        return Response({'detail': str(exc)}, status=status.HTTP_502_BAD_GATEWAY)

    categoria_sugerida = resultado['categoria']
    confianza = Decimal(str(resultado['confianza']))

    CategorizacionIALog.objects.create(
        producto=producto, categoria_sugerida=categoria_sugerida, confianza=confianza
    )
    _log(request, 'SUGERIR_CATEGORIA_IA', producto.id, {
        'categoria_sugerida': categoria_sugerida.nombre if categoria_sugerida else None, 'confianza': str(confianza),
    }, entidad_afectada='producto')

    return Response({
        'categoria_sugerida': (
            {'id': categoria_sugerida.id, 'nombre': categoria_sugerida.nombre} if categoria_sugerida else None
        ),
        'confianza': float(confianza),
        'alternativas': [
            {'nombre': e['nombre'], 'confianza': e['confianza']} for e in resultado['etiquetas']
        ],
    })


class SugerirCategoriaProductoView(APIView):
    """CU08: analiza la primera imagen del producto con un modelo de visión
    artificial (clasificación + mapeo por dominio a las categorías
    existentes, ver apps/catalogo/ia.py) y sugiere a cuál pertenece. No
    cambia el producto — el admin decide si aplicar la sugerencia
    editándolo (CU07)."""

    permission_classes = [EsAdmin]

    def post(self, request, producto_id):
        producto = get_object_or_404(Producto.objects.prefetch_related('imagenes'), id=producto_id)
        return _sugerir_categoria_response(request, producto)


class SugerirCategoriaMiProductoView(APIView):
    """CU08: la empresa pide la sugerencia de categoría para UNO DE SUS
    PROPIOS productos — misma lógica que SugerirCategoriaProductoView,
    acotada a su propio producto (verificación de tenant)."""

    permission_classes = [TienePermisoEmpleado]
    permiso_requerido = 'gestionar_productos'

    def post(self, request, producto_id):
        producto = get_object_or_404(
            Producto.objects.prefetch_related('imagenes'), id=producto_id, empresa=request.user.get_empresa()
        )
        return _sugerir_categoria_response(request, producto)
