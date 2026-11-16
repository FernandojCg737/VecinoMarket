import 'package:flutter/foundation.dart';
import '../models/wishlist_item.dart';
import 'api_client.dart';

/// Servicio de gestión de Lista de Deseos y Alertas de Precio (CU30) para Flutter.
/// Se sincroniza en tiempo real con los endpoints /api/pedidos/wishlist/ del backend Django.
class WishlistService extends ChangeNotifier {
  final List<WishlistItem> _items = [];
  final Set<int> _wishlistProductIds = {};
  bool _cargando = false;
  String? _error;

  List<WishlistItem> get items => List.unmodifiable(_items);
  Set<int> get wishlistProductIds => Set.unmodifiable(_wishlistProductIds);
  bool get cargando => _cargando;
  String? get error => _error;
  int get totalDeseados => _items.length;

  bool esDeseado(int productoId) => _wishlistProductIds.contains(productoId);

  /// Carga la lista completa de productos deseados con sus cálculos de ahorro y alertas
  Future<void> cargarWishlist() async {
    _cargando = true;
    _error = null;
    notifyListeners();

    try {
      final res = await ApiClient.instance.get('pedidos/wishlist/', autenticado: true);
      if (res is Map<String, dynamic> && res['items'] is List) {
        _items.clear();
        _wishlistProductIds.clear();
        for (final json in res['items']) {
          final item = WishlistItem.fromJson(json as Map<String, dynamic>);
          _items.add(item);
          _wishlistProductIds.add(item.productoId);
        }
      }
    } on ApiException catch (e) {
      _error = e.mensaje;
    } catch (e) {
      _error = 'Error cargando lista de deseos: $e';
    } finally {
      _cargando = false;
      notifyListeners();
    }
  }

  /// Carga liviana solo de los IDs deseados para pintar los corazones rápidamente en catálogo
  Future<void> cargarIds() async {
    try {
      final res = await ApiClient.instance.get('pedidos/wishlist/ids/', autenticado: true);
      if (res is Map<String, dynamic> && res['ids'] is List) {
        _wishlistProductIds.clear();
        for (final id in res['ids']) {
          if (id is int) _wishlistProductIds.add(id);
        }
        notifyListeners();
      }
    } catch (_) {
      // Si falla o no está logueado, se ignora silenciosamente
    }
  }

  /// Alterna un producto en la lista de deseos (agrega o elimina)
  Future<Map<String, dynamic>?> toggleDeseo(int productoId) async {
    try {
      final res = await ApiClient.instance.post(
        'pedidos/wishlist/toggle/',
        {'producto_id': productoId},
        autenticado: true,
      );

      if (res is Map<String, dynamic>) {
        final enDeseos = res['agregado'] == true || res['en_deseos'] == true;
        if (enDeseos) {
          _wishlistProductIds.add(productoId);
        } else {
          _wishlistProductIds.remove(productoId);
          _items.removeWhere((it) => it.productoId == productoId);
        }
        notifyListeners();
        // Recargar la lista completa en segundo plano para mantener cálculos de precios actualizados
        cargarWishlist();
        return res;
      }
    } on ApiException catch (e) {
      _error = e.mensaje;
      notifyListeners();
      rethrow;
    } catch (e) {
      _error = 'Error al modificar favoritos: $e';
      notifyListeners();
      rethrow;
    }
    return null;
  }

  /// Actualiza los parámetros de alerta de un ítem (precio meta o toggle de alertas)
  Future<bool> actualizarAlerta(
    int itemId, {
    double? precioObjetivo,
    bool? notificarBajaPrecio,
    bool limpiarPrecioObjetivo = false,
  }) async {
    try {
      final Map<String, dynamic> body = {};
      if (limpiarPrecioObjetivo) {
        body['precio_objetivo'] = '';
      } else if (precioObjetivo != null) {
        body['precio_objetivo'] = precioObjetivo;
      }
      if (notificarBajaPrecio != null) {
        body['notificar_baja_precio'] = notificarBajaPrecio;
      }

      final res = await ApiClient.instance.patch(
        'pedidos/wishlist/$itemId/alerta/',
        body,
        autenticado: true,
      );

      if (res is Map<String, dynamic>) {
        await cargarWishlist();
        return true;
      }
    } on ApiException catch (e) {
      _error = e.mensaje;
      notifyListeners();
      rethrow;
    } catch (e) {
      _error = 'Error al actualizar alerta: $e';
      notifyListeners();
      rethrow;
    }
    return false;
  }

  /// Mueve un producto desde la lista de deseos al carrito activo
  Future<Map<String, dynamic>?> moverAlCarrito(
    int itemId, {
    bool mantenerEnDeseos = false,
  }) async {
    try {
      final res = await ApiClient.instance.post(
        'pedidos/wishlist/$itemId/mover-al-carrito/',
        {'mantener_en_deseos': mantenerEnDeseos},
        autenticado: true,
      );

      if (res is Map<String, dynamic>) {
        if (!mantenerEnDeseos) {
          _items.removeWhere((it) => it.id == itemId);
          notifyListeners();
        }
        await cargarWishlist();
        return res;
      }
    } on ApiException catch (e) {
      _error = e.mensaje;
      notifyListeners();
      rethrow;
    } catch (e) {
      _error = 'Error al mover al carrito: $e';
      notifyListeners();
      rethrow;
    }
    return null;
  }

  /// Limpia el estado en memoria al cerrar sesión
  void limpiar() {
    _items.clear();
    _wishlistProductIds.clear();
    _error = null;
    _cargando = false;
    notifyListeners();
  }
}

