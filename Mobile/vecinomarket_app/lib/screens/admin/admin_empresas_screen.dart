import 'package:flutter/material.dart';
import '../../services/admin_service.dart';
import '../../services/api_client.dart';

class AdminEmpresasScreen extends StatefulWidget {
  const AdminEmpresasScreen({super.key});

  @override
  State<AdminEmpresasScreen> createState() => _AdminEmpresasScreenState();
}

class _AdminEmpresasScreenState extends State<AdminEmpresasScreen> {
  final _admin = AdminService();
  late Future<List<Map<String, dynamic>>> _future;
  final Set<int> _procesando = {};

  @override
  void initState() {
    super.initState();
    _future = _admin.obtenerEmpresas();
  }

  void _recargar() => setState(() => _future = _admin.obtenerEmpresas());

  Future<void> _alternarEstado(Map<String, dynamic> empresa) async {
    final id = empresa['id'] as int;
    final suspendida = empresa['estado'] == 'SUSPENDIDA';
    setState(() => _procesando.add(id));
    try {
      if (suspendida) {
        await _admin.reactivarEmpresa(id);
      } else {
        await _admin.suspenderEmpresa(id);
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
      appBar: AppBar(title: const Text('Empresas')),
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
            final empresas = snapshot.data ?? [];
            if (empresas.isEmpty) {
              return ListView(children: const [SizedBox(height: 80), Center(child: Text('Sin empresas.'))]);
            }
            return ListView.separated(
              itemCount: empresas.length,
              separatorBuilder: (_, _) => const Divider(height: 1),
              itemBuilder: (context, i) {
                final e = empresas[i];
                final suspendida = e['estado'] == 'SUSPENDIDA';
                final procesando = _procesando.contains(e['id']);
                return ListTile(
                  title: Text(e['razon_social'] ?? ''),
                  subtitle: Text('${e['dueno_email'] ?? ''} · ${e['ciudad'] ?? ''}, ${e['departamento'] ?? ''}'),
                  trailing: procesando
                      ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2))
                      : TextButton(
                          onPressed: () => _alternarEstado(e),
                          child: Text(
                            suspendida ? 'Reactivar' : 'Suspender',
                            style: TextStyle(color: suspendida ? Colors.green : Colors.red),
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
