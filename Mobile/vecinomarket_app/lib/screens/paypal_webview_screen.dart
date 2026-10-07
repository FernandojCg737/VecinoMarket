import 'dart:async';
import 'package:app_links/app_links.dart';
import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:webview_flutter/webview_flutter.dart';
import '../services/api_client.dart';
import '../services/pedido_service.dart';

/// Pantalla de pago embebida con WebView in-app. Permite completar la transacción
/// de PayPal directamente dentro de la aplicación móvil sin salir a Chrome.
class PaypalWebviewScreen extends StatefulWidget {
  const PaypalWebviewScreen({
    super.key,
    required this.enlaceAprobacion,
    required this.ordenCompraId,
    required this.paypalOrderId,
  });

  final String enlaceAprobacion;
  final int ordenCompraId;
  final String paypalOrderId;

  @override
  State<PaypalWebviewScreen> createState() => _PaypalWebviewScreenState();
}

class _PaypalWebviewScreenState extends State<PaypalWebviewScreen> {
  final _pedidoService = PedidoService();
  final _appLinks = AppLinks();
  StreamSubscription<Uri>? _sub;

  late final WebViewController _controller;
  int _progresoCarga = 0;
  bool _confirmando = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _sub = _appLinks.uriLinkStream.listen(_alRecibirLink, onError: (_) {});
    _iniciarWebView();
  }

  @override
  void dispose() {
    _sub?.cancel();
    super.dispose();
  }

  void _iniciarWebView() {
    final controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setUserAgent(
        'Mozilla/5.0 (Linux; Android 13; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
      )
      ..setNavigationDelegate(
        NavigationDelegate(
          onProgress: (progreso) {
            if (mounted) setState(() => _progresoCarga = progreso);
          },
          onNavigationRequest: (request) {
            final url = request.url;
            final uri = Uri.tryParse(url);

            // Interceptar redirecciones de éxito o cancelación
            if (url.startsWith('vecinomarket://pago-exitoso') ||
                (uri != null && uri.scheme == 'vecinomarket' && uri.host == 'pago-exitoso') ||
                url.contains('pago-exitoso')) {
              _confirmar();
              return NavigationDecision.prevent;
            }

            if (url.startsWith('vecinomarket://pago-cancelado') ||
                (uri != null && uri.scheme == 'vecinomarket' && uri.host == 'pago-cancelado') ||
                url.contains('pago-cancelado')) {
              setState(() => _error = 'Cancelaste el pago en PayPal.');
              return NavigationDecision.prevent;
            }

            return NavigationDecision.navigate;
          },
        ),
      )
      ..loadRequest(Uri.parse(widget.enlaceAprobacion));

    _controller = controller;
  }

  void _alRecibirLink(Uri uri) {
    if (uri.scheme != 'vecinomarket') return;
    if (uri.host == 'pago-exitoso') {
      _confirmar();
    } else if (uri.host == 'pago-cancelado') {
      setState(() => _error = 'Cancelaste el pago en PayPal.');
    }
  }

  Future<void> _abrirEnNavegador() async {
    final uri = Uri.parse(widget.enlaceAprobacion);
    await launchUrl(uri, mode: LaunchMode.externalApplication);
  }

  Future<void> _confirmar() async {
    if (_confirmando) return;
    setState(() {
      _confirmando = true;
      _error = null;
    });

    try {
      final resultado = await _pedidoService.confirmarPago(
        ordenCompraId: widget.ordenCompraId,
        paypalOrderId: widget.paypalOrderId,
      );

      if (!mounted) return;

      // Se verifica tanto 'aprobado': true como la presencia de 'orden_compra_id'
      if (resultado['aprobado'] == true || resultado['orden_compra_id'] != null) {
        Navigator.pop(context, true);
      } else {
        setState(() => _error = 'PayPal no aprobó el pago. Vuelve a intentar.');
      }
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.mensaje);
    } catch (_) {
      if (mounted) setState(() => _error = 'No se pudo confirmar la transacción.');
    } finally {
      if (mounted) setState(() => _confirmando = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final bgColor = isDark ? const Color(0xFF111827) : Colors.white;

    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, result) async {
        if (didPop || _confirmando) return;
        final salir = await showDialog<bool>(
          context: context,
          builder: (ctx) => AlertDialog(
            title: const Text('¿Cancelar pago?'),
            content: const Text('Si sales ahora, la transacción no se completará.'),
            actions: [
              TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Continuar pagando')),
              FilledButton(
                style: FilledButton.styleFrom(backgroundColor: Colors.red),
                onPressed: () => Navigator.pop(ctx, true),
                child: const Text('Salir'),
              ),
            ],
          ),
        );
        if (salir == true && context.mounted) {
          Navigator.pop(context, false);
        }
      },
      child: Scaffold(
        backgroundColor: bgColor,
        appBar: AppBar(
          title: const Text('Pago seguro con PayPal', style: TextStyle(fontSize: 17, fontWeight: FontWeight.bold)),
          leading: IconButton(
            icon: const Icon(Icons.close),
            tooltip: 'Cancelar',
            onPressed: () => Navigator.maybePop(context, false),
          ),
          actions: [
            IconButton(
              icon: const Icon(Icons.refresh),
              tooltip: 'Recargar',
              onPressed: () => _controller.reload(),
            ),
            IconButton(
              icon: const Icon(Icons.open_in_browser),
              tooltip: 'Abrir en navegador externo',
              onPressed: _abrirEnNavegador,
            ),
          ],
          bottom: _progresoCarga < 100
              ? PreferredSize(
                  preferredSize: const Size.fromHeight(3),
                  child: LinearProgressIndicator(
                    value: _progresoCarga / 100.0,
                    backgroundColor: Colors.transparent,
                    color: const Color(0xFFD97706),
                  ),
                )
              : null,
        ),
        body: Stack(
          children: [
            // Vista web in-app de PayPal
            WebViewWidget(controller: _controller),

            // Banner superior de error si ocurrió algún inconveniente
            if (_error != null)
              Positioned(
                top: 0,
                left: 0,
                right: 0,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  color: Colors.red.shade900.withValues(alpha: 0.95),
                  child: Row(
                    children: [
                      const Icon(Icons.error_outline, color: Colors.white, size: 22),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          _error!,
                          style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w600),
                        ),
                      ),
                      IconButton(
                        icon: const Icon(Icons.close, color: Colors.white, size: 18),
                        onPressed: () => setState(() => _error = null),
                        padding: EdgeInsets.zero,
                        constraints: const BoxConstraints(),
                      ),
                    ],
                  ),
                ),
              ),

            // Modal de confirmación en curso
            if (_confirmando)
              Container(
                color: Colors.black.withValues(alpha: 0.7),
                child: const Center(
                  child: Card(
                    margin: EdgeInsets.all(32),
                    color: Color(0xFF1F2937),
                    child: Padding(
                      padding: EdgeInsets.symmetric(horizontal: 24, vertical: 28),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          CircularProgressIndicator(color: Color(0xFFD97706)),
                          SizedBox(height: 20),
                          Text(
                            'Confirmando pago con VecinoMarket...',
                            textAlign: TextAlign.center,
                            style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold),
                          ),
                          SizedBox(height: 8),
                          Text(
                            'Estamos registrando tu compra de forma segura.',
                            textAlign: TextAlign.center,
                            style: TextStyle(color: Color(0xFF9CA3AF), fontSize: 13),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
