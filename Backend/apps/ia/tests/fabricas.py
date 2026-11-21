"""Datos mínimos para los tests de apps/ia (sin depender de poblar_datos)."""
from datetime import timedelta
from decimal import Decimal
from itertools import count

from django.contrib.gis.geos import Point
from django.utils import timezone

from apps.catalogo.models import Categoria, Producto
from apps.inventario.models import InventarioSucursal, Sucursal
from apps.suscripciones.models import Plan, Suscripcion
from apps.usuarios.models import Comprador, Empresa, Usuario

_secuencia = count(1)
PASSWORD = 'Password-only-for-tests'

LA_PAZ = (-68.1500, -16.5000)  # (lon, lat)


def plan(codigo='BASICO'):
    # Los 3 planes los siembra la migración suscripciones/0006.
    return Plan.objects.get(codigo=codigo)


def usuario(rol, **extra):
    n = next(_secuencia)
    return Usuario.objects.create_user(
        email=f'{rol.lower()}{n}@example.test', password=PASSWORD, nombre=f'{rol.title()} {n}', rol=rol, **extra,
    )


def comprador(departamento='La Paz', ubicacion=LA_PAZ):
    u = usuario(Usuario.Rol.COMPRADOR)
    return Comprador.objects.create(
        usuario=u, departamento=departamento,
        ubicacion_default=Point(*ubicacion, srid=4326) if ubicacion else None,
    )


def empresa(codigo_plan='BASICO', suscripcion='VIGENTE', ubicacion=LA_PAZ, departamento='La Paz'):
    """suscripcion: 'VIGENTE', 'VENCIDA' (ACTIVA pero con fecha pasada),
    'CANCELADA' o None (sin suscripción)."""
    u = usuario(Usuario.Rol.EMPRESA)
    n = next(_secuencia)
    p = plan(codigo_plan) if codigo_plan else None
    e = Empresa.objects.create(
        usuario_dueno=u, razon_social=f'Empresa {n}', nit=f'{n:010d}', slug=f'empresa-{n}',
        plan=p, ubicacion=Point(*ubicacion, srid=4326) if ubicacion else None,
        departamento=departamento, ciudad=departamento,
    )
    ahora = timezone.now()
    if suscripcion and p:
        estado = Suscripcion.Estado.CANCELADA if suscripcion == 'CANCELADA' else Suscripcion.Estado.ACTIVA
        vence = ahora - timedelta(days=1) if suscripcion == 'VENCIDA' else ahora + timedelta(days=30)
        Suscripcion.objects.create(
            empresa=e, plan=p, fecha_inicio=ahora - timedelta(days=31), fecha_vencimiento=vence, estado=estado,
        )
    return e


def categoria(nombre=None):
    return Categoria.objects.create(nombre=nombre or f'Categoría {next(_secuencia)}')


def sucursal(emp, ubicacion=LA_PAZ, estado=Sucursal.Estado.ACTIVA):
    return Sucursal.objects.create(
        empresa=emp, nombre=f'Sucursal {next(_secuencia)}', estado=estado,
        ubicacion=Point(*ubicacion, srid=4326) if ubicacion else None,
    )


def producto(emp, cat=None, nombre=None, descripcion='', precio='10.00', stock=10, suc=None, **extra):
    p = Producto.objects.create(
        empresa=emp, categoria=cat, nombre=nombre or f'Producto {next(_secuencia)}',
        descripcion=descripcion, precio=Decimal(precio), **extra,
    )
    if stock is not None:
        suc = suc or Sucursal.objects.filter(empresa=emp).first() or sucursal(emp)
        InventarioSucursal.objects.create(producto=p, sucursal=suc, cantidad_disponible=stock)
        p.refresh_from_db()  # el trigger de stock puede haber cambiado el estado
    return p


def evento(comprador, producto, tipo='VISTA', dias_atras=1, **extra):
    from apps.ia.datos import coincidencias_busqueda
    from apps.ia.models import EventoInteraccion

    if tipo == 'BUSQUEDA' and 'categorias_coincidentes' not in extra:
        coincide = coincidencias_busqueda(extra.get('termino_busqueda', ''))
        extra.setdefault('resultados', coincide['resultados'])
        extra['categorias_coincidentes'] = coincide['categorias']
        extra['productos_coincidentes'] = coincide['productos']
    return EventoInteraccion.objects.create(
        comprador=comprador, producto=producto, tipo=tipo,
        fecha=timezone.now() - timedelta(days=dias_atras), **extra,
    )


def venta(comprador, productos, dias_atras=1, estado_pago='PAGADO', estado='ENTREGADO', cantidad=1):
    """Una orden con un pedido por empresa (recojo en tienda), fechada `dias_atras`."""
    from apps.pedidos.models import OrdenCompra, Pedido, PedidoItem

    fecha = timezone.now() - timedelta(days=dias_atras)
    total = sum((p.precio * cantidad for p in productos), Decimal('0'))
    orden = OrdenCompra.objects.create(comprador=comprador, monto_total=total, metodo_pago='QR', estado_pago=estado_pago)
    por_empresa = {}
    for p in productos:
        por_empresa.setdefault(p.empresa_id, []).append(p)
    for empresa_id, lista in por_empresa.items():
        pedido = Pedido.objects.create(
            orden_compra=orden, empresa_id=empresa_id, numero_pedido=f'TEST-{next(_secuencia)}',
            subtotal=sum((p.precio * cantidad for p in lista), Decimal('0')), estado=estado,
            modalidad_entrega='RECOJO_TIENDA', sucursal_recojo=Sucursal.objects.filter(empresa_id=empresa_id).first(),
        )
        for p in lista:
            PedidoItem.objects.create(pedido=pedido, producto=p, cantidad=cantidad, precio_unitario=p.precio, subtotal=p.precio * cantidad)
        Pedido.objects.filter(id=pedido.id).update(creado_en=fecha)
    return orden
