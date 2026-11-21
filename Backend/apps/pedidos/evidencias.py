import io
import logging
import time
import uuid
from pathlib import Path
from urllib.request import urlopen

import cloudinary.uploader
from cloudinary.utils import private_download_url
from django.conf import settings
from django.core.files.base import ContentFile
from django.core.files.storage import FileSystemStorage
from PIL import Image, ImageOps, UnidentifiedImageError
from rest_framework.exceptions import APIException, ValidationError

logger = logging.getLogger(__name__)
MAX_BYTES = 5 * 1024 * 1024


class EvidenciaNoDisponible(APIException):
    status_code = 503
    default_detail = 'El almacenamiento de evidencias no está disponible. Intenta de nuevo.'


def validar_foto(archivo):
    if archivo.size > MAX_BYTES:
        raise ValidationError('La foto puede pesar hasta 5 MB.')
    try:
        with Image.open(archivo) as imagen:
            if imagen.format not in {'JPEG', 'PNG', 'WEBP'} or imagen.width * imagen.height > 25_000_000:
                raise ValueError
            imagen = ImageOps.exif_transpose(imagen).convert('RGB')
            imagen.thumbnail((2400, 2400))
            datos = io.BytesIO()
            imagen.save(datos, format='JPEG', quality=88, optimize=True)
            if datos.tell() > MAX_BYTES:
                raise ValueError
    except (UnidentifiedImageError, OSError, ValueError, Image.DecompressionBombError) as error:
        raise ValidationError('Selecciona una foto válida en formato JPG, PNG o WebP.') from error
    return ContentFile(datos.getvalue(), name=f'{uuid.uuid4().hex}.jpg')


def _disco():
    ruta = getattr(settings, 'DEVOLUCIONES_EVIDENCIAS_DIR', settings.BASE_DIR / 'evidencias_privadas')
    return FileSystemStorage(location=ruta)


def _cloudinary_habilitado():
    return (
        not getattr(settings, 'DEVOLUCIONES_EVIDENCIAS_LOCALES', settings.DEBUG)
        and all(settings.CLOUDINARY_STORAGE.get(key) for key in ('CLOUD_NAME', 'API_KEY', 'API_SECRET'))
    )


def _credenciales():
    return {key.lower(): settings.CLOUDINARY_STORAGE[key] for key in ('CLOUD_NAME', 'API_KEY', 'API_SECRET')}


def guardar_evidencia(foto):
    try:
        if _cloudinary_habilitado():
            imagen = cloudinary.uploader.upload(
                foto, public_id=f'vecinomarket/devoluciones/{Path(foto.name).stem}',
                resource_type='image', type='authenticated', overwrite=False, **_credenciales(),
            )
            return f"cloud/{imagen['public_id']}.jpg"
        return 'local/' + _disco().save(foto.name, foto)
    except (cloudinary.exceptions.Error, OSError) as error:
        raise EvidenciaNoDisponible() from error


def abrir_evidencia(nombre):
    tipo, referencia = nombre.split('/', 1)
    try:
        if tipo == 'local':
            return _disco().open(referencia, 'rb')
        url = private_download_url(
            referencia.removesuffix('.jpg'), 'jpg', type='authenticated',
            expires_at=int(time.time()) + 60, **_credenciales(),
        )
        with urlopen(url, timeout=12) as respuesta:
            datos = respuesta.read(MAX_BYTES + 1)
        if len(datos) > MAX_BYTES:
            raise EvidenciaNoDisponible()
        return io.BytesIO(datos)
    except (cloudinary.exceptions.Error, OSError) as error:
        raise EvidenciaNoDisponible() from error


def descartar_evidencia(nombre):
    tipo, referencia = nombre.split('/', 1)
    try:
        if tipo == 'local':
            _disco().delete(referencia)
        else:
            cloudinary.uploader.destroy(
                referencia.removesuffix('.jpg'), resource_type='image', type='authenticated', **_credenciales(),
            )
    except (cloudinary.exceptions.Error, OSError):
        logger.exception('No se pudo limpiar un archivo huérfano de devolución.')
