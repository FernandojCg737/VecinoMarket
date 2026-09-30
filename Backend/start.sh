#!/bin/sh
set -e

python manage.py migrate --noinput
python manage.py collectstatic --noinput

# daphne (no gunicorn) para poder servir tanto las vistas HTTP normales
# como los WebSocket de señalización de live commerce (CU17) en el mismo
# proceso — ver config/asgi.py.
exec daphne -b 0.0.0.0 -p ${PORT:-8000} config.asgi:application
