/// Misma forma que devuelve GET /api/pedidos/mis-compras/ (PedidoSerializer
/// en el backend, ver apps/pedidos/serializers.py) -- CU26, historial de
/// compras pagadas del comprador.
class PedidoItem {
  final int id;
  final String productoNombre;
  final int cantidad;
  final double precioUnitario;
  final double subtotal;

  PedidoItem({
    required this.id,
    required this.productoNombre,
    required this.cantidad,
    required this.precioUnitario,
    required this.subtotal,
  });

  factory PedidoItem.fromJson(Map<String, dynamic> json) {
    return PedidoItem(
      id: json['id'] as int,
      productoNombre: json['producto_nombre'] as String? ?? '',
      cantidad: json['cantidad'] as int,
      precioUnitario: double.parse(json['precio_unitario'].toString()),
      subtotal: double.parse(json['subtotal'].toString()),
    );
  }
}

class Pedido {
  final int id;
  final String numeroPedido;
  final String empresaNombre;
  final double subtotal;
  final String estado;
  final String modalidadEntrega;
  final String estadoPago;
  final String metodoPago;
  final DateTime fecha;
  final List<PedidoItem> items;

  Pedido({
    required this.id,
    required this.numeroPedido,
    required this.empresaNombre,
    required this.subtotal,
    required this.estado,
    required this.modalidadEntrega,
    required this.estadoPago,
    required this.metodoPago,
    required this.fecha,
    this.items = const [],
  });

  factory Pedido.fromJson(Map<String, dynamic> json) {
    final itemsJson = json['items'] as List<dynamic>? ?? [];
    return Pedido(
      id: json['id'] as int,
      numeroPedido: json['numero_pedido'] as String? ?? '',
      empresaNombre: json['empresa_nombre'] as String? ?? '',
      subtotal: double.parse(json['subtotal'].toString()),
      estado: json['estado'] as String? ?? '',
      modalidadEntrega: json['modalidad_entrega'] as String? ?? '',
      estadoPago: json['estado_pago'] as String? ?? '',
      metodoPago: json['metodo_pago'] as String? ?? 'Desconocido',
      fecha: DateTime.parse(json['fecha'] as String),
      items: itemsJson.map((it) => PedidoItem.fromJson(it as Map<String, dynamic>)).toList(),
    );
  }
}
