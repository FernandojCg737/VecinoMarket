import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/auth_service.dart';
import '../services/cart_service.dart';
import 'auth_screen.dart';
import 'checkout_screen.dart';

class CartScreen extends StatelessWidget {
  const CartScreen({super.key});

  Future<void> _irAPagar(BuildContext context) async {
    var usuario = context.read<AuthService>().usuario;
    if (usuario == null) {
      // El checkout es solo para compradores (CU12) -- si no hay sesión,
      // primero pide iniciar sesión, igual que hace la web al ir a pagar.
      await Navigator.push(context, MaterialPageRoute(builder: (_) => const AuthScreen()));
      if (!context.mounted) return;
      usuario = context.read<AuthService>().usuario;
    }
    if (usuario == null) return; // canceló el login, no insistimos más

    if (usuario['rol'] != 'COMPRADOR') {
      // Con sesión pero de otro tipo de cuenta (EMPRESA/ADMIN/etc.) -- avisar
      // en vez de devolver al carrito sin explicación.
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Esta sesión no es de comprador. Inicia sesión con una cuenta de comprador para poder pagar.')),
      );
      return;
    }

    if (!context.mounted) return;
    Navigator.push(context, MaterialPageRoute(builder: (_) => const CheckoutScreen()));
  }

  @override
  Widget build(BuildContext context) {
    final cart = context.watch<CartService>();

    return Scaffold(
      appBar: AppBar(title: const Text('Mi carrito')),
      body: cart.items.isEmpty
          ? const Center(child: Text('Tu carrito está vacío.'))
          : Column(
              children: [
                Expanded(
                  child: ListView.separated(
                    padding: const EdgeInsets.all(12),
                    itemCount: cart.items.length,
                    separatorBuilder: (_, _) => const SizedBox(height: 8),
                    itemBuilder: (context, i) {
                      final item = cart.items[i];
                      return Card(
                        child: Padding(
                          padding: const EdgeInsets.all(8),
                          child: Row(
                            children: [
                              ClipRRect(
                                borderRadius: BorderRadius.circular(8),
                                child: SizedBox(
                                  width: 64,
                                  height: 64,
                                  child: item.producto.imagenUrl != null
                                      ? Image.network(item.producto.imagenUrl!, fit: BoxFit.cover)
                                      : Container(color: Colors.grey.shade200),
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(item.producto.empresaNombre, style: const TextStyle(fontSize: 11, color: Colors.green)),
                                    Text(item.producto.nombre, maxLines: 2, overflow: TextOverflow.ellipsis),
                                    Text('Bs ${item.precioUnitario}', style: const TextStyle(fontWeight: FontWeight.bold)),
                                  ],
                                ),
                              ),
                              Column(
                                children: [
                                  Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      IconButton(
                                        iconSize: 18,
                                        icon: const Icon(Icons.remove_circle_outline),
                                        onPressed: () => cart.actualizarCantidad(item.producto.id, item.cantidad - 1),
                                      ),
                                      Text('${item.cantidad}'),
                                      IconButton(
                                        iconSize: 18,
                                        icon: const Icon(Icons.add_circle_outline),
                                        onPressed: () => cart.actualizarCantidad(item.producto.id, item.cantidad + 1),
                                      ),
                                    ],
                                  ),
                                  IconButton(
                                    iconSize: 18,
                                    icon: const Icon(Icons.delete_outline, color: Colors.red),
                                    onPressed: () => cart.quitar(item.producto.id),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
                ),
                SafeArea(
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Text('Subtotal', style: TextStyle(fontSize: 16)),
                            Text('Bs ${cart.subtotal.toStringAsFixed(2)}', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                          ],
                        ),
                        const SizedBox(height: 12),
                        FilledButton(
                          style: FilledButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 16)),
                          onPressed: () => _irAPagar(context),
                          child: const Text('Continuar compra'),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
    );
  }
}
