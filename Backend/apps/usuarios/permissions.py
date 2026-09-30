from rest_framework.permissions import BasePermission


class EsAdmin(BasePermission):
    """Personal de la plataforma: soporte (ADMIN) o dueño (SUPERADMIN)."""

    message = 'Solo el personal de la plataforma puede realizar esta acción.'

    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and user.es_admin())


class EsSuperAdmin(BasePermission):
    """Solo el dueño de la plataforma (SUPERADMIN) — acciones sensibles:
    cambiar roles, restablecer contraseñas ajenas, catálogo de roles/permisos
    base, planes/suscripciones y la bitácora completa."""

    message = 'Solo el super administrador puede realizar esta acción.'

    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and user.es_superadmin())


class EsEmpresa(BasePermission):
    message = 'Solo el dueño de la empresa puede realizar esta acción.'

    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and user.es_empresa())


class EsEmpresaOEmpleado(BasePermission):
    """Dueño de una empresa o empleado suyo (sin exigir un permiso puntual
    todavía) — para vistas que exponen catálogos/menús que luego cada quien
    filtra según lo que sí tiene permitido, como el catálogo de reportes
    dinámicos."""

    message = 'Solo una empresa o uno de sus empleados puede realizar esta acción.'

    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and (user.es_empresa() or user.es_empleado()))


class EsComprador(BasePermission):
    """CU13: solo el comprador dueño de sus propias direcciones."""

    message = 'Solo un comprador puede realizar esta acción.'

    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and user.es_comprador())


class TienePermisoEmpleado(BasePermission):
    """
    Permite el acceso si el usuario es dueño de la empresa (acceso total al
    tenant) o si es un empleado con el permiso puntual que exige la vista
    (view.permiso_requerido).
    """

    message = 'No tienes el permiso necesario para esta acción.'

    def has_permission(self, request, view):
        user = request.user
        if not (user and user.is_authenticated):
            return False
        if user.es_empresa():
            return True
        codigo = getattr(view, 'permiso_requerido', None)
        if user.es_empleado() and codigo:
            empleado = getattr(user, 'empleado', None)
            return bool(empleado) and empleado.permisos.filter(permiso__codigo=codigo).exists()
        return False
