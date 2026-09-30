from django.urls import path

from .views import (
    CatalogoReportesDinamicosAdminView,
    CatalogoReportesDinamicosView,
    DashboardAdminExportarView,
    DashboardAdminView,
    DashboardEmpresaAdminExportarView,
    DashboardEmpresaAdminView,
    DashboardEmpresaExportarView,
    DashboardEmpresaView,
    EditarEliminarMiValoracionView,
    EliminarValoracionAdminView,
    GenerarMisRecomendacionesView,
    GenerarReporteDinamicoAdminView,
    GenerarReporteDinamicoView,
    ListaCrearMisValoracionesView,
    ListaEmpresasDashboardAdminView,
    ListaMisRecomendacionesView,
    ListaResumenEmpresasValoracionesAdminView,
    ListaValoracionesAdminView,
    ListaValoracionesEmpresaView,
)

urlpatterns = [
    # CU04: el comprador califica sus pedidos entregados
    path('mis-valoraciones/', ListaCrearMisValoracionesView.as_view(), name='mis-valoraciones'),
    path('mis-valoraciones/<int:valoracion_id>/', EditarEliminarMiValoracionView.as_view(), name='mi-valoracion-detalle'),

    # CU04: la empresa ve (solo lectura) las que recibió
    path('mis-valoraciones-recibidas/', ListaValoracionesEmpresaView.as_view(), name='mis-valoraciones-recibidas'),

    # CU04: SuperAdmin/Admin de soporte
    path('admin/resumen-valoraciones-empresas/', ListaResumenEmpresasValoracionesAdminView.as_view(), name='admin-resumen-valoraciones-empresas'),
    path('admin/valoraciones/', ListaValoracionesAdminView.as_view(), name='admin-valoraciones'),
    path('admin/valoraciones/<int:valoracion_id>/', EliminarValoracionAdminView.as_view(), name='admin-valoracion-detalle'),

    # CU21: recomendaciones por IA del comprador autenticado
    path('mis-recomendaciones/', ListaMisRecomendacionesView.as_view(), name='mis-recomendaciones'),
    path('mis-recomendaciones/generar/', GenerarMisRecomendacionesView.as_view(), name='generar-mis-recomendaciones'),

    # CU18/CU19: dashboards
    path('admin/dashboard/', DashboardAdminView.as_view(), name='admin-dashboard'),
    path('admin/dashboard/exportar/', DashboardAdminExportarView.as_view(), name='admin-dashboard-exportar'),
    path('mi-dashboard/', DashboardEmpresaView.as_view(), name='mi-dashboard'),
    path('mi-dashboard/exportar/', DashboardEmpresaExportarView.as_view(), name='mi-dashboard-exportar'),
    path('admin/dashboard-empresas/', ListaEmpresasDashboardAdminView.as_view(), name='admin-dashboard-empresas'),
    path('admin/dashboard-empresas/<int:empresa_id>/', DashboardEmpresaAdminView.as_view(), name='admin-dashboard-empresa-detalle'),
    path('admin/dashboard-empresas/<int:empresa_id>/exportar/', DashboardEmpresaAdminExportarView.as_view(), name='admin-dashboard-empresa-exportar'),

    # Punto 5 (Sprint_2): reportes dinámicos -- el usuario elige dataset,
    # columnas, rango de fechas y filtros en vez de un reporte fijo.
    path('reportes-dinamicos/catalogo/', CatalogoReportesDinamicosView.as_view(), name='reportes-dinamicos-catalogo'),
    path('reportes-dinamicos/generar/', GenerarReporteDinamicoView.as_view(), name='reportes-dinamicos-generar'),
    path('admin/reportes-dinamicos/catalogo/', CatalogoReportesDinamicosAdminView.as_view(), name='admin-reportes-dinamicos-catalogo'),
    path('admin/reportes-dinamicos/generar/', GenerarReporteDinamicoAdminView.as_view(), name='admin-reportes-dinamicos-generar'),
]
