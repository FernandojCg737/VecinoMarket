import 'package:flutter/material.dart';
import '../../services/admin_service.dart';
import '../../services/api_client.dart';

const _nombresRol = {
  'SUPERADMIN': 'Super administrador',
  'ADMIN': 'Administrador (soporte)',
  'EMPRESA': 'Empresa',
  'EMPLEADO': 'Empleado',
  'COMPRADOR': 'Comprador',
};

class AdminUsuariosScreen extends StatefulWidget {
  const AdminUsuariosScreen({super.key});

  @override
  State<AdminUsuariosScreen> createState() => _AdminUsuariosScreenState();
}

class _AdminUsuariosScreenState extends State<AdminUsuariosScreen> {
  final _admin = AdminService();
  late Future<List<Map<String, dynamic>>> _future;
  final Set<int> _procesando = {};

  @override
  void initState() {
    super.initState();
    _future = _admin.obtenerUsuarios();
  }

  void _recargar() => setState(() => _future = _admin.obtenerUsuarios());

  Future<void> _alternarBloqueo(Map<String, dynamic> usuario) async {
    final id = usuario['id'] as int;
    final bloqueado = usuario['estado'] == 'BLOQUEADO';
    setState(() => _procesando.add(id));
    try {
      if (bloqueado) {
        await _admin.desbloquearUsuario(id);
      } else {
        await _admin.bloquearUsuario(id);
      }
      _recargar();
    } catch (e) {
      final mensaje = e is ApiException ? e.mensaje : 'No se pudo conectar con el servidor.';
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('No se pudo actualizar: $mensaje')));
      }
    } finally {
      if (mounted) setState(() => _procesando.remove(id));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Usuarios')),
      body: RefreshIndicator(
        onRefresh: () async {
          _recargar();
          await _future;
        },
        child: FutureBuilder<List<Map<String, dynamic>>>(
          future: _future,
          builder: (context, snapshot) {
            if (snapshot.connectionState == ConnectionState.waiting) {
              return const Center(child: CircularProgressIndicator());
            }
            final usuarios = snapshot.data ?? [];
            if (usuarios.isEmpty) {
              return ListView(children: const [SizedBox(height: 80), Center(child: Text('Sin usuarios.'))]);
            }
            return ListView.separated(
              itemCount: usuarios.length,
              separatorBuilder: (_, _) => const Divider(height: 1),
              itemBuilder: (context, i) {
                final u = usuarios[i];
                final bloqueado = u['estado'] == 'BLOQUEADO';
                final procesando = _procesando.contains(u['id']);
                return ListTile(
                  title: Text('${u['nombre'] ?? ''} ${u['apellido'] ?? ''}'.trim()),
                  subtitle: Text('${u['email']} · ${_nombresRol[u['rol']] ?? u['rol']}'),
                  trailing: procesando
                      ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2))
                      : TextButton(
                          onPressed: () => _alternarBloqueo(u),
                          child: Text(
                            bloqueado ? 'Desbloquear' : 'Bloquear',
                            style: TextStyle(color: bloqueado ? Colors.green : Colors.red),
                          ),
                        ),
                );
              },
            );
          },
        ),
      ),
    );
  }
}
