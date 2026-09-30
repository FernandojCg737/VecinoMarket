import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Cliente HTTP hacia el mismo backend Django que usa la web (Render en
/// producción). Agrega el JWT guardado en cada pedido, igual que el
/// interceptor de axios en el frontend web.
class ApiClient {
  ApiClient._();
  static final ApiClient instance = ApiClient._();

  // URL base configurable por --dart-define=API_URL=... (por defecto Render)
  static const String baseUrl = String.fromEnvironment(
    'API_URL',
    defaultValue: 'https://vecinomarket-backend.onrender.com/api/',
  );

  final _storage = const FlutterSecureStorage();

  Future<String?> get accessToken => _storage.read(key: 'access');
  Future<String?> get refreshToken => _storage.read(key: 'refresh');

  Future<void> guardarTokens({required String access, required String refresh}) async {
    await _storage.write(key: 'access', value: access);
    await _storage.write(key: 'refresh', value: refresh);
  }

  Future<void> borrarTokens() async {
    await _storage.delete(key: 'access');
    await _storage.delete(key: 'refresh');
  }

  Future<Map<String, String>> _headers({bool autenticado = true}) async {
    final headers = {'Content-Type': 'application/json'};
    if (autenticado) {
      final token = await accessToken;
      if (token != null) headers['Authorization'] = 'Bearer $token';
    }
    return headers;
  }

  Uri _uri(String path, [Map<String, dynamic>? params]) {
    final query = params?.map((k, v) => MapEntry(k, '$v'));
    return Uri.parse('$baseUrl$path').replace(queryParameters: query);
  }

  Future<bool> _intentarRefrescarToken() async {
    final refresh = await refreshToken;
    if (refresh == null) return false;
    try {
      final res = await http.post(
        _uri('usuarios/auth/refresh/'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'refresh': refresh}),
      );
      if (res.statusCode >= 200 && res.statusCode < 300) {
        final data = jsonDecode(utf8.decode(res.bodyBytes));
        final nuevoAccess = data['access'] as String;
        final nuevoRefresh = (data['refresh'] as String?) ?? refresh;
        await guardarTokens(access: nuevoAccess, refresh: nuevoRefresh);
        return true;
      }
    } catch (_) {}
    await borrarTokens();
    return false;
  }

  Future<dynamic> get(String path, {Map<String, dynamic>? params, bool autenticado = true}) async {
    var res = await http.get(_uri(path, params), headers: await _headers(autenticado: autenticado));
    if (res.statusCode == 401 && autenticado) {
      final refrescado = await _intentarRefrescarToken();
      if (refrescado) {
        res = await http.get(_uri(path, params), headers: await _headers(autenticado: true));
      }
    }
    return _procesar(res);
  }

  Future<dynamic> post(String path, Map<String, dynamic> body, {bool autenticado = false}) async {
    var res = await http.post(
      _uri(path),
      headers: await _headers(autenticado: autenticado),
      body: jsonEncode(body),
    );
    if (res.statusCode == 401 && autenticado) {
      final refrescado = await _intentarRefrescarToken();
      if (refrescado) {
        res = await http.post(
          _uri(path),
          headers: await _headers(autenticado: true),
          body: jsonEncode(body),
        );
      }
    }
    return _procesar(res);
  }

  Future<dynamic> patch(String path, Map<String, dynamic> body, {bool autenticado = true}) async {
    var res = await http.patch(
      _uri(path),
      headers: await _headers(autenticado: autenticado),
      body: jsonEncode(body),
    );
    if (res.statusCode == 401 && autenticado) {
      final refrescado = await _intentarRefrescarToken();
      if (refrescado) {
        res = await http.patch(
          _uri(path),
          headers: await _headers(autenticado: true),
          body: jsonEncode(body),
        );
      }
    }
    return _procesar(res);
  }

  dynamic _procesar(http.Response res) {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      if (res.body.isEmpty) return null;
      return jsonDecode(utf8.decode(res.bodyBytes));
    }
    Map<String, dynamic> data = {};
    try {
      data = jsonDecode(utf8.decode(res.bodyBytes));
    } catch (_) {
      // el backend no siempre devuelve JSON en errores 5xx
    }
    throw ApiException(res.statusCode, data);
  }
}

class ApiException implements Exception {
  ApiException(this.statusCode, this.data);
  final int statusCode;
  final Map<String, dynamic> data;

  /// Junta el primer mensaje de error que encuentre, sea cual sea el campo
  /// (igual que Object.values(data)[0] en el frontend web).
  String get mensaje {
    if (data.isEmpty) return 'Ocurrió un error ($statusCode).';
    final primero = data.values.first;
    if (primero is List && primero.isNotEmpty) return primero.first.toString();
    return primero.toString();
  }
}
