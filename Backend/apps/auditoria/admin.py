from django.contrib import admin

from .models import LogAuditoria


@admin.register(LogAuditoria)
class LogAuditoriaAdmin(admin.ModelAdmin):
    list_display = ('accion', 'usuario', 'entidad_afectada', 'entidad_id', 'ip_origen', 'creado_en')
    list_filter = ('accion', 'entidad_afectada')
    search_fields = ('usuario__email', 'entidad_afectada')
    readonly_fields = [f.name for f in LogAuditoria._meta.fields]

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
