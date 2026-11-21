from django.db import transaction
from django.db.models import F, Q
from django.utils import timezone

from apps.inventario.models import InventarioSucursal, Sucursal


def descontar_stock(producto_id, cantidad, sucursal_id=None):
    inventario = InventarioSucursal.objects.select_for_update(of=('self',)).filter(
        producto_id=producto_id, cantidad_disponible__gte=cantidad,
        sucursal__empresa_id=F('producto__empresa_id'),
    )
    if sucursal_id:
        inventario = inventario.filter(sucursal_id=sucursal_id)
    registro = inventario.order_by('-cantidad_disponible', 'pk').first()
    if registro is None:
        return None
    registro.cantidad_disponible -= cantidad
    registro.save(update_fields=['cantidad_disponible'])
    return registro.sucursal_id


def sucursales_restitucion(pedido):
    items = list(pedido.items.order_by('producto_id', 'id'))
    opciones = {}
    for item in items:
        origen = item.sucursal_stock_id or pedido.sucursal_recojo_id
        if origen:
            opciones[item.pk] = list(Sucursal.objects.filter(
                pk=origen, empresa_id=pedido.empresa_id,
            ).values_list('id', flat=True))
        else:
            opciones[item.pk] = list(Sucursal.objects.filter(empresa_id=pedido.empresa_id).filter(
                Q(inventarios__producto_id=item.producto_id) | Q(estado=Sucursal.Estado.ACTIVA),
            ).distinct().order_by('id').values_list('id', flat=True))
    return items, opciones


@transaction.atomic
def _restituir_stock_orden(orden, *, pedido=None, sucursales=None):
    pedidos = [pedido] if pedido is not None else orden.pedidos.order_by('id')
    for actual in pedidos:
        items, opciones = sucursales_restitucion(actual)
        for item in items:
            ids = opciones[item.pk]
            sucursal_id = (sucursales or {}).get(str(item.pk))
            if not sucursal_id:
                if len(ids) == 1:
                    sucursal_id = ids[0]
                elif pedido is None:
                    sucursal_id = InventarioSucursal.objects.filter(
                        producto_id=item.producto_id, sucursal_id__in=ids,
                    ).order_by('-cantidad_disponible', 'pk').values_list('sucursal_id', flat=True).first()
            if sucursal_id not in ids:
                if pedido is None:
                    continue
                raise ValueError(f'Indica la sucursal de origen del artículo {item.pk}.')

            registro, _ = InventarioSucursal.objects.get_or_create(
                producto_id=item.producto_id, sucursal_id=sucursal_id,
            )
            InventarioSucursal.objects.filter(pk=registro.pk).update(
                cantidad_disponible=F('cantidad_disponible') + item.cantidad,
                actualizado_en=timezone.now(),
            )
