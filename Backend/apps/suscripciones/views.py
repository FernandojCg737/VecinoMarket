from datetime import timedelta
from decimal import ROUND_HALF_UP, Decimal

from django.conf import settings
from django.core.cache import cache
from django.db import connection, transaction
from django.db.models import ProtectedError
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.generics import ListAPIView, ListCreateAPIView
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.auditoria.models import LogAuditoria
from apps.core.utils import get_client_ip
from apps.facturacion.models import Factura
from apps.pagos import paypal_client
from apps.pagos.paypal_client import PaypalError
from apps.usuarios.models import Empresa
from apps.usuarios.permissions import EsEmpresa, EsSuperAdmin

from .models import Plan, Suscripcion
from .serializers import EditarSuscripcionSerializer, PlanAdminSerializer, PlanSerializer


def _log(request, accion, entidad_id, detalle=None):
    LogAuditoria.objects.create(
        usuario=request.user,
        accion=accion,
        entidad_afectada='plan',
        entidad_id=entidad_id,
        detalle=detalle or {},
        ip_origen=get_client_ip(request),
    )


class ListaCrearPlanAdminView(ListCreateAPIView):
    """CU20: el SuperAdmin ve TODOS los planes (activos e inactivos) y crea
    planes nuevos."""

    permission_classes = [EsSuperAdmin]
    serializer_class = PlanAdminSerializer
    pagination_class = None
    queryset = Plan.objects.all().order_by('precio_mensual')

    def perform_create(self, serializer):
        plan = serializer.save()
        _log(self.request, 'CREAR_PLAN', plan.id, {'nombre': plan.nombre})


class EditarEliminarPlanAdminView(APIView):
    """CU20: edita un plan, o lo elimina — si alguna empresa ya tuvo una
    suscripción con ese plan (Suscripcion.plan usa on_delete=PROTECT, no se
    puede borrar sin perder ese historial), se rechaza con un mensaje claro
    en vez de un 500; la salida ahí es desactivarlo (estado=INACTIVO), no
    eliminarlo."""

    permission_classes = [EsSuperAdmin]

    def patch(self, request, plan_id):
        plan = get_object_or_404(Plan, id=plan_id)
        serializer = PlanAdminSerializer(plan, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        _log(request, 'EDITAR_PLAN', plan.id, {'nombre': plan.nombre, 'estado': plan.estado})
        return Response(PlanAdminSerializer(plan).data)

    def delete(self, request, plan_id):
        plan = get_object_or_404(Plan, id=plan_id)
        nombre = plan.nombre
        try:
            plan.delete()
        except ProtectedError:
            return Response(
                {'detail': 'Este plan ya tiene empresas suscritas (activas o pasadas); no se puede eliminar. Desactívalo en vez de eso.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        _log(request, 'ELIMINAR_PLAN', plan_id, {'nombre': nombre})
        return Response(status=status.HTTP_204_NO_CONTENT)


class ListaPlanesView(ListAPIView):
    """CU01/CU20: planes activos. Pública (AllowAny) porque también la lee
    el formulario de solicitud de empresa (RequestCompany.jsx), antes de que
    el comprador que solicita tenga ninguna sesión de empresa."""

    permission_classes = [AllowAny]
    serializer_class = PlanSerializer
    pagination_class = None
    queryset = Plan.objects.filter(estado=Plan.Estado.ACTIVO).order_by('precio_mensual')


class EditarSuscripcionEmpresaView(APIView):
    """CU01: asigna o edita la suscripción vigente de una empresa (plan y
    fecha de vencimiento exacta)."""

    permission_classes = [EsSuperAdmin]

    def post(self, request, empresa_id):
        empresa = get_object_or_404(Empresa, id=empresa_id)
        serializer = EditarSuscripcionSerializer(data=request.data, context={'empresa': empresa})
        serializer.is_valid(raise_exception=True)
        suscripcion = serializer.save()

        LogAuditoria.objects.create(
            usuario=request.user,
            accion='EDITAR_SUSCRIPCION_EMPRESA',
            entidad_afectada='empresa',
            entidad_id=empresa.id,
            detalle={
                'plan': suscripcion.plan.nombre,
                'fecha_vencimiento': str(suscripcion.fecha_vencimiento),
            },
            ip_origen=get_client_ip(request),
        )
        return Response(
            {'detail': 'Suscripción actualizada.', 'fecha_vencimiento': suscripcion.fecha_vencimiento}
        )


class ExpirarSuscripcionesView(APIView):
    """CU01: dispara manualmente sp_expirar_suscripciones_vencidas (lo mismo
    que corre el comando `expirar_suscripciones` y cada vez que el admin abre
    el listado de empresas), por si se quiere forzar el refresco desde la UI."""

    permission_classes = [EsSuperAdmin]

    def post(self, request):
        with connection.cursor() as cursor:
            cursor.execute('CALL sp_expirar_suscripciones_vencidas();')
        return Response({'detail': 'Suscripciones vencidas actualizadas.'})


class MiSuscripcionView(APIView):
    """CU01: la empresa ve su plan y vencimiento actuales, para decidir si
    le conviene mejorar de plan."""

    permission_classes = [EsEmpresa]

    def get(self, request):
        empresa = request.user.get_empresa()
        suscripcion = Suscripcion.objects.filter(empresa=empresa).order_by('-fecha_vencimiento').first()
        return Response({
            'plan': PlanSerializer(empresa.plan).data if empresa.plan else None,
            'fecha_inicio': suscripcion.fecha_inicio if suscripcion else None,
            'fecha_vencimiento': suscripcion.fecha_vencimiento if suscripcion else None,
            'estado': suscripcion.estado if suscripcion else None,
        })


_PREFIJO_CACHE_MEJORA_PLAN = 'mejora_plan_pendiente'


class MejorarPlanCheckoutView(APIView):
    """CU01: primer paso para que la empresa pague (PayPal) y cambie a un
    plan superior. El plan elegido queda en cache atado al paypal_order_id
    (no al cuerpo del segundo request) para que MejorarPlanConfirmarView no
    pueda aplicar un plan distinto al que realmente se cobró."""

    permission_classes = [EsEmpresa]

    def post(self, request):
        plan = get_object_or_404(Plan, id=request.data.get('plan_id'), estado=Plan.Estado.ACTIVO)
        if plan.codigo == Plan.Codigo.PRUEBA:
            return Response({'detail': 'No puedes cambiarte al plan de Prueba.'}, status=status.HTTP_400_BAD_REQUEST)

        empresa = request.user.get_empresa()
        monto_usd = (plan.precio_mensual / settings.TASA_CAMBIO_USD_BOB).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
        try:
            orden = paypal_client.crear_orden(monto_usd)
        except PaypalError as exc:
            return Response({'detail': str(exc), 'paypal': exc.detalle}, status=status.HTTP_502_BAD_GATEWAY)

        cache.set(
            f'{_PREFIJO_CACHE_MEJORA_PLAN}:{orden["id"]}',
            {'empresa_id': empresa.id, 'plan_id': plan.id},
            timeout=3600,
        )
        return Response({'paypal_order_id': orden['id'], 'monto_usd': str(monto_usd)}, status=status.HTTP_201_CREATED)


class MejorarPlanConfirmarView(APIView):
    """CU01: segundo paso — captura el pago y recién ahí cambia el plan de
    la empresa (misma edición in-place de la suscripción vigente que ya usa
    EditarSuscripcionSerializer, para no acumular una fila por cada cambio)."""

    permission_classes = [EsEmpresa]

    def post(self, request):
        paypal_order_id = request.data.get('paypal_order_id')
        empresa = request.user.get_empresa()

        pendiente = cache.get(f'{_PREFIJO_CACHE_MEJORA_PLAN}:{paypal_order_id}')
        if not pendiente or pendiente['empresa_id'] != empresa.id:
            return Response(
                {'detail': 'No hay un pago pendiente con ese paypal_order_id.'}, status=status.HTTP_400_BAD_REQUEST
            )

        try:
            resultado = paypal_client.capturar_orden(paypal_order_id)
        except PaypalError as exc:
            return Response({'detail': str(exc), 'paypal': exc.detalle}, status=status.HTTP_502_BAD_GATEWAY)

        if resultado.get('status') != 'COMPLETED':
            return Response({'detail': 'PayPal no aprobó el pago.'}, status=status.HTTP_402_PAYMENT_REQUIRED)

        plan = get_object_or_404(Plan, id=pendiente['plan_id'])
        # CU01: "desde la fecha y hora de adquisición" — datetime exacto, no
        # solo el día.
        ahora = timezone.now()
        vencimiento = ahora + timedelta(days=plan.duracion_dias)

        with transaction.atomic():
            suscripcion = Suscripcion.objects.filter(empresa=empresa).order_by('-fecha_vencimiento').first()
            if suscripcion is None:
                suscripcion = Suscripcion.objects.create(
                    empresa=empresa, plan=plan, fecha_inicio=ahora, fecha_vencimiento=vencimiento,
                    estado=Suscripcion.Estado.ACTIVA,
                )
            else:
                suscripcion.plan = plan
                suscripcion.fecha_inicio = ahora
                suscripcion.fecha_vencimiento = vencimiento
                suscripcion.estado = Suscripcion.Estado.ACTIVA
                suscripcion.save(update_fields=['plan', 'fecha_inicio', 'fecha_vencimiento', 'estado'])

            empresa.plan = plan
            empresa.save(update_fields=['plan'])

            Factura.objects.create(
                empresa=empresa, suscripcion=suscripcion, tipo=Factura.Tipo.SUSCRIPCION,
                monto=plan.precio_mensual, periodo_desde=ahora.date(), periodo_hasta=vencimiento.date(),
                estado_pago=Factura.EstadoPago.PAGADA, fecha_pago=ahora,
            )

        cache.delete(f'{_PREFIJO_CACHE_MEJORA_PLAN}:{paypal_order_id}')
        LogAuditoria.objects.create(
            usuario=request.user, accion='MEJORAR_PLAN', entidad_afectada='empresa', entidad_id=empresa.id,
            detalle={'plan_nuevo': plan.nombre, 'fecha_vencimiento': str(vencimiento)},
            ip_origen=get_client_ip(request),
        )
        return Response({
            'detail': 'Plan actualizado.', 'plan': PlanSerializer(plan).data, 'fecha_vencimiento': vencimiento,
        })
