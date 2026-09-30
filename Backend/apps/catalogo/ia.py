"""CU08: sugerencia de categoría por visión artificial.

Nota de implementación (importante para quien retome esto): originalmente
esto usaba el modelo CLIP en modo "zero-shot-image-classification" (le
mandas la imagen + los nombres de tus categorías, y te dice cuál encaja
mejor, sin mapeos manuales). Al probarlo en vivo, Hugging Face ya no tiene
ningún proveedor gratuito sirviendo esa tarea — devuelve
inferenceProviderMapping vacío para todos los modelos CLIP/SigLIP conocidos.
Sí queda disponible gratis la tarea "image-classification" clásica (ImageNet,
1000 clases fijas en inglés), así que el enfoque es: clasificar la imagen con
ese modelo, y traducir la etiqueta ganadora a una de nuestras categorías con
un diccionario de palabras clave por dominio (ver DOMINIOS abajo). Si algún
día HF vuelve a ofrecer zero-shot gratis, ese enfoque es estrictamente mejor
y este mapeo dejaría de hacer falta.
"""

import re

import requests
from django.conf import settings

MODELO_HF = 'google/vit-base-patch16-224'
API_URL = f'https://router.huggingface.co/hf-inference/models/{MODELO_HF}'

# Palabras clave en inglés (así vienen las 1000 clases de ImageNet) agrupadas
# por dominio, y qué palabras clave en español buscar dentro del nombre de la
# categoría para saber a cuál corresponde ese dominio. No depende de una
# categoría con id/nombre fijo — funciona con cualquier catálogo de
# categorías siempre que su nombre incluya la palabra correspondiente
# ("Ferretería", "Herramientas", etc. matchean el mismo dominio).
DOMINIOS = [
    (
        ['padlock', 'lock', 'screw', 'screwdriver', 'hammer', 'wrench', 'nail', 'drill',
         'nut', 'bolt', 'plier', 'hand saw', 'chain', 'hatchet', 'toolbox', 'ladder'],
        ['ferret', 'herramient'],
    ),
    (
        ['bread', 'loaf', 'pretzel', 'bagel', 'bun', 'cake', 'pastry', 'muffin',
         'baguette', 'croissant', 'pie', 'dough', 'trifle', 'pizza'],
        ['panader', 'reposter', 'pastel'],
    ),
    (
        ['rice', 'grain', 'oil', 'bottle', 'coffee', 'wine', 'can', 'soup',
         'jar', 'beverage', 'drink', 'tea', 'sugar', 'flour', 'grocery', 'pretzel', 'banana'],
        ['abarrote', 'comestible', 'aliment'],
    ),
    (
        ['shirt', 'jersey', 'sweater', 'jean', 'dress', 'shoe', 'sandal', 'sock',
         'hat', 'cap', 'scarf', 'trouser', 'coat', 'jacket', 'suit', 'sneaker', 'boot'],
        ['ropa', 'accesorio', 'prenda', 'vestimenta'],
    ),
    (
        ['toy', 'doll', 'teddy', 'puzzle', 'balloon', 'lego', 'kite', 'yo-yo',
         'toyshop', 'rubik'],
        ['jugueter'],
    ),
    (
        ['dog', 'cat', 'pet', 'collar', 'leash', 'kennel', 'aquarium', 'birdcage',
         'hamster', 'kitten', 'puppy'],
        ['mascota', 'animal'],
    ),
    (
        ['lipstick', 'perfume', 'soap', 'lotion', 'cosmetic', 'shampoo', 'cream',
         'hairbrush', 'comb', 'hair spray', 'sunscreen'],
        ['belleza', 'cuidado personal', 'cosmet'],
    ),
    (
        ['vase', 'lamp', 'pillow', 'curtain', 'rug', 'candle', 'picture frame',
         'wall clock', 'flowerpot', 'chandelier', 'quilt'],
        ['decoraci', 'hogar'],
    ),
    (
        ['pottery', 'basket', 'pot', 'wickerwork', 'handicraft', 'sculpture',
         'earthenware', 'weave'],
        ['artesan'],
    ),
    (
        ['laptop', 'computer', 'cellular telephone', 'phone', 'headphone', 'camera',
         'television', 'keyboard', 'mouse', 'monitor', 'speaker', 'remote control', 'joystick'],
        ['tecnolog', 'electr'],
    ),
]


class ServicioIANoDisponible(Exception):
    pass


def _descargar_bytes(url):
    resp = requests.get(url, timeout=10)
    resp.raise_for_status()
    return resp.content, resp.headers.get('Content-Type', 'image/jpeg').split(';')[0]


def _clasificar_imagen(imagen_url):
    """Etiquetas de ImageNet (inglés) ordenadas de mayor a menor confianza:
    [{'label': 'padlock', 'score': 0.96}, ...]"""
    if not settings.HUGGINGFACE_API_TOKEN:
        raise ServicioIANoDisponible('No hay un token de Hugging Face configurado.')

    try:
        contenido, tipo = _descargar_bytes(imagen_url)
    except requests.RequestException as exc:
        raise ServicioIANoDisponible(f'No se pudo descargar la imagen del producto: {exc}') from exc

    try:
        resp = requests.post(
            API_URL,
            headers={'Authorization': f'Bearer {settings.HUGGINGFACE_API_TOKEN}', 'Content-Type': tipo},
            data=contenido,
            timeout=25,
        )
    except requests.RequestException as exc:
        raise ServicioIANoDisponible(f'No se pudo contactar el servicio de IA: {exc}') from exc

    if resp.status_code == 503:
        raise ServicioIANoDisponible('El modelo de IA se está iniciando, intenta de nuevo en unos segundos.')
    if not resp.ok:
        raise ServicioIANoDisponible(f'El servicio de IA respondió con error {resp.status_code}: {resp.text[:200]}')

    resultados = resp.json()
    if not isinstance(resultados, list):
        raise ServicioIANoDisponible(f'Respuesta inesperada del servicio de IA: {resultados}')

    return sorted(resultados, key=lambda r: r.get('score', 0), reverse=True)


def _dominio_de_etiqueta(label):
    label_norm = label.lower()
    for palabras_en, _ in DOMINIOS:
        if any(p in label_norm for p in palabras_en):
            return _
    return None


def _categoria_por_dominio(categorias, palabras_es):
    for categoria in categorias:
        nombre_norm = categoria.nombre.lower()
        if any(re.search(p, nombre_norm) for p in palabras_es):
            return categoria
    return None


def sugerir_categoria(imagen_url, categorias):
    """`categorias`: queryset/lista de instancias Categoria (activas).
    Devuelve {'categoria': Categoria|None, 'confianza': float 0-100,
    'etiquetas': [{'nombre': label, 'confianza': float}, ...] (top 5, en inglés,
    tal cual las devuelve el modelo — se muestran como referencia aunque no
    hayan mapeado a ninguna categoría)}."""
    etiquetas = _clasificar_imagen(imagen_url)
    if not etiquetas:
        raise ServicioIANoDisponible('El modelo no devolvió resultados.')

    categoria_sugerida = None
    confianza = 0.0
    for etiqueta in etiquetas:
        palabras_es = _dominio_de_etiqueta(etiqueta.get('label', ''))
        if not palabras_es:
            continue
        categoria_sugerida = _categoria_por_dominio(categorias, palabras_es)
        if categoria_sugerida:
            confianza = round(float(etiqueta.get('score', 0)) * 100, 2)
            break

    return {
        'categoria': categoria_sugerida,
        'confianza': confianza,
        'etiquetas': [
            {'nombre': e.get('label', ''), 'confianza': round(float(e.get('score', 0)) * 100, 2)}
            for e in etiquetas[:5]
        ],
    }
