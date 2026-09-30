FROM python:3.10-slim

# GDAL/GEOS/PROJ: Render no trae estas librerías en su runtime nativo de
# Python, así que el backend se despliega como Docker (más confiable para
# GeoDjango que depender de buildpacks).
RUN apt-get update && apt-get install -y --no-install-recommends \
    binutils \
    libproj-dev \
    gdal-bin \
    libgdal-dev \
    libgeos-dev \
    libpq-dev \
    gcc \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements/ requirements/
RUN pip install --no-cache-dir -r requirements/prod.txt

COPY . .

RUN chmod +x start.sh

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    DJANGO_SETTINGS_MODULE=config.settings.prod

EXPOSE 8000

CMD ["./start.sh"]
