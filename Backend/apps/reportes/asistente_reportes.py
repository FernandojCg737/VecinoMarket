"""Ejecuta un conjunto cerrado de consultas analíticas de VecinoMarket."""

from django.db.models import Count, Sum

from apps.catalogo.models import Producto
from apps.facturacion.models import ComisionVenta
from apps.inventario.models import InventarioSucursal
from apps.pedidos.devoluciones import ORDEN_PAGADA
from apps.pedidos.models import Pedido, PedidoItem
from apps.usuarios.models import Empresa, Usuario


COLUMNAS_PEDIDOS = ['numero_pedido', 'fecha', 'cliente', 'estado', 'subtotal']
COLUMNAS_PRODUCTOS = ['nombre', 'categoria', 'precio', 'precio_descuento', 'estado']
REPORTES = {
    'ventas': ('pedidos', COLUMNAS_PEDIDOS),
    'producto_mas_vendido': ('pedidos', COLUMNAS_PEDIDOS),
    'clientes_principales': ('pedidos', COLUMNAS_PEDIDOS),
    'comisiones': ('pedidos', ['numero_pedido', 'fecha', 'subtotal', 'comision']),
    'empresa_lider': ('empresas', ['razon_social', 'ciudad', 'plan', 'estado']),
    'resumen_plataforma': ('empresas', ['razon_social', 'nit', 'ciudad', 'plan', 'estado']),
    'producto_mas_caro': ('productos', COLUMNAS_PRODUCTOS),
    'producto_mas_barato': ('productos', COLUMNAS_PRODUCTOS),
    'stock_bajo': ('productos', COLUMNAS_PRODUCTOS),
    'catalogo': ('productos', COLUMNAS_PRODUCTOS),
    'inventario': ('productos', COLUMNAS_PRODUCTOS),
    'facturas': ('facturas', ['tipo', 'monto', 'estado_pago', 'fecha']),
    'pedidos': ('pedidos', COLUMNAS_PEDIDOS),
}

SOLO_PLATAFORMA = {'empresa_lider', 'resumen_plataforma'}
SOLO_ACTUAL = {
    'producto_mas_caro', 'producto_mas_barato', 'stock_bajo', 'inventario', 'resumen_plataforma',
}


def intencion_por_reglas(texto):
    def contiene(*cadenas):
        return any(cadena in texto for cadena in cadenas)

    empresa = contiene('empresa', 'tienda')
    if contiene('cuantas empresas', 'total empresas', 'cuantos usuarios', 'usuarios activos', 'total usuarios'):
        return 'resumen_plataforma'
    if contiene('comision', 'comisiones', 'cuanto cobro la plataforma', 'ganancia de la plataforma'):
        return 'comisiones'
    producto = contiene('producto', 'articulo')
    if empresa and not producto and contiene(
        'mas vend', 'mayor vent', 'top', 'mas venta', 'mas ingreso', 'mas gananci', 'lider',
        'vende mas', 'vendio mas', 'mejor empresa', 'mejor tienda',
    ):
        return 'empresa_lider'
    if contiene('mas caro', 'mayor precio', 'mas costoso', 'precio mas alto', 'mas valor'):
        return 'producto_mas_caro'
    if contiene('mas barato', 'menor precio', 'mas economico', 'precio mas bajo'):
        return 'producto_mas_barato'
    if contiene('menos stock', 'menor stock', 'agotando', 'por agotar', 'bajo stock', 'quedan pocos', 'poco stock'):
        return 'stock_bajo'
    if contiene('cliente', 'comprador', 'quien compra', 'quien me compra'):
        return 'clientes_principales'
    if contiene(
        'mas vendido', 'mas vendida', 'mas vendidio', 'top producto', 'producto estrella',
        'articulo estrella', 'mas pedido', 'mas popular', 'mejores productos', 'que producto se vende',
        'cual producto se vende', 'cual se vende mas', 'lo que mas se vende',
    ) or (
        not empresa and contiene('vend', 'mas venta', 'mayor venta') and contiene('mas', 'mayor', 'top', 'mejor')
        and not contiene('cuanto', 'total vendido', 'ventas totales')
    ):
        return 'producto_mas_vendido'
    if contiene('cuanto vendi', 'ventas', 'ingresos', 'ganancias', 'total vendido', 'pedidos', 'cuanto dinero', 'cuanto se vendio'):
        return 'ventas'
    if contiene('inventario', 'stock'):
        return 'inventario'
    if contiene('producto', 'catalogo', 'articulo'):
        return 'catalogo'
    if contiene('factura', 'facturacion'):
        return 'facturas'
    return 'pedidos'


def durante(queryset, campo, inicio, fin):
    if inicio:
        queryset = queryset.filter(**{f'{campo}__date__gte': inicio})
    if fin:
        queryset = queryset.filter(**{f'{campo}__date__lte': fin})
    return queryset


def _pagados(queryset):
    return queryset.filter(orden_compra__estado_pago__in=ORDEN_PAGADA).exclude(
        estado__in=[Pedido.Estado.DEVUELTO, Pedido.Estado.CANCELADO],
    )


def consultar(intencion, empresa, inicio, fin):
    if empresa:
        alcance = f'en **{empresa.razon_social}**'
    else:
        alcance = 'en toda la plataforma'
    periodo = ''
    if inicio and fin:
        periodo = f' el {inicio:%d/%m/%Y}' if inicio == fin else f' del {inicio:%d/%m/%Y} al {fin:%d/%m/%Y}'

    if intencion == 'resumen_plataforma':
        empresas = Empresa.objects.count()
        usuarios = Usuario.objects.filter(estado='ACTIVO').count()
        return f'La plataforma cuenta con {empresas} empresas registradas y {usuarios} usuarios activos.'

    if intencion == 'comisiones':
        comisiones = ComisionVenta.objects.all()
        if empresa:
            comisiones = comisiones.filter(empresa=empresa)
        total = durante(comisiones, 'creado_en', inicio, fin).aggregate(total=Sum('monto_comision'))['total'] or 0
        return f'Se registraron Bs {total:.2f} en comisiones por ventas {alcance}{periodo}.'

    if intencion in ('ventas', 'producto_mas_vendido', 'empresa_lider', 'clientes_principales'):
        pedidos = Pedido.objects.all()
        if empresa:
            pedidos = pedidos.filter(empresa=empresa)
        pedidos = durante(pedidos, 'creado_en', inicio, fin)
        pagados = _pagados(pedidos)
        if intencion == 'ventas':
            cifras = pagados.aggregate(total=Sum('subtotal'), cantidad=Count('id'))
            total = cifras['total'] or 0
            return (
                f'Se registraron {pedidos.count()} pedidos {alcance}{periodo}. '
                f'Las ventas de {cifras["cantidad"]} pedidos pagados suman Bs {total:.2f}.'
            )
        if intencion == 'producto_mas_vendido':
            ranking = list(
                PedidoItem.objects.filter(pedido__in=pagados)
                .values('producto_id', 'producto__nombre')
                .annotate(unidades=Sum('cantidad'), monto=Sum('subtotal'))
                .order_by('-unidades', 'producto_id')[:2]
            )
            if not ranking:
                return f'No hay ventas de productos {alcance}{periodo}.'
            producto = ranking[0]
            respuesta = (
                f'El producto más vendido {alcance}{periodo} es **{producto["producto__nombre"]}**, '
                f'con {producto["unidades"]} unidades y Bs {producto["monto"]:.2f} en ventas.'
            )
            if len(ranking) > 1:
                segundo = ranking[1]
                respuesta += f' En segundo lugar está **{segundo["producto__nombre"]}**, con {segundo["unidades"]} unidades.'
            return respuesta

        if intencion == 'empresa_lider':
            ranking = list(
                pagados.values('empresa_id', 'empresa__razon_social')
                .annotate(ventas=Sum('subtotal'), cantidad=Count('id'))
                .order_by('-ventas', 'empresa_id')[:2]
            )
            if not ranking:
                return f'No hay ventas pagadas para comparar empresas{periodo}.'
            lider = ranking[0]
            respuesta = (
                f'La empresa con mayores ventas{periodo} es **{lider["empresa__razon_social"]}**, '
                f'con Bs {lider["ventas"]:.2f} y {lider["cantidad"]} pedidos pagados.'
            )
            if len(ranking) > 1:
                segunda = ranking[1]
                respuesta += f' En segundo lugar está **{segunda["empresa__razon_social"]}**, con Bs {segunda["ventas"]:.2f}.'
            return respuesta

        comprador = (
            pagados.values(
                'orden_compra__comprador_id', 'orden_compra__comprador__usuario__nombre',
                'orden_compra__comprador__usuario__apellido',
            )
            .annotate(monto=Sum('subtotal'), cantidad=Count('id'))
            .order_by('-monto', 'orden_compra__comprador_id').first()
        )
        if comprador:
            nombre = ' '.join(filter(None, (
                comprador['orden_compra__comprador__usuario__nombre'],
                comprador['orden_compra__comprador__usuario__apellido'],
            )))
            return (
                f'El cliente con mayor importe de compras {alcance}{periodo} es **{nombre}**, '
                f'con {comprador["cantidad"]} pedidos pagados y Bs {comprador["monto"]:.2f}.'
            )
        return f'No hay compras de clientes {alcance}{periodo}.'

    if intencion in ('producto_mas_caro', 'producto_mas_barato'):
        productos = Producto.objects.filter(estado=Producto.Estado.ACTIVO)
        if empresa:
            productos = productos.filter(empresa=empresa)
        caro = intencion == 'producto_mas_caro'
        producto = productos.order_by('-precio' if caro else 'precio', 'id').first()
        if producto:
            comparacion = 'mayor' if caro else 'menor'
            return f'El producto de {comparacion} precio {alcance} es **{producto.nombre}** a Bs {producto.precio:.2f}.'
        return f'No hay productos activos {alcance}.'

    if intencion in ('stock_bajo', 'inventario'):
        inventario = InventarioSucursal.objects.filter(producto__estado=Producto.Estado.ACTIVO)
        if empresa:
            inventario = inventario.filter(producto__empresa=empresa)
        if intencion == 'inventario':
            total = inventario.aggregate(unidades=Sum('cantidad_disponible'))['unidades'] or 0
            return f'El inventario actual {alcance} suma {total} unidades disponibles.'
        stock = (
            inventario.values('producto_id', 'producto__nombre')
            .annotate(unidades=Sum('cantidad_disponible'))
            .order_by('unidades', 'producto_id').first()
        )
        if stock:
            return f'El producto con menor stock {alcance} es **{stock["producto__nombre"]}**, con {stock["unidades"]} unidades disponibles.'
        return f'No hay registros de inventario {alcance}.'

    etiqueta = {'catalogo': 'productos', 'facturas': 'facturas', 'pedidos': 'pedidos y ventas'}[intencion]
    return f'Reporte de {etiqueta} {alcance}{periodo}.'
