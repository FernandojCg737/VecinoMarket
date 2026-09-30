import 'package:flutter/foundation.dart';
import 'package:google_sign_in/google_sign_in.dart';
import 'api_client.dart';

// Mismo Client ID *web* que ya usa el backend/frontend para verificar el ID
// token (GOOGLE_CLIENT_ID en el backend). En Android no hace falta un client
// ID propio en el código: Google lo resuelve solo a partir del paquete +
// huella SHA-1 registrados en la consola, pero hay que pasar este como
// serverClientId para que el ID token resultante tenga la audiencia que el
// backend espera.
const _googleWebClientId = '482755584473-kn2f6g323ciu2pgb1ci50mv8uarura20.apps.googleusercontent.com';

/// Espejo de AuthContext.jsx del frontend web: mismo login, mismos tokens,
/// mismo backend. Notifica a la UI cuando cambia el usuario logueado.
class AuthService extends ChangeNotifier {
  Map<String, dynamic>? usuario;
  bool cargando = true;

  AuthService() {
    _cargarSesion();
  }

  Future<void> _cargarSesion() async {
    final token = await ApiClient.instance.accessToken;
    if (token == null) {
      cargando = false;
      notifyListeners();
      return;
    }
    try {
      usuario = await ApiClient.instance.get('usuarios/auth/perfil/');
    } catch (_) {
      await ApiClient.instance.borrarTokens();
    }
    cargando = false;
    notifyListeners();
  }

  Future<void> login(String email, String password) async {
    final data = await ApiClient.instance.post('usuarios/auth/login/', {
      'email': email,
      'password': password,
    });
    await ApiClient.instance.guardarTokens(access: data['access'], refresh: data['refresh']);
    usuario = await ApiClient.instance.get('usuarios/auth/perfil/');
    notifyListeners();
  }

  Future<void> registrarComprador({
    required String email,
    required String nombre,
    String apellido = '',
    String telefono = '',
    required String password,
  }) async {
    final data = await ApiClient.instance.post('usuarios/compradores/registro/', {
      'email': email,
      'nombre': nombre,
      'apellido': apellido,
      'telefono': telefono,
      'password': password,
    });
    await ApiClient.instance.guardarTokens(access: data['access'], refresh: data['refresh']);
    usuario = data['usuario'] as Map<String, dynamic>;
    notifyListeners();
  }

  /// Lanza el selector de cuenta de Google nativo y loguea/registra con el
  /// mismo endpoint que ya usa la web (usuarios/auth/google/).
  Future<void> loginConGoogle() async {
    final googleSignIn = GoogleSignIn(serverClientId: _googleWebClientId);
    final cuenta = await googleSignIn.signIn();
    if (cuenta == null) return; // el usuario canceló el selector

    final auth = await cuenta.authentication;
    final idToken = auth.idToken;
    if (idToken == null) {
      throw Exception('Google no devolvió un token válido.');
    }

    final data = await ApiClient.instance.post('usuarios/auth/google/', {'credential': idToken});
    await ApiClient.instance.guardarTokens(access: data['access'], refresh: data['refresh']);
    usuario = await ApiClient.instance.get('usuarios/auth/perfil/');
    notifyListeners();
  }

  Future<void> actualizarPerfil({String? nombre, String? apellido, String? telefono}) async {
    final body = <String, dynamic>{};
    if (nombre != null) body['nombre'] = nombre;
    if (apellido != null) body['apellido'] = apellido;
    if (telefono != null) body['telefono'] = telefono;
    usuario = await ApiClient.instance.patch('usuarios/auth/perfil/', body);
    notifyListeners();
  }

  Future<void> cambiarPassword(String actual, String nueva) async {
    await ApiClient.instance.post('usuarios/auth/cambiar-password/', {
      'password_actual': actual,
      'password_nueva': nueva,
    }, autenticado: true);
  }

  Future<void> logout() async {
    await ApiClient.instance.borrarTokens();
    usuario = null;
    notifyListeners();
  }
}
