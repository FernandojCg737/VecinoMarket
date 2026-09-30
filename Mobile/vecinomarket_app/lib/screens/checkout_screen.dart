import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/sucursal.dart';
import '../services/api_client.dart';
import '../services/cart_service.dart';
import '../services/pedido_service.dart';
import 'mis_pedidos_screen.dart';
import 'paypal_webview_screen.dart';

/// CU12: primera versión del checkout real en móvil -- solo "Recojo en
/// tienda" (RECOJO_TIENDA). El envío a domicilio necesita elegir una
/// dirección guardada del comprador, y esa gestión (CU13 Direcciones) todavía
/// no existe en la app móvil -- se deja para una siguiente iteración.
class CheckoutScreen extends StatefulWidget {
  const CheckoutScreen({super.key});

  @override
  State<CheckoutScreen> createState() => _CheckoutScreenState();
}

class _CheckoutScreenState extends State<CheckoutScreen> {
  final _pedidoService = PedidoService();

  late Future<Map<int, List<Sucursal>>> _sucursalesFuture;
  final Map<int, int> _sucursalSeleccionada = {}; // empresaId -> sucursalId

  bool _procesando = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _sucursalesFuture = _cargarSucursales();
  }

  Future<Map<int, List<Sucursal>>> _cargarSucursales() async {
    final cart = context.read<CartService>();
    final empresaIds = cart.items.map((it) => it.producto.empresaId).toSet();
    final resultado = <int, List<Sucursal>>{};
    for (final empresaId in empresaIds) {
      resultado[empresaId] = await _pedidoService.obtenerSucursales(empresaId);
    }
    return resultado;
  }

  Future<void> _pagar() async {
    final cart = context.read<CartService>();
    final empresaIds = cart.items.map((it) => it.producto.empresaId).toSet();

    for (final empresaId in empresaIds) {
      if (_sucursalSeleccionada[empresaId] == null) {
        setState(() => _error = 'Elige una sucursal de recojo para cada tienda.');
        return;
      }
    }

    setState(() {
      _procesando = true;
      _error = null;
    });

    try {
      final items = cart.items
          .map((it) => {'producto_id': it.producto.id, 'cantidad': it.cantidad})
          .toList();
      final entregas = {
        for (final empresaId in empresaIds)
          '$empresaId': {
            'modalidad': 'RECOJO_TIENDA',
            'sucursal_id': _sucursalSeleccionada[empresaId],
          },
      };

      final resultado = await _pedidoService.iniciarCheckout(items: items, entregas: entregas);
      final enlace = resultado['enlace_aprobacion_paypal'] as String?;
      if (enlace == null) {
        throw Exception('PayPal no devolvió un link de aprobación.');
      }

      if (!mounted) return;
      final aprobado = await Navigator.push<bool>(
        context,
        MaterialPageRoute(
          builder: (_) => PaypalWebviewScreen(
            enlaceAprobacion: enlace,
            ordenCompraId: resultado['orden_compra_id'] as int,
            paypalOrderId: resultado['paypal_order_id'] as String,
          ),
        ),
      );

      if (aprobado == true && mounted) {
        cart.vaciar();
        Navigator.pushReplacement(context, MaterialPageRoute(builder: (_) => const MisPedidosScreen()));
      }
    } on ApiException catch (e) {
      setState(() => _error = e.mensaje);
    } catch (e) {
      setState(() => _error = 'No se pudo iniciar el pago. Intenta de nuevo.');
    } finally {
      if (mounted) setState(() => _procesando = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final cart = context.watch<CartService>();

    return Scaffold(
      appBar: AppBar(title: const Text('Finalizar compra')),
      body: FutureBuilder<Map<int, List<Sucursal>>>(
        future: _sucursalesFuture,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snapshot.hasError) {
            return const Center(child: Text('No se pudo cargar la información de entrega.'));
          }
          final sucursalesPorEmpresa = snapshot.data!;
          final empresas = cart.items
              .map((it) => (id: it.producto.empresaId, nombre: it.producto.empresaNombre))
              .toSet();

          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              const Text(
                'Recojo en tienda',
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
              ),
              const SizedBox(height: 4),
              const Text(
                'Por ahora la app solo soporta recoger tu pedido en la tienda. Elige una sucursal por cada negocio.',
                style: TextStyle(fontSize: 12, color: Colors.grey),
              ),
              const SizedBox(height: 12),
              for (final empresa in empresas) ...[
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(12),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(empresa.nombre, style: const TextStyle(fontWeight: FontWeight.bold)),
                        const SizedBox(height: 8),
                        if ((sucursalesPorEmpresa[empresa.id] ?? []).isEmpty)
                          const Text(
                            'Esta tienda no tiene sucursales de recojo disponibles. Quita sus productos del carrito para poder continuar.',
                            style: TextStyle(color: Colors.red, fontSize: 12),
                          )
                        else
                          ...sucursalesPorEmpresa[empresa.id]!.map(
                            (s) => RadioListTile<int>(
                              contentPadding: EdgeInsets.zero,
                              dense: true,
                              title: Text(s.nombre),
                              subtitle: s.direccionTexto.isNotEmpty ? Text(s.direccionTexto) : null,
                              value: s.id,
                              groupValue: _sucursalSeleccionada[empresa.id],
                              onChanged: (v) => setState(() => _sucursalSeleccionada[empresa.id] = v!),
                            ),
                          ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 8),
              ],
              const SizedBox(height: 8),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('Total', style: TextStyle(fontSize: 16)),
                  Text('Bs ${cart.subtotal.toStringAsFixed(2)}', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                ],
              ),
              if (_error != null) ...[
                const SizedBox(height: 12),
                Text(_error!, style: const TextStyle(color: Colors.red)),
              ],
              const SizedBox(height: 16),
              FilledButton.icon(
                icon: const Icon(Icons.account_balance_wallet_outlined),
                style: FilledButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 16)),
                onPressed: _procesando ? null : _pagar,
                label: _procesando
                    ? const SizedBox(height: 18, width: 18, child: CircularProgressIndicator(strokeWidth: 2))
                    : const Text('Pagar con PayPal'),
              ),
            ],
          );
        },
      ),
    );
  }
}
