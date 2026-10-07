import 'api_client.dart';

class NotificacionService {
  final ApiClient _api = ApiClient.instance;

  Future<List<Map<String, dynamic>>> obtenerMisNotificaciones({bool? soloNoLeidas}) async {
    String endpoint = 'notificaciones/mis-notificaciones/';
    if (soloNoLeidas != null) {
      endpoint += '?leido=${!soloNoLeidas}';
    }
    final res = await _api.get(endpoint, autenticado: true);
    if (res is List) {
      return res.map((item) => Map<String, dynamic>.from(item as Map)).toList();
    }
    return [];
  }

  Future<void> marcarLeida(int id) async {
    await _api.post('notificaciones/mis-notificaciones/$id/marcar-leida/', {}, autenticado: true);
  }

  Future<void> marcarTodasLeidas() async {
    await _api.post('notificaciones/mis-notificaciones/marcar-todas-leidas/', {}, autenticado: true);
  }

  Future<void> eliminarNotificacion(int id) async {
    await _api.delete('notificaciones/mis-notificaciones/$id/', autenticado: true);
  }
}
