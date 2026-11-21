import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/recomendacion_ia.dart';
import '../screens/buyer/buyer_nearby_screen.dart';
import '../screens/buyer/buyer_recommendations_screen.dart';
import '../services/auth_service.dart';
import '../services/ia_service.dart';
import 'tarjeta_producto.dart';

const _brand = Color(0xFFD97706); // mismo dorado que el resto de pantallas

String? notaReputacion(ProductoRecomendado r) =>
    r.empresaReputacion != null ? '★ ${formatoDecimal(r.empresaReputacion!)} · tienda' : null;

Widget _titulo(BuildContext context, IconData icono, String texto, {String? accion, VoidCallback? onAccion}) {
  return Padding(
    padding: const EdgeInsets.fromLTRB(16, 12, 8, 6),
    child: Row(
      children: [
        Icon(icono, size: 20, color: _brand),
        const SizedBox(width: 6),
        Expanded(child: Text(texto, style: const TextStyle(fontSize: 17, fontWeight: FontWeight.bold))),
        if (accion != null) TextButton(onPressed: onAccion, child: Text(accion)),
      ],
    ),
  );
}

/// CU1 (RF44) en el Home: "Para ti" o, sin historial / invitado, "Lo más vendido".
class SeccionParaTi extends StatefulWidget {
  const SeccionParaTi({super.key});

  @override
  State<SeccionParaTi> createState() => _SeccionParaTiState();
}

class _SeccionParaTiState extends State<SeccionParaTi> {
  ListaRecomendada? _datos;
  Object? _cargadoPara = const Object(); // usuario para el que se pidió (null = invitado)

  void _cargar() {
    IaService().recomendaciones(limite: 8).then((d) {
      if (mounted) setState(() => _datos = d);
    }).catchError((_) {});
  }

  @override
  Widget build(BuildContext context) {
    final usuario = context.watch<AuthService>().usuario;
    // El Home sigue vivo debajo del login: al entrar o salir de una cuenta
    // se vuelve a pedir (invitado = "Lo más vendido"; comprador = "Para ti").
    final clave = usuario?['id'];
    if (clave != _cargadoPara) {
      _cargadoPara = clave;
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) _cargar();
      });
    }
    final datos = _datos;
    if (datos == null || datos.productos.isEmpty) return const SizedBox.shrink();
    final comprador = usuario?['rol'] == 'COMPRADOR';
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _titulo(
          context,
          datos.esPopular ? Icons.trending_up : Icons.auto_awesome,
          datos.esPopular ? 'Lo más vendido' : 'Para ti',
          accion: comprador ? 'Ver todos' : null,
          onAccion: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const BuyerRecommendationsScreen())),
        ),
        CarruselProductos(
          tarjetas: [
            for (final r in datos.productos)
              TarjetaProducto(
                producto: r.producto,
                insignia: datos.esPopular ? null : 'Para ti',
                iconoInsignia: Icons.auto_awesome,
                nota: notaReputacion(r),
              ),
          ],
        ),
      ],
    );
  }
}

/// CU2 (RF45) en el Home. No pide el GPS al abrir la app: el comprador ve lo
/// cercano a su ubicación guardada; si no la tiene (o es invitado) aparece
/// una invitación a "Cerca de ti", que es donde se pide el GPS.
class SeccionCercaDeTi extends StatefulWidget {
  const SeccionCercaDeTi({super.key});

  @override
  State<SeccionCercaDeTi> createState() => _SeccionCercaDeTiState();
}

class _SeccionCercaDeTiState extends State<SeccionCercaDeTi> {
  ResultadoCercanos? _datos;
  bool _sinDatos = false;
  Object? _cargadoPara; // id del comprador para el que se pidió

  void _cargar() {
    IaService().cercanos(radioKm: 5, limite: 8).then((d) {
      if (mounted) setState(() => _datos = d);
    }).catchError((_) {
      if (mounted) setState(() => _sinDatos = true);
    });
  }

  void _abrirCercaDeTi() =>
      Navigator.push(context, MaterialPageRoute(builder: (_) => const BuyerNearbyScreen()));

  @override
  Widget build(BuildContext context) {
    final usuario = context.watch<AuthService>().usuario;
    final comprador = usuario?['rol'] == 'COMPRADOR';
    // Igual que las notificaciones en home_screen: se pide tras el primer
    // frame, una vez por comprador (si cambia la cuenta, se vuelve a pedir).
    if (comprador && usuario?['id'] != _cargadoPara) {
      _cargadoPara = usuario?['id'];
      _datos = null;
      _sinDatos = false;
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) _cargar();
      });
    }

    final datos = _datos;
    if (comprador && datos == null && !_sinDatos) return const SizedBox.shrink();

    if (!comprador || _sinDatos || datos!.productos.isEmpty) {
      final isDark = Theme.of(context).brightness == Brightness.dark;
      return Padding(
        padding: const EdgeInsets.fromLTRB(12, 12, 12, 4),
        child: Material(
          color: isDark ? const Color(0xFF1F2937) : Colors.white,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(14),
            side: BorderSide(color: isDark ? const Color(0xFF374151) : const Color(0xFFE5E7EB)),
          ),
          child: ListTile(
            onTap: _abrirCercaDeTi,
            leading: Container(
              width: 42,
              height: 42,
              decoration: BoxDecoration(
                color: isDark ? const Color(0xFF111827) : const Color(0xFFFFFAF0),
                borderRadius: BorderRadius.circular(10),
              ),
              child: const Icon(Icons.location_on_outlined, color: _brand),
            ),
            title: const Text('Descubre emprendedores cerca de ti', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
            subtitle: const Text('Productos con stock a 2, 5 o 10 km', style: TextStyle(fontSize: 12)),
            trailing: const Icon(Icons.chevron_right),
          ),
        ),
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _titulo(context, Icons.location_on_outlined, 'Cerca de ti', accion: 'Ver mapa', onAccion: _abrirCercaDeTi),
        CarruselProductos(
          tarjetas: [
            for (final p in datos.productos)
              TarjetaProducto(
                producto: p.producto,
                insignia: formatoKm(p.distanciaKm),
                iconoInsignia: Icons.location_on_outlined,
                nota: p.sucursal.direccion.isNotEmpty ? p.sucursal.direccion : p.sucursal.nombre,
              ),
          ],
        ),
      ],
    );
  }
}

/// CU1 (RF44): "Productos similares" en el detalle de un producto. Si no hay
/// similares (o falla), la sección no aparece.
class SeccionSimilares extends StatefulWidget {
  const SeccionSimilares({super.key, required this.productoId});
  final int productoId;

  @override
  State<SeccionSimilares> createState() => _SeccionSimilaresState();
}

class _SeccionSimilaresState extends State<SeccionSimilares> {
  ListaRecomendada? _datos;

  @override
  void initState() {
    super.initState();
    IaService().similares(widget.productoId, limite: 8).then((d) {
      if (mounted) setState(() => _datos = d);
    }).catchError((_) {});
  }

  @override
  Widget build(BuildContext context) {
    final datos = _datos;
    if (datos == null || datos.productos.isEmpty) return const SizedBox.shrink();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _titulo(context, Icons.auto_awesome, 'Productos similares'),
        CarruselProductos(
          tarjetas: [for (final r in datos.productos) TarjetaProducto(producto: r.producto, nota: notaReputacion(r))],
        ),
      ],
    );
  }
}
