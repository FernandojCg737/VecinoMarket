from django.urls import path

from .views import (
    ConfirmarPagoCheckoutView,
    DetalleCarritoAdminView,
    EditarEliminarEntregaAdminView,
    EditarEliminarMiEntregaView,
    EditarEliminarMiPedidoView,
    EditarEliminarPedidoAdminView,
    IniciarCheckoutView,
    ListaCarritosAdminView,
    ListaEntregasAdminView,
    ListaMisComprasView,
    ListaMisEntregasView,
    ListaMisPedidosView,
    ListaPedidosAdminView,
    MarcarEntregadaAdminView,
    MarcarMiEntregaEntregadaView,
)

urlpatterns = [
    # CU11: carritos de compra (solo lectura, SuperAdmin/Admin de soporte)
    path('admin/carritos/', ListaCarritosAdminView.as_view(), name='admin-carritos'),
    path('admin/carritos/<int:pk>/', DetalleCarritoAdminView.as_view(), name='admin-carrito-detalle'),

    # CU12: pedidos y ventas (SuperAdmin/Admin de soporte)
    path('admin/pedidos/', ListaPedidosAdminView.as_view(), name='admin-pedidos'),
    path('admin/pedidos/<int:pedido_id>/', EditarEliminarPedidoAdminView.as_view(), name='admin-pedido-detalle'),

    # CU12: autogestión — la empresa (dueño o empleado con permiso) sobre los suyos
    path('mis-pedidos/', ListaMisPedidosView.as_view(), name='mis-pedidos'),
    path('mis-pedidos/<int:pedido_id>/', EditarEliminarMiPedidoView.as_view(), name='mi-pedido-detalle'),

    # CU13: entregas (SuperAdmin/Admin de soporte)
    path('admin/entregas/', ListaEntregasAdminView.as_view(), name='admin-entregas'),
    path('admin/entregas/<int:entrega_id>/', EditarEliminarEntregaAdminView.as_view(), name='admin-entrega-detalle'),
    path('admin/entregas/<int:entrega_id>/marcar-entregada/', MarcarEntregadaAdminView.as_view(), name='admin-entrega-marcar-entregada'),

    # CU13: autogestión — la empresa sobre las entregas de sus propios pedidos
    path('mis-entregas/', ListaMisEntregasView.as_view(), name='mis-entregas'),
    path('mis-entregas/<int:entrega_id>/', EditarEliminarMiEntregaView.as_view(), name='mi-entrega-detalle'),
    path('mis-entregas/<int:entrega_id>/marcar-entregada/', MarcarMiEntregaEntregadaView.as_view(), name='mi-entrega-marcar-entregada'),

    # CU26: el comprador ve sus propios recibos de compra pagada
    path('mis-compras/', ListaMisComprasView.as_view(), name='mis-compras'),

    # Checkout real (comprador): crea la orden real y abre el pago en PayPal
    path('checkout/', IniciarCheckoutView.as_view(), name='iniciar-checkout'),
    path('checkout/<int:orden_compra_id>/confirmar/', ConfirmarPagoCheckoutView.as_view(), name='confirmar-checkout'),
]
