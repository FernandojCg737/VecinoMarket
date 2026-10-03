from django.urls import path

from .views import BackupView, RestoreView, BackupLogListView, BackupLogDeleteView

urlpatterns = [
    path('backup/', BackupView.as_view(), name='backup'),
    path('backup/historial/', BackupLogListView.as_view(), name='backup-historial'),
    path('backup/historial/<int:pk>/', BackupLogDeleteView.as_view(), name='backup-delete'),
    path('restore/', RestoreView.as_view(), name='restore'),
]
