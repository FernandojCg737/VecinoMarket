import 'package:collection/collection.dart';
import 'package:flutter/foundation.dart';
import '../models/producto.dart';

class ItemCarrito {
  ItemCarrito({required this.producto, this.cantidad = 1});
  final Producto producto;
  int cantidad;

  double get precioUnitario => producto.tieneDescuento ? producto.precioDescuento! : producto.precio;
  double get subtotal => precioUnitario * cantidad;
}

/// Carrito en memoria por sesión de app, mismo rol que CartContext.jsx en la
/// web (ahí persiste en localStorage; acá no hace falta para esta primera
/// versión, se puede agregar con shared_preferences más adelante).
class CartService extends ChangeNotifier {
  final List<ItemCarrito> _items = [];
  List<ItemCarrito> get items => List.unmodifiable(_items);

  int get totalItems => _items.fold(0, (acc, it) => acc + it.cantidad);
  double get subtotal => _items.fold(0, (acc, it) => acc + it.subtotal);

  void agregar(Producto producto, {int cantidad = 1}) {
    final existente = _items.where((it) => it.producto.id == producto.id).firstOrNull;
    if (existente != null) {
      existente.cantidad += cantidad;
    } else {
      _items.add(ItemCarrito(producto: producto, cantidad: cantidad));
    }
    notifyListeners();
  }

  void actualizarCantidad(int productoId, int cantidad) {
    if (cantidad < 1) return;
    final item = _items.where((it) => it.producto.id == productoId).firstOrNull;
    if (item != null) {
      item.cantidad = cantidad;
      notifyListeners();
    }
  }

  void quitar(int productoId) {
    _items.removeWhere((it) => it.producto.id == productoId);
    notifyListeners();
  }

  void vaciar() {
    _items.clear();
    notifyListeners();
  }
}
