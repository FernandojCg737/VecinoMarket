"""CU2 (RF45): recomendación personalizada por ubicación, en tiempo real (no se guarda).

Candidatos: productos recomendables (activos, con stock, empresa con IA
vigente) con stock en alguna Sucursal ACTIVA dentro del radio (ST_DWithin
sobre geography, usa el índice GIST). De cada producto cuenta la sucursal
más cercana que lo tiene.

    score = 0.5·preferencia + 0.3·(1 − distancia/radio) + 0.2·reputación

- preferencia: score de CU1 (híbrido, en línea sobre los vecinos guardados)
  si el producto lo tiene; si no, afinidad del comprador por la categoría
  (peso decaído de su historia en esa categoría / el de su categoría
  favorita). Comprador sin historia o invitado: popularidad (unidades
  vendidas en 30 días / el más vendido entre los candidatos).
- reputación: AVG(calificacion)/5 de la empresa; 0.5 si no tiene reseñas.
"""
from collections import defaultdict
from datetime import timedelta

from django.contrib.gis.db.models.functions import Distance
from django.contrib.gis.geos import Point
from django.contrib.gis.measure import D
from django.db.models import Avg, Count, Sum
from django.utils import timezone

from apps.catalogo.models import Producto
from apps.inventario.models import InventarioSucursal, Sucursal
from apps.reportes.models import Valoracion
from apps.suscripciones.services import ids_empresas_con_ia
from apps.usuarios.models import Direccion

from . import datos, recomendaciones

PESO_PREFERENCIA = 0.5
PESO_CERCANIA = 0.3
PESO_REPUTACION = 0.2
REPUTACION_SIN_RESENAS = 0.5

RADIO_DEFECTO_KM = 5.0
RADIO_MIN_KM = 0.5
RADIO_MAX_KM = 50.0

PERSONALIZADA = 'personalizada'
POPULAR = 'popular'


class UbicacionNoDisponible(Exception):
    """El comprador no mandó lat/lng y no tiene ubicación guardada."""


def resolver_ubicacion(comprador, lat=None, lng=None):
    """(Point, fuente). Prioridad: lat/lng del dispositivo -> ubicacion_default
    del comprador -> su dirección predeterminada."""
    if lat is not None and lng is not None:
        return Point(lng, lat, srid=4326), 'dispositivo'
    if comprador is not None:
        if comprador.ubicacion_default:
            return comprador.ubicacion_default, 'ubicacion_default'
        direccion = Direccion.objects.filter(comprador=comprador, activo=True, es_predeterminada=True).first()
        if direccion and direccion.ubicacion:
            return direccion.ubicacion, 'direccion_predeterminada'
    raise UbicacionNoDisponible


def reputacion_empresas(empresa_ids):
    """{empresa_id: (reputación 0..1, promedio, total)}."""
    filas = (
        Valoracion.objects.filter(empresa_id__in=empresa_ids, activo=True)
        .values('empresa_id').annotate(promedio=Avg('calificacion'), total=Count('id'))
    )
    resultado = {e: (REPUTACION_SIN_RESENAS, None, 0) for e in empresa_ids}
    for f in filas:
        resultado[f['empresa_id']] = (float(f['promedio']) / 5.0, round(float(f['promedio']), 2), f['total'])
    return resultado


def _preferencias(comprador, productos):
    """({producto_id: preferencia 0..1}, estrategia)."""
    ids = [p.id for p in productos]
    if comprador is not None:
        pesos, _ = datos.perfil_comprador(comprador.id)
        if pesos:
            cu1 = dict(recomendaciones.calcular_para_comprador(comprador.id, por_comprador=None))
            por_categoria = defaultdict(float)
            categoria_de = dict(Producto.objects.filter(id__in=list(pesos)).values_list('id', 'categoria_id'))
            for pid, peso in pesos.items():
                if categoria_de.get(pid):
                    por_categoria[categoria_de[pid]] += peso
            tope = max(por_categoria.values(), default=0) or 1
            return {
                p.id: cu1[p.id] if p.id in cu1 else por_categoria.get(p.categoria_id, 0.0) / tope
                for p in productos
            }, PERSONALIZADA

    desde = timezone.now() - timedelta(days=datos.DIAS_MAS_VENDIDOS)
    unidades = dict(
        datos.ventas_validas().filter(producto_id__in=ids, pedido__creado_en__gte=desde)
        .values_list('producto_id').annotate(u=Sum('cantidad'))
    )
    tope = max(unidades.values(), default=0) or 1
    return {pid: unidades.get(pid, 0) / tope for pid in ids}, POPULAR


def recomendar_cercanos(punto, radio_km=RADIO_DEFECTO_KM, comprador=None, limite=20):
    """{estrategia, productos: [...], emprendedores: [...]} ordenados por score."""
    sucursales = {
        s.id: s
        for s in Sucursal.objects.filter(
            estado=Sucursal.Estado.ACTIVA, activo=True, ubicacion__isnull=False,
            ubicacion__dwithin=(punto, D(km=radio_km)), empresa_id__in=ids_empresas_con_ia(),
        ).annotate(distancia=Distance('ubicacion', punto))
    }
    if not sucursales:
        return {'estrategia': PERSONALIZADA if comprador else POPULAR, 'productos': [], 'emprendedores': []}

    # Sucursal más cercana con stock, por producto.
    mejor = {}
    for producto_id, sucursal_id, cantidad in InventarioSucursal.objects.filter(
        sucursal_id__in=list(sucursales), cantidad_disponible__gt=0,
    ).values_list('producto_id', 'sucursal_id', 'cantidad_disponible'):
        km = sucursales[sucursal_id].distancia.km
        if producto_id not in mejor or km < mejor[producto_id][1]:
            mejor[producto_id] = (sucursal_id, km, cantidad)

    productos = list(datos.productos_recomendables().filter(id__in=list(mejor)))
    if not productos:
        return {'estrategia': PERSONALIZADA if comprador else POPULAR, 'productos': [], 'emprendedores': []}

    preferencia, estrategia = _preferencias(comprador, productos)
    reputacion = reputacion_empresas({p.empresa_id for p in productos})

    puntuados = []
    for p in productos:
        sucursal_id, km, cantidad = mejor[p.id]
        cercania = max(0.0, 1.0 - km / radio_km)
        rep = reputacion[p.empresa_id][0]
        pref = preferencia.get(p.id, 0.0)
        score = PESO_PREFERENCIA * pref + PESO_CERCANIA * cercania + PESO_REPUTACION * rep
        puntuados.append({
            'producto': p, 'score': round(score, 4), 'distancia_km': round(km, 2),
            'sucursal': sucursales[sucursal_id], 'stock_sucursal': cantidad,
            'componentes': {'preferencia': round(pref, 4), 'cercania': round(cercania, 4), 'reputacion': round(rep, 4)},
        })
    puntuados.sort(key=lambda x: (-x['score'], x['distancia_km'], x['producto'].id))

    # Emprendedores: uno por empresa, con su mejor producto y sus sucursales cercanas.
    por_empresa, categorias_empresa = {}, defaultdict(lambda: defaultdict(int))
    for item in puntuados:
        empresa = item['producto'].empresa
        if empresa.id not in por_empresa:
            _, promedio, total = reputacion[empresa.id]
            por_empresa[empresa.id] = {
                'empresa': empresa, 'score': item['score'], 'distancia_km': item['distancia_km'],
                'reputacion': {'promedio': promedio, 'total': total}, 'productos_cercanos': 0,
                'sucursales': sorted(
                    (s for s in sucursales.values() if s.empresa_id == empresa.id), key=lambda s: s.distancia.km,
                ),
            }
        resumen = por_empresa[empresa.id]
        resumen['productos_cercanos'] += 1
        resumen['distancia_km'] = min(resumen['distancia_km'], item['distancia_km'])
        if item['producto'].categoria_id:
            categorias_empresa[empresa.id][item['producto'].categoria.nombre] += 1

    # Empresa no tiene rubro: se usa la categoría más frecuente de sus productos cercanos.
    for empresa_id, resumen in por_empresa.items():
        conteo = categorias_empresa[empresa_id]
        resumen['categoria_principal'] = min(conteo, key=lambda n: (-conteo[n], n)) if conteo else None

    # Productos por score; emprendedores por cercanía (como en los prototipos
    # web y móvil: la lista responde "¿quién está más cerca?").
    emprendedores = sorted(por_empresa.values(), key=lambda e: (e['distancia_km'], e['empresa'].id))
    return {'estrategia': estrategia, 'productos': puntuados[:limite], 'emprendedores': emprendedores}
