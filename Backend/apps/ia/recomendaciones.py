"""CU1 (RF44): lectura de recomendaciones para las vistas (sin numpy/scikit-learn).

- "Para ti": usa lo precalculado por generar_recomendaciones. Si el comprador
  todavía no tiene filas (llegó después de la última corrida) pero ya tiene
  historia, las calcula en línea con la misma fórmula, a partir de los
  vecinos guardados en SimilitudProducto, y las persiste. Sin historia ->
  arranque en frío (más vendidos de 30 días), que NO se persiste para que no
  tape a las personalizadas cuando empiece a navegar.
- "Similares": vecinos precalculados; si el producto es nuevo y aún no los
  tiene, cae a lo más vendido de su categoría.

Todo se vuelve a filtrar al leer (activo, stock > 0, empresa con IA vigente):
el catálogo cambia entre una corrida nocturna y otra.
"""
from collections import defaultdict
from decimal import Decimal

from django.db import transaction
from django.db.models import Max, Sum

from apps.reportes.models import RecomendacionIA

from . import datos
from .models import SimilitudProducto

PERSONALIZADA = 'personalizada'
POPULAR = 'popular'
HIBRIDA = 'hibrida'
CATEGORIA = 'categoria'
POR_COMPRADOR = 20  # mismo valor que recomendador.POR_COMPRADOR


def _productos_en_orden(pares, limite):
    """[(producto, score)] en el orden dado, descartando lo no recomendable."""
    ids = [pid for pid, _ in pares]
    productos = {p.id: p for p in datos.productos_recomendables().filter(id__in=ids)}
    salida = []
    for pid, score in pares:
        if pid in productos:
            salida.append((productos[pid], float(score)))
            if len(salida) >= limite:
                break
    return salida


def calcular_para_comprador(comprador_id, por_comprador=POR_COMPRADOR):
    """Misma fórmula que recomendador.recomendar, en Python puro sobre los
    vecinos guardados: score(i) = Σ_j peso(j)·sim(j, i). Devuelve
    [(producto_id, score 0..1)] (vacío si no hay historia o vecinos).
    por_comprador=None no recorta (lo usa CU2 para puntuar candidatos cercanos)."""
    pesos, comprados = datos.perfil_comprador(comprador_id)
    if not pesos:
        return []
    puntajes = defaultdict(float)
    for origen, destino, score in SimilitudProducto.objects.filter(producto_id__in=list(pesos)).values_list(
        'producto_id', 'similar_id', 'score',
    ):
        puntajes[destino] += pesos[origen] * float(score)
    recomendables = set(
        datos.productos_recomendables().filter(id__in=list(puntajes)).values_list('id', flat=True)
    )
    candidatos = [(pid, s) for pid, s in puntajes.items() if pid in recomendables and pid not in comprados and s > 0]
    if not candidatos:
        return []
    candidatos.sort(key=lambda x: (-x[1], x[0]))
    if por_comprador is not None:
        candidatos = candidatos[:por_comprador]
    maximo = candidatos[0][1]
    return [(pid, round(s / maximo, 4)) for pid, s in candidatos]


@transaction.atomic
def regenerar_para_comprador(comprador_id):
    """Recalcula y persiste las filas de un comprador. Devuelve cuántas quedaron."""
    pares = calcular_para_comprador(comprador_id)
    RecomendacionIA.objects.filter(comprador_id=comprador_id).delete()
    RecomendacionIA.objects.bulk_create([
        RecomendacionIA(comprador_id=comprador_id, producto_id=pid, score=Decimal(str(score))) for pid, score in pares
    ])
    return len(pares)


def para_comprador(comprador, limite=10, regenerar=False):
    """{estrategia, generado_en, resultados: [(producto, score)]}. comprador=None -> invitado."""
    if comprador is None:
        return {'estrategia': POPULAR, 'generado_en': None, 'resultados': _productos_en_orden(datos.mas_vendidos(limite), limite)}

    filas = RecomendacionIA.objects.filter(comprador=comprador)
    if regenerar or not filas.exists():
        regenerar_para_comprador(comprador.id)

    pares = list(filas.order_by('-score', 'producto_id').values_list('producto_id', 'score'))
    resultados = _productos_en_orden(pares, limite)
    estrategia = PERSONALIZADA if resultados else POPULAR
    generado_en = filas.aggregate(m=Max('fecha_generada'))['m'] if resultados else None

    if len(resultados) < limite:
        # Completa con populares, puntuados por debajo de la peor personalizada.
        _, comprados = datos.perfil_comprador(comprador.id)
        ya = {p.id for p, _ in resultados} | comprados
        techo = min((s for _, s in resultados), default=1.0) * (0.5 if resultados else 1.0)
        relleno = [(pid, round(s * techo, 4)) for pid, s in datos.mas_vendidos(limite - len(resultados), excluir=ya)]
        resultados += _productos_en_orden(relleno, limite - len(resultados))
    return {'estrategia': estrategia, 'generado_en': generado_en, 'resultados': resultados}


def similares(producto, limite=8):
    """{estrategia, resultados: [(producto, score)]}."""
    pares = list(
        SimilitudProducto.objects.filter(producto=producto).exclude(similar_id=producto.id)
        .order_by('-score', 'similar_id').values_list('similar_id', 'score')
    )
    resultados = _productos_en_orden(pares, limite)
    estrategia = HIBRIDA
    if len(resultados) < limite and producto.categoria_id:
        # Producto nuevo (sin vecinos todavía): lo más vendido de su categoría.
        ya = {p.id for p, _ in resultados} | {producto.id}
        candidatos = datos.productos_recomendables().filter(categoria_id=producto.categoria_id).exclude(id__in=ya)
        ventas = dict(
            datos.ventas_validas().filter(producto_id__in=candidatos.values('id'))
            .values_list('producto_id').annotate(u=Sum('cantidad'))
        )
        orden = sorted(candidatos.values_list('id', flat=True), key=lambda pid: (-ventas.get(pid, 0), pid))
        maximo = max(ventas.values(), default=0) or 1
        techo = min((s for _, s in resultados), default=1.0) * (0.5 if resultados else 1.0)
        relleno = [(pid, round(techo * ventas.get(pid, 0) / maximo, 4)) for pid in orden]
        if not resultados:
            estrategia = CATEGORIA
        resultados += _productos_en_orden(relleno, limite - len(resultados))
    return {'estrategia': estrategia, 'resultados': resultados}
