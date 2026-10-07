import 'package:flutter/material.dart';
import '../services/notificacion_service.dart';

class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  final _notifService = NotificacionService();
  late Future<List<Map<String, dynamic>>> _notificacionesFuture;

  @override
  void initState() {
    super.initState();
    _cargarNotificaciones();
  }

  void _cargarNotificaciones() {
    setState(() {
      _notificacionesFuture = _notifService.obtenerMisNotificaciones();
    });
  }

  IconData _iconoTipo(String tipo) {
    switch (tipo) {
      case 'PAGO_CONFIRMADO':
        return Icons.check_circle_outline;
      case 'PEDIDO_EN_PREPARACION':
        return Icons.inventory_2_outlined;
      case 'PEDIDO_ENVIADO':
        return Icons.local_shipping_outlined;
      case 'PEDIDO_ENTREGADO':
        return Icons.task_alt;
      case 'PAGO_QR_PENDIENTE':
      case 'NUEVO_PEDIDO_QR':
        return Icons.qr_code_2;
      case 'PAGO_RECHAZADO':
      case 'PEDIDO_CANCELADO':
        return Icons.cancel_outlined;
      default:
        return Icons.notifications_outlined;
    }
  }

  Color _colorTipo(String tipo) {
    switch (tipo) {
      case 'PAGO_CONFIRMADO':
      case 'PEDIDO_ENTREGADO':
        return const Color(0xFF10B981);
      case 'PEDIDO_EN_PREPARACION':
        return const Color(0xFF3B82F6);
      case 'PEDIDO_ENVIADO':
        return const Color(0xFF8B5CF6);
      case 'PAGO_QR_PENDIENTE':
      case 'NUEVO_PEDIDO_QR':
        return const Color(0xFFD97706);
      case 'PAGO_RECHAZADO':
      case 'PEDIDO_CANCELADO':
        return const Color(0xFFEF4444);
      default:
        return const Color(0xFFD97706);
    }
  }

  void _mostrarDetalle(Map<String, dynamic> notif) async {
    final id = notif['id'];
    final leido = notif['leido'] == true;
    if (!leido && id != null) {
      _notifService.marcarLeida(id).then((_) {
        _cargarNotificaciones();
      });
    }

    final isDark = Theme.of(context).brightness == Brightness.dark;
    final tipo = notif['tipo']?.toString() ?? '';
    final color = _colorTipo(tipo);
    final icono = _iconoTipo(tipo);

    await showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) {
        return Padding(
          padding: const EdgeInsets.fromLTRB(20, 24, 20, 32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: color.withValues(alpha: 0.15),
                      shape: BoxShape.circle,
                    ),
                    child: Icon(icono, color: color, size: 28),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          notif['titulo'] ?? 'Notificación',
                          style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                        ),
                        if (notif['creado_en'] != null)
                          Text(
                            notif['creado_en'].toString().split('.').first.replaceFirst('T', ' '),
                            style: TextStyle(fontSize: 12, color: isDark ? Colors.white54 : Colors.black54),
                          ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 18),
              const Divider(height: 1),
              const SizedBox(height: 18),
              Text(
                'Detalle:',
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                  color: isDark ? Colors.white60 : Colors.black54,
                ),
              ),
              const SizedBox(height: 6),
              Text(
                notif['mensaje'] ?? 'Sin mensaje.',
                style: const TextStyle(fontSize: 15, height: 1.4),
              ),
              const SizedBox(height: 24),
              SizedBox(
                width: double.infinity,
                child: FilledButton(
                  style: FilledButton.styleFrom(
                    backgroundColor: const Color(0xFFD97706),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                  onPressed: () => Navigator.pop(ctx),
                  child: const Text('Entendido'),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Notificaciones'),
        actions: [
          IconButton(
            tooltip: 'Marcar todas como leídas',
            icon: const Icon(Icons.done_all),
            onPressed: () async {
              await _notifService.marcarTodasLeidas();
              _cargarNotificaciones();
              if (mounted) {
                ScaffoldMessenger.of(this.context).showSnackBar(
                  const SnackBar(content: Text('Notificaciones marcadas como leídas')),
                );
              }
            },
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () async => _cargarNotificaciones(),
        child: FutureBuilder<List<Map<String, dynamic>>>(
          future: _notificacionesFuture,
          builder: (context, snapshot) {
            if (snapshot.connectionState == ConnectionState.waiting) {
              return const Center(child: CircularProgressIndicator());
            }
            if (snapshot.hasError) {
              return ListView(
                children: const [
                  SizedBox(height: 80),
                  Center(child: Text('No se pudieron cargar tus notificaciones.')),
                ],
              );
            }
            final lista = snapshot.data ?? [];
            if (lista.isEmpty) {
              return ListView(
                children: [
                  const SizedBox(height: 100),
                  Icon(Icons.notifications_none, size: 64, color: isDark ? Colors.white24 : Colors.black26),
                  const SizedBox(height: 16),
                  Center(
                    child: Text(
                      'No tienes notificaciones pendientes',
                      style: TextStyle(color: isDark ? Colors.white60 : Colors.black54),
                    ),
                  ),
                ],
              );
            }

            return ListView.separated(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
              itemCount: lista.length,
              separatorBuilder: (_, _) => const SizedBox(height: 8),
              itemBuilder: (context, index) {
                final notif = lista[index];
                final leido = notif['leido'] == true;
                final tipo = notif['tipo']?.toString() ?? '';
                final color = _colorTipo(tipo);
                final icono = _iconoTipo(tipo);

                return Dismissible(
                  key: Key('notif_${notif['id']}'),
                  direction: DismissDirection.endToStart,
                  background: Container(
                    alignment: Alignment.centerRight,
                    padding: const EdgeInsets.only(right: 20),
                    decoration: BoxDecoration(
                      color: Colors.red.shade700,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Icon(Icons.delete, color: Colors.white),
                  ),
                  onDismissed: (_) {
                    final id = notif['id'];
                    if (id != null) {
                      _notifService.eliminarNotificacion(id);
                    }
                  },
                  child: Card(
                    elevation: leido ? 0 : 2,
                    color: leido
                        ? (isDark ? const Color(0xFF1E222D) : Colors.white)
                        : (isDark ? const Color(0xFF282F3E) : const Color(0xFFFFFBEB)),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                      side: BorderSide(
                        color: leido ? (isDark ? Colors.white10 : Colors.black12) : const Color(0xFFF59E0B),
                        width: leido ? 1 : 1.5,
                      ),
                    ),
                    child: InkWell(
                      borderRadius: BorderRadius.circular(12),
                      onTap: () => _mostrarDetalle(notif),
                      child: Padding(
                        padding: const EdgeInsets.all(12),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Container(
                              padding: const EdgeInsets.all(8),
                              decoration: BoxDecoration(
                                color: color.withValues(alpha: 0.15),
                                shape: BoxShape.circle,
                              ),
                              child: Icon(icono, color: color, size: 20),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    children: [
                                      Expanded(
                                        child: Text(
                                          notif['titulo'] ?? 'Aviso',
                                          style: TextStyle(
                                            fontSize: 14,
                                            fontWeight: leido ? FontWeight.w600 : FontWeight.bold,
                                          ),
                                        ),
                                      ),
                                      if (!leido)
                                        Container(
                                          width: 8,
                                          height: 8,
                                          decoration: const BoxDecoration(
                                            color: Color(0xFFD97706),
                                            shape: BoxShape.circle,
                                          ),
                                        ),
                                    ],
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    notif['mensaje'] ?? '',
                                    maxLines: 2,
                                    overflow: TextOverflow.ellipsis,
                                    style: TextStyle(
                                      fontSize: 12.5,
                                      color: isDark ? Colors.white70 : Colors.black87,
                                    ),
                                  ),
                                  if (notif['creado_en'] != null) ...[
                                    const SizedBox(height: 6),
                                    Text(
                                      notif['creado_en'].toString().split('.').first.replaceFirst('T', ' '),
                                      style: TextStyle(
                                        fontSize: 11,
                                        color: isDark ? Colors.white38 : Colors.black38,
                                      ),
                                    ),
                                  ],
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
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
