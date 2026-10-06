import 'package:flutter/material.dart';
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
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('No se pudo eliminar la dirección.')),
        );
      }
    }
  }

  void _abrirFormulario({Map<String, dynamic>? direccion}) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
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
            Icon(Icons.location_on_outlined, size: 22, color: Color(0xFFD97706)),
            SizedBox(width: 8),
            Text('Mis direcciones', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            tooltip: 'Nueva dirección',
            onPressed: () => _abrirFormulario(),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: const Color(0xFFD97706),
        foregroundColor: Colors.white,
        icon: const Icon(Icons.add),
        label: const Text('Nueva dirección'),
        onPressed: () => _abrirFormulario(),
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
                      FilledButton(onPressed: _cargarDirecciones, child: const Text('Reintentar')),
                    ],
                  ),
                )
              : RefreshIndicator(
                  onRefresh: _cargarDirecciones,
                  child: ListView(
                    padding: const EdgeInsets.fromLTRB(16, 16, 16, 80),
                    children: [
                      Text(
                        'CU08 · Gestiona tus direcciones para envíos a domicilio.',
                        style: TextStyle(
                          fontSize: 13,
                          color: isDark ? const Color(0xFF9CA3AF) : const Color(0xFF6B7280),
                        ),
                      ),
                      const SizedBox(height: 16),

                      if (_direcciones.isEmpty)
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
                                child: const Icon(Icons.location_off_outlined, size: 36, color: Colors.grey),
                              ),
                              const SizedBox(height: 16),
                              const Text(
                                'Aún no registraste ninguna dirección.',
                                textAlign: TextAlign.center,
                                style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
                              ),
                              const SizedBox(height: 8),
                              const Text(
                                'Agrega una dirección para recibir tus compras con facilidad.',
                                textAlign: TextAlign.center,
                                style: TextStyle(fontSize: 13, color: Colors.grey),
                              ),
                            ],
                          ),
                        )
                      else
                        ..._direcciones.map((d) {
                          final dMap = Map<String, dynamic>.from(d as Map);
                          final id = dMap['id'] as int;
                          final alias = dMap['alias'] ?? 'Mi dirección';
                          final direccionTexto = dMap['direccion_texto'] ?? '';
                          final ciudad = dMap['ciudad'] ?? '';
                          final depto = dMap['departamento'] ?? '';
                          final esPredeterminada = dMap['es_predeterminada'] == true;

                          return Container(
                            margin: const EdgeInsets.only(bottom: 12),
                            padding: const EdgeInsets.all(16),
                            decoration: BoxDecoration(
                              color: cardBg,
                              borderRadius: BorderRadius.circular(16),
                              border: Border.all(
                                color: esPredeterminada ? const Color(0xFFD97706) : borderColor,
                                width: esPredeterminada ? 1.5 : 1,
                              ),
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Row(
                                      children: [
                                        Icon(
                                          esPredeterminada ? Icons.star : Icons.location_on,
                                          color: esPredeterminada ? const Color(0xFFD97706) : Colors.grey,
                                          size: 20,
                                        ),
                                        const SizedBox(width: 8),
                                        Text(
                                          alias,
                                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                                        ),
                                      ],
                                    ),
                                    if (esPredeterminada)
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
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
                                  direccionTexto,
                                  style: const TextStyle(fontSize: 14),
                                ),
                                if (ciudad.isNotEmpty || depto.isNotEmpty) ...[
                                  const SizedBox(height: 4),
                                  Text(
                                    [ciudad, depto].where((s) => s.isNotEmpty).join(', '),
                                    style: TextStyle(
                                      fontSize: 12,
                                      color: isDark ? const Color(0xFF9CA3AF) : const Color(0xFF6B7280),
                                    ),
                                  ),
                                ],
                                const SizedBox(height: 12),
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.end,
                                  children: [
                                    TextButton.icon(
                                      icon: const Icon(Icons.edit, size: 16),
                                      label: const Text('Editar'),
                                      onPressed: () => _abrirFormulario(direccion: dMap),
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
                        }),
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
  String? _error;

  @override
  void initState() {
    super.initState();
    final d = widget.direccion ?? {};
    _aliasCtrl = TextEditingController(text: d['alias'] ?? '');
    _direccionCtrl = TextEditingController(text: d['direccion_texto'] ?? '');
    _ciudadCtrl = TextEditingController(text: d['ciudad'] ?? 'La Paz');
    _deptoCtrl = TextEditingController(text: d['departamento'] ?? 'La Paz');
    _esPredeterminada = d['es_predeterminada'] == true;
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
                  widget.direccion != null ? 'Editar dirección' : 'Nueva dirección',
                  style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                ),
                IconButton(icon: const Icon(Icons.close), onPressed: () => Navigator.pop(context)),
              ],
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _aliasCtrl,
              decoration: const InputDecoration(
                labelText: 'Alias (ej. Casa, Oficina)',
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _direccionCtrl,
              maxLines: 2,
              decoration: const InputDecoration(
                labelText: 'Dirección completa y referencias',
                border: OutlineInputBorder(),
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
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            SwitchListTile(
              contentPadding: EdgeInsets.zero,
              title: const Text('Establecer como dirección predeterminada'),
              value: _esPredeterminada,
              onChanged: (val) => setState(() => _esPredeterminada = val),
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
                  : const Text('Guardar dirección', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
            ),
          ],
        ),
      ),
    );
  }
}
