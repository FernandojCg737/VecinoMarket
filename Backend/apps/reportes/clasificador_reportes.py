"""Clasificación local de consultas de reportes con un modelo lineal exportado."""

import json
import re
import unicodedata
from collections import Counter
from functools import lru_cache
from math import exp, hypot, log
from pathlib import Path


ARCHIVO_MODELO = Path(__file__).with_name('modelo_reportes.json')
PALABRAS_DE_PERIODO = frozenset(
    'hoy ayer anteayer semana semanas mes meses ano anos pasado pasada anterior '
    'ultimo ultima ultimos ultimas dias dia enero febrero marzo abril mayo junio julio '
    'agosto septiembre setiembre octubre noviembre diciembre'.split()
)

ACCIONES_DE_CAMBIO = re.compile(
    r'\b(?:modifica|modificar|cambia|cambiar|actualiza|actualizar|elimina|eliminar|'
    r'borra|borrar|anula|anular|cancela|cancelar|registra|registrar|crea|crear|'
    r'agrega|agregar|ajusta|ajustar|devuelve|devolver|reembolsa|reembolsar|'
    r'(?:haz|procesa|tramita) (?:una? )?(?:devolucion|reembolso|reintegro))\b'
)


def normalizar(texto):
    return ''.join(
        c for c in unicodedata.normalize('NFKD', texto.casefold())
        if not unicodedata.combining(c)
    )


def rasgos(texto):
    palabras = [p for p in re.findall(r'[a-z]+', normalizar(texto)) if p not in PALABRAS_DE_PERIODO]
    for palabra in palabras:
        yield f'p:{palabra}'
        delimitada = f'^{palabra}$'
        for n in (3, 4):
            for i in range(len(delimitada) - n + 1):
                yield f'c:{delimitada[i:i+n]}'
    for a, b in zip(palabras, palabras[1:]):
        yield f'b:{a} {b}'


@lru_cache(maxsize=1)
def cargar_modelo():
    with ARCHIVO_MODELO.open(encoding='utf-8') as archivo:
        modelo = json.load(archivo)
    if modelo['version'] != 1:
        raise ValueError('Formato del modelo de reportes incompatible.')
    return modelo


def puntuaciones(texto, modelo):
    pesos = modelo['rasgos']
    vector = [
        ((1 + log(cantidad)) * pesos[rasgo][0], pesos[rasgo][1:])
        for rasgo, cantidad in Counter(rasgos(texto)).items() if rasgo in pesos
    ]
    if not vector:
        return []
    norma = hypot(*(valor for valor, _ in vector))
    logits = list(modelo['interceptos'])
    for valor, coeficientes in vector:
        factor = valor / norma
        for indice, coeficiente in enumerate(coeficientes):
            logits[indice] += factor * coeficiente

    maximo = max(logits)
    probabilidades = [exp(valor - maximo) for valor in logits]
    total = sum(probabilidades)
    return sorted(
        zip(modelo['clases'], (p / total for p in probabilidades)),
        key=lambda par: par[1],
        reverse=True,
    )


def solicita_cambios(texto):
    return bool(ACCIONES_DE_CAMBIO.search(normalizar(texto)))


def clasificar(texto):
    if solicita_cambios(texto):
        return None
    modelo = cargar_modelo()
    opciones = puntuaciones(texto, modelo)
    if not opciones:
        return None
    intencion, probabilidad = opciones[0]
    if (
        intencion == 'fuera_de_alcance'
        or probabilidad < modelo['umbral']
        or probabilidad - opciones[1][1] < modelo['margen']
    ):
        return None
    return intencion
