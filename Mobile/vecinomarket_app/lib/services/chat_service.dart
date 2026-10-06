import 'api_client.dart';

class ChatService {
  /// Obtiene las conversaciones del comprador autenticado (CU14)
  Future<List<Map<String, dynamic>>> obtenerMisConversaciones() async {
    final res = await ApiClient.instance.get('comunicacion/mis-conversaciones/');
    if (res is List) {
      return res.map((e) => Map<String, dynamic>.from(e as Map)).toList();
    }
    return [];
  }

  /// Abre o reutiliza la conversación existente con una empresa dada
  Future<Map<String, dynamic>> iniciarOObtenerConversacion(int empresaId) async {
    final res = await ApiClient.instance.post(
      'comunicacion/mis-conversaciones/',
      {'empresa': empresaId},
      autenticado: true,
    );
    return Map<String, dynamic>.from(res as Map);
  }

  /// Obtiene los mensajes ordenados de una conversación
  Future<List<Map<String, dynamic>>> obtenerMensajes(int conversacionId) async {
    final res = await ApiClient.instance.get('comunicacion/conversaciones/$conversacionId/mensajes/');
    if (res is List) {
      return res.map((e) => Map<String, dynamic>.from(e as Map)).toList();
    }
    return [];
  }

  /// Envía un mensaje a la conversación
  Future<Map<String, dynamic>> enviarMensaje(int conversacionId, String contenido) async {
    final res = await ApiClient.instance.post(
      'comunicacion/conversaciones/$conversacionId/mensajes/',
      {'contenido': contenido},
      autenticado: true,
    );
    return Map<String, dynamic>.from(res as Map);
  }

  /// Obtiene las preguntas frecuentes del chatbot configuradas para la empresa (CU15)
  Future<List<Map<String, dynamic>>> obtenerFaqsChatbot(int empresaId) async {
    try {
      final res = await ApiClient.instance.get(
        'comunicacion/empresas/$empresaId/faqs-chatbot/',
        autenticado: false,
      );
      if (res is List) {
        return res.map((e) => Map<String, dynamic>.from(e as Map)).toList();
      }
    } catch (_) {}
    return [];
  }

  /// Envía una pregunta al chatbot inteligente de la empresa
  Future<String> preguntarChatbot({
    required int empresaId,
    required String empresaNombre,
    required String pregunta,
    bool autenticado = true,
  }) async {
    if (autenticado) {
      try {
        final res = await ApiClient.instance.post(
          'comunicacion/preguntar-chatbot/',
          {'empresa': empresaId, 'pregunta': pregunta},
          autenticado: true,
        );
        if (res is Map && res['respuesta'] != null) {
          return res['respuesta'].toString();
        }
      } catch (_) {}
    }

    // Respuesta inteligente fallback contextualizada si no está logueado o falla la red
    final p = pregunta.toLowerCase();
    if (p.contains('horario') || p.contains('hora') || p.contains('atencion') || p.contains('atención')) {
      return 'Nuestro horario de atención en **$empresaNombre** es de lunes a sábado de 08:30 a 19:30. Domingos de 09:00 a 13:00.';
    }
    if (p.contains('pago') || p.contains('pagar') || p.contains('metodo') || p.contains('tarjeta') || p.contains('qr')) {
      return 'Aceptamos transferencias QR simples, tarjetas de débito/crédito mediante pasarela segura y pago contra entrega o en tienda.';
    }
    if (p.contains('envio') || p.contains('envío') || p.contains('demora') || p.contains('domicilio') || p.contains('entrega')) {
      return 'Realizamos envíos a domicilio en el área urbana en un plazo de 24 a 48 horas hábiles, o puedes retirar directamente en tienda sin costo adicional.';
    }
    if (p.contains('garantia') || p.contains('garantía') || p.contains('devolucion') || p.contains('devolución')) {
      return 'Todos nuestros productos cuentan con garantía respaldada por la compra protegida de VecinoMarket. Tienes 48 horas tras recibir tu pedido para cualquier observación.';
    }
    return '¡Gracias por comunicarte con **$empresaNombre**! Contamos con amplio surtido en nuestro catálogo. Para consultas personalizadas o cotizaciones mayores, utiliza el botón "Contactar vendedor".';
  }
}
