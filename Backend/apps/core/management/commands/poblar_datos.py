"""
Pobla la base de datos con datos de prueba realistas para poder probar la
app manualmente (frontend, admin de Django, endpoints). Es seguro correrlo
más de una vez: usa get_or_create/update_or_create con claves naturales
(email, slug, nombre, numero_pedido, etc.) así que no duplica datos.

Uso:
    python manage.py poblar_datos
    python manage.py poblar_datos --password OtraClave123!
"""
import random
from datetime import timedelta
from decimal import Decimal

from django.contrib.gis.geos import Point
from django.core.management.base import BaseCommand
from django.db import connection, transaction
from django.utils import timezone

from apps.catalogo.models import Categoria, CategorizacionIALog, Producto, ProductoImagen
from apps.comunicacion.models import ChatConversacion, ChatMensaje, ChatbotInteraccion
from apps.facturacion.models import ComisionVenta, Factura
from apps.inventario.models import InventarioSucursal, Sucursal
from apps.notificaciones.models import Notificacion
from apps.pedidos.models import Entrega, OrdenCompra, Pago, Pedido, PedidoItem
from apps.promociones.models import Promocion, PromocionProducto
from apps.reportes.models import RecomendacionIA, Valoracion
from apps.suscripciones.models import Plan, Suscripcion
from apps.usuarios.models import (
    Comprador,
    Direccion,
    Empleado,
    EmpleadoPermiso,
    Empresa,
    Permiso,
    RolBase,
    RolBasePermiso,
    Usuario,
)

PASSWORD_DEFAULT = 'VecinoTest1234!'

CIUDADES = [
    ('La Paz', 'La Paz', -16.5000, -68.1500),
    ('Santa Cruz de la Sierra', 'Santa Cruz', -17.7833, -63.1821),
    ('Cochabamba', 'Cochabamba', -17.3895, -66.1568),
]

CATEGORIAS = [
    ('panaderia', 'Panadería y repostería', 'Croissant'),
    ('abarrotes', 'Abarrotes', 'ShoppingBasket'),
    ('ropa', 'Ropa y accesorios', 'Shirt'),
    ('hogar', 'Hogar y decoración', 'Sofa'),
    ('belleza', 'Belleza y cuidado personal', 'Sparkles'),
    ('tecnologia', 'Tecnología', 'Laptop'),
    ('mascotas', 'Mascotas', 'PawPrint'),
    ('artesania', 'Artesanía local', 'Palette'),
    ('ferreteria', 'Ferretería', 'Wrench'),
    ('juguetes', 'Juguetes', 'Blocks'),
]

# slug, razón social, categoría principal, índice de ciudad (0=La Paz, 1=Santa Cruz, 2=Cochabamba)
EMPRESAS = [
    ('panaderia-dona-ana', 'Panadería Doña Ana', 'panaderia', 0),
    ('reposteria-sabor-local', 'Repostería Sabor Local', 'panaderia', 0),
    ('abarrotes-el-vecino', 'Abarrotes El Vecino', 'abarrotes', 0),
    ('cafe-de-los-yungas', 'Café de los Yungas', 'abarrotes', 0),
    ('textiles-andinos', 'Textiles Andinos', 'ropa', 2),
    ('ropa-consciente-bolivia', 'Ropa Consciente Bolivia', 'ropa', 1),
    ('casa-calida', 'Casa Cálida', 'hogar', 1),
    ('ceramica-wari', 'Cerámica Wari', 'artesania', 2),
    ('cosmetica-natural-la-paz', 'Cosmética Natural La Paz', 'belleza', 0),
    ('techbo-accesorios', 'TechBo Accesorios', 'tecnologia', 1),
    ('mascotas-felices', 'Mascotas Felices', 'mascotas', 2),
    ('ferreteria-san-pedro', 'Ferretería San Pedro', 'ferreteria', 0),
    ('juguetes-madera-boliviana', 'Juguetes de Madera Boliviana', 'juguetes', 2),
]

# empresa_slug, nombre, categoria_id, precio, precio_descuento, stock, descripcion
PRODUCTOS = [
    ('panaderia-dona-ana', 'Pan integral artesanal (bolsa x6)', 'panaderia', 18, None, 40, 'Pan integral horneado a diario con harina 100% integral y sin conservantes.'),
    ('panaderia-dona-ana', 'Empanadas de queso (docena)', 'panaderia', 24, None, 30, 'Empanadas horneadas rellenas de queso criollo.'),
    ('reposteria-sabor-local', 'Torta de chocolate (porción familiar)', 'panaderia', 65, 55, 12, 'Torta húmeda de chocolate con cobertura de ganache.'),
    ('abarrotes-el-vecino', 'Arroz integral (5kg)', 'abarrotes', 42, None, 60, 'Arroz integral de grano largo, empacado al vacío.'),
    ('abarrotes-el-vecino', 'Aceite de girasol (900ml)', 'abarrotes', 16, Decimal('13.5'), 75, 'Aceite vegetal de girasol, botella de 900ml.'),
    ('cafe-de-los-yungas', 'Café molido orgánico (500g)', 'abarrotes', 38, None, 25, 'Café 100% arábica, cultivado y tostado localmente.'),
    ('textiles-andinos', 'Chompa de alpaca unisex', 'ropa', 180, 150, 18, 'Chompa tejida a mano con lana de alpaca.'),
    ('textiles-andinos', 'Gorro de lana tejido', 'ropa', 35, None, 33, 'Gorro de lana con diseño tradicional, tejido a mano.'),
    ('ropa-consciente-bolivia', 'Polera de algodón orgánico', 'ropa', 55, None, 50, 'Polera básica de algodón 100% orgánico.'),
    ('casa-calida', 'Set de velas aromáticas (x3)', 'hogar', 48, 39, 22, 'Velas de soya con aromas de lavanda, vainilla y sándalo.'),
    ('ceramica-wari', 'Maceta de cerámica pintada a mano', 'hogar', 60, None, 15, 'Maceta mediana de cerámica, pintada a mano con motivos andinos.'),
    ('ceramica-wari', 'Tejido de tapiz andino (pequeño)', 'artesania', 130, None, 8, 'Tapiz decorativo tejido a mano con diseños tradicionales.'),
    ('cosmetica-natural-la-paz', 'Jabón artesanal de miel y avena', 'belleza', 12, None, 90, 'Jabón artesanal hecho a mano con ingredientes naturales.'),
    ('cosmetica-natural-la-paz', 'Aceite esencial de eucalipto', 'belleza', 22, 18, 40, 'Aceite esencial 100% puro, frasco de 30ml.'),
    ('techbo-accesorios', 'Funda protectora para laptop 15"', 'tecnologia', 45, None, 28, 'Funda acolchada resistente al agua.'),
    ('techbo-accesorios', 'Audífonos inalámbricos', 'tecnologia', 120, 99, 17, 'Audífonos Bluetooth con cancelación de ruido básica.'),
    ('mascotas-felices', 'Cama para perro mediana', 'mascotas', 85, None, 14, 'Cama acolchada lavable para perros medianos.'),
    ('mascotas-felices', 'Snacks naturales para gato (bolsa)', 'mascotas', 20, None, 60, 'Snacks de pollo deshidratado, sin conservantes.'),
    ('ferreteria-san-pedro', 'Set de destornilladores (12 piezas)', 'ferreteria', 65, 55, 24, 'Set de destornilladores con puntas intercambiables.'),
    ('ferreteria-san-pedro', 'Candado de seguridad reforzado', 'ferreteria', 40, None, 35, 'Candado de acero reforzado con 3 llaves.'),
    ('juguetes-madera-boliviana', 'Rompecabezas de madera (100 piezas)', 'juguetes', 48, None, 20, 'Rompecabezas educativo hecho de madera reciclada.'),
    ('juguetes-madera-boliviana', 'Set de bloques de construcción', 'juguetes', 70, 60, 16, 'Bloques de madera natural, seguros y sin pintura tóxica.'),
]

PERMISOS = [
    ('gestionar_productos', 'Crear, editar y desactivar productos del catálogo'),
    ('gestionar_inventario', 'Actualizar stock en sucursales'),
    ('gestionar_pedidos', 'Ver y actualizar el estado de los pedidos'),
    ('gestionar_promociones', 'Crear y gestionar promociones y live commerce'),
    ('gestionar_chat', 'Responder conversaciones con compradores'),
    ('ver_reportes', 'Ver reportes y estadísticas de ventas'),
    ('gestionar_pagos', 'Configurar los métodos de pago de la empresa (QR, cuenta bancaria, pasarela)'),
    ('gestionar_facturacion', 'Ver, editar, eliminar y exportar las facturas y comisiones de la empresa'),
]

ROLES_BASE = [
    ('Encargado de catálogo', ['gestionar_productos', 'gestionar_inventario']),
    ('Encargado de pedidos', ['gestionar_pedidos', 'gestionar_inventario']),
    ('Atención al cliente', ['gestionar_chat', 'gestionar_pedidos']),
]

COMPRADORES = [
    ('María', 'Quispe', 0), ('Jorge', 'Mamani', 0),
    ('Fernanda', 'Rojas', 1), ('Carlos', 'Vargas', 1),
    ('Lucía', 'Fernández', 2), ('Diego', 'Choque', 2),
    ('Andrea', 'Paredes', 0), ('Sergio', 'Callisaya', 1),
]


# Palabras clave verificadas manualmente para que loremflickr.com filtre
# fotos relacionadas al producto (a diferencia de picsum.photos, que da fotos
# totalmente al azar sin relación). OJO: loremflickr falla con 500 de forma
# intermitente y aleatoria (no son estas palabras puntuales las rotas, es el
# servicio en si) — es una decisión consciente priorizar que la foto tenga
# relación con el producto por sobre el 100% de disponibilidad. Sin `lock=1`
# para que una corrida nueva del seed pueda traer otra foto si la anterior
# quedó fallando.
IMAGEN_KEYWORDS = {
    'Pan integral artesanal (bolsa x6)': 'wholewheat,bread,loaf',
    'Empanadas de queso (docena)': 'empanada,pastry',
    'Torta de chocolate (porción familiar)': 'cake,slice',
    'Arroz integral (5kg)': 'rice,grain',
    'Aceite de girasol (900ml)': 'cooking,oil,bottle',
    'Café molido orgánico (500g)': 'roasted,coffee,beans',
    'Chompa de alpaca unisex': 'wool,sweater',
    'Gorro de lana tejido': 'winter,hat,knit',
    'Polera de algodón orgánico': 'tshirt,cotton',
    'Set de velas aromáticas (x3)': 'scented,candles',
    'Maceta de cerámica pintada a mano': 'clay,pot,painted',
    'Tejido de tapiz andino (pequeño)': 'woven,tapestry,textile',
    'Jabón artesanal de miel y avena': 'olive,soap',
    'Aceite esencial de eucalipto': 'eucalyptus,leaves',
    'Funda protectora para laptop 15"': 'laptop,bag',
    'Audífonos inalámbricos': 'wireless,headphones',
    'Cama para perro mediana': 'dog,bed',
    'Snacks naturales para gato (bolsa)': 'cat,food',
    'Set de destornilladores (12 piezas)': 'toolbox',
    'Candado de seguridad reforzado': 'security,lock',
    'Rompecabezas de madera (100 piezas)': 'wooden,puzzle',
    'Set de bloques de construcción': 'building,blocks',
}


def img_url(nombre):
    keyword = IMAGEN_KEYWORDS.get(nombre, 'shopping,product')
    return f'https://picsum.photos/seed/{keyword}/600/600'


class Command(BaseCommand):
    help = 'Pobla la base de datos con empresas, productos, pedidos, etc. de prueba.'

    def add_arguments(self, parser):
        parser.add_argument('--password', default=PASSWORD_DEFAULT)

    def handle(self, *args, **options):
        password = options['password']
        with transaction.atomic():
            permisos = self._seed_permisos_y_roles()
            plan = self._seed_planes()
            categorias = self._seed_categorias()
            empresas = self._seed_empresas(password, plan)
            self._seed_empleados(empresas, permisos, password)
            sucursales = self._seed_sucursales(empresas)
            productos = self._seed_productos(empresas, categorias, sucursales)
            compradores = self._seed_compradores(password)
            self._seed_promociones(empresas, productos)
            pedidos = self._seed_pedidos(compradores, empresas, productos, sucursales)
            self._seed_valoraciones(pedidos, compradores)
            self._seed_chat(compradores, empresas)
            self._seed_notificaciones(compradores, empresas)
            self._seed_recomendaciones(compradores, productos)

        self.stdout.write(self.style.SUCCESS('\nBase de datos poblada correctamente.'))
        self.stdout.write(f'Password de todos los usuarios de prueba: {password}')
        self.stdout.write('\nAlgunos logins de ejemplo:')
        self.stdout.write('  admin@vecinomarket.com          (ADMIN, ya existía)')
        self.stdout.write('  panaderia-dona-ana@vecinomarket.com   (EMPRESA)')
        self.stdout.write('  empleado1.panaderia-dona-ana@vecinomarket.com (EMPLEADO)')
        self.stdout.write('  comprador1@vecinomarket.com      (COMPRADOR)')

    # -----------------------------------------------------------------
    def _seed_permisos_y_roles(self):
        permisos = {}
        for codigo, descripcion in PERMISOS:
            permiso, _ = Permiso.objects.get_or_create(codigo=codigo, defaults={'descripcion': descripcion})
            permisos[codigo] = permiso

        for nombre, codigos in ROLES_BASE:
            rol_base, _ = RolBase.objects.get_or_create(nombre=nombre)
            for codigo in codigos:
                RolBasePermiso.objects.get_or_create(rol_base=rol_base, permiso=permisos[codigo])

        self.stdout.write(f'Permisos: {len(permisos)} · Roles base: {len(ROLES_BASE)}')
        return permisos

    def _seed_planes(self):
        """CU01: usa los 3 planes canónicos de autoservicio (sembrados por la
        migración de datos 0006, identificados por 'codigo') en vez de crear
        planes de demo aparte — antes este método creaba 'Plan Básico'/'Plan
        Premium' como filas propias, que terminaban duplicando (incluso con
        el mismo precio) a los planes reales que ve el admin al asignar
        suscripción."""
        return Plan.objects.get(codigo='BASICO')

    def _seed_categorias(self):
        categorias = {}
        for cid, nombre, icono in CATEGORIAS:
            cat, _ = Categoria.objects.get_or_create(nombre=nombre, defaults={'icono': icono})
            categorias[cid] = cat
        self.stdout.write(f'Categorías: {len(categorias)}')
        return categorias

    def _seed_empresas(self, password, plan):
        empresas = {}
        hoy = timezone.now().date()
        for idx, (slug, razon_social, _cat, ciudad_idx) in enumerate(EMPRESAS):
            ciudad, departamento, lat, lon = CIUDADES[ciudad_idx]
            email = f'{slug}@vecinomarket.com'
            usuario, creado = Usuario.objects.get_or_create(
                email=email,
                defaults={'nombre': razon_social, 'rol': Usuario.Rol.EMPRESA},
            )
            if creado:
                usuario.set_password(password)
                usuario.save(update_fields=['password'])

            jitter = lambda: random.uniform(-0.03, 0.03)
            empresa, creada = Empresa.objects.get_or_create(
                slug=slug,
                defaults={
                    'usuario_dueno': usuario,
                    'razon_social': razon_social,
                    'nit': f'{random.randint(1000000000, 9999999999)}',
                    'descripcion': f'Emprendimiento local de {razon_social}, vendiendo en VecinoMarket.',
                    'ubicacion': Point(lon + jitter(), lat + jitter(), srid=4326),
                    'departamento': departamento,
                    'ciudad': ciudad,
                    'plan': plan,
                    'color_marca': '#D85A30',
                },
            )
            # CU20: Duración coherente según el plan (30 días para Básico).
            # Distribuimos la fecha de inicio dentro de los últimos 20 días para que
            # queden entre 10 y 25 días restantes dentro del ciclo de 30 días.
            duracion = plan.duracion_dias or 30
            dias_inicio = (idx * 2 + 5) % 22
            inicio_suscripcion = hoy - timedelta(days=dias_inicio)
            vencimiento_suscripcion = inicio_suscripcion + timedelta(days=duracion)

            Suscripcion.objects.update_or_create(
                empresa=empresa,
                defaults={
                    'plan': plan,
                    'fecha_inicio': inicio_suscripcion,
                    'fecha_vencimiento': vencimiento_suscripcion,
                    'estado': Suscripcion.Estado.ACTIVA,
                },
            )
            Factura.objects.get_or_create(
                empresa=empresa,
                tipo=Factura.Tipo.SUSCRIPCION,
                periodo_desde=inicio_suscripcion,
                periodo_hasta=vencimiento_suscripcion,
                defaults={
                    'monto': plan.precio_mensual,
                    'estado_pago': Factura.EstadoPago.PAGADA,
                    'fecha_pago': timezone.now() - timedelta(days=dias_inicio),
                },
            )
            empresas[slug] = empresa
        self.stdout.write(f'Empresas: {len(empresas)}')
        return empresas

    def _seed_empleados(self, empresas, permisos, password):
        total = 0
        codigos = list(permisos.keys())
        for slug, empresa in empresas.items():
            for i in range(1, 2):
                email = f'empleado{i}.{slug}@vecinomarket.com'
                usuario, creado = Usuario.objects.get_or_create(
                    email=email,
                    defaults={'nombre': f'Empleado {i} de {empresa.razon_social}', 'rol': Usuario.Rol.EMPLEADO},
                )
                if creado:
                    usuario.set_password(password)
                    usuario.save(update_fields=['password'])
                empleado, _ = Empleado.objects.get_or_create(
                    usuario=usuario, empresa=empresa, defaults={'cargo': 'Vendedor'}
                )
                for codigo in random.sample(codigos, k=2):
                    EmpleadoPermiso.objects.get_or_create(empleado=empleado, permiso=permisos[codigo])
                total += 1
        self.stdout.write(f'Empleados: {total}')

    def _seed_sucursales(self, empresas):
        sucursales = {}
        for slug, empresa in empresas.items():
            ciudad, departamento, lat, lon = next(
                (c for c in CIUDADES if c[0] == empresa.ciudad), CIUDADES[0]
            )
            sucursal, _ = Sucursal.objects.get_or_create(
                empresa=empresa,
                nombre=f'{empresa.razon_social} - Tienda principal',
                defaults={
                    'direccion_texto': f'Av. Principal, {ciudad}',
                    'ubicacion': Point(lon, lat, srid=4326),
                    'telefono': f'7{random.randint(1000000, 9999999)}',
                },
            )
            sucursales[slug] = sucursal
        self.stdout.write(f'Sucursales: {len(sucursales)}')
        return sucursales

    def _seed_productos(self, empresas, categorias, sucursales):
        productos = []
        for slug, nombre, cat_id, precio, precio_descuento, stock, descripcion in PRODUCTOS:
            empresa = empresas[slug]
            producto, _ = Producto.objects.get_or_create(
                empresa=empresa,
                nombre=nombre,
                defaults={
                    'categoria': categorias[cat_id],
                    'descripcion': descripcion,
                    'sku': f'SKU-{random.randint(10000, 99999)}',
                    'precio': Decimal(precio),
                    'precio_descuento': Decimal(precio_descuento) if precio_descuento else None,
                },
            )
            ProductoImagen.objects.update_or_create(
                producto=producto, orden=1, defaults={'url': img_url(nombre)}
            )
            InventarioSucursal.objects.get_or_create(
                producto=producto,
                sucursal=sucursales[slug],
                defaults={'cantidad_disponible': stock, 'stock_minimo': max(5, stock // 10)},
            )
            if random.random() < 0.3:
                CategorizacionIALog.objects.get_or_create(
                    producto=producto,
                    defaults={'categoria_sugerida': categorias[cat_id], 'confianza': Decimal('0.92')},
                )
            productos.append(producto)
        self.stdout.write(f'Productos: {len(productos)}')
        return productos

    def _seed_compradores(self, password):
        compradores = []
        for i, (nombre, apellido, ciudad_idx) in enumerate(COMPRADORES, start=1):
            ciudad, departamento, lat, lon = CIUDADES[ciudad_idx]
            email = f'comprador{i}@vecinomarket.com'
            usuario, creado = Usuario.objects.get_or_create(
                email=email,
                defaults={'nombre': nombre, 'apellido': apellido, 'rol': Usuario.Rol.COMPRADOR},
            )
            if creado:
                usuario.set_password(password)
                usuario.save(update_fields=['password'])
            comprador, _ = Comprador.objects.get_or_create(
                usuario=usuario,
                defaults={'departamento': departamento, 'ubicacion_default': Point(lon, lat, srid=4326)},
            )
            Direccion.objects.get_or_create(
                comprador=comprador,
                alias='Casa',
                defaults={
                    'direccion_texto': f'Calle {random.randint(1, 30)} #{random.randint(100, 999)}, {ciudad}',
                    'ubicacion': Point(lon + random.uniform(-0.01, 0.01), lat + random.uniform(-0.01, 0.01), srid=4326),
                    'departamento': departamento,
                    'ciudad': ciudad,
                    'es_predeterminada': True,
                },
            )
            compradores.append(comprador)
        self.stdout.write(f'Compradores: {len(compradores)}')
        return compradores

    def _seed_promociones(self, empresas, productos):
        ahora = timezone.now()
        total = 0
        for slug in ['panaderia-dona-ana', 'techbo-accesorios', 'textiles-andinos']:
            empresa = empresas[slug]
            promo, creada = Promocion.objects.get_or_create(
                empresa=empresa,
                nombre=f'Promo de temporada — {empresa.razon_social}',
                defaults={
                    'tipo': Promocion.Tipo.PORCENTAJE,
                    'valor': Decimal('15.00'),
                    'fecha_inicio': ahora - timedelta(days=2),
                    'fecha_fin': ahora + timedelta(days=12),
                },
            )
            for producto in [p for p in productos if p.empresa_id == empresa.id][:2]:
                PromocionProducto.objects.get_or_create(promocion=promo, producto=producto)
            total += 1
        self.stdout.write(f'Promociones: {total}')

    def _seed_pedidos(self, compradores, empresas, productos, sucursales):
        pedidos = []
        estados_flujo = [
            Pedido.Estado.PENDIENTE,
            Pedido.Estado.CONFIRMADO,
            Pedido.Estado.EN_PREPARACION,
            Pedido.Estado.ENVIADO,
            Pedido.Estado.ENTREGADO,
            Pedido.Estado.ENTREGADO,
            Pedido.Estado.CANCELADO,
        ]
        productos_por_empresa = {}
        for p in productos:
            productos_por_empresa.setdefault(p.empresa_id, []).append(p)

        for i, estado in enumerate(estados_flujo, start=1):
            comprador = compradores[i % len(compradores)]
            empresa_slug = list(empresas.keys())[i % len(empresas)]
            empresa = empresas[empresa_slug]
            items_posibles = productos_por_empresa.get(empresa.id, [])
            if not items_posibles:
                continue
            elegidos = random.sample(items_posibles, k=min(2, len(items_posibles)))

            subtotal = sum((p.precio_descuento or p.precio) * random.randint(1, 3) for p in elegidos)
            comision = (subtotal * Decimal('0.035')).quantize(Decimal('0.01'))

            numero_pedido = f'VM-{100000 + i}'
            modalidad = Pedido.ModalidadEntrega.ENVIO_DOMICILIO if i % 2 == 0 else Pedido.ModalidadEntrega.RECOJO_TIENDA
            direccion = comprador.direcciones.first() if modalidad == Pedido.ModalidadEntrega.ENVIO_DOMICILIO else None
            sucursal = sucursales[empresa_slug] if modalidad == Pedido.ModalidadEntrega.RECOJO_TIENDA else None

            orden, _ = OrdenCompra.objects.get_or_create(
                comprador=comprador,
                monto_total=subtotal,
                metodo_pago=OrdenCompra.MetodoPago.QR if i % 2 == 0 else OrdenCompra.MetodoPago.TARJETA,
                defaults={'estado_pago': OrdenCompra.EstadoPago.PAGADO if estado != Pedido.Estado.CANCELADO else OrdenCompra.EstadoPago.FALLIDO},
            )
            Pago.objects.get_or_create(
                orden_compra=orden,
                defaults={
                    'monto': subtotal,
                    'metodo': orden.metodo_pago,
                    'referencia_pasarela': f'PSP-{random.randint(100000, 999999)}',
                    'estado': Pago.Estado.APROBADO if estado != Pedido.Estado.CANCELADO else Pago.Estado.RECHAZADO,
                    'fecha_pago': timezone.now() - timedelta(days=random.randint(1, 20)),
                },
            )

            pedido, creado = Pedido.objects.get_or_create(
                numero_pedido=numero_pedido,
                defaults={
                    'orden_compra': orden,
                    'empresa': empresa,
                    'subtotal': subtotal,
                    'comision_monto': comision,
                    'estado': estado,
                    'modalidad_entrega': modalidad,
                    'sucursal_recojo': sucursal,
                    'direccion_envio': direccion,
                },
            )
            if creado:
                for producto in elegidos:
                    precio_unitario = producto.precio_descuento or producto.precio
                    cantidad = random.randint(1, 3)
                    PedidoItem.objects.create(
                        pedido=pedido,
                        producto=producto,
                        cantidad=cantidad,
                        precio_unitario=precio_unitario,
                        subtotal=precio_unitario * cantidad,
                    )

            entrega_estado = {
                Pedido.Estado.PENDIENTE: Entrega.Estado.PENDIENTE,
                Pedido.Estado.CONFIRMADO: Entrega.Estado.PENDIENTE,
                Pedido.Estado.EN_PREPARACION: Entrega.Estado.PENDIENTE,
                Pedido.Estado.ENVIADO: Entrega.Estado.EN_CAMINO,
                Pedido.Estado.ENTREGADO: Entrega.Estado.ENTREGADA,
                Pedido.Estado.CANCELADO: Entrega.Estado.CANCELADA,
            }[estado]
            Entrega.objects.get_or_create(
                pedido=pedido,
                defaults={
                    'estado': entrega_estado,
                    'fecha_estimada': timezone.now().date() + timedelta(days=3),
                    'fecha_entregada': timezone.now() - timedelta(days=1) if entrega_estado == Entrega.Estado.ENTREGADA else None,
                },
            )

            if estado == Pedido.Estado.ENTREGADO:
                ComisionVenta.objects.get_or_create(
                    pedido=pedido,
                    empresa=empresa,
                    defaults={
                        'monto_venta': subtotal,
                        'porcentaje_aplicado': Decimal('3.5'),
                        'monto_comision': comision,
                    },
                )

            pedidos.append((pedido, comprador))

        # Estos numero_pedido son fijos (VM-100001, VM-100002, ...) a propósito,
        # para que re-correr este comando sea idempotente (get_or_create de
        # arriba). Pero eso deja a seq_numero_pedido -- la que sí usa el
        # checkout real, ver fn_generar_numero_pedido() -- sin enterarse de
        # que esos números ya están tomados, y tarde o temprano un pedido real
        # choca con uno sembrado (IntegrityError). Sincronizarla acá evita esa
        # colisión sin sacrificar la idempotencia del sembrado.
        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT setval('seq_numero_pedido', "
                "GREATEST(100001, (SELECT COALESCE(MAX(SUBSTRING(numero_pedido FROM '[0-9]+$')::bigint), 100000) "
                "FROM pedidos_pedido) + 1), false)"
            )

        self.stdout.write(f'Pedidos: {len(pedidos)}')
        return pedidos

    def _seed_valoraciones(self, pedidos, compradores):
        total = 0
        for pedido, comprador in pedidos:
            if pedido.estado != Pedido.Estado.ENTREGADO:
                continue
            Valoracion.objects.get_or_create(
                pedido=pedido,
                defaults={
                    'comprador': comprador,
                    'empresa': pedido.empresa,
                    'calificacion': random.randint(4, 5),
                    'comentario': 'Muy buena atención, todo llegó a tiempo.',
                },
            )
            total += 1
        self.stdout.write(f'Valoraciones: {total}')

    def _seed_chat(self, compradores, empresas):
        total_conv = 0
        for comprador in compradores[:4]:
            slug = random.choice(list(empresas.keys()))
            empresa = empresas[slug]
            conversacion, _ = ChatConversacion.objects.get_or_create(
                comprador=comprador, empresa=empresa,
            )
            ChatMensaje.objects.get_or_create(
                conversacion=conversacion,
                emisor_usuario=comprador.usuario,
                contenido='Hola, ¿tienen stock de este producto?',
                defaults={'tipo': ChatMensaje.Tipo.TEXTO},
            )
            ChatMensaje.objects.get_or_create(
                conversacion=conversacion,
                emisor_usuario=empresa.usuario_dueno,
                contenido='¡Hola! Sí, tenemos disponible. ¿Cuántas unidades necesitas?',
                defaults={'tipo': ChatMensaje.Tipo.TEXTO},
            )
            total_conv += 1

        ChatbotInteraccion.objects.get_or_create(
            comprador=compradores[0],
            pregunta='¿Cómo hago un pedido?',
            defaults={'respuesta': 'Agrega productos al carrito y sigue los pasos de pago en el checkout.'},
        )
        self.stdout.write(f'Conversaciones de chat: {total_conv}')

    def _seed_notificaciones(self, compradores, empresas):
        total = 0
        for comprador in compradores[:5]:
            Notificacion.objects.get_or_create(
                usuario=comprador.usuario,
                tipo='PEDIDO_ENVIADO',
                titulo='Tu pedido va en camino',
                defaults={'mensaje': 'Tu pedido fue enviado y llegará pronto.', 'enlace': '/pedidos'},
            )
            total += 1
        for empresa in list(empresas.values())[:3]:
            Notificacion.objects.get_or_create(
                usuario=empresa.usuario_dueno,
                tipo='PLAN_POR_VENCER',
                titulo='Tu suscripción vence pronto',
                defaults={'mensaje': 'Renueva tu plan para seguir vendiendo sin interrupciones.', 'enlace': '/suscripcion'},
            )
            total += 1
        self.stdout.write(f'Notificaciones: {total}')

    def _seed_recomendaciones(self, compradores, productos):
        total = 0
        for comprador in compradores[:5]:
            for producto in random.sample(productos, k=3):
                RecomendacionIA.objects.get_or_create(
                    comprador=comprador,
                    producto=producto,
                    defaults={'score': Decimal(f'0.{random.randint(50, 99)}')},
                )
                total += 1
        self.stdout.write(f'Recomendaciones IA: {total}')
