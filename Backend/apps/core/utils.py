import ipaddress


def get_client_ip(request):
    """Obtiene la IP real del cliente, considerando proxies/load balancers."""
    raw = request.META.get('HTTP_X_FORWARDED_FOR')
    if raw:
        ip_str = raw.split(',')[0].strip()
    else:
        ip_str = (request.META.get('REMOTE_ADDR') or '').strip()

    if not ip_str:
        return None

    # Remover puerto si viene incluido (ej. 192.168.1.1:5432 o [::1]:8000)
    if ip_str.startswith('[') and ']' in ip_str:
        ip_str = ip_str[1:].split(']')[0]
    elif ':' in ip_str and ip_str.count(':') == 1:
        ip_str = ip_str.split(':')[0]

    try:
        ipaddress.ip_address(ip_str)
        return ip_str
    except ValueError:
        return None


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
