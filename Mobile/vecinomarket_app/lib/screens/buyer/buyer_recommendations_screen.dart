import 'package:flutter/material.dart';
import '../../models/recomendacion_ia.dart';
import '../../services/ia_service.dart';
import '../../widgets/secciones_ia.dart';
import '../../widgets/tarjeta_producto.dart';

/// CU1 (RF44): "Recomendado para ti" con el motor híbrido (/api/ia/recomendaciones/).
/// Sin historial muestra los más vendidos de 30 días (arranque en frío).
class BuyerRecommendationsScreen extends StatefulWidget {
  const BuyerRecommendationsScreen({super.key});

  @override
  State<BuyerRecommendationsScreen> createState() => _BuyerRecommendationsScreenState();
}

class _BuyerRecommendationsScreenState extends State<BuyerRecommendationsScreen> {
  final _ia = IaService();
  ListaRecomendada? _datos;
  bool _cargando = true;
  bool _generando = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _cargarRecomendaciones();
  }

  Future<void> _cargarRecomendaciones() async {
    setState(() {
      _cargando = true;
      _error = null;
    });
    try {
      final datos = await _ia.recomendaciones(limite: 20);
      if (mounted) {
        setState(() {
          _datos = datos;
          _cargando = false;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _error = 'No se pudo cargar tus recomendaciones.';
          _cargando = false;
        });
      }
    }
  }

  /// Recalcula en línea con la historia más reciente y vuelve a cargar.
  Future<void> _generarRecomendaciones() async {
    setState(() {
      _generando = true;
      _error = null;
    });
    try {
      await _ia.regenerar();
      await _cargarRecomendaciones();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('¡Recomendaciones actualizadas!')),
        );
      }
    } catch (_) {
      if (mounted) setState(() => _error = 'No se pudo actualizar tus recomendaciones.');
    } finally {
      if (mounted) setState(() => _generando = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final bgColor = isDark ? const Color(0xFF111827) : Colors.white;
    final cardBg = isDark ? const Color(0xFF1F2937) : const Color(0xFFF9FAFB);
    final borderColor = isDark ? const Color(0xFF374151) : const Color(0xFFE5E7EB);
    final datos = _datos;

    return Scaffold(
      backgroundColor: bgColor,
      appBar: AppBar(
        title: const Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.auto_awesome, color: Color(0xFFD97706), size: 22),
            SizedBox(width: 8),
            Text('Recomendado para ti', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
          ],
        ),
        actions: [
          IconButton(
            icon: _generando
                ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2))
                : const Icon(Icons.refresh),
            tooltip: 'Actualizar con IA',
            onPressed: _generando ? null : _generarRecomendaciones,
          ),
        ],
      ),
      body: _cargando && datos == null
          ? const Center(child: CircularProgressIndicator())
          : _error != null && datos == null
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.error_outline, size: 48, color: Colors.redAccent),
                      const SizedBox(height: 12),
                      Text(_error!),
                      const SizedBox(height: 12),
                      FilledButton(onPressed: _cargarRecomendaciones, child: const Text('Reintentar')),
                    ],
                  ),
                )
              : RefreshIndicator(
                  onRefresh: _cargarRecomendaciones,
                  child: ListView(
                    padding: const EdgeInsets.all(16),
                    children: [
                      Text(
                        'CU21 · RF44 · Según tu historial de navegación, tus compras y compradores con gustos parecidos.',
                        style: TextStyle(fontSize: 13, color: isDark ? const Color(0xFF9CA3AF) : const Color(0xFF6B7280)),
                      ),
                      if (_error != null) ...[
                        const SizedBox(height: 8),
                        Text(_error!, style: const TextStyle(color: Colors.redAccent, fontSize: 13)),
                      ],
                      const SizedBox(height: 16),
                      if (datos != null && datos.esPopular) ...[
                        _AvisoArranqueEnFrio(cardBg: cardBg, borderColor: borderColor, isDark: isDark),
                        const SizedBox(height: 16),
                      ],
                      if (datos == null || datos.productos.isEmpty)
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
                                child: const Icon(Icons.auto_awesome, size: 36, color: Colors.grey),
                              ),
                              const SizedBox(height: 16),
                              const Text(
                                'Todavía no hay productos para recomendarte.',
                                textAlign: TextAlign.center,
                                style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
                              ),
                            ],
                          ),
                        )
                      else
                        GridView.builder(
                          shrinkWrap: true,
                          physics: const NeverScrollableScrollPhysics(),
                          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                            crossAxisCount: 2,
                            childAspectRatio: 0.6,
                            crossAxisSpacing: 12,
                            mainAxisSpacing: 12,
                          ),
                          itemCount: datos.productos.length,
                          itemBuilder: (context, i) {
                            final r = datos.productos[i];
                            return TarjetaProducto(
                              producto: r.producto,
                              insignia: datos.esPopular ? null : 'Para ti',
                              iconoInsignia: Icons.auto_awesome,
                              nota: notaReputacion(r),
                            );
                          },
                        ),
                    ],
                  ),
                ),
    );
  }
}

class _AvisoArranqueEnFrio extends StatelessWidget {
  const _AvisoArranqueEnFrio({required this.cardBg, required this.borderColor, required this.isDark});
  final Color cardBg;
  final Color borderColor;
  final bool isDark;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: cardBg,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: borderColor),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: isDark ? const Color(0xFF111827) : const Color(0xFFF3F4F6),
              shape: BoxShape.circle,
            ),
            child: const Icon(Icons.trending_up, size: 20, color: Colors.grey),
          ),
          const SizedBox(width: 12),
          const Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Aún estamos conociendo tus gustos', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                SizedBox(height: 2),
                Text(
                  'Te mostramos lo más vendido de los últimos 30 días. A medida que navegues y compres, esta lista se adapta a ti.',
                  style: TextStyle(fontSize: 12.5, color: Colors.grey),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
