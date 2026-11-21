"""CU1 (RF44): motor de recomendación híbrido, versión batch.

Lo corre `manage.py generar_recomendaciones` (programado de noche, Paso 8).
Importa numpy/scipy/scikit-learn: NO importar este módulo desde las vistas
(el proceso web en Render free tiene 512 MB); las vistas leen lo que este
motor deja en las tablas, ver recomendaciones.py.

1. Matriz R comprador×producto (dispersa): suma de pesos VISTA=1, CARRITO=3,
   COMPRA=5 con decaimiento exp(-días/30).
2. Colaborativo ítem-ítem: coseno entre columnas de R, con "shrinkage"
   n/(n+λ) según cuántos compradores comparten el par (un solo comprador en
   común no debería dar similitud 1.0).
3. Contenido: TF-IDF de nombre + categoría + descripción, coseno.
4. Híbrido = 0.7·colaborativo + 0.3·contenido. Se calcula por bloques de
   filas y de cada fila se guarda solo el top-K (50): nunca existe la matriz
   ítem×ítem completa en memoria.
5. Comprador: score(u, i) = Σ_j R[u, j]·S[j, i], sin lo ya comprado, solo
   productos recomendables, normalizado a 0..1 (el mejor = 1).
"""
import time
from dataclasses import dataclass, field
from decimal import Decimal

import numpy as np
from scipy import sparse
from sklearn.feature_extraction.text import TfidfVectorizer

from django.db import transaction
from django.utils import timezone

from apps.catalogo.models import Producto
from apps.reportes.models import RecomendacionIA
from apps.suscripciones.services import ids_empresas_con_ia

from . import datos
from .models import EventoInteraccion, SimilitudProducto

PESO_COLABORATIVO = 0.7
PESO_CONTENIDO = 0.3
TOP_VECINOS = 50
POR_COMPRADOR = 20
SHRINKAGE = 2.0
TAMANO_BLOQUE = 256          # filas de productos por bloque al calcular S
BLOQUE_COMPRADORES = 2000    # filas de compradores por bloque al calcular R@S

STOP_WORDS_ES = sorted({
    'a', 'al', 'algo', 'con', 'contra', 'cual', 'de', 'del', 'desde', 'donde', 'e', 'el', 'ella', 'en', 'entre',
    'es', 'esta', 'este', 'esto', 'ha', 'hay', 'la', 'las', 'le', 'lo', 'los', 'mas', 'muy', 'ni', 'no', 'o',
    'para', 'pero', 'por', 'que', 'se', 'sin', 'sobre', 'su', 'sus', 'tambien', 'un', 'una', 'unas', 'uno',
    'unos', 'x', 'y', 'ya', 'cada', 'tu', 'tus', 'mi', 'mis', 'nuestro', 'nuestra', 'son', 'ser', 'como',
})


@dataclass
class Modelo:
    """Resultado del entrenamiento (en memoria)."""
    producto_ids: np.ndarray            # índice de columna -> producto_id
    comprador_ids: np.ndarray           # índice de fila -> comprador_id
    R: sparse.csr_matrix                # compradores × productos (pesos decaídos)
    S: sparse.csr_matrix                # productos × productos (top-K, híbrido)
    comprados: dict = field(default_factory=dict)   # comprador_id -> set(producto_id)
    recomendables: set = field(default_factory=set)
    segundos: float = 0.0

    def indice_producto(self):
        return {int(p): i for i, p in enumerate(self.producto_ids)}


# ---------------------------------------------------------------------
def _matriz_interacciones(producto_index, ahora, hasta=None):
    filas, cols, vals = [], [], []
    comprador_index, comprados = {}, {}
    for comprador, producto, tipo, fecha in datos.iterar_interacciones(ahora=ahora, hasta=hasta):
        col = producto_index.get(producto)
        if col is None:
            continue
        fila = comprador_index.setdefault(comprador, len(comprador_index))
        filas.append(fila)
        cols.append(col)
        vals.append(datos.peso_decaido(tipo, fecha, ahora))
        if tipo == EventoInteraccion.Tipo.COMPRA:
            comprados.setdefault(comprador, set()).add(producto)
    R = sparse.csr_matrix(
        (np.asarray(vals, dtype=np.float64), (np.asarray(filas, dtype=np.int64), np.asarray(cols, dtype=np.int64))),
        shape=(len(comprador_index), len(producto_index)),
    )
    R.sum_duplicates()
    comprador_ids = np.empty(len(comprador_index), dtype=np.int64)
    for c, i in comprador_index.items():
        comprador_ids[i] = c
    return R, comprador_ids, comprados


def _textos(productos):
    """Nombre y categoría pesan doble frente a la descripción."""
    textos = []
    for p in productos:
        categoria = p.categoria.nombre if p.categoria_id else ''
        textos.append(f'{p.nombre} {p.nombre} {categoria} {categoria} {p.descripcion or ""}')
    return textos


def _matriz_contenido(productos):
    if not productos:
        return sparse.csr_matrix((0, 0))
    vectorizador = TfidfVectorizer(
        strip_accents='unicode', lowercase=True, stop_words=STOP_WORDS_ES,
        token_pattern=r'(?u)\b[^\W\d_]{3,}\b', sublinear_tf=True, norm='l2',
    )
    try:
        return vectorizador.fit_transform(_textos(productos)).tocsr()
    except ValueError:  # vocabulario vacío (nombres sin palabras útiles)
        return sparse.csr_matrix((len(productos), 1))


def _normalizar_columnas(R):
    normas = np.sqrt(np.asarray(R.multiply(R).sum(axis=0)).ravel())
    inversa = np.divide(1.0, normas, out=np.zeros_like(normas), where=normas > 0)
    return (R @ sparse.diags(inversa)).tocsr()


def _top_k_por_fila(bloque, offset, k, columnas_validas):
    """De cada fila del bloque (dispersa) devuelve las k columnas de mayor
    valor, sin la diagonal y solo entre columnas_validas (máscara bool)."""
    resultado = []
    bloque = bloque.tocsr()
    for fila in range(bloque.shape[0]):
        ini, fin = bloque.indptr[fila], bloque.indptr[fila + 1]
        cols, vals = bloque.indices[ini:fin], bloque.data[ini:fin]
        mascara = columnas_validas[cols] & (cols != offset + fila) & (vals > 0)
        cols, vals = cols[mascara], vals[mascara]
        if len(cols) > k:
            mejores = np.argpartition(-vals, k)[:k]
            cols, vals = cols[mejores], vals[mejores]
        resultado.append((cols, vals))
    return resultado


def _similitudes(R, X, columnas_validas, k, peso_colaborativo=PESO_COLABORATIVO, peso_contenido=PESO_CONTENIDO):
    """S (productos × productos) con solo top-k por fila, calculado por bloques."""
    n = R.shape[1]
    Rn = _normalizar_columnas(R)
    RnT = Rn.T.tocsr()
    B = (R > 0).astype(np.float64).tocsr()
    BT = B.T.tocsr()
    XT = X.T.tocsr()
    filas, cols, vals = [], [], []
    for ini in range(0, n, TAMANO_BLOQUE):
        fin = min(ini + TAMANO_BLOQUE, n)
        colaborativo = (RnT[ini:fin] @ Rn).tocsr()
        if colaborativo.nnz:
            # shrinkage: n/(n+λ), con n = compradores en común del par.
            comun = (BT[ini:fin] @ B).tocsr()
            comun.data = comun.data / (comun.data + SHRINKAGE)
            colaborativo = colaborativo.multiply(comun).tocsr()
        contenido = (X[ini:fin] @ XT).tocsr() if X.shape[1] else sparse.csr_matrix((fin - ini, n))
        hibrido = peso_colaborativo * colaborativo + peso_contenido * contenido
        for desplazamiento, (c, v) in enumerate(_top_k_por_fila(hibrido, ini, k, columnas_validas)):
            filas.extend([ini + desplazamiento] * len(c))
            cols.extend(c.tolist())
            vals.extend(np.clip(v, 0.0, 1.0).tolist())
    return sparse.csr_matrix((vals, (filas, cols)), shape=(n, n))


def entrenar(ahora=None, hasta=None, top_vecinos=TOP_VECINOS, peso_colaborativo=PESO_COLABORATIVO, peso_contenido=PESO_CONTENIDO):
    """Entrena con la historia (opcionalmente cortada en `hasta`). No escribe en la BD.
    Los pesos solo se cambian para la evaluación offline (comparar variantes)."""
    inicio = time.monotonic()
    ahora = ahora or timezone.now()
    productos = list(
        Producto.objects.filter(activo=True).exclude(estado=Producto.Estado.INACTIVO)
        .select_related('categoria').order_by('id')
    )
    producto_index = {p.id: i for i, p in enumerate(productos)}
    producto_ids = np.asarray([p.id for p in productos], dtype=np.int64)

    recomendables = set(datos.productos_recomendables().values_list('id', flat=True))
    # Destino de un vecino: cualquier producto de una empresa con IA (el stock
    # se vuelve a mirar al leer); origen: todo el catálogo activo.
    con_ia = set(Producto.objects.filter(empresa_id__in=ids_empresas_con_ia()).values_list('id', flat=True))
    columnas_validas = np.asarray([p.id in con_ia for p in productos], dtype=bool)

    R, comprador_ids, comprados = _matriz_interacciones(producto_index, ahora, hasta)
    X = _matriz_contenido(productos)
    S = (
        _similitudes(R, X, columnas_validas, top_vecinos, peso_colaborativo, peso_contenido)
        if productos else sparse.csr_matrix((0, 0))
    )
    return Modelo(
        producto_ids=producto_ids, comprador_ids=comprador_ids, R=R, S=S,
        comprados=comprados, recomendables=recomendables, segundos=time.monotonic() - inicio,
    )


def recomendar(modelo, por_comprador=POR_COMPRADOR, excluir_comprados=True):
    """{comprador_id: [(producto_id, score 0..1)]} para quienes tienen historia."""
    if modelo.R.shape[0] == 0 or modelo.S.nnz == 0:
        return {}
    validos = np.asarray([int(p) in modelo.recomendables for p in modelo.producto_ids], dtype=bool)
    resultado = {}
    # Por bloques de compradores: R@S completo crece con la base de usuarios.
    for inicio in range(0, modelo.R.shape[0], BLOQUE_COMPRADORES):
        bloque = (modelo.R[inicio:inicio + BLOQUE_COMPRADORES] @ modelo.S).tocsr()
        _top_por_comprador(modelo, bloque, inicio, validos, por_comprador, excluir_comprados, resultado)
    return resultado


def _top_por_comprador(modelo, puntajes, inicio, validos, por_comprador, excluir_comprados, resultado):
    for fila in range(puntajes.shape[0]):
        comprador = int(modelo.comprador_ids[inicio + fila])
        ini, fin = puntajes.indptr[fila], puntajes.indptr[fila + 1]
        cols, vals = puntajes.indices[ini:fin], puntajes.data[ini:fin]
        mascara = validos[cols] & (vals > 0)
        if excluir_comprados and comprador in modelo.comprados:
            ya = modelo.comprados[comprador]
            mascara &= np.asarray([int(modelo.producto_ids[c]) not in ya for c in cols], dtype=bool)
        cols, vals = cols[mascara], vals[mascara]
        if not len(cols):
            continue
        orden = np.lexsort((modelo.producto_ids[cols], -vals))[:por_comprador]
        maximo = vals[orden[0]]
        resultado[comprador] = [(int(modelo.producto_ids[cols[i]]), round(float(vals[i] / maximo), 4)) for i in orden]
    return resultado


def _decimal(valor):
    return Decimal(str(round(min(max(valor, 0.0), 1.0), 4)))


def ejecutar(top_vecinos=TOP_VECINOS, por_comprador=POR_COMPRADOR):
    """Corrida completa (entrenar + recomendar + guardar). La usan el comando
    generar_recomendaciones y la tarea nocturna (POST /api/ia/tareas/...).
    Devuelve un resumen con lo generado y el pico de memoria del cálculo."""
    import tracemalloc

    tracemalloc.start()  # numpy/scipy reportan sus buffers a tracemalloc
    try:
        modelo = entrenar(top_vecinos=top_vecinos)
        recos = recomendar(modelo, por_comprador=por_comprador)
        vecinos = guardar(modelo, recos)
        _, pico = tracemalloc.get_traced_memory()
    finally:
        tracemalloc.stop()
    n_compradores, n_productos = modelo.R.shape
    return {
        'compradores': n_compradores,
        'productos': n_productos,
        'interacciones': int(modelo.R.nnz),
        'vecinos': int(vecinos),
        'top_vecinos': top_vecinos,
        'recomendaciones': sum(len(v) for v in recos.values()),
        'compradores_con_recomendaciones': len(recos),
        'segundos': round(modelo.segundos, 2),
        'pico_memoria_mb': round(pico / 1024 / 1024, 1),
    }


@transaction.atomic
def guardar(modelo, recomendaciones):
    """Reemplaza las tablas precalculadas (SimilitudProducto y
    reportes_recomendacionia) dentro de una transacción: quien lee durante
    la escritura ve la versión anterior completa, nunca una a medias."""
    S = modelo.S.tocoo()
    SimilitudProducto.objects.all().delete()
    SimilitudProducto.objects.bulk_create(
        [
            SimilitudProducto(producto_id=int(modelo.producto_ids[i]), similar_id=int(modelo.producto_ids[j]), score=_decimal(v))
            for i, j, v in zip(S.row, S.col, S.data)
            if v >= 0.0001
        ],
        batch_size=2000,
    )
    RecomendacionIA.objects.all().delete()
    RecomendacionIA.objects.bulk_create(
        [
            RecomendacionIA(comprador_id=comprador, producto_id=producto, score=_decimal(score))
            for comprador, lista in recomendaciones.items()
            for producto, score in lista
        ],
        batch_size=2000,
    )
    return S.nnz
