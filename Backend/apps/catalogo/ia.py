"""CU08: comparar la foto con las categorías activas mediante CLIP en Replicate.

Los porcentajes son afinidades relativas entre las opciones enviadas, no una
probabilidad de acierto. La sugerencia nunca modifica el producto por sí sola.
"""

import hashlib
import json
import math
import re
import time
import unicodedata
from urllib.parse import urlsplit

import requests
from django.conf import settings
from django.core.cache import cache

MODELO_CLIP = 'cjwbw/clip-vit-large-patch14'
VERSION_CLIP = '566ab1f111e526640c5154e712d4d54961414278f89d36590f1425badc763ecb'
API_URL = 'https://api.replicate.com/v1/predictions'
ESPERA_MAXIMA = 60
CACHE_SEGUNDOS = 3600

# Este CLIP trabaja con texto en inglés. Los nombres visibles siguen en español;
# los descriptores se seleccionan por nombre, nunca por ID de la base de datos.
DESCRIPTORES = [
    (('ferret', 'herramient'),
     'A photo of hardware tools and supplies, such as a padlock, screwdriver, hammer or drill.'),
    (('panader', 'reposter', 'pastel'),
     'A photo of bakery products, such as bread, pastries, empanadas or cakes.'),
    (('abarrote', 'comestible', 'aliment'),
     'A photo of groceries and packaged food, such as rice, coffee, cooking oil or canned food.'),
    (('tecnolog', 'electr', 'informat'),
     'A photo of consumer electronics and computer accessories, such as headphones, phones, laptops or laptop cases.'),
    (('ropa', 'prenda', 'vestimenta', 'moda', 'accesorio'),
     'A photo of clothes and fashion accessories, such as shirts, sweaters, hats or shoes.'),
    (('juguet', 'juego'),
     'A photo of toys and games, such as puzzles, dolls or toy blocks.'),
    (('mascota', 'animal'),
     'A photo of pet supplies, such as dog beds, cat food, collars or pet toys.'),
    (('belleza', 'cuidado personal', 'cosmet'),
     'A photo of beauty and personal care products, such as soap, shampoo, cosmetics or perfume.'),
    (('decoraci', 'hogar'),
     'A photo of home decor and household items, such as flower pots, candles, vases or lamps.'),
    (('artesan',),
     'A photo of traditional handmade crafts, such as woven textiles and decorative handicrafts.'),
]


class ServicioIANoDisponible(Exception):
    pass


def _descripcion_categoria(categoria):
    nombre = unicodedata.normalize('NFKD', categoria.nombre.casefold())
    nombre = ''.join(c for c in nombre if not unicodedata.combining(c))
    for palabras, descripcion in DESCRIPTORES:
        if any(palabra in nombre for palabra in palabras):
            return descripcion
    # Para categorías nuevas conviene escribir una descripción breve en inglés.
    # Limitar el texto y quitar el separador evita crear candidatos adicionales.
    texto = f'{categoria.nombre}. {getattr(categoria, "descripcion", "") or ""}'
    texto = ' '.join(texto.replace('|', ' ').split())[:200]
    return f'A photo of {texto}'


def _leer_prediccion(respuesta):
    if not respuesta.ok:
        if respuesta.status_code in (401, 403):
            mensaje = 'Replicate no aceptó el token del servidor. Contacta al administrador.'
        elif respuesta.status_code == 402:
            mensaje = 'No hay saldo disponible en Replicate. Contacta al administrador.'
        elif respuesta.status_code == 429:
            mensaje = 'Replicate alcanzó su límite de solicitudes. Espera unos segundos antes de volver a intentar.'
        else:
            mensaje = 'Replicate no pudo analizar la imagen. Intenta más tarde.'
        raise ServicioIANoDisponible(mensaje)
    try:
        prediccion = respuesta.json()
    except ValueError as exc:
        raise ServicioIANoDisponible('Replicate devolvió una respuesta inválida.') from exc
    if not isinstance(prediccion, dict):
        raise ServicioIANoDisponible('Replicate devolvió una respuesta inválida.')
    return prediccion


def _validar_puntuaciones(puntuaciones, cantidad):
    if (
        not isinstance(puntuaciones, list)
        or len(puntuaciones) != cantidad
        or any(type(p) not in (int, float) or not math.isfinite(p) or not 0 <= p <= 1 for p in puntuaciones)
        or sum(puntuaciones) <= 0
    ):
        raise ServicioIANoDisponible('CLIP no devolvió puntuaciones válidas para las categorías.')
    return puntuaciones


def _clasificar_imagen(imagen_url, descripciones):
    token = str(getattr(settings, 'REPLICATE_API_TOKEN', '')).strip()
    if not token:
        raise ServicioIANoDisponible('No hay un token de Replicate configurado en el servidor.')
    headers = {'Authorization': f'Bearer {token}'}
    limite = time.monotonic() + ESPERA_MAXIMA
    prediccion_url = None
    terminada = False
    try:
        # Una sola creación: nunca reintentar automáticamente un POST facturable.
        respuesta = requests.post(
            API_URL,
            headers={**headers, 'Prefer': 'wait=10', 'Cancel-After': f'{ESPERA_MAXIMA}s'},
            json={'version': VERSION_CLIP, 'input': {'image': imagen_url, 'text': '|'.join(descripciones)}},
            timeout=(5, 15),
            allow_redirects=False,
        )
        prediccion = _leer_prediccion(respuesta)
        # Construir la URL nosotros: no enviar el token a una URL de la respuesta.
        identificador = prediccion.get('id')
        if isinstance(identificador, str) and re.fullmatch(r'[a-zA-Z0-9_-]{1,100}', identificador):
            prediccion_url = f'{API_URL}/{identificador}'

        while True:
            estado = prediccion.get('status')
            if estado == 'succeeded':
                terminada = True
                return _validar_puntuaciones(prediccion.get('output'), len(descripciones))
            if estado in ('failed', 'canceled'):
                terminada = True
                raise ServicioIANoDisponible('CLIP no pudo analizar la imagen. Verifica que la foto sea accesible y vuelve a intentar.')
            if estado not in ('starting', 'processing') or not prediccion_url:
                raise ServicioIANoDisponible('Replicate devolvió un estado de análisis inválido.')
            restante = limite - time.monotonic()
            if restante <= 0:
                raise ServicioIANoDisponible('El análisis tardó demasiado. Intenta nuevamente más tarde.')
            time.sleep(min(1, restante))
            restante = limite - time.monotonic()
            if restante <= 0:
                raise ServicioIANoDisponible('El análisis tardó demasiado. Intenta nuevamente más tarde.')
            respuesta = requests.get(
                prediccion_url, headers=headers, timeout=(5, min(15, restante)), allow_redirects=False,
            )
            prediccion = _leer_prediccion(respuesta)
    except requests.RequestException as exc:
        raise ServicioIANoDisponible('No se pudo completar la comunicación con Replicate. Intenta más tarde.') from exc
    finally:
        # Cancel-After también protege la tarea si la conexión se perdió antes de
        # recibir su ID. Si ya lo conocemos, pedir la cancelación de forma explícita.
        if prediccion_url and not terminada:
            try:
                requests.post(f'{prediccion_url}/cancel', headers=headers, timeout=(3, 3), allow_redirects=False)
            except requests.RequestException:
                pass


def sugerir_categoria(imagen_url, categorias):
    """Devolver la categoría de mayor afinidad y las cinco mejores alternativas.

    Se conservan las claves confianza/etiquetas para la API y su bitácora.
    Las alternativas son nombres de categorías reales, ordenadas por afinidad.
    """
    categorias = list(categorias)
    if not categorias:
        raise ServicioIANoDisponible('No hay categorías disponibles para analizar.')
    try:
        url = urlsplit(imagen_url)
        valida = url.scheme in ('http', 'https') and url.hostname and not url.username and not url.password
    except (TypeError, ValueError):
        valida = False
    if not valida:
        raise ServicioIANoDisponible('La imagen debe tener una URL pública HTTP o HTTPS.')

    descripciones = [_descripcion_categoria(c) for c in categorias]
    contenido = json.dumps(
        [VERSION_CLIP, imagen_url, [(str(c.pk), c.nombre, d) for c, d in zip(categorias, descripciones)]],
        ensure_ascii=False,
    )
    clave = 'clip-categoria:' + hashlib.sha256(contenido.encode()).hexdigest()
    puntuaciones = cache.get(clave)
    if puntuaciones is None:
        # Evitar dos cobros simultáneos para la misma imagen en este caché.
        if not cache.add(clave + ':pendiente', True, timeout=ESPERA_MAXIMA + 30):
            raise ServicioIANoDisponible('Esta imagen ya se está analizando. Espera unos segundos y vuelve a consultar.')
        try:
            puntuaciones = _clasificar_imagen(imagen_url, descripciones)
            cache.set(clave, puntuaciones, timeout=CACHE_SEGUNDOS)
        finally:
            cache.delete(clave + ':pendiente')
    puntuaciones = _validar_puntuaciones(puntuaciones, len(categorias))
    orden = sorted(range(len(categorias)), key=lambda i: puntuaciones[i], reverse=True)
    return {
        'categoria': categorias[orden[0]],
        'confianza': round(puntuaciones[orden[0]] * 100, 2),
        'etiquetas': [
            {'nombre': categorias[i].nombre, 'confianza': round(puntuaciones[i] * 100, 2)}
            for i in orden[:5]
        ],
    }
