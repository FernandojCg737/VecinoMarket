import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:image_picker/image_picker.dart';

import '../services/api_client.dart';

const _ruta = 'pedidos/reclamos/';
const _motivos = {
  'DANADO': 'Producto dañado',
  'NO_CORRESPONDE': 'El producto no corresponde',
  'INCOMPLETO': 'Pedido incompleto',
};
const _estados = {
  'PENDIENTE': 'En revisión',
  'RECHAZADA': 'Rechazada por la empresa',
  'EN_MEDIACION': 'En mediación',
  'RECHAZADA_MEDIACION': 'Rechazo confirmado',
  'REEMBOLSO_PENDIENTE': 'Reembolso pendiente',
  'APROBADA': 'Reembolsada',
};
const _acciones = {
  'aprobar': 'Aprobar devolución',
  'rechazar': 'Rechazar reclamo',
  'escalar': 'Solicitar mediación',
  'mediar_aprobar': 'Resolver a favor del comprador',
  'mediar_rechazar': 'Confirmar rechazo',
  'confirmar_qr': 'Registrar transferencia realizada',
  'verificar_paypal': 'Verificar reembolso en PayPal',
  'conciliar_paypal': 'Conciliar referencia de PayPal',
};

String _mensaje(Object error) => error is ApiException
    ? error.mensaje
    : 'No se pudo completar la solicitud.';

Future<T?> _abrir<T>(BuildContext context, Widget pantalla) =>
    Navigator.push(context, MaterialPageRoute<T>(builder: (_) => pantalla));

class ReclamosScreen extends StatefulWidget {
  const ReclamosScreen({super.key});

  @override
  State<ReclamosScreen> createState() => _ReclamosScreenState();
}

class _ReclamosScreenState extends State<ReclamosScreen> {
  late Future<dynamic> _consulta;
  String _estado = '';
  int _pagina = 1;

  @override
  void initState() {
    super.initState();
    _consulta = _cargar();
  }

  Future<dynamic> _cargar() => ApiClient.instance.get(
    _ruta,
    params: {'page': _pagina, 'estado': _estado},
  );

  Future<void> _recargar() async {
    final consulta = _cargar();
    setState(() {
      _consulta = consulta;
    });
    await consulta.then<void>((_) {}, onError: (Object _) {});
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Reclamos de devolución')),
    body: Column(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
          child: DropdownButtonFormField<String>(
            initialValue: '',
            decoration: const InputDecoration(labelText: 'Estado'),
            items: [
              const DropdownMenuItem(
                value: '',
                child: Text('Todos los estados'),
              ),
              for (final e in _estados.entries)
                DropdownMenuItem(value: e.key, child: Text(e.value)),
            ],
            onChanged: (value) {
              _estado = value ?? '';
              _pagina = 1;
              _recargar();
            },
          ),
        ),
        Expanded(
          child: RefreshIndicator(
            onRefresh: _recargar,
            child: FutureBuilder<dynamic>(
              future: _consulta,
              builder: (context, snapshot) {
                if (snapshot.connectionState == ConnectionState.waiting) {
                  return const Center(child: CircularProgressIndicator());
                }
                if (snapshot.hasError) {
                  return _ErrorReclamo(
                    error: snapshot.error!,
                    reintentar: _recargar,
                  );
                }
                final datos = snapshot.data as Map<String, dynamic>;
                final casos = datos['results'] as List<dynamic>;
                return ListView(
                  physics: const AlwaysScrollableScrollPhysics(),
                  padding: const EdgeInsets.all(12),
                  children: [
                    if (casos.isEmpty)
                      const ListTile(
                        title: Text('No hay reclamos en este estado.'),
                      ),
                    for (final caso in casos)
                      Card(
                        child: ListTile(
                          title: Text(
                            "${caso['numero_pedido']} · ${caso['empresa']}",
                          ),
                          subtitle: Text(
                            "${caso['motivo_label']} · ${caso['estado_label']}",
                          ),
                          trailing: const Icon(Icons.chevron_right),
                          onTap: () async {
                            await _abrir<void>(
                              context,
                              DetalleReclamoScreen(id: caso['id'] as int),
                            );
                            if (mounted) await _recargar();
                          },
                        ),
                      ),
                    if (datos['next'] != null || datos['previous'] != null)
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          TextButton(
                            onPressed: datos['previous'] == null
                                ? null
                                : () {
                                    _pagina--;
                                    _recargar();
                                  },
                            child: const Text('Anterior'),
                          ),
                          Text('Página $_pagina'),
                          TextButton(
                            onPressed: datos['next'] == null
                                ? null
                                : () {
                                    _pagina++;
                                    _recargar();
                                  },
                            child: const Text('Siguiente'),
                          ),
                        ],
                      ),
                  ],
                );
              },
            ),
          ),
        ),
      ],
    ),
  );
}

class NuevoReclamoScreen extends StatefulWidget {
  const NuevoReclamoScreen({
    super.key,
    required this.pedido,
    required this.numero,
  });
  final int pedido;
  final String numero;

  @override
  State<NuevoReclamoScreen> createState() => _NuevoReclamoScreenState();
}

class _NuevoReclamoScreenState extends State<NuevoReclamoScreen> {
  final _formulario = GlobalKey<FormState>();
  final _descripcion = TextEditingController();
  XFile? _foto;
  Uint8List? _bytes;
  String? _motivo;
  String? _error;
  bool _enviando = false;

  @override
  void dispose() {
    _descripcion.dispose();
    super.dispose();
  }

  Future<void> _elegirFoto(ImageSource origen) async {
    try {
      final foto = await ImagePicker().pickImage(
        source: origen,
        maxWidth: 2200,
        maxHeight: 2200,
        imageQuality: 86,
      );
      if (foto == null || !mounted) return;
      if (await foto.length() > 5 * 1024 * 1024) {
        if (mounted) {
          setState(() => _error = 'Selecciona una foto de hasta 5 MB.');
        }
        return;
      }
      final bytes = await foto.readAsBytes();
      if (!mounted) return;
      setState(() {
        _foto = foto;
        _bytes = bytes;
        _error = null;
      });
    } catch (_) {
      if (mounted) setState(() => _error = 'No se pudo abrir la foto.');
    }
  }

  Future<void> _enviar() async {
    if (_enviando || !_formulario.currentState!.validate()) return;
    if (_foto == null || _bytes == null) {
      setState(() => _error = 'Adjunta una foto de evidencia.');
      return;
    }
    setState(() {
      _enviando = true;
      _error = null;
    });
    try {
      final caso = await ApiClient.instance.postMultipart(
        '${_ruta}crear/',
        fields: {
          'pedido': widget.pedido.toString(),
          'motivo': _motivo!,
          'descripcion': _descripcion.text.trim(),
        },
        files: [
          http.MultipartFile.fromBytes(
            'evidencia',
            _bytes!,
            filename: _foto!.name,
          ),
        ],
      );
      if (mounted) Navigator.pop(context, caso['id'] as int);
    } catch (error) {
      if (mounted) {
        setState(() {
          _error = _mensaje(error);
          _enviando = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Solicitar devolución')),
    body: SafeArea(
      child: Form(
        key: _formulario,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Text(widget.numero, style: Theme.of(context).textTheme.titleLarge),
            const SizedBox(height: 16),
            DropdownButtonFormField<String>(
              isExpanded: true,
              decoration: const InputDecoration(labelText: 'Motivo'),
              items: [
                for (final m in _motivos.entries)
                  DropdownMenuItem(value: m.key, child: Text(m.value)),
              ],
              onChanged: _enviando ? null : (value) => _motivo = value,
              validator: (value) =>
                  value == null ? 'Selecciona un motivo.' : null,
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _descripcion,
              enabled: !_enviando,
              decoration: const InputDecoration(labelText: 'Descripción'),
              minLines: 3,
              maxLines: 5,
              maxLength: 2000,
              validator: (value) => value == null || value.trim().isEmpty
                  ? 'Describe lo ocurrido.'
                  : null,
            ),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                OutlinedButton.icon(
                  onPressed: _enviando
                      ? null
                      : () => _elegirFoto(ImageSource.gallery),
                  icon: const Icon(Icons.image_outlined),
                  label: const Text('Elegir foto'),
                ),
                OutlinedButton.icon(
                  onPressed: _enviando
                      ? null
                      : () => _elegirFoto(ImageSource.camera),
                  icon: const Icon(Icons.camera_alt_outlined),
                  label: const Text('Tomar foto'),
                ),
              ],
            ),
            if (_bytes != null)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 12),
                child: Image.memory(
                  _bytes!,
                  height: 160,
                  fit: BoxFit.contain,
                  semanticLabel: 'Vista previa de evidencia',
                ),
              ),
            if (_error != null) _MensajeError(_error!),
            const SizedBox(height: 12),
            FilledButton(
              onPressed: _enviando ? null : _enviar,
              child: Text(_enviando ? 'Enviando…' : 'Enviar reclamo'),
            ),
          ],
        ),
      ),
    ),
  );
}

class DetalleReclamoScreen extends StatefulWidget {
  const DetalleReclamoScreen({super.key, required this.id});
  final int id;

  @override
  State<DetalleReclamoScreen> createState() => _DetalleReclamoScreenState();
}

class _DetalleReclamoScreenState extends State<DetalleReclamoScreen> {
  late Future<dynamic> _detalle;
  Future<Uint8List>? _evidencia;
  String get _path => '$_ruta${widget.id}/';

  @override
  void initState() {
    super.initState();
    _detalle = ApiClient.instance.get(_path);
  }

  Future<void> _recargar() async {
    final detalle = ApiClient.instance.get(_path);
    setState(() {
      _detalle = detalle;
    });
    await detalle.then<void>((_) {}, onError: (Object _) {});
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Detalle del reclamo')),
    body: RefreshIndicator(
      onRefresh: _recargar,
      child: FutureBuilder<dynamic>(
        future: _detalle,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snapshot.hasError) {
            return _ErrorReclamo(error: snapshot.error!, reintentar: _recargar);
          }
          final caso = snapshot.data as Map<String, dynamic>;
          _evidencia ??= ApiClient.instance.getBytes(
            (caso['evidencia_path'] as String).replaceFirst('/api/', ''),
          );
          return ListView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.all(16),
            children: [
              Text(
                "${caso['numero_pedido']} · ${caso['empresa']}",
                style: Theme.of(context).textTheme.titleLarge,
              ),
              Align(
                alignment: Alignment.centerLeft,
                child: Chip(label: Text(caso['estado_label'] as String)),
              ),
              _linea('Motivo', caso['motivo_label'], caso['creado_en']),
              _linea('Descripción', caso['descripcion']),
              FutureBuilder<Uint8List>(
                future: _evidencia,
                builder: (context, foto) {
                  if (foto.hasError) {
                    return TextButton(
                      onPressed: () => setState(() => _evidencia = null),
                      child: const Text('Reintentar carga de la foto'),
                    );
                  }
                  if (!foto.hasData) return const LinearProgressIndicator();
                  return Image.memory(
                    foto.data!,
                    height: 200,
                    fit: BoxFit.contain,
                    semanticLabel: 'Foto de evidencia',
                  );
                },
              ),
              _linea(
                'Respuesta de la empresa',
                caso['respuesta'],
                caso['fecha_respuesta'],
              ),
              _linea(
                'Motivo de mediación',
                caso['motivo_mediacion'],
                caso['fecha_mediacion'],
              ),
              _linea(
                'Resolución de la plataforma',
                caso['resolucion_mediacion'],
                caso['fecha_resolucion'],
              ),
              if (caso['monto_reembolso'] != null)
                _linea(
                  'Reembolso',
                  "Bs ${caso['monto_reembolso']} · ${caso['metodo_pago']}",
                  caso['fecha_reembolso'],
                ),
              _linea('Referencia de reembolso', caso['referencia_reembolso']),
              for (final accion
                  in (caso['acciones'] as List<dynamic>).cast<String>())
                Padding(
                  padding: const EdgeInsets.only(top: 8),
                  child: OutlinedButton(
                    onPressed: () async {
                      await _abrir<bool>(
                        context,
                        _AccionReclamoScreen(
                          id: widget.id,
                          accion: accion,
                          caso: caso,
                        ),
                      );
                      if (mounted) await _recargar();
                    },
                    child: Text(_acciones[accion] ?? accion),
                  ),
                ),
            ],
          );
        },
      ),
    ),
  );

  Widget _linea(String titulo, Object? contenido, [Object? fecha]) {
    if (contenido == null || contenido.toString().isEmpty) {
      return const SizedBox.shrink();
    }
    final instante = fecha == null
        ? null
        : DateTime.tryParse(fecha.toString())?.toLocal();
    return ListTile(
      contentPadding: EdgeInsets.zero,
      title: Text(titulo),
      subtitle: Text(
        instante == null
            ? contenido.toString()
            : '$contenido\n${MaterialLocalizations.of(context).formatMediumDate(instante)}',
      ),
    );
  }
}

class _AccionReclamoScreen extends StatefulWidget {
  const _AccionReclamoScreen({
    required this.id,
    required this.accion,
    required this.caso,
  });
  final int id;
  final String accion;
  final Map<String, dynamic> caso;

  @override
  State<_AccionReclamoScreen> createState() => _AccionReclamoScreenState();
}

class _AccionReclamoScreenState extends State<_AccionReclamoScreen> {
  final _form = GlobalKey<FormState>();
  final _texto = TextEditingController();
  final _sucursales = <String, int>{};
  String? _error;
  bool _guardando = false;

  @override
  void dispose() {
    _texto.dispose();
    super.dispose();
  }

  Future<void> _enviar() async {
    if (_guardando || !_form.currentState!.validate()) return;
    setState(() {
      _guardando = true;
      _error = null;
    });
    final accion = widget.accion;
    final usaReferencia =
        accion == 'confirmar_qr' || accion == 'conciliar_paypal';
    try {
      await ApiClient.instance.post('$_ruta${widget.id}/accion/', {
        'accion': accion,
        if (usaReferencia) 'referencia': _texto.text.trim(),
        if (!usaReferencia && accion != 'verificar_paypal')
          'respuesta': _texto.text.trim(),
        if (_sucursales.isNotEmpty) 'sucursales': _sucursales,
      }, autenticado: true);
      if (mounted) Navigator.pop(context, true);
    } catch (error) {
      if (!mounted) return;
      if (error is ApiException &&
          (error.statusCode == 409 || error.statusCode == 502)) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(error.mensaje)));
        Navigator.pop(context, true);
      } else {
        setState(() {
          _error = _mensaje(error);
          _guardando = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final accion = widget.accion;
    final aprobacion = accion == 'aprobar' || accion == 'mediar_aprobar';
    final usaReferencia =
        accion == 'confirmar_qr' || accion == 'conciliar_paypal';
    return Scaffold(
      appBar: AppBar(title: Text(_acciones[accion] ?? accion)),
      body: SafeArea(
        child: Form(
          key: _form,
          child: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              if (aprobacion)
                Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: Text(
                    widget.caso['metodo_pago'] == 'PAYPAL'
                        ? 'Se solicitará a PayPal el reembolso de este pedido.'
                        : 'Después de la transferencia podrás registrar su referencia.',
                  ),
                ),
              if (accion != 'verificar_paypal')
                TextFormField(
                  controller: _texto,
                  enabled: !_guardando,
                  maxLines: usaReferencia ? 1 : 4,
                  maxLength: usaReferencia ? 100 : 2000,
                  decoration: InputDecoration(
                    labelText: accion == 'confirmar_qr'
                        ? 'Referencia de la transferencia realizada'
                        : accion == 'conciliar_paypal'
                        ? 'ID de reembolso de PayPal'
                        : accion == 'escalar'
                        ? 'Motivo de la mediación'
                        : 'Respuesta',
                  ),
                  validator: (value) => value == null || value.trim().isEmpty
                      ? 'Completa este campo.'
                      : null,
                ),
              if (aprobacion)
                for (final item
                    in widget.caso['items_sucursales'] as List<dynamic>)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: DropdownButtonFormField<int>(
                      isExpanded: true,
                      decoration: InputDecoration(
                        labelText: "Sucursal de ${item['producto']}",
                      ),
                      items: [
                        for (final opcion in item['opciones'] as List<dynamic>)
                          DropdownMenuItem(
                            value: opcion['id'] as int,
                            child: Text(opcion['nombre'] as String),
                          ),
                      ],
                      onChanged: _guardando
                          ? null
                          : (value) {
                              if (value != null) {
                                _sucursales[item['id'].toString()] = value;
                              }
                            },
                      validator: (value) => value == null
                          ? 'Selecciona la sucursal de origen.'
                          : null,
                    ),
                  ),
              if (_error != null) _MensajeError(_error!),
              const SizedBox(height: 12),
              FilledButton(
                onPressed: _guardando ? null : _enviar,
                child: Text(_guardando ? 'Guardando…' : 'Confirmar acción'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _MensajeError extends StatelessWidget {
  const _MensajeError(this.mensaje);
  final String mensaje;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 8),
    child: Text(
      mensaje,
      style: TextStyle(color: Theme.of(context).colorScheme.error),
    ),
  );
}

class _ErrorReclamo extends StatelessWidget {
  const _ErrorReclamo({required this.error, required this.reintentar});
  final Object error;
  final VoidCallback reintentar;

  @override
  Widget build(BuildContext context) => ListView(
    physics: const AlwaysScrollableScrollPhysics(),
    padding: const EdgeInsets.all(16),
    children: [
      _MensajeError(_mensaje(error)),
      TextButton(onPressed: reintentar, child: const Text('Reintentar')),
    ],
  );
}
