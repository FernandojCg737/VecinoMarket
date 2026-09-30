from django.urls import path

from .views import (
    EliminarMiNotificacionView,
    EnviarNotificacionAdminView,
    ListaMisNotificacionesView,
    ListaNotificacionesAdminView,
    MarcarLeidaView,
    MarcarTodasLeidasView,
)

urlpatterns = [
    # CU23: cualquier usuario autenticado sobre las suyas
    path('mis-notificaciones/', ListaMisNotificacionesView.as_view(), name='mis-notificaciones'),
    path('mis-notificaciones/<int:notificacion_id>/marcar-leida/', MarcarLeidaView.as_view(), name='marcar-leida'),
    path('mis-notificaciones/marcar-todas-leidas/', MarcarTodasLeidasView.as_view(), name='marcar-todas-leidas'),
    path('mis-notificaciones/<int:notificacion_id>/', EliminarMiNotificacionView.as_view(), name='eliminar-mi-notificacion'),

    # CU23: SuperAdmin envía y ve el historial
    path('admin/enviar/', EnviarNotificacionAdminView.as_view(), name='admin-enviar-notificacion'),
    path('admin/notificaciones/', ListaNotificacionesAdminView.as_view(), name='admin-notificaciones'),
]
