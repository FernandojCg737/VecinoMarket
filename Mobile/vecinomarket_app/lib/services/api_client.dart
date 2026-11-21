import 'dart:convert';
import 'dart:typed_data';
import 'package:http/http.dart' as http;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Cliente HTTP hacia el mismo backend Django que usa la web (Render en
/// producción). Agrega el JWT guardado en cada pedido, igual que el
/// interceptor de axios en el frontend web.
class ApiClient {
  ApiClient._();
  static final ApiClient instance = ApiClient._();

  // URL base configurable por --dart-define=API_URL=... (por defecto Render de producción conectado a Supabase)
  static const String baseUrl = String.fromEnvironment(
    'API_URL',
    defaultValue: 'https://vecinomarket.onrender.com/api/',
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

  Future<dynamic> put(String path, Map<String, dynamic> body, {bool autenticado = true}) async {
    var res = await http.put(
      _uri(path),
      headers: await _headers(autenticado: autenticado),
      body: jsonEncode(body),
    );
    if (res.statusCode == 401 && autenticado) {
      final refrescado = await _intentarRefrescarToken();
      if (refrescado) {
        res = await http.put(
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

  Future<dynamic> delete(String path, {Map<String, dynamic>? body, bool autenticado = true}) async {
    var res = await http.delete(
      _uri(path),
      headers: await _headers(autenticado: autenticado),
      body: body != null ? jsonEncode(body) : null,
    );
    if (res.statusCode == 401 && autenticado) {
      final refrescado = await _intentarRefrescarToken();
      if (refrescado) {
        res = await http.delete(
          _uri(path),
          headers: await _headers(autenticado: true),
          body: body != null ? jsonEncode(body) : null,
        );
      }
    }
    return _procesar(res);
  }

  Future<dynamic> postMultipart(
    String path, {
    Map<String, String>? fields,
    List<http.MultipartFile>? files,
    bool autenticado = true,
  }) async {
    final reconstruir = await Future.wait((files ?? []).map((file) async {
      final bytes = await file.finalize().toBytes();
      return () => http.MultipartFile.fromBytes(
        file.field, bytes, filename: file.filename, contentType: file.contentType,
      );
    }));
    Future<http.Response> enviar() async {
      final request = http.MultipartRequest('POST', _uri(path));
      if (autenticado) {
        final token = await accessToken;
        if (token != null) request.headers['Authorization'] = 'Bearer $token';
      }
      if (fields != null) request.fields.addAll(fields);
      request.files.addAll(reconstruir.map((crear) => crear()));
      final cliente = http.Client();
      try {
        return await http.Response.fromStream(await cliente.send(request));
      } finally {
        cliente.close();
      }
    }

    var res = await enviar();
    if (res.statusCode == 401 && autenticado) {
      final refrescado = await _intentarRefrescarToken();
      if (refrescado) {
        res = await enviar();
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

  Future<Uint8List> getBytes(String path) async {
    Future<http.Response> enviar() async => http.get(_uri(path), headers: await _headers());
    var respuesta = await enviar();
    if (respuesta.statusCode == 401 && await _intentarRefrescarToken()) {
      respuesta = await enviar();
    }
    if (respuesta.statusCode != 200) _procesar(respuesta);
    return respuesta.bodyBytes;
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
