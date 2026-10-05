import re
import unicodedata
from django.db import connection
from django.db.models import Q
from django.http import Http404
from django.shortcuts import get_object_or_404
from rest_framework import generics, status
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.auditoria.models import LogAuditoria
from apps.catalogo.models import Producto
from apps.core.utils import get_client_ip
from apps.inventario.models import Sucursal
from apps.usuarios.models import Comprador, Empresa
from apps.usuarios.permissions import EsAdmin, EsComprador, TienePermisoEmpleado, PlanPermiteIA

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
        user_agent=request.META.get('HTTP_USER_AGENT', ''),
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

    permission_classes = [TienePermisoEmpleado, PlanPermiteIA]
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

    permission_classes = [TienePermisoEmpleado, PlanPermiteIA]
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


def _quitar_tildes(texto):
    if not texto:
        return ''
    return ''.join(c for c in unicodedata.normalize('NFD', str(texto)) if unicodedata.category(c) != 'Mn').lower()


def _generar_respuesta_inteligente(empresa, pregunta):
    p = pregunta.lower().strip()
    p_norm = _quitar_tildes(p)
    p_limpia = re.sub(r'[^\w\s]', ' ', p_norm)
    palabras = [w for w in p_limpia.split() if len(w) > 2]

    STOP_WORDS = {
        'hola', 'buen', 'buenos', 'buenas', 'dias', 'tardes', 'noches', 'que', 'tal',
        'por', 'favor', 'porfa', 'gracias', 'tienen', 'tiene', 'tienes', 'venden',
        'vende', 'vendes', 'hay', 'precio', 'precios', 'costo', 'costos', 'cuanto',
        'cuesta', 'cuestan', 'vale', 'valen', 'sobre', 'este', 'esta', 'estos',
        'estas', 'producto', 'productos', 'articulo', 'articulos', 'quiero',
        'quisiera', 'busco', 'necesito', 'comprar', 'stock', 'disponible',
        'disponibles', 'catalogo', 'donde', 'como', 'cual', 'quien', 'para',
        'con', 'del', 'los', 'las', 'una', 'uno', 'unos', 'unas'
    }

    # 1. Saludos
    if any(k in p_norm for k in ['hola', 'buen dia', 'buenos dias', 'buenas tardes', 'buenas noches', 'que tal', 'hey', 'saludos']):
        prods_destacados = list(Producto.objects.filter(empresa=empresa, estado=Producto.Estado.ACTIVO)[:3])
        extra_info = ""
        if prods_destacados:
            nombres = ", ".join(f"**{pr.nombre}** (Bs {pr.precio})" for pr in prods_destacados)
            extra_info = f" Hoy tenemos disponibles productos como: {nombres}."
        return f"¡Hola! Soy el asistente virtual de **{empresa.razon_social}**.{extra_info} ¿En qué te puedo colaborar hoy? Puedes consultarme sobre productos, precios, disponibilidad, horarios o envíos."

    # 2. Búsqueda específica de producto por nombre o descripción (con normalización de tildes)
    terminos_busqueda = [w for w in palabras if w not in STOP_WORDS]
    if terminos_busqueda:
        todos_prods = list(
            Producto.objects.filter(empresa=empresa, estado=Producto.Estado.ACTIVO).prefetch_related('inventarios')
        )
        productos_coincidentes = []
        for pr in todos_prods:
            nom_norm = _quitar_tildes(pr.nombre)
            desc_norm = _quitar_tildes(pr.descripcion or '')
            if any(t in nom_norm or (len(t) >= 4 and t in desc_norm) for t in terminos_busqueda):
                productos_coincidentes.append(pr)

        if productos_coincidentes:
            if len(productos_coincidentes) == 1:
                pr = productos_coincidentes[0]
                desc_text = f" (¡Precio especial con descuento: Bs {pr.precio_descuento}!)" if pr.precio_descuento else ""
                stock_total = sum(inv.cantidad_disponible for inv in pr.inventarios.all())
                stock_str = f" Contamos con {stock_total} unidades disponibles en stock." if stock_total > 0 else " Disponible para pedido inmediato."
                return (
                    f"¡Sí! En **{empresa.razon_social}** tenemos disponible: **{pr.nombre}** a **Bs {pr.precio}**.{desc_text}{stock_str} "
                    f"Puedes agregarlo directamente a tu carrito de compras para solicitar tu pedido."
                )
            else:
                lineas = []
                for pr in productos_coincidentes[:4]:
                    d_str = f" *(Descuento: Bs {pr.precio_descuento})*" if pr.precio_descuento else ""
                    lineas.append(f"• **{pr.nombre}**: Bs {pr.precio}{d_str}")
                return (
                    f"En **{empresa.razon_social}** tenemos estas opciones disponibles que coinciden con tu búsqueda:\n"
                    + "\n".join(lineas)
                    + "\n\n¡Puedes agregarlos al carrito o preguntarme por alguno de ellos para darte más detalles!"
                )

    # 3. Preguntas generales sobre productos, catálogo, qué venden o precios
    if any(k in p for k in ['producto', 'precio', 'cuanto cuesta', 'catalogo', 'catálogo', 'venden', 'stock', 'disponible', 'comprar', 'que tienen', 'que vendes', 'articulos', 'menu', 'menú']):
        prods = list(Producto.objects.filter(empresa=empresa, estado=Producto.Estado.ACTIVO)[:4])
        if prods:
            items_str = "\n".join([f"• **{item.nombre}**: Bs {item.precio}" + (f" (en oferta a Bs {item.precio_descuento})" if item.precio_descuento else "") for item in prods])
            return (
                f"En **{empresa.razon_social}** contamos con una variedad de productos activos para ti. Por ejemplo:\n"
                f"{items_str}\n\n"
                f"Puedes agregarlos a tu carrito directamente desde nuestra tienda, o decirme qué producto buscas para verificar su precio y disponibilidad."
            )
        return f"En **{empresa.razon_social}** estamos actualizando nuestro catálogo en línea. Si buscas algo en específico, puedes pulsar 'Contactar vendedor' para coordinar directamente."

    # 4. Promociones y descuentos
    if any(k in p for k in ['promocion', 'promoción', 'oferta', 'ofertas', 'descuento', 'descuentos', 'rebaja']):
        con_descuento = list(
            Producto.objects.filter(empresa=empresa, estado=Producto.Estado.ACTIVO, precio_descuento__isnull=False)[:3]
        )
        if con_descuento:
            ofertas_str = ", ".join([f"**{pr.nombre}** a solo Bs {pr.precio_descuento} (precio normal Bs {pr.precio})" for pr in con_descuento])
            return f"¡Aprovecha nuestras ofertas vigentes en **{empresa.razon_social}**! Tenemos: {ofertas_str}. ¡Agrégalas al carrito antes de que termine la promoción!"
        return f"Actualmente todos los productos de **{empresa.razon_social}** cuentan con precios de tienda muy competitivos. ¡Revisa nuestro catálogo para ver las novedades de la temporada!"

    # 5. Horarios de atención
    if any(k in p for k in ['horario', 'hora', 'atencion', 'abierto', 'abren', 'cierran', 'atienden', 'dias', 'atención']):
        return f"En **{empresa.razon_social}** atendemos de lunes a sábado de 08:30 a 19:30 hrs. Además, nuestra tienda online en VecinoMarket está disponible las 24 horas para que hagas tus pedidos cuando gustes."

    # 6. Envíos y delivery
    if any(k in p for k in ['envio', 'delivery', 'entrega', 'despacho', 'costo envio', 'cuanto tarda', 'envío', 'domicilio', 'recojo']):
        ciudad = empresa.ciudad or 'tu ciudad'
        return f"Realizamos envíos a domicilio en toda la zona de {ciudad} y también ofrecemos la opción de recojo en tienda. El tiempo estimado de entrega suele ser de 30 a 60 minutos según tu ubicación."

    # 7. Métodos de pago
    if any(k in p for k in ['pago', 'pagar', 'metodo', 'qr', 'tarjeta', 'paypal', 'transferencia', 'efectivo', 'método']):
        return f"Aceptamos pagos electrónicos mediante PayPal (tarjetas de crédito y débito), pagos con código QR simple y transferencia bancaria o contra entrega. Todo de manera rápida y segura en el checkout."

    # 8. Ubicación
    if any(k in p for k in ['donde', 'dónde', 'ubicacion', 'ubicación', 'direccion', 'dirección', 'tienda', 'local', 'queda']):
        suc = Sucursal.objects.filter(empresa=empresa, estado=Sucursal.Estado.ACTIVA).first()
        dir_extra = f" en {suc.direccion_texto}" if suc and suc.direccion_texto else ""
        ciudad = f" en {empresa.ciudad}" if empresa.ciudad else ""
        dept = f", {empresa.departamento}" if empresa.departamento else ""
        return f"Nuestra tienda **{empresa.razon_social}** se encuentra ubicada{ciudad}{dept}{dir_extra}. Al momento de comprar en el carrito, podrás fijar en el mapa tu ubicación exacta de entrega."

    # 9. Garantía y devoluciones
    if any(k in p for k in ['garantia', 'garantía', 'devolucion', 'devolución', 'cambio', 'reembolso', 'falla', 'reclamo']):
        return f"Todos los pedidos de **{empresa.razon_social}** cuentan con la garantía de compra protegida de VecinoMarket. Si tu pedido presenta algún inconveniente, nos encargamos de coordinar la solución o el cambio correspondiente."

    # 10. Contactar asesor / persona
    if any(k in p for k in ['humano', 'persona', 'asesor', 'contacto', 'telefono', 'teléfono', 'whatsapp', 'celular', 'llamar', 'vendedor']):
        return f"Para comunicarte directamente con nuestro personal de ventas de **{empresa.razon_social}**, presiona el botón 'Contactar vendedor' en nuestra tienda para abrir un chat directo."

    # 11. Respuesta por defecto amigable y orientada a la tienda
    prods_alt = list(Producto.objects.filter(empresa=empresa, estado=Producto.Estado.ACTIVO)[:3])
    ejemplos_str = f" Por ejemplo, puedes preguntarme por: {', '.join(pr.nombre for pr in prods_alt)}." if prods_alt else ""
    return (
        f"Gracias por tu consulta a **{empresa.razon_social}**.{ejemplos_str} "
        f"Puedo orientarte sobre precios, disponibilidad, métodos de pago, horarios o envíos. "
        f"Si requieres atención personalizada, no dudes en hacer clic en 'Contactar vendedor'."
    )


class PreguntarChatbotView(APIView):
    """CU15: el comprador le pregunta al chatbot de una empresa —
    fn_responder_chatbot hace el emparejamiento por palabras clave dentro
    de la base de datos; si ninguna FAQ matchea, genera una respuesta
    inteligente y contextualizada con los datos de la empresa."""

    permission_classes = [EsComprador]

    def post(self, request):
        empresa_id = request.data.get('empresa')
        pregunta = (request.data.get('pregunta') or '').strip()
        if not empresa_id or not pregunta:
            return Response({'detail': 'empresa y pregunta son obligatorios.'}, status=status.HTTP_400_BAD_REQUEST)
        empresa = get_object_or_404(Empresa, id=empresa_id)

        with connection.cursor() as cursor:
            cursor.execute('SELECT fn_responder_chatbot(%s, %s)', [empresa.id, pregunta])
            row = cursor.fetchone()
            respuesta = row[0] if row else None

        if not respuesta:
            respuesta = _generar_respuesta_inteligente(empresa, pregunta)

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
