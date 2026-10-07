import 'package:flutter/material.dart';
import '../../models/producto.dart';
import '../../services/api_client.dart';
import '../product_detail_screen.dart';

class BuyerRecommendationsScreen extends StatefulWidget {
  const BuyerRecommendationsScreen({super.key});

  @override
  State<BuyerRecommendationsScreen> createState() => _BuyerRecommendationsScreenState();
}

class _BuyerRecommendationsScreenState extends State<BuyerRecommendationsScreen> {
  final _api = ApiClient.instance;
  List<dynamic> _recomendaciones = [];
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
      final res = await _api.get('reportes/mis-recomendaciones/');
      if (mounted) {
        setState(() {
          _recomendaciones = (res as List?) ?? [];
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

  Future<void> _generarRecomendaciones() async {
    setState(() {
      _generando = true;
      _error = null;
    });
    try {
      final res = await _api.post('reportes/mis-recomendaciones/generar/', {}, autenticado: true);
      if (mounted) {
        setState(() {
          if (res is Map && res['recomendaciones'] != null) {
            _recomendaciones = res['recomendaciones'] as List;
          }
          _generando = false;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('¡Recomendaciones generadas con éxito!')),
        );
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _error = 'No se pudo generar nuevas recomendaciones.';
          _generando = false;
        });
      }
    }
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
            tooltip: 'Regenerar con IA',
            onPressed: _generando ? null : _generarRecomendaciones,
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
                      FilledButton(onPressed: _cargarRecomendaciones, child: const Text('Reintentar')),
                    ],
                  ),
                )
              : RefreshIndicator(
                  onRefresh: _cargarRecomendaciones,
                  child: ListView(
                    padding: const EdgeInsets.all(16),
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Expanded(
                            child: Text(
                              'CU12 · Basado en tu historial de compras y preferencias.',
                              style: TextStyle(
                                fontSize: 13,
                                color: isDark ? const Color(0xFF9CA3AF) : const Color(0xFF6B7280),
                              ),
                            ),
                          ),
                          TextButton.icon(
                            icon: _generando
                                ? const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2))
                                : const Icon(Icons.auto_awesome, size: 16),
                            label: const Text('Regenerar IA'),
                            onPressed: _generando ? null : _generarRecomendaciones,
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),

                      if (_recomendaciones.isEmpty)
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
                                'Aún no tenemos recomendaciones personalizadas.',
                                textAlign: TextAlign.center,
                                style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
                              ),
                              const SizedBox(height: 8),
                              const Text(
                                'Haz clic en "Regenerar IA" o realiza compras para que el motor inteligente aprenda tus gustos.',
                                textAlign: TextAlign.center,
                                style: TextStyle(fontSize: 13, color: Colors.grey),
                              ),
                              const SizedBox(height: 16),
                              ElevatedButton.icon(
                                style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFFD97706), foregroundColor: Colors.white),
                                icon: const Icon(Icons.auto_awesome, size: 16),
                                label: const Text('Generar ahora'),
                                onPressed: _generarRecomendaciones,
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
                            childAspectRatio: 0.68,
                            crossAxisSpacing: 12,
                            mainAxisSpacing: 12,
                          ),
                          itemCount: _recomendaciones.length,
                          itemBuilder: (context, i) {
                            final item = _recomendaciones[i] as Map<String, dynamic>;
                            final isDetalleMap = item['producto_detalle'] is Map<String, dynamic>;
                            final isProductoMap = item['producto'] is Map<String, dynamic>;
                            
                            final Map<String, dynamic> productoData = isDetalleMap 
                                ? item['producto_detalle'] 
                                : (isProductoMap ? item['producto'] : <String, dynamic>{});

                            final nombre = productoData['nombre'] ?? item['producto_nombre'] ?? 'Producto Recomendado';
                            final precio = productoData['precio'] ?? item['producto_precio'] ?? item['precio'] ?? 0;
                            final imagenUrl = productoData['imagen_url'] ?? item['imagen_url'];
                            final motivo = item['motivo'] ?? item['razon'] ?? 'Sugerido por tus compras';

                            return InkWell(
                              onTap: () {
                                final Map<String, dynamic> jsonForProd = productoData.isNotEmpty 
                                    ? productoData 
                                    : {
                                        'id': item['producto'] is int ? item['producto'] : (item['id'] ?? 0),
                                        'nombre': nombre,
                                        'precio': precio,
                                        'empresa': {'razon_social': item['empresa_nombre'] ?? ''},
                                        'imagenes': imagenUrl != null ? [{'url': imagenUrl}] : [],
                                      };
                                final prod = Producto.fromJson(jsonForProd);
                                Navigator.push(context, MaterialPageRoute(builder: (_) => ProductDetailScreen(producto: prod)));
                              },
                              borderRadius: BorderRadius.circular(16),
                              child: Container(
                                decoration: BoxDecoration(
                                  color: cardBg,
                                  borderRadius: BorderRadius.circular(16),
                                  border: Border.all(color: borderColor),
                                ),
                                clipBehavior: Clip.antiAlias,
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Expanded(
                                      flex: 5,
                                      child: Container(
                                        color: isDark ? const Color(0xFF111827) : const Color(0xFFF3F4F6),
                                        width: double.infinity,
                                        child: imagenUrl != null && imagenUrl.toString().isNotEmpty
                                            ? Image.network(
                                                imagenUrl.toString(),
                                                fit: BoxFit.contain,
                                                errorBuilder: (context, error, stackTrace) =>
                                                    const Icon(Icons.inventory_2_outlined, size: 36, color: Colors.grey),
                                              )
                                            : const Icon(Icons.inventory_2_outlined, size: 36, color: Colors.grey),
                                      ),
                                    ),
                                    Expanded(
                                      flex: 4,
                                      child: Padding(
                                        padding: const EdgeInsets.all(10),
                                        child: Column(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                          children: [
                                            Text(
                                              nombre,
                                              maxLines: 2,
                                              overflow: TextOverflow.ellipsis,
                                              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                                            ),
                                            Column(
                                              crossAxisAlignment: CrossAxisAlignment.start,
                                              children: [
                                                Text(
                                                  'Bs $precio',
                                                  style: const TextStyle(
                                                    color: Color(0xFFD97706),
                                                    fontWeight: FontWeight.w800,
                                                    fontSize: 14,
                                                  ),
                                                ),
                                                const SizedBox(height: 2),
                                                Text(
                                                  motivo,
                                                  maxLines: 1,
                                                  overflow: TextOverflow.ellipsis,
                                                  style: const TextStyle(fontSize: 10, color: Colors.grey),
                                                ),
                                              ],
                                            ),
                                          ],
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            );
                          },
                        ),
                    ],
                  ),
                ),
    );
  }
}
