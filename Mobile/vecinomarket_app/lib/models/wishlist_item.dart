/// Modelo de ítem de Lista de Deseos (CU30) en VecinoMarket.
/// Mapea la respuesta serializada de GET /api/pedidos/wishlist/ del backend Django.
class WishlistItem {
  final int id;
  final int productoId;
  final String nombre;
  final String descripcion;
  final String imagen;
  final int empresaId;
  final String empresaNombre;
  final double precioAlGuardar;
  final double precioActual;
  final double precioOriginal;
  final bool tieneDescuento;
  final bool bajaPrecioDetectada;
  final double porcentajeDescuento;
  final bool notificarBajaPrecio;
  final double? precioObjetivo;
  final double ahorro;
  final bool disponible;
  final int stockDisponible;
  final DateTime? creadoEn;

  WishlistItem({
    required this.id,
    required this.productoId,
    required this.nombre,
    this.descripcion = '',
    this.imagen = '',
    required this.empresaId,
    this.empresaNombre = '',
    required this.precioAlGuardar,
    required this.precioActual,
    required this.precioOriginal,
    this.tieneDescuento = false,
    this.bajaPrecioDetectada = false,
    this.porcentajeDescuento = 0.0,
    this.notificarBajaPrecio = true,
    this.precioObjetivo,
    this.ahorro = 0.0,
    this.disponible = true,
    this.stockDisponible = 0,
    this.creadoEn,
  });

  factory WishlistItem.fromJson(Map<String, dynamic> json) {
    return WishlistItem(
      id: json['id'] as int? ?? 0,
      productoId: json['producto_id'] as int? ?? 0,
      nombre: json['nombre'] as String? ?? '',
      descripcion: json['descripcion'] as String? ?? '',
      imagen: json['imagen'] as String? ?? '',
      empresaId: json['empresa_id'] as int? ?? 0,
      empresaNombre: json['empresa_nombre'] as String? ?? '',
      precioAlGuardar: (json['precio_al_guardar'] is num)
          ? (json['precio_al_guardar'] as num).toDouble()
          : double.tryParse('${json['precio_al_guardar']}') ?? 0.0,
      precioActual: (json['precio_actual'] is num)
          ? (json['precio_actual'] as num).toDouble()
          : double.tryParse('${json['precio_actual']}') ?? 0.0,
      precioOriginal: (json['precio_original'] is num)
          ? (json['precio_original'] as num).toDouble()
          : double.tryParse('${json['precio_original']}') ?? 0.0,
      tieneDescuento: json['tiene_descuento'] == true,
      bajaPrecioDetectada: json['baja_precio_detectada'] == true,
      porcentajeDescuento: (json['porcentaje_descuento'] is num)
          ? (json['porcentaje_descuento'] as num).toDouble()
          : double.tryParse('${json['porcentaje_descuento']}') ?? 0.0,
      notificarBajaPrecio: json['notificar_baja_precio'] != false,
      precioObjetivo: json['precio_objetivo'] != null
          ? ((json['precio_objetivo'] is num)
              ? (json['precio_objetivo'] as num).toDouble()
              : double.tryParse('${json['precio_objetivo']}'))
          : null,
      ahorro: (json['ahorro'] is num)
          ? (json['ahorro'] as num).toDouble()
          : double.tryParse('${json['ahorro']}') ?? 0.0,
      disponible: json['disponible'] != false,
      stockDisponible: json['stock_disponible'] as int? ?? 0,
      creadoEn: json['creado_en'] != null ? DateTime.tryParse('${json['creado_en']}') : null,
    );
  }
}

