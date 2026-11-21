from datetime import timedelta
from decimal import Decimal

from django.db.models import Count
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.catalogo.models import Producto
from apps.notificaciones.models import Notificacion
from apps.pedidos.models import Carrito, CarritoItem, ListaDeseoItem
from apps.usuarios.models import Comprador
from apps.usuarios.permissions import EsComprador, EsEmpresaOEmpleado


def _serializar_item_deseo(item):
    prod = item.producto
    first_img = prod.imagenes.order_by('orden').first()
    img_url = (first_img.archivo.url if first_img.archivo else first_img.url) if first_img else ''
    
    precio_actual = float(prod.precio_descuento if prod.precio_descuento is not None else prod.precio)
    precio_guardado = float(item.precio_al_guardar)
    precio_original = float(prod.precio)

    baja_precio = precio_actual < precio_guardado
    descuento_pct = round(((precio_original - precio_actual) / precio_original) * 100, 1) if precio_original > precio_actual else 0.0

    return {
        'id': item.id,
        'producto_id': prod.id,
        'nombre': prod.nombre,
        'descripcion': prod.descripcion,
        'imagen': img_url,
        'empresa_id': prod.empresa_id,
        'empresa_nombre': prod.empresa.razon_social if prod.empresa else '',
        'precio_al_guardar': precio_guardado,
        'precio_actual': precio_actual,
        'precio_original': precio_original,
        'tiene_descuento': prod.precio_descuento is not None and prod.precio_descuento < prod.precio,
        'baja_precio_detectada': baja_precio,
        'porcentaje_descuento': descuento_pct,
        'notificar_baja_precio': item.notificar_baja_precio,
        'precio_objetivo': float(item.precio_objetivo) if item.precio_objetivo is not None else None,
        'en_stock': prod.estado == Producto.Estado.ACTIVO,
        'creado_en': item.creado_en.isoformat() if item.creado_en else None,
    }


class WishlistListaView(APIView):
    """
    CU30: Retorna los productos guardados en la lista de deseos del comprador autenticado.
    """
    permission_classes = [EsComprador]

    def get(self, request):
        comprador = get_object_or_404(Comprador, usuario=request.user)
        items = (
            ListaDeseoItem.objects
            .filter(comprador=comprador)
            .select_related('producto__empresa')
            .prefetch_related('producto__imagenes')
            .order_by('-creado_en')
        )
        data = [_serializar_item_deseo(it) for it in items]
        return Response({'items': data, 'total': len(data)})


class WishlistIdsView(APIView):
    """
    Retorna un arreglo liviano de IDs de productos guardados para pintar corazones en catálogo.
    """
    permission_classes = [EsComprador]

    def get(self, request):
        comprador = get_object_or_404(Comprador, usuario=request.user)
        ids = list(ListaDeseoItem.objects.filter(comprador=comprador).values_list('producto_id', flat=True))
        return Response({'ids': ids})


class WishlistToggleView(APIView):
    """
    CU30: Agrega o quita un producto de la lista de deseos del comprador.
    """
    permission_classes = [EsComprador]

    def post(self, request):
        producto_id = request.data.get('producto_id')
        if not producto_id:
            return Response({'error': 'El campo producto_id es requerido.'}, status=status.HTTP_400_BAD_REQUEST)

        comprador = get_object_or_404(Comprador, usuario=request.user)
        producto = get_object_or_404(Producto, id=producto_id)

        item = ListaDeseoItem.objects.filter(comprador=comprador, producto=producto).first()
        if item:
            item.delete()
            return Response({
                'agregado': False,
                'en_deseos': False,
                'producto_id': producto.id,
                'mensaje': f'"{producto.nombre}" fue eliminado de tu lista de deseos.'
            })

        # Registrar nuevo ítem en la lista de deseos
        precio_actual = producto.precio_descuento if producto.precio_descuento is not None else producto.precio
        notificar = request.data.get('notificar_baja_precio', True)
        precio_objetivo = request.data.get('precio_objetivo')

        if precio_objetivo:
            try:
                precio_objetivo = Decimal(str(precio_objetivo))
            except Exception:
                precio_objetivo = None

        nuevo_item = ListaDeseoItem.objects.create(
            comprador=comprador,
            producto=producto,
            precio_al_guardar=precio_actual,
            notificar_baja_precio=bool(notificar),
            precio_objetivo=precio_objetivo
        )

        return Response({
            'agregado': True,
            'en_deseos': True,
            'producto_id': producto.id,
            'mensaje': f'"{producto.nombre}" se guardó en tu lista de deseos.',
            'item': _serializar_item_deseo(nuevo_item)
        }, status=status.HTTP_201_CREATED)


class WishlistActualizarAlertaView(APIView):
    """
    CU30: Modifica las preferencias de alerta de precio para un ítem en lista de deseos.
    """
    permission_classes = [EsComprador]

    def patch(self, request, pk):
        comprador = get_object_or_404(Comprador, usuario=request.user)
        item = get_object_or_404(ListaDeseoItem, id=pk, comprador=comprador)

        if 'notificar_baja_precio' in request.data:
            item.notificar_baja_precio = bool(request.data['notificar_baja_precio'])

        if 'precio_objetivo' in request.data:
            po = request.data['precio_objetivo']
            if po is None or po == '':
                item.precio_objetivo = None
            else:
                try:
                    item.precio_objetivo = Decimal(str(po))
                except Exception:
                    return Response({'error': 'El precio objetivo no es un número válido.'}, status=status.HTTP_400_BAD_REQUEST)

        item.save()
        return Response({
            'mensaje': 'Configuración de alerta actualizada con éxito.',
            'item': _serializar_item_deseo(item)
        })


class WishlistMoverAlCarritoView(APIView):
    """
    CU30 + CU11: Transfiere un producto de la lista de deseos directamente al carrito activo del comprador.
    """
    permission_classes = [EsComprador]

    def post(self, request, pk):
        comprador = get_object_or_404(Comprador, usuario=request.user)
        item = get_object_or_404(ListaDeseoItem, id=pk, comprador=comprador)
        producto = item.producto

        if producto.estado != Producto.Estado.ACTIVO:
            return Response({'error': 'Este producto no está disponible actualmente.'}, status=status.HTTP_400_BAD_REQUEST)

        # Obtener o crear carrito abierto
        carrito, _ = Carrito.objects.get_or_create(
            comprador=comprador,
            estado=Carrito.Estado.ABIERTO,
            defaults={'comprador': comprador}
        )

        precio_unitario = producto.precio_descuento if producto.precio_descuento is not None else producto.precio
        carrito_item, created = CarritoItem.objects.get_or_create(
            carrito=carrito,
            producto=producto,
            defaults={
                'cantidad': 1,
                'precio_unitario': precio_unitario,
            }
        )
        if not created:
            carrito_item.cantidad += 1
            carrito_item.precio_unitario = precio_unitario
            carrito_item.save()

        # Opción: mantener o eliminar de la lista de deseos
        mantener = request.data.get('mantener_en_deseos', False)
        if not mantener:
            item.delete()

        return Response({
            'mensaje': f'"{producto.nombre}" se añadió al carrito.',
            'producto_id': producto.id,
            'carrito_id': carrito.id,
            'eliminado_de_deseos': not mantener
        })


class DemandaEmpresaWishlistView(APIView):
    """
    CU30: Para la empresa/empleado o Superadmin, muestra la demanda agregada de sus productos en listas de deseos.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        is_staff = getattr(request.user, 'is_staff', False) or getattr(request.user, 'is_superuser', False) or getattr(request.user, 'rol', '') in ['ADMIN', 'SUPERADMIN']
        empresas_list = []
        if is_staff:
            empresa_id = request.query_params.get('empresa_id')
            qs = Producto.objects.filter(activo=True)
            if empresa_id:
                qs = qs.filter(empresa_id=empresa_id)
            productos_con_deseo = (
                qs
                .annotate(total_deseados=Count('deseado_por'))
                .filter(total_deseados__gt=0)
                .select_related('empresa')
                .order_by('-total_deseados')
            )
            from apps.usuarios.models import Empresa
            empresas_list = list(Empresa.objects.filter(estado='ACTIVA').values('id', 'razon_social'))
        else:
            empresa = request.user.get_empresa()
            if not empresa:
                return Response({'error': 'No se encontró la empresa asociada.'}, status=status.HTTP_400_BAD_REQUEST)

            productos_con_deseo = (
                Producto.objects
                .filter(empresa=empresa)
                .annotate(total_deseados=Count('deseado_por'))
                .filter(total_deseados__gt=0)
                .select_related('empresa')
                .order_by('-total_deseados')
            )

        res = []
        for p in productos_con_deseo:
            precio_actual = float(p.precio_descuento if p.precio_descuento is not None else p.precio)
            first_img = p.imagenes.order_by('orden').first()
            img_url = (first_img.archivo.url if first_img.archivo else first_img.url) if first_img else ''
            res.append({
                'producto_id': p.id,
                'nombre': p.nombre,
                'precio_actual': precio_actual,
                'imagen': img_url,
                'total_deseados': p.total_deseados,
                'empresa_id': p.empresa_id,
                'empresa_nombre': p.empresa.razon_social if p.empresa else 'General',
                'sugerencia_promo': f'Aplica un descuento para notificar a {p.total_deseados} comprador(es).'
            })

        return Response({
            'productos': res,
            'total_productos_deseados': len(res),
            'empresas': empresas_list,
            'es_staff': is_staff
        })


def verificar_y_notificar_alertas_precio(producto, nuevo_precio):
    """
    Dispara notificaciones (CU23) a todos los compradores suscritos cuando un producto reduce su precio.
    - En entorno de desarrollo (DEBUG=True): cooldown de 3 segundos para pruebas inmediatas en vivo.
    - En producción (DEBUG=False): cooldown de 15 minutos para evitar duplicados si la tienda hace clics
      repetidos, pero permitiendo notificar cada nueva oferta o promoción del día.
    """
    from django.conf import settings
    ahora = timezone.now()
    ventana_antispam = timedelta(seconds=3) if getattr(settings, 'DEBUG', False) else timedelta(minutes=15)
    limite_antispam = ahora - ventana_antispam

    items = (
        ListaDeseoItem.objects
        .filter(producto=producto, notificar_baja_precio=True)
        .select_related('comprador__usuario')
    )

    alertas_enviadas = 0
    nuevo_precio_dec = Decimal(str(nuevo_precio))

    for it in items:
        # 1. Si el comprador fijó un precio meta:
        #    SOLO le notificamos cuando el producto alcance o baje de ese monto deseado.
        # 2. Si NO fijó meta:
        #    Le notificamos ante cualquier baja con respecto al precio inicial guardado.
        if it.precio_objetivo is not None:
            if nuevo_precio_dec > it.precio_objetivo:
                continue  # Aún no alcanza la meta fijada por el comprador
            es_meta = True
        else:
            if nuevo_precio_dec >= it.precio_al_guardar:
                continue  # No hubo baja respecto al precio inicial guardado
            es_meta = False

        if it.ultima_alerta_enviada and it.ultima_alerta_enviada > limite_antispam:
            continue

        ahorro = (it.precio_al_guardar - nuevo_precio_dec) if it.precio_al_guardar > nuevo_precio_dec else Decimal("0.00")

        if es_meta:
            titulo = f'¡Llegó a tu precio meta! {producto.nombre}'
            mensaje = (
                f'¡Buenas noticias! El producto "{producto.nombre}" alcanzó o superó tu precio deseado de '
                f'Bs. {it.precio_objetivo:.2f}. Ahora está disponible en Bs. {nuevo_precio_dec:.2f} '
                f'(Ahorro de Bs. {ahorro:.2f}). ¡Aprovecha antes de que se agote!'
            )
        else:
            titulo = f'¡Bajó de precio! {producto.nombre}'
            mensaje = (
                f'¡El producto "{producto.nombre}" bajó de precio! '
                f'Ahora está en Bs. {nuevo_precio_dec:.2f} (Ahorro de Bs. {ahorro:.2f}).'
            )

        Notificacion.objects.create(
            usuario=it.comprador.usuario,
            tipo='ALERTA_PRECIO',
            titulo=titulo,
            mensaje=mensaje,
            enlace=f'/productos/{producto.id}',
        )

        it.ultima_alerta_enviada = ahora
        it.save(update_fields=['ultima_alerta_enviada'])
        alertas_enviadas += 1

    return alertas_enviadas

