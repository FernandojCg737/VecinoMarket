from django.urls import path

from .views import BackupView, RestoreView, BackupLogListView, BackupLogDeleteView, ConfiguracionSistemaView

urlpatterns = [
    path('backup/', BackupView.as_view(), name='backup'),
    path('backup/historial/', BackupLogListView.as_view(), name='backup-historial'),
    path('backup/historial/<int:pk>/', BackupLogDeleteView.as_view(), name='backup-delete'),
    path('backup/config/', ConfiguracionSistemaView.as_view(), name='backup-config'),
    path('restore/', RestoreView.as_view(), name='restore'),
]

