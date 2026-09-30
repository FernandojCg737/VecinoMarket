from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import (
    Comprador,
    Direccion,
    Empleado,
    EmpleadoPermiso,
    Empresa,
    Permiso,
    RolBase,
    RolBasePermiso,
    SolicitudEmpresa,
    Usuario,
)


@admin.register(Usuario)
class UsuarioAdmin(UserAdmin):
    model = Usuario
    list_display = ('email', 'nombre', 'rol', 'estado', 'is_active', 'is_staff')
    list_filter = ('rol', 'estado', 'is_active')
    search_fields = ('email', 'nombre')
    ordering = ('email',)

    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        ('Datos personales', {'fields': ('nombre', 'apellido', 'telefono', 'rol', 'estado')}),
        ('Permisos', {'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
    )
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'nombre', 'rol', 'password1', 'password2'),
        }),
    )


@admin.register(SolicitudEmpresa)
class SolicitudEmpresaAdmin(admin.ModelAdmin):
    list_display = ('razon_social', 'nit', 'usuario_solicitante', 'estado', 'creado_en')
    list_filter = ('estado',)
    search_fields = ('razon_social', 'nit')


@admin.register(Empresa)
class EmpresaAdmin(admin.ModelAdmin):
    list_display = ('razon_social', 'nit', 'slug', 'estado', 'plan')
    list_filter = ('estado', 'plan')
    search_fields = ('razon_social', 'slug', 'nit')


@admin.register(Empleado)
class EmpleadoAdmin(admin.ModelAdmin):
    list_display = ('usuario', 'empresa', 'cargo', 'estado')
    list_filter = ('estado', 'empresa')


@admin.register(Comprador)
class CompradorAdmin(admin.ModelAdmin):
    list_display = ('usuario', 'departamento')


@admin.register(Direccion)
class DireccionAdmin(admin.ModelAdmin):
    list_display = ('comprador', 'alias', 'ciudad', 'es_predeterminada')


@admin.register(Permiso)
class PermisoAdmin(admin.ModelAdmin):
    list_display = ('codigo', 'descripcion')


@admin.register(RolBase)
class RolBaseAdmin(admin.ModelAdmin):
    list_display = ('nombre',)


@admin.register(RolBasePermiso)
class RolBasePermisoAdmin(admin.ModelAdmin):
    list_display = ('rol_base', 'permiso')


@admin.register(EmpleadoPermiso)
class EmpleadoPermisoAdmin(admin.ModelAdmin):
    list_display = ('empleado', 'permiso')
