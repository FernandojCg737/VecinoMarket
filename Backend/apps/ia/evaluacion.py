"""CU1: evaluación offline del recomendador (precision@K), con corte temporal.

- Se ordenan todas las compras válidas por fecha y el último `pct_prueba` %
  queda como PRUEBA; el modelo se entrena SOLO con lo anterior al corte
  (eventos y compras), con el decaimiento medido desde el corte: no ve el
  futuro.
- Para cada comprador con compras de prueba, lo relevante es lo que compró
  después del corte y no había comprado antes.
- precision@K = aciertos en el top-K / K; recall@K = aciertos / relevantes;
  hit@K = 1 si hubo al menos un acierto. Se promedian por comprador.
- Se compara el híbrido (0.7/0.3) con solo colaborativo, solo contenido y
  "más vendidos" (los 30 días previos al corte). Como en producción, quien no
  tiene historia antes del corte (o recibe menos de K) se completa con los
  más vendidos (arranque en frío).
- El stock de hoy no se mira: se evalúa lo que el motor habría recomendado
  en el corte, entre los productos activos de empresas con IA.
"""
from collections import Counter, defaultdict
from datetime import timedelta

from apps.catalogo.models import Producto
from apps.suscripciones.services import ids_empresas_con_ia

from . import datos, recomendador

VARIANTES = [
    ('hibrido', recomendador.PESO_COLABORATIVO, recomendador.PESO_CONTENIDO),
    ('colaborativo', 1.0, 0.0),
    ('contenido', 0.0, 1.0),
]


def separar(pct_prueba):
    """(corte, {comprador: {productos de prueba}}, {comprador: {comprados antes}})."""
    compras = list(
        datos.ventas_validas()
        .values_list('pedido__orden_compra__comprador_id', 'producto_id', 'pedido__creado_en')
        .order_by('pedido__creado_en', 'id')
    )
    if len(compras) < 10:
        return None, {}, {}
    corte = compras[int(len(compras) * (1 - pct_prueba / 100))][2]
    antes, despues = defaultdict(set), defaultdict(set)
    for comprador, producto, fecha in compras:
        (antes if fecha < corte else despues)[comprador].add(producto)
    prueba = {c: ps - antes[c] for c, ps in despues.items() if ps - antes[c]}
    return corte, prueba, antes


def _populares(corte, candidatos):
    unidades = Counter()
    for producto, cantidad in datos.ventas_validas().filter(
        pedido__creado_en__gte=corte - timedelta(days=datos.DIAS_MAS_VENDIDOS), pedido__creado_en__lt=corte,
        producto_id__in=candidatos,
    ).values_list('producto_id', 'cantidad'):
        unidades[producto] += cantidad
    resto = sorted(candidatos - set(unidades))
    return [p for p, _ in sorted(unidades.items(), key=lambda x: (-x[1], x[0]))] + resto


def _completar(lista, populares, excluir, k):
    salida = list(lista[:k])
    vistos = set(salida) | excluir
    for p in populares:
        if len(salida) >= k:
            break
        if p not in vistos:
            salida.append(p)
            vistos.add(p)
    return salida


def _metricas(top_por_comprador, prueba, k):
    precision = recall = hits = 0.0
    for comprador, relevantes in prueba.items():
        aciertos = len(set(top_por_comprador.get(comprador, [])[:k]) & relevantes)
        precision += aciertos / k
        recall += aciertos / len(relevantes)
        hits += 1 if aciertos else 0
    n = len(prueba) or 1
    return {'precision': round(precision / n, 4), 'recall': round(recall / n, 4), 'hit_rate': round(hits / n, 4)}


def evaluar(k=10, pct_prueba=20):
    corte, prueba, antes = separar(pct_prueba)
    if not prueba:
        return None
    candidatos = set(
        Producto.objects.filter(activo=True, empresa_id__in=ids_empresas_con_ia())
        .exclude(estado=Producto.Estado.INACTIVO).values_list('id', flat=True)
    )
    populares = _populares(corte, candidatos)
    resultado = {
        'corte': corte, 'k': k, 'pct_prueba': pct_prueba,
        'compradores_prueba': len(prueba), 'productos_relevantes': sum(len(v) for v in prueba.values()),
        'catalogo': len(candidatos), 'variantes': {},
        # Mejor precision@K alcanzable: quien compró 1 producto nuevo no puede pasar de 1/K.
        'precision_maxima': round(sum(min(len(v), k) / k for v in prueba.values()) / len(prueba), 4),
    }

    for nombre, peso_cf, peso_cont in VARIANTES:
        modelo = recomendador.entrenar(ahora=corte, hasta=corte, peso_colaborativo=peso_cf, peso_contenido=peso_cont)
        modelo.recomendables = candidatos
        recos = recomendador.recomendar(modelo, por_comprador=k)
        tops, en_frio = {}, 0
        for comprador in prueba:
            propios = [p for p, _ in recos.get(comprador, [])]
            if len(propios) < k:
                en_frio += 1 if not propios else 0
            tops[comprador] = _completar(propios, populares, antes[comprador], k)
        resultado['variantes'][nombre] = {**_metricas(tops, prueba, k), 'arranque_en_frio': en_frio}

    tops = {c: _completar([], populares, antes[c], k) for c in prueba}
    resultado['variantes']['popular'] = {**_metricas(tops, prueba, k), 'arranque_en_frio': len(prueba)}
    return resultado
