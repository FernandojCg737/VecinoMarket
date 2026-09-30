import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/producto.dart';
import '../services/cart_service.dart';

class ProductDetailScreen extends StatefulWidget {
  const ProductDetailScreen({super.key, required this.producto});
  final Producto producto;

  @override
  State<ProductDetailScreen> createState() => _ProductDetailScreenState();
}

class _ProductDetailScreenState extends State<ProductDetailScreen> {
  int _cantidad = 1;
  int _paginaImagen = 0;

  @override
  Widget build(BuildContext context) {
    final p = widget.producto;
    return Scaffold(
      appBar: AppBar(title: Text(p.nombre, overflow: TextOverflow.ellipsis)),
      body: SafeArea(
        child: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _galeriaImagenes(p.imagenes),
              Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        const Icon(Icons.storefront, size: 16, color: Colors.green),
                        const SizedBox(width: 4),
                        Text(p.empresaNombre, style: const TextStyle(color: Colors.green, fontWeight: FontWeight.bold)),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text(p.nombre, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold)),
                    const SizedBox(height: 8),
                    if (p.tieneDescuento)
                      Row(
                        children: [
                          Text('Bs ${p.precioDescuento}', style: const TextStyle(fontSize: 26, fontWeight: FontWeight.bold, color: Colors.deepOrange)),
                          const SizedBox(width: 8),
                          Text('Bs ${p.precio}', style: const TextStyle(fontSize: 15, color: Colors.grey, decoration: TextDecoration.lineThrough)),
                        ],
                      )
                    else
                      Text('Bs ${p.precio}', style: const TextStyle(fontSize: 26, fontWeight: FontWeight.bold)),
                    const SizedBox(height: 16),
                    Text(p.descripcion, style: TextStyle(color: Colors.grey.shade700, height: 1.4)),
                    const SizedBox(height: 20),
                    Row(
                      children: [
                        _selectorCantidad(),
                        const SizedBox(width: 12),
                        Text('${p.stock} disponibles', style: TextStyle(color: Colors.grey.shade600, fontSize: 12)),
                      ],
                    ),
                    const SizedBox(height: 20),
                    SizedBox(
                      width: double.infinity,
                      child: FilledButton.icon(
                        icon: const Icon(Icons.shopping_cart),
                        label: const Text('Agregar al carrito'),
                        style: FilledButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 16)),
                        onPressed: p.stock <= 0
                            ? null
                            : () {
                                context.read<CartService>().agregar(p, cantidad: _cantidad);
                                ScaffoldMessenger.of(context).showSnackBar(
                                  SnackBar(content: Text('${p.nombre} agregado al carrito')),
                                );
                              },
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _galeriaImagenes(List<String> imagenes) {
    if (imagenes.isEmpty) {
      return AspectRatio(
        aspectRatio: 1,
        child: Container(color: Colors.grey.shade200, child: const Icon(Icons.image_not_supported, size: 48)),
      );
    }
    return Column(
      children: [
        AspectRatio(
          aspectRatio: 1,
          child: PageView.builder(
            itemCount: imagenes.length,
            onPageChanged: (i) => setState(() => _paginaImagen = i),
            itemBuilder: (context, i) => Image.network(imagenes[i], fit: BoxFit.cover),
          ),
        ),
        if (imagenes.length > 1)
          Padding(
            padding: const EdgeInsets.only(top: 8),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: List.generate(imagenes.length, (i) {
                final activa = i == _paginaImagen;
                return AnimatedContainer(
                  duration: const Duration(milliseconds: 200),
                  margin: const EdgeInsets.symmetric(horizontal: 3),
                  width: activa ? 10 : 7,
                  height: activa ? 10 : 7,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: activa ? Theme.of(context).colorScheme.primary : Colors.grey.shade400,
                  ),
                );
              }),
            ),
          ),
      ],
    );
  }

  Widget _selectorCantidad() {
    return Container(
      decoration: BoxDecoration(border: Border.all(color: Colors.grey.shade400), borderRadius: BorderRadius.circular(999)),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          IconButton(
            icon: const Icon(Icons.remove),
            onPressed: () => setState(() => _cantidad = (_cantidad - 1).clamp(1, widget.producto.stock)),
          ),
          Text('$_cantidad', style: const TextStyle(fontWeight: FontWeight.bold)),
          IconButton(
            icon: const Icon(Icons.add),
            onPressed: () => setState(() => _cantidad = (_cantidad + 1).clamp(1, widget.producto.stock)),
          ),
        ],
      ),
    );
  }
}
