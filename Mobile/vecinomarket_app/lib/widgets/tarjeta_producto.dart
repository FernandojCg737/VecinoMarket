import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/producto.dart';
import '../screens/auth_screen.dart';
import '../screens/product_detail_screen.dart';
import '../services/auth_service.dart';
import '../services/wishlist_service.dart';

/// Tarjeta de producto del catálogo (antes _TarjetaProducto en home_screen).
/// Se comparte con los carruseles de IA e incluye el corazón de la lista de
/// deseos (CU30), arriba a la derecha. `insignia` (opcional) es la etiqueta
/// sobre la foto ("Para ti", "0,6 km"); `nota` (opcional) una línea chica
/// bajo el nombre ("★ 4,7 · tienda"). Sin ellas se ve igual que siempre.
class TarjetaProducto extends StatelessWidget {
  const TarjetaProducto({super.key, required this.producto, this.insignia, this.iconoInsignia, this.nota});

  final Producto producto;
  final String? insignia;
  final IconData? iconoInsignia;
  final String? nota;

  @override
  Widget build(BuildContext context) {
    return Card(
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => ProductDetailScreen(producto: producto))),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            AspectRatio(
              aspectRatio: 1,
              child: Stack(
                fit: StackFit.expand,
                children: [
                  producto.imagenUrl != null
                      ? Image.network(
                          producto.imagenUrl!,
                          fit: BoxFit.cover,
                          errorBuilder: (_, _, _) => Container(color: Colors.grey.shade200, child: const Icon(Icons.image_not_supported)),
                        )
                      : Container(color: Colors.grey.shade200, child: const Icon(Icons.image_not_supported)),
                  if (insignia != null)
                    Positioned(
                      top: 6,
                      left: 6,
                      child: _Insignia(texto: insignia!, icono: iconoInsignia),
                    ),
                  Positioned(top: 5, right: 5, child: _BotonDeseo(producto: producto)),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(8),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    producto.empresaNombre,
                    style: const TextStyle(fontSize: 10, color: Colors.green, fontWeight: FontWeight.bold),
                    maxLines: 1,
                  ),
                  Text(producto.nombre, style: const TextStyle(fontSize: 13), maxLines: 2, overflow: TextOverflow.ellipsis),
                  if (nota != null && nota!.isNotEmpty)
                    Text(
                      nota!,
                      style: const TextStyle(fontSize: 10.5, color: Colors.grey),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  const SizedBox(height: 4),
                  if (producto.tieneDescuento)
                    Row(
                      children: [
                        Text('Bs ${producto.precioDescuento}', style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.deepOrange)),
                        const SizedBox(width: 4),
                        Flexible(
                          child: Text(
                            'Bs ${producto.precio}',
                            style: const TextStyle(fontSize: 11, color: Colors.grey, decoration: TextDecoration.lineThrough),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                    )
                  else
                    Text('Bs ${producto.precio}', style: const TextStyle(fontWeight: FontWeight.bold)),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// CU30: corazón de la lista de deseos (misma lógica que tenía _TarjetaProducto en main).
class _BotonDeseo extends StatelessWidget {
  const _BotonDeseo({required this.producto});
  final Producto producto;

  @override
  Widget build(BuildContext context) {
    return Consumer<WishlistService>(
      builder: (context, wishlist, _) {
        final esFavorito = wishlist.esDeseado(producto.id);
        return GestureDetector(
          onTap: () async {
            final auth = context.read<AuthService>();
            if (auth.usuario == null) {
              Navigator.push(context, MaterialPageRoute(builder: (_) => const AuthScreen()));
              return;
            }
            final rol = auth.usuario!['rol']?.toString().toUpperCase() ?? '';
            if (rol != 'COMPRADOR') {
              showDialog(
                context: context,
                builder: (ctx) => AlertDialog(
                  icon: const Icon(Icons.warning_amber_rounded, size: 36, color: Color(0xFFD97706)),
                  title: const Text('Acción exclusiva para compradores', textAlign: TextAlign.center, style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                  content: const Text('Inicia sesión con una cuenta de comprador para guardar productos en tu lista de deseos.', textAlign: TextAlign.center, style: TextStyle(fontSize: 13)),
                  actions: [
                    TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Entendido')),
                  ],
                ),
              );
              return;
            }
            await wishlist.toggleDeseo(producto.id);
          },
          child: Container(
            padding: const EdgeInsets.all(5),
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.92),
              shape: BoxShape.circle,
              boxShadow: const [
                BoxShadow(color: Colors.black26, blurRadius: 4, offset: Offset(0, 1)),
              ],
            ),
            child: Icon(
              esFavorito ? Icons.favorite : Icons.favorite_border,
              color: esFavorito ? const Color(0xFFE11D48) : Colors.grey.shade700,
              size: 16,
            ),
          ),
        );
      },
    );
  }
}

class _Insignia extends StatelessWidget {
  const _Insignia({required this.texto, this.icono});
  final String texto;
  final IconData? icono;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xE6111827) : const Color(0xF2FFFAF0), // brand-50 / gris-900
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: isDark ? const Color(0xFF815903) : const Color(0xFFF8E1AF)), // brand-800 / brand-200
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icono != null) ...[
            Icon(icono, size: 11, color: isDark ? const Color(0xFFF1CD7E) : const Color(0xFFA37000)),
            const SizedBox(width: 3),
          ],
          Text(
            texto,
            style: TextStyle(
              fontSize: 10.5,
              fontWeight: FontWeight.w600,
              color: isDark ? const Color(0xFFF1CD7E) : const Color(0xFFA37000), // brand-300 / brand-700
            ),
          ),
        ],
      ),
    );
  }
}

/// Carrusel horizontal de tarjetas (Para ti, Cerca de ti, Similares).
class CarruselProductos extends StatelessWidget {
  const CarruselProductos({super.key, required this.tarjetas, this.alto = 262, this.ancho = 158});

  final List<Widget> tarjetas;
  final double alto;
  final double ancho;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: alto,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 12),
        itemCount: tarjetas.length,
        separatorBuilder: (_, _) => const SizedBox(width: 8),
        itemBuilder: (_, i) => SizedBox(width: ancho, child: tarjetas[i]),
      ),
    );
  }
}
