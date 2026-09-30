from django.urls import path

from .views import (
    DetalleProductoView,
    EditarEliminarCategoriaAdminView,
    EditarEliminarMiProductoView,
    EditarEliminarProductoAdminView,
    ImagenMiProductoView,
    ImagenProductoAdminView,
    ListaCatalogosEmpresasView,
    ListaCategoriasView,
    ListaCrearCategoriaAdminView,
    ListaCrearMisProductosView,
    ListaCrearProductoAdminView,
    ListaProductosView,
    ProductosPorCategoriaAdminView,
    SugerirCategoriaMiProductoView,
    SugerirCategoriaProductoView,
)

urlpatterns = [
    path('categorias/', ListaCategoriasView.as_view(), name='catalogo-categorias'),
    path('productos/', ListaProductosView.as_view(), name='catalogo-productos'),
    path('productos/<int:pk>/', DetalleProductoView.as_view(), name='catalogo-producto-detalle'),

    # CU06: administración de categorías (SuperAdmin/Admin de soporte)
    path('admin/categorias/', ListaCrearCategoriaAdminView.as_view(), name='admin-categorias'),
    path('admin/categorias/<int:categoria_id>/', EditarEliminarCategoriaAdminView.as_view(), name='admin-categoria-detalle'),
    path('admin/categorias/<int:categoria_id>/productos/', ProductosPorCategoriaAdminView.as_view(), name='admin-categoria-productos'),

    # CU07: administración de productos (SuperAdmin/Admin de soporte)
    path('admin/productos/', ListaCrearProductoAdminView.as_view(), name='admin-productos'),
    path('admin/productos/<int:producto_id>/', EditarEliminarProductoAdminView.as_view(), name='admin-producto-detalle'),
    path('admin/productos/<int:producto_id>/imagenes/', ImagenProductoAdminView.as_view(), name='admin-producto-imagenes'),
    path('admin/productos/<int:producto_id>/imagenes/<int:imagen_id>/', ImagenProductoAdminView.as_view(), name='admin-producto-imagen-detalle'),

    # CU05: catálogo por empresa (resumen + reutiliza el CRUD de CU07)
    path('admin/catalogos-empresas/', ListaCatalogosEmpresasView.as_view(), name='admin-catalogos-empresas'),

    # CU07: autogestión — la empresa (dueño o empleado con permiso) sobre SUS propios productos
    path('mis-productos/', ListaCrearMisProductosView.as_view(), name='mis-productos'),
    path('mis-productos/<int:producto_id>/', EditarEliminarMiProductoView.as_view(), name='mi-producto-detalle'),
    path('mis-productos/<int:producto_id>/imagenes/', ImagenMiProductoView.as_view(), name='mi-producto-imagenes'),
    path('mis-productos/<int:producto_id>/imagenes/<int:imagen_id>/', ImagenMiProductoView.as_view(), name='mi-producto-imagen-detalle'),
    path('mis-productos/<int:producto_id>/sugerir-categoria/', SugerirCategoriaMiProductoView.as_view(), name='mi-producto-sugerir-categoria'),

    # CU08: sugerencia de categoría por visión artificial
    path('admin/productos/<int:producto_id>/sugerir-categoria/', SugerirCategoriaProductoView.as_view(), name='admin-producto-sugerir-categoria'),
]
