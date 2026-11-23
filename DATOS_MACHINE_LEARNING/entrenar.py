"""Entrena TF-IDF y regresión logística y exporta sus parámetros a JSON."""

import csv
import json
import sys
from collections import Counter
from hashlib import sha256
from pathlib import Path

import numpy as np
import sklearn
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, f1_score

from corpus_sintetico import FAMILIAS, ejemplos


CARPETA = Path(__file__).resolve().parent
sys.path.insert(0, str(CARPETA.parent / 'Backend'))
from apps.reportes.clasificador_reportes import ARCHIVO_MODELO, normalizar, puntuaciones, rasgos, solicita_cambios


def aceptar(probabilidades, clases, umbral, margen):
    orden = np.argsort(-probabilidades, axis=1)
    primera = orden[:, 0]
    maxima = probabilidades[np.arange(len(primera)), primera]
    segunda = probabilidades[np.arange(len(primera)), orden[:, 1]]
    elegidas = clases[primera]
    acepta = (elegidas != 'fuera_de_alcance') & (maxima >= umbral) & (maxima - segunda >= margen)
    return np.where(acepta, elegidas, 'fuera_de_alcance')


def calibrar(probabilidades, clases, esperadas):
    candidatos = []
    for umbral in (0.30, 0.35, 0.40, 0.45, 0.50, 0.55, 0.60, 0.65):
        for margen in (0.08, 0.12, 0.16, 0.20):
            elegidas = aceptar(probabilidades, clases, umbral, margen)
            aceptadas = elegidas != 'fuera_de_alcance'
            correctas = int(np.sum(aceptadas & (elegidas == esperadas)))
            incorrectas = int(np.sum(aceptadas & (elegidas != esperadas)))
            candidatos.append((correctas - 3 * incorrectas, umbral, margen))
    _, umbral, margen = max(candidatos)
    return umbral, margen


def ejecutar():
    particiones = {nombre: list(ejemplos(nombre)) for nombre in FAMILIAS}
    textos_normalizados = set()
    familias_vistas = set()
    for nombre, filas in particiones.items():
        familias = {fila['familia'] for fila in filas}
        assert familias_vistas.isdisjoint(familias)
        familias_vistas.update(familias)
        with (CARPETA / f'{nombre}.csv').open('w', newline='', encoding='utf-8') as archivo:
            writer = csv.DictWriter(archivo, fieldnames=['texto', 'intencion', 'familia', 'origen'])
            writer.writeheader()
            for fila in filas:
                texto = normalizar(fila['texto'])
                assert texto not in textos_normalizados, texto
                textos_normalizados.add(texto)
                writer.writerow(fila)

    textos = {k: [r['texto'] for r in v] for k, v in particiones.items()}
    etiquetas = {k: np.array([r['intencion'] for r in v]) for k, v in particiones.items()}
    vectorizador = TfidfVectorizer(analyzer=rasgos, min_df=2, sublinear_tf=True)
    entrenamiento = vectorizador.fit_transform(textos['entrenamiento'])
    clasificador = LogisticRegression(C=12, max_iter=500)
    clasificador.fit(entrenamiento, etiquetas['entrenamiento'])
    clases = clasificador.classes_
    validar = clasificador.predict_proba(vectorizador.transform(textos['validacion']))
    umbral, margen = calibrar(validar, clases, etiquetas['validacion'])
    pesos = clasificador.coef_.T
    modelo = {
        'version': 1,
        'clases': clases.tolist(),
        'umbral': umbral,
        'margen': margen,
        'interceptos': clasificador.intercept_.tolist(),
        'rasgos': {
            rasgo: [float(vectorizador.idf_[i]), *pesos[i].tolist()]
            for rasgo, i in sorted(vectorizador.vocabulary_.items())
        },
    }

    referencia = etiquetas['prueba']
    probabilidades = clasificador.predict_proba(vectorizador.transform(textos['prueba']))
    sin_umbral = clases[np.argmax(probabilidades, axis=1)]
    predichas = aceptar(probabilidades, clases, umbral, margen)
    bloqueadas = np.array([solicita_cambios(t) for t in textos['prueba']])
    predichas = np.where(bloqueadas, 'fuera_de_alcance', predichas)
    aceptadas = predichas != 'fuera_de_alcance'
    desconocidas = referencia == 'fuera_de_alcance'
    for texto, vector in zip(textos['prueba'], probabilidades):
        resultado = dict(puntuaciones(texto, modelo))
        assert resultado and np.allclose([resultado[c] for c in clases], vector)
    assert accuracy_score(referencia, sin_umbral) >= 0.75
    assert np.sum(aceptadas & (predichas == referencia)) >= 0.65 * np.sum(~desconocidas)
    datos_modelo = json.dumps(modelo, ensure_ascii=False, separators=(',', ':')) + '\n'
    ARCHIVO_MODELO.write_text(datos_modelo, encoding='utf-8', newline='\n')
    metricas = {
        'version_entrenamiento_scikit_learn': sklearn.__version__,
        'ejemplos': {k: len(v) for k, v in particiones.items()},
        'clases_entrenamiento': dict(sorted(Counter(etiquetas['entrenamiento']).items())),
        'prueba_sintetica': {
            'exactitud_sin_umbral': float(accuracy_score(referencia, sin_umbral)),
            'f1_macro_sin_umbral': float(f1_score(referencia, sin_umbral, average='macro')),
            'clasificaciones_emitidas': int(np.sum(aceptadas)),
            'clasificaciones_correctas_emitidas': int(np.sum(aceptadas & (predichas == referencia))),
            'consultas_de_reporte': int(np.sum(~desconocidas)),
            'fuera_de_alcance': int(np.sum(desconocidas)),
            'fuera_de_alcance_rechazadas': int(np.sum(desconocidas & ~aceptadas)),
            'por_clase': {
                clase: {
                    'n': int(np.sum(referencia == clase)),
                    'correctas': int(np.sum((referencia == clase) & (predichas == clase))),
                }
                for clase in clases
            },
        },
        'umbral': umbral,
        'margen': margen,
        'sha256_modelo': sha256(datos_modelo.encode()).hexdigest(),
    }
    (CARPETA / 'metricas.json').write_text(
        json.dumps(metricas, indent=2, ensure_ascii=False) + '\n', encoding='utf-8',
    )
    print(json.dumps(metricas, ensure_ascii=True, indent=2))


if __name__ == '__main__':
    ejecutar()
