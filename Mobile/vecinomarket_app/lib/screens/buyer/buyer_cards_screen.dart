import 'package:flutter/material.dart';
import '../../models/pedido.dart';
import '../../services/pedido_service.dart';

class BuyerCardsScreen extends StatefulWidget {
  const BuyerCardsScreen({super.key});

  @override
  State<BuyerCardsScreen> createState() => _BuyerCardsScreenState();
}

class _BuyerCardsScreenState extends State<BuyerCardsScreen> {
  final _pedidoService = PedidoService();
  List<Pedido> _historial = [];
  bool _cargando = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _cargarHistorial();
  }

  Future<void> _cargarHistorial() async {
    setState(() {
      _cargando = true;
      _error = null;
    });
    try {
      final res = await _pedidoService.obtenerMisCompras();
      if (mounted) {
        setState(() {
          _historial = res;
          _cargando = false;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _error = 'No se pudo cargar el historial de métodos de pago.';
          _cargando = false;
        });
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
            onPressed: _cargarHistorial,
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
                      FilledButton(onPressed: _cargarHistorial, child: const Text('Reintentar')),
                    ],
                  ),
                )
              : RefreshIndicator(
                  onRefresh: _cargarHistorial,
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

                      if (_historial.isEmpty)
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
                                child: const Icon(Icons.history_toggle_off_outlined, size: 36, color: Colors.grey),
                              ),
                              const SizedBox(height: 16),
                              const Text(
                                'Aún no realizaste compras.',
                                textAlign: TextAlign.center,
                                style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
                              ),
                              const SizedBox(height: 8),
                              const Text(
                                'Tus métodos de pago utilizados aparecerán aquí.',
                                textAlign: TextAlign.center,
                                style: TextStyle(fontSize: 13, color: Colors.grey),
                              ),
                            ],
                          ),
                        )
                      else
                        ..._historial.map((pedido) {
                          final metodo = pedido.metodoPago.toUpperCase();
                          final bool esPaypal = metodo.contains('PAYPAL');
                          final bool esQr = metodo.contains('QR');
                          
                          IconData iconoMetodo = Icons.payment;
                          String nombreMetodo = metodo;
                          if (esPaypal) {
                            iconoMetodo = Icons.language;
                            nombreMetodo = 'PayPal';
                          } else if (esQr) {
                            iconoMetodo = Icons.qr_code_2;
                            nombreMetodo = 'Pago con QR';
                          }

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
                                  child: Icon(iconoMetodo, color: const Color(0xFFD97706), size: 24),
                                ),
                                const SizedBox(width: 14),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        nombreMetodo,
                                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                                      ),
                                      const SizedBox(height: 4),
                                      Text(
                                        'Pedido #${pedido.numeroPedido} · Bs ${pedido.subtotal.toStringAsFixed(2)}',
                                        style: TextStyle(fontSize: 12, color: isDark ? const Color(0xFF9CA3AF) : const Color(0xFF6B7280)),
                                      ),
                                    ],
                                  ),
                                ),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                  decoration: BoxDecoration(
                                    color: Colors.green.withValues(alpha: 0.1),
                                    borderRadius: BorderRadius.circular(8),
                                  ),
                                  child: const Text('Exitoso', style: TextStyle(color: Colors.green, fontSize: 10, fontWeight: FontWeight.bold)),
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
