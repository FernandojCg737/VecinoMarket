# -*- coding: utf-8 -*-
"""Punto 5 (Sprint_2): reportes dinamicos.

A diferencia del dashboard fijo (`_secciones_dashboard_empresa` /
`_secciones_dashboard_admin` en views.py, que siempre arma las mismas 3
tablas), aqui el usuario elige en tiempo real: que dataset consultar, que
columnas incluir, un rango de fechas y (opcionalmente) 1-2 filtros extra.

Por seguridad NO se arma la consulta a partir de texto libre del usuario --
cada dataset expone un catalogo cerrado de columnas y filtros permitidos
(REGISTRY), y solo esas claves se aceptan. Dentro de ese catalogo, sin
embargo, la combinacion de columnas/filtros/fechas es libre.
"""
from datetime import date, datetime
from decimal import Decimal

from apps.catalogo.models import Producto
from apps.facturacion.models import Factura
from apps.pedidos.models import OrdenCompra, Pedido
from apps.usuarios.models import Empresa

MAX_FILAS = 2000


def _col(orm_path, etiqueta):
    return {'orm_path': orm_path, 'etiqueta': etiqueta}


def _filtro(orm_path, etiqueta, opciones):
    return {'orm_path': orm_path, 'etiqueta': etiqueta, 'opciones': opciones}


REGISTRY = {
    'pedidos': {
        'etiqueta': 'Pedidos y ventas',
        'permiso': 'gestionar_pedidos',
        'modelo': Pedido,
        'tenant_field': 'empresa_id',
        'fecha_field': 'creado_en',
        'columnas': {
            'numero_pedido': _col('numero_pedido', 'N° Pedido'),
            'fecha': _col('creado_en', 'Fecha'),
            'cliente': _col('orden_compra__comprador__usuario__nombre', 'Cliente'),
            'estado': _col('estado', 'Estado del pedido'),
            'estado_pago': _col('orden_compra__estado_pago', 'Estado de pago'),
            'modalidad_entrega': _col('modalidad_entrega', 'Modalidad de entrega'),
            'subtotal': _col('subtotal', 'Subtotal (Bs)'),
            'comision': _col('comision_monto', 'Comisión (Bs)'),
        },
        'filtros': {
            'estado': _filtro('estado', 'Estado del pedido', list(Pedido.Estado.choices)),
            'estado_pago': _filtro('orden_compra__estado_pago', 'Estado de pago', list(OrdenCompra.EstadoPago.choices)),
        },
    },
    'productos': {
        'etiqueta': 'Productos',
        'permiso': 'gestionar_productos',
        'modelo': Producto,
        'tenant_field': 'empresa_id',
        'fecha_field': 'creado_en',
        'columnas': {
            'nombre': _col('nombre', 'Nombre'),
            'sku': _col('sku', 'SKU'),
            'categoria': _col('categoria__nombre', 'Categoría'),
            'precio': _col('precio', 'Precio (Bs)'),
            'precio_descuento': _col('precio_descuento', 'Precio con descuento (Bs)'),
            'estado': _col('estado', 'Estado'),
            'fecha': _col('creado_en', 'Fecha de creación'),
        },
        'filtros': {
            'estado': _filtro('estado', 'Estado', list(Producto.Estado.choices)),
        },
    },
    'facturas': {
        'etiqueta': 'Facturas',
        'permiso': 'gestionar_facturacion',
        'modelo': Factura,
        'tenant_field': 'empresa_id',
        'fecha_field': 'creado_en',
        'columnas': {
            'tipo': _col('tipo', 'Tipo'),
            'monto': _col('monto', 'Monto (Bs)'),
            'estado_pago': _col('estado_pago', 'Estado'),
            'periodo_desde': _col('periodo_desde', 'Periodo desde'),
            'periodo_hasta': _col('periodo_hasta', 'Periodo hasta'),
            'fecha_pago': _col('fecha_pago', 'Fecha de pago'),
            'fecha': _col('creado_en', 'Fecha de emisión'),
        },
        'filtros': {
            'tipo': _filtro('tipo', 'Tipo', list(Factura.Tipo.choices)),
            'estado_pago': _filtro('estado_pago', 'Estado', list(Factura.EstadoPago.choices)),
        },
    },
}

# Dataset extra, solo visible para el SuperAdmin/Admin (no tiene tenant_field:
# es información de la plataforma completa, no de una empresa puntual).
REGISTRY_ADMIN_EXTRA = {
    'empresas': {
        'etiqueta': 'Empresas',
        'permiso': None,
        'modelo': Empresa,
        'tenant_field': None,
        'fecha_field': 'creado_en',
        'columnas': {
            'razon_social': _col('razon_social', 'Empresa'),
            'nit': _col('nit', 'NIT'),
            'ciudad': _col('ciudad', 'Ciudad'),
            'departamento': _col('departamento', 'Departamento'),
            'plan': _col('plan__nombre', 'Plan'),
            'estado': _col('estado', 'Estado'),
            'fecha': _col('creado_en', 'Fecha de registro'),
        },
        'filtros': {
            'estado': _filtro('estado', 'Estado', list(Empresa.Estado.choices)),
        },
    },
}


def _formatear_valor(valor):
    if valor is None:
        return ''
    if isinstance(valor, Decimal):
        return f'{valor:.2f}'
    if isinstance(valor, datetime):
        return valor.strftime('%d/%m/%Y %H:%M')
    if isinstance(valor, date):
        return valor.strftime('%d/%m/%Y')
    return str(valor)


def catalogo(incluir_admin_extra=False):
    """Metadata de los datasets disponibles (para que el frontend arme el
    formulario: columnas y filtros posibles de cada uno)."""
    registro = dict(REGISTRY)
    if incluir_admin_extra:
        registro.update(REGISTRY_ADMIN_EXTRA)
    salida = []
    for clave, cfg in registro.items():
        salida.append({
            'clave': clave,
            'etiqueta': cfg['etiqueta'],
            'permiso': cfg['permiso'],
            'columnas': [{'clave': k, 'etiqueta': v['etiqueta']} for k, v in cfg['columnas'].items()],
            'filtros': [
                {'clave': k, 'etiqueta': v['etiqueta'], 'opciones': [{'valor': val, 'etiqueta': lbl} for val, lbl in v['opciones']]}
                for k, v in cfg['filtros'].items()
            ],
        })
    return salida


def generar(dataset_key, columnas_solicitadas, empresa_id=None, fecha_inicio=None, fecha_fin=None,
            filtros_extra=None, incluir_admin_extra=False):
    """Devuelve (headers, filas) para el dataset pedido, aplicando los
    filtros dados. Lanza KeyError si el dataset o alguna columna/filtro no
    está en el catálogo permitido (nunca se ejecuta un campo arbitrario)."""
    registro = dict(REGISTRY)
    if incluir_admin_extra:
        registro.update(REGISTRY_ADMIN_EXTRA)
    cfg = registro[dataset_key]

    columnas_validas = [c for c in columnas_solicitadas if c in cfg['columnas']] or list(cfg['columnas'].keys())

    qs = cfg['modelo'].objects.all()
    if cfg['tenant_field'] and empresa_id is not None:
        qs = qs.filter(**{cfg['tenant_field']: empresa_id})
    if fecha_inicio:
        qs = qs.filter(**{f"{cfg['fecha_field']}__date__gte": fecha_inicio})
    if fecha_fin:
        qs = qs.filter(**{f"{cfg['fecha_field']}__date__lte": fecha_fin})

    for clave, valor in (filtros_extra or {}).items():
        filtro_cfg = cfg['filtros'].get(clave)
        if not filtro_cfg or not valor:
            continue
        valores_permitidos = {v for v, _ in filtro_cfg['opciones']}
        if valor in valores_permitidos:
            qs = qs.filter(**{filtro_cfg['orm_path']: valor})

    orm_paths = [cfg['columnas'][c]['orm_path'] for c in columnas_validas]
    headers = [cfg['columnas'][c]['etiqueta'] for c in columnas_validas]

    filas_qs = qs.order_by(f"-{cfg['fecha_field']}").values(*orm_paths)[:MAX_FILAS]
    filas = [[_formatear_valor(row[path]) for path in orm_paths] for row in filas_qs]

    return headers, filas
