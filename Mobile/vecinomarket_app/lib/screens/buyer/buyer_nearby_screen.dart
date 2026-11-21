import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:geolocator/geolocator.dart';
import 'package:latlong2/latlong.dart';
import 'package:provider/provider.dart';
import '../../models/recomendacion_ia.dart';
import '../../services/auth_service.dart';
import '../../services/ia_service.dart';
import '../../widgets/tarjeta_producto.dart';
import '../auth_screen.dart';
import '../company_catalog_screen.dart';
import 'buyer_addresses_screen.dart';

/// CU2 (RF45): productos y emprendedores cercanos en tiempo real. Usa el GPS
/// (geolocator); si no hay permiso o falla, el backend usa la ubicación
/// guardada del comprador (o su dirección predeterminada).
class BuyerNearbyScreen extends StatefulWidget {
  const BuyerNearbyScreen({super.key});

  @override
  State<BuyerNearbyScreen> createState() => _BuyerNearbyScreenState();
}

class _BuyerNearbyScreenState extends State<BuyerNearbyScreen> {
  static const _radios = [2.0, 5.0, 10.0];
  static const _brand = Color(0xFFD97706);
  static const _pin = Color(0xFFE09B06); // brand-500, mismo pin que la web
  static const _pinBorde = Color(0xFF815903); // brand-800
  static const _azul = Color(0xFF2563EB);

  final _ia = IaService();
  final _mapa = MapController();
  bool _mapaListo = false;

  double _radioKm = 5;
  LatLng? _gps;
  bool _buscandoGps = true;
  bool _cargando = true;
  bool _sinUbicacion = false;
  String? _error;
  ResultadoCercanos? _datos;

  @override
  void initState() {
    super.initState();
    _usarGps();
  }

  /// Igual que en "Mis direcciones": servicio activo + permiso + posición.
  /// Si algo falla devuelve null (y se usa la ubicación guardada).
  Future<LatLng?> _leerGps() async {
    try {
      if (!await Geolocator.isLocationServiceEnabled()) return null;
      var permiso = await Geolocator.checkPermission();
      if (permiso == LocationPermission.denied) permiso = await Geolocator.requestPermission();
      if (permiso == LocationPermission.denied || permiso == LocationPermission.deniedForever) return null;
      final pos = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(accuracy: LocationAccuracy.high, timeLimit: Duration(seconds: 10)),
      );
      return LatLng(pos.latitude, pos.longitude);
    } catch (_) {
      return null;
    }
  }

  Future<void> _usarGps() async {
    setState(() => _buscandoGps = true);
    final coords = await _leerGps();
    if (!mounted) return;
    setState(() {
      _gps = coords;
      _buscandoGps = false;
    });
    if (coords == null && _datos != null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('No se pudo obtener tu ubicación. Usamos tu dirección guardada.')),
      );
    }
    await _cargar();
  }

  Future<void> _cargar() async {
    setState(() {
      _cargando = true;
      _error = null;
    });
    try {
      final datos = await _ia.cercanos(lat: _gps?.latitude, lng: _gps?.longitude, radioKm: _radioKm);
      if (!mounted) return;
      setState(() {
        _datos = datos;
        _sinUbicacion = false;
        _cargando = false;
      });
      _encuadrar();
    } on SinUbicacionException {
      if (mounted) {
        setState(() {
          _sinUbicacion = true;
          _cargando = false;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _error = 'No se pudo cargar lo que hay cerca de ti.';
          _cargando = false;
        });
      }
    }
  }

  /// Bordes del círculo del radio (en grados) para encuadrar el mapa.
  LatLngBounds _limites(LatLng centro, double radioKm) {
    final dLat = radioKm / 111.0;
    final dLng = radioKm / (111.0 * math.cos(centro.latitude * math.pi / 180));
    return LatLngBounds(
      LatLng(centro.latitude - dLat, centro.longitude - dLng),
      LatLng(centro.latitude + dLat, centro.longitude + dLng),
    );
  }

  void _encuadrar() {
    final d = _datos;
    if (d == null || !_mapaListo) return;
    _mapa.fitCamera(CameraFit.bounds(bounds: _limites(LatLng(d.lat, d.lng), _radioKm), padding: const EdgeInsets.all(18)));
  }

  void _cambiarRadio(double r) {
    if (r == _radioKm) return;
    setState(() => _radioKm = r);
    _cargar();
  }

  void _abrirEmprendedor(EmprendedorCercano e) => Navigator.push(
        context,
        MaterialPageRoute(
          builder: (_) => CompanyCatalogScreen(empresaId: e.empresaId, empresaNombre: e.razonSocial, empresaCiudad: e.ciudad),
        ),
      );

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final bgColor = isDark ? const Color(0xFF111827) : Colors.white;

    return Scaffold(
      backgroundColor: bgColor,
      appBar: AppBar(
        title: const Text('Cerca de ti', style: TextStyle(fontWeight: FontWeight.bold)),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 10),
            child: ActionChip(
              avatar: _buscandoGps
                  ? const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2))
                  : const Icon(Icons.near_me_outlined, size: 16, color: _azul),
              label: Text(_datos?.usaGps == true ? 'GPS' : 'Usar GPS', style: const TextStyle(color: _azul, fontWeight: FontWeight.w600)),
              backgroundColor: isDark ? const Color(0xFF1E293B) : const Color(0xFFEFF6FF),
              side: BorderSide.none,
              shape: const StadiumBorder(),
              onPressed: _buscandoGps ? null : _usarGps,
            ),
          ),
        ],
      ),
      body: _buscandoGps && _datos == null
          ? const Center(child: Column(mainAxisSize: MainAxisSize.min, children: [
              CircularProgressIndicator(),
              SizedBox(height: 12),
              Text('Buscando tu ubicación...'),
            ]))
          : _sinUbicacion
              ? _buildSinUbicacion(isDark)
              : _datos == null
                  ? _buildErrorOCargando()
                  : Column(
                      children: [
                        SizedBox(height: MediaQuery.of(context).size.height * 0.38, child: _buildMapa(isDark)),
                        Expanded(child: _buildHoja(isDark, bgColor)),
                      ],
                    ),
    );
  }

  Widget _buildErrorOCargando() {
    if (_error == null) return const Center(child: CircularProgressIndicator());
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.error_outline, size: 48, color: Colors.redAccent),
          const SizedBox(height: 12),
          Text(_error!),
          const SizedBox(height: 12),
          FilledButton(onPressed: _cargar, child: const Text('Reintentar')),
        ],
      ),
    );
  }

  Widget _buildSinUbicacion(bool isDark) {
    final logueado = context.watch<AuthService>().usuario != null;
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(28),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 72,
              height: 72,
              decoration: BoxDecoration(
                color: isDark ? const Color(0xFF1F2937) : const Color(0xFFF3F4F6),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.location_off_outlined, size: 36, color: Colors.grey),
            ),
            const SizedBox(height: 16),
            const Text('Necesitamos tu ubicación', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            Text(
              logueado
                  ? 'Activa el GPS de tu celular o registra una dirección predeterminada para ver qué hay cerca de ti.'
                  : 'Activa el GPS de tu celular o inicia sesión con una cuenta que tenga una dirección guardada.',
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 13, color: Colors.grey),
            ),
            const SizedBox(height: 18),
            ElevatedButton.icon(
              style: ElevatedButton.styleFrom(backgroundColor: _brand, foregroundColor: Colors.white),
              icon: const Icon(Icons.near_me_outlined, size: 16),
              label: const Text('Usar mi ubicación'),
              onPressed: _usarGps,
            ),
            TextButton(
              onPressed: () => Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => logueado ? const BuyerAddressesScreen() : const AuthScreen()),
              ),
              child: Text(logueado ? 'Mis direcciones' : 'Iniciar sesión'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildMapa(bool isDark) {
    final d = _datos!;
    final centro = LatLng(d.lat, d.lng);
    return Stack(
      children: [
        FlutterMap(
          mapController: _mapa,
          options: MapOptions(
            initialCameraFit: CameraFit.bounds(bounds: _limites(centro, _radioKm), padding: const EdgeInsets.all(18)),
            onMapReady: () => _mapaListo = true,
            interactionOptions: const InteractionOptions(flags: InteractiveFlag.all & ~InteractiveFlag.rotate),
          ),
          children: [
            TileLayer(
              urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
              userAgentPackageName: 'com.vecinomarket.vecinomarket_app',
            ),
            CircleLayer(circles: [
              CircleMarker(
                point: centro,
                radius: _radioKm * 1000,
                useRadiusInMeter: true,
                color: _azul.withValues(alpha: 0.12),
                borderColor: _azul.withValues(alpha: 0.6),
                borderStrokeWidth: 1,
              ),
            ]),
            MarkerLayer(markers: [
              for (final e in d.emprendedores)
                for (final s in e.sucursales)
                  Marker(
                    point: LatLng(s.lat, s.lng),
                    width: 34,
                    height: 34,
                    alignment: Alignment.topCenter,
                    child: GestureDetector(
                      onTap: () => _abrirEmprendedor(e),
                      child: Tooltip(
                        message: '${e.razonSocial} · ${formatoKm(s.distanciaKm)}',
                        child: const Stack(
                          alignment: Alignment.center,
                          children: [
                            Icon(Icons.location_on, size: 34, color: _pinBorde),
                            Icon(Icons.location_on, size: 29, color: _pin),
                          ],
                        ),
                      ),
                    ),
                  ),
              Marker(
                point: centro,
                width: 20,
                height: 20,
                child: Container(
                  decoration: BoxDecoration(
                    color: _azul,
                    shape: BoxShape.circle,
                    border: Border.all(color: Colors.white, width: 3),
                    boxShadow: const [BoxShadow(color: Color(0x40000000), blurRadius: 4)],
                  ),
                ),
              ),
            ]),
          ],
        ),
        Positioned(
          left: 12,
          bottom: 12,
          child: Row(
            children: [
              for (final r in _radios)
                Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: ChoiceChip(
                    label: Text('${r.toInt()} km'),
                    selected: r == _radioKm,
                    onSelected: (_) => _cambiarRadio(r),
                    selectedColor: isDark ? const Color(0xFF1F2937) : const Color(0xFFFFFAF0),
                    backgroundColor: isDark ? const Color(0xFF111827) : Colors.white,
                    side: BorderSide(color: r == _radioKm ? _brand : (isDark ? const Color(0xFF374151) : const Color(0xFFE5E7EB))),
                    labelStyle: TextStyle(color: r == _radioKm ? _brand : null, fontWeight: FontWeight.w600),
                    showCheckmark: false,
                    shape: const StadiumBorder(),
                  ),
                ),
            ],
          ),
        ),
        if (_cargando)
          const Positioned(top: 10, right: 10, child: SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2.5))),
      ],
    );
  }

  Widget _buildHoja(bool isDark, Color bgColor) {
    final d = _datos!;
    final borderColor = isDark ? const Color(0xFF374151) : const Color(0xFFE5E7EB);
    return Container(
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
        boxShadow: const [BoxShadow(color: Color(0x1A000000), blurRadius: 8, offset: Offset(0, -2))],
      ),
      child: RefreshIndicator(
        onRefresh: _cargar,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 10, 16, 24),
          children: [
            Center(
              child: Container(width: 40, height: 4, decoration: BoxDecoration(color: borderColor, borderRadius: BorderRadius.circular(2))),
            ),
            if (!d.usaGps)
              Padding(
                padding: const EdgeInsets.only(top: 10),
                child: Text('Usando tu dirección guardada', style: TextStyle(fontSize: 12, color: Colors.grey.shade600)),
              ),
            const SizedBox(height: 12),
            const Text('Emprendedores cercanos', style: TextStyle(fontSize: 17, fontWeight: FontWeight.bold)),
            const SizedBox(height: 10),
            if (d.emprendedores.isEmpty)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 20),
                child: Text(
                  'No hay emprendedores en ${_radioKm.toInt()} km. Prueba un radio mayor.',
                  textAlign: TextAlign.center,
                  style: const TextStyle(color: Colors.grey),
                ),
              )
            else
              for (final e in d.emprendedores) _buildEmprendedor(e, isDark, borderColor),
            const SizedBox(height: 16),
            const Text('Productos cerca', style: TextStyle(fontSize: 17, fontWeight: FontWeight.bold)),
            const SizedBox(height: 10),
            if (d.productos.isEmpty)
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 20),
                child: Text('No encontramos productos con stock en este radio.', textAlign: TextAlign.center, style: TextStyle(color: Colors.grey)),
              )
            else
              Transform.translate(
                offset: const Offset(-12, 0), // el carrusel trae su propio margen lateral
                child: CarruselProductos(
                  tarjetas: [
                    for (final p in d.productos)
                      TarjetaProducto(
                        producto: p.producto,
                        insignia: formatoKm(p.distanciaKm),
                        iconoInsignia: Icons.location_on_outlined,
                        nota: p.sucursal.direccion.isNotEmpty ? p.sucursal.direccion : p.sucursal.nombre,
                      ),
                  ],
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildEmprendedor(EmprendedorCercano e, bool isDark, Color borderColor) {
    final detalle = [
      if (e.categoriaPrincipal != null) e.categoriaPrincipal!,
      if (e.reputacion != null) '★ ${formatoDecimal(e.reputacion!)}',
    ].join(' · ');
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: InkWell(
        onTap: () => _abrirEmprendedor(e),
        borderRadius: BorderRadius.circular(16),
        child: Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: isDark ? const Color(0xFF1F2937) : Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: borderColor),
          ),
          child: Row(
            children: [
              Container(
                width: 46,
                height: 46,
                decoration: BoxDecoration(
                  color: isDark ? const Color(0xFF111827) : const Color(0xFFFFFAF0),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Icon(Icons.storefront_outlined, color: _brand),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(e.razonSocial, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15), maxLines: 1, overflow: TextOverflow.ellipsis),
                    if (detalle.isNotEmpty)
                      Text(detalle, style: const TextStyle(fontSize: 12.5, color: Colors.grey), maxLines: 1, overflow: TextOverflow.ellipsis),
                  ],
                ),
              ),
              Text(formatoKm(e.distanciaKm), style: const TextStyle(fontWeight: FontWeight.w600)),
            ],
          ),
        ),
      ),
    );
  }
}
