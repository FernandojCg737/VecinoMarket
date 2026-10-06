import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:http/http.dart' as http;
import 'package:webview_flutter/webview_flutter.dart';
import '../../services/api_client.dart';

class BuyerAddressesScreen extends StatefulWidget {
  const BuyerAddressesScreen({super.key});

  @override
  State<BuyerAddressesScreen> createState() => _BuyerAddressesScreenState();
}

class _BuyerAddressesScreenState extends State<BuyerAddressesScreen> {
  final _api = ApiClient.instance;
  List<dynamic> _direcciones = [];
  bool _cargando = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _cargarDirecciones();
  }

  Future<void> _cargarDirecciones() async {
    setState(() {
      _cargando = true;
      _error = null;
    });
    try {
      final res = await _api.get('usuarios/mis-direcciones/');
      if (mounted) {
        setState(() {
          _direcciones = (res as List?) ?? [];
          _cargando = false;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _error = 'No se pudo cargar tus direcciones.';
          _cargando = false;
        });
      }
    }
  }

  Future<void> _eliminarDireccion(int id) async {
    final confirmar = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('¿Eliminar dirección?'),
        content: const Text('¿Estás seguro de que deseas eliminar esta dirección de entrega?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancelar')),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: Colors.red),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Eliminar'),
          ),
        ],
      ),
    );

    if (confirmar != true) return;

    try {
      await _api.delete('usuarios/mis-direcciones/$id/');
      _cargarDirecciones();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Dirección eliminada correctamente.'),
            backgroundColor: Color(0xFF10B981),
          ),
        );
      }
    } on ApiException catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(e.mensaje),
            backgroundColor: Colors.red,
          ),
        );
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('No se pudo eliminar la dirección.'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  void _abrirFormulario({Map<String, dynamic>? direccion}) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _DireccionFormModal(
        direccion: direccion,
        onGuardado: _cargarDirecciones,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final bgColor = isDark ? const Color(0xFF111827) : Colors.white;
    final cardBg = isDark ? const Color(0xFF1F2937) : const Color(0xFFF9FAFB);
    final borderColor = isDark ? const Color(0xFF374151) : const Color(0xFFE5E7EB);

    return Scaffold(
      backgroundColor: bgColor,
      appBar: AppBar(
        title: const Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.location_on_outlined, color: Color(0xFFD97706), size: 22),
            SizedBox(width: 8),
            Text('Mis direcciones', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
          ],
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: const Color(0xFFD97706),
        icon: const Icon(Icons.add_location_alt_outlined, color: Colors.white),
        label: const Text('Nueva dirección', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
        onPressed: () => _abrirFormulario(),
      ),
      body: _cargando
          ? const Center(child: CircularProgressIndicator(color: Color(0xFFD97706)))
          : _error != null
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(_error!, style: const TextStyle(color: Colors.red)),
                      const SizedBox(height: 12),
                      OutlinedButton(onPressed: _cargarDirecciones, child: const Text('Reintentar')),
                    ],
                  ),
                )
              : SingleChildScrollView(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Direcciones de entrega (CU08)',
                        style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'Selecciona o agrega direcciones para tus envíos a domicilio.',
                        style: TextStyle(
                          fontSize: 13,
                          color: isDark ? const Color(0xFF9CA3AF) : const Color(0xFF6B7280),
                        ),
                      ),
                      const SizedBox(height: 16),
                      if (_direcciones.isEmpty)
                        Container(
                          width: double.infinity,
                          padding: const EdgeInsets.all(32),
                          decoration: BoxDecoration(
                            color: cardBg,
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(color: borderColor),
                          ),
                          child: Column(
                            children: [
                              Icon(Icons.map_outlined, size: 54, color: isDark ? const Color(0xFF4B5563) : const Color(0xFF9CA3AF)),
                              const SizedBox(height: 16),
                              const Text(
                                'Aún no tienes direcciones registradas',
                                style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
                              ),
                              const SizedBox(height: 6),
                              Text(
                                'Agrega una dirección con mapa y GPS para recibir tus compras en tu puerta.',
                                textAlign: TextAlign.center,
                                style: TextStyle(
                                  fontSize: 12,
                                  color: isDark ? const Color(0xFF9CA3AF) : const Color(0xFF6B7280),
                                ),
                              ),
                              const SizedBox(height: 16),
                              FilledButton.icon(
                                style: FilledButton.styleFrom(backgroundColor: const Color(0xFFD97706)),
                                icon: const Icon(Icons.add, size: 18),
                                label: const Text('Agregar dirección'),
                                onPressed: () => _abrirFormulario(),
                              ),
                            ],
                          ),
                        )
                      else
                        ListView.builder(
                          shrinkWrap: true,
                          physics: const NeverScrollableScrollPhysics(),
                          itemCount: _direcciones.length,
                          itemBuilder: (context, index) {
                            final d = _direcciones[index];
                            final id = d['id'] as int;
                            final alias = d['alias'] ?? 'Dirección';
                            final dirTexto = d['direccion_texto'] ?? '';
                            final ciudad = d['ciudad'] ?? '';
                            final depto = d['departamento'] ?? '';
                            final esPredet = d['es_predeterminada'] == true;
                            final lat = d['latitud'] ?? d['lat'];
                            final lon = d['longitud'] ?? d['lon'];

                            return Container(
                              margin: const EdgeInsets.only(bottom: 12),
                              padding: const EdgeInsets.all(16),
                              decoration: BoxDecoration(
                                color: cardBg,
                                borderRadius: BorderRadius.circular(16),
                                border: Border.all(
                                  color: esPredet ? const Color(0xFFD97706) : borderColor,
                                  width: esPredet ? 1.5 : 1,
                                ),
                              ),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    children: [
                                      const Icon(Icons.location_on, color: Color(0xFFD97706), size: 20),
                                      const SizedBox(width: 8),
                                      Expanded(
                                        child: Text(
                                          alias,
                                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                                        ),
                                      ),
                                      if (esPredet)
                                        Container(
                                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                          decoration: BoxDecoration(
                                            color: const Color(0xFFD97706).withValues(alpha: 0.15),
                                            borderRadius: BorderRadius.circular(999),
                                          ),
                                          child: const Text(
                                            'Predeterminada',
                                            style: TextStyle(
                                              color: Color(0xFFD97706),
                                              fontSize: 11,
                                              fontWeight: FontWeight.bold,
                                            ),
                                          ),
                                        ),
                                    ],
                                  ),
                                  const SizedBox(height: 8),
                                  Text(
                                    dirTexto,
                                    style: TextStyle(
                                      fontSize: 14,
                                      color: isDark ? Colors.white : const Color(0xFF111827),
                                    ),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    '$ciudad, $depto',
                                    style: TextStyle(
                                      fontSize: 12,
                                      color: isDark ? const Color(0xFF9CA3AF) : const Color(0xFF6B7280),
                                    ),
                                  ),
                                  if (lat != null && lon != null) ...[
                                    const SizedBox(height: 4),
                                    Row(
                                      children: [
                                        Icon(Icons.my_location, size: 12, color: isDark ? const Color(0xFF6B7280) : const Color(0xFF9CA3AF)),
                                        const SizedBox(width: 4),
                                        Text(
                                          'GPS: $lat, $lon',
                                          style: TextStyle(
                                            fontSize: 11,
                                            color: isDark ? const Color(0xFF6B7280) : const Color(0xFF9CA3AF),
                                          ),
                                        ),
                                      ],
                                    ),
                                  ],
                                  const SizedBox(height: 12),
                                  Row(
                                    mainAxisAlignment: MainAxisAlignment.end,
                                    children: [
                                      TextButton.icon(
                                        icon: const Icon(Icons.edit, size: 16),
                                        label: const Text('Editar'),
                                        onPressed: () => _abrirFormulario(direccion: d as Map<String, dynamic>),
                                      ),
                                      const SizedBox(width: 8),
                                      TextButton.icon(
                                        icon: const Icon(Icons.delete_outline, size: 16, color: Colors.red),
                                        label: const Text('Eliminar', style: TextStyle(color: Colors.red)),
                                        onPressed: () => _eliminarDireccion(id),
                                      ),
                                    ],
                                  ),
                                ],
                              ),
                            );
                          },
                        ),
                      const SizedBox(height: 80),
                    ],
                  ),
                ),
    );
  }
}

class _DireccionFormModal extends StatefulWidget {
  final Map<String, dynamic>? direccion;
  final VoidCallback onGuardado;

  const _DireccionFormModal({this.direccion, required this.onGuardado});

  @override
  State<_DireccionFormModal> createState() => _DireccionFormModalState();
}

class _DireccionFormModalState extends State<_DireccionFormModal> {
  final _api = ApiClient.instance;
  late final TextEditingController _aliasCtrl;
  late final TextEditingController _direccionCtrl;
  late final TextEditingController _ciudadCtrl;
  late final TextEditingController _deptoCtrl;
  bool _esPredeterminada = false;
  bool _guardando = false;
  bool _detectandoGps = false;
  String? _error;

  double _latitud = -16.5000;
  double _longitud = -68.1500;
  WebViewController? _mapController;

  @override
  void initState() {
    super.initState();
    final d = widget.direccion ?? {};
    _aliasCtrl = TextEditingController(text: d['alias'] ?? '');
    _direccionCtrl = TextEditingController(text: d['direccion_texto'] ?? '');
    _ciudadCtrl = TextEditingController(text: d['ciudad'] ?? 'La Paz');
    _deptoCtrl = TextEditingController(text: d['departamento'] ?? 'La Paz');
    _esPredeterminada = d['es_predeterminada'] == true;

    final latGuardada = d['latitud'] ?? d['lat'];
    final lonGuardada = d['longitud'] ?? d['lon'];
    if (latGuardada != null && lonGuardada != null) {
      _latitud = double.tryParse('$latGuardada') ?? -16.5000;
      _longitud = double.tryParse('$lonGuardada') ?? -68.1500;
    }

    _iniciarMapa();
  }

  void _iniciarMapa() {
    final html = _generarHtmlMapa(_latitud, _longitud);
    final controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..addJavaScriptChannel(
        'FlutterMapChannel',
        onMessageReceived: (message) {
          try {
            final data = jsonDecode(message.message);
            final lat = (data['lat'] as num).toDouble();
            final lon = (data['lng'] as num).toDouble();
            setState(() {
              _latitud = lat;
              _longitud = lon;
            });
            _geocodificarInverso(lat, lon);
          } catch (_) {}
        },
      )
      ..loadHtmlString(html);

    _mapController = controller;
  }

  String _generarHtmlMapa(double lat, double lon) {
    return '''
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    body, html { margin: 0; padding: 0; height: 100%; width: 100%; background: #0F172A; }
    #map { height: 100%; width: 100%; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var map = L.map('map', { zoomControl: true }).setView([$lat, $lon], 15);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap'
    }).addTo(map);

    var marker = L.marker([$lat, $lon], { draggable: true }).addTo(map);

    function notificar(lat, lng) {
      if (window.FlutterMapChannel) {
        window.FlutterMapChannel.postMessage(JSON.stringify({ lat: lat, lng: lng }));
      }
    }

    map.on('click', function(e) {
      marker.setLatLng(e.latlng);
      notificar(e.latlng.lat, e.latlng.lng);
    });

    marker.on('dragend', function(e) {
      var pos = marker.getLatLng();
      notificar(pos.lat, pos.lng);
    });

    window.moverPunto = function(lat, lng) {
      map.setView([lat, lng], 16);
      marker.setLatLng([lat, lng]);
    };
  </script>
</body>
</html>
''';
  }

  Future<void> _detectarGps() async {
    setState(() {
      _detectandoGps = true;
      _error = null;
    });

    try {
      bool servicioHabilitado = await Geolocator.isLocationServiceEnabled();
      if (!servicioHabilitado) {
        setState(() {
          _error = 'El servicio de ubicación GPS está desactivado en tu celular.';
          _detectandoGps = false;
        });
        return;
      }

      LocationPermission permiso = await Geolocator.checkPermission();
      if (permiso == LocationPermission.denied) {
        permiso = await Geolocator.requestPermission();
        if (permiso == LocationPermission.denied) {
          setState(() {
            _error = 'Permiso de ubicación denegado.';
            _detectandoGps = false;
          });
          return;
        }
      }

      if (permiso == LocationPermission.deniedForever) {
        setState(() {
          _error = 'Permiso de ubicación denegado permanentemente. Habilítalo en ajustes.';
          _detectandoGps = false;
        });
        return;
      }

      final posicion = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.high,
          timeLimit: Duration(seconds: 10),
        ),
      );

      setState(() {
        _latitud = posicion.latitude;
        _longitud = posicion.longitude;
        _detectandoGps = false;
      });

      _mapController?.runJavaScript('window.moverPunto(${posicion.latitude}, ${posicion.longitude});');
      await _geocodificarInverso(posicion.latitude, posicion.longitude);

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            behavior: SnackBarBehavior.floating,
            backgroundColor: Color(0xFF10B981),
            content: Text('¡Ubicación GPS detectada correctamente!', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
            duration: Duration(seconds: 2),
          ),
        );
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _error = 'No se pudo obtener la señal GPS. Puedes marcarla en el mapa.';
          _detectandoGps = false;
        });
      }
    }
  }

  Future<void> _geocodificarInverso(double lat, double lon) async {
    try {
      final url = Uri.parse('https://nominatim.openstreetmap.org/reverse?format=json&lat=$lat&lon=$lon');
      final res = await http.get(url, headers: {'User-Agent': 'VecinoMarketMobile/1.0'});
      if (res.statusCode == 200) {
        final data = jsonDecode(utf8.decode(res.bodyBytes));
        final address = data['address'] as Map<String, dynamic>?;
        if (address != null && mounted) {
          final road = address['road'] ?? address['pedestrian'] ?? address['suburb'] ?? '';
          final houseNumber = address['house_number'] ?? '';
          final city = address['city'] ?? address['town'] ?? address['village'] ?? address['county'] ?? 'La Paz';
          final state = address['state'] ?? 'La Paz';

          setState(() {
            if (_direccionCtrl.text.isEmpty || _direccionCtrl.text.trim() == '') {
              _direccionCtrl.text = '$road $houseNumber'.trim();
            }
            if (_ciudadCtrl.text.isEmpty || _ciudadCtrl.text == 'La Paz') {
              _ciudadCtrl.text = '$city'.replaceAll('Departamento de', '').trim();
            }
            if (_deptoCtrl.text.isEmpty || _deptoCtrl.text == 'La Paz') {
              _deptoCtrl.text = '$state'.replaceAll('Departamento de', '').trim();
            }
          });
        }
      }
    } catch (_) {}
  }

  Future<void> _guardar() async {
    final alias = _aliasCtrl.text.trim();
    final dir = _direccionCtrl.text.trim();
    if (alias.isEmpty || dir.isEmpty) {
      setState(() => _error = 'Por favor completa el alias y la dirección.');
      return;
    }

    setState(() {
      _guardando = true;
      _error = null;
    });

    final body = {
      'alias': alias,
      'direccion_texto': dir,
      'ciudad': _ciudadCtrl.text.trim(),
      'departamento': _deptoCtrl.text.trim(),
      'es_predeterminada': _esPredeterminada,
      'lat': _latitud,
      'lon': _longitud,
    };

    try {
      if (widget.direccion != null) {
        final id = widget.direccion!['id'];
        await _api.patch('usuarios/mis-direcciones/$id/', body);
      } else {
        await _api.post('usuarios/mis-direcciones/', body, autenticado: true);
      }
      widget.onGuardado();
      if (mounted) Navigator.pop(context);
    } catch (_) {
      if (mounted) {
        setState(() {
          _error = 'Ocurrió un error al guardar la dirección.';
          _guardando = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final bgColor = isDark ? const Color(0xFF1F2937) : Colors.white;
    final borderColor = isDark ? const Color(0xFF374151) : const Color(0xFFE5E7EB);

    final viewInsetsBottom = MediaQuery.of(context).viewInsets.bottom;
    final paddingBottom = MediaQuery.of(context).padding.bottom;
    // Elevar el botón para que quede suspendido y cómodo por encima de la barra del sistema
    final bottomEspacio = viewInsetsBottom > 0
        ? viewInsetsBottom + 16
        : (paddingBottom > 0 ? paddingBottom + 36 : 48.0);

    return Container(
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
      ),
      padding: EdgeInsets.fromLTRB(20, 16, 20, bottomEspacio),
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  widget.direccion != null ? 'Editar dirección' : 'Nueva dirección de entrega',
                  style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                ),
                IconButton(icon: const Icon(Icons.close), onPressed: () => Navigator.pop(context)),
              ],
            ),
            const SizedBox(height: 8),

            // Botón GPS para detección automática
            OutlinedButton.icon(
              style: OutlinedButton.styleFrom(
                foregroundColor: const Color(0xFFD97706),
                side: const BorderSide(color: Color(0xFFD97706), width: 1.5),
                padding: const EdgeInsets.symmetric(vertical: 12),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              icon: _detectandoGps
                  ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Color(0xFFD97706)))
                  : const Icon(Icons.my_location, size: 20),
              label: Text(
                _detectandoGps ? 'Detectando señal GPS...' : 'Detectar mi ubicación actual (GPS)',
                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
              ),
              onPressed: _detectandoGps ? null : _detectarGps,
            ),
            const SizedBox(height: 12),

            // Vista interactiva del mapa Leaflet
            Container(
              height: 220,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: borderColor, width: 1.5),
              ),
              clipBehavior: Clip.antiAlias,
              child: _mapController != null
                  ? WebViewWidget(controller: _mapController!)
                  : const Center(child: CircularProgressIndicator(color: Color(0xFFD97706))),
            ),
            const SizedBox(height: 6),
            Text(
              'Toca en el mapa o arrastra el marcador para fijar el punto exacto.\nLat: ${_latitud.toStringAsFixed(5)}, Lon: ${_longitud.toStringAsFixed(5)}',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 11,
                color: isDark ? const Color(0xFF9CA3AF) : const Color(0xFF6B7280),
              ),
            ),
            const SizedBox(height: 14),

            TextField(
              controller: _aliasCtrl,
              decoration: const InputDecoration(
                labelText: 'Alias (ej. Casa, Oficina, Depto)',
                border: OutlineInputBorder(),
                isDense: true,
              ),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _direccionCtrl,
              maxLines: 2,
              decoration: const InputDecoration(
                labelText: 'Dirección completa y referencias',
                border: OutlineInputBorder(),
                isDense: true,
              ),
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _ciudadCtrl,
                    decoration: const InputDecoration(
                      labelText: 'Ciudad',
                      border: OutlineInputBorder(),
                      isDense: true,
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: TextField(
                    controller: _deptoCtrl,
                    decoration: const InputDecoration(
                      labelText: 'Departamento',
                      border: OutlineInputBorder(),
                      isDense: true,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            SwitchListTile(
              contentPadding: EdgeInsets.zero,
              activeThumbColor: const Color(0xFFD97706),
              title: const Text('Establecer como dirección predeterminada', style: TextStyle(fontSize: 14)),
              value: _esPredeterminada,
              onChanged: (val) => setState(() => _esPredeterminada = val),
            ),
            if (_error != null) ...[
              const SizedBox(height: 8),
              Text(_error!, style: const TextStyle(color: Colors.red, fontSize: 13)),
            ],
            const SizedBox(height: 18),
            FilledButton(
              style: FilledButton.styleFrom(
                backgroundColor: const Color(0xFFD97706),
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                elevation: 3,
              ),
              onPressed: _guardando ? null : _guardar,
              child: _guardando
                  ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                  : const Text('Guardar dirección', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
            ),
            const SizedBox(height: 12),
          ],
        ),
      ),
    );
  }
}
