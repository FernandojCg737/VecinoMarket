from django.contrib import admin
from django.urls import path, include, re_path
from django.conf import settings
from django.conf.urls.static import static
from django.views.static import serve

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/core/', include('apps.core.urls')),
    path('api/usuarios/', include('apps.usuarios.urls')),
    path('api/auditoria/', include('apps.auditoria.urls')),
    path('api/catalogo/', include('apps.catalogo.urls')),
    path('api/suscripciones/', include('apps.suscripciones.urls')),
    path('api/facturacion/', include('apps.facturacion.urls')),
    path('api/inventario/', include('apps.inventario.urls')),
    path('api/pedidos/', include('apps.pedidos.urls')),
    path('api/reportes/', include('apps.reportes.urls')),
    path('api/promociones/', include('apps.promociones.urls')),
    path('api/comunicacion/', include('apps.comunicacion.urls')),
    path('api/notificaciones/', include('apps.notificaciones.urls')),
    path('api/pagos/', include('apps.pagos.urls')),
]

# Servir archivos de media (fotos, comprobantes, QR) tanto en dev como prod si caen a disco local
urlpatterns += [
    re_path(r'^media/(?P<path>.*)$', serve, {'document_root': settings.MEDIA_ROOT}),
]

if settings.DEBUG:
    if 'debug_toolbar' in settings.INSTALLED_APPS:
        import debug_toolbar
        urlpatterns += [path('__debug__/', include(debug_toolbar.urls))]
