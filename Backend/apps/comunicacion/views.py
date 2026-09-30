from django.db import connection
from django.http import Http404
from django.shortcuts import get_object_or_404
from rest_framework import generics, status
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.auditoria.models import LogAuditoria
from apps.core.utils import get_client_ip
from apps.usuarios.models import Comprador, Empresa
from apps.usuarios.permissions import EsAdmin, EsComprador, TienePermisoEmpleado

from .models import ChatbotFAQ, ChatbotInteraccion, ChatConversacion, ChatMensaje
from .serializers import (
    ChatbotFAQSerializer,
    ChatbotInteraccionSerializer,
    ChatConversacionSerializer,
    ChatMensajeSerializer,
)


def _log(request, accion, entidad_id, detalle=None, entidad_afectada='conversacion'):
    LogAuditoria.objects.create(
        usuario=request.user,
        accion=accion,
        entidad_afectada=entidad_afectada,
        entidad_id=entidad_id,
        detalle=detalle or {},
        ip_origen=get_client_ip(request),
    )


def _puede_acceder(user, conversacion):
    """CU14: dueño de la conversación (el comprador que la abrió, o la
    empresa con la que habla — cualquier empleado con permiso
    'gestionar_chat', no solo el dueño)."""
    if user.es_comprador():
        return conversacion.comprador.usuario_id == user.id
    if user.es_empresa() or user.es_empleado():
        empresa = user.get_empresa()
        return bool(empresa) and conversacion.empresa_id == empresa.id
    return False


class ListaCrearMisConversacionesView(generics.ListCreateAPIView):
    """CU14: el comprador ve sus conversaciones y abre una nueva con una
    empresa (o reutiliza la que ya tenía con ella)."""

    permission_classes = [EsComprador]
    serializer_class = ChatConversacionSerializer
    pagination_class = None

    def get_serializer_context(self):
        return {**super().get_serializer_context(), 'usuario': self.request.user}

    def get_queryset(self):
        return ChatConversacion.objects.filter(
            comprador__usuario=self.request.user, activo=True
        ).select_related('comprador__usuario', 'empresa').order_by('-actualizado_en')

    def create(self, request, *args, **kwargs):
        empresa_id = request.data.get('empresa')
        empresa = get_object_or_404(Empresa, id=empresa_id)
        comprador = get_object_or_404(Comprador, usuario=request.user)
        conversacion, creada = ChatConversacion.objects.get_or_create(comprador=comprador, empresa=empresa)
        if creada:
            _log(request, 'CREAR_CONVERSACION', conversacion.id, {'empresa_id': empresa.id})
        serializer = self.get_serializer(conversacion)
        return Response(serializer.data, status=status.HTTP_201_CREATED if creada else status.HTTP_200_OK)


class ListaConversacionesEmpresaView(generics.ListAPIView):
    """CU14: la empresa (dueño o empleado con permiso 'gestionar_chat') ve
    SUS conversaciones con compradores."""

    permission_classes = [TienePermisoEmpleado]
    permiso_requerido = 'gestionar_chat'
    serializer_class = ChatConversacionSerializer
    pagination_class = None

    def get_serializer_context(self):
        return {**super().get_serializer_context(), 'usuario': self.request.user}

    def get_queryset(self):
        return ChatConversacion.objects.filter(
            empresa=self.request.user.get_empresa(), activo=True
        ).select_related('comprador__usuario', 'empresa').order_by('-actualizado_en')


class ListaCrearMensajesView(generics.ListCreateAPIView):
    """CU14: mensajes de una conversación — sirve tanto al comprador como a
    la empresa que la tiene abierta; _puede_acceder valida que sea suya.
    Acepta texto o un archivo (imagen/audio/video, multipart)."""

    serializer_class = ChatMensajeSerializer
    pagination_class = None
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    permiso_requerido = 'gestionar_chat'

    def get_permissions(self):
        user = self.request.user
        if user.is_authenticated and user.es_comprador():
            return [EsComprador()]
        return [TienePermisoEmpleado()]

    def _conversacion(self):
        conversacion = get_object_or_404(ChatConversacion, id=self.kwargs['conversacion_id'])
        if not _puede_acceder(self.request.user, conversacion):
            raise Http404
        return conversacion

    def get_queryset(self):
        conversacion = self._conversacion()
        # Al listar, se marcan como leídos los mensajes que no mandó este usuario.
        conversacion.mensajes.exclude(emisor_usuario=self.request.user).update(leido=True)
        return conversacion.mensajes.select_related('emisor_usuario')

    def perform_create(self, serializer):
        conversacion = self._conversacion()
        archivo = self.request.FILES.get('archivo')
        tipo = self.request.data.get('tipo', ChatMensaje.Tipo.TEXTO)
        mensaje = serializer.save(conversacion=conversacion, emisor_usuario=self.request.user, tipo=tipo, archivo=archivo)
        conversacion.save(update_fields=['actualizado_en'])
        _log(self.request, 'ENVIAR_MENSAJE', mensaje.id, {'conversacion_id': conversacion.id, 'tipo': mensaje.tipo}, entidad_afectada='mensaje')


class ListaResumenEmpresasChatAdminView(APIView):
    """CU14: el SuperAdmin ve, por empresa, cuántas conversaciones tiene,
    antes de entrar a ver el detalle de cada una."""

    permission_classes = [EsAdmin]

    def get(self, request):
        empresas = Empresa.objects.all().order_by('razon_social')
        q = request.query_params.get('q', '').strip()
        if q:
            empresas = empresas.filter(razon_social__icontains=q)

        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT empresa_id, COUNT(*)
                FROM comunicacion_chatconversacion
                WHERE activo = true
                GROUP BY empresa_id
            """)
            resumen = {row[0]: row[1] for row in cursor.fetchall()}

        resultados = [
            {
                'id': e.id, 'razon_social': e.razon_social, 'slug': e.slug,
                'logo_url': e.logo_url, 'ciudad': e.ciudad,
                'total_conversaciones': resumen.get(e.id, 0),
            }
            for e in empresas
        ]
        return Response(resultados)


class ListaConversacionesAdminView(generics.ListAPIView):
    """CU14: el SuperAdmin ve las conversaciones de una empresa
    (?empresa=<id>) — de solo lectura."""

    permission_classes = [EsAdmin]
    serializer_class = ChatConversacionSerializer
    pagination_class = None

    def get_serializer_context(self):
        return {**super().get_serializer_context(), 'usuario': self.request.user}

    def get_queryset(self):
        qs = ChatConversacion.objects.filter(activo=True).select_related('comprador__usuario', 'empresa').order_by('-actualizado_en')
        empresa_id = self.request.query_params.get('empresa')
        if empresa_id:
            qs = qs.filter(empresa_id=empresa_id)
        return qs


class DetalleMensajesAdminView(generics.ListAPIView):
    """CU14: el SuperAdmin ve los mensajes de una conversación — de solo
    lectura (no puede editar ni eliminar)."""

    permission_classes = [EsAdmin]
    serializer_class = ChatMensajeSerializer
    pagination_class = None

    def get_queryset(self):
        return ChatMensaje.objects.filter(conversacion_id=self.kwargs['conversacion_id']).select_related('emisor_usuario')


class ListaCrearMisFaqsView(generics.ListCreateAPIView):
    """CU15: la empresa (dueño o empleado con permiso 'gestionar_chat')
    configura las preguntas frecuentes de SU chatbot."""

    permission_classes = [TienePermisoEmpleado]
    permiso_requerido = 'gestionar_chat'
    serializer_class = ChatbotFAQSerializer
    pagination_class = None

    def get_queryset(self):
        return ChatbotFAQ.objects.filter(activo=True, empresa=self.request.user.get_empresa()).order_by('-creado_en')

    def perform_create(self, serializer):
        faq = serializer.save(empresa=self.request.user.get_empresa())
        _log(self.request, 'CREAR_FAQ_CHATBOT', faq.id, {'palabras_clave': faq.palabras_clave}, entidad_afectada='chatbot_faq')


class EditarEliminarMiFaqView(APIView):
    """CU15: la empresa edita o elimina una de SUS preguntas frecuentes."""

    permission_classes = [TienePermisoEmpleado]
    permiso_requerido = 'gestionar_chat'

    def patch(self, request, faq_id):
        faq = get_object_or_404(ChatbotFAQ, id=faq_id, empresa=request.user.get_empresa())
        serializer = ChatbotFAQSerializer(faq, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        _log(request, 'EDITAR_FAQ_CHATBOT', faq.id, {'palabras_clave': faq.palabras_clave}, entidad_afectada='chatbot_faq')
        return Response(ChatbotFAQSerializer(faq).data)

    def delete(self, request, faq_id):
        faq = get_object_or_404(ChatbotFAQ, id=faq_id, empresa=request.user.get_empresa())
        faq.delete()
        _log(request, 'ELIMINAR_FAQ_CHATBOT', faq_id, {}, entidad_afectada='chatbot_faq')
        return Response(status=status.HTTP_204_NO_CONTENT)


class ListaFaqsEmpresaPublicoView(generics.ListAPIView):
    """CU15: cualquier visitante ve las preguntas de ejemplo del chatbot de
    una empresa (?empresa=<id>), para saber qué puede preguntarle."""

    permission_classes = [AllowAny]
    serializer_class = ChatbotFAQSerializer
    pagination_class = None

    def get_queryset(self):
        return ChatbotFAQ.objects.filter(activo=True, empresa_id=self.kwargs['empresa_id']).exclude(pregunta_ejemplo='')


class PreguntarChatbotView(APIView):
    """CU15: el comprador le pregunta al chatbot de una empresa —
    fn_responder_chatbot hace el emparejamiento por palabras clave dentro
    de la base de datos; si ninguna FAQ matchea, cae a un mensaje por
    defecto. Cada intercambio queda en ChatbotInteraccion."""

    permission_classes = [AllowAny]

    def post(self, request):
        empresa_id = request.data.get('empresa')
        pregunta = (request.data.get('pregunta') or '').strip()
        if not empresa_id or not pregunta:
            return Response({'detail': 'empresa y pregunta son obligatorios.'}, status=status.HTTP_400_BAD_REQUEST)
        empresa = get_object_or_404(Empresa, id=empresa_id)

        with connection.cursor() as cursor:
            cursor.execute('SELECT fn_responder_chatbot(%s, %s)', [empresa.id, pregunta])
            respuesta = cursor.fetchone()[0]

        if not respuesta:
            respuesta = (
                f'No tengo una respuesta configurada para eso todavía. '
                f'Escríbele directo a {empresa.razon_social} por el chat de la tienda.'
            )

        comprador = None
        if request.user.is_authenticated and request.user.es_comprador():
            comprador = getattr(request.user, 'comprador', None)

        interaccion = ChatbotInteraccion.objects.create(
            comprador=comprador, empresa=empresa, pregunta=pregunta, respuesta=respuesta
        )
        return Response(ChatbotInteraccionSerializer(interaccion).data, status=status.HTTP_201_CREATED)


class ListaResumenEmpresasChatbotAdminView(APIView):
    """CU15: el SuperAdmin ve, por empresa, cuántas FAQ configuró y cuántas
    interacciones tuvo su chatbot."""

    permission_classes = [EsAdmin]

    def get(self, request):
        empresas = Empresa.objects.all().order_by('razon_social')
        q = request.query_params.get('q', '').strip()
        if q:
            empresas = empresas.filter(razon_social__icontains=q)

        with connection.cursor() as cursor:
            cursor.execute("SELECT empresa_id, COUNT(*) FROM comunicacion_chatbotfaq WHERE activo = true GROUP BY empresa_id")
            faqs = {row[0]: row[1] for row in cursor.fetchall()}
            cursor.execute("SELECT empresa_id, COUNT(*) FROM comunicacion_chatbotinteraccion WHERE empresa_id IS NOT NULL GROUP BY empresa_id")
            interacciones = {row[0]: row[1] for row in cursor.fetchall()}

        resultados = [
            {
                'id': e.id, 'razon_social': e.razon_social, 'slug': e.slug,
                'logo_url': e.logo_url, 'ciudad': e.ciudad,
                'total_faqs': faqs.get(e.id, 0), 'total_interacciones': interacciones.get(e.id, 0),
            }
            for e in empresas
        ]
        return Response(resultados)


class ListaInteraccionesChatbotAdminView(generics.ListAPIView):
    """CU15: el SuperAdmin ve el historial de preguntas/respuestas del
    chatbot de una empresa (?empresa=<id>) — de solo lectura."""

    permission_classes = [EsAdmin]
    serializer_class = ChatbotInteraccionSerializer
    pagination_class = None

    def get_queryset(self):
        qs = ChatbotInteraccion.objects.order_by('-fecha')
        empresa_id = self.request.query_params.get('empresa')
        if empresa_id:
            qs = qs.filter(empresa_id=empresa_id)
        return qs
