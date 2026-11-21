"""
Genera historial sintético realista para la demo de IA (CU1–CU3): eventos
de navegación (VISTA / BUSQUEDA / CARRITO) y compras pagadas repartidas en
las últimas N semanas, con:

- compradores con 1–3 categorías preferidas y distinto nivel de actividad;
- categorías "en alza" y "en baja" (para que CU3 tenga tendencias visibles);
- días y horas pico (fines de semana, mediodía y noche);
- compras complementarias entre categorías (señal para el filtrado
  colaborativo, más allá de "misma categoría");
- búsquedas sin resultados (términos que el catálogo no tiene);
- visitantes anónimos (comprador nulo);
- valoraciones sobre pedidos entregados (reputación de CU2).

Además asegura que cada empresa con plan de IA tenga una suscripción ACTIVA
y vigente (sin eso, CU1/CU2/CU3 la excluyen).

Requiere haber corrido antes `poblar_datos` (empresas, productos con stock,
sucursales). Todo lo sintético queda identificable para poder borrarlo:
compradores `demo.ia*@vecinomarket.com` y pedidos `DEMO-IA-*`.

Uso:
    python manage.py seed_interacciones
    python manage.py seed_interacciones --reset --compradores 60 --semanas 12 --semilla 7

OJO: --reset borra TODOS los EventoInteraccion (no hay forma de distinguir
eventos reales de sintéticos) — es para bases de demo/desarrollo.
"""
import math
import random
import re
import unicodedata
from collections import defaultdict
from contextlib import contextmanager
from datetime import timedelta
from decimal import Decimal

from django.contrib.auth.hashers import make_password
from django.contrib.gis.geos import Point
from django.core.exceptions import FieldDoesNotExist
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from apps.catalogo.models import Producto
from apps.core.management.commands.poblar_datos import CIUDADES, PASSWORD_DEFAULT
from apps.ia.models import EventoInteraccion
from apps.ia.datos import coincidencias_busqueda
from apps.inventario.models import InventarioSucursal, Sucursal
from apps.pedidos.models import Entrega, OrdenCompra, Pago, Pedido, PedidoItem
from apps.reportes.models import Valoracion
from apps.suscripciones.models import Suscripcion
from apps.suscripciones.services import suscripciones_vigentes
from apps.usuarios.models import Comprador, Direccion, Empresa, Usuario

PREFIJO_EMAIL = 'demo.ia'
DOMINIO_EMAIL = '@vecinomarket.com'
PREFIJO_PEDIDO = 'DEMO-IA-'

NOMBRES = ['Ana', 'Luis', 'Paola', 'Marco', 'Daniela', 'Raúl', 'Camila', 'Iván', 'Valeria', 'Óscar',
           'Gabriela', 'Rodrigo', 'Natalia', 'Javier', 'Carla', 'Miguel', 'Sofía', 'Hugo', 'Elena', 'Pablo']
APELLIDOS = ['Mamani', 'Quispe', 'Flores', 'Gutiérrez', 'Rojas', 'Vargas', 'Choque', 'Condori',
             'Fernández', 'Arce', 'Salazar', 'Ticona', 'Limachi', 'Patzi', 'Aguilar']

# Términos que la gente busca y el catálogo de demo no tiene (CU3:
# "búsquedas sin resultados"). Igual se cuentan contra el catálogo real.
TERMINOS_SIN_RESULTADOS = [
    'bicicleta', 'pañales', 'celular samsung', 'zapatillas running', 'impresora',
    'colchón', 'licuadora', 'mochila escolar', 'lentes de sol', 'pizza',
]
PALABRAS_VACIAS = {'para', 'con', 'del', 'los', 'las', 'una', 'unos', 'piezas', 'bolsa', 'set', 'pequeño', 'mediana'}

# lunes..domingo (date.weekday())
PESO_DIA = [0.8, 0.8, 0.9, 1.0, 1.25, 1.6, 1.4]
# 00h..23h: madrugada casi nula, picos al mediodía y en la noche.
PESO_HORA = [0.05, 0.02, 0.01, 0.01, 0.02, 0.05, 0.2, 0.5, 0.8, 0.9, 1.0, 1.2,
             1.6, 1.5, 1.0, 0.9, 0.9, 1.0, 1.3, 1.7, 1.9, 1.6, 0.9, 0.3]

COMENTARIOS = {
    5: ['Excelente atención, todo llegó perfecto.', 'Muy buena calidad, volveré a comprar.'],
    4: ['Buen producto, la entrega tardó un poco.', 'Todo bien, recomendado.'],
    3: ['Cumple, pero esperaba algo mejor.', 'Regular, el empaque llegó dañado.'],
    2: ['No era lo que mostraban las fotos.', 'Demoraron mucho en atenderme.'],
    1: ['Mala experiencia, no lo recomiendo.'],
}


def _normalizar(texto):
    sin_tildes = ''.join(c for c in unicodedata.normalize('NFD', texto) if unicodedata.category(c) != 'Mn')
    return sin_tildes.lower()


def _terminos_de(producto):
    """Palabras de búsqueda plausibles a partir del nombre del producto."""
    palabras = re.findall(r'[a-záéíóúñ]+', producto.nombre.lower())
    return [p for p in palabras if len(p) >= 4 and _normalizar(p) not in PALABRAS_VACIAS]


def _poisson(rng, media):
    # Knuth: suficiente para medias chicas (< 10).
    limite, k, p = math.exp(-media), 0, 1.0
    while True:
        p *= rng.random()
        if p <= limite:
            return k
        k += 1


@contextmanager
def _fechas_manuales(*modelos):
    """Permite fijar creado_en/actualizado_en a mano (historia de semanas
    atrás) sin un UPDATE posterior por fila, que dispararía de nuevo los
    triggers de auditoría."""
    respaldo = []
    for modelo in modelos:
        for nombre in ('creado_en', 'actualizado_en'):
            try:
                campo = modelo._meta.get_field(nombre)
            except FieldDoesNotExist:
                continue
            respaldo.append((campo, campo.auto_now, campo.auto_now_add))
            campo.auto_now = campo.auto_now_add = False
    try:
        yield
    finally:
        for campo, auto_now, auto_now_add in respaldo:
            campo.auto_now, campo.auto_now_add = auto_now, auto_now_add


class Command(BaseCommand):
    help = 'Genera eventos de navegación y compras sintéticas realistas para la demo de IA (CU1–CU3).'

    def add_arguments(self, parser):
        parser.add_argument('--compradores', type=int, default=40, help='Compradores sintéticos a crear (además de los existentes).')
        parser.add_argument('--semanas', type=int, default=12, help='Semanas de historia hacia atrás.')
        parser.add_argument('--semilla', type=int, default=42, help='Semilla aleatoria (misma semilla = mismos datos).')
        parser.add_argument('--password', default=PASSWORD_DEFAULT, help='Password de los compradores sintéticos.')
        parser.add_argument('--reset', action='store_true', help='Borra los datos sintéticos anteriores y TODOS los eventos.')

    def handle(self, *args, **opts):
        self.rng = random.Random(opts['semilla'])
        self.ahora = timezone.now()
        self.semanas = max(1, opts['semanas'])
        self.inicio = self.ahora - timedelta(weeks=self.semanas)

        with transaction.atomic():
            self._limpiar(opts['reset'])
            self._asegurar_suscripciones()
            self._ubicar_sucursales_demo()
            self._cargar_catalogo()
            compradores = list(Comprador.objects.select_related('usuario').exclude(
                usuario__email__startswith=PREFIJO_EMAIL)) + self._crear_compradores(opts['compradores'], opts['password'])
            self._simular(compradores)
            self._guardar()

        self.stdout.write(self.style.SUCCESS('\nHistorial sintético generado.'))
        self.stdout.write('Siguiente paso: python manage.py generar_recomendaciones')

    # -----------------------------------------------------------------
    def _limpiar(self, reset):
        usuarios_demo = Usuario.objects.filter(email__startswith=PREFIJO_EMAIL, email__endswith=DOMINIO_EMAIL)
        ordenes_demo = OrdenCompra.objects.filter(pedidos__numero_pedido__startswith=PREFIJO_PEDIDO).distinct()
        if not reset:
            if usuarios_demo.exists() or ordenes_demo.exists():
                raise CommandError('Ya hay datos sintéticos de una corrida anterior. Usa --reset para regenerarlos.')
            return
        eventos, _ = EventoInteraccion.objects.all().delete()
        # Cascada: pedidos, ítems, pagos, entregas y valoraciones de esas órdenes.
        OrdenCompra.objects.filter(id__in=list(ordenes_demo.values_list('id', flat=True))).delete()
        usuarios, _ = usuarios_demo.delete()
        self.stdout.write(f'Reset: {eventos} eventos y los datos sintéticos anteriores eliminados ({usuarios} filas de usuarios demo).')

    def _asegurar_suscripciones(self):
        """Decisión 4: sin suscripción ACTIVA y vigente, la empresa queda fuera
        de la IA. Se reactiva la última suscripción de cada empresa con plan de
        IA (o se crea una) en vez de sumar filas, porque poblar_datos hace
        update_or_create(empresa=...) y se rompería con dos suscripciones."""
        renovadas = 0
        for empresa in Empresa.objects.filter(estado=Empresa.Estado.ACTIVA, plan__incluye_ia=True).select_related('plan'):
            if suscripciones_vigentes().filter(empresa=empresa).exists():
                continue
            vencimiento = self.ahora + timedelta(days=empresa.plan.duracion_dias or 30)
            ultima = Suscripcion.objects.filter(empresa=empresa).order_by('-fecha_vencimiento').first()
            if ultima:
                ultima.plan = empresa.plan
                ultima.estado = Suscripcion.Estado.ACTIVA
                ultima.fecha_vencimiento = vencimiento
                ultima.save(update_fields=['plan', 'estado', 'fecha_vencimiento', 'actualizado_en'])
            else:
                Suscripcion.objects.create(
                    empresa=empresa, plan=empresa.plan, fecha_inicio=self.ahora,
                    fecha_vencimiento=vencimiento, estado=Suscripcion.Estado.ACTIVA,
                )
            renovadas += 1
        self.stdout.write(f'Suscripciones activadas/renovadas para la demo: {renovadas}')

    def _ubicar_sucursales_demo(self):
        """poblar_datos deja cada "Tienda principal" exactamente en el centro
        de la ciudad (el mismo punto que la ubicación por defecto de sus
        compradores): en "Cerca de ti" todas quedaban a 0 km y apiladas en el
        mapa. Las mueve a la ubicación de su empresa (con 0–3 km de
        dispersión). Solo toca sucursales que siguen en un centro exacto."""
        centros = {(round(lon, 4), round(lat, 4)) for _, _, lat, lon in CIUDADES}
        movidas = 0
        for sucursal in Sucursal.objects.filter(ubicacion__isnull=False, empresa__ubicacion__isnull=False).select_related('empresa'):
            if (round(sucursal.ubicacion.x, 4), round(sucursal.ubicacion.y, 4)) in centros:
                sucursal.ubicacion = sucursal.empresa.ubicacion
                sucursal.save(update_fields=['ubicacion', 'actualizado_en'])
                movidas += 1
        self.stdout.write(f'Sucursales de demo reubicadas junto a su empresa: {movidas}')

    def _cargar_catalogo(self):
        # Producto -> sucursal ACTIVA donde tiene stock (para el recojo en tienda).
        self.sucursal_de = {}
        for inv in InventarioSucursal.objects.filter(
            cantidad_disponible__gt=0, sucursal__estado=Sucursal.Estado.ACTIVA,
        ).order_by('-cantidad_disponible'):
            self.sucursal_de.setdefault(inv.producto_id, inv.sucursal_id)

        productos = list(
            Producto.objects.filter(
                activo=True, estado=Producto.Estado.ACTIVO, categoria__isnull=False, id__in=list(self.sucursal_de),
            ).select_related('empresa__plan', 'categoria')
        )
        if len(productos) < 5:
            raise CommandError('Hay muy pocos productos activos con stock. Corre primero: python manage.py poblar_datos')

        self.por_categoria = defaultdict(list)
        for p in productos:
            self.por_categoria[p.categoria_id].append(p)
        # Popularidad dentro de cada categoría: unos pocos productos "estrella".
        self.peso_producto = {}
        for lista in self.por_categoria.values():
            self.rng.shuffle(lista)
            for rango, p in enumerate(lista):
                self.peso_producto[p.id] = 1 / (rango + 1) ** 0.8

        self.categorias = sorted(self.por_categoria)
        # Tendencias: 2 categorías en alza, 2 en baja, el resto estable.
        mezcla = self.categorias[:]
        self.rng.shuffle(mezcla)
        self.pendiente = {c: 0.0 for c in self.categorias}
        if len(mezcla) >= 3:
            for c in mezcla[:2]:
                self.pendiente[c] = 1.4
            for c in mezcla[2:4]:
                self.pendiente[c] = -1.2
        self.factor_max = 1 + max(abs(v) for v in self.pendiente.values()) / 2
        # Compras complementarias: quien compra en A a veces también compra en B.
        self.complemento = {c: self.rng.choice([o for o in self.categorias if o != c] or [c]) for c in self.categorias}

        self.terminos = {c: sorted({t for p in lista for t in _terminos_de(p)}) for c, lista in self.por_categoria.items()}
        self.calidad_empresa = {p.empresa_id: self.rng.uniform(3.2, 4.8) for p in productos}
        self._resultados_cache = {}

        nombres = {p.categoria_id: p.categoria.nombre for p in productos}
        for c in self.categorias:
            etiqueta = 'alza' if self.pendiente[c] > 0 else 'baja' if self.pendiente[c] < 0 else 'estable'
            self.stdout.write(f'  Categoría {nombres[c]}: {len(self.por_categoria[c])} productos, tendencia simulada {etiqueta}')

    def _crear_compradores(self, cantidad, password):
        if cantidad <= 0:
            return []
        hash_password = make_password(password)  # uno solo: hashear 40 veces tarda
        usuarios = []
        for i in range(1, cantidad + 1):
            usuarios.append(Usuario(
                email=f'{PREFIJO_EMAIL}{i}{DOMINIO_EMAIL}',
                nombre=self.rng.choice(NOMBRES), apellido=self.rng.choice(APELLIDOS),
                rol=Usuario.Rol.COMPRADOR, password=hash_password,
            ))
        usuarios = Usuario.objects.bulk_create(usuarios)

        compradores, direcciones = [], []
        for usuario in usuarios:
            ciudad, departamento, lat, lon = self.rng.choice(CIUDADES)
            punto = Point(lon + self.rng.uniform(-0.03, 0.03), lat + self.rng.uniform(-0.03, 0.03), srid=4326)
            compradores.append(Comprador(usuario=usuario, departamento=departamento, ubicacion_default=punto))
        compradores = Comprador.objects.bulk_create(compradores)
        for comprador in compradores:
            punto = comprador.ubicacion_default
            ciudad = next(c[0] for c in CIUDADES if c[1] == comprador.departamento)
            direcciones.append(Direccion(
                comprador=comprador, alias='Casa', direccion_texto=f'Calle {self.rng.randint(1, 40)} #{self.rng.randint(100, 999)}, {ciudad}',
                ubicacion=punto, departamento=comprador.departamento, ciudad=ciudad, es_predeterminada=True,
            ))
        Direccion.objects.bulk_create(direcciones)
        self.stdout.write(f'Compradores sintéticos: {len(compradores)}')
        return compradores

    # -----------------------------------------------------------------
    def _factor(self, categoria_id, semana):
        """Multiplicador de demanda de la categoría en esa semana (tendencia lineal)."""
        x = (semana - (self.semanas - 1) / 2) / max(self.semanas - 1, 1)
        return max(0.15, 1 + self.pendiente[categoria_id] * x)

    def _momento(self, semana):
        # En hora local (TIME_ZONE=America/La_Paz): las horas pico son locales.
        inicio_semana = timezone.localtime(self.inicio + timedelta(weeks=semana))
        for _ in range(10):
            dia = self.rng.choices(range(7), weights=[PESO_DIA[(inicio_semana + timedelta(days=d)).weekday()] for d in range(7)])[0]
            hora = self.rng.choices(range(24), weights=PESO_HORA)[0]
            momento = (inicio_semana + timedelta(days=dia)).replace(hour=hora, minute=self.rng.randint(0, 59), second=self.rng.randint(0, 59))
            if momento < self.ahora - timedelta(minutes=30):
                return momento
        return self.ahora - timedelta(hours=1)

    def _elegir_categoria(self, preferidas, semana):
        opciones = preferidas if preferidas and self.rng.random() < 0.8 else self.categorias
        return self.rng.choices(opciones, weights=[self._factor(c, semana) for c in opciones])[0]

    def _muestra_ponderada(self, productos, k):
        elegidos, pool = [], productos[:]
        while pool and len(elegidos) < k:
            p = self.rng.choices(pool, weights=[self.peso_producto[x.id] for x in pool])[0]
            elegidos.append(p)
            pool.remove(p)
        return elegidos

    def _resultados(self, termino):
        if termino not in self._resultados_cache:
            self._resultados_cache[termino] = coincidencias_busqueda(termino)
        return self._resultados_cache[termino]

    def _simular(self, compradores):
        self.eventos, self.compras = [], []
        for comprador in compradores:
            preferidas = self.rng.sample(self.categorias, k=min(len(self.categorias), self.rng.choice([1, 2, 2, 3])))
            actividad = self.rng.uniform(0.8, 4.0)  # sesiones por semana (antes del filtro de tendencia)
            for semana in range(self.semanas):
                for _ in range(_poisson(self.rng, actividad)):
                    self._sesion(comprador, comprador.departamento, preferidas, semana)
        # Visitantes sin cuenta: solo miran y buscan (el carrito exige sesión).
        for semana in range(self.semanas):
            for _ in range(self.rng.randint(25, 45)):
                self._sesion(None, self.rng.choice(CIUDADES)[1], [], semana)
        self.stdout.write(f'Sesiones simuladas -> eventos: {len(self.eventos)}, compras: {len(self.compras)}')

    def _sesion(self, comprador, departamento, preferidas, semana):
        momento = self._momento(semana)
        categoria = self._elegir_categoria(preferidas, semana)
        # La tendencia también decide CUÁNTAS sesiones ocurren (no solo a qué
        # categoría van): sin esto, quien solo tiene una categoría preferida
        # la visita igual todas las semanas y la tendencia casi no se nota.
        if self.rng.random() > self._factor(categoria, semana) / self.factor_max:
            return

        def evento(tipo, producto=None, termino=''):
            self.eventos.append(EventoInteraccion(
                comprador=comprador, producto=producto, tipo=tipo, termino_busqueda=termino,
                resultados=self._resultados(termino)['resultados'] if tipo == EventoInteraccion.Tipo.BUSQUEDA else None,
                categorias_coincidentes=self._resultados(termino)['categorias'] if tipo == EventoInteraccion.Tipo.BUSQUEDA else [],
                productos_coincidentes=self._resultados(termino)['productos'] if tipo == EventoInteraccion.Tipo.BUSQUEDA else [],
                departamento=departamento, fecha=momento,
            ))

        if self.rng.random() < 0.35:
            if self.rng.random() < 0.15 or not self.terminos.get(categoria):
                evento(EventoInteraccion.Tipo.BUSQUEDA, termino=self.rng.choice(TERMINOS_SIN_RESULTADOS))
            else:
                evento(EventoInteraccion.Tipo.BUSQUEDA, termino=self.rng.choice(self.terminos[categoria]))

        carrito = []
        for producto in self._muestra_ponderada(self.por_categoria[categoria], self.rng.randint(1, 4)):
            momento += timedelta(minutes=self.rng.randint(1, 6))
            evento(EventoInteraccion.Tipo.VISTA, producto)
            if comprador and self.rng.random() < 0.3:
                evento(EventoInteraccion.Tipo.CARRITO, producto)
                carrito.append(producto)

        if carrito and self.rng.random() < 0.5:
            if self.rng.random() < 0.25:
                extra = self._muestra_ponderada(self.por_categoria[self.complemento[categoria]], 1)
                for producto in extra:
                    evento(EventoInteraccion.Tipo.VISTA, producto)
                    evento(EventoInteraccion.Tipo.CARRITO, producto)
                carrito += extra
            self.compras.append((comprador, carrito, momento + timedelta(minutes=self.rng.randint(2, 15))))

    # -----------------------------------------------------------------
    def _estado_pedido(self, momento):
        if self.ahora - momento > timedelta(days=7):
            return self.rng.choices(
                [Pedido.Estado.ENTREGADO, Pedido.Estado.CANCELADO, Pedido.Estado.ENVIADO], weights=[85, 10, 5])[0]
        return self.rng.choice([Pedido.Estado.CONFIRMADO, Pedido.Estado.EN_PREPARACION, Pedido.Estado.ENVIADO,
                                Pedido.Estado.ENTREGADO, Pedido.Estado.CANCELADO])

    def _guardar(self):
        EventoInteraccion.objects.bulk_create(self.eventos, batch_size=1000)

        entrega_de = {
            Pedido.Estado.CONFIRMADO: Entrega.Estado.PENDIENTE,
            Pedido.Estado.EN_PREPARACION: Entrega.Estado.PENDIENTE,
            Pedido.Estado.ENVIADO: Entrega.Estado.EN_CAMINO,
            Pedido.Estado.ENTREGADO: Entrega.Estado.ENTREGADA,
            Pedido.Estado.CANCELADO: Entrega.Estado.CANCELADA,
        }
        ordenes, pedidos_por_orden, items_por_pedido = [], [], []
        for comprador, carrito, momento in self.compras:
            por_empresa = defaultdict(list)
            for producto in carrito:
                por_empresa[producto.empresa_id].append(producto)
            estado = self._estado_pedido(momento)
            pedidos, total = [], Decimal('0')
            for productos in por_empresa.values():
                items = []
                for producto in productos:
                    precio = producto.precio_descuento or producto.precio
                    cantidad = self.rng.choices([1, 2, 3], weights=[70, 22, 8])[0]
                    items.append(PedidoItem(producto=producto, cantidad=cantidad, precio_unitario=precio, subtotal=precio * cantidad))
                subtotal = sum((i.subtotal for i in items), Decimal('0'))
                empresa = productos[0].empresa
                porcentaje = empresa.plan.porcentaje_comision if empresa.plan_id else Decimal('0')
                pedidos.append((Pedido(
                    empresa=empresa, subtotal=subtotal, estado=estado,
                    comision_monto=(subtotal * porcentaje / 100).quantize(Decimal('0.01')),
                    modalidad_entrega=Pedido.ModalidadEntrega.RECOJO_TIENDA,
                    sucursal_recojo_id=self.sucursal_de[productos[0].id],
                    creado_en=momento, actualizado_en=momento,
                ), items))
                total += subtotal
            ordenes.append(OrdenCompra(
                comprador=comprador, monto_total=total,
                metodo_pago=self.rng.choice([OrdenCompra.MetodoPago.QR, OrdenCompra.MetodoPago.TARJETA, OrdenCompra.MetodoPago.PAYPAL]),
                estado_pago=OrdenCompra.EstadoPago.FALLIDO if estado == Pedido.Estado.CANCELADO else OrdenCompra.EstadoPago.PAGADO,
                creado_en=momento, actualizado_en=momento,
            ))
            pedidos_por_orden.append(pedidos)

        with _fechas_manuales(OrdenCompra, Pedido, Valoracion):
            ordenes = OrdenCompra.objects.bulk_create(ordenes, batch_size=500)
            pedidos_planos, numero = [], 0
            for orden, pedidos in zip(ordenes, pedidos_por_orden):
                for pedido, items in pedidos:
                    numero += 1
                    pedido.orden_compra = orden
                    pedido.numero_pedido = f'{PREFIJO_PEDIDO}{numero:06d}'
                    pedidos_planos.append(pedido)
                    items_por_pedido.append(items)
            Pedido.objects.bulk_create(pedidos_planos, batch_size=500)

            todos_items, entregas, valoraciones = [], [], []
            for pedido, items in zip(pedidos_planos, items_por_pedido):
                for item in items:
                    item.pedido = pedido
                    todos_items.append(item)
                entregada = pedido.estado == Pedido.Estado.ENTREGADO
                entregas.append(Entrega(
                    pedido=pedido, estado=entrega_de[pedido.estado],
                    fecha_estimada=(pedido.creado_en + timedelta(days=3)).date(),
                    fecha_entregada=min(pedido.creado_en + timedelta(days=2), self.ahora) if entregada else None,
                ))
                if entregada and self.rng.random() < 0.4:
                    nota = round(self.rng.gauss(self.calidad_empresa[pedido.empresa_id], 0.8))
                    nota = min(5, max(1, nota))
                    fecha = min(pedido.creado_en + timedelta(days=3), self.ahora)
                    valoraciones.append(Valoracion(
                        pedido=pedido, comprador=pedido.orden_compra.comprador, empresa_id=pedido.empresa_id,
                        calificacion=nota, comentario=self.rng.choice(COMENTARIOS[nota]),
                        creado_en=fecha, actualizado_en=fecha,
                    ))
            PedidoItem.objects.bulk_create(todos_items, batch_size=1000)
            Entrega.objects.bulk_create(entregas, batch_size=1000)
            Valoracion.objects.bulk_create(valoraciones, batch_size=1000)

        Pago.objects.bulk_create([
            Pago(
                orden_compra=orden, monto=orden.monto_total, metodo=orden.metodo_pago,
                referencia_pasarela=f'DEMO-{orden.id}',
                estado=Pago.Estado.RECHAZADO if orden.estado_pago == OrdenCompra.EstadoPago.FALLIDO else Pago.Estado.APROBADO,
                fecha_pago=orden.creado_en,
            )
            for orden in ordenes
        ], batch_size=1000)

        conteo = defaultdict(int)
        for e in self.eventos:
            conteo[e.tipo] += 1
        self.stdout.write(
            f'Eventos: {len(self.eventos)} ({", ".join(f"{k}={v}" for k, v in sorted(conteo.items()))}) · '
            f'Órdenes: {len(ordenes)} · Pedidos: {len(pedidos_planos)} · Ítems: {len(todos_items)} · '
            f'Valoraciones: {len(valoraciones)}'
        )
