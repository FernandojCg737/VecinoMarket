import 'dart:async';
import 'package:app_links/app_links.dart';
import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../services/api_client.dart';
import '../services/pedido_service.dart';

/// La web usa el SDK de JS de PayPal (popup manejado por PayPal mismo). En
/// móvil, PayPal bloquea a propósito su checkout dentro de un WebView
/// embebido (medida antifraude: no completa el pago, el botón se queda
/// "cargando" para siempre -- se probó con webview_flutter y quedó
/// confirmado). Se usa un Custom Tab (LaunchMode.inAppBrowserView): es el
/// navegador real -- PayPal no lo bloquea -- pero se desliza encima de la
/// app en vez de cambiar a Chrome como otra app aparte.
///
/// A diferencia de la primera versión, acá no hay botón de "ya pagué":
/// IniciarCheckoutView (backend) le pide a PayPal que, al aprobar el pago,
/// redirija a vecinomarket://pago-exitoso -- un deep link que Android
/// intercepta y trae de vuelta a la app sola (ver el intent-filter en
/// AndroidManifest.xml). Ese link dispara la confirmación automáticamente.
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

  bool _confirmando = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _sub = _appLinks.uriLinkStream.listen(_alRecibirLink, onError: (_) {});
    // Se abre solo al entrar, para que el comprador no tenga que buscar el botón.
    WidgetsBinding.instance.addPostFrameCallback((_) => _abrirPaypal());
  }

  @override
  void dispose() {
    _sub?.cancel();
    super.dispose();
  }

  void _alRecibirLink(Uri uri) {
    if (uri.scheme != 'vecinomarket') return;
    if (uri.host == 'pago-exitoso') {
      _confirmar();
    } else if (uri.host == 'pago-cancelado') {
      setState(() => _error = 'Cancelaste el pago en PayPal.');
    }
  }

  Future<void> _abrirPaypal() async {
    final uri = Uri.parse(widget.enlaceAprobacion);
    final abierto = await launchUrl(
      uri,
      mode: LaunchMode.inAppBrowserView,
      browserConfiguration: const BrowserConfiguration(showTitle: true),
    );
    if (!abierto && mounted) {
      setState(() => _error = 'No se pudo abrir PayPal. Intenta de nuevo.');
    }
  }

  Future<void> _confirmar() async {
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
      if (resultado['aprobado'] == true) {
        Navigator.pop(context, true);
      } else {
        setState(() => _error = 'PayPal no aprobó el pago. Vuelve a intentar.');
      }
    } on ApiException catch (e) {
      setState(() => _error = e.mensaje);
    } finally {
      if (mounted) setState(() => _confirmando = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Pagar con PayPal'),
        leading: IconButton(
          icon: const Icon(Icons.close),
          tooltip: 'Cancelar',
          onPressed: () => Navigator.pop(context, false),
        ),
      ),
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            if (_confirmando) ...[
              const Center(child: CircularProgressIndicator()),
              const SizedBox(height: 16),
              const Text('Confirmando tu pago...', textAlign: TextAlign.center),
            ] else ...[
              const Icon(Icons.account_balance_wallet_outlined, size: 64, color: Colors.grey),
              const SizedBox(height: 16),
              const Text(
                'Completa tu pago en la pantalla de PayPal. En cuanto lo apruebes, '
                'vuelves acá solo y se confirma automáticamente.',
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 16),
              OutlinedButton.icon(
                onPressed: _abrirPaypal,
                icon: const Icon(Icons.open_in_new),
                label: const Text('Abrir PayPal de nuevo'),
              ),
            ],
            if (_error != null) ...[
              const SizedBox(height: 16),
              Text(_error!, style: const TextStyle(color: Colors.red), textAlign: TextAlign.center),
            ],
          ],
        ),
      ),
    );
  }
}
