def get_client_ip(request):
    """Obtiene la IP real del cliente, considerando proxies/load balancers."""
    forwarded = request.META.get('HTTP_X_FORWARDED_FOR')
    if forwarded:
        return forwarded.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR')


def mostrar_debug_toolbar(request):
    """SHOW_TOOLBAR_CALLBACK de django-debug-toolbar: usa su misma regla
    (DEBUG + INTERNAL_IPS) pero nunca en /api/ -- ahí no hay páginas HTML que
    depurar, y el toolbar inyecta su panel en CUALQUIER respuesta con
    Content-Type text/html, sin mirar Content-Disposition. Eso corrompía los
    reportes exportados en HTML (CU18/CU19 y Punto 5): el archivo descargado
    quedaba con el panel del toolbar embebido, y al abrirlo directo (fuera
    del servidor de desarrollo) sus assets no cargaban y se veía roto."""
    from django.conf import settings

    if request.path.startswith('/api/'):
        return False
    return settings.DEBUG and request.META.get('REMOTE_ADDR') in settings.INTERNAL_IPS
