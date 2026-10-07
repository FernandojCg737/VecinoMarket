import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/producto.dart';
import '../services/auth_service.dart';
import '../services/cart_service.dart';
import '../services/chat_service.dart';
import '../services/notificacion_service.dart';
import '../services/theme_service.dart';
import 'notifications_screen.dart';
import 'auth_screen.dart';
import 'cart_screen.dart';
import 'chat_screen.dart';
import 'company_catalog_screen.dart';
import 'live_commerce_screen.dart';
import '../widgets/notification_badge_button.dart';
import 'profile_screen.dart';

class ProductDetailScreen extends StatefulWidget {
  const ProductDetailScreen({super.key, required this.producto});
  final Producto producto;

  @override
  State<ProductDetailScreen> createState() => _ProductDetailScreenState();
}

class _ProductDetailScreenState extends State<ProductDetailScreen> {
  int _cantidad = 1;
  int _paginaImagen = 0;
  bool _mostrarChatbot = false;

  final _busquedaHeaderCtrl = TextEditingController();
  final _chatbotPreguntaCtrl = TextEditingController();
  final _chatService = ChatService();
  final List<Map<String, String>> _historialChatbot = [];
  bool _enviandoChatbot = false;

  static const Color _brandGold = Color(0xFFD97706);
  static const Color _brandGoldLight = Color(0xFFF59E0B);
  static const Color _greenStore = Color(0xFF10B981);

  @override
  void dispose() {
    _busquedaHeaderCtrl.dispose();
    _chatbotPreguntaCtrl.dispose();
    super.dispose();
  }

  void _irAChat() {
    final p = widget.producto;
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => ChatScreen(
          empresaId: p.empresaId,
          empresaNombre: p.empresaNombre,
        ),
      ),
    );
  }

  void _irACatalogoEmpresa() {
    final p = widget.producto;
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => CompanyCatalogScreen(
          empresaId: p.empresaId,
          empresaNombre: p.empresaNombre,
          empresaCiudad: p.empresaCiudad,
        ),
      ),
    );
  }

  void _mostrarDialogoRequerirLogin(BuildContext context) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        icon: const Icon(Icons.lock_outline, size: 40, color: _brandGold),
        title: const Text(
          'Inicia sesión para continuar',
          textAlign: TextAlign.center,
          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
        ),
        content: const Text(
          'Para agregar productos a tu carrito debes iniciar sesión con tu cuenta de comprador.',
          textAlign: TextAlign.center,
          style: TextStyle(fontSize: 14),
        ),
        actionsAlignment: MainAxisAlignment.center,
        actions: [
          OutlinedButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancelar'),
          ),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: _brandGold),
            onPressed: () {
              Navigator.pop(ctx);
              Navigator.push(context, MaterialPageRoute(builder: (_) => const AuthScreen()));
            },
            child: const Text('Iniciar sesión', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }

  Future<void> _preguntarAlChatbot(String preguntaTexto) async {
    final pregunta = preguntaTexto.trim();
    if (pregunta.isEmpty || _enviandoChatbot) return;

    final p = widget.producto;
    final auth = context.read<AuthService>();
    final isAuth = auth.usuario != null;

    setState(() {
      _historialChatbot.add({'autor': 'yo', 'texto': pregunta});
      _enviandoChatbot = true;
    });
    _chatbotPreguntaCtrl.clear();

    try {
      final respuesta = await _chatService.preguntarChatbot(
        empresaId: p.empresaId,
        empresaNombre: p.empresaNombre,
        pregunta: pregunta,
        autenticado: isAuth,
      );
      if (mounted) {
        setState(() {
          _historialChatbot.add({'autor': 'bot', 'texto': respuesta});
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _historialChatbot.add({
            'autor': 'bot',
            'texto': 'Ocurrió un inconveniente al consultar al asistente. Por favor, intenta de nuevo.',
          });
        });
      }
    } finally {
      if (mounted) setState(() => _enviandoChatbot = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final p = widget.producto;
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final bgColor = isDark ? const Color(0xFF111827) : Colors.white;

    return Scaffold(
      backgroundColor: bgColor,
      body: SafeArea(
        child: Column(
          children: [
            // TOP HEADER RESPONSIVO (Idéntico a Captura 2)
            _buildTopHeader(isDark),

            // CONTENIDO DEL PRODUCTO
            Expanded(
              child: LayoutBuilder(
                builder: (context, constraints) {
                  final isWide = constraints.maxWidth >= 768;

                  return SingleChildScrollView(
                    child: Center(
                      child: ConstrainedBox(
                        constraints: BoxConstraints(maxWidth: isWide ? 1000 : double.infinity),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            Padding(
                              padding: EdgeInsets.symmetric(
                                horizontal: isWide ? 32 : 16,
                                vertical: 16,
                              ),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  // 1. MIGAS DE PAN (BREADCRUMBS)
                                  _buildBreadcrumbs(p, isDark),
                                  const SizedBox(height: 16),

                                  // 2. CUERPO PRINCIPAL (RESPONSIVE: 2 COLUMNAS EN TABLET / 1 EN MÓVIL)
                                  if (isWide)
                                    Row(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Expanded(
                                          flex: 5,
                                          child: _buildGallery(p.imagenes, isDark),
                                        ),
                                        const SizedBox(width: 32),
                                        Expanded(
                                          flex: 6,
                                          child: _buildProductInfo(p, isDark),
                                        ),
                                      ],
                                    )
                                  else
                                    Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        _buildGallery(p.imagenes, isDark),
                                        const SizedBox(height: 20),
                                        _buildProductInfo(p, isDark),
                                      ],
                                    ),
                                ],
                              ),
                            ),

                            const SizedBox(height: 32),

                            // 3. PIE DE PÁGINA COMPLETO (FOOTER)
                            _buildFooter(isDark, isWide),
                          ],
                        ),
                      ),
                    ),
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ==========================================
  // 1. BREADCRUMBS
  // ==========================================
  Widget _buildBreadcrumbs(Producto p, bool isDark) {
    final textStyle = TextStyle(
      fontSize: 13,
      color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
    );
    final activeStyle = TextStyle(
      fontSize: 13,
      fontWeight: FontWeight.w600,
      color: isDark ? Colors.white : const Color(0xFF0F172A),
    );

    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(
        children: [
          Text('Inicio', style: textStyle),
          Text(' / ', style: textStyle),
          Text(p.categoriaNombre ?? 'Catálogo', style: textStyle),
          Text(' / ', style: textStyle),
          Text(p.nombre, style: activeStyle),
        ],
      ),
    );
  }

  // ==========================================
  // 2. GALERÍA DE IMÁGENES
  // ==========================================
  Widget _buildGallery(List<String> imagenes, bool isDark) {
    final borderColor = isDark ? const Color(0xFF1E293B) : const Color(0xFFE2E8F0);
    final cardBg = isDark ? const Color(0xFF141C2E) : Colors.white;

    if (imagenes.isEmpty) {
      return Container(
        height: 320,
        decoration: BoxDecoration(
          color: cardBg,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: borderColor),
        ),
        alignment: Alignment.center,
        child: Icon(Icons.image_not_supported_outlined, size: 56, color: Colors.grey.shade400),
      );
    }

    return Column(
      children: [
        Container(
          decoration: BoxDecoration(
            color: cardBg,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: borderColor),
            boxShadow: [
              BoxShadow(
                color: isDark ? const Color(0x4D000000) : const Color(0x0A000000),
                blurRadius: 10,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          clipBehavior: Clip.antiAlias,
          child: AspectRatio(
            aspectRatio: 1,
            child: PageView.builder(
              itemCount: imagenes.length,
              onPageChanged: (i) => setState(() => _paginaImagen = i),
              itemBuilder: (context, i) {
                return Image.network(
                  imagenes[i],
                  fit: BoxFit.contain,
                  errorBuilder: (context, error, stackTrace) => Center(
                    child: Icon(Icons.broken_image_outlined, size: 48, color: Colors.grey.shade400),
                  ),
                );
              },
            ),
          ),
        ),
        if (imagenes.length > 1) ...[
          const SizedBox(height: 12),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: List.generate(imagenes.length, (i) {
              final activa = i == _paginaImagen;
              return AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                margin: const EdgeInsets.symmetric(horizontal: 4),
                width: activa ? 16 : 8,
                height: 8,
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(4),
                  color: activa ? _brandGold : (isDark ? Colors.grey.shade700 : Colors.grey.shade300),
                ),
              );
            }),
          ),
        ],
      ],
    );
  }

  // ==========================================
  // 3. INFORMACIÓN DEL PRODUCTO & ACCIONES
  // ==========================================
  Widget _buildProductInfo(Producto p, bool isDark) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // BADGE DE LA TIENDA (Navega a catálogo completo de la empresa)
        InkWell(
          onTap: _irACatalogoEmpresa,
          borderRadius: BorderRadius.circular(6),
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 2),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.storefront_outlined, size: 18, color: _greenStore),
                const SizedBox(width: 6),
                Text(
                  p.empresaNombre,
                  style: const TextStyle(
                    color: _greenStore,
                    fontWeight: FontWeight.w700,
                    fontSize: 14,
                  ),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 8),

        // TÍTULO DEL PRODUCTO
        Text(
          p.nombre,
          style: TextStyle(
            fontSize: 26,
            fontWeight: FontWeight.w800,
            color: isDark ? Colors.white : const Color(0xFF0F172A),
            height: 1.2,
          ),
        ),
        const SizedBox(height: 12),

        // PRECIO Y DESCUENTO
        Row(
          crossAxisAlignment: CrossAxisAlignment.baseline,
          textBaseline: TextBaseline.alphabetic,
          children: [
            Text(
              'Bs ${p.tieneDescuento ? p.precioDescuento!.toStringAsFixed(p.precioDescuento! % 1 == 0 ? 0 : 2) : p.precio.toStringAsFixed(p.precio % 1 == 0 ? 0 : 2)}',
              style: const TextStyle(
                fontSize: 30,
                fontWeight: FontWeight.w900,
                color: _brandGoldLight,
                letterSpacing: -0.5,
              ),
            ),
            if (p.tieneDescuento) ...[
              const SizedBox(width: 10),
              Text(
                'Bs ${p.precio.toStringAsFixed(p.precio % 1 == 0 ? 0 : 2)}',
                style: TextStyle(
                  fontSize: 16,
                  color: isDark ? const Color(0xFF64748B) : const Color(0xFF94A3B8),
                  decoration: TextDecoration.lineThrough,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
          ],
        ),
        const SizedBox(height: 16),

        // DESCRIPCIÓN
        Text(
          p.descripcion,
          style: TextStyle(
            fontSize: 14,
            color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF475569),
            height: 1.5,
          ),
        ),
        const SizedBox(height: 20),

        // SELECTOR DE CANTIDAD + STOCK DISPONIBLE
        Row(
          children: [
            _buildSelectorCantidad(p, isDark),
            const SizedBox(width: 16),
            Text(
              p.stock > 0 ? '${p.stock} disponibles' : 'Agotado',
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w500,
                color: p.stock > 0
                    ? (isDark ? const Color(0xFF64748B) : const Color(0xFF94A3B8))
                    : Colors.redAccent,
              ),
            ),
          ],
        ),
        const SizedBox(height: 24),

        // BOTÓN 1: AGREGAR AL CARRITO
        SizedBox(
          width: double.infinity,
          height: 52,
          child: ElevatedButton.icon(
            icon: const Icon(Icons.shopping_cart_outlined, size: 20, color: Colors.white),
            label: const Text(
              'Agregar al carrito',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white),
            ),
            style: ElevatedButton.styleFrom(
              backgroundColor: _brandGold,
              elevation: 2,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(999)),
            ),
            onPressed: p.stock <= 0
                ? null
                : () {
                    final auth = context.read<AuthService>();
                    if (auth.usuario == null) {
                      _mostrarDialogoRequerirLogin(context);
                      return;
                    }
                    context.read<CartService>().agregar(p, cantidad: _cantidad);
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        behavior: SnackBarBehavior.floating,
                        backgroundColor: const Color(0xFF1E293B),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        content: Row(
                          children: [
                            const Icon(Icons.check_circle_outline, color: Color(0xFF10B981), size: 20),
                            const SizedBox(width: 10),
                            Expanded(
                              child: Text(
                                '¡${p.nombre} agregado al carrito!',
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 14,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ),
                          ],
                        ),
                        duration: const Duration(seconds: 2),
                      ),
                    );
                  },
          ),
        ),
        const SizedBox(height: 12),

        // BOTÓN 2: CONTACTAR VENDEDOR (OUTLINE) -> Abre pantalla de chat (CU14)
        SizedBox(
          width: double.infinity,
          height: 52,
          child: OutlinedButton.icon(
            icon: const Icon(Icons.chat_bubble_outline, size: 20, color: _brandGold),
            label: const Text(
              'Contactar vendedor',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: _brandGold),
            ),
            style: OutlinedButton.styleFrom(
              side: const BorderSide(color: _brandGold, width: 2),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(999)),
            ),
            onPressed: _irAChat,
          ),
        ),
        const SizedBox(height: 24),

        // GARANTÍAS Y ENVÍO
        Container(
          padding: const EdgeInsets.symmetric(vertical: 8),
          decoration: BoxDecoration(
            border: Border(
              top: BorderSide(color: isDark ? const Color(0xFF1E293B) : const Color(0xFFE2E8F0)),
            ),
          ),
          child: Column(
            children: [
              _buildBenefitRow(
                icon: Icons.local_shipping_outlined,
                text: 'Envío a domicilio o recojo en tienda',
                isDark: isDark,
              ),
              const SizedBox(height: 10),
              _buildBenefitRow(
                icon: Icons.shield_outlined,
                text: 'Compra protegida por VecinoMarket',
                isDark: isDark,
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),

        // TARJETA DE LA TIENDA (SELLER CARD)
        _buildSellerCard(p, isDark),
      ],
    );
  }

  // ==========================================
  // SELECTOR DE CANTIDAD
  // ==========================================
  Widget _buildSelectorCantidad(Producto p, bool isDark) {
    final borderColor = isDark ? const Color(0xFF334155) : const Color(0xFFCBD5E1);

    return Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: borderColor, width: 1.5),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          IconButton(
            icon: const Icon(Icons.remove, size: 18),
            splashRadius: 20,
            color: isDark ? Colors.white : Colors.black87,
            onPressed: _cantidad > 1 ? () => setState(() => _cantidad--) : null,
          ),
          SizedBox(
            width: 32,
            child: Text(
              '$_cantidad',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontWeight: FontWeight.w700,
                fontSize: 16,
                color: isDark ? Colors.white : const Color(0xFF0F172A),
              ),
            ),
          ),
          IconButton(
            icon: const Icon(Icons.add, size: 18),
            splashRadius: 20,
            color: isDark ? Colors.white : Colors.black87,
            onPressed: _cantidad < p.stock ? () => setState(() => _cantidad++) : null,
          ),
        ],
      ),
    );
  }

  Widget _buildBenefitRow({required IconData icon, required String text, required bool isDark}) {
    return Row(
      children: [
        Icon(icon, size: 20, color: _brandGold),
        const SizedBox(width: 10),
        Expanded(
          child: Text(
            text,
            style: TextStyle(
              fontSize: 13,
              color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF475569),
            ),
          ),
        ),
      ],
    );
  }

  // ==========================================
  // TARJETA DE LA TIENDA (SELLER CARD) - Captura 3 y Captura 4
  // ==========================================
  Widget _buildSellerCard(Producto p, bool isDark) {
    final cardBg = isDark ? const Color(0xFF111827) : const Color(0xFFF8FAFC);
    final borderColor = isDark ? const Color(0xFF1E293B) : const Color(0xFFE2E8F0);
    final buttonBg = isDark ? const Color(0xFF1E293B) : Colors.white;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: cardBg,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: borderColor),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Cabecera de la tienda
          Row(
            children: [
              InkWell(
                onTap: _irACatalogoEmpresa,
                borderRadius: BorderRadius.circular(12),
                child: Container(
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(
                    color: isDark ? const Color(0xFF1E293B) : const Color(0xFFFEF3C7),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Icon(Icons.storefront, color: _brandGold, size: 24),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: InkWell(
                  onTap: _irACatalogoEmpresa,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        p.empresaNombre,
                        style: TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.bold,
                          color: isDark ? Colors.white : const Color(0xFF0F172A),
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      Text(
                        p.empresaCiudad,
                        style: TextStyle(
                          fontSize: 12,
                          color: isDark ? const Color(0xFF64748B) : const Color(0xFF94A3B8),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              InkWell(
                onTap: _irACatalogoEmpresa,
                child: const Text(
                  'Ver catálogo completo →',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                    color: _brandGoldLight,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),

          // SI EL CHATBOT ESTÁ OCULTO: MOSTRAR LOS 2 BOTONES (Captura 3)
          if (!_mostrarChatbot)
            Row(
              children: [
                Expanded(
                  child: ElevatedButton.icon(
                    icon: const Icon(Icons.chat_bubble_outline, size: 16, color: _brandGold),
                    label: const Text(
                      'Contactar vendedor',
                      style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: _brandGold),
                      overflow: TextOverflow.ellipsis,
                    ),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: buttonBg,
                      elevation: 0,
                      side: BorderSide(color: borderColor),
                      padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 8),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                    onPressed: _irAChat,
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: ElevatedButton.icon(
                    icon: const Icon(Icons.smart_toy_outlined, size: 16, color: _brandGold),
                    label: const Text(
                      'Preguntarle al chatbot',
                      style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: _brandGold),
                      overflow: TextOverflow.ellipsis,
                    ),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: buttonBg,
                      elevation: 0,
                      side: BorderSide(color: borderColor),
                      padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 8),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                    onPressed: () {
                      setState(() => _mostrarChatbot = true);
                    },
                  ),
                ),
              ],
            ),

          // SI EL CHATBOT ESTÁ ACTIVO: MOSTRAR BOTÓN DE CONTACTO Y DESPLEGAR EL CHATBOT DIRECTAMENTE SOBRE LA MISMA INTERFAZ (Captura 4)
          if (_mostrarChatbot) ...[
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                icon: const Icon(Icons.chat_bubble_outline, size: 16, color: _brandGold),
                label: const Text(
                  'Contactar vendedor',
                  style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: _brandGold),
                ),
                style: ElevatedButton.styleFrom(
                  backgroundColor: buttonBg,
                  elevation: 0,
                  side: BorderSide(color: borderColor),
                  padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 16),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                ),
                onPressed: _irAChat,
              ),
            ),
            const SizedBox(height: 14),
            _buildChatbotWidget(p, isDark),
          ],
        ],
      ),
    );
  }

  // ==========================================
  // WIDGET INLINE DEL CHATBOT (Captura 4)
  // ==========================================
  Widget _buildChatbotWidget(Producto p, bool isDark) {
    final chatbotBg = isDark ? const Color(0xFF111827) : Colors.white;
    final borderColor = isDark ? const Color(0xFF1E293B) : const Color(0xFFE2E8F0);

    final sugerenciasDefault = [
      '¿Cuáles son sus horarios de atención?',
      '¿Qué formas de pago aceptan?',
      '¿Hacen envíos a domicilio y cuánto demora?',
      '¿Qué garantía tienen sus productos?',
    ];

    return Container(
      decoration: BoxDecoration(
        color: chatbotBg,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: borderColor),
      ),
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.smart_toy_outlined, color: _brandGoldLight, size: 20),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  'Chatbot de ${p.empresaNombre}',
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.bold,
                    color: isDark ? Colors.white : const Color(0xFF0F172A),
                  ),
                ),
              ),
              InkWell(
                onTap: () => setState(() => _mostrarChatbot = false),
                child: Icon(Icons.close, size: 18, color: isDark ? Colors.grey : Colors.black54),
              ),
            ],
          ),
          const SizedBox(height: 12),

          if (_historialChatbot.isEmpty)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 8),
              child: Text(
                '¡Hola! Pregúntale sobre horarios, envíos, métodos de pago o catálogo a esta tienda.',
                style: TextStyle(
                  fontSize: 13,
                  color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
                ),
              ),
            ),

          // Historial de preguntas y respuestas
          if (_historialChatbot.isNotEmpty)
            ConstrainedBox(
              constraints: const BoxConstraints(maxHeight: 240),
              child: ListView.builder(
                shrinkWrap: true,
                itemCount: _historialChatbot.length,
                itemBuilder: (context, i) {
                  final item = _historialChatbot[i];
                  final esYo = item['autor'] == 'yo';

                  return Align(
                    alignment: esYo ? Alignment.centerRight : Alignment.centerLeft,
                    child: Container(
                      margin: const EdgeInsets.only(bottom: 8),
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                      constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.75),
                      decoration: BoxDecoration(
                        color: esYo
                            ? _brandGold
                            : (isDark ? const Color(0xFF1E293B) : const Color(0xFFF1F5F9)),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Text(
                        item['texto'] ?? '',
                        style: TextStyle(
                          fontSize: 13,
                          color: esYo ? Colors.white : (isDark ? Colors.white : const Color(0xFF0F172A)),
                        ),
                      ),
                    ),
                  );
                },
              ),
            ),

          if (_enviandoChatbot)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 6),
              child: SizedBox(
                height: 16,
                width: 16,
                child: CircularProgressIndicator(strokeWidth: 2, color: _brandGoldLight),
              ),
            ),

          const SizedBox(height: 10),

          // Píldoras sugeridas (Captura 4)
          Wrap(
            spacing: 6,
            runSpacing: 6,
            children: sugerenciasDefault.map((sug) {
              return InkWell(
                onTap: _enviandoChatbot ? null : () => _preguntarAlChatbot(sug),
                borderRadius: BorderRadius.circular(999),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: isDark ? const Color(0xFF1E293B) : const Color(0xFFF1F5F9),
                    borderRadius: BorderRadius.circular(999),
                    border: Border.all(
                      color: isDark ? const Color(0xFF334155) : const Color(0xFFCBD5E1),
                    ),
                  ),
                  child: Text(
                    sug,
                    style: TextStyle(
                      fontSize: 12,
                      color: isDark ? const Color(0xFFCBD5E1) : const Color(0xFF334155),
                    ),
                  ),
                ),
              );
            }).toList(),
          ),

          const SizedBox(height: 14),

          // Input de pregunta y botón enviar (Captura 4)
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12),
            decoration: BoxDecoration(
              color: isDark ? const Color(0xFF1E293B) : const Color(0xFFF1F5F9),
              borderRadius: BorderRadius.circular(999),
              border: Border.all(
                color: isDark ? const Color(0xFF334155) : const Color(0xFFCBD5E1),
              ),
            ),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _chatbotPreguntaCtrl,
                    onSubmitted: (t) => _preguntarAlChatbot(t),
                    style: TextStyle(
                      fontSize: 13,
                      color: isDark ? Colors.white : Colors.black87,
                    ),
                    decoration: InputDecoration(
                      hintText: 'Escribe tu pregunta a la tienda.',
                      hintStyle: TextStyle(
                        fontSize: 13,
                        color: isDark ? const Color(0xFF64748B) : const Color(0xFF94A3B8),
                      ),
                      border: InputBorder.none,
                      isDense: true,
                      contentPadding: const EdgeInsets.symmetric(vertical: 10),
                    ),
                  ),
                ),
                GestureDetector(
                  onTap: _enviandoChatbot ? null : () => _preguntarAlChatbot(_chatbotPreguntaCtrl.text),
                  child: Container(
                    width: 32,
                    height: 32,
                    decoration: const BoxDecoration(
                      color: _brandGoldLight,
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(Icons.send, color: Colors.white, size: 16),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // ==========================================
  // 4. FOOTER (PIE DE PÁGINA)
  // ==========================================
  Widget _buildFooter(bool isDark, bool isWide) {
    final footerBg = const Color(0xFF090D16);
    const titleStyle = TextStyle(
      fontSize: 14,
      fontWeight: FontWeight.w700,
      color: Colors.white,
    );
    const linkStyle = TextStyle(
      fontSize: 12,
      color: Color(0xFF94A3B8),
      height: 1.8,
    );

    return Container(
      width: double.infinity,
      color: footerBg,
      padding: EdgeInsets.symmetric(horizontal: isWide ? 40 : 20, vertical: 32),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (isWide)
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(child: _buildFooterSection('VecinoMarket', ['Vende con nosotros', 'Sobre nosotros', 'Trabaja con nosotros'], titleStyle, linkStyle)),
                Expanded(child: _buildFooterSection('Categorías', ['Abarrotes', 'Artesanía local', 'Belleza y cuidado personal', 'Ferretería', 'Hogar y decoración'], titleStyle, linkStyle)),
                Expanded(child: _buildFooterSection('Ayuda', ['Centro de ayuda', 'Cómo comprar', 'Envíos y entregas'], titleStyle, linkStyle)),
                Expanded(child: _buildFooterSection('Contacto', ['La Paz, Bolivia', 'hola@vecinomarket.bo'], titleStyle, linkStyle)),
              ],
            )
          else ...[
            _buildFooterSection('VecinoMarket', ['Vende con nosotros', 'Sobre nosotros', 'Trabaja con nosotros'], titleStyle, linkStyle),
            const SizedBox(height: 20),
            _buildFooterSection('Categorías', ['Abarrotes', 'Artesanía local', 'Belleza y cuidado personal', 'Ferretería', 'Hogar y decoración'], titleStyle, linkStyle),
            const SizedBox(height: 20),
            _buildFooterSection('Ayuda', ['Centro de ayuda', 'Cómo comprar', 'Envíos y entregas'], titleStyle, linkStyle),
            const SizedBox(height: 20),
            _buildFooterSection('Contacto', ['La Paz, Bolivia', 'hola@vecinomarket.bo'], titleStyle, linkStyle),
          ],
          const SizedBox(height: 28),
          const Divider(color: Color(0xFF1E293B)),
          const SizedBox(height: 16),
          const Center(
            child: Text(
              '© 2026 VecinoMarket. Proyecto académico — Sistemas de Información II.',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 11,
                color: Color(0xFF64748B),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFooterSection(String title, List<String> links, TextStyle titleStyle, TextStyle linkStyle) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(title, style: titleStyle),
        const SizedBox(height: 8),
        ...links.map((link) => Text(link, style: linkStyle)),
      ],
    );
  }

  // ==========================================
  // TOP BAR & HEADER (CON ÍCONO DE APP Y BOTONES AMPLIOS)
  // ==========================================
  Widget _buildTopHeader(bool isDark) {
    final tema = context.watch<ThemeService>();
    final totalCarrito = context.watch<CartService>().totalItems;
    final usuario = context.watch<AuthService>().usuario;
    final headerBg = isDark ? const Color(0xFF111827) : Colors.white;

    return Container(
      color: headerBg,
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      child: Column(
        children: [
          Row(
            children: [
              // Botón Atrás / Menú
              InkWell(
                onTap: () {
                  if (Navigator.canPop(context)) {
                    Navigator.pop(context);
                  }
                },
                borderRadius: BorderRadius.circular(10),
                child: Padding(
                  padding: const EdgeInsets.all(6),
                  child: Icon(
                    Navigator.canPop(context) ? Icons.arrow_back : Icons.menu,
                    size: 24,
                    color: isDark ? Colors.white : const Color(0xFF111827),
                  ),
                ),
              ),
              const SizedBox(width: 8),

              // Ícono de la App según modo claro/oscuro (optimiza espacio para botones grandes)
              ClipRRect(
                borderRadius: BorderRadius.circular(8),
                child: Image.asset(
                  isDark ? 'assets/icon/app_icon_flat_dark.png' : 'assets/icon/app_icon_flat_light.png',
                  height: 36,
                  width: 36,
                  fit: BoxFit.cover,
                ),
              ),
              const SizedBox(width: 6),

              // Acciones a la derecha con tamaño completo y ergonómico
              Expanded(
                child: Align(
                  alignment: Alignment.centerRight,
                  child: FittedBox(
                    fit: BoxFit.scaleDown,
                    alignment: Alignment.centerRight,
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        // Icono Live rojo con buen tamaño interactivo
                        Tooltip(
                          message: 'En vivo / Transmisiones',
                          child: InkWell(
                            onTap: () => Navigator.push(
                              context,
                              MaterialPageRoute(builder: (_) => const LiveCommerceScreen()),
                            ),
                            borderRadius: BorderRadius.circular(999),
                            child: Container(
                              width: 32,
                              height: 32,
                              decoration: const BoxDecoration(
                                color: Color(0xFFDC2626),
                                shape: BoxShape.circle,
                              ),
                              child: const Icon(Icons.sensors, color: Colors.white, size: 18),
                            ),
                          ),
                        ),
                        const SizedBox(width: 4),
                        const NotificationBadgeButton(size: 20),
                        const SizedBox(width: 2),

                        // Ubicación
                        _buildHeaderIcon(
                          icon: Icons.location_on_outlined,
                          tooltip: 'Ubicación',
                          isDark: isDark,
                          onTap: () {},
                        ),

                        // Perfil
                        _buildHeaderIcon(
                          icon: usuario != null ? Icons.person : Icons.person_outline,
                          tooltip: usuario != null ? 'Mi cuenta' : 'Ingresar',
                          isDark: isDark,
                          onTap: () {
                            if (usuario != null) {
                              Navigator.push(context, MaterialPageRoute(builder: (_) => const ProfileScreen()));
                            } else {
                              Navigator.push(context, MaterialPageRoute(builder: (_) => const AuthScreen()));
                            }
                          },
                        ),


                        // Modo claro / oscuro
                        _buildHeaderIcon(
                          icon: isDark ? Icons.light_mode_outlined : Icons.dark_mode_outlined,
                          tooltip: isDark ? 'Modo claro' : 'Modo oscuro',
                          isDark: isDark,
                          onTap: () => tema.alternar(),
                        ),

                        // Carrito con badge
                        Stack(
                          alignment: Alignment.center,
                          children: [
                            _buildHeaderIcon(
                              icon: Icons.shopping_cart_outlined,
                              tooltip: 'Carrito',
                              isDark: isDark,
                              onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const CartScreen())),
                            ),
                            if (totalCarrito > 0)
                              Positioned(
                                top: 2,
                                right: 2,
                                child: Container(
                                  padding: const EdgeInsets.all(3),
                                  decoration: const BoxDecoration(color: Colors.red, shape: BoxShape.circle),
                                  constraints: const BoxConstraints(minWidth: 16, minHeight: 16),
                                  child: Text(
                                    '$totalCarrito',
                                    textAlign: TextAlign.center,
                                    style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold),
                                  ),
                                ),
                              ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          // Barra de búsqueda redondeada con mayor cuerpo y colores nativos de la app
          Container(
            height: 48,
            decoration: BoxDecoration(
              color: isDark ? const Color(0xFF1F2937) : const Color(0xFFF3F4F6),
              borderRadius: BorderRadius.circular(999),
              border: Border.all(
                color: isDark ? const Color(0xFF374151) : const Color(0xFFD1D5DB),
              ),
            ),
            padding: const EdgeInsets.only(left: 16, right: 5),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _busquedaHeaderCtrl,
                    style: TextStyle(
                      fontSize: 14,
                      color: isDark ? Colors.white : const Color(0xFF111827),
                    ),
                    decoration: InputDecoration(
                      hintText: 'Busca productos, tiendas o categorías...',
                      hintStyle: TextStyle(
                        fontSize: 14,
                        color: isDark ? const Color(0xFF9CA3AF) : const Color(0xFF6B7280),
                      ),
                      border: InputBorder.none,
                      isDense: true,
                    ),
                  ),
                ),
                Container(
                  width: 38,
                  height: 38,
                  decoration: const BoxDecoration(
                    color: _brandGoldLight,
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.search, color: Colors.white, size: 20),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildHeaderIcon({
    required IconData icon,
    required String tooltip,
    required bool isDark,
    required VoidCallback onTap,
  }) {
    return Tooltip(
      message: tooltip,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(20),
        child: Padding(
          padding: const EdgeInsets.all(7),
          child: Icon(
            icon,
            size: 24,
            color: isDark ? Colors.white : const Color(0xFF111827),
          ),
        ),
      ),
    );
  }
}
