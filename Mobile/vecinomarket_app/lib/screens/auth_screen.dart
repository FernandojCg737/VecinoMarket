import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/api_client.dart';
import '../services/auth_service.dart';

/// Login + registro en una sola pantalla con pestañas, igual que Auth.jsx en
/// la web (el botón "Únete" reutiliza la misma llamada de registro).
class AuthScreen extends StatefulWidget {
  const AuthScreen({super.key});

  @override
  State<AuthScreen> createState() => _AuthScreenState();
}

enum _Tab { login, registro }

class _AuthScreenState extends State<AuthScreen> {
  _Tab _tab = _Tab.login;
  bool _cargando = false;
  bool _verPassword = false;
  String? _error;

  final _emailCtrl = TextEditingController();
  final _passwordCtrl = TextEditingController();
  final _nombreCtrl = TextEditingController();
  final _apellidoCtrl = TextEditingController();
  final _telefonoCtrl = TextEditingController();

  void _cambiarTab(_Tab nuevo) {
    setState(() {
      _tab = nuevo;
      _error = null;
    });
  }

  Future<void> _enviar() async {
    setState(() {
      _cargando = true;
      _error = null;
    });
    try {
      final auth = context.read<AuthService>();
      if (_tab == _Tab.login) {
        await auth.login(_emailCtrl.text.trim(), _passwordCtrl.text);
      } else {
        await auth.registrarComprador(
          email: _emailCtrl.text.trim(),
          nombre: _nombreCtrl.text.trim(),
          apellido: _apellidoCtrl.text.trim(),
          telefono: _telefonoCtrl.text.trim(),
          password: _passwordCtrl.text,
        );
      }
      if (mounted) Navigator.pop(context);
    } on ApiException catch (e) {
      setState(() => _error = e.mensaje);
    } catch (_) {
      setState(() => _error = 'No se pudo conectar con el servidor.');
    } finally {
      if (mounted) setState(() => _cargando = false);
    }
  }

  Future<void> _conGoogle() async {
    setState(() {
      _cargando = true;
      _error = null;
    });
    try {
      await context.read<AuthService>().loginConGoogle();
      if (mounted) Navigator.pop(context);
    } on ApiException catch (e) {
      setState(() => _error = e.mensaje);
    } catch (_) {
      setState(() => _error = 'No se pudo continuar con Google. Intenta de nuevo.');
    } finally {
      if (mounted) setState(() => _cargando = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final esLogin = _tab == _Tab.login;
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Image.asset(
                  Theme.of(context).brightness == Brightness.dark
                      ? 'assets/images/logo-dark.png'
                      : 'assets/images/logo.png',
                  height: 40,
                  fit: BoxFit.contain,
                ),
                const SizedBox(height: 24),
                const Text(
                  'Bienvenido a VecinoMarket',
                  textAlign: TextAlign.center,
                  style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 24),
                _SelectorTabs(esLogin: esLogin, onCambiar: _cambiarTab),
                const SizedBox(height: 24),
                if (!esLogin) ...[
                  Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: _nombreCtrl,
                          decoration: const InputDecoration(labelText: 'Nombre', border: OutlineInputBorder()),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: TextField(
                          controller: _apellidoCtrl,
                          decoration: const InputDecoration(labelText: 'Apellido', border: OutlineInputBorder()),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                ],
                TextField(
                  controller: _emailCtrl,
                  keyboardType: TextInputType.emailAddress,
                  decoration: const InputDecoration(labelText: 'Email', border: OutlineInputBorder()),
                ),
                if (!esLogin) ...[
                  const SizedBox(height: 16),
                  TextField(
                    controller: _telefonoCtrl,
                    keyboardType: TextInputType.phone,
                    decoration: const InputDecoration(labelText: 'Teléfono', border: OutlineInputBorder()),
                  ),
                ],
                const SizedBox(height: 16),
                TextField(
                  controller: _passwordCtrl,
                  obscureText: !_verPassword,
                  decoration: InputDecoration(
                    labelText: 'Contraseña',
                    helperText: !esLogin ? 'Mínimo 8 caracteres' : null,
                    border: const OutlineInputBorder(),
                    suffixIcon: IconButton(
                      icon: Icon(_verPassword ? Icons.visibility_off : Icons.visibility),
                      onPressed: () => setState(() => _verPassword = !_verPassword),
                    ),
                  ),
                ),
                if (_error != null) ...[
                  const SizedBox(height: 12),
                  Text(_error!, style: const TextStyle(color: Colors.red)),
                ],
                const SizedBox(height: 24),
                FilledButton(
                  onPressed: _cargando ? null : _enviar,
                  style: FilledButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 16)),
                  child: _cargando
                      ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2))
                      : Text(esLogin ? 'Ingresar' : 'Crear cuenta'),
                ),
                const SizedBox(height: 24),
                Row(
                  children: [
                    const Expanded(child: Divider()),
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 8),
                      child: Text(
                        esLogin ? 'o inicia sesión con' : 'o únete con',
                        style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
                      ),
                    ),
                    const Expanded(child: Divider()),
                  ],
                ),
                const SizedBox(height: 16),
                OutlinedButton.icon(
                  onPressed: _cargando ? null : _conGoogle,
                  icon: const Icon(Icons.g_mobiledata, size: 28),
                  label: const Text('Continuar con Google'),
                  style: OutlinedButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 14)),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _SelectorTabs extends StatelessWidget {
  const _SelectorTabs({required this.esLogin, required this.onCambiar});
  final bool esLogin;
  final void Function(_Tab) onCambiar;

  @override
  Widget build(BuildContext context) {
    final color = Theme.of(context).colorScheme;
    return Container(
      decoration: BoxDecoration(color: Colors.grey.shade200, borderRadius: BorderRadius.circular(999)),
      padding: const EdgeInsets.all(4),
      child: Row(
        children: [
          Expanded(child: _boton(context, 'Inicia sesión', esLogin, () => onCambiar(_Tab.login), color)),
          Expanded(child: _boton(context, 'Únete', !esLogin, () => onCambiar(_Tab.registro), color)),
        ],
      ),
    );
  }

  Widget _boton(BuildContext context, String texto, bool activo, VoidCallback onTap, ColorScheme color) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        padding: const EdgeInsets.symmetric(vertical: 10),
        decoration: BoxDecoration(
          color: activo ? color.primary : Colors.transparent,
          borderRadius: BorderRadius.circular(999),
        ),
        child: Text(
          texto,
          textAlign: TextAlign.center,
          style: TextStyle(
            color: activo ? Colors.white : Colors.grey.shade700,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
    );
  }
}
