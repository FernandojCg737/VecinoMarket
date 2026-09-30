from django.conf import settings
from rest_framework.permissions import BasePermission


class TieneLlaveDesarrollador(BasePermission):
    """La bitácora es confidencial incluso para el administrador de BD: para
    verla hace falta, además del login normal de SUPERADMIN, una llave de
    desarrollador aparte (cabecera X-Developer-Key) que solo se valida
    desde acá — nunca se expone en un SELECT directo a la base."""

    message = 'Falta la llave de desarrollador para acceder a la bitácora.'

    def has_permission(self, request, view):
        llave = request.headers.get('X-Developer-Key', '')
        return bool(settings.DEVELOPER_KEY) and llave == settings.DEVELOPER_KEY
