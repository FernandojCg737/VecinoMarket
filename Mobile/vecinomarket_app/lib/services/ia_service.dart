import '../models/recomendacion_ia.dart';
import 'api_client.dart';

/// Endpoints de IA (/api/ia/) — mismo rol que src/api/ia.js en la web.
class IaService {
  final _api = ApiClient.instance;

  /// RF44–RF46: historial de navegación (VISTA / BUSQUEDA / CARRITO).
  /// Silencioso a propósito: si falla, la app sigue igual y no se muestra
  /// nada. COMPRA no se registra acá: el backend la deriva de los pedidos.
  /// Va con el token si hay sesión (para asociar al comprador); sin sesión
  /// queda como visitante.
  static void registrarEvento(String tipo, {int? productoId, String? termino}) {
    final body = <String, dynamic>{'tipo': tipo};
    if (productoId != null) body['producto'] = productoId;
    if (termino != null && termino.trim().length >= 2) body['termino_busqueda'] = termino.trim();
    if (tipo == 'BUSQUEDA' && body['termino_busqueda'] == null) return;
    ApiClient.instance.post('ia/eventos/', body, autenticado: true).catchError((_) => null);
  }

  /// CU1: "Para ti" (personalizada o, sin historial, los más vendidos de 30 días).
  Future<ListaRecomendada> recomendaciones({int limite = 10}) async {
    final data = await _api.get('ia/recomendaciones/', params: {'limite': limite});
    return ListaRecomendada.fromJson(data as Map<String, dynamic>);
  }

  /// CU1: "Productos similares".
  Future<ListaRecomendada> similares(int productoId, {int limite = 8}) async {
    final data = await _api.get('ia/productos/$productoId/similares/', params: {'limite': limite});
    return ListaRecomendada.fromJson(data as Map<String, dynamic>);
  }

  /// Recalcula en línea "Para ti" con la historia más reciente (endpoint CU21).
  Future<void> regenerar() => _api.post('reportes/mis-recomendaciones/generar/', {}, autenticado: true);

  /// CU2: "Cerca de ti". Sin lat/lng el backend usa la ubicación guardada del
  /// comprador; si no hay ninguna lanza [SinUbicacionException].
  Future<ResultadoCercanos> cercanos({double? lat, double? lng, double radioKm = 5, int limite = 20}) async {
    final params = <String, dynamic>{'radio_km': radioKm, 'limite': limite};
    if (lat != null && lng != null) {
      params['lat'] = lat;
      params['lng'] = lng;
    }
    try {
      final data = await _api.get('ia/recomendaciones/cercanas/', params: params);
      return ResultadoCercanos.fromJson(data as Map<String, dynamic>);
    } on ApiException catch (e) {
      if (e.statusCode == 400 && e.data['codigo'] == 'SIN_UBICACION') {
        throw SinUbicacionException(e.data['detail']?.toString() ?? 'No tenemos tu ubicación.');
      }
      rethrow;
    }
  }
}

class SinUbicacionException implements Exception {
  SinUbicacionException(this.mensaje);
  final String mensaje;
}
