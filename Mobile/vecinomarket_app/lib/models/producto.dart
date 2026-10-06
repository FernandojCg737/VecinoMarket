/// Misma forma que devuelve GET /api/catalogo/productos/ (ver
/// apps/catalogo/serializers.py en el backend) — sin adaptar, a diferencia
/// del frontend web, porque acá no hay componentes viejos que dependan de
/// una forma "mock" distinta.
class Producto {
  final int id;
  final String nombre;
  final String descripcion;
  final double precio;
  final double? precioDescuento;
  final int stock;
  final String? categoriaNombre;
  final int empresaId;
  final String empresaNombre;
  final String empresaCiudad;
  final String? empresaLogoUrl;
  final List<String> imagenes;

  Producto({
    required this.id,
    required this.nombre,
    required this.descripcion,
    required this.precio,
    this.precioDescuento,
    required this.stock,
    this.categoriaNombre,
    required this.empresaId,
    required this.empresaNombre,
    this.empresaCiudad = 'Bolivia',
    this.empresaLogoUrl,
    this.imagenes = const [],
  });

  bool get tieneDescuento => precioDescuento != null;

  /// Primera foto (usada en la tarjeta del catálogo, donde solo entra una).
  String? get imagenUrl => imagenes.isNotEmpty ? imagenes.first : null;

  factory Producto.fromJson(Map<String, dynamic> json) {
    final imagenesJson = json['imagenes'] as List<dynamic>? ?? [];
    return Producto(
      id: json['id'] as int,
      nombre: json['nombre'] as String,
      descripcion: json['descripcion'] as String? ?? '',
      precio: double.parse(json['precio'].toString()),
      precioDescuento: json['precio_descuento'] != null
          ? double.parse(json['precio_descuento'].toString())
          : null,
      stock: json['stock'] as int? ?? 0,
      categoriaNombre: json['categoria']?['nombre'] as String?,
      empresaId: json['empresa']?['id'] as int? ?? 0,
      empresaNombre: json['empresa']?['razon_social'] as String? ?? '',
      empresaCiudad: json['empresa']?['ciudad'] as String? ?? 'Bolivia',
      empresaLogoUrl: json['empresa']?['logo_url'] as String?,
      imagenes: imagenesJson
          .map((img) => img['url'] as String?)
          .whereType<String>()
          .toList(),
    );
  }
}
