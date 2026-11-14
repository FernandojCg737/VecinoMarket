from django.db import transaction
from django.http import FileResponse
from django.shortcuts import get_object_or_404
from django.urls import reverse
from django.utils import timezone
from rest_framework import generics, serializers, status
from rest_framework.exceptions import PermissionDenied
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.inventario.models import Sucursal
from apps.notificaciones.models import Notificacion
from apps.usuarios.models import Empleado
from apps.usuarios.permissions import EsComprador

from .devoluciones import (
    ORDEN_PAGADA, ConflictoDevolucion, bloquear_solicitud, finalizar_reembolso,
    iniciar_reembolso, procesar_paypal, registrar_cambio,
)
from .evidencias import abrir_evidencia, descartar_evidencia, guardar_evidencia, validar_foto
from .models import OrdenCompra, Pago, Pedido, SolicitudDevolucion
from .stock import sucursales_restitucion
from .views import PedidoPagination

Estado = SolicitudDevolucion.Estado


def puede_gestionar_empresa(usuario):
    if usuario.es_empresa():
        return True
    empleado = getattr(usuario, 'empleado', None)
    return usuario.es_empleado() and empleado and empleado.activo and empleado.estado == Empleado.Estado.ACTIVO and empleado.permisos.filter(
        permiso__codigo='gestionar_pedidos',
    ).exists()


def solicitudes_visibles(usuario):
    solicitudes = SolicitudDevolucion.objects.select_related(
        'comprador__usuario', 'pedido__empresa', 'pedido__orden_compra', 'pago',
    )
    if usuario.es_admin():
        return solicitudes
    if usuario.es_comprador():
        return solicitudes.filter(comprador__usuario=usuario)
    if puede_gestionar_empresa(usuario):
        return solicitudes.filter(pedido__empresa=usuario.get_empresa())
    raise PermissionDenied('No tienes permiso para consultar reclamos.')


def acciones_disponibles(solicitud, usuario):
    estado = solicitud.estado
    es_empresa = usuario.es_empresa() or usuario.es_empleado()
    if estado == Estado.PENDIENTE and es_empresa:
        return ['aprobar', 'rechazar']
    if estado == Estado.RECHAZADA and usuario.es_comprador():
        return ['escalar']
    if estado in (Estado.PENDIENTE, Estado.EN_MEDIACION) and usuario.es_superadmin():
        return ['mediar_aprobar', 'mediar_rechazar']
    if estado == Estado.REEMBOLSO_PENDIENTE and (es_empresa or usuario.es_superadmin()):
        if solicitud.pago.metodo == Pago.Metodo.PAYPAL:
            return ['verificar_paypal', 'conciliar_paypal'] if usuario.es_superadmin() else ['verificar_paypal']
        return ['confirmar_qr']
    return []


class SolicitudSerializer(serializers.ModelSerializer):
    numero_pedido = serializers.CharField(source='pedido.numero_pedido')
    empresa = serializers.CharField(source='pedido.empresa.razon_social')
    metodo_pago = serializers.CharField(source='pedido.orden_compra.metodo_pago')
    motivo_label = serializers.CharField(source='get_motivo_display')
    estado_label = serializers.CharField(source='get_estado_display')
    acciones = serializers.SerializerMethodField()
    evidencia_path = serializers.SerializerMethodField()

    class Meta:
        model = SolicitudDevolucion
        fields = [
            'id', 'pedido', 'numero_pedido', 'empresa', 'metodo_pago', 'motivo', 'motivo_label',
            'descripcion', 'estado', 'estado_label', 'respuesta', 'motivo_mediacion',
            'resolucion_mediacion', 'creado_en', 'fecha_respuesta', 'fecha_mediacion',
            'fecha_resolucion', 'fecha_reembolso', 'monto_reembolso', 'referencia_reembolso',
            'acciones', 'evidencia_path',
        ]

    def get_acciones(self, solicitud):
        return acciones_disponibles(solicitud, self.context['request'].user)

    def get_evidencia_path(self, solicitud):
        return reverse('devolucion-evidencia', kwargs={'pk': solicitud.pk})


class SolicitudDetalleSerializer(SolicitudSerializer):
    items_sucursales = serializers.SerializerMethodField()

    class Meta(SolicitudSerializer.Meta):
        fields = SolicitudSerializer.Meta.fields + ['items_sucursales']

    def get_items_sucursales(self, solicitud):
        if not {'aprobar', 'mediar_aprobar'}.intersection(self.get_acciones(solicitud)):
            return []
        items, opciones = sucursales_restitucion(solicitud.pedido)
        ambiguos = [item for item in items if len(opciones[item.pk]) != 1]
        nombres = dict(Sucursal.objects.filter(
            pk__in={pk for item in ambiguos for pk in opciones[item.pk]},
        ).values_list('pk', 'nombre'))
        return [
            {'id': item.pk, 'producto': item.producto.nombre,
             'opciones': [{'id': pk, 'nombre': nombres[pk]} for pk in opciones[item.pk]]}
            for item in ambiguos
        ]


class CrearSolicitudSerializer(serializers.Serializer):
    pedido = serializers.IntegerField(min_value=1)
    motivo = serializers.ChoiceField(choices=SolicitudDevolucion.Motivo.choices)
    descripcion = serializers.CharField(max_length=2000)
    evidencia = serializers.FileField()


class AccionSolicitudSerializer(serializers.Serializer):
    accion = serializers.ChoiceField(choices=[
        'aprobar', 'rechazar', 'escalar', 'mediar_aprobar', 'mediar_rechazar',
        'confirmar_qr', 'verificar_paypal', 'conciliar_paypal',
    ])
    respuesta = serializers.CharField(max_length=2000, required=False)
    referencia = serializers.CharField(max_length=100, required=False)
    sucursales = serializers.DictField(child=serializers.IntegerField(min_value=1), required=False)

    def validate(self, data):
        accion = data['accion']
        if accion not in ('confirmar_qr', 'verificar_paypal', 'conciliar_paypal') and not data.get('respuesta'):
            raise serializers.ValidationError({'respuesta': 'Escribe una respuesta o el motivo de la mediación.'})
        if accion in ('confirmar_qr', 'conciliar_paypal') and not data.get('referencia'):
            raise serializers.ValidationError({'referencia': 'Indica la referencia del reembolso.'})
        return data


class ListaSolicitudesView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = SolicitudSerializer
    pagination_class = PedidoPagination

    def get_queryset(self):
        queryset = solicitudes_visibles(self.request.user)
        estado = self.request.query_params.get('estado')
        return queryset.filter(estado=estado) if estado in Estado.values else queryset


class CrearSolicitudView(APIView):
    permission_classes = [EsComprador]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        serializer = CrearSolicitudSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        datos = serializer.validated_data
        pedido = get_object_or_404(Pedido, pk=datos['pedido'], orden_compra__comprador__usuario=request.user)
        foto = validar_foto(datos['evidencia'])
        nombre = None
        try:
            with transaction.atomic():
                orden = OrdenCompra.objects.select_for_update().get(pk=pedido.orden_compra_id)
                pedido = Pedido.objects.select_for_update().get(pk=pedido.pk, orden_compra=orden)
                if pedido.estado != Pedido.Estado.ENTREGADO or orden.estado_pago not in ORDEN_PAGADA:
                    raise ConflictoDevolucion('Solo puedes reclamar un pedido entregado y pagado.')
                if SolicitudDevolucion.objects.filter(pedido=pedido).exists():
                    raise ConflictoDevolucion('Este pedido ya tiene un reclamo.')
                nombre = guardar_evidencia(foto)
                solicitud = SolicitudDevolucion.objects.create(
                    pedido=pedido, comprador_id=orden.comprador_id, motivo=datos['motivo'],
                    descripcion=datos['descripcion'], evidencia=nombre,
                )
                registrar_cambio(solicitud, request, 'DEVOLUCION_CREADA', 'Recibimos tu reclamo')
                if pedido.empresa.usuario_dueno_id:
                    Notificacion.objects.create(
                        usuario_id=pedido.empresa.usuario_dueno_id, tipo='DEVOLUCION_RECIBIDA',
                        titulo='Nuevo reclamo de devolución', mensaje=pedido.numero_pedido,
                        enlace=f'/reclamos/{solicitud.pk}',
                    )
        except Exception:
            if nombre is not None:
                descartar_evidencia(nombre)
            raise
        return Response(
            SolicitudDetalleSerializer(solicitud, context={'request': request}).data,
            status=status.HTTP_201_CREATED,
        )


class DetalleSolicitudView(generics.RetrieveAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = SolicitudDetalleSerializer

    def get_queryset(self):
        return solicitudes_visibles(self.request.user)


class EvidenciaSolicitudView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        solicitud = get_object_or_404(solicitudes_visibles(request.user), pk=pk)
        response = FileResponse(abrir_evidencia(solicitud.evidencia.name), content_type='image/jpeg')
        response['Cache-Control'] = 'private, no-store'
        return response


class AccionSolicitudView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [JSONParser]

    def post(self, request, pk):
        get_object_or_404(solicitudes_visibles(request.user), pk=pk)
        if request.user.es_admin() and not request.user.es_superadmin():
            raise PermissionDenied('El administrador de soporte tiene acceso de consulta.')
        serializer = AccionSolicitudSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        datos = serializer.validated_data
        accion = datos['accion']
        procesar = False
        with transaction.atomic():
            solicitud = bloquear_solicitud(pk)
            if accion not in acciones_disponibles(solicitud, request.user):
                raise ConflictoDevolucion('La acción no está disponible para este caso.')
            fecha = timezone.now()
            if accion == 'confirmar_qr':
                referencia = datos['referencia']
                if solicitud.pago.devoluciones.filter(referencia_reembolso__iexact=referencia).exists():
                    raise ConflictoDevolucion('Esa transferencia ya se registró para este pago.')
                finalizar_reembolso(solicitud, referencia, request)
            elif accion in ('verificar_paypal', 'conciliar_paypal'):
                procesar = True
            else:
                respuesta = datos['respuesta']
                if accion in ('aprobar', 'rechazar'):
                    solicitud.respuesta = respuesta
                    solicitud.fecha_respuesta = fecha
                elif accion == 'escalar':
                    solicitud.motivo_mediacion = respuesta
                    solicitud.fecha_mediacion = fecha
                else:
                    solicitud.resolucion_mediacion = respuesta
                    solicitud.fecha_resolucion = fecha

                if accion in ('aprobar', 'mediar_aprobar'):
                    iniciar_reembolso(solicitud, datos.get('sucursales', {}))
                    procesar = solicitud.pago.metodo == Pago.Metodo.PAYPAL
                else:
                    solicitud.estado = {
                        'rechazar': Estado.RECHAZADA, 'escalar': Estado.EN_MEDIACION,
                        'mediar_rechazar': Estado.RECHAZADA_MEDIACION,
                    }[accion]
                solicitud.save()
                registrar_cambio(solicitud, request, f'DEVOLUCION_{accion.upper()}', 'Actualización de tu reclamo')
        if procesar:
            referencia = datos.get('referencia') if accion == 'conciliar_paypal' else None
            solicitud = procesar_paypal(pk, request, referencia_conciliacion=referencia)
        return Response(SolicitudDetalleSerializer(solicitud, context={'request': request}).data)
