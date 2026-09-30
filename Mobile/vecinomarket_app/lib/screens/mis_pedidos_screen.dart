import 'package:flutter/material.dart';
import '../models/pedido.dart';
import '../services/pedido_service.dart';

const _nombresEstado = {
  'PENDIENTE': 'Pendiente',
  'CONFIRMADO': 'Confirmado',
  'EN_PREPARACION': 'En preparación',
  'ENVIADO': 'Enviado',
  'ENTREGADO': 'Entregado',
  'CANCELADO': 'Cancelado',
};

Color _colorEstado(String estado) {
  switch (estado) {
    case 'ENTREGADO':
      return Colors.green;
    case 'CANCELADO':
      return Colors.red;
    case 'EN_PREPARACION':
    case 'ENVIADO':
      return Colors.orange;
    default:
      return Colors.grey;
  }
}

/// CU26: historial de compras pagadas del comprador (mismo endpoint que
/// "Mis compras" en la web).
class MisPedidosScreen extends StatefulWidget {
  const MisPedidosScreen({super.key});

  @override
  State<MisPedidosScreen> createState() => _MisPedidosScreenState();
}

class _MisPedidosScreenState extends State<MisPedidosScreen> {
  final _pedidoService = PedidoService();
  late Future<List<Pedido>> _pedidosFuture;

  @override
  void initState() {
    super.initState();
    _pedidosFuture = _pedidoService.obtenerMisCompras();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Mis pedidos')),
      body: RefreshIndicator(
        onRefresh: () async {
          setState(() => _pedidosFuture = _pedidoService.obtenerMisCompras());
          await _pedidosFuture;
        },
        child: FutureBuilder<List<Pedido>>(
          future: _pedidosFuture,
          builder: (context, snapshot) {
            if (snapshot.connectionState == ConnectionState.waiting) {
              return const Center(child: CircularProgressIndicator());
            }
            if (snapshot.hasError) {
              return ListView(
                children: const [
                  SizedBox(height: 80),
                  Center(child: Text('No se pudo cargar tu historial de pedidos.')),
                ],
              );
            }
            final pedidos = snapshot.data ?? [];
            if (pedidos.isEmpty) {
              return ListView(
                children: const [
                  SizedBox(height: 80),
                  Center(child: Text('Todavía no tienes compras.')),
                ],
              );
            }
            return ListView.separated(
              padding: const EdgeInsets.all(12),
              itemCount: pedidos.length,
              separatorBuilder: (_, _) => const SizedBox(height: 8),
              itemBuilder: (context, i) => _TarjetaPedido(pedido: pedidos[i]),
            );
          },
        ),
      ),
    );
  }
}

class _TarjetaPedido extends StatelessWidget {
  const _TarjetaPedido({required this.pedido});
  final Pedido pedido;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: ExpansionTile(
        title: Text(pedido.empresaNombre, style: const TextStyle(fontWeight: FontWeight.bold)),
        subtitle: Text('${pedido.numeroPedido} · ${pedido.fecha.toLocal().toString().split('.').first}'),
        trailing: Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
          decoration: BoxDecoration(
            color: _colorEstado(pedido.estado).withValues(alpha: 0.15),
            borderRadius: BorderRadius.circular(999),
          ),
          child: Text(
            _nombresEstado[pedido.estado] ?? pedido.estado,
            style: TextStyle(color: _colorEstado(pedido.estado), fontSize: 11, fontWeight: FontWeight.bold),
          ),
        ),
        children: [
          for (final item in pedido.items)
            ListTile(
              dense: true,
              title: Text(item.productoNombre),
              subtitle: Text('${item.cantidad} x Bs ${item.precioUnitario.toStringAsFixed(2)}'),
              trailing: Text('Bs ${item.subtotal.toStringAsFixed(2)}'),
            ),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('Subtotal', style: TextStyle(fontWeight: FontWeight.bold)),
                Text('Bs ${pedido.subtotal.toStringAsFixed(2)}', style: const TextStyle(fontWeight: FontWeight.bold)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
