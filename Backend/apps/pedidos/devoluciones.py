import logging
from datetime import timedelta
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
from urllib.parse import quote
from uuid import uuid4

from django.conf import settings
from django.core.mail import send_mail
from django.db import transaction
from django.db.models import Sum
from django.utils import timezone
from requests.exceptions import RequestException
from rest_framework.exceptions import APIException, ValidationError

from apps.auditoria.models import LogAuditoria
from apps.core.utils import get_client_ip
from apps.notificaciones.models import Notificacion
from apps.pagos import paypal_client

from .models import OrdenCompra, Pago, Pedido, SolicitudDevolucion
from .stock import _restituir_stock_orden, sucursales_restitucion

logger = logging.getLogger(__name__)

Estado = SolicitudDevolucion.Estado
ORDEN_PAGADA = (OrdenCompra.EstadoPago.PAGADO, OrdenCompra.EstadoPago.REEMBOLSO_PARCIAL)


class ConflictoDevolucion(APIException):
    status_code = 409


class PasarelaNoDisponible(APIException):
    status_code = 502
    default_detail = 'PayPal todavía no confirmó el reembolso. El caso sigue pendiente.'


def _enviar_correos_solicitud(pk, accion, titulo):
    try:
        solicitud = SolicitudDevolucion.objects.select_related(
            'pedido__empresa__usuario_dueno',
            'comprador__usuario',
        ).get(pk=pk)
    except SolicitudDevolucion.DoesNotExist:
        return

    pedido = solicitud.pedido
    empresa = pedido.empresa
    dueno = empresa.usuario_dueno
    comprador = solicitud.comprador.usuario
    frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173').rstrip('/')

    if accion == 'DEVOLUCION_CREADA':
        email_empresa = (dueno.correo_recuperacion or dueno.email) if dueno else ''
        if email_empresa:
            try:
                send_mail(
                    f'[VecinoMarket] Nueva solicitud de devolución - Pedido {pedido.numero_pedido}',
                    (
                        f'Hola {empresa.razon_social},\n\n'
                        f'Has recibido una nueva solicitud de devolución para el pedido {pedido.numero_pedido}.\n\n'
                        f'Detalles del reclamo:\n'
                        f'  - Comprador: {comprador.nombre} ({comprador.email})\n'
                        f'  - Motivo: {solicitud.get_motivo_display()}\n'
                        f'  - Descripción: {solicitud.descripcion}\n'
                        f'  - Importe del pedido: Bs {pedido.subtotal:.2f}\n\n'
                        f'Puedes revisar la evidencia adjunta y responder a la solicitud desde tu panel:\n'
                        f'{frontend_url}/reclamos/{solicitud.pk}\n\n'
                        'Atentamente,\n'
                        'Equipo de VecinoMarket'
                    ),
                    settings.DEFAULT_FROM_EMAIL,
                    [email_empresa],
                    fail_silently=False,
                )
            except Exception:
                logger.exception('No se pudo enviar correo de reclamo a la empresa %s', email_empresa)

        email_comprador = comprador.correo_recuperacion or comprador.email
        if email_comprador:
            try:
                send_mail(
                    f'[VecinoMarket] Recibimos tu reclamo de devolución - Pedido {pedido.numero_pedido}',
                    (
                        f'Hola {comprador.nombre},\n\n'
                        f'Hemos registrado tu solicitud de devolución para el pedido {pedido.numero_pedido} '
                        f'de la tienda "{empresa.razon_social}".\n\n'
                        f'Estado actual: En revisión por la tienda.\n'
                        f'Motivo indicado: {solicitud.get_motivo_display()}.\n\n'
                        f'Puedes hacer seguimiento del caso en el siguiente enlace:\n'
                        f'{frontend_url}/mis-reclamos/{solicitud.pk}\n\n'
                        'Atentamente,\n'
                        'Equipo de VecinoMarket'
                    ),
                    settings.DEFAULT_FROM_EMAIL,
                    [email_comprador],
                    fail_silently=False,
                )
            except Exception:
                logger.exception('No se pudo enviar correo de confirmación de reclamo al comprador %s', email_comprador)
    else:
        email_comprador = comprador.correo_recuperacion or comprador.email
        if email_comprador:
            cuerpo_accion = {
                'DEVOLUCION_APROBAR': 'La tienda ha aprobado tu solicitud de devolución. El reembolso está en proceso.',
                'DEVOLUCION_RECHAZAR': f'La tienda ha rechazado tu solicitud con la siguiente respuesta:\n"{solicitud.respuesta}"\n\nSi no estás de acuerdo, puedes solicitar la mediación de la administración desde tu panel.',
                'DEVOLUCION_ESCALAR': 'Has solicitado la mediación de la administración para este caso. Un administrador revisará la disputa a la brevedad.',
                'DEVOLUCION_MEDIAR_APROBAR': f'La administración ha mediado en la disputa y resuelto a tu favor:\n"{solicitud.resolucion_mediacion}"',
                'DEVOLUCION_MEDIAR_RECHAZAR': f'La administración ha revisado el caso y confirmado el rechazo:\n"{solicitud.resolucion_mediacion}"',
                'DEVOLUCION_REEMBOLSADA': f'El reembolso de tu pedido ha sido confirmado exitosamente (Referencia de reembolso: {solicitud.referencia_reembolso}).',
            }.get(accion, f'Tu reclamo ha sido actualizado al estado: {solicitud.get_estado_display()}.')

            try:
                send_mail(
                    f'[VecinoMarket] {titulo} - Pedido {pedido.numero_pedido}',
                    (
                        f'Hola {comprador.nombre},\n\n'
                        f'{cuerpo_accion}\n\n'
                        f'Detalles del caso:\n'
                        f'  - Pedido: {pedido.numero_pedido}\n'
                        f'  - Tienda: {empresa.razon_social}\n'
                        f'  - Estado actual: {solicitud.get_estado_display()}\n\n'
                        f'Puedes consultar los detalles completos en:\n'
                        f'{frontend_url}/mis-reclamos/{solicitud.pk}\n\n'
                        'Atentamente,\n'
                        'Equipo de VecinoMarket'
                    ),
                    settings.DEFAULT_FROM_EMAIL,
                    [email_comprador],
                    fail_silently=False,
                )
            except Exception:
                logger.exception('No se pudo enviar correo de actualización al comprador %s', email_comprador)

        if accion == 'DEVOLUCION_ESCALAR' and dueno:
            email_empresa = dueno.correo_recuperacion or dueno.email
            if email_empresa:
                try:
                    send_mail(
                        f'[VecinoMarket] Reclamo escalado a mediación - Pedido {pedido.numero_pedido}',
                        (
                            f'Hola {empresa.razon_social},\n\n'
                            f'El comprador ha solicitado la mediación de la administración para el reclamo del pedido {pedido.numero_pedido}.\n\n'
                            f'Motivo del escalamiento:\n"{solicitud.motivo_mediacion}"\n\n'
                            f'Puedes consultar el expediente en:\n'
                            f'{frontend_url}/reclamos/{solicitud.pk}\n\n'
                            'Atentamente,\n'
                            'Equipo de VecinoMarket'
                        ),
                        settings.DEFAULT_FROM_EMAIL,
                        [email_empresa],
                        fail_silently=False,
                    )
                except Exception:
                    logger.exception('No se pudo enviar correo de escalamiento a la empresa %s', email_empresa)


def registrar_cambio(solicitud, request, accion, titulo):
    LogAuditoria.objects.create(
        usuario=request.user, accion=accion, entidad_afectada='solicitud_devolucion',
        entidad_id=solicitud.pk,
        detalle={'pedido_id': solicitud.pedido_id, 'estado': solicitud.estado},
        ip_origen=get_client_ip(request), user_agent=request.META.get('HTTP_USER_AGENT', ''),
    )
    Notificacion.objects.create(
        usuario_id=solicitud.comprador.usuario_id, tipo=accion, titulo=titulo,
        mensaje=f'{solicitud.pedido.numero_pedido} · {solicitud.get_estado_display()}',
        enlace=f'/mis-reclamos/{solicitud.pk}',
    )
    pk = solicitud.pk
    transaction.on_commit(lambda: _enviar_correos_solicitud(pk, accion, titulo))


def destinos_restitucion(pedido, seleccion):
    items, opciones = sucursales_restitucion(pedido)
    if not items:
        raise ConflictoDevolucion('El pedido no tiene artículos registrados.')
    destinos = {}
    for item in items:
        ids = opciones[item.pk]
        destino = ids[0] if len(ids) == 1 else seleccion.get(str(item.pk))
        if destino not in ids:
            raise ValidationError({'sucursales': f'Indica la sucursal de origen de {item.producto.nombre}.'})
        destinos[str(item.pk)] = destino
        if item.sucursal_stock_id is None:
            item.sucursal_stock_id = destino
            item.save(update_fields=['sucursal_stock'])
    return destinos


def iniciar_reembolso(solicitud, seleccion):
    pedido = solicitud.pedido
    orden = pedido.orden_compra
    if pedido.estado != Pedido.Estado.ENTREGADO or orden.estado_pago not in ORDEN_PAGADA:
        raise ConflictoDevolucion('El pedido debe estar entregado y pagado.')
    if SolicitudDevolucion.objects.filter(
        pedido__orden_compra_id=orden.pk, estado=Estado.REEMBOLSO_PENDIENTE,
    ).exclude(pk=solicitud.pk).exists():
        raise ConflictoDevolucion('Hay otro reembolso de esta compra en proceso.')
    pagos = list(orden.pagos.select_for_update().filter(
        estado__in=(Pago.Estado.APROBADO, Pago.Estado.REEMBOLSO_PARCIAL),
    )[:2])
    if len(pagos) != 1:
        raise ConflictoDevolucion('Esta compra requiere conciliar su pago antes de reembolsar.')
    pago = pagos[0]
    if pago.metodo == Pago.Metodo.PAYPAL and getattr(settings, 'DEVOLUCIONES_PAYPAL_SOLO_CHECKOUT_LOCAL', False):
        if not orden.paypal_orden_id or orden.paypal_orden_id != pago.referencia_pasarela:
            raise ConflictoDevolucion('En este entorno solo se reembolsan pagos PayPal creados localmente.')
    reembolsado = pago.devoluciones.filter(estado=Estado.APROBADA).aggregate(
        total=Sum('monto_reembolso'),
    )['total'] or Decimal('0')
    if pedido.subtotal <= 0 or reembolsado + pedido.subtotal > pago.monto:
        raise ConflictoDevolucion('El subtotal supera el saldo reembolsable del pago o es cero.')
    solicitud.sucursales_restitucion = destinos_restitucion(pedido, seleccion)
    solicitud.pago = pago
    solicitud.monto_reembolso = pedido.subtotal
    solicitud.estado = Estado.REEMBOLSO_PENDIENTE


def finalizar_reembolso(solicitud, referencia, request):
    pago = solicitud.pago
    pedido = solicitud.pedido
    orden = pedido.orden_compra
    try:
        _restituir_stock_orden(orden, pedido=pedido, sucursales=solicitud.sucursales_restitucion)
    except ValueError as error:
        raise ConflictoDevolucion(str(error)) from error
    pedido.estado = Pedido.Estado.DEVUELTO
    pedido.save(update_fields=['estado', 'actualizado_en'])
    solicitud.estado = Estado.APROBADA
    solicitud.referencia_reembolso = referencia
    solicitud.fecha_reembolso = timezone.now()
    solicitud.save()
    total = pago.devoluciones.filter(estado=Estado.APROBADA).aggregate(
        total=Sum('monto_reembolso'),
    )['total']
    completo = total == pago.monto
    pago.estado = Pago.Estado.REEMBOLSADO if completo else Pago.Estado.REEMBOLSO_PARCIAL
    pago.save(update_fields=['estado'])
    orden.estado_pago = (
        OrdenCompra.EstadoPago.REEMBOLSADO if completo else OrdenCompra.EstadoPago.REEMBOLSO_PARCIAL
    )
    orden.save(update_fields=['estado_pago', 'actualizado_en'])
    registrar_cambio(solicitud, request, 'DEVOLUCION_REEMBOLSADA', 'Reembolso confirmado')


def bloquear_solicitud(pk):
    orden_id = SolicitudDevolucion.objects.values_list('pedido__orden_compra_id', flat=True).get(pk=pk)
    orden = OrdenCompra.objects.select_for_update().get(pk=orden_id)
    solicitud = SolicitudDevolucion.objects.select_for_update().get(pk=pk)
    pedido = Pedido.objects.select_for_update().get(pk=solicitud.pedido_id)
    pedido.orden_compra = orden
    solicitud.pedido = pedido
    return solicitud


def _datos_captura(pago, orden):
    solo_local = getattr(settings, 'DEVOLUCIONES_PAYPAL_SOLO_CHECKOUT_LOCAL', False)
    if not solo_local and pago.paypal_captura_id and pago.paypal_monto_capturado is not None and pago.paypal_moneda:
        return
    if not pago.referencia_pasarela:
        raise ConflictoDevolucion('Este pago de PayPal no tiene una referencia recuperable.')
    if solo_local and orden.paypal_orden_id != pago.referencia_pasarela:
        raise ConflictoDevolucion('En este entorno solo se reembolsan pagos PayPal creados localmente.')
    orden_paypal = paypal_client.consultar_orden(quote(pago.referencia_pasarela, safe=''))
    if solo_local and not any(
        unidad.get('custom_id') == paypal_client.referencia_checkout(orden.pk)
        for unidad in orden_paypal.get('purchase_units', [])
    ):
        raise ConflictoDevolucion('La captura pertenece a otro entorno de VecinoMarket.')
    captura = paypal_client.captura_completada(orden_paypal)
    if not captura:
        raise ConflictoDevolucion('No se pudo identificar una captura única para este pago.')
    pago.paypal_captura_id = captura['id']
    pago.paypal_monto_capturado = Decimal(captura['amount']['value'])
    pago.paypal_moneda = captura['amount'].get('currency_code', '')
    if pago.paypal_monto_capturado <= 0 or len(pago.paypal_moneda) != 3:
        raise ConflictoDevolucion('La captura de PayPal tiene un importe o moneda inválidos.')
    pago.save(update_fields=['paypal_captura_id', 'paypal_monto_capturado', 'paypal_moneda'])


@transaction.atomic
def _preparar_paypal(pk, referencia_conciliacion=None):
    solicitud = bloquear_solicitud(pk)
    if solicitud.estado != Estado.REEMBOLSO_PENDIENTE:
        return solicitud
    pago = solicitud.pago
    if pago.metodo != Pago.Metodo.PAYPAL:
        raise ConflictoDevolucion('Este reembolso requiere una referencia de transferencia.')
    if solicitud.referencia_reembolso:
        return solicitud
    intento_expirado = (
        solicitud.fecha_intento_paypal and timezone.now() - solicitud.fecha_intento_paypal >= timedelta(days=44)
    )
    if not referencia_conciliacion and intento_expirado:
        raise ConflictoDevolucion(
            'Verifica el intento en PayPal. El plazo local de reintento seguro expiró.',
        )
    _datos_captura(pago, solicitud.pedido.orden_compra)
    if solicitud.monto_pasarela is None:
        anteriores = pago.devoluciones.filter(estado=Estado.APROBADA).aggregate(
            bob=Sum('monto_reembolso'), pasarela=Sum('monto_pasarela'),
        )
        acumulado = (anteriores['bob'] or Decimal('0')) + solicitud.monto_reembolso
        objetivo = (pago.paypal_monto_capturado * acumulado / pago.monto).quantize(
            Decimal('0.01'), rounding=ROUND_HALF_UP,
        )
        solicitud.monto_pasarela = objetivo - (anteriores['pasarela'] or Decimal('0'))
        if solicitud.monto_pasarela <= 0:
            raise ConflictoDevolucion('El monto redondeado queda fuera del saldo reembolsable.')
    solicitud.fecha_intento_paypal = solicitud.fecha_intento_paypal or timezone.now()
    solicitud.save(update_fields=['monto_pasarela', 'fecha_intento_paypal', 'actualizado_en'])
    return solicitud


def procesar_paypal(pk, request, *, referencia_conciliacion=None):
    try:
        solicitud = _preparar_paypal(pk, referencia_conciliacion)
        if solicitud.estado == Estado.APROBADA:
            return solicitud
        if solicitud.estado != Estado.REEMBOLSO_PENDIENTE:
            raise ConflictoDevolucion('El reclamo aún no tiene un reembolso autorizado.')
        pago = solicitud.pago
        referencia_consulta = referencia_conciliacion or solicitud.referencia_reembolso
        if referencia_consulta:
            resultado = paypal_client.consultar_reembolso(quote(referencia_consulta, safe=''))
        else:
            resultado = paypal_client.reembolsar_captura(
                quote(pago.paypal_captura_id, safe=''), solicitud.monto_pasarela,
                pago.paypal_moneda, clave=solicitud.clave_reembolso,
            )
    except (paypal_client.PaypalError, RequestException, TimeoutError) as error:
        raise PasarelaNoDisponible() from error

    referencia = resultado.get('id')
    estado = resultado.get('status')
    importe = resultado.get('amount', {})
    if not referencia or estado not in {'PENDING', 'COMPLETED', 'FAILED', 'CANCELLED'}:
        raise PasarelaNoDisponible()
    if referencia_conciliacion:
        captura = f'/v2/payments/captures/{pago.paypal_captura_id}'
        enlaces = resultado.get('links', [])
        mismo_intento = resultado.get('custom_id') == str(solicitud.clave_reembolso)
        misma_captura = any(link.get('rel') == 'up' and link.get('href', '').endswith(captura) for link in enlaces)
        if referencia != referencia_conciliacion or not (mismo_intento and misma_captura):
            raise ConflictoDevolucion('La referencia de PayPal no corresponde a este intento de reembolso.')
    elif solicitud.referencia_reembolso and referencia != solicitud.referencia_reembolso:
        raise PasarelaNoDisponible()
    try:
        if importe.get('currency_code') != pago.paypal_moneda or Decimal(importe.get('value') or '0') != solicitud.monto_pasarela:
            raise PasarelaNoDisponible()
    except (InvalidOperation, TypeError) as error:
        raise PasarelaNoDisponible() from error
    with transaction.atomic():
        actual = bloquear_solicitud(pk)
        if actual.estado == Estado.APROBADA:
            return actual
        if actual.clave_reembolso != solicitud.clave_reembolso:
            return actual
        if estado == 'COMPLETED':
            finalizar_reembolso(actual, referencia, request)
        elif estado in {'FAILED', 'CANCELLED'}:
            actual.referencia_reembolso = ''
            actual.fecha_intento_paypal = None
            actual.clave_reembolso = uuid4()
            actual.save(update_fields=['referencia_reembolso', 'fecha_intento_paypal', 'clave_reembolso', 'actualizado_en'])
            registrar_cambio(actual, request, 'DEVOLUCION_PAGO_FALLIDO', 'PayPal no completó el reembolso')
        elif not actual.referencia_reembolso:
            actual.referencia_reembolso = referencia
            actual.save(update_fields=['referencia_reembolso', 'actualizado_en'])
        return actual
