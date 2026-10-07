import 'dart:async';
import 'dart:io';
import 'package:app_links/app_links.dart';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';
import 'package:webview_flutter/webview_flutter.dart';
import '../models/sucursal.dart';
import '../services/api_client.dart';
import '../services/cart_service.dart';
import '../services/pedido_service.dart';
import 'buyer/buyer_addresses_screen.dart';
import 'mis_pedidos_screen.dart';

/// CU12: Checkout integrado en móvil con soporte para:
/// 1. "Recojo en tienda" (sucursal seleccionada).
/// 2. "Envío a domicilio" (dirección registrada en Mis Direcciones).
/// 3. Pago por QR (con comprobante adjunto) o PayPal incrustado.
class CheckoutScreen extends StatefulWidget {
  const CheckoutScreen({super.key});

  @override
  State<CheckoutScreen> createState() => _CheckoutScreenState();
}

class _CheckoutScreenState extends State<CheckoutScreen> {
  final _api = ApiClient.instance;
  final _pedidoService = PedidoService();
  final _appLinks = AppLinks();
  final _scrollController = ScrollController();
  final _picker = ImagePicker();
  StreamSubscription<Uri>? _subAppLinks;

  bool _cargandoDatos = true;
  Map<int, List<Sucursal>> _sucursalesPorEmpresa = {};
  Map<int, List<dynamic>> _metodosPagoPorEmpresa = {};
  List<dynamic> _direcciones = [];

  // Configuración de entrega por cada empresa
  final Map<int, String> _modalidadPorEmpresa = {}; // empresaId -> 'RECOJO_TIENDA' | 'ENVIO_DOMICILIO'
  final Map<int, int> _sucursalSeleccionada = {}; // empresaId -> sucursalId
  final Map<int, int> _direccionSeleccionada = {}; // empresaId -> direccionId

  // Método de pago: 'QR' | 'PAYPAL'
  String _metodoSeleccionado = 'QR';
  XFile? _comprobanteFoto;

  bool _procesando = false;
  bool _mostrarPaypalInline = false;
  bool _confirmando = false;
  int _progresoWeb = 0;
  String? _error;

  WebViewController? _webViewController;
  int? _ordenCompraId;
  String? _paypalOrderId;

  @override
  void initState() {
    super.initState();
    _cargarDatosIniciales();
    _subAppLinks = _appLinks.uriLinkStream.listen(_alRecibirDeepLink, onError: (_) {});
  }

  @override
  void dispose() {
    _subAppLinks?.cancel();
    _scrollController.dispose();
    super.dispose();
  }

  void _alRecibirDeepLink(Uri uri) {
    if (uri.scheme != 'vecinomarket') return;
    if (uri.host == 'pago-exitoso') {
      _confirmarPagoInline();
    } else if (uri.host == 'pago-cancelado') {
      setState(() {
        _error = 'Cancelaste el pago en PayPal.';
        _mostrarPaypalInline = false;
      });
    }
  }

  Future<void> _cargarDatosIniciales() async {
    setState(() => _cargandoDatos = true);
    final cart = context.read<CartService>();
    final empresaIds = cart.items.map((it) => it.producto.empresaId).toSet();

    try {
      final sucursalesMap = <int, List<Sucursal>>{};
      final metodosMap = <int, List<dynamic>>{};
      for (final empresaId in empresaIds) {
        sucursalesMap[empresaId] = await _pedidoService.obtenerSucursales(empresaId);
        metodosMap[empresaId] = await _pedidoService.obtenerMetodosPagoEmpresa(empresaId);
      }

      final resDirecciones = await _api.get('usuarios/mis-direcciones/');
      final listDirecciones = (resDirecciones as List?) ?? [];

      int? predetId;
      for (final d in listDirecciones) {
        if (d['es_predeterminada'] == true) {
          predetId = d['id'] as int?;
          break;
        }
      }
      predetId ??= listDirecciones.isNotEmpty ? (listDirecciones.first['id'] as int?) : null;

      if (mounted) {
        setState(() {
          _sucursalesPorEmpresa = sucursalesMap;
          _metodosPagoPorEmpresa = metodosMap;
          _direcciones = listDirecciones;

          for (final empresaId in empresaIds) {
            _modalidadPorEmpresa.putIfAbsent(empresaId, () => 'RECOJO_TIENDA');

            // Auto-seleccionar sucursal si hay disponibles
            final sucs = sucursalesMap[empresaId] ?? [];
            if (sucs.isNotEmpty && _sucursalSeleccionada[empresaId] == null) {
              _sucursalSeleccionada[empresaId] = sucs.first.id;
            }

            // Auto-seleccionar dirección predeterminada
            if (predetId != null && _direccionSeleccionada[empresaId] == null) {
              _direccionSeleccionada[empresaId] = predetId;
            }
          }

          _cargandoDatos = false;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _error = 'No se pudo cargar la información de entrega.';
          _cargandoDatos = false;
        });
      }
    }
  }

  Future<void> _irAGestionarDirecciones() async {
    await Navigator.push(
      context,
      MaterialPageRoute(builder: (_) => const BuyerAddressesScreen()),
    );
    // Al volver, refrescar las direcciones guardadas
    _cargarDatosIniciales();
  }

  Future<void> _pagar() async {
    final cart = context.read<CartService>();
    final empresaIds = cart.items.map((it) => it.producto.empresaId).toSet();

    for (final empresaId in empresaIds) {
      final modalidad = _modalidadPorEmpresa[empresaId] ?? 'RECOJO_TIENDA';
      if (modalidad == 'RECOJO_TIENDA') {
        if (_sucursalSeleccionada[empresaId] == null) {
          setState(() => _error = 'Elige una sucursal de recojo para cada tienda.');
          return;
        }
      } else if (modalidad == 'ENVIO_DOMICILIO') {
        if (_direccionSeleccionada[empresaId] == null) {
          setState(() => _error = 'Elige una dirección de entrega a domicilio para cada tienda.');
          return;
        }
      }
    }

    setState(() {
      _procesando = true;
      _error = null;
    });

    try {
      final items = cart.items
          .map((it) => {'producto_id': it.producto.id, 'cantidad': it.cantidad})
          .toList();

      final entregas = {
        for (final empresaId in empresaIds)
          '$empresaId': _modalidadPorEmpresa[empresaId] == 'ENVIO_DOMICILIO'
              ? {
                  'modalidad': 'ENVIO_DOMICILIO',
                  'direccion_id': _direccionSeleccionada[empresaId],
                }
              : {
                  'modalidad': 'RECOJO_TIENDA',
                  'sucursal_id': _sucursalSeleccionada[empresaId],
                },
      };

      final resultado = await _pedidoService.iniciarCheckout(items: items, entregas: entregas);
      final enlace = resultado['enlace_aprobacion_paypal'] as String?;
      if (enlace == null) {
        throw Exception('PayPal no devolvió un link de aprobación.');
      }

      _ordenCompraId = resultado['orden_compra_id'] as int;
      _paypalOrderId = resultado['paypal_order_id'] as String;

      // Inicializar el WebView embebido directamente en esta pantalla
      final controller = WebViewController()
        ..setJavaScriptMode(JavaScriptMode.unrestricted)
        ..setUserAgent(
          'Mozilla/5.0 (Linux; Android 13; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
        )
        ..setNavigationDelegate(
          NavigationDelegate(
            onProgress: (progreso) {
              if (mounted) setState(() => _progresoWeb = progreso);
            },
            onNavigationRequest: (request) {
              final url = request.url;
              final uri = Uri.tryParse(url);

              // Interceptar redirección exitosa
              if (url.startsWith('vecinomarket://pago-exitoso') ||
                  (uri != null && uri.scheme == 'vecinomarket' && uri.host == 'pago-exitoso') ||
                  url.contains('pago-exitoso')) {
                _confirmarPagoInline();
                return NavigationDecision.prevent;
              }

              // Interceptar cancelación
              if (url.startsWith('vecinomarket://pago-cancelado') ||
                  (uri != null && uri.scheme == 'vecinomarket' && uri.host == 'pago-cancelado') ||
                  url.contains('pago-cancelado')) {
                setState(() {
                  _error = 'Cancelaste el pago en PayPal.';
                  _mostrarPaypalInline = false;
                });
                return NavigationDecision.prevent;
              }

              return NavigationDecision.navigate;
            },
          ),
        )
        ..loadRequest(Uri.parse(enlace));

      if (mounted) {
        setState(() {
          _webViewController = controller;
          _mostrarPaypalInline = true;
          _procesando = false;
        });

        // Desplazamiento suave para visualizar el recuadro de PayPal
        WidgetsBinding.instance.addPostFrameCallback((_) {
          if (_scrollController.hasClients) {
            _scrollController.animateTo(
              _scrollController.position.maxScrollExtent,
              duration: const Duration(milliseconds: 500),
              curve: Curves.easeOut,
            );
          }
        });
      }
    } on ApiException catch (e) {
      if (mounted) {
        setState(() {
          _error = e.mensaje;
          _procesando = false;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _error = 'No se pudo iniciar la pasarela de PayPal. Intenta de nuevo.';
          _procesando = false;
        });
      }
    }
  }

  Future<void> _confirmarPagoInline() async {
    if (_confirmando || _ordenCompraId == null || _paypalOrderId == null) return;

    setState(() {
      _confirmando = true;
      _error = null;
    });

    try {
      final resultado = await _pedidoService.confirmarPago(
        ordenCompraId: _ordenCompraId!,
        paypalOrderId: _paypalOrderId!,
      );

      if (!mounted) return;

      if (resultado['aprobado'] == true || resultado['orden_compra_id'] != null) {
        final cart = context.read<CartService>();
        cart.vaciar();

        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            behavior: SnackBarBehavior.floating,
            backgroundColor: const Color(0xFF10B981),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            content: const Row(
              children: [
                Icon(Icons.check_circle, color: Colors.white),
                SizedBox(width: 10),
                Expanded(
                  child: Text(
                    '¡Pago completado con éxito! Tu pedido ha sido confirmado.',
                    style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
                  ),
                ),
              ],
            ),
            duration: const Duration(seconds: 4),
          ),
        );

        Navigator.pushReplacement(
          context,
          MaterialPageRoute(builder: (_) => const MisPedidosScreen()),
        );
      } else {
        setState(() {
          _error = 'PayPal no aprobó el pago. Vuelve a intentar.';
          _confirmando = false;
        });
      }
    } on ApiException catch (e) {
      if (mounted) {
        setState(() {
          _error = e.mensaje;
          _confirmando = false;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _error = 'Ocurrió un error al procesar la confirmación.';
          _confirmando = false;
        });
      }
    }
  }

  Future<void> _seleccionarComprobante(ImageSource source) async {
    try {
      final XFile? foto = await _picker.pickImage(
        source: source,
        maxWidth: 1920,
        maxHeight: 1920,
        imageQuality: 85,
      );
      if (foto != null) {
        setState(() {
          _comprobanteFoto = foto;
          _error = null;
        });
      }
    } catch (e) {
      setState(() => _error = 'No se pudo seleccionar la imagen: $e');
    }
  }

  void _mostrarOpcionesComprobante() {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text(
                'Subir comprobante de pago',
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
              ),
              const SizedBox(height: 12),
              ListTile(
                leading: const Icon(Icons.photo_camera, color: Color(0xFFD97706)),
                title: const Text('Tomar foto con la cámara'),
                onTap: () {
                  Navigator.pop(ctx);
                  _seleccionarComprobante(ImageSource.camera);
                },
              ),
              ListTile(
                leading: const Icon(Icons.photo_library, color: Color(0xFFD97706)),
                title: const Text('Elegir de la galería'),
                onTap: () {
                  Navigator.pop(ctx);
                  _seleccionarComprobante(ImageSource.gallery);
                },
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _pagarConQR() async {
    final cart = context.read<CartService>();
    final empresaIds = cart.items.map((it) => it.producto.empresaId).toSet();

    for (final empresaId in empresaIds) {
      final modalidad = _modalidadPorEmpresa[empresaId] ?? 'RECOJO_TIENDA';
      if (modalidad == 'RECOJO_TIENDA') {
        if (_sucursalSeleccionada[empresaId] == null) {
          setState(() => _error = 'Elige una sucursal de recojo para cada tienda.');
          return;
        }
      } else if (modalidad == 'ENVIO_DOMICILIO') {
        if (_direccionSeleccionada[empresaId] == null) {
          setState(() => _error = 'Elige una dirección de entrega a domicilio para cada tienda.');
          return;
        }
      }
    }

    if (_comprobanteFoto == null) {
      setState(() => _error = 'Debes adjuntar la foto o captura de tu comprobante de pago.');
      return;
    }

    setState(() {
      _procesando = true;
      _error = null;
    });

    try {
      final items = cart.items
          .map((it) => {'producto_id': it.producto.id, 'cantidad': it.cantidad})
          .toList();

      final entregas = {
        for (final empresaId in empresaIds)
          '$empresaId': _modalidadPorEmpresa[empresaId] == 'ENVIO_DOMICILIO'
              ? {
                  'modalidad': 'ENVIO_DOMICILIO',
                  'direccion_id': _direccionSeleccionada[empresaId],
                }
              : {
                  'modalidad': 'RECOJO_TIENDA',
                  'sucursal_id': _sucursalSeleccionada[empresaId],
                },
      };

      await _pedidoService.iniciarCheckoutQR(
        items: items,
        entregas: entregas,
        rutaComprobante: _comprobanteFoto!.path,
      );

      if (!mounted) return;

      cart.vaciar();

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          behavior: SnackBarBehavior.floating,
          backgroundColor: const Color(0xFF10B981),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
          content: const Row(
            children: [
              Icon(Icons.check_circle, color: Colors.white),
              SizedBox(width: 10),
              Expanded(
                child: Text(
                  '¡Pedido registrado con éxito! El vendedor verificará tu comprobante de pago.',
                  style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
                ),
              ),
            ],
          ),
          duration: const Duration(seconds: 4),
        ),
      );

      Navigator.pushReplacement(
        context,
        MaterialPageRoute(builder: (_) => const MisPedidosScreen()),
      );
    } on ApiException catch (e) {
      if (mounted) {
        setState(() {
          _error = e.mensaje;
          _procesando = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = 'No se pudo registrar el pedido con comprobante: $e';
          _procesando = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final cart = context.watch<CartService>();
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final cardBg = isDark ? const Color(0xFF1F2937) : const Color(0xFFF9FAFB);
    final borderColor = isDark ? const Color(0xFF374151) : const Color(0xFFE5E7EB);

    if (_cargandoDatos) {
      return Scaffold(
        appBar: AppBar(title: const Text('Finalizar compra')),
        body: const Center(child: CircularProgressIndicator(color: Color(0xFFD97706))),
      );
    }

    final empresas = cart.items
        .map((it) => (id: it.producto.empresaId, nombre: it.producto.empresaNombre))
        .toSet();

    return Scaffold(
      appBar: AppBar(title: const Text('Finalizar compra')),
      body: ListView(
        controller: _scrollController,
        padding: const EdgeInsets.all(16),
        children: [
          const Text(
            'Modalidad de entrega',
            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
          ),
          const SizedBox(height: 4),
          Text(
            'Elige cómo deseas recibir los productos de cada negocio: Recojo en tienda o Envío a tu domicilio.',
            style: TextStyle(
              fontSize: 12,
              color: isDark ? const Color(0xFF9CA3AF) : Colors.grey,
            ),
          ),
          const SizedBox(height: 14),

          // Bloque por cada tienda en el carrito
          for (final empresa in empresas) ...[
            Container(
              margin: const EdgeInsets.only(bottom: 16),
              decoration: BoxDecoration(
                color: cardBg,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: borderColor),
              ),
              child: Padding(
                padding: const EdgeInsets.all(14),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        const Icon(Icons.storefront_outlined, color: Color(0xFFD97706), size: 20),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            empresa.nombre,
                            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),

                    // Selector de modalidad: Recojo vs Domicilio
                    Row(
                      children: [
                        Expanded(
                          child: _buildBotonModalidad(
                            label: 'Recojo en tienda',
                            icon: Icons.store_mall_directory_outlined,
                            seleccionado: (_modalidadPorEmpresa[empresa.id] ?? 'RECOJO_TIENDA') == 'RECOJO_TIENDA',
                            onTap: () {
                              setState(() => _modalidadPorEmpresa[empresa.id] = 'RECOJO_TIENDA');
                            },
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: _buildBotonModalidad(
                            label: 'Envío a domicilio',
                            icon: Icons.delivery_dining_outlined,
                            seleccionado: (_modalidadPorEmpresa[empresa.id] ?? 'RECOJO_TIENDA') == 'ENVIO_DOMICILIO',
                            onTap: () {
                              setState(() => _modalidadPorEmpresa[empresa.id] = 'ENVIO_DOMICILIO');
                            },
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 14),

                    // 1. OPCIÓN RECOJO EN TIENDA
                    if ((_modalidadPorEmpresa[empresa.id] ?? 'RECOJO_TIENDA') == 'RECOJO_TIENDA') ...[
                      const Text(
                        'Selecciona la sucursal de recojo:',
                        style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
                      ),
                      const SizedBox(height: 6),
                      if ((_sucursalesPorEmpresa[empresa.id] ?? []).isEmpty)
                        Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: Colors.red.withValues(alpha: 0.1),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: const Text(
                            'Esta tienda no tiene sucursales de recojo disponibles.',
                            style: TextStyle(color: Colors.red, fontSize: 12),
                          ),
                        )
                      else
                        ..._sucursalesPorEmpresa[empresa.id]!.map(
                          (s) => RadioListTile<int>(
                            contentPadding: EdgeInsets.zero,
                            dense: true,
                            activeColor: const Color(0xFFD97706),
                            title: Text(s.nombre, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                            subtitle: s.direccionTexto.isNotEmpty
                                ? Text(
                                    s.direccionTexto,
                                    style: TextStyle(
                                      fontSize: 11,
                                      color: isDark ? const Color(0xFF9CA3AF) : Colors.grey.shade600,
                                    ),
                                  )
                                : null,
                            value: s.id,
                            groupValue: _sucursalSeleccionada[empresa.id],
                            onChanged: (v) => setState(() => _sucursalSeleccionada[empresa.id] = v!),
                          ),
                        ),
                    ],

                    // 2. OPCIÓN ENVÍO A DOMICILIO
                    if ((_modalidadPorEmpresa[empresa.id] ?? 'RECOJO_TIENDA') == 'ENVIO_DOMICILIO') ...[
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text(
                            'Selecciona tu dirección guardada:',
                            style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
                          ),
                          TextButton.icon(
                            style: TextButton.styleFrom(padding: EdgeInsets.zero),
                            icon: const Icon(Icons.add_location_alt_outlined, size: 16, color: Color(0xFFD97706)),
                            label: const Text('Gestionar', style: TextStyle(color: Color(0xFFD97706), fontSize: 12, fontWeight: FontWeight.bold)),
                            onPressed: _irAGestionarDirecciones,
                          ),
                        ],
                      ),
                      const SizedBox(height: 6),
                      if (_direcciones.isEmpty)
                        Container(
                          width: double.infinity,
                          padding: const EdgeInsets.all(14),
                          decoration: BoxDecoration(
                            color: const Color(0xFFD97706).withValues(alpha: 0.1),
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(color: const Color(0xFFD97706).withValues(alpha: 0.3)),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text(
                                'Aún no tienes direcciones registradas en tu cuenta.',
                                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12),
                              ),
                              const SizedBox(height: 6),
                              ElevatedButton.icon(
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: const Color(0xFFD97706),
                                  foregroundColor: Colors.white,
                                  visualDensity: VisualDensity.compact,
                                ),
                                icon: const Icon(Icons.add_location_alt, size: 16),
                                label: const Text('Registrar mi dirección ahora'),
                                onPressed: _irAGestionarDirecciones,
                              ),
                            ],
                          ),
                        )
                      else
                        ..._direcciones.map(
                          (d) {
                            final id = d['id'] as int;
                            final alias = d['alias'] ?? 'Dirección';
                            final dirTexto = d['direccion_texto'] ?? '';
                            final ciudad = d['ciudad'] ?? '';
                            final depto = d['departamento'] ?? '';
                            final esPredet = d['es_predeterminada'] == true;

                            return RadioListTile<int>(
                              contentPadding: EdgeInsets.zero,
                              dense: true,
                              activeColor: const Color(0xFFD97706),
                              title: Row(
                                children: [
                                  Text(alias, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
                                  if (esPredet) ...[
                                    const SizedBox(width: 6),
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                      decoration: BoxDecoration(
                                        color: const Color(0xFFD97706).withValues(alpha: 0.15),
                                        borderRadius: BorderRadius.circular(4),
                                      ),
                                      child: const Text(
                                        'Predeterminada',
                                        style: TextStyle(color: Color(0xFFD97706), fontSize: 9.5, fontWeight: FontWeight.bold),
                                      ),
                                    ),
                                  ],
                                ],
                              ),
                              subtitle: Text(
                                '$dirTexto ($ciudad, $depto)',
                                style: TextStyle(
                                  fontSize: 11,
                                  color: isDark ? const Color(0xFF9CA3AF) : Colors.grey.shade600,
                                ),
                              ),
                              value: id,
                              groupValue: _direccionSeleccionada[empresa.id],
                              onChanged: (v) => setState(() => _direccionSeleccionada[empresa.id] = v!),
                            );
                          },
                        ),
                    ],
                  ],
                ),
              ),
            ),
          ],

          const SizedBox(height: 10),
          const Text(
            'Método de pago',
            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
          ),
          const SizedBox(height: 4),
          Text(
            'Selecciona cómo deseas pagar tu compra:',
            style: TextStyle(
              fontSize: 12,
              color: isDark ? const Color(0xFF9CA3AF) : Colors.grey,
            ),
          ),
          const SizedBox(height: 12),

          // Selector de método de pago: QR vs PayPal
          Row(
            children: [
              Expanded(
                child: _buildBotonModalidad(
                  label: 'Pago por QR',
                  icon: Icons.qr_code_2,
                  seleccionado: _metodoSeleccionado == 'QR',
                  onTap: () {
                    setState(() => _metodoSeleccionado = 'QR');
                  },
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _buildBotonModalidad(
                  label: 'PayPal',
                  icon: Icons.payment,
                  seleccionado: _metodoSeleccionado == 'PAYPAL',
                  onTap: () {
                    setState(() => _metodoSeleccionado = 'PAYPAL');
                  },
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),

          // DETALLE SEGÚN EL MÉTODO SELECCIONADO
          if (_metodoSeleccionado == 'QR') ...[
            // Banner de instrucciones
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: const Color(0xFF3B82F6).withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFF3B82F6).withValues(alpha: 0.3)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Row(
                    children: [
                      Icon(Icons.info_outline, color: Color(0xFF3B82F6), size: 18),
                      SizedBox(width: 8),
                      Text(
                        'Instrucciones de pago por QR:',
                        style: TextStyle(color: Color(0xFF3B82F6), fontWeight: FontWeight.bold, fontSize: 13),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Text(
                    '1. Escanea el código QR desde tu app bancaria (Banco SOL, BCP, BNB, etc.) y transfiere el monto indicado.\n2. Sube la foto o captura del comprobante abajo para que el vendedor verifique tu pago y confirme la venta.',
                    style: TextStyle(
                      fontSize: 11.5,
                      color: isDark ? const Color(0xFF93C5FD) : const Color(0xFF1E40AF),
                      height: 1.4,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 14),

            // Mostrar el QR y datos de cuenta por cada tienda
            for (final empresa in empresas) ...[
              Builder(
                builder: (context) {
                  final metodos = _metodosPagoPorEmpresa[empresa.id] ?? [];
                  final metodosQR = metodos.where((m) => m['tipo'] == 'QR' || m['tipo'] == 'CUENTA_BANCARIA').toList();
                  final subtotalEmpresa = cart.items
                      .where((it) => it.producto.empresaId == empresa.id)
                      .fold(0.0, (acc, it) => acc + (it.producto.precioDescuento ?? it.producto.precio) * it.cantidad);

                  return Container(
                    margin: const EdgeInsets.only(bottom: 12),
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: cardBg,
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: borderColor),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Expanded(
                              child: Text(
                                empresa.nombre,
                                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                              ),
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                              decoration: BoxDecoration(
                                color: const Color(0xFFD97706).withValues(alpha: 0.15),
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: Text(
                                'Monto: Bs ${subtotalEmpresa.toStringAsFixed(2)}',
                                style: const TextStyle(color: Color(0xFFD97706), fontWeight: FontWeight.bold, fontSize: 11),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 10),
                        if (metodosQR.isEmpty)
                          Text(
                            'Esta tienda no tiene un QR cargado públicamente. Si coordinaste el pago directo con el vendedor, adjunta tu comprobante a continuación.',
                            style: TextStyle(fontSize: 11.5, color: isDark ? const Color(0xFF9CA3AF) : Colors.grey.shade600, fontStyle: FontStyle.italic),
                          )
                        else
                          for (final m in metodosQR) ...[
                            if (m['imagen_qr_url'] != null && m['imagen_qr_url'].toString().isNotEmpty) ...[
                              Center(
                                child: Container(
                                  padding: const EdgeInsets.all(8),
                                  decoration: BoxDecoration(
                                    color: Colors.white,
                                    borderRadius: BorderRadius.circular(12),
                                    border: Border.all(color: Colors.grey.shade300),
                                    boxShadow: [
                                      BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: 6, offset: const Offset(0, 2)),
                                    ],
                                  ),
                                  child: Image.network(
                                    m['imagen_qr_url'],
                                    height: 180,
                                    width: 180,
                                    fit: BoxFit.contain,
                                    errorBuilder: (context, error, stackTrace) => const Icon(Icons.qr_code_scanner, size: 60, color: Colors.grey),
                                  ),
                                ),
                              ),
                              const SizedBox(height: 8),
                            ],
                            Center(
                              child: Text(
                                m['nombre'] ?? 'Pago QR',
                                style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
                              ),
                            ),
                            const SizedBox(height: 4),
                            if (m['banco'] != null && m['banco'].toString().isNotEmpty)
                              Text('Banco: ${m['banco']}', style: TextStyle(fontSize: 12, color: isDark ? const Color(0xFF9CA3AF) : Colors.grey.shade700)),
                            if (m['numero_cuenta'] != null && m['numero_cuenta'].toString().isNotEmpty)
                              SelectableText('N° Cuenta: ${m['numero_cuenta']}', style: TextStyle(fontSize: 12, color: isDark ? const Color(0xFF9CA3AF) : Colors.grey.shade700, fontWeight: FontWeight.w500)),
                            if (m['titular'] != null && m['titular'].toString().isNotEmpty)
                              Text('Titular: ${m['titular']}', style: TextStyle(fontSize: 12, color: isDark ? const Color(0xFF9CA3AF) : Colors.grey.shade700)),
                            const SizedBox(height: 6),
                          ],
                      ],
                    ),
                  );
                },
              ),
            ],

            // SECCIÓN SUBIR COMPROBANTE
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: cardBg,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(
                  color: _comprobanteFoto != null ? const Color(0xFF10B981) : borderColor,
                  width: _comprobanteFoto != null ? 1.5 : 1,
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'Comprobante de pago',
                        style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                      ),
                      Text(
                        _comprobanteFoto != null ? '✓ Adjuntado' : '* Requerido',
                        style: TextStyle(
                          color: _comprobanteFoto != null ? const Color(0xFF10B981) : const Color(0xFFD97706),
                          fontWeight: FontWeight.bold,
                          fontSize: 11,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Sube la captura de pantalla o foto del comprobante de transferencia.',
                    style: TextStyle(fontSize: 11, color: isDark ? const Color(0xFF9CA3AF) : Colors.grey.shade600),
                  ),
                  const SizedBox(height: 10),

                  if (_comprobanteFoto != null) ...[
                    Center(
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(10),
                        child: Image.file(
                          File(_comprobanteFoto!.path),
                          height: 170,
                          fit: BoxFit.cover,
                        ),
                      ),
                    ),
                    const SizedBox(height: 10),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        OutlinedButton.icon(
                          style: OutlinedButton.styleFrom(visualDensity: VisualDensity.compact),
                          icon: const Icon(Icons.refresh, size: 16),
                          label: const Text('Cambiar'),
                          onPressed: _mostrarOpcionesComprobante,
                        ),
                        const SizedBox(width: 10),
                        TextButton.icon(
                          style: TextButton.styleFrom(foregroundColor: Colors.red, visualDensity: VisualDensity.compact),
                          icon: const Icon(Icons.delete_outline, size: 16),
                          label: const Text('Eliminar'),
                          onPressed: () => setState(() => _comprobanteFoto = null),
                        ),
                      ],
                    ),
                  ] else ...[
                    InkWell(
                      onTap: _mostrarOpcionesComprobante,
                      borderRadius: BorderRadius.circular(10),
                      child: Container(
                        width: double.infinity,
                        padding: const EdgeInsets.symmetric(vertical: 20, horizontal: 16),
                        decoration: BoxDecoration(
                          color: isDark ? const Color(0xFF111827) : const Color(0xFFF3F4F6),
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(
                            color: isDark ? const Color(0xFF374151) : const Color(0xFFD1D5DB),
                            style: BorderStyle.solid,
                          ),
                        ),
                        child: Column(
                          children: [
                            const Icon(Icons.cloud_upload_outlined, size: 36, color: Color(0xFFD97706)),
                            const SizedBox(height: 8),
                            const Text(
                              'Toca aquí para subir tu comprobante',
                              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              'Cámara o Galería (JPG, PNG)',
                              style: TextStyle(fontSize: 11, color: isDark ? const Color(0xFF9CA3AF) : Colors.grey),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ],
              ),
            ),
            const SizedBox(height: 16),
          ],

          if (_metodoSeleccionado == 'PAYPAL') ...[
            for (final empresa in empresas) ...[
              Builder(
                builder: (context) {
                  final metodos = _metodosPagoPorEmpresa[empresa.id] ?? [];
                  final metodosPaypal = metodos.where((m) => m['tipo'] == 'PAYPAL').toList();
                  if (metodosPaypal.isEmpty) return const SizedBox.shrink();
                  return Container(
                    margin: const EdgeInsets.only(bottom: 10),
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: cardBg,
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: borderColor),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.account_balance_wallet_outlined, size: 16, color: Color(0xFFD97706)),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            '${empresa.nombre}: ${metodosPaypal.map((m) => m['referencia_pasarela'] ?? m['nombre']).join(', ')}',
                            style: const TextStyle(fontSize: 11.5),
                          ),
                        ),
                      ],
                    ),
                  );
                },
              ),
            ],
            Text(
              'Se cobrará en USD al tipo de cambio oficial (Bs 6.96 / USD).',
              style: TextStyle(fontSize: 12, color: isDark ? const Color(0xFF9CA3AF) : Colors.grey),
            ),
            const SizedBox(height: 14),
          ],

          const SizedBox(height: 4),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('Total a pagar', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w500)),
              Text(
                'Bs ${cart.subtotal.toStringAsFixed(2)}',
                style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w900, color: Color(0xFFD97706)),
              ),
            ],
          ),
          if (_error != null) ...[
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              decoration: BoxDecoration(
                color: Colors.red.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: Colors.red.shade300),
              ),
              child: Text(_error!, style: const TextStyle(color: Colors.red, fontSize: 13)),
            ),
          ],
          const SizedBox(height: 16),

          // Botón principal de pago según método seleccionado
          if (_metodoSeleccionado == 'QR') ...[
            FilledButton.icon(
              icon: const Icon(Icons.check_circle_outline, size: 20),
              style: FilledButton.styleFrom(
                backgroundColor: const Color(0xFFD97706),
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(999)),
              ),
              onPressed: _procesando ? null : _pagarConQR,
              label: _procesando
                  ? const SizedBox(
                      height: 20,
                      width: 20,
                      child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                    )
                  : Text(
                      'Confirmar pedido con comprobante (Bs ${cart.subtotal.toStringAsFixed(2)})',
                      style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Colors.white),
                    ),
            ),
          ] else ...[
            FilledButton.icon(
              icon: const Icon(Icons.payment, size: 20),
              style: FilledButton.styleFrom(
                backgroundColor: const Color(0xFFD97706),
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(999)),
              ),
              onPressed: (_procesando || _confirmando) ? null : _pagar,
              label: _procesando
                  ? const SizedBox(
                      height: 20,
                      width: 20,
                      child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                    )
                  : Text(
                      _mostrarPaypalInline ? 'Reiniciar pasarela PayPal' : 'Pagar con PayPal',
                      style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white),
                    ),
            ),

            // RECUADRO INLINE DE PAYPAL DIRECTO EN LA MISMA INTERFAZ
            if (_mostrarPaypalInline && _webViewController != null) ...[
              const SizedBox(height: 20),
              _buildRecuadroPaypal(isDark),
            ],
          ],

          const SizedBox(height: 40),
        ],
      ),
    );
  }

  Widget _buildBotonModalidad({
    required String label,
    required IconData icon,
    required bool seleccionado,
    required VoidCallback onTap,
  }) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final colorActivo = const Color(0xFFD97706);

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(10),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 8),
        decoration: BoxDecoration(
          color: seleccionado
              ? colorActivo.withValues(alpha: 0.15)
              : (isDark ? const Color(0xFF111827) : const Color(0xFFF3F4F6)),
          borderRadius: BorderRadius.circular(10),
          border: Border.all(
            color: seleccionado ? colorActivo : (isDark ? const Color(0xFF374151) : const Color(0xFFD1D5DB)),
            width: seleccionado ? 1.5 : 1,
          ),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, size: 18, color: seleccionado ? colorActivo : (isDark ? Colors.white70 : Colors.black87)),
            const SizedBox(width: 6),
            Flexible(
              child: Text(
                label,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: seleccionado ? FontWeight.bold : FontWeight.w500,
                  color: seleccionado ? colorActivo : (isDark ? Colors.white : Colors.black87),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  /// Recuadro embebido que carga el login de PayPal directamente debajo del botón
  Widget _buildRecuadroPaypal(bool isDark) {
    final frameBorderColor = isDark ? const Color(0xFFD97706) : const Color(0xFFB45309);
    final headerBg = isDark ? const Color(0xFF1F2937) : const Color(0xFFF3F4F6);

    return Container(
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF111827) : Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: frameBorderColor, width: 2),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.25),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Cabecera del recuadro
          Container(
            color: headerBg,
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            child: Row(
              children: [
                const Icon(Icons.security, color: Color(0xFFD97706), size: 20),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    'Pasarela Segura de PayPal',
                    style: TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 13,
                      color: isDark ? Colors.white : const Color(0xFF111827),
                    ),
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.close, size: 20),
                  tooltip: 'Cerrar pasarela',
                  padding: EdgeInsets.zero,
                  constraints: const BoxConstraints(),
                  onPressed: () {
                    setState(() {
                      _mostrarPaypalInline = false;
                      _webViewController = null;
                    });
                  },
                ),
              ],
            ),
          ),

          // Barra de progreso de carga de PayPal
          if (_progresoWeb < 100)
            LinearProgressIndicator(
              value: _progresoWeb / 100.0,
              backgroundColor: Colors.transparent,
              color: const Color(0xFFD97706),
              minHeight: 3,
            ),

          // Contenedor con el WebView de PayPal dentro del recuadro
          SizedBox(
            height: 520,
            child: Stack(
              children: [
                WebViewWidget(controller: _webViewController!),

                // Overlay de confirmación en progreso
                if (_confirmando)
                  Container(
                    color: Colors.black.withValues(alpha: 0.8),
                    child: const Center(
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          CircularProgressIndicator(color: Color(0xFFD97706)),
                          SizedBox(height: 16),
                          Text(
                            'Confirmando pago con VecinoMarket...',
                            style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 15),
                          ),
                          SizedBox(height: 6),
                          Text(
                            'Por favor espera un momento.',
                            style: TextStyle(color: Colors.white70, fontSize: 13),
                          ),
                        ],
                      ),
                    ),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
