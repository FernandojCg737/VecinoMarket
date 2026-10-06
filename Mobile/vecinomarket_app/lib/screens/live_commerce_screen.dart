import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/api_client.dart';
import '../services/auth_service.dart';

class LiveCommerceScreen extends StatefulWidget {
  const LiveCommerceScreen({super.key});

  @override
  State<LiveCommerceScreen> createState() => _LiveCommerceScreenState();
}

class _LiveCommerceScreenState extends State<LiveCommerceScreen> {
  final _api = ApiClient.instance;
  List<dynamic> _lives = [];
  bool _cargando = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _cargarLives();
  }

  Future<void> _cargarLives() async {
    setState(() {
      _cargando = true;
      _error = null;
    });
    try {
      final res = await _api.get('promociones/lives/', autenticado: false);
      if (mounted) {
        setState(() {
          _lives = (res as List<dynamic>?) ?? [];
          _cargando = false;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _error = 'No se pudo cargar las transmisiones en vivo.';
          _cargando = false;
        });
      }
    }
  }

  void _abrirLive(Map<String, dynamic> live) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => _LiveViewerScreen(live: live),
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
            Icon(Icons.sensors, color: Color(0xFFDC2626), size: 22),
            SizedBox(width: 8),
            Text('Transmisiones en vivo', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            tooltip: 'Actualizar',
            onPressed: _cargarLives,
          ),
        ],
      ),
      body: _cargando
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.error_outline, size: 48, color: Colors.redAccent),
                      const SizedBox(height: 12),
                      Text(_error!),
                      const SizedBox(height: 12),
                      FilledButton(
                        onPressed: _cargarLives,
                        child: const Text('Reintentar'),
                      ),
                    ],
                  ),
                )
              : RefreshIndicator(
                  onRefresh: _cargarLives,
                  child: ListView(
                    padding: const EdgeInsets.all(16),
                    children: [
                      // Subtítulo CU17
                      Text(
                        'CU17 · Empresas vendiendo sus productos en vivo ahora mismo.',
                        style: TextStyle(
                          fontSize: 13,
                          color: isDark ? const Color(0xFF9CA3AF) : const Color(0xFF6B7280),
                        ),
                      ),
                      const SizedBox(height: 16),

                      if (_lives.isEmpty)
                        Container(
                          padding: const EdgeInsets.symmetric(vertical: 60, horizontal: 20),
                          alignment: Alignment.center,
                          child: Column(
                            children: [
                              Container(
                                width: 72,
                                height: 72,
                                decoration: BoxDecoration(
                                  color: isDark ? const Color(0xFF1F2937) : const Color(0xFFF3F4F6),
                                  shape: BoxShape.circle,
                                ),
                                child: const Icon(Icons.sensors_off, size: 36, color: Colors.grey),
                              ),
                              const SizedBox(height: 16),
                              Text(
                                'Ninguna empresa está transmitiendo en vivo ahora mismo.',
                                textAlign: TextAlign.center,
                                style: TextStyle(
                                  fontSize: 15,
                                  fontWeight: FontWeight.w600,
                                  color: isDark ? const Color(0xFFE5E7EB) : const Color(0xFF374151),
                                ),
                              ),
                              const SizedBox(height: 8),
                              Text(
                                'Vuelve a revisar pronto cuando las tiendas inicien sus transmisiones.',
                                textAlign: TextAlign.center,
                                style: TextStyle(
                                  fontSize: 13,
                                  color: isDark ? const Color(0xFF9CA3AF) : const Color(0xFF6B7280),
                                ),
                              ),
                            ],
                          ),
                        )
                      else
                        ..._lives.map((l) {
                          final liveMap = Map<String, dynamic>.from(l as Map);
                          final prods = (liveMap['productos_detalle'] as List<dynamic>?) ?? [];
                          final empresaNombre = liveMap['empresa_nombre'] ?? 'Tienda';
                          final titulo = liveMap['titulo'] ?? 'Transmisión en vivo';

                          return Container(
                            margin: const EdgeInsets.only(bottom: 16),
                            decoration: BoxDecoration(
                              color: cardBg,
                              borderRadius: BorderRadius.circular(16),
                              border: Border.all(color: borderColor),
                              boxShadow: const [
                                BoxShadow(
                                  color: Color(0x0A000000),
                                  blurRadius: 8,
                                  offset: Offset(0, 4),
                                ),
                              ],
                            ),
                            padding: const EdgeInsets.all(16),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                // Badge EN VIVO
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                      decoration: BoxDecoration(
                                        color: const Color(0xFFDC2626),
                                        borderRadius: BorderRadius.circular(999),
                                      ),
                                      child: const Row(
                                        mainAxisSize: MainAxisSize.min,
                                        children: [
                                          Icon(Icons.sensors, color: Colors.white, size: 14),
                                          SizedBox(width: 4),
                                          Text(
                                            'EN VIVO',
                                            style: TextStyle(
                                              color: Colors.white,
                                              fontSize: 11,
                                              fontWeight: FontWeight.w900,
                                              letterSpacing: 0.5,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                    Row(
                                      children: [
                                        const Icon(Icons.storefront_outlined, size: 16, color: Color(0xFFD97706)),
                                        const SizedBox(width: 4),
                                        Text(
                                          empresaNombre,
                                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                                        ),
                                      ],
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 12),
                                Text(
                                  titulo,
                                  style: const TextStyle(
                                    fontSize: 16,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                                if (prods.isNotEmpty) ...[
                                  const SizedBox(height: 10),
                                  Text(
                                    'Productos en oferta durante el vivo:',
                                    style: TextStyle(
                                      fontSize: 12,
                                      color: isDark ? const Color(0xFF9CA3AF) : const Color(0xFF6B7280),
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                  const SizedBox(height: 6),
                                  ...prods.take(3).map((p) {
                                    final pMap = Map<String, dynamic>.from(p as Map);
                                    return Padding(
                                      padding: const EdgeInsets.only(bottom: 4),
                                      child: Row(
                                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                        children: [
                                          Expanded(
                                            child: Text(
                                              '• ${pMap['nombre'] ?? ''}',
                                              style: const TextStyle(fontSize: 13),
                                              overflow: TextOverflow.ellipsis,
                                            ),
                                          ),
                                          Text(
                                            'Bs ${pMap['precio'] ?? ''}',
                                            style: const TextStyle(
                                              fontSize: 13,
                                              fontWeight: FontWeight.bold,
                                              color: Color(0xFFD97706),
                                            ),
                                          ),
                                        ],
                                      ),
                                    );
                                  }),
                                ],
                                const SizedBox(height: 14),
                                SizedBox(
                                  width: double.infinity,
                                  child: ElevatedButton.icon(
                                    style: ElevatedButton.styleFrom(
                                      backgroundColor: const Color(0xFFDC2626),
                                      foregroundColor: Colors.white,
                                      padding: const EdgeInsets.symmetric(vertical: 12),
                                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(999)),
                                    ),
                                    icon: const Icon(Icons.play_circle_fill, size: 20),
                                    label: const Text('Unirme al vivo', style: TextStyle(fontWeight: FontWeight.bold)),
                                    onPressed: () => _abrirLive(liveMap),
                                  ),
                                ),
                              ],
                            ),
                          );
                        }),
                    ],
                  ),
                ),
    );
  }
}

class _LiveViewerScreen extends StatefulWidget {
  final Map<String, dynamic> live;
  const _LiveViewerScreen({required this.live});

  @override
  State<_LiveViewerScreen> createState() => _LiveViewerScreenState();
}

class _LiveViewerScreenState extends State<_LiveViewerScreen> {
  final _api = ApiClient.instance;
  final _comentarioCtrl = TextEditingController();
  List<dynamic> _comentarios = [];
  bool _enviando = false;

  @override
  void initState() {
    super.initState();
    _cargarComentarios();
  }

  Future<void> _cargarComentarios() async {
    final liveId = widget.live['id'];
    try {
      final res = await _api.get('promociones/lives/$liveId/comentarios/', autenticado: false);
      if (mounted) {
        setState(() {
          _comentarios = (res as List<dynamic>?) ?? [];
        });
      }
    } catch (_) {}
  }

  Future<void> _enviarComentario() async {
    final texto = _comentarioCtrl.text.trim();
    if (texto.isEmpty || _enviando) return;

    final usuario = context.read<AuthService>().usuario;
    if (usuario == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Inicia sesión para comentar en el vivo.')),
      );
      return;
    }

    setState(() => _enviando = true);
    final liveId = widget.live['id'];

    try {
      await _api.post(
        'promociones/lives/$liveId/comentarios/',
        {'texto': texto},
        autenticado: true,
      );
      _comentarioCtrl.clear();
      await _cargarComentarios();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error al enviar comentario: $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _enviando = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final titulo = widget.live['titulo'] ?? 'En vivo';
    final empresaNombre = widget.live['empresa_nombre'] ?? 'Tienda';
    final productos = (widget.live['productos_detalle'] as List<dynamic>?) ?? [];

    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(titulo, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            Text(empresaNombre, style: const TextStyle(fontSize: 12, color: Colors.grey)),
          ],
        ),
      ),
      body: Column(
        children: [
          // Pantalla simulada del Stream / Video con señal en vivo
          Container(
            height: 220,
            width: double.infinity,
            color: Colors.black,
            child: Stack(
              alignment: Alignment.center,
              children: [
                const Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.videocam, color: Colors.white54, size: 48),
                    SizedBox(height: 8),
                    Text(
                      'Transmisión en directo',
                      style: TextStyle(color: Colors.white70, fontSize: 14),
                    ),
                  ],
                ),
                Positioned(
                  top: 12,
                  left: 12,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: const Color(0xFFDC2626),
                      borderRadius: BorderRadius.circular(999),
                    ),
                    child: const Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.sensors, color: Colors.white, size: 14),
                        SizedBox(width: 4),
                        Text(
                          'LIVE',
                          style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),

          // Productos destacados en el vivo (carrusel horizontal)
          if (productos.isNotEmpty)
            Container(
              height: 72,
              color: isDark ? const Color(0xFF1F2937) : const Color(0xFFF3F4F6),
              padding: const EdgeInsets.symmetric(vertical: 8),
              child: ListView.builder(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 12),
                itemCount: productos.length,
                itemBuilder: (context, i) {
                  final p = productos[i];
                  return Container(
                    margin: const EdgeInsets.only(right: 10),
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    decoration: BoxDecoration(
                      color: isDark ? const Color(0xFF111827) : Colors.white,
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: isDark ? const Color(0xFF374151) : const Color(0xFFE5E7EB)),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.shopping_bag_outlined, size: 18, color: Color(0xFFD97706)),
                        const SizedBox(width: 8),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Text(p['nombre'] ?? '', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                            Text('Bs ${p['precio'] ?? ''}', style: const TextStyle(fontSize: 11, color: Color(0xFFD97706), fontWeight: FontWeight.w800)),
                          ],
                        ),
                      ],
                    ),
                  );
                },
              ),
            ),

          // Chat de la transmisión en vivo
          Expanded(
            child: ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: _comentarios.length,
              itemBuilder: (context, i) {
                final c = _comentarios[i];
                final autor = c['usuario_nombre'] ?? 'Espectador';
                final texto = c['texto'] ?? '';

                return Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: RichText(
                    text: TextSpan(
                      style: TextStyle(
                        color: isDark ? Colors.white : Colors.black87,
                        fontSize: 13,
                      ),
                      children: [
                        TextSpan(
                          text: '$autor: ',
                          style: const TextStyle(fontWeight: FontWeight.bold, color: Color(0xFFD97706)),
                        ),
                        TextSpan(text: texto),
                      ],
                    ),
                  ),
                );
              },
            ),
          ),

          // Input de comentarios en el vivo
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            decoration: BoxDecoration(
              color: isDark ? const Color(0xFF111827) : Colors.white,
              border: Border(top: BorderSide(color: isDark ? const Color(0xFF374151) : const Color(0xFFE5E7EB))),
            ),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _comentarioCtrl,
                    decoration: const InputDecoration(
                      hintText: 'Comenta en el vivo...',
                      border: InputBorder.none,
                      isDense: true,
                    ),
                    onSubmitted: (_) => _enviarComentario(),
                  ),
                ),
                IconButton(
                  icon: _enviando
                      ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2))
                      : const Icon(Icons.send, color: Color(0xFFD97706)),
                  onPressed: _enviando ? null : _enviarComentario,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
