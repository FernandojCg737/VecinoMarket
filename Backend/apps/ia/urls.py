from django.urls import path

from .views import (
    ProductosSimilaresView,
    RecomendacionesCercanasView,
    RecomendacionesParaTiView,
    RegistrarEventoView,
    TendenciasConsumoView,
)

urlpatterns = [
    # RF44–RF46: historial de navegación (VISTA / BUSQUEDA / CARRITO)
    path('eventos/', RegistrarEventoView.as_view(), name='ia-eventos'),

    # CU1 (RF44): motor de recomendación híbrido
    path('recomendaciones/', RecomendacionesParaTiView.as_view(), name='ia-recomendaciones'),
    # CU2 (RF45): recomendación por ubicación (tiempo real)
    path('recomendaciones/cercanas/', RecomendacionesCercanasView.as_view(), name='ia-recomendaciones-cercanas'),
    path('productos/<int:producto_id>/similares/', ProductosSimilaresView.as_view(), name='ia-producto-similares'),

    # CU3 (RF46): tendencias de consumo (empresa/empleado con ver_reportes; global para ADMIN)
    path('tendencias/', TendenciasConsumoView.as_view(), name='ia-tendencias'),
]
