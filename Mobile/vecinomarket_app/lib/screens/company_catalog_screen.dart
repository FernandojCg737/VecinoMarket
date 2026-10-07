import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/categoria.dart';
import '../models/producto.dart';
import '../services/auth_service.dart';
import '../services/cart_service.dart';
import '../services/catalogo_service.dart';
import '../services/chat_service.dart';
import '../services/notificacion_service.dart';
import '../services/theme_service.dart';
import 'notifications_screen.dart';
import 'auth_screen.dart';
import 'cart_screen.dart';
import 'chat_screen.dart';
import 'live_commerce_screen.dart';
import '../widgets/notification_badge_button.dart';
import 'product_detail_screen.dart';
import 'profile_screen.dart';

class CompanyCatalogScreen extends StatefulWidget {
  final int empresaId;
  final String empresaNombre;
  final String empresaCiudad;

  const CompanyCatalogScreen({
    super.key,
    required this.empresaId,
    required this.empresaNombre,
    this.empresaCiudad = 'Bolivia',
  });

  @override
  State<CompanyCatalogScreen> createState() => _CompanyCatalogScreenState();
}

class _CompanyCatalogScreenState extends State<CompanyCatalogScreen> {
  final _catalogoService = CatalogoService();
  final _chatService = ChatService();
  final _busquedaCtrl = TextEditingController();
  final _chatbotPreguntaCtrl = TextEditingController();

  List<Producto> _productos = [];
  List<Categoria> _categorias = [];
  int? _categoriaSeleccionadaId;
  bool _cargando = true;
  bool _mostrarChatbot = false;

  // Estado del Chatbot inline (CU15)
  final List<Map<String, String>> _historialChatbot = [];
  List<Map<String, dynamic>> _faqs = [];
  bool _enviandoChatbot = false;

  static const Color _brandGold = Color(0xFFD97706);
  static const Color _brandGoldLight = Color(0xFFF59E0B);
  static const Color _greenStore = Color(0xFF10B981);

  @override
  void initState() {
    super.initState();
    _cargarDatos();
  }

  @override
  void dispose() {
    _busquedaCtrl.dispose();
    _chatbotPreguntaCtrl.dispose();
    super.dispose();
  }

  Future<void> _cargarDatos() async {
    setState(() => _cargando = true);
    try {
      final catsFuture = _catalogoService.obtenerCategorias();
      final prodsFuture = _catalogoService.obtenerProductos(
        empresaId: widget.empresaId,
        categoriaId: _categoriaSeleccionadaId,
        q: _busquedaCtrl.text.trim().isEmpty ? null : _busquedaCtrl.text.trim(),
      );
      final faqsFuture = _chatService.obtenerFaqsChatbot(widget.empresaId);

      final resultados = await Future.wait([catsFuture, prodsFuture, faqsFuture]);
      if (mounted) {
        setState(() {
          _categorias = resultados[0] as List<Categoria>;
          _productos = resultados[1] as List<Producto>;
          _faqs = resultados[2] as List<Map<String, dynamic>>;
          _cargando = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _cargando = false);
    }
  }

  Future<void> _filtrarPorCategoria(int? categoriaId) async {
    setState(() {
      _categoriaSeleccionadaId = categoriaId;
      _cargando = true;
    });
    try {
      final prods = await _catalogoService.obtenerProductos(
        empresaId: widget.empresaId,
        categoriaId: _categoriaSeleccionadaId,
        q: _busquedaCtrl.text.trim().isEmpty ? null : _busquedaCtrl.text.trim(),
      );
      if (mounted) {
        setState(() {
          _productos = prods;
          _cargando = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _cargando = false);
    }
  }

  Future<void> _preguntarAlChatbot(String preguntaTexto) async {
    final pregunta = preguntaTexto.trim();
    if (pregunta.isEmpty || _enviandoChatbot) return;

    final auth = context.read<AuthService>();
    final isAuth = auth.usuario != null;

    setState(() {
      _historialChatbot.add({'autor': 'yo', 'texto': pregunta});
      _enviandoChatbot = true;
    });
    _chatbotPreguntaCtrl.clear();

    try {
      final respuesta = await _chatService.preguntarChatbot(
        empresaId: widget.empresaId,
        empresaNombre: widget.empresaNombre,
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
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final bgColor = isDark ? const Color(0xFF111827) : Colors.white;

    return Scaffold(
      backgroundColor: bgColor,
      body: SafeArea(
        child: Column(
          children: [
            // 1. TOP HEADER (Logo, Búsqueda, Acciones)
            _buildTopHeader(isDark),

            // 2. CONTENIDO SCROLLABLE (Banner de tienda, categorías y productos)
            Expanded(
              child: SingleChildScrollView(
                child: Center(
                  child: ConstrainedBox(
                    constraints: const BoxConstraints(maxWidth: 1000),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              // BANNER DE LA TIENDA (Captura 5)
                              _buildStoreBanner(isDark),
                              const SizedBox(height: 24),

                              // SECCIÓN CATEGORÍAS (Captura 5)
                              _buildCategoriasSection(isDark),
                              const SizedBox(height: 24),

                              // GRILLA DE PRODUCTOS DE ESTA TIENDA
                              _buildProductosSection(isDark),
                            ],
                          ),
                        ),

                        const SizedBox(height: 32),

                        // FOOTER
                        _buildFooter(isDark),
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

  // ==========================================
  // TOP HEADER (CON ÍCONO DE APP Y BOTONES AMPLIOS)
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

                        // Carrito de compras con badge
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
          // Buscador redondeado con mayor volumen y colores de la app
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
                    controller: _busquedaCtrl,
                    onSubmitted: (_) => _cargarDatos(),
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
                GestureDetector(
                  onTap: _cargarDatos,
                  child: Container(
                    width: 38,
                    height: 38,
                    decoration: const BoxDecoration(
                      color: _brandGoldLight,
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(Icons.search, color: Colors.white, size: 20),
                  ),
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

  // ==========================================
  // BANNER DE LA TIENDA (Captura 5)
  // ==========================================
  Widget _buildStoreBanner(bool isDark) {
    final cardBg = isDark ? const Color(0xFF111827) : const Color(0xFFF8FAFC);
    final borderColor = isDark ? const Color(0xFF1E293B) : const Color(0xFFE2E8F0);

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: cardBg,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: borderColor),
        boxShadow: [
          BoxShadow(
            color: isDark ? const Color(0x33000000) : const Color(0x08000000),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Icono cuadrado dorado con tienda
              Container(
                width: 52,
                height: 52,
                decoration: BoxDecoration(
                  color: _brandGoldLight,
                  borderRadius: BorderRadius.circular(14),
                ),
                child: const Icon(Icons.storefront, color: Colors.white, size: 28),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      widget.empresaNombre,
                      style: TextStyle(
                        fontSize: 22,
                        fontWeight: FontWeight.w900,
                        color: isDark ? Colors.white : const Color(0xFF0F172A),
                        height: 1.15,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      'Catálogo de productos · ${_cargando ? 'Cargando...' : '${_productos.length} productos disponibles'}',
                      style: TextStyle(
                        fontSize: 12,
                        color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
                      ),
                    ),
                  ],
                ),
              ),
              // Badge "Tienda activa"
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: isDark ? const Color(0xFF064E3B) : const Color(0xFFD1FAE5),
                  borderRadius: BorderRadius.circular(999),
                ),
                child: const Text(
                  'Tienda activa',
                  style: TextStyle(
                    color: _greenStore,
                    fontWeight: FontWeight.bold,
                    fontSize: 11,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),

          // BOTONES DE ACCIÓN (Captura 5)
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              // 1. Contactar vendedor (Gold filled)
              ElevatedButton.icon(
                icon: const Icon(Icons.chat_bubble_outline, size: 16, color: Colors.white),
                label: const Text(
                  'Contactar vendedor',
                  style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Colors.white),
                ),
                style: ElevatedButton.styleFrom(
                  backgroundColor: _brandGold,
                  elevation: 0,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(999)),
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                ),
                onPressed: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (_) => ChatScreen(
                        empresaId: widget.empresaId,
                        empresaNombre: widget.empresaNombre,
                      ),
                    ),
                  );
                },
              ),

              // 2. Preguntar al chatbot (Outline dark)
              OutlinedButton.icon(
                icon: const Icon(Icons.smart_toy_outlined, size: 16, color: _brandGoldLight),
                label: Text(
                  _mostrarChatbot ? 'Ocultar chatbot' : 'Preguntar al chatbot',
                  style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: _brandGoldLight),
                ),
                style: OutlinedButton.styleFrom(
                  side: BorderSide(color: isDark ? const Color(0xFF334155) : const Color(0xFFCBD5E1)),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(999)),
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                ),
                onPressed: () {
                  setState(() => _mostrarChatbot = !_mostrarChatbot);
                },
              ),

              // 3. Ver todas las tiendas (Volver)
              OutlinedButton(
                style: OutlinedButton.styleFrom(
                  side: BorderSide(color: isDark ? const Color(0xFF334155) : const Color(0xFFCBD5E1)),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(999)),
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                ),
                onPressed: () => Navigator.pop(context),
                child: Text(
                  'Ver todas las tiendas',
                  style: TextStyle(
                    fontSize: 13,
                    color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF475569),
                  ),
                ),
              ),
            ],
          ),

          // CHATBOT WIDGET INLINE (CU15 - Idéntico a Captura 4)
          if (_mostrarChatbot) ...[
            const SizedBox(height: 18),
            _buildChatbotWidget(isDark),
          ],
        ],
      ),
    );
  }

  // ==========================================
  // CHATBOT WIDGET (Captura 4)
  // ==========================================
  Widget _buildChatbotWidget(bool isDark) {
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
                  'Chatbot de ${widget.empresaNombre}',
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.bold,
                    color: isDark ? Colors.white : const Color(0xFF0F172A),
                  ),
                ),
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

          // Historial de respuestas
          if (_historialChatbot.isNotEmpty)
            ConstrainedBox(
              constraints: const BoxConstraints(maxHeight: 250),
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

          // Píldoras de preguntas frecuentes sugeridas (Captura 4)
          Builder(
            builder: (context) {
              final sugerencias = _faqs.isNotEmpty
                  ? _faqs.map((f) => (f['pregunta_ejemplo'] ?? f['pregunta'] ?? '').toString()).where((s) => s.isNotEmpty).toList()
                  : sugerenciasDefault;

              return Wrap(
                spacing: 6,
                runSpacing: 6,
                children: sugerencias.map((sug) {
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
              );
            },
          ),

          const SizedBox(height: 14),

          // Campo de entrada y botón de envío (Captura 4)
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
  // SECCIÓN CATEGORÍAS (Captura 5)
  // ==========================================
  Widget _buildCategoriasSection(bool isDark) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Categorías',
          style: TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.bold,
            color: isDark ? Colors.white : const Color(0xFF0F172A),
          ),
        ),
        const SizedBox(height: 12),

        // Opción "Todas"
        InkWell(
          onTap: () => _filtrarPorCategoria(null),
          borderRadius: BorderRadius.circular(8),
          child: Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            decoration: BoxDecoration(
              color: _categoriaSeleccionadaId == null
                  ? (isDark ? const Color(0xFF1E293B) : const Color(0xFFFEF3C7))
                  : Colors.transparent,
              borderRadius: BorderRadius.circular(8),
            ),
            child: Text(
              'Todas',
              style: TextStyle(
                fontSize: 14,
                fontWeight: _categoriaSeleccionadaId == null ? FontWeight.bold : FontWeight.w500,
                color: _categoriaSeleccionadaId == null
                    ? _brandGoldLight
                    : (isDark ? const Color(0xFF94A3B8) : const Color(0xFF475569)),
              ),
            ),
          ),
        ),

        // Lista de categorías
        ..._categorias.map((cat) {
          final isSelected = _categoriaSeleccionadaId == cat.id;
          return InkWell(
            onTap: () => _filtrarPorCategoria(cat.id),
            borderRadius: BorderRadius.circular(8),
            child: Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              decoration: BoxDecoration(
                color: isSelected
                    ? (isDark ? const Color(0xFF1E293B) : const Color(0xFFFEF3C7))
                    : Colors.transparent,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(
                cat.nombre,
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                  color: isSelected
                      ? _brandGoldLight
                      : (isDark ? const Color(0xFF94A3B8) : const Color(0xFF475569)),
                ),
              ),
            ),
          );
        }),
      ],
    );
  }

  // ==========================================
  // SECCIÓN PRODUCTOS
  // ==========================================
  Widget _buildProductosSection(bool isDark) {
    if (_cargando) {
      return const Center(
        child: Padding(
          padding: EdgeInsets.all(32),
          child: CircularProgressIndicator(color: _brandGold),
        ),
      );
    }

    if (_productos.isEmpty) {
      return Container(
        padding: const EdgeInsets.all(32),
        alignment: Alignment.center,
        child: Text(
          'Esta tienda aún no tiene productos disponibles en esta categoría.',
          textAlign: TextAlign.center,
          style: TextStyle(
            color: isDark ? const Color(0xFF64748B) : const Color(0xFF94A3B8),
            fontSize: 14,
          ),
        ),
      );
    }

    return LayoutBuilder(
      builder: (context, constraints) {
        final crossAxisCount = constraints.maxWidth >= 600 ? 3 : 2;

        return GridView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          itemCount: _productos.length,
          gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: crossAxisCount,
            childAspectRatio: 0.72,
            crossAxisSpacing: 12,
            mainAxisSpacing: 12,
          ),
          itemBuilder: (context, i) {
            final p = _productos[i];
            return _buildProductCard(p, isDark);
          },
        );
      },
    );
  }

  Widget _buildProductCard(Producto p, bool isDark) {
    final cardBg = isDark ? const Color(0xFF111827) : Colors.white;
    final borderColor = isDark ? const Color(0xFF1E293B) : const Color(0xFFE2E8F0);

    return InkWell(
      onTap: () {
        Navigator.push(
          context,
          MaterialPageRoute(builder: (_) => ProductDetailScreen(producto: p)),
        );
      },
      borderRadius: BorderRadius.circular(14),
      child: Container(
        decoration: BoxDecoration(
          color: cardBg,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: borderColor),
        ),
        clipBehavior: Clip.antiAlias,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Imagen con AspectRatio
            Expanded(
              flex: 5,
              child: Container(
                color: isDark ? const Color(0xFF1E293B) : const Color(0xFFF8FAFC),
                width: double.infinity,
                child: p.imagenUrl != null
                    ? Image.network(
                        p.imagenUrl!,
                        fit: BoxFit.contain,
                        errorBuilder: (context, error, stackTrace) => const Icon(Icons.broken_image, size: 36, color: Colors.grey),
                      )
                    : const Icon(Icons.inventory_2_outlined, size: 36, color: Colors.grey),
              ),
            ),
            // Detalles del producto
            Expanded(
              flex: 4,
              child: Padding(
                padding: const EdgeInsets.all(10),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      p.nombre,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.bold,
                        color: isDark ? Colors.white : const Color(0xFF0F172A),
                      ),
                    ),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Bs ${p.tieneDescuento ? p.precioDescuento!.toStringAsFixed(p.precioDescuento! % 1 == 0 ? 0 : 2) : p.precio.toStringAsFixed(p.precio % 1 == 0 ? 0 : 2)}',
                          style: const TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w800,
                            color: _brandGoldLight,
                          ),
                        ),
                        Text(
                          p.stock > 0 ? '${p.stock} disp.' : 'Agotado',
                          style: TextStyle(
                            fontSize: 11,
                            color: p.stock > 0
                                ? (isDark ? const Color(0xFF64748B) : const Color(0xFF94A3B8))
                                : Colors.redAccent,
                          ),
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
  }

  // ==========================================
  // FOOTER
  // ==========================================
  Widget _buildFooter(bool isDark) {
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
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildFooterSection('VecinoMarket', ['Vende con nosotros', 'Sobre nosotros', 'Trabaja con nosotros'], titleStyle, linkStyle),
          const SizedBox(height: 20),
          _buildFooterSection('Categorías', ['Abarrotes', 'Artesanía local', 'Belleza y cuidado personal', 'Ferretería', 'Hogar y decoración'], titleStyle, linkStyle),
          const SizedBox(height: 20),
          _buildFooterSection('Ayuda', ['Centro de ayuda', 'Cómo comprar', 'Envíos y entregas'], titleStyle, linkStyle),
          const SizedBox(height: 20),
          _buildFooterSection('Contacto', ['La Paz, Bolivia', 'hola@vecinomarket.bo'], titleStyle, linkStyle),
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
        const SizedBox(height: 6),
        ...links.map((link) => Text(link, style: linkStyle)),
      ],
    );
  }
}
