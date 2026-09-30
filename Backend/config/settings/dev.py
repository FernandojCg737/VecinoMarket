from .base import *  # noqa: F401,F403

DEBUG = True
ALLOWED_HOSTS = ['*']

INSTALLED_APPS += ['debug_toolbar']  # noqa: F405
MIDDLEWARE.insert(0, 'debug_toolbar.middleware.DebugToolbarMiddleware')  # noqa: F405
INTERNAL_IPS = ['127.0.0.1']

# Nunca en /api/: ahí no hay páginas HTML que depurar, y el toolbar se
# inyecta en cualquier respuesta text/html -- incluidos los reportes que se
# exportan como .html para descargar (ver apps/core/utils.mostrar_debug_toolbar).
DEBUG_TOOLBAR_CONFIG = {'SHOW_TOOLBAR_CALLBACK': 'apps.core.utils.mostrar_debug_toolbar'}
