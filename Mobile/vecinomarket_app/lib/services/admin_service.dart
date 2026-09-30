import 'api_client.dart';

/// Llamadas administrativas (CU22 bitácora, T009 usuarios/empresas), todas
/// protegidas por EsAdmin del lado del backend.
class AdminService {
  Future<List<Map<String, dynamic>>> obtenerBitacora({String? accion}) async {
    final params = <String, dynamic>{'page_size': 50};
    if (accion != null && accion.isNotEmpty) params['accion'] = accion;
    final data = await ApiClient.instance.get('auditoria/bitacora/', params: params);
    return List<Map<String, dynamic>>.from(data['results'] as List);
  }

  Future<List<Map<String, dynamic>>> obtenerUsuarios({String? rol}) async {
    final params = <String, dynamic>{'page_size': 100};
    if (rol != null && rol.isNotEmpty) params['rol'] = rol;
    final data = await ApiClient.instance.get('usuarios/lista/', params: params);
    return List<Map<String, dynamic>>.from(data['results'] as List);
  }

  Future<void> bloquearUsuario(int id) =>
      ApiClient.instance.post('usuarios/$id/bloquear/', {}, autenticado: true);
  Future<void> desbloquearUsuario(int id) =>
      ApiClient.instance.post('usuarios/$id/desbloquear/', {}, autenticado: true);

  Future<List<Map<String, dynamic>>> obtenerEmpresas() async {
    final data = await ApiClient.instance.get('usuarios/empresas/lista/', params: {'page_size': 100});
    return List<Map<String, dynamic>>.from(data['results'] as List);
  }

  Future<void> suspenderEmpresa(int id) =>
      ApiClient.instance.post('usuarios/empresas/$id/suspender/', {}, autenticado: true);
  Future<void> reactivarEmpresa(int id) =>
      ApiClient.instance.post('usuarios/empresas/$id/reactivar/', {}, autenticado: true);
}
