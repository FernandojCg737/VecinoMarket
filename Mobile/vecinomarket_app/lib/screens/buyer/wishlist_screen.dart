import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../models/wishlist_item.dart';
import '../../services/cart_service.dart';
import '../../services/catalogo_service.dart';
import '../../services/wishlist_service.dart';
import '../cart_screen.dart';
import '../product_detail_screen.dart';

/// Pantalla del Caso de Uso CU30: Gestionar Lista de Deseos y Alertas de Precio.
/// Permite al comprador ver productos guardados, fijar precio meta, recibir
/// alertas de rebajas y transferirlos directamente al carrito de compras.
class WishlistScreen extends StatefulWidget {
  const WishlistScreen({super.key});

  @override
  State<WishlistScreen> createState() => _WishlistScreenState();
}

class _WishlistScreenState extends State<WishlistScreen> {
  static const Color _roseColor = Color(0xFFE11D48);
  static const Color _emeraldColor = Color(0xFF059669);
  static const Color _brandGold = Color(0xFFD97706);

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<WishlistService>().cargarWishlist();
    });
  }

  void _mostrarDialogoPrecioMeta(WishlistItem item) {
    final ctrl = TextEditingController(
      text: item.precioObjetivo != null ? item.precioObjetivo!.toStringAsFixed(2) : '',
    );
    showDialog(
      context: context,
      builder: (ctx) {
        return AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
          title: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: _roseColor.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Icon(Icons.tune, color: _roseColor, size: 20),
              ),
              const SizedBox(width: 10),
              const Expanded(
                child: Text(
                  'Fijar Precio Meta',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                ),
              ),
            ],
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Define tu presupuesto ideal para "${item.nombre}". Te notificaremos inmediatamente si el precio baja a este monto o menos.',
                style: TextStyle(fontSize: 13, color: Colors.grey.shade600),
              ),
              const SizedBox(height: 16),
              TextField(
                controller: ctrl,
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
                decoration: InputDecoration(
                  prefixText: 'Bs ',
                  labelText: 'Monto meta deseado',
                  hintText: 'Ej. ${(item.precioActual * 0.85).toStringAsFixed(2)}',
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                ),
              ),
            ],
          ),
          actions: [
            if (item.precioObjetivo != null)
              TextButton(
                onPressed: () async {
                  Navigator.pop(ctx);
                  await context.read<WishlistService>().actualizarAlerta(
                        item.id,
                        limpiarPrecioObjetivo: true,
                      );
                  if (mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Precio meta eliminado.')),
                    );
                  }
                },
                child: const Text('Quitar meta', style: TextStyle(color: Colors.red)),
              ),
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('Cancelar'),
            ),
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: _roseColor,
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              ),
              onPressed: () async {
                final txt = ctrl.text.trim().replaceAll(',', '.');
                final nuevoValor = double.tryParse(txt);
                if (nuevoValor == null || nuevoValor <= 0) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Ingresa un monto válido mayor a 0.')),
                  );
                  return;
                }
                Navigator.pop(ctx);
                await context.read<WishlistService>().actualizarAlerta(
                      item.id,
                      precioObjetivo: nuevoValor,
                    );
                if (mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text('Meta fijada en Bs ${nuevoValor.toStringAsFixed(2)}. Te avisaremos al bajar.'),
                    ),
                  );
                }
              },
              child: const Text('Guardar'),
            ),
          ],
        );
      },
    );
  }

  Future<void> _moverAlCarrito(WishlistItem item) async {
    try {
      await context.read<WishlistService>().moverAlCarrito(item.id, mantenerEnDeseos: false);
      if (!mounted) return;

      // Sincronizar con el CartService local para que el contador de carrito se actualice
      try {
        final catalogo = CatalogoService();
        final prod = await catalogo.obtenerProductoPorId(item.productoId);
        if (prod != null && mounted) {
          context.read<CartService>().agregar(prod, cantidad: 1);
        }
      } catch (_) {}

      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('"${item.nombre}" se añadió al carrito.'),
          backgroundColor: _emeraldColor,
          action: SnackBarAction(
            label: 'Ver carrito',
            textColor: Colors.white,
            onPressed: () => Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => const CartScreen()),
            ),
          ),
        ),
      );
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('No se pudo mover al carrito: $e'), backgroundColor: Colors.red),
        );
      }
    }
  }

  void _abrirDetalle(int productoId) async {
    try {
      final catalogo = CatalogoService();
      final prod = await catalogo.obtenerProductoPorId(productoId);
      if (prod != null && mounted) {
        Navigator.push(
          context,
          MaterialPageRoute(builder: (_) => ProductDetailScreen(producto: prod)),
        );
      }
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    final wishlist = context.watch<WishlistService>();
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final cardBg = isDark ? const Color(0xFF1F2937) : Colors.white;
    final borderColor = isDark ? const Color(0xFF374151) : const Color(0xFFE5E7EB);

    final itemsConBaja = wishlist.items.where((it) => it.bajaPrecioDetectada).toList();

    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Lista de Deseos y Alertas',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
            ),
            Text(
              'CU30 · ${wishlist.totalDeseados} ${wishlist.totalDeseados == 1 ? "artículo" : "artículos"} guardados',
              style: TextStyle(fontSize: 11, color: isDark ? Colors.grey.shade400 : Colors.grey.shade600),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            tooltip: 'Actualizar',
            onPressed: () => wishlist.cargarWishlist(),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () => wishlist.cargarWishlist(),
        child: wishlist.cargando && wishlist.items.isEmpty
            ? const Center(child: CircularProgressIndicator())
            : wishlist.items.isEmpty
                ? _buildEmptyState(isDark)
                : ListView(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                    children: [
                      // Banner informativo si hay productos con rebajas
                      if (itemsConBaja.isNotEmpty)
                        Container(
                          margin: const EdgeInsets.only(bottom: 14),
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: _emeraldColor.withOpacity(isDark ? 0.2 : 0.1),
                            border: Border.all(color: _emeraldColor.withOpacity(0.4)),
                            borderRadius: BorderRadius.circular(14),
                          ),
                          child: Row(
                            children: [
                              Container(
                                padding: const EdgeInsets.all(6),
                                decoration: const BoxDecoration(
                                  color: _emeraldColor,
                                  shape: BoxShape.circle,
                                ),
                                child: const Icon(Icons.trending_down, color: Colors.white, size: 16),
                              ),
                              const SizedBox(width: 10),
                              Expanded(
                                child: Text(
                                  '¡Buenas noticias! Tienes ${itemsConBaja.length} ${itemsConBaja.length == 1 ? "producto" : "productos"} con rebaja de precio activa.',
                                  style: TextStyle(
                                    fontSize: 12.5,
                                    fontWeight: FontWeight.bold,
                                    color: isDark ? const Color(0xFFA7F3D0) : const Color(0xFF065F46),
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),

                      // Listado de productos
                      ...wishlist.items.map((it) => _buildCardItem(it, isDark, cardBg, borderColor)),
                      const SizedBox(height: 24),
                    ],
                  ),
      ),
    );
  }

  Widget _buildEmptyState(bool isDark) {
    return ListView(
      children: [
        SizedBox(height: MediaQuery.of(context).size.height * 0.18),
        Center(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 32),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Container(
                  padding: const EdgeInsets.all(22),
                  decoration: BoxDecoration(
                    color: _roseColor.withOpacity(0.1),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.favorite_border, size: 54, color: _roseColor),
                ),
                const SizedBox(height: 18),
                const Text(
                  'Tu lista de deseos está vacía',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 8),
                Text(
                  'Guarda los productos que te gusten presionando el corazón ❤️ en el catálogo. Te notificaremos en tiempo real cuando bajen de precio.',
                  style: TextStyle(fontSize: 13, color: Colors.grey.shade500),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 24),
                ElevatedButton.icon(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: _brandGold,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  ),
                  icon: const Icon(Icons.storefront_outlined, size: 18),
                  label: const Text('Explorar productos', style: TextStyle(fontWeight: FontWeight.bold)),
                  onPressed: () => Navigator.pop(context),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildCardItem(WishlistItem item, bool isDark, Color cardBg, Color borderColor) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: cardBg,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: borderColor),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(isDark ? 0.2 : 0.04),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Cabecera de la tarjeta: Empresa y botón eliminar
          Padding(
            padding: const EdgeInsets.fromLTRB(12, 10, 8, 4),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    Icon(Icons.storefront, size: 14, color: Colors.grey.shade500),
                    const SizedBox(width: 4),
                    Text(
                      item.empresaNombre.isNotEmpty ? item.empresaNombre : 'Tienda VecinoMarket',
                      style: TextStyle(fontSize: 11.5, color: Colors.grey.shade500, fontWeight: FontWeight.w600),
                    ),
                  ],
                ),
                IconButton(
                  icon: const Icon(Icons.delete_outline, size: 18, color: Colors.grey),
                  tooltip: 'Quitar de favoritos',
                  constraints: const BoxConstraints(),
                  padding: const EdgeInsets.all(4),
                  onPressed: () async {
                    await context.read<WishlistService>().toggleDeseo(item.productoId);
                    if (mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(content: Text('"${item.nombre}" se quitó de tu lista.')),
                      );
                    }
                  },
                ),
              ],
            ),
          ),

          // Cuerpo de la tarjeta: Imagen + Detalles + Precios
          InkWell(
            onTap: () => _abrirDetalle(item.productoId),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Imagen del producto
                  ClipRRect(
                    borderRadius: BorderRadius.circular(12),
                    child: SizedBox(
                      width: 80,
                      height: 80,
                      child: item.imagen.isNotEmpty
                          ? Image.network(
                              item.imagen,
                              fit: BoxFit.cover,
                              errorBuilder: (_, __, ___) => Container(
                                color: isDark ? Colors.grey.shade800 : Colors.grey.shade200,
                                child: const Icon(Icons.image_not_supported, size: 24, color: Colors.grey),
                              ),
                            )
                          : Container(
                              color: isDark ? Colors.grey.shade800 : Colors.grey.shade200,
                              child: const Icon(Icons.shopping_bag_outlined, size: 24, color: Colors.grey),
                            ),
                    ),
                  ),
                  const SizedBox(width: 12),

                  // Info y precios
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          item.nombre,
                          style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                        const SizedBox(height: 4),

                        // Badges de rebaja
                        Row(
                          children: [
                            if (item.bajaPrecioDetectada)
                              Container(
                                margin: const EdgeInsets.only(right: 6),
                                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                decoration: BoxDecoration(
                                  color: _emeraldColor.withOpacity(0.15),
                                  borderRadius: BorderRadius.circular(6),
                                ),
                                child: const Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Icon(Icons.trending_down, size: 12, color: _emeraldColor),
                                    SizedBox(width: 2),
                                    Text(
                                      '¡Bajó!',
                                      style: TextStyle(
                                        fontSize: 10,
                                        fontWeight: FontWeight.bold,
                                        color: _emeraldColor,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            if (item.porcentajeDescuento > 0)
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                decoration: BoxDecoration(
                                  color: _roseColor.withOpacity(0.15),
                                  borderRadius: BorderRadius.circular(6),
                                ),
                                child: Text(
                                  '-${item.porcentajeDescuento.toStringAsFixed(0)}%',
                                  style: const TextStyle(
                                    fontSize: 10,
                                    fontWeight: FontWeight.bold,
                                    color: _roseColor,
                                  ),
                                ),
                              ),
                          ],
                        ),
                        const SizedBox(height: 6),

                        // Precios
                        Row(
                          crossAxisAlignment: CrossAxisAlignment.baseline,
                          textBaseline: TextBaseline.alphabetic,
                          children: [
                            Text(
                              'Bs ${item.precioActual.toStringAsFixed(2)}',
                              style: const TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.w900,
                                color: _brandGold,
                              ),
                            ),
                            if (item.bajaPrecioDetectada || item.tieneDescuento) ...[
                              const SizedBox(width: 8),
                              Text(
                                'Bs ${item.precioAlGuardar.toStringAsFixed(2)}',
                                style: TextStyle(
                                  fontSize: 12,
                                  color: Colors.grey.shade500,
                                  decoration: TextDecoration.lineThrough,
                                ),
                              ),
                            ],
                          ],
                        ),

                        if (item.ahorro > 0)
                          Text(
                            'Ahorro: Bs ${item.ahorro.toStringAsFixed(2)}',
                            style: const TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.bold,
                              color: _emeraldColor,
                            ),
                          ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),

          const Divider(height: 12, thickness: 0.6),

          // Fila inferior de controles: Alertas, Fijar meta y Mover al carrito
          Padding(
            padding: const EdgeInsets.fromLTRB(12, 4, 12, 10),
            child: Column(
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    // Botón toggle alerta activa
                    InkWell(
                      borderRadius: BorderRadius.circular(8),
                      onTap: () async {
                        await context.read<WishlistService>().actualizarAlerta(
                              item.id,
                              notificarBajaPrecio: !item.notificarBajaPrecio,
                            );
                        if (mounted) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                              content: Text(
                                !item.notificarBajaPrecio
                                    ? 'Alertas activadas para este producto.'
                                    : 'Alertas silenciadas.',
                              ),
                            ),
                          );
                        }
                      },
                      child: Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 4),
                        child: Row(
                          children: [
                            Icon(
                              item.notificarBajaPrecio ? Icons.notifications_active : Icons.notifications_off_outlined,
                              size: 14,
                              color: item.notificarBajaPrecio ? _brandGold : Colors.grey,
                            ),
                            const SizedBox(width: 4),
                            Text(
                              item.notificarBajaPrecio ? 'Alerta activa' : 'Silenciada',
                              style: TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w600,
                                color: item.notificarBajaPrecio ? _brandGold : Colors.grey,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),

                    // Botón fijar / ver precio meta
                    InkWell(
                      borderRadius: BorderRadius.circular(8),
                      onTap: () => _mostrarDialogoPrecioMeta(item),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: item.precioObjetivo != null
                              ? _roseColor.withOpacity(0.12)
                              : Colors.grey.withOpacity(0.1),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Row(
                          children: [
                            Icon(
                              Icons.tune,
                              size: 13,
                              color: item.precioObjetivo != null ? _roseColor : Colors.grey.shade600,
                            ),
                            const SizedBox(width: 4),
                            Text(
                              item.precioObjetivo != null
                                  ? 'Meta: Bs ${item.precioObjetivo!.toStringAsFixed(2)}'
                                  : 'Fijar meta',
                              style: TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.bold,
                                color: item.precioObjetivo != null ? _roseColor : Colors.grey.shade700,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),

                // Botón Mover al Carrito
                SizedBox(
                  width: double.infinity,
                  height: 38,
                  child: ElevatedButton.icon(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: _brandGold,
                      foregroundColor: Colors.white,
                      elevation: 0,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                    icon: const Icon(Icons.shopping_cart_outlined, size: 16),
                    label: const Text('Mover al carrito', style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.bold)),
                    onPressed: () => _moverAlCarrito(item),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
