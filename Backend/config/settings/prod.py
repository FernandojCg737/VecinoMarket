import os

from .base import *  # noqa: F401,F403

DEBUG = False
ALLOWED_HOSTS = env.list('ALLOWED_HOSTS', default=[])  # noqa: F405

# Render inyecta el hostname público del servicio (*.onrender.com) en esta
# variable; se agrega solo para no tener que sincronizarlo a mano en cada deploy.
RENDER_EXTERNAL_HOSTNAME = os.environ.get('RENDER_EXTERNAL_HOSTNAME')
if RENDER_EXTERNAL_HOSTNAME:
    ALLOWED_HOSTS.append(RENDER_EXTERNAL_HOSTNAME)

CORS_ALLOW_ALL_ORIGINS = False
CORS_ALLOWED_ORIGINS = env.list('CORS_ALLOWED_ORIGINS', default=[])  # noqa: F405
CSRF_TRUSTED_ORIGINS = env.list('CSRF_TRUSTED_ORIGINS', default=[])  # noqa: F405
if RENDER_EXTERNAL_HOSTNAME:
    CSRF_TRUSTED_ORIGINS.append(f'https://{RENDER_EXTERNAL_HOSTNAME}')

# Render (como Heroku) termina el TLS en su proxy y reenvía por HTTP interno;
# sin esto, SECURE_SSL_REDIRECT provoca un loop infinito de redirecciones.
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')

SECURE_SSL_REDIRECT = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_HSTS_SECONDS = 60 * 60 * 24 * 7
SECURE_HSTS_INCLUDE_SUBDOMAINS = True

# Archivos estáticos (admin de Django, DRF browsable API) servidos directo
# por la app vía whitenoise, sin necesidad de un servidor/CDN aparte.
MIDDLEWARE.insert(1, 'whitenoise.middleware.WhiteNoiseMiddleware')  # noqa: F405
# 'default' (media/imágenes subidas) ya quedó en Cloudinary desde base.py si
# las 3 variables CLOUDINARY_* están configuradas — acá solo se pisa
# 'staticfiles' por whitenoise. Si Cloudinary no está configurado, cae al
# FileSystemStorage por defecto de Django (disco efímero de Render).
STORAGES['staticfiles'] = {'BACKEND': 'whitenoise.storage.CompressedManifestStaticFilesStorage'}  # noqa: F405
