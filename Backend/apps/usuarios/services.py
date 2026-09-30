"""CU01: creación de la cuenta de empresa (usuario + Empresa + Suscripcion),
compartida por los 3 caminos que la disparan — solicitud con plan Prueba
(automática), solicitud con plan Básico/Premium (tras pagar en PayPal) y
alta directa del SuperAdmin. La empresa siempre es una cuenta nueva y
separada de la del comprador que hizo la solicitud (si la hubo)."""
import logging
from datetime import timedelta

from django.conf import settings
from django.core.mail import send_mail
from django.utils import timezone
from django.utils.crypto import get_random_string
from django.utils.text import slugify

from apps.facturacion.models import Factura
from apps.suscripciones.models import Suscripcion

from .models import Empresa, Usuario

logger = logging.getLogger(__name__)

_ALFABETO_PASSWORD = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789'


def generar_correo_empresa(razon_social):
    """"Mi Tienda S.R.L." -> mitiendasrl+4821@vecinomarket.com. No es una
    casilla real (no existe un servidor de correo en vecinomarket.com); es
    solo el identificador de login de la cuenta EMPRESA, con un sufijo
    numérico para que dos empresas con nombre parecido no choquen. Los
    avisos de verdad van al correo_recuperacion (ver crear_cuenta_empresa)."""
    base = slugify(razon_social).replace('-', '') or 'empresa'
    while True:
        sufijo = get_random_string(4, allowed_chars='0123456789')
        candidato = f'{base}+{sufijo}@vecinomarket.com'
        if not Usuario.objects.filter(email=candidato).exists():
            return candidato


def _generar_slug_empresa(razon_social):
    base = slugify(razon_social)[:70] or 'empresa'
    slug = base
    sufijo = 2
    while Empresa.objects.filter(slug=slug).exists():
        slug = f'{base}-{sufijo}'
        sufijo += 1
    return slug


def crear_cuenta_empresa(razon_social, nit, correo_empresa, plan, documento_url='', codigo_referido='', solicitud=None, correo_recuperacion=''):
    """Crea la cuenta de empresa completa y le manda las credenciales por
    correo (a correo_recuperacion si se indica — correo_empresa no es una
    casilla real, ver generar_correo_empresa). Devuelve (usuario, empresa,
    suscripcion)."""
    password = get_random_string(12, allowed_chars=_ALFABETO_PASSWORD)
    usuario = Usuario.objects.create_user(
        email=correo_empresa, password=password, nombre=razon_social, rol=Usuario.Rol.EMPRESA,
        correo_recuperacion=correo_recuperacion,
    )

    referente = None
    if codigo_referido:
        referente = Empresa.objects.filter(slug=codigo_referido).first()

    empresa = Empresa.objects.create(
        usuario_dueno=usuario,
        solicitud=solicitud,
        razon_social=razon_social,
        nit=nit,
        slug=_generar_slug_empresa(razon_social),
        plan=plan,
        referida_por=referente,
    )

    # CU01: "1 mes/año desde la FECHA Y HORA de adquisición" — fecha_inicio/
    # fecha_vencimiento son datetime exactos, no solo el día.
    ahora = timezone.now()
    vencimiento = ahora + timedelta(days=plan.duracion_dias)
    suscripcion = Suscripcion.objects.create(
        empresa=empresa, plan=plan, fecha_inicio=ahora, fecha_vencimiento=vencimiento,
        estado=Suscripcion.Estado.ACTIVA,
    )

    if plan.precio_mensual > 0:
        Factura.objects.create(
            empresa=empresa, suscripcion=suscripcion, tipo=Factura.Tipo.SUSCRIPCION,
            monto=plan.precio_mensual, periodo_desde=ahora.date(), periodo_hasta=vencimiento.date(),
            estado_pago=Factura.EstadoPago.PAGADA, fecha_pago=ahora,
        )

    destinatario = correo_recuperacion or correo_empresa
    try:
        send_mail(
            'Tu cuenta de empresa en VecinoMarket',
            (
                f'Hola,\n\n'
                f'Tu cuenta de empresa "{razon_social}" ya está activa con el plan {plan.nombre}.\n\n'
                'Estas son tus credenciales de acceso:\n'
                f'  Correo: {correo_empresa}\n'
                f'  Contraseña temporal: {password}\n\n'
                'Esta contraseña es temporal: por seguridad, cámbiala desde tu panel de '
                'empresa dentro de los próximos 30 días.\n\n'
                f'Ingresa aquí: {settings.FRONTEND_URL}/login'
            ),
            settings.DEFAULT_FROM_EMAIL,
            [destinatario],
            fail_silently=False,
        )
    except Exception:
        logger.exception('No se pudo enviar el correo de credenciales de empresa a %s', destinatario)

    return usuario, empresa, suscripcion
