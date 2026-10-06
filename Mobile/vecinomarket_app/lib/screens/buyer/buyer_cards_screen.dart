import 'package:flutter/material.dart';
import '../../services/api_client.dart';

class BuyerCardsScreen extends StatefulWidget {
  const BuyerCardsScreen({super.key});

  @override
  State<BuyerCardsScreen> createState() => _BuyerCardsScreenState();
}

class _BuyerCardsScreenState extends State<BuyerCardsScreen> {
  final _api = ApiClient.instance;
  List<dynamic> _tarjetas = [];
  bool _cargando = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _cargarTarjetas();
  }

  Future<void> _cargarTarjetas() async {
    setState(() {
      _cargando = true;
      _error = null;
    });
    try {
      final res = await _api.get('pagos/mis-tarjetas/');
      if (mounted) {
        setState(() {
          _tarjetas = (res as List?) ?? [];
          _cargando = false;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _error = 'No se pudo cargar tus métodos de pago.';
          _cargando = false;
        });
      }
    }
  }

  Future<void> _eliminarTarjeta(dynamic t) async {
    final confirmar = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('¿Eliminar método de pago?'),
        content: const Text('¿Estás seguro de que deseas desvincular esta tarjeta guardada?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancelar')),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: Colors.red),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Eliminar'),
          ),
        ],
      ),
    );

    if (confirmar != true) return;
    final id = t['id'];

    try {
      await _api.delete('pagos/mis-tarjetas/$id/');
      _cargarTarjetas();
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('No se pudo eliminar el método de pago.')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final bgColor = isDark ? const Color(0xFF111827) : Colors.white;
    final cardBg = isDark ? const Color(0xFF1F2937) : const Color(0xFFF9FAFB);
    final borderColor = isDark ? const Color(0xFF374151) : const Color(0xFFE5E7EB);

    return Scaffold(
      backgroundColor: bgColor,
      appBar: AppBar(
        title: const Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.credit_card, size: 22, color: Color(0xFFD97706)),
            SizedBox(width: 8),
            Text('Métodos de pago', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _cargarTarjetas,
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
                      FilledButton(onPressed: _cargarTarjetas, child: const Text('Reintentar')),
                    ],
                  ),
                )
              : RefreshIndicator(
                  onRefresh: _cargarTarjetas,
                  child: ListView(
                    padding: const EdgeInsets.all(16),
                    children: [
                      Text(
                        'CU25 · Administra tus tarjetas y métodos guardados para pagos seguros.',
                        style: TextStyle(
                          fontSize: 13,
                          color: isDark ? const Color(0xFF9CA3AF) : const Color(0xFF6B7280),
                        ),
                      ),
                      const SizedBox(height: 16),

                      if (_tarjetas.isEmpty)
                        Container(
                          padding: const EdgeInsets.symmetric(vertical: 60, horizontal: 20),
                          alignment: Alignment.center,
                          child: Column(
                            children: [
                              Container(
                                width: 72,
                                height: 72,
                                decoration: BoxDecoration(
                                  color: isDark ? const Color(0xFF1F2937) : const Color(0xFFF3F4F6),
                                  shape: BoxShape.circle,
                                ),
                                child: const Icon(Icons.credit_card_off_outlined, size: 36, color: Colors.grey),
                              ),
                              const SizedBox(height: 16),
                              const Text(
                                'No tienes métodos de pago guardados.',
                                textAlign: TextAlign.center,
                                style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
                              ),
                              const SizedBox(height: 8),
                              const Text(
                                'Puedes guardar tarjetas de forma segura durante tu proceso de compra por PayPal / Pasarela.',
                                textAlign: TextAlign.center,
                                style: TextStyle(fontSize: 13, color: Colors.grey),
                              ),
                            ],
                          ),
                        )
                      else
                        ..._tarjetas.map((t) {
                          final tMap = Map<String, dynamic>.from(t as Map);
                          final marca = tMap['marca'] ?? tMap['brand'] ?? 'Tarjeta';
                          final ultimos4 = tMap['ultimos_cuatro'] ?? tMap['last4'] ?? '••••';
                          final expMes = tMap['exp_mes'] ?? tMap['expiry_month'] ?? '';
                          final expAnio = tMap['exp_anio'] ?? tMap['expiry_year'] ?? '';

                          return Container(
                            margin: const EdgeInsets.only(bottom: 12),
                            padding: const EdgeInsets.all(16),
                            decoration: BoxDecoration(
                              color: cardBg,
                              borderRadius: BorderRadius.circular(16),
                              border: Border.all(color: borderColor),
                            ),
                            child: Row(
                              children: [
                                Container(
                                  width: 44,
                                  height: 44,
                                  decoration: BoxDecoration(
                                    color: const Color(0xFFD97706).withValues(alpha: 0.12),
                                    borderRadius: BorderRadius.circular(10),
                                  ),
                                  child: const Icon(Icons.credit_card, color: Color(0xFFD97706), size: 24),
                                ),
                                const SizedBox(width: 14),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        '$marca terminada en $ultimos4',
                                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                                      ),
                                      if (expMes.toString().isNotEmpty) ...[
                                        const SizedBox(height: 4),
                                        Text(
                                          'Vence: $expMes/$expAnio',
                                          style: TextStyle(fontSize: 12, color: isDark ? const Color(0xFF9CA3AF) : const Color(0xFF6B7280)),
                                        ),
                                      ],
                                    ],
                                  ),
                                ),
                                IconButton(
                                  icon: const Icon(Icons.delete_outline, color: Colors.redAccent, size: 20),
                                  tooltip: 'Eliminar método',
                                  onPressed: () => _eliminarTarjeta(tMap),
                                ),
                              ],
                            ),
                          );
                        }),

                      const SizedBox(height: 20),
                      Container(
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(
                          color: const Color(0xFFD97706).withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: const Color(0xFFD97706).withValues(alpha: 0.3)),
                        ),
                        child: const Row(
                          children: [
                            Icon(Icons.lock_outline, color: Color(0xFFD97706), size: 20),
                            SizedBox(width: 10),
                            Expanded(
                              child: Text(
                                'Tus datos están protegidos bajo estándares PCI-DSS y bóveda tokenizada de PayPal.',
                                style: TextStyle(fontSize: 12, height: 1.4),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
    );
  }
}
