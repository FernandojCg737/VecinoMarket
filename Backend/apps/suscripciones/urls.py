from django.urls import path

from .views import (
    EditarEliminarPlanAdminView,
    EditarSuscripcionEmpresaView,
    ExpirarSuscripcionesView,
    ListaCrearPlanAdminView,
    ListaPlanesView,
    MejorarPlanCheckoutView,
    MejorarPlanConfirmarView,
    MiSuscripcionView,
)

urlpatterns = [
    path('planes/', ListaPlanesView.as_view(), name='lista_planes'),
    path('empresas/<int:empresa_id>/suscripcion/', EditarSuscripcionEmpresaView.as_view(), name='editar_suscripcion_empresa'),
    path('expirar-vencidas/', ExpirarSuscripcionesView.as_view(), name='expirar_suscripciones_vencidas'),

    # CU01: la propia empresa ve su plan y lo mejora pagando por PayPal
    path('mi-suscripcion/', MiSuscripcionView.as_view(), name='mi_suscripcion'),
    path('mi-suscripcion/mejorar/checkout/', MejorarPlanCheckoutView.as_view(), name='mejorar_plan_checkout'),
    path('mi-suscripcion/mejorar/confirmar/', MejorarPlanConfirmarView.as_view(), name='mejorar_plan_confirmar'),

    # CU20: catálogo completo de planes (crear/editar/eliminar)
    path('admin/planes/', ListaCrearPlanAdminView.as_view(), name='admin-planes'),
    path('admin/planes/<int:plan_id>/', EditarEliminarPlanAdminView.as_view(), name='admin-plan-detalle'),
]
