import 'dart:convert';
import 'package:http/http.dart' as http;
import '../models/pedido.dart';
import '../models/sucursal.dart';
import 'api_client.dart';

/// CU12/CU26: checkout real (crear orden + PayPal o QR con comprobante) e historial de compras.
class PedidoService {
  Future<List<Sucursal>> obtenerSucursales(int empresaId) async {
    final data = await ApiClient.instance.get(
      'inventario/sucursales/',
      params: {'empresa': empresaId},
      autenticado: false,
    ) as List<dynamic>;
    return data.map((s) => Sucursal.fromJson(s as Map<String, dynamic>)).toList();
  }

  /// Métodos de pago registrados por la empresa (QR, cuentas bancarias, PayPal).
  Future<List<dynamic>> obtenerMetodosPagoEmpresa(int empresaId) async {
    try {
      final data = await ApiClient.instance.get(
        'facturacion/empresas/$empresaId/metodos-pago/',
        autenticado: false,
      ) as List<dynamic>;
      return data;
    } catch (_) {
      return [];
    }
  }

  /// `entregas` es un mapa `{ "<empresaId>": {"modalidad": "RECOJO_TIENDA", "sucursal_id": 3} }`.
  /// Devuelve `{orden_compra_id, paypal_order_id, monto_usd, enlace_aprobacion_paypal}`.
  Future<Map<String, dynamic>> iniciarCheckout({
    required List<Map<String, dynamic>> items,
    required Map<String, dynamic> entregas,
  }) async {
    final data = await ApiClient.instance.post('pedidos/checkout/', {
      'items': items,
      'entregas': entregas,
      'metodo_pago': 'PAYPAL',
      // Le dice al backend que arme el link de PayPal con un deep link de
      // vuelta (vecinomarket://pago-exitoso) en vez del flujo del popup web.
      'plataforma': 'movil',
    }, autenticado: true);
    return data as Map<String, dynamic>;
  }

  /// Checkout con pago QR y comprobante adjunto
  Future<Map<String, dynamic>> iniciarCheckoutQR({
    required List<Map<String, dynamic>> items,
    required Map<String, dynamic> entregas,
    required String rutaComprobante,
  }) async {
    final multipartFile = await http.MultipartFile.fromPath('comprobante', rutaComprobante);
    final data = await ApiClient.instance.postMultipart(
      'pedidos/checkout/',
      fields: {
        'items': jsonEncode(items),
        'entregas': jsonEncode(entregas),
        'metodo_pago': 'QR',
        'plataforma': 'movil',
      },
      files: [multipartFile],
      autenticado: true,
    );
    return data as Map<String, dynamic>;
  }

  /// Segundo paso: confirma/captura el pago después de que el comprador
  /// aprobó en el WebView de PayPal. Devuelve `{aprobado: bool, ...}`.
  Future<Map<String, dynamic>> confirmarPago({
    required int ordenCompraId,
    required String paypalOrderId,
  }) async {
    final data = await ApiClient.instance.post(
      'pedidos/checkout/$ordenCompraId/confirmar/',
      {'paypal_order_id': paypalOrderId},
      autenticado: true,
    );
    return data as Map<String, dynamic>;
  }

  Future<List<Pedido>> obtenerMisCompras() async {
    final data = await ApiClient.instance.get('pedidos/mis-compras/', params: {'page_size': 50});
    final results = data['results'] as List<dynamic>;
    return results.map((p) => Pedido.fromJson(p as Map<String, dynamic>)).toList();
  }
}
