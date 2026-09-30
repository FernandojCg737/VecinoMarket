import 'package:flutter/material.dart';
import '../../services/admin_service.dart';

const _coloresAccion = {
  'LOGIN': Colors.green,
  'LOGIN_GOOGLE': Colors.green,
  'REGISTRO': Colors.blue,
  'REGISTRO_GOOGLE': Colors.blue,
  'LOGOUT': Colors.grey,
  'BLOQUEAR_USUARIO': Colors.red,
  'DESBLOQUEAR_USUARIO': Colors.green,
  'SUSPENDER_EMPRESA': Colors.red,
  'REACTIVAR_EMPRESA': Colors.green,
};

class BitacoraScreen extends StatefulWidget {
  const BitacoraScreen({super.key});

  @override
  State<BitacoraScreen> createState() => _BitacoraScreenState();
}

class _BitacoraScreenState extends State<BitacoraScreen> {
  final _admin = AdminService();
  late Future<List<Map<String, dynamic>>> _future;

  @override
  void initState() {
    super.initState();
    _future = _admin.obtenerBitacora();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Bitácora (CU22)')),
      body: RefreshIndicator(
        onRefresh: () async {
          setState(() => _future = _admin.obtenerBitacora());
          await _future;
        },
        child: FutureBuilder<List<Map<String, dynamic>>>(
          future: _future,
          builder: (context, snapshot) {
            if (snapshot.connectionState == ConnectionState.waiting) {
              return const Center(child: CircularProgressIndicator());
            }
            if (snapshot.hasError) {
              return ListView(children: const [SizedBox(height: 80), Center(child: Text('No se pudo cargar la bitácora.'))]);
            }
            final logs = snapshot.data ?? [];
            if (logs.isEmpty) {
              return ListView(children: const [SizedBox(height: 80), Center(child: Text('Sin registros.'))]);
            }
            return ListView.separated(
              itemCount: logs.length,
              separatorBuilder: (_, _) => const Divider(height: 1),
              itemBuilder: (context, i) {
                final log = logs[i];
                final color = _coloresAccion[log['accion']] ?? Colors.grey;
                return ListTile(
                  leading: CircleAvatar(
                    radius: 6,
                    backgroundColor: color,
                  ),
                  title: Text(log['accion'] ?? '', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                  subtitle: Text(
                    '${log['usuario_nombre'] ?? 'Sistema'} (${log['usuario_email'] ?? '—'})\n'
                    '${log['creado_en'] ?? ''} · IP ${log['ip_origen'] ?? '—'}',
                    style: const TextStyle(fontSize: 12),
                  ),
                  isThreeLine: true,
                );
              },
            );
          },
        ),
      ),
    );
  }
}
