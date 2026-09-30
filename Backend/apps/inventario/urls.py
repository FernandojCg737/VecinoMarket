from django.urls import path

from .views import (
    AjustarMiStockEmpresaView,
    AjustarStockAdminView,
    EditarInventarioAdminView,
    EditarMiInventarioEmpresaView,
    ListaInventarioAdminView,
    ListaMiInventarioEmpresaView,
    ListaMisSucursalesEmpresaView,
    ListaSucursalesAdminView,
    ListaSucursalesPublicoView,
)

urlpatterns = [
    # Checkout (comprador): sucursales de una empresa para recojo en tienda
    path('sucursales/', ListaSucursalesPublicoView.as_view(), name='sucursales-publico'),

    # CU10: gestión de inventario y stock (SuperAdmin/Admin de soporte)
    path('admin/sucursales/', ListaSucursalesAdminView.as_view(), name='admin-sucursales'),
    path('admin/inventario/', ListaInventarioAdminView.as_view(), name='admin-inventario'),
    path('admin/inventario/<int:inventario_id>/', EditarInventarioAdminView.as_view(), name='admin-inventario-detalle'),
    path('admin/inventario/<int:inventario_id>/ajustar-stock/', AjustarStockAdminView.as_view(), name='admin-inventario-ajustar-stock'),

    # CU10: gestión de inventario para Empresas (dueño o empleado con permiso 'gestionar_inventario')
    path('empresa/sucursales/', ListaMisSucursalesEmpresaView.as_view(), name='empresa-sucursales'),
    path('empresa/inventario/', ListaMiInventarioEmpresaView.as_view(), name='empresa-inventario'),
    path('empresa/inventario/<int:inventario_id>/', EditarMiInventarioEmpresaView.as_view(), name='empresa-inventario-detalle'),
    path('empresa/inventario/<int:inventario_id>/ajustar-stock/', AjustarMiStockEmpresaView.as_view(), name='empresa-inventario-ajustar-stock'),
]
