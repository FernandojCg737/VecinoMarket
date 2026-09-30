/// Misma forma que devuelve GET /api/inventario/sucursales/ (filtrado por
/// `?empresa=` -- SucursalAdminSerializer en el backend) -- usada en el
/// checkout para elegir dónde recoger el pedido (CU12, modalidad RECOJO_TIENDA).
class Sucursal {
  final int id;
  final String nombre;
  final String direccionTexto;
  final String telefono;

  Sucursal({
    required this.id,
    required this.nombre,
    required this.direccionTexto,
    required this.telefono,
  });

  factory Sucursal.fromJson(Map<String, dynamic> json) {
    return Sucursal(
      id: json['id'] as int,
      nombre: json['nombre'] as String,
      direccionTexto: json['direccion_texto'] as String? ?? '',
      telefono: json['telefono'] as String? ?? '',
    );
  }
}
