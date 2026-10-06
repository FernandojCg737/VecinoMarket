import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../services/api_client.dart';
import '../../services/auth_service.dart';
import '../chat_screen.dart';
import '../live_commerce_screen.dart';
import '../mis_pedidos_screen.dart';
import 'buyer_addresses_screen.dart';
import 'buyer_recommendations_screen.dart';
import 'buyer_reviews_screen.dart';
import 'buyer_store_chatbot_screen.dart';

class BuyerDashboardScreen extends StatefulWidget {
  const BuyerDashboardScreen({super.key});

  @override
  State<BuyerDashboardScreen> createState() => _BuyerDashboardScreenState();
}

class _BuyerDashboardScreenState extends State<BuyerDashboardScreen> {
  final _api = ApiClient.instance;
  bool _cargando = true;
  String? _error;

  List<dynamic> _compras = [];
  List<dynamic> _valoraciones = [];
  List<dynamic> _notificaciones = [];

  @override
  void initState() {
    super.initState();
    _cargarDatos();
  }

  Future<void> _cargarDatos() async {
    setState(() {
      _cargando = true;
      _error = null;
    });

    try {
      final res = await Future.wait([
        _api.get('pedidos/mis-compras/', params: {'page_size': 100}),
        _api.get('reportes/mis-valoraciones/'),
        _api.get('notificaciones/mis-notificaciones/'),
      ]);

      if (mounted) {
        final comprasData = res[0];
        final listCompras = comprasData is Map ? (comprasData['results'] as List? ?? []) : (comprasData as List? ?? []);

        setState(() {
          _compras = listCompras;
          _valoraciones = (res[1] as List?) ?? [];
          _notificaciones = (res[2] as List?) ?? [];
          _cargando = false;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _error = 'No se pudo cargar la información de tu cuenta.';
          _cargando = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final usuario = context.watch<AuthService>().usuario;
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final bgColor = isDark ? const Color(0xFF111827) : Colors.white;
    final cardBg = isDark ? const Color(0xFF1F2937) : const Color(0xFFF9FAFB);
    final borderColor = isDark ? const Color(0xFF374151) : const Color(0xFFE5E7EB);

    final pedidosEnCurso = _compras.where((c) => !['ENTREGADO', 'CANCELADO'].contains(c['estado'])).length;
    final totalGastado = _compras.fold<double>(0.0, (acc, c) => acc + (double.tryParse('${c['subtotal'] ?? c['total'] ?? 0}') ?? 0.0));
    final idsCalificados = _valoraciones.map((v) => v['pedido']).toSet();
    final porCalificar = _compras.where((c) => c['estado'] == 'ENTREGADO' && !idsCalificados.contains(c['id'])).length;
    final notificacionesSinLeer = _notificaciones.where((n) => n['leido'] == false).length;

    return Scaffold(
      backgroundColor: bgColor,
      appBar: AppBar(
        title: const Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.dashboard_outlined, size: 22, color: Color(0xFFD97706)),
            SizedBox(width: 8),
            Text('Mi cuenta', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _cargarDatos,
          ),
        ],
      ),
      body: _cargando
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.error_outline, size: 48, color: Colors.redAccent),
                      const SizedBox(height: 12),
                      Text(_error!),
                      const SizedBox(height: 12),
                      FilledButton(onPressed: _cargarDatos, child: const Text('Reintentar')),
                    ],
                  ),
                )
              : RefreshIndicator(
                  onRefresh: _cargarDatos,
                  child: ListView(
                    padding: const EdgeInsets.all(16),
                    children: [
                      // Saludo inicial
                      Text(
                        'Hola, ${usuario?['nombre'] ?? 'Comprador'}',
                        style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'Todo lo tuyo en un solo lugar.',
                        style: TextStyle(
                          fontSize: 13,
                          color: isDark ? const Color(0xFF9CA3AF) : const Color(0xFF6B7280),
                        ),
                      ),
                      const SizedBox(height: 20),

                      // Tarjetas de métricas 2x2
                      Row(
                        children: [
                          Expanded(
                            child: _buildMetricaCard(
                              icon: Icons.inventory_2_outlined,
                              label: 'Pedidos en curso',
                              valor: '$pedidosEnCurso',
                              color: const Color(0xFF3B82F6),
                              cardBg: cardBg,
                              borderColor: borderColor,
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: _buildMetricaCard(
                              icon: Icons.account_balance_wallet_outlined,
                              label: 'Total comprado',
                              valor: 'Bs ${totalGastado.toStringAsFixed(2)}',
                              color: const Color(0xFF10B981),
                              cardBg: cardBg,
                              borderColor: borderColor,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      Row(
                        children: [
                          Expanded(
                            child: _buildMetricaCard(
                              icon: Icons.star_outline,
                              label: 'Por calificar',
                              valor: '$porCalificar',
                              color: const Color(0xFFF59E0B),
                              cardBg: cardBg,
                              borderColor: borderColor,
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: _buildMetricaCard(
                              icon: Icons.notifications_none_outlined,
                              label: 'Notificaciones',
                              valor: '$notificacionesSinLeer',
                              color: const Color(0xFF8B5CF6),
                              cardBg: cardBg,
                              borderColor: borderColor,
                            ),
                          ),
                        ],
                      ),

                      const SizedBox(height: 24),
                      const Text(
                        'Accesos directos',
                        style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: 12),

                      // Accesos rápidos
                      _buildAccesoRapido(
                        icon: Icons.location_on_outlined,
                        titulo: 'Mis direcciones',
                        subtitulo: 'Gestiona tus direcciones de envío guardadas',
                        cardBg: cardBg,
                        borderColor: borderColor,
                        onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const BuyerAddressesScreen())),
                      ),
                      _buildAccesoRapido(
                        icon: Icons.star_outline,
                        titulo: 'Mis reseñas',
                        subtitulo: 'Valora y comenta sobre tus compras entregadas',
                        cardBg: cardBg,
                        borderColor: borderColor,
                        onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const BuyerReviewsScreen())),
                      ),
                      _buildAccesoRapido(
                        icon: Icons.auto_awesome_outlined,
                        titulo: 'Recomendado para ti',
                        subtitulo: 'Descubre productos sugeridos por inteligencia artificial',
                        cardBg: cardBg,
                        borderColor: borderColor,
                        onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const BuyerRecommendationsScreen())),
                      ),
                      _buildAccesoRapido(
                        icon: Icons.chat_bubble_outline,
                        titulo: 'Mis chats',
                        subtitulo: 'Conversaciones activas con las tiendas',
                        cardBg: cardBg,
                        borderColor: borderColor,
                        onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const ChatScreen())),
                      ),
                      _buildAccesoRapido(
                        icon: Icons.smart_toy_outlined,
                        titulo: 'Chatbot de tiendas',
                        subtitulo: 'Consulta dudas directamente al asistente de cada negocio',
                        cardBg: cardBg,
                        borderColor: borderColor,
                        onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const BuyerStoreChatbotScreen())),
                      ),
                      _buildAccesoRapido(
                        icon: Icons.sensors,
                        titulo: 'Transmisiones en vivo',
                        subtitulo: 'Ofertas y demostraciones en vivo (Live Commerce)',
                        cardBg: cardBg,
                        borderColor: borderColor,
                        onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const LiveCommerceScreen())),
                      ),

                      const SizedBox(height: 24),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text(
                            'Compras recientes',
                            style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                          ),
                          TextButton(
                            onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const MisPedidosScreen())),
                            child: const Text('Ver todas →'),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),

                      if (_compras.isEmpty)
                        Container(
                          padding: const EdgeInsets.all(24),
                          decoration: BoxDecoration(
                            color: cardBg,
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(color: borderColor),
                          ),
                          child: const Center(
                            child: Text('Todavía no realizaste ninguna compra.'),
                          ),
                        )
                      else
                        ..._compras.take(3).map((c) {
                          final estado = c['estado'] ?? 'PENDIENTE';
                          final total = c['subtotal'] ?? c['total'] ?? 0;
                          final fecha = (c['fecha_creacion'] ?? '').toString().split('T').first;

                          return Container(
                            margin: const EdgeInsets.only(bottom: 10),
                            padding: const EdgeInsets.all(14),
                            decoration: BoxDecoration(
                              color: cardBg,
                              borderRadius: BorderRadius.circular(14),
                              border: Border.all(color: borderColor),
                            ),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      'Pedido #${c['id'] ?? ''}',
                                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                                    ),
                                    const SizedBox(height: 4),
                                    Text(
                                      fecha,
                                      style: TextStyle(
                                        fontSize: 12,
                                        color: isDark ? const Color(0xFF9CA3AF) : const Color(0xFF6B7280),
                                      ),
                                    ),
                                  ],
                                ),
                                Column(
                                  crossAxisAlignment: CrossAxisAlignment.end,
                                  children: [
                                    Text(
                                      'Bs $total',
                                      style: const TextStyle(fontWeight: FontWeight.bold, color: Color(0xFFD97706), fontSize: 14),
                                    ),
                                    const SizedBox(height: 4),
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                      decoration: BoxDecoration(
                                        color: _colorBadgeEstado(estado).withValues(alpha: 0.15),
                                        borderRadius: BorderRadius.circular(999),
                                      ),
                                      child: Text(
                                        estado,
                                        style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: _colorBadgeEstado(estado)),
                                      ),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          );
                        }),
                    ],
                  ),
                ),
    );
  }

  Color _colorBadgeEstado(String estado) {
    switch (estado) {
      case 'ENTREGADO':
        return Colors.green;
      case 'CANCELADO':
        return Colors.red;
      case 'EN_PREPARACION':
      case 'ENVIADO':
        return Colors.orange;
      default:
        return Colors.blue;
    }
  }

  Widget _buildMetricaCard({
    required IconData icon,
    required String label,
    required String valor,
    required Color color,
    required Color cardBg,
    required Color borderColor,
  }) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: cardBg,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: borderColor),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 32,
                height: 32,
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.12),
                  shape: BoxShape.circle,
                ),
                child: Icon(icon, size: 16, color: color),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  label,
                  style: const TextStyle(fontSize: 11, color: Colors.grey),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Text(
            valor,
            style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
          ),
        ],
      ),
    );
  }

  Widget _buildAccesoRapido({
    required IconData icon,
    required String titulo,
    required String subtitulo,
    required Color cardBg,
    required Color borderColor,
    required VoidCallback onTap,
  }) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      decoration: BoxDecoration(
        color: cardBg,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: borderColor),
      ),
      child: ListTile(
        leading: Icon(icon, color: const Color(0xFFD97706)),
        title: Text(titulo, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold)),
        subtitle: Text(subtitulo, style: const TextStyle(fontSize: 12, color: Colors.grey)),
        trailing: const Icon(Icons.chevron_right, size: 20),
        onTap: onTap,
      ),
    );
  }
}
