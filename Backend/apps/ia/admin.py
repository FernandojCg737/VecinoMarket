from django.contrib import admin

from .models import EventoInteraccion


@admin.register(EventoInteraccion)
class EventoInteraccionAdmin(admin.ModelAdmin):
    list_display = ('fecha', 'tipo', 'comprador', 'producto', 'termino_busqueda', 'resultados', 'departamento')
    list_filter = ('tipo', 'departamento')
    search_fields = ('termino_busqueda', 'producto__nombre', 'comprador__usuario__email')
    raw_id_fields = ('comprador', 'producto')
    date_hierarchy = 'fecha'
