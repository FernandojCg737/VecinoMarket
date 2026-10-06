import 'package:flutter/material.dart';
import '../../services/api_client.dart';

class BuyerReviewsScreen extends StatefulWidget {
  const BuyerReviewsScreen({super.key});

  @override
  State<BuyerReviewsScreen> createState() => _BuyerReviewsScreenState();
}

class _BuyerReviewsScreenState extends State<BuyerReviewsScreen> with SingleTickerProviderStateMixin {
  final _api = ApiClient.instance;
  late final TabController _tabCtrl;

  List<dynamic> _compras = [];
  List<dynamic> _valoraciones = [];
  bool _cargando = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _tabCtrl = TabController(length: 2, vsync: this);
    _cargar();
  }

  @override
  void dispose() {
    _tabCtrl.dispose();
    super.dispose();
  }

  Future<void> _cargar() async {
    setState(() {
      _cargando = true;
      _error = null;
    });
    try {
      final res = await Future.wait([
        _api.get('pedidos/mis-compras/', params: {'page_size': 100}),
        _api.get('reportes/mis-valoraciones/'),
      ]);

      if (mounted) {
        final comprasData = res[0];
        final listCompras = comprasData is Map ? (comprasData['results'] as List? ?? []) : (comprasData as List? ?? []);
        setState(() {
          _compras = listCompras;
          _valoraciones = (res[1] as List?) ?? [];
          _cargando = false;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _error = 'No se pudo cargar tus valoraciones.';
          _cargando = false;
        });
      }
    }
  }

  void _abrirModalValoracion({required Map<String, dynamic> pedido, Map<String, dynamic>? valoracionExistente}) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _ValoracionFormModal(
        pedido: pedido,
        valoracionExistente: valoracionExistente,
        onGuardado: _cargar,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final bgColor = isDark ? const Color(0xFF111827) : Colors.white;
    final cardBg = isDark ? const Color(0xFF1F2937) : const Color(0xFFF9FAFB);
    final borderColor = isDark ? const Color(0xFF374151) : const Color(0xFFE5E7EB);

    final idsCalificados = _valoraciones.map((v) => v['pedido']).toSet();
    final comprasPorCalificar = _compras.where((c) => c['estado'] == 'ENTREGADO' && !idsCalificados.contains(c['id'])).toList();

    return Scaffold(
      backgroundColor: bgColor,
      appBar: AppBar(
        title: const Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.star, size: 22, color: Color(0xFFD97706)),
            SizedBox(width: 8),
            Text('Mis reseñas', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
          ],
        ),
        bottom: TabBar(
          controller: _tabCtrl,
          indicatorColor: const Color(0xFFD97706),
          labelColor: const Color(0xFFD97706),
          tabs: [
            Tab(text: 'Publicadas (${_valoraciones.length})'),
            Tab(text: 'Por calificar (${comprasPorCalificar.length})'),
          ],
        ),
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
                      FilledButton(onPressed: _cargar, child: const Text('Reintentar')),
                    ],
                  ),
                )
              : TabBarView(
                  controller: _tabCtrl,
                  children: [
                    // Pestaña 1: Reseñas publicadas
                    RefreshIndicator(
                      onRefresh: _cargar,
                      child: _valoraciones.isEmpty
                          ? const Center(child: Text('Todavía no has dejado ninguna reseña.'))
                          : ListView.builder(
                              padding: const EdgeInsets.all(16),
                              itemCount: _valoraciones.length,
                              itemBuilder: (context, i) {
                                final v = _valoraciones[i] as Map<String, dynamic>;
                                final calificacion = (v['calificacion'] as num?)?.toInt() ?? 5;
                                final comentario = v['comentario'] ?? '';
                                final fecha = (v['fecha_creacion'] ?? '').toString().split('T').first;
                                final pedidoNum = v['pedido_numero'] ?? v['pedido'] ?? '';

                                return Container(
                                  margin: const EdgeInsets.only(bottom: 12),
                                  padding: const EdgeInsets.all(16),
                                  decoration: BoxDecoration(
                                    color: cardBg,
                                    borderRadius: BorderRadius.circular(16),
                                    border: Border.all(color: borderColor),
                                  ),
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Row(
                                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                        children: [
                                          Text(
                                            'Pedido #$pedidoNum',
                                            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                                          ),
                                          Text(
                                            fecha,
                                            style: TextStyle(
                                              fontSize: 12,
                                              color: isDark ? const Color(0xFF9CA3AF) : const Color(0xFF6B7280),
                                            ),
                                          ),
                                        ],
                                      ),
                                      const SizedBox(height: 8),
                                      Row(
                                        children: List.generate(
                                          5,
                                          (starIdx) => Icon(
                                            Icons.star,
                                            size: 18,
                                            color: starIdx < calificacion ? Colors.amber : Colors.grey.shade400,
                                          ),
                                        ),
                                      ),
                                      if (comentario.isNotEmpty) ...[
                                        const SizedBox(height: 8),
                                        Text(
                                          '"$comentario"',
                                          style: const TextStyle(fontSize: 14, fontStyle: FontStyle.italic),
                                        ),
                                      ],
                                    ],
                                  ),
                                );
                              },
                            ),
                    ),

                    // Pestaña 2: Compras por calificar
                    RefreshIndicator(
                      onRefresh: _cargar,
                      child: comprasPorCalificar.isEmpty
                          ? const Center(child: Text('¡Estás al día! No tienes compras pendientes de calificar.'))
                          : ListView.builder(
                              padding: const EdgeInsets.all(16),
                              itemCount: comprasPorCalificar.length,
                              itemBuilder: (context, i) {
                                final c = comprasPorCalificar[i] as Map<String, dynamic>;
                                final id = c['id'];
                                final total = c['subtotal'] ?? c['total'] ?? 0;
                                final fecha = (c['fecha_creacion'] ?? '').toString().split('T').first;

                                return Container(
                                  margin: const EdgeInsets.only(bottom: 12),
                                  padding: const EdgeInsets.all(16),
                                  decoration: BoxDecoration(
                                    color: cardBg,
                                    borderRadius: BorderRadius.circular(16),
                                    border: Border.all(color: borderColor),
                                  ),
                                  child: Row(
                                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                    children: [
                                      Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Text('Pedido #$id (Entregado)', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                                          const SizedBox(height: 4),
                                          Text('Fecha: $fecha · Total: Bs $total', style: const TextStyle(fontSize: 12, color: Colors.grey)),
                                        ],
                                      ),
                                      ElevatedButton.icon(
                                        style: ElevatedButton.styleFrom(
                                          backgroundColor: const Color(0xFFD97706),
                                          foregroundColor: Colors.white,
                                        ),
                                        icon: const Icon(Icons.star, size: 16),
                                        label: const Text('Calificar'),
                                        onPressed: () => _abrirModalValoracion(pedido: c),
                                      ),
                                    ],
                                  ),
                                );
                              },
                            ),
                    ),
                  ],
                ),
    );
  }
}

class _ValoracionFormModal extends StatefulWidget {
  final Map<String, dynamic> pedido;
  final Map<String, dynamic>? valoracionExistente;
  final VoidCallback onGuardado;

  const _ValoracionFormModal({required this.pedido, this.valoracionExistente, required this.onGuardado});

  @override
  State<_ValoracionFormModal> createState() => _ValoracionFormModalState();
}

class _ValoracionFormModalState extends State<_ValoracionFormModal> {
  final _api = ApiClient.instance;
  int _estrellas = 5;
  final _comentarioCtrl = TextEditingController();
  bool _guardando = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    if (widget.valoracionExistente != null) {
      _estrellas = (widget.valoracionExistente!['calificacion'] as num?)?.toInt() ?? 5;
      _comentarioCtrl.text = widget.valoracionExistente!['comentario'] ?? '';
    }
  }

  Future<void> _guardar() async {
    setState(() {
      _guardando = true;
      _error = null;
    });

    final pedidoId = widget.pedido['id'];
    final body = {
      'pedido': pedidoId,
      'calificacion': _estrellas,
      'comentario': _comentarioCtrl.text.trim(),
    };

    try {
      await _api.post('reportes/mis-valoraciones/', body, autenticado: true);
      widget.onGuardado();
      if (mounted) Navigator.pop(context);
    } catch (_) {
      if (mounted) {
        setState(() {
          _error = 'No se pudo guardar tu reseña.';
          _guardando = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final bgColor = isDark ? const Color(0xFF1F2937) : Colors.white;

    return Container(
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
      ),
      padding: EdgeInsets.fromLTRB(20, 20, 20, MediaQuery.of(context).viewInsets.bottom + 20),
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Calificar Pedido #${widget.pedido['id']}',
                  style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                ),
                IconButton(icon: const Icon(Icons.close), onPressed: () => Navigator.pop(context)),
              ],
            ),
            const SizedBox(height: 16),
            const Text('¿Cómo calificarías tu experiencia de compra?', style: TextStyle(fontSize: 14)),
            const SizedBox(height: 12),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: List.generate(5, (index) {
                final valor = index + 1;
                return IconButton(
                  icon: Icon(
                    Icons.star,
                    size: 36,
                    color: valor <= _estrellas ? Colors.amber : Colors.grey.shade400,
                  ),
                  onPressed: () => setState(() => _estrellas = valor),
                );
              }),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _comentarioCtrl,
              maxLines: 3,
              decoration: const InputDecoration(
                labelText: 'Deja un comentario (opcional)',
                hintText: 'Cuéntanos qué te pareció la calidad, la atención o el envío...',
                border: OutlineInputBorder(),
              ),
            ),
            if (_error != null) ...[
              const SizedBox(height: 8),
              Text(_error!, style: const TextStyle(color: Colors.red, fontSize: 13)),
            ],
            const SizedBox(height: 16),
            FilledButton(
              style: FilledButton.styleFrom(
                backgroundColor: const Color(0xFFD97706),
                padding: const EdgeInsets.symmetric(vertical: 14),
              ),
              onPressed: _guardando ? null : _guardar,
              child: _guardando
                  ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                  : const Text('Enviar reseña', style: TextStyle(fontWeight: FontWeight.bold)),
            ),
          ],
        ),
      ),
    );
  }
}
