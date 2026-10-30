from decimal import Decimal
from django.utils import timezone
from apps.catalogo.models import Producto
from apps.promociones.models import Promocion


def sincronizar_descuentos_productos(productos=None):
    """
    Sincroniza el campo 'precio_descuento' de los productos en base a las
    promociones que estén actualmente ACTIVAS y vigentes.
    
    - Si se pasa una lista/queryset de productos, actualiza únicamente esos productos.
    - Si productos es None, sincroniza todos los productos de la plataforma.
    """
    if productos is None:
        qs_prods = list(Producto.objects.filter(activo=True))
    elif hasattr(productos, '__iter__'):
        ids = [p.id if hasattr(p, 'id') else p for p in productos]
        qs_prods = list(Producto.objects.filter(id__in=ids))
    else:
        p_id = productos.id if hasattr(productos, 'id') else productos
        qs_prods = list(Producto.objects.filter(id=p_id))

    ahora = timezone.now()

    for prod in qs_prods:
        # Buscar promociones activas y vigentes para este producto
        promos_activas = Promocion.objects.filter(
            activo=True,
            estado=Promocion.Estado.ACTIVA,
            productos=prod,
            fecha_inicio__lte=ahora,
            fecha_fin__gte=ahora,
        )

        if not promos_activas.exists():
            # No hay promociones activas vigentes: se limpia el precio de descuento
            if prod.precio_descuento is not None:
                prod.precio_descuento = None
                prod.save(update_fields=['precio_descuento'])
            continue

        # Calcular el mejor precio con descuento para el comprador
        mejor_precio = prod.precio
        for promo in promos_activas:
            if promo.tipo == Promocion.Tipo.PORCENTAJE:
                descuento = (prod.precio * (promo.valor / Decimal('100.0'))).quantize(Decimal('0.01'))
                precio_con_desc = prod.precio - descuento
            elif promo.tipo == Promocion.Tipo.MONTO_FIJO:
                precio_con_desc = prod.precio - promo.valor
            else:
                continue

            precio_con_desc = max(Decimal('0.01'), precio_con_desc)
            if precio_con_desc < mejor_precio:
                mejor_precio = precio_con_desc

        if mejor_precio < prod.precio:
            if prod.precio_descuento != mejor_precio:
                prod.precio_descuento = mejor_precio
                prod.save(update_fields=['precio_descuento'])
        else:
            if prod.precio_descuento is not None:
                prod.precio_descuento = None
                prod.save(update_fields=['precio_descuento'])
