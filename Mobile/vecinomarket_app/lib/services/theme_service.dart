import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Modo noche, mismo rol que ThemeContext.jsx en la web: persiste la
/// elección del usuario entre sesiones, arrancando en modo claro si nunca
/// la tocó (Flutter ya sigue el tema del sistema por defecto vía
/// ThemeMode.system hasta que el usuario elige algo explícito).
class ThemeService extends ChangeNotifier {
  static const _clave = 'vecinomarket_tema';

  ThemeMode modo = ThemeMode.system;

  ThemeService() {
    _cargar();
  }

  Future<void> _cargar() async {
    final prefs = await SharedPreferences.getInstance();
    final guardado = prefs.getString(_clave);
    if (guardado == 'dark') {
      modo = ThemeMode.dark;
      notifyListeners();
    } else if (guardado == 'light') {
      modo = ThemeMode.light;
      notifyListeners();
    }
  }

  Future<void> alternar() async {
    modo = modo == ThemeMode.dark ? ThemeMode.light : ThemeMode.dark;
    notifyListeners();
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_clave, modo == ThemeMode.dark ? 'dark' : 'light');
  }

  bool get esOscuro => modo == ThemeMode.dark;
}
