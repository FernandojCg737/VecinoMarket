from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

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

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    if 'debug_toolbar' in settings.INSTALLED_APPS:
        import debug_toolbar
        urlpatterns += [path('__debug__/', include(debug_toolbar.urls))]
