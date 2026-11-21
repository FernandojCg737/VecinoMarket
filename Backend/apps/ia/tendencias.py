"""CU3 (RF46): análisis de tendencias de consumo.

Agregación semanal (SQL crudo, mismo estilo que los dashboards CU18/CU19)
de ventas válidas, vistas y búsquedas, por categoría y por producto, sobre
las últimas N semanas CERRADAS (lunes a domingo, hora local): la semana en
curso está incompleta y haría parecer "en baja" a todo.

- Tendencia: pendiente de np.polyfit (grado 1) / media de la serie, en %
  por semana. > +5 % "en_alza", < −5 % "en_baja", si no "estable" (y
  "sin_datos" si la serie es toda cero).
- Pronóstico: la misma recta extendida 4 semanas (nunca negativa).
- Días/horas pico, búsquedas sin resultados en la zona, demanda vs oferta
  (vistas / productos activos por categoría) y, para una empresa, su
  comparación con el promedio del mercado de su zona.

Alcance: una empresa ve el mercado de SU zona (departamento) por categoría,
sus propios productos y su comparación; el ADMIN ve la versión global
(opcionalmente filtrada por ?departamento=).
"""
from collections import defaultdict
from dataclasses import dataclass
from datetime import timedelta

import numpy as np
from django.conf import settings
from django.db import connection
from django.utils import timezone

from apps.catalogo.models import Categoria, Producto

from .datos import SQL_VENTA_VALIDA

UMBRAL_PCT = 5.0
SEMANAS_PRONOSTICO = 4
SEMANAS_DEFECTO, SEMANAS_MIN, SEMANAS_MAX = 12, 4, 26
DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

EN_ALZA, EN_BAJA, ESTABLE, SIN_DATOS = 'en_alza', 'en_baja', 'estable', 'sin_datos'


@dataclass
class Alcance:
    empresa: object = None   # Empresa o None (global)
    zona: str = None         # departamento o None (todas)


# ---------------------------------------------------------------------
# Matemática
# ---------------------------------------------------------------------
def tendencia(serie, umbral=UMBRAL_PCT):
    y = np.asarray(serie, dtype=float)
    if not len(y) or y.sum() == 0:
        return {'pct_semanal': None, 'estado': SIN_DATOS}
    if len(y) < 2:
        return {'pct_semanal': 0.0, 'estado': ESTABLE}
    pendiente, _ = np.polyfit(np.arange(len(y)), y, 1)
    pct = float(pendiente / y.mean() * 100)
    estado = EN_ALZA if pct > umbral else EN_BAJA if pct < -umbral else ESTABLE
    return {'pct_semanal': round(pct, 1), 'estado': estado}


def pronostico(serie, semanas=SEMANAS_PRONOSTICO):
    y = np.asarray(serie, dtype=float)
    if len(y) < 2 or y.sum() == 0:
        return [0.0] * semanas
    pendiente, intercepto = np.polyfit(np.arange(len(y)), y, 1)
    futuro = np.arange(len(y), len(y) + semanas)
    return [round(float(v), 2) for v in np.clip(pendiente * futuro + intercepto, 0, None)]


def ventana(semanas, ahora=None):
    """(desde, hasta, [lunes de cada semana]) con `hasta` = lunes 00:00 de la
    semana en curso (excluida), en hora local."""
    local = timezone.localtime(ahora or timezone.now())
    hasta = (local - timedelta(days=local.weekday())).replace(hour=0, minute=0, second=0, microsecond=0)
    desde = hasta - timedelta(weeks=semanas)
    return desde, hasta, [(desde + timedelta(weeks=i)).date() for i in range(semanas)]


# ---------------------------------------------------------------------
# Consultas (SQL crudo)
# ---------------------------------------------------------------------
def _consultar(sql, params):
    with connection.cursor() as cursor:
        cursor.execute(sql, params)
        return cursor.fetchall()


def _ventas_semanales(p):
    """(semana, categoria_id, producto_id, empresa_id, departamento_empresa, unidades, monto)."""
    return _consultar(f"""
        SELECT date_trunc('week', p.creado_en AT TIME ZONE %(tz)s)::date AS semana,
               pr.categoria_id, pi.producto_id, p.empresa_id, COALESCE(e.departamento, ''),
               SUM(pi.cantidad), SUM(pi.subtotal)
        FROM pedidos_pedidoitem pi
        JOIN pedidos_pedido p ON p.id = pi.pedido_id
        JOIN pedidos_ordencompra oc ON oc.id = p.orden_compra_id
        JOIN catalogo_producto pr ON pr.id = pi.producto_id
        JOIN usuarios_empresa e ON e.id = p.empresa_id
        WHERE {SQL_VENTA_VALIDA}
          AND p.creado_en >= %(desde)s AND p.creado_en < %(hasta)s
        GROUP BY 1, 2, 3, 4, 5
    """, p)


def _vistas_semanales(p):
    """(semana, categoria_id, producto_id, empresa_id, departamento_visitante, vistas)."""
    return _consultar("""
        SELECT date_trunc('week', ev.fecha AT TIME ZONE %(tz)s)::date AS semana,
               pr.categoria_id, ev.producto_id, pr.empresa_id, ev.departamento, COUNT(*)
        FROM ia_eventointeraccion ev
        JOIN catalogo_producto pr ON pr.id = ev.producto_id
        WHERE ev.tipo = 'VISTA' AND ev.fecha >= %(desde)s AND ev.fecha < %(hasta)s
        GROUP BY 1, 2, 3, 4, 5
    """, p)


# Qué tocó cada búsqueda (categorías / productos) se guarda en el evento al
# registrarla (EventoInteraccion.*_coincidentes): acá solo se agregan esos
# arrays. Cruzar cada término con el catálogo al consultar costaba ~11 s con
# 50 000 búsquedas y 5 000 productos.
def _busquedas_semanales(p):
    """Por categoría: (semana, categoria_id, departamento, búsquedas que tocan la categoría)."""
    return _consultar("""
        SELECT date_trunc('week', ev.fecha AT TIME ZONE %(tz)s)::date, cat.id, ev.departamento, COUNT(*)
        FROM ia_eventointeraccion ev
        CROSS JOIN LATERAL unnest(ev.categorias_coincidentes) AS cat(id)
        WHERE ev.tipo = 'BUSQUEDA' AND ev.fecha >= %(desde)s AND ev.fecha < %(hasta)s
        GROUP BY 1, 2, 3
    """, p)


def _busquedas_por_producto(p, producto_ids):
    if not producto_ids:
        return []
    return _consultar("""
        SELECT date_trunc('week', ev.fecha AT TIME ZONE %(tz)s)::date, prod.id, COUNT(*)
        FROM ia_eventointeraccion ev
        CROSS JOIN LATERAL unnest(ev.productos_coincidentes) AS prod(id)
        WHERE ev.tipo = 'BUSQUEDA' AND ev.fecha >= %(desde)s AND ev.fecha < %(hasta)s
          AND ev.productos_coincidentes && %(ids)s::bigint[] AND prod.id = ANY(%(ids)s)
        GROUP BY 1, 2
    """, {**p, 'ids': list(producto_ids)})


def _busquedas_totales(p):
    return dict(_consultar("""
        SELECT date_trunc('week', ev.fecha AT TIME ZONE %(tz)s)::date, COUNT(*)
        FROM ia_eventointeraccion ev
        WHERE ev.tipo = 'BUSQUEDA' AND ev.fecha >= %(desde)s AND ev.fecha < %(hasta)s
          AND (%(zona)s IS NULL OR ev.departamento = %(zona)s)
        GROUP BY 1
    """, p))


def _sin_resultados(p, limite=15):
    return [
        {'termino': termino, 'veces': veces, 'ultima_vez': ultima.isoformat()}
        for termino, veces, ultima in _consultar("""
            SELECT lower(trim(ev.termino_busqueda)), COUNT(*), MAX(ev.fecha)
            FROM ia_eventointeraccion ev
            WHERE ev.tipo = 'BUSQUEDA' AND ev.resultados = 0
              AND ev.fecha >= %(desde)s AND ev.fecha < %(hasta)s
              AND (%(zona)s IS NULL OR ev.departamento = %(zona)s)
            GROUP BY 1
            ORDER BY 2 DESC, 1
            LIMIT %(limite)s
        """, {**p, 'limite': limite})
    ]


def _picos(p, empresa_id):
    """Ventas (pedidos) y vistas por día de la semana y hora local."""
    ventas = _consultar(f"""
        SELECT EXTRACT(ISODOW FROM p.creado_en AT TIME ZONE %(tz)s)::int,
               EXTRACT(HOUR FROM p.creado_en AT TIME ZONE %(tz)s)::int, COUNT(DISTINCT p.id)
        FROM pedidos_pedido p
        JOIN pedidos_ordencompra oc ON oc.id = p.orden_compra_id
        JOIN usuarios_empresa e ON e.id = p.empresa_id
        WHERE {SQL_VENTA_VALIDA}
          AND p.creado_en >= %(desde)s AND p.creado_en < %(hasta)s
          AND (%(empresa)s IS NULL OR p.empresa_id = %(empresa)s)
          AND (%(empresa)s IS NOT NULL OR %(zona)s IS NULL OR e.departamento = %(zona)s)
        GROUP BY 1, 2
    """, {**p, 'empresa': empresa_id})
    vistas = _consultar("""
        SELECT EXTRACT(ISODOW FROM ev.fecha AT TIME ZONE %(tz)s)::int,
               EXTRACT(HOUR FROM ev.fecha AT TIME ZONE %(tz)s)::int, COUNT(*)
        FROM ia_eventointeraccion ev
        JOIN catalogo_producto pr ON pr.id = ev.producto_id
        WHERE ev.tipo = 'VISTA' AND ev.fecha >= %(desde)s AND ev.fecha < %(hasta)s
          AND (%(empresa)s IS NULL OR pr.empresa_id = %(empresa)s)
          AND (%(empresa)s IS NOT NULL OR %(zona)s IS NULL OR ev.departamento = %(zona)s)
        GROUP BY 1, 2
    """, {**p, 'empresa': empresa_id})

    dias = [{'dia': i, 'nombre': DIAS[i], 'pedidos': 0, 'vistas': 0} for i in range(7)]
    horas = [{'hora': h, 'pedidos': 0, 'vistas': 0} for h in range(24)]
    for clave, filas in (('pedidos', ventas), ('vistas', vistas)):
        for dow, hora, n in filas:
            dias[dow - 1][clave] += n
            horas[hora][clave] += n

    def pico(lista, etiqueta):
        mejor = max(lista, key=lambda x: (x['pedidos'], x['vistas']))
        return mejor[etiqueta] if (mejor['pedidos'] or mejor['vistas']) else None

    return {'dias': dias, 'horas': horas, 'dia_pico': pico(dias, 'nombre'), 'hora_pico': pico(horas, 'hora')}


def _oferta_por_categoria(zona):
    return dict(_consultar("""
        SELECT pr.categoria_id, COUNT(*)
        FROM catalogo_producto pr
        JOIN usuarios_empresa e ON e.id = pr.empresa_id
        WHERE pr.activo AND pr.estado = 'ACTIVO' AND pr.categoria_id IS NOT NULL
          AND e.estado = 'ACTIVA' AND (%(zona)s IS NULL OR e.departamento = %(zona)s)
        GROUP BY 1
    """, {'zona': zona}))


def _empresas_en_zona(zona):
    return _consultar("""
        SELECT COUNT(*) FROM usuarios_empresa e
        WHERE e.estado = 'ACTIVA' AND (%(zona)s IS NULL OR e.departamento = %(zona)s)
    """, {'zona': zona})[0][0]


# ---------------------------------------------------------------------
# Armado
# ---------------------------------------------------------------------
def _serie():
    return defaultdict(lambda: defaultdict(float))


def _nivel_demanda(ratio, mediana):
    if ratio is None:
        return 'sin_oferta'
    if not mediana:
        return 'media'
    if ratio >= 1.5 * mediana:
        return 'alta'
    if ratio <= 0.5 * mediana:
        return 'baja'
    return 'media'


def analizar(alcance, semanas=SEMANAS_DEFECTO, ahora=None):
    desde, hasta, lunes = ventana(semanas, ahora)
    p = {'tz': settings.TIME_ZONE, 'desde': desde, 'hasta': hasta, 'zona': alcance.zona}
    empresa_id = alcance.empresa.id if alcance.empresa else None
    en_zona = (lambda dep: True) if alcance.zona is None else (lambda dep: dep == alcance.zona)
    indice = {s: i for i, s in enumerate(lunes)}

    def vector(d):
        v = [0.0] * semanas
        for s, valor in d.items():
            if s in indice:
                v[indice[s]] = round(float(valor), 2)
        return v

    # Mercado (zona) por categoría y, para la empresa, lo suyo.
    cat_unid, cat_monto, cat_vistas, cat_busq = _serie(), _serie(), _serie(), _serie()
    prod_unid, prod_monto, prod_vistas = _serie(), _serie(), _serie()
    emp_monto, zona_monto, emp_cat_unid = defaultdict(float), defaultdict(float), _serie()

    for semana, cat, prod, emp, dep, unidades, monto in _ventas_semanales(p):
        if en_zona(dep) and cat:
            cat_unid[cat][semana] += unidades
            cat_monto[cat][semana] += float(monto)
        if en_zona(dep):
            zona_monto[semana] += float(monto)
        if empresa_id is None or emp == empresa_id:
            if empresa_id is not None or en_zona(dep):
                prod_unid[prod][semana] += unidades
                prod_monto[prod][semana] += float(monto)
        if emp == empresa_id:
            emp_monto[semana] += float(monto)
            if cat:
                emp_cat_unid[cat][semana] += unidades

    for semana, cat, prod, emp, dep, vistas in _vistas_semanales(p):
        if en_zona(dep) and cat:
            cat_vistas[cat][semana] += vistas
        if (empresa_id is None and en_zona(dep)) or emp == empresa_id:
            prod_vistas[prod][semana] += vistas

    for semana, cat, dep, n in _busquedas_semanales(p):
        if en_zona(dep) and cat:
            cat_busq[cat][semana] += n

    # --- categorías
    oferta = _oferta_por_categoria(alcance.zona)
    vende = set(
        Producto.objects.filter(empresa_id=empresa_id, activo=True, categoria__isnull=False)
        .values_list('categoria_id', flat=True)
    ) if empresa_id else set()
    ids_cat = set(cat_unid) | set(cat_vistas) | set(cat_busq) | set(oferta) | vende
    nombres = dict(Categoria.objects.filter(id__in=ids_cat).values_list('id', 'nombre'))

    categorias = []
    for cid in ids_cat:
        if cid not in nombres:
            continue
        unidades, vistas_v = vector(cat_unid[cid]), vector(cat_vistas[cid])
        total_vistas, activos = sum(vistas_v), oferta.get(cid, 0)
        categorias.append({
            'id': cid, 'nombre': nombres[cid], 'vende_empresa': cid in vende,
            'serie': {'unidades': unidades, 'ventas': vector(cat_monto[cid]), 'vistas': vistas_v, 'busquedas': vector(cat_busq[cid])},
            'tendencia': tendencia(unidades), 'tendencia_vistas': tendencia(vistas_v),
            'pronostico_unidades': pronostico(unidades),
            'demanda_oferta': {
                'vistas': int(total_vistas), 'productos_activos': activos,
                'vistas_por_producto': round(total_vistas / activos, 2) if activos else None,
            },
        })
    ratios = sorted(c['demanda_oferta']['vistas_por_producto'] for c in categorias if c['demanda_oferta']['vistas_por_producto'] is not None)
    mediana = float(np.median(ratios)) if ratios else 0.0
    for c in categorias:
        c['demanda_oferta']['nivel'] = _nivel_demanda(c['demanda_oferta']['vistas_por_producto'], mediana) \
            if c['demanda_oferta']['vistas'] or c['demanda_oferta']['productos_activos'] else 'sin_datos'
    categorias.sort(key=lambda c: (-sum(c['serie']['unidades']), -sum(c['serie']['vistas']), c['nombre']))

    # --- productos (los de la empresa, o el top global)
    ids_prod = set(prod_unid) | set(prod_vistas)
    if empresa_id:
        ids_prod |= set(Producto.objects.filter(empresa_id=empresa_id, activo=True).values_list('id', flat=True))
    else:
        ids_prod = set(sorted(ids_prod, key=lambda pid: -sum(prod_unid[pid].values()))[:20])
    busq_prod = _serie()
    for semana, pid, n in _busquedas_por_producto(p, ids_prod):
        busq_prod[pid][semana] += n
    info = {
        pr.id: pr for pr in Producto.objects.filter(id__in=ids_prod).select_related('categoria', 'empresa')
    }
    productos = []
    for pid, pr in info.items():
        unidades = vector(prod_unid[pid])
        productos.append({
            'id': pid, 'nombre': pr.nombre, 'categoria': pr.categoria.nombre if pr.categoria_id else None,
            'empresa': pr.empresa.razon_social, 'estado': pr.estado,
            'serie': {'unidades': unidades, 'ventas': vector(prod_monto[pid]), 'vistas': vector(prod_vistas[pid]), 'busquedas': vector(busq_prod[pid])},
            'tendencia': tendencia(unidades), 'tendencia_vistas': tendencia(vector(prod_vistas[pid])),
            'pronostico_unidades': pronostico(unidades),
        })
    productos.sort(key=lambda x: (-sum(x['serie']['unidades']), -sum(x['serie']['vistas']), x['nombre']))

    # --- resumen y comparación con el mercado
    alza = sum(1 for c in categorias if c['tendencia']['estado'] == EN_ALZA)
    baja = sum(1 for c in categorias if c['tendencia']['estado'] == EN_BAJA)
    busquedas_total = vector(_busquedas_totales(p))
    fuente = productos if empresa_id else categorias
    ventas_alcance = vector(emp_monto) if empresa_id else vector(zona_monto)
    unidades_semanales = [round(sum(x['serie']['unidades'][i] for x in fuente), 2) for i in range(semanas)]
    vistas_semanales = [round(sum(x['serie']['vistas'][i] for x in fuente), 2) for i in range(semanas)]
    unidades_alcance, vistas_alcance = sum(unidades_semanales), sum(vistas_semanales)

    comparacion = None
    if empresa_id:
        n_empresas = max(_empresas_en_zona(alcance.zona), 1)
        promedio = [round(v / n_empresas, 2) for v in vector(zona_monto)]
        total_zona = sum(vector(zona_monto))
        comparacion = {
            'empresas_en_zona': n_empresas,
            'ventas_empresa': ventas_alcance,
            'ventas_promedio_mercado': promedio,
            'tendencia_empresa': tendencia(ventas_alcance),
            'tendencia_mercado': tendencia(promedio),
            'participacion_pct': round(sum(ventas_alcance) / total_zona * 100, 1) if total_zona else None,
            'por_categoria': [
                {
                    'id': c['id'], 'nombre': c['nombre'],
                    'tendencia_empresa': tendencia(vector(emp_cat_unid[c['id']])),
                    'tendencia_mercado': c['tendencia'],
                    'participacion_pct': round(sum(vector(emp_cat_unid[c['id']])) / sum(c['serie']['unidades']) * 100, 1)
                    if sum(c['serie']['unidades']) else None,
                }
                for c in categorias if c['vende_empresa']
            ],
        }

    return {
        'alcance': 'empresa' if empresa_id else 'global',
        'empresa': {'id': empresa_id, 'razon_social': alcance.empresa.razon_social} if empresa_id else None,
        'zona': alcance.zona,
        'semanas': [s.isoformat() for s in lunes],
        'desde': desde.isoformat(), 'hasta': hasta.isoformat(),
        'umbral_pct': UMBRAL_PCT,
        'resumen': {
            'ventas_total': round(sum(ventas_alcance), 2), 'unidades': int(unidades_alcance),
            'vistas': int(vistas_alcance), 'busquedas': int(sum(busquedas_total)),
            'tendencia_ventas': tendencia(ventas_alcance),
            'pronostico_ventas': pronostico(ventas_alcance),
            'unidades_semanales': unidades_semanales, 'vistas_semanales': vistas_semanales,
            'tendencia_unidades': tendencia(unidades_semanales),
            'pronostico_unidades': pronostico(unidades_semanales),
            'categorias_en_alza': alza, 'categorias_en_baja': baja,
        },
        'categorias': categorias,
        'productos': productos,
        'picos': _picos(p, empresa_id),
        'busquedas_sin_resultados': _sin_resultados(p),
        'comparacion_mercado': comparacion,
    }
