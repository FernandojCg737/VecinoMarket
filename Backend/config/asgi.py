import os

from django.core.asgi import get_asgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.dev')

# get_asgi_application() debe llamarse ANTES de importar cualquier cosa que
# toque modelos de Django (como las rutas de Channels de abajo) — corre
# django.setup() por dentro.
django_asgi_app = get_asgi_application()

from channels.routing import ProtocolTypeRouter, URLRouter  # noqa: E402

import apps.promociones.routing  # noqa: E402

# Autenticación de los WebSocket de señalización (CU17) es manual por JWT
# dentro de LiveSignalingConsumer.connect() — no hace falta AuthMiddlewareStack
# (que es para sesiones/cookies, no para JWT).
application = ProtocolTypeRouter({
    'http': django_asgi_app,
    'websocket': URLRouter(apps.promociones.routing.websocket_urlpatterns),
})
