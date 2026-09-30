import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/api_client.dart';
import '../services/auth_service.dart';
import 'admin/admin_empresas_screen.dart';
import 'admin/admin_usuarios_screen.dart';
import 'admin/bitacora_screen.dart';
import 'mis_pedidos_screen.dart';

const _nombresRol = {
  'SUPERADMIN': 'Super administrador',
  'ADMIN': 'Administrador (soporte)',
  'EMPRESA': 'Empresa',
  'EMPLEADO': 'Empleado',
  'COMPRADOR': 'Comprador',
};

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  bool _editando = false;
  bool _guardando = false;
  String? _error;
  String? _mensaje;

  late final TextEditingController _nombreCtrl;
  late final TextEditingController _apellidoCtrl;
  late final TextEditingController _telefonoCtrl;

  bool _cambiandoPassword = false;
  final _actualCtrl = TextEditingController();
  final _nuevaCtrl = TextEditingController();
  final _confirmarCtrl = TextEditingController();

  @override
  void initState() {
    super.initState();
    final usuario = context.read<AuthService>().usuario ?? {};
    _nombreCtrl = TextEditingController(text: usuario['nombre'] ?? '');
    _apellidoCtrl = TextEditingController(text: usuario['apellido'] ?? '');
    _telefonoCtrl = TextEditingController(text: usuario['telefono'] ?? '');
  }

  Future<void> _guardarPerfil() async {
    setState(() {
      _guardando = true;
      _error = null;
    });
    try {
      await context.read<AuthService>().actualizarPerfil(
            nombre: _nombreCtrl.text.trim(),
            apellido: _apellidoCtrl.text.trim(),
            telefono: _telefonoCtrl.text.trim(),
          );
      setState(() => _editando = false);
    } on ApiException catch (e) {
      setState(() => _error = e.mensaje);
    } finally {
      if (mounted) setState(() => _guardando = false);
    }
  }

  Future<void> _guardarPassword() async {
    if (_nuevaCtrl.text != _confirmarCtrl.text) {
      setState(() => _error = 'Las contraseñas no coinciden.');
      return;
    }
    setState(() {
      _guardando = true;
      _error = null;
      _mensaje = null;
    });
    try {
      await context.read<AuthService>().cambiarPassword(_actualCtrl.text, _nuevaCtrl.text);
      _actualCtrl.clear();
      _nuevaCtrl.clear();
      _confirmarCtrl.clear();
      setState(() {
        _cambiandoPassword = false;
        _mensaje = 'Contraseña actualizada correctamente.';
      });
    } on ApiException catch (e) {
      setState(() => _error = e.mensaje);
    } finally {
      if (mounted) setState(() => _guardando = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final usuario = context.watch<AuthService>().usuario;
    if (usuario == null) {
      return const Scaffold(body: Center(child: Text('No hay sesión activa.')));
    }
    final rol = usuario['rol'] as String? ?? '';

    return Scaffold(
      appBar: AppBar(title: const Text('Mi perfil')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          '${usuario['nombre'] ?? ''} ${usuario['apellido'] ?? ''}'.trim(),
                          style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                        ),
                        if (!_editando)
                          TextButton.icon(
                            icon: const Icon(Icons.edit, size: 16),
                            label: const Text('Editar'),
                            onPressed: () => setState(() => _editando = true),
                          ),
                      ],
                    ),
                    Container(
                      margin: const EdgeInsets.only(top: 4),
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                      decoration: BoxDecoration(
                        color: Theme.of(context).colorScheme.primaryContainer,
                        borderRadius: BorderRadius.circular(999),
                      ),
                      child: Text(_nombresRol[rol] ?? rol, style: const TextStyle(fontSize: 11)),
                    ),
                    const SizedBox(height: 16),
                    Text(usuario['email'] ?? '', style: TextStyle(color: Colors.grey.shade600)),
                    const SizedBox(height: 16),
                    if (_editando) ...[
                      TextField(
                        controller: _nombreCtrl,
                        decoration: const InputDecoration(labelText: 'Nombre', border: OutlineInputBorder()),
                      ),
                      const SizedBox(height: 12),
                      TextField(
                        controller: _apellidoCtrl,
                        decoration: const InputDecoration(labelText: 'Apellido', border: OutlineInputBorder()),
                      ),
                      const SizedBox(height: 12),
                      TextField(
                        controller: _telefonoCtrl,
                        keyboardType: TextInputType.phone,
                        decoration: const InputDecoration(labelText: 'Teléfono', border: OutlineInputBorder()),
                      ),
                      const SizedBox(height: 12),
                      Row(
                        children: [
                          Expanded(
                            child: OutlinedButton(
                              onPressed: _guardando ? null : () => setState(() => _editando = false),
                              child: const Text('Cancelar'),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: FilledButton(
                              onPressed: _guardando ? null : _guardarPerfil,
                              child: _guardando
                                  ? const SizedBox(height: 16, width: 16, child: CircularProgressIndicator(strokeWidth: 2))
                                  : const Text('Guardar'),
                            ),
                          ),
                        ],
                      ),
                    ] else ...[
                      _filaDato('Teléfono', (usuario['telefono'] as String?)?.isNotEmpty == true ? usuario['telefono'] : 'No registrado'),
                    ],
                  ],
                ),
              ),
            ),
            if (rol == 'COMPRADOR') ...[
              const SizedBox(height: 16),
              Card(
                child: ListTile(
                  leading: const Icon(Icons.receipt_long_outlined),
                  title: const Text('Mis pedidos'),
                  subtitle: const Text('Historial de tus compras (CU26)'),
                  trailing: const Icon(Icons.chevron_right),
                  onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const MisPedidosScreen())),
                ),
              ),
            ],
            if (rol == 'ADMIN' || rol == 'SUPERADMIN') ...[
              const SizedBox(height: 16),
              Card(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Padding(
                      padding: EdgeInsets.fromLTRB(16, 12, 16, 4),
                      child: Text('Administración', style: TextStyle(fontWeight: FontWeight.bold)),
                    ),
                    if (rol == 'SUPERADMIN')
                      ListTile(
                        leading: const Icon(Icons.receipt_long_outlined),
                        title: const Text('Bitácora'),
                        subtitle: const Text('Accesos y acciones críticas (CU22)'),
                        trailing: const Icon(Icons.chevron_right),
                        onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const BitacoraScreen())),
                      ),
                    ListTile(
                      leading: const Icon(Icons.people_outline),
                      title: const Text('Usuarios'),
                      subtitle: const Text('Bloquear o desbloquear cuentas'),
                      trailing: const Icon(Icons.chevron_right),
                      onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const AdminUsuariosScreen())),
                    ),
                    ListTile(
                      leading: const Icon(Icons.store_outlined),
                      title: const Text('Empresas'),
                      subtitle: const Text('Suspender o reactivar empresas'),
                      trailing: const Icon(Icons.chevron_right),
                      onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const AdminEmpresasScreen())),
                    ),
                    const SizedBox(height: 8),
                  ],
                ),
              ),
            ],
            const SizedBox(height: 16),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Contraseña', style: TextStyle(fontWeight: FontWeight.bold)),
                        if (!_cambiandoPassword)
                          TextButton(
                            onPressed: () => setState(() => _cambiandoPassword = true),
                            child: const Text('Cambiar'),
                          ),
                      ],
                    ),
                    if (_cambiandoPassword) ...[
                      const SizedBox(height: 8),
                      TextField(
                        controller: _actualCtrl,
                        obscureText: true,
                        decoration: const InputDecoration(labelText: 'Contraseña actual', border: OutlineInputBorder()),
                      ),
                      const SizedBox(height: 12),
                      TextField(
                        controller: _nuevaCtrl,
                        obscureText: true,
                        decoration: const InputDecoration(labelText: 'Contraseña nueva', border: OutlineInputBorder()),
                      ),
                      const SizedBox(height: 12),
                      TextField(
                        controller: _confirmarCtrl,
                        obscureText: true,
                        decoration: const InputDecoration(labelText: 'Confirmar contraseña nueva', border: OutlineInputBorder()),
                      ),
                      const SizedBox(height: 12),
                      Row(
                        children: [
                          Expanded(
                            child: OutlinedButton(
                              onPressed: _guardando ? null : () => setState(() => _cambiandoPassword = false),
                              child: const Text('Cancelar'),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: FilledButton(
                              onPressed: _guardando ? null : _guardarPassword,
                              child: const Text('Guardar'),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ],
                ),
              ),
            ),
            if (_error != null) ...[
              const SizedBox(height: 12),
              Text(_error!, style: const TextStyle(color: Colors.red)),
            ],
            if (_mensaje != null) ...[
              const SizedBox(height: 12),
              Text(_mensaje!, style: const TextStyle(color: Colors.green)),
            ],
            const SizedBox(height: 24),
            OutlinedButton.icon(
              icon: const Icon(Icons.logout, color: Colors.red),
              label: const Text('Cerrar sesión', style: TextStyle(color: Colors.red)),
              onPressed: () {
                context.read<AuthService>().logout();
                Navigator.pop(context);
              },
            ),
          ],
        ),
      ),
    );
  }

  Widget _filaDato(String etiqueta, String? valor) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 4),
      child: Row(
        children: [
          SizedBox(width: 90, child: Text(etiqueta, style: TextStyle(color: Colors.grey.shade600, fontSize: 13))),
          Expanded(child: Text(valor ?? '—')),
        ],
      ),
    );
  }
}
