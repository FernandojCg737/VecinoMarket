"""Lectura de datos compartida por los motores de IA (CU1, CU2, CU3).

Reglas del negocio que viven SOLO acá, para que los tres CU las apliquen igual:
- Venta válida (decisión 3): OrdenCompra.estado_pago = 'PAGADO' y
  Pedido.estado <> 'CANCELADO' — el mismo criterio que los dashboards.
- Producto recomendable: activo, estado ACTIVO, stock > 0 (suma de
  InventarioSucursal) y de una empresa con IA vigente (decisión 4).
- Peso de cada interacción: VISTA=1, CARRITO=3, COMPRA=5, con decaimiento
  exp(-días/30). Las COMPRAS salen de los pedidos, no de EventoInteraccion.
"""
import math
from collections import defaultdict
from datetime import timedelta

from django.db.models import Sum
from django.utils import timezone

from apps.catalogo.views import _productos_queryset
from apps.pedidos.models import OrdenCompra, Pedido, PedidoItem
from apps.suscripciones.services import ids_empresas_con_ia

from .models import EventoInteraccion

PESOS = {
    EventoInteraccion.Tipo.VISTA: 1.0,
    EventoInteraccion.Tipo.CARRITO: 3.0,
    EventoInteraccion.Tipo.COMPRA: 5.0,
}
VIDA_MEDIA_DIAS = 30.0  # decaimiento exp(-días/30)
VENTANA_DIAS = 180  # más atrás, exp(-180/30) ≈ 0.0025: no aporta y solo cuesta memoria
DIAS_MAS_VENDIDOS = 30

# Fragmento SQL equivalente, para las consultas crudas de CU3.
SQL_VENTA_VALIDA = "oc.estado_pago = 'PAGADO' AND p.estado <> 'CANCELADO'"


def ventas_validas():
    return PedidoItem.objects.filter(
        pedido__orden_compra__estado_pago=OrdenCompra.EstadoPago.PAGADO,
    ).exclude(pedido__estado=Pedido.Estado.CANCELADO)


def productos_recomendables():
    """Mismo queryset (y forma) que el catálogo público, filtrado a lo que se
    puede recomendar hoy. Trae `stock` anotado e imágenes precargadas."""
    return _productos_queryset().filter(stock__gt=0, empresa_id__in=ids_empresas_con_ia())


def peso_decaido(tipo, fecha, ahora):
    dias = max((ahora - fecha).total_seconds() / 86400.0, 0.0)
    return PESOS[tipo] * math.exp(-dias / VIDA_MEDIA_DIAS)


def iterar_interacciones(comprador_id=None, ahora=None, hasta=None):
    """Genera (comprador_id, producto_id, tipo, fecha) de VISTA, CARRITO y
    COMPRA dentro de la ventana. `hasta` corta la historia (lo usa la
    evaluación offline para no ver el futuro)."""
    ahora = ahora or timezone.now()
    desde = ahora - timedelta(days=VENTANA_DIAS)

    eventos = EventoInteraccion.objects.filter(
        comprador__isnull=False, producto__isnull=False, fecha__gte=desde,
        tipo__in=[EventoInteraccion.Tipo.VISTA, EventoInteraccion.Tipo.CARRITO],
    )
    compras = ventas_validas().filter(pedido__creado_en__gte=desde)
    if comprador_id is not None:
        eventos = eventos.filter(comprador_id=comprador_id)
        compras = compras.filter(pedido__orden_compra__comprador_id=comprador_id)
    if hasta is not None:
        eventos = eventos.filter(fecha__lt=hasta)
        compras = compras.filter(pedido__creado_en__lt=hasta)

    yield from eventos.values_list('comprador_id', 'producto_id', 'tipo', 'fecha').iterator(chunk_size=5000)
    for comprador, producto, fecha in compras.values_list(
        'pedido__orden_compra__comprador_id', 'producto_id', 'pedido__creado_en',
    ).iterator(chunk_size=5000):
        yield comprador, producto, EventoInteraccion.Tipo.COMPRA, fecha


def perfil_comprador(comprador_id, ahora=None):
    """{producto_id: peso decaído acumulado} y el conjunto de comprados."""
    ahora = ahora or timezone.now()
    pesos, comprados = defaultdict(float), set()
    for _, producto, tipo, fecha in iterar_interacciones(comprador_id, ahora):
        pesos[producto] += peso_decaido(tipo, fecha, ahora)
        if tipo == EventoInteraccion.Tipo.COMPRA:
            comprados.add(producto)
    return dict(pesos), comprados


def mas_vendidos(limite, excluir=(), dias=DIAS_MAS_VENDIDOS):
    """Arranque en frío: [(producto_id, score 0..1)] por unidades vendidas en
    los últimos `dias`, solo entre productos recomendables. Si en esa ventana
    no alcanza (catálogo nuevo), completa con los más vendidos de siempre y,
    por último, con los más recientes (score 0)."""
    validos = productos_recomendables().exclude(id__in=list(excluir))
    elegidos, vistos = [], set(excluir)

    for desde in (timezone.now() - timedelta(days=dias), None):
        ventas = ventas_validas().filter(producto_id__in=validos.values('id'))
        if desde:
            ventas = ventas.filter(pedido__creado_en__gte=desde)
        filas = list(ventas.values('producto_id').annotate(unidades=Sum('cantidad')).order_by('-unidades', 'producto_id')[: limite * 2])
        maximo = max((f['unidades'] for f in filas), default=0) or 1
        # La ventana completa (de siempre) puntúa siempre por debajo de la
        # peor de 30 días, para que el score respete el orden del ranking.
        factor = 1.0 if not elegidos else min(s for _, s in elegidos) * 0.5
        for f in filas:
            if f['producto_id'] not in vistos and len(elegidos) < limite:
                elegidos.append((f['producto_id'], round(factor * f['unidades'] / maximo, 4)))
                vistos.add(f['producto_id'])
        if len(elegidos) >= limite:
            return elegidos

    for pid in validos.exclude(id__in=list(vistos)).order_by('-creado_en').values_list('id', flat=True)[: limite - len(elegidos)]:
        elegidos.append((pid, 0.0))
    return elegidos


def coincidencias_busqueda(termino):
    """BUSQUEDA: {resultados, categorias, productos} contra el catálogo público
    de este momento (mismo filtro ?q= que ve el comprador). Una sola pasada:
    ids y categorías de los productos que coinciden."""
    from apps.catalogo.models import Producto
    from apps.catalogo.views import filtrar_por_texto

    from .models import MAX_PRODUCTOS_COINCIDENTES

    filas = list(
        filtrar_por_texto(Producto.objects.filter(activo=True, estado=Producto.Estado.ACTIVO), termino)
        .order_by('id').values_list('id', 'categoria_id')
    )
    return {
        'resultados': len(filas),
        'categorias': sorted({c for _, c in filas if c}),
        'productos': [p for p, _ in filas[:MAX_PRODUCTOS_COINCIDENTES]],
    }
