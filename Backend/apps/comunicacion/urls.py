from django.urls import path

from .views import (
    DetalleMensajesAdminView,
    EditarEliminarMiFaqView,
    ListaConversacionesAdminView,
    ListaConversacionesEmpresaView,
    ListaCrearMensajesView,
    ListaCrearMisConversacionesView,
    ListaCrearMisFaqsView,
    ListaFaqsEmpresaPublicoView,
    ListaInteraccionesChatbotAdminView,
    ListaResumenEmpresasChatAdminView,
    ListaResumenEmpresasChatbotAdminView,
    PreguntarChatbotView,
)

urlpatterns = [
    # CU14: el comprador — sus conversaciones y mensajes
    path('mis-conversaciones/', ListaCrearMisConversacionesView.as_view(), name='mis-conversaciones'),

    # CU14: la empresa (dueño o empleado con permiso 'gestionar_chat')
    path('conversaciones-empresa/', ListaConversacionesEmpresaView.as_view(), name='conversaciones-empresa'),

    # CU14: mensajes de una conversación — compartido comprador/empresa, valida dueño
    path('conversaciones/<int:conversacion_id>/mensajes/', ListaCrearMensajesView.as_view(), name='mensajes-conversacion'),

    # CU14: SuperAdmin/Admin de soporte — solo lectura
    path('admin/resumen-empresas/', ListaResumenEmpresasChatAdminView.as_view(), name='admin-resumen-empresas-chat'),
    path('admin/conversaciones/', ListaConversacionesAdminView.as_view(), name='admin-conversaciones'),
    path('admin/conversaciones/<int:conversacion_id>/mensajes/', DetalleMensajesAdminView.as_view(), name='admin-conversacion-mensajes'),

    # CU15: chatbot por empresa — la empresa configura sus FAQ
    path('mis-faqs-chatbot/', ListaCrearMisFaqsView.as_view(), name='mis-faqs-chatbot'),
    path('mis-faqs-chatbot/<int:faq_id>/', EditarEliminarMiFaqView.as_view(), name='mi-faq-chatbot-detalle'),

    # CU15: público — cualquier visitante le pregunta al chatbot de una empresa
    path('empresas/<int:empresa_id>/faqs-chatbot/', ListaFaqsEmpresaPublicoView.as_view(), name='faqs-chatbot-publico'),
    path('preguntar-chatbot/', PreguntarChatbotView.as_view(), name='preguntar-chatbot'),

    # CU15: SuperAdmin/Admin de soporte — solo lectura
    path('admin/resumen-empresas-chatbot/', ListaResumenEmpresasChatbotAdminView.as_view(), name='admin-resumen-empresas-chatbot'),
    path('admin/interacciones-chatbot/', ListaInteraccionesChatbotAdminView.as_view(), name='admin-interacciones-chatbot'),
]
