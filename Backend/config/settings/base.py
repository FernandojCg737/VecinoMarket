import platform
from datetime import timedelta
from decimal import Decimal
from pathlib import Path

import environ
from corsheaders.defaults import default_headers

BASE_DIR = Path(__file__).resolve().parent.parent.parent

env = environ.Env(
    DEBUG=(bool, False),
)
environ.Env.read_env(BASE_DIR / '.env')

SECRET_KEY = env('SECRET_KEY', default='django-insecure-cambia-esta-clave')
DEBUG = env.bool('DEBUG', default=False)
ALLOWED_HOSTS = env.list('ALLOWED_HOSTS', default=['localhost', '127.0.0.1'])

# GeoDjango (PostGIS) necesita ubicar las DLLs de GDAL/GEOS en Windows;
# en Linux/Mac las encuentra solo en el path de librerías del sistema.
if platform.system() == 'Windows':
    _PG_BIN = env('PG_BIN_PATH', default=r'C:\Program Files\PostgreSQL\16\bin')
    GDAL_LIBRARY_PATH = env('GDAL_LIBRARY_PATH', default=rf'{_PG_BIN}\libgdal-35.dll')
    GEOS_LIBRARY_PATH = env('GEOS_LIBRARY_PATH', default=rf'{_PG_BIN}\libgeos_c.dll')

INSTALLED_APPS = [
    # 'daphne' va primero: es el patrón oficial de Channels para que
    # 'manage.py runserver' sirva WebSockets en desarrollo (además de HTTP
    # normal) sin necesitar un comando separado.
    'daphne',

    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'django.contrib.gis',

    'rest_framework',
    'corsheaders',
    'rest_framework_simplejwt.token_blacklist',
    'channels',

    'apps.core',
    'apps.usuarios',
    'apps.catalogo',
    'apps.inventario',
    'apps.pedidos',
    'apps.comunicacion',
    'apps.promociones',
    'apps.reportes',
    'apps.auditoria',
    'apps.notificaciones',
    'apps.suscripciones',
    'apps.facturacion',
    'apps.pagos',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'apps.core.middleware.TenantContextMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'
ASGI_APPLICATION = 'config.asgi.application'

DATABASES = {
    'default': env.db(
        'DATABASE_URL',
        default='postgres://vecinomarket:password@localhost:5432/vecinomarket',
    )
}
DATABASES['default']['ENGINE'] = 'django.contrib.gis.db.backends.postgis'

AUTH_USER_MODEL = 'usuarios.Usuario'

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

LANGUAGE_CODE = 'es-bo'
TIME_ZONE = 'America/La_Paz'
USE_I18N = True
USE_TZ = True

STATIC_URL = 'static/'
STATICFILES_DIRS = [BASE_DIR / 'static']
STATIC_ROOT = BASE_DIR / 'staticfiles'

MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'
MEDIA_ROOT.mkdir(parents=True, exist_ok=True)

# Imágenes subidas por el admin/las empresas (CU07): Cloudinary, no el disco
# local — en Render el disco es efímero y se pierde en cada redeploy. Si las
# 3 variables no están configuradas, queda el storage local (sirve para
# desarrollar sin cuenta de Cloudinary, pero no persiste en producción).
#
# OJO: 'cloudinary_storage' y 'cloudinary' NO van en INSTALLED_APPS. No
# hace falta (STORAGES solo necesita poder importar la clase por su path,
# no que la app esté registrada), y registrarlas rompe el post-procesado
# de whitenoise en collectstatic (falla con MissingFileError buscando
# admin/img/sorting-icons.svg). Costó una release fallida en Render
# encontrarlo — no las agregues de nuevo a INSTALLED_APPS.
_c_name = str(env('CLOUDINARY_CLOUD_NAME', default='ss5kjxlu')).strip() or 'ss5kjxlu'
_c_key = str(env('CLOUDINARY_API_KEY', default='791469666359297')).strip()
_c_secret = str(env('CLOUDINARY_API_SECRET', default='NXe00YIWDOD7OPkW04zXpy8B1UY')).strip()

# En Cloudinary, el API Key son 15 dígitos numéricos (ej. 791469666359297)
# y el API Secret es una cadena alfanumérica con letras (ej. NXe00YIWDOD7OPkW04zXpy8B1UY).
# Si en Render se invirtieron o se asignó el secret en la variable de API_KEY:
if _c_key and not _c_key.isdigit():
    if _c_secret and _c_secret.isdigit():
        _c_key, _c_secret = _c_secret, _c_key
    else:
        _c_secret = _c_key
        _c_key = '791469666359297'

if not _c_secret or not any(c.isalpha() for c in _c_secret):
    _c_secret = 'NXe00YIWDOD7OPkW04zXpy8B1UY'

CLOUDINARY_STORAGE = {
    'CLOUD_NAME': _c_name,
    'API_KEY': _c_key,
    'API_SECRET': _c_secret,
}
_cloudinary_habilitado = bool(
    CLOUDINARY_STORAGE.get('CLOUD_NAME')
    and CLOUDINARY_STORAGE.get('API_KEY')
    and CLOUDINARY_STORAGE.get('API_SECRET')
)
STORAGES = {
    'default': {
        'BACKEND': 'cloudinary_storage.storage.MediaCloudinaryStorage'
        if _cloudinary_habilitado
        else 'django.core.files.storage.FileSystemStorage'
    },
    'staticfiles': {'BACKEND': 'django.contrib.staticfiles.storage.StaticFilesStorage'},
}

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# ---------------------------------------------------------------------------
# Django Channels (CU17: señalización WebRTC para live commerce)
# ---------------------------------------------------------------------------
ASGI_APPLICATION = 'config.asgi.application'
# InMemoryChannelLayer: alcanza con una sola instancia de proceso (así corre
# hoy el backend en Render free tier). Si en el futuro hay varias réplicas,
# hace falta channels-redis + un Redis compartido entre ellas.
CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels.layers.InMemoryChannelLayer',
    },
}

# ---------------------------------------------------------------------------
# Django REST Framework / JWT
# ---------------------------------------------------------------------------
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
    'DEFAULT_FILTER_BACKENDS': (
        'django_filters.rest_framework.DjangoFilterBackend',
    ),
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle',
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': '120/minute',
        'user': '600/minute',
    },
}

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=30),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'UPDATE_LAST_LOGIN': True,
}

# ---------------------------------------------------------------------------
# CORS (ajustar dominios reales del frontend web/móvil en prod.py)
# ---------------------------------------------------------------------------
CORS_ALLOW_ALL_ORIGINS = env.bool('CORS_ALLOW_ALL_ORIGINS', default=True)
# Para que el frontend pueda leer el nombre real del archivo al exportar
# reportes (CU18/CU19) — por defecto el navegador oculta este header en
# respuestas cross-origin aunque el backend lo mande.
CORS_EXPOSE_HEADERS = ['Content-Disposition']
# X-Developer-Key (CU22, bitácora confidencial) no está en la lista default
# de django-cors-headers — sin esto, el navegador bloquea el header antes
# de que llegue a Django (falla silenciosa, sin status code que capturar).
CORS_ALLOW_HEADERS = list(default_headers) + ['x-developer-key']

# ---------------------------------------------------------------------------
# Email (recuperación de contraseña, CU01, CU/T010). Preferimos la Gmail API
# (HTTPS) sobre SMTP porque el plan gratuito de Render bloquea el puerto
# SMTP saliente — ver apps/core/gmail_email_backend.py y
# scripts/generar_refresh_token_gmail.py para generar GMAIL_API_REFRESH_TOKEN.
# Sin esas 3 variables, cae a SMTP con contraseña de aplicación (sirve para
# correr local); sin nada configurado, cae al backend de consola (imprime el
# correo en la terminal en vez de enviarlo).
# ---------------------------------------------------------------------------
GMAIL_API_CLIENT_ID = env('GMAIL_API_CLIENT_ID', default='')
GMAIL_API_CLIENT_SECRET = env('GMAIL_API_CLIENT_SECRET', default='')
GMAIL_API_REFRESH_TOKEN = env('GMAIL_API_REFRESH_TOKEN', default='')

EMAIL_HOST_USER = env('EMAIL_HOST_USER', default='')
EMAIL_HOST_PASSWORD = env('EMAIL_HOST_PASSWORD', default='')

if GMAIL_API_CLIENT_ID and GMAIL_API_CLIENT_SECRET and GMAIL_API_REFRESH_TOKEN:
    EMAIL_BACKEND = 'apps.core.gmail_email_backend.GmailApiBackend'
elif EMAIL_HOST_USER and EMAIL_HOST_PASSWORD:
    EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
    EMAIL_HOST = env('EMAIL_HOST', default='smtp.gmail.com')
    EMAIL_PORT = env.int('EMAIL_PORT', default=587)
    EMAIL_USE_TLS = env.bool('EMAIL_USE_TLS', default=True)
else:
    EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'

DEFAULT_FROM_EMAIL = env('DEFAULT_FROM_EMAIL', default='VecinoMarket <no-reply@vecinomarket.bo>')

# URL del frontend, para armar los links que van en los correos (reset de
# contraseña, etc). En prod se sobreescribe con la URL real desplegada.
FRONTEND_URL = env('FRONTEND_URL', default='http://localhost:5173')

# ---------------------------------------------------------------------------
# Login con Google (Google Identity Services). El Client ID no es secreto
# (también vive en el frontend), así que solo hace falta esta variable acá
# para verificar la firma del ID token que manda el navegador.
# ---------------------------------------------------------------------------
GOOGLE_CLIENT_ID = env('GOOGLE_CLIENT_ID', default='')

# ---------------------------------------------------------------------------
# CU22: llave de desarrollador para la bitácora — confidencial incluso para
# el administrador de BD (ver apps/auditoria/permissions.py). Sin esta
# variable configurada, la bitácora queda inaccesible para todos.
# ---------------------------------------------------------------------------
DEVELOPER_KEY = env('DEVELOPER_KEY', default='')

# ---------------------------------------------------------------------------
# Replicate CLIP (CU08): compara la imagen con las categorías existentes.
# Requiere un token del servidor y saldo en Replicate; ver apps/catalogo/ia.py.
# ---------------------------------------------------------------------------
REPLICATE_API_TOKEN = env('REPLICATE_API_TOKEN', default='')

# ---------------------------------------------------------------------------
# PayPal (checkout real + tarjetas guardadas del comprador, ver apps/pagos).
# Bolivia no tiene Stripe, pero sí está en la lista de países soportados por
# PayPal (incluso cuentas de negocio) — verificado contra la documentación
# oficial. PAYPAL_MODE=sandbox usa el entorno de pruebas; 'live' cobraría de
# verdad. BOB no es una moneda soportada por PayPal, así que el checkout
# cobra en USD usando el tipo de cambio oficial boliviano fijo.
# ---------------------------------------------------------------------------
PAYPAL_CLIENT_ID = env(
    'PAYPAL_CLIENT_ID',
    default='BAAZ92cTaT22iM2HUWD7AR0Ys2281-jYGnwPWYMiEU2wr02qZtOyTWBLYVcsNsJNhDwHZB9LSJo5McJ3yM',
)
PAYPAL_CLIENT_SECRET = env(
    'PAYPAL_CLIENT_SECRET',
    default='EN9hIe0Yc2nEpEVAusTu9gO6KGwV9_a3AhpaRn9md0kqPm1f5h1_wlci5RW_QqMbT-j1N5cIh0GbtNSu',
)
PAYPAL_MODE = env('PAYPAL_MODE', default='sandbox')
PAYPAL_API_BASE = (
    'https://api-m.sandbox.paypal.com' if PAYPAL_MODE == 'sandbox' else 'https://api-m.paypal.com'
)
TASA_CAMBIO_USD_BOB = Decimal('6.96')
