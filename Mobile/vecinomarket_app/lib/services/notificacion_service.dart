import 'package:flutter/foundation.dart';
import 'api_client.dart';

class NotificacionService extends ChangeNotifier {
  final ApiClient _api = ApiClient.instance;

  int _unreadCount = 0;
  int get unreadCount => _unreadCount;

  Future<void> fetchUnreadCount() async {
    try {
      final res = await _api.get('notificaciones/mis-notificaciones/?leido=false', autenticado: true);
      if (res is List) {
        _unreadCount = res.length;
        notifyListeners();
      }
    } catch (_) {}
  }

  Future<List<Map<String, dynamic>>> obtenerMisNotificaciones({bool? soloNoLeidas}) async {
    String endpoint = 'notificaciones/mis-notificaciones/';
    if (soloNoLeidas != null) {
      endpoint += '?leido=${!soloNoLeidas}';
    }
    final res = await _api.get(endpoint, autenticado: true);
    if (res is List) {
      final lista = res.map((item) => Map<String, dynamic>.from(item as Map)).toList();
      _unreadCount = lista.where((n) => n['leido'] == false).length;
      notifyListeners();
      return lista;
    }
    return [];
  }

  Future<void> marcarLeida(int id) async {
    await _api.post('notificaciones/mis-notificaciones/$id/marcar-leida/', {}, autenticado: true);
    fetchUnreadCount();
  }

  Future<void> marcarTodasLeidas() async {
    await _api.post('notificaciones/mis-notificaciones/marcar-todas-leidas/', {}, autenticado: true);
    _unreadCount = 0;
    notifyListeners();
  }

  Future<void> eliminarNotificacion(int id) async {
    await _api.delete('notificaciones/mis-notificaciones/$id/', autenticado: true);
    fetchUnreadCount();
  }
}
