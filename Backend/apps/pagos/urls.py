from django.urls import path

from .views import ConfirmarTarjetaView, EliminarMiTarjetaView, ListaCrearMisTarjetasView

urlpatterns = [
    path('mis-tarjetas/', ListaCrearMisTarjetasView.as_view(), name='mis-tarjetas'),
    path('mis-tarjetas/confirmar/', ConfirmarTarjetaView.as_view(), name='confirmar-tarjeta'),
    path('mis-tarjetas/<str:payment_token_id>/', EliminarMiTarjetaView.as_view(), name='mi-tarjeta-detalle'),
]
