import 'dart:async';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/auth_service.dart';
import '../services/cart_service.dart';
import '../services/chat_service.dart';
import '../services/theme_service.dart';
import 'auth_screen.dart';
import 'cart_screen.dart';
import 'live_commerce_screen.dart';
import 'profile_screen.dart';

class ChatScreen extends StatefulWidget {
  final int? empresaId;
  final String? empresaNombre;
  final int? conversacionId;

  const ChatScreen({
    super.key,
    this.empresaId,
    this.empresaNombre,
    this.conversacionId,
  });

  @override
  State<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  final _chatService = ChatService();
  final _mensajeCtrl = TextEditingController();
  final _busquedaHeaderCtrl = TextEditingController();
  final _scrollCtrl = ScrollController();

  List<Map<String, dynamic>> _conversaciones = [];
  Map<String, dynamic>? _conversacionActiva;
  List<Map<String, dynamic>> _mensajes = [];

  bool _cargando = true;
  bool _actualizando = false;
  bool _enviando = false;
  String? _error;
  Timer? _pollingTimer;

  static const Color _brandGold = Color(0xFFD97706);
  static const Color _brandGoldLight = Color(0xFFF59E0B);
  static const Color _greenLive = Color(0xFF10B981);

  @override
  void initState() {
    super.initState();
    _iniciarChat();
  }

  @override
  void dispose() {
    _pollingTimer?.cancel();
    _mensajeCtrl.dispose();
    _busquedaHeaderCtrl.dispose();
    _scrollCtrl.dispose();
    super.dispose();
  }

  Future<void> _iniciarChat() async {
    final auth = context.read<AuthService>();
    if (auth.usuario == null) {
      setState(() {
        _cargando = false;
      });
      return;
    }

    setState(() => _cargando = true);

    try {
      // Si nos pasaron una empresa particular para abrir chat:
      if (widget.empresaId != null) {
        final conv = await _chatService.iniciarOObtenerConversacion(widget.empresaId!);
        _conversacionActiva = conv;
      }

      await _recargarConversaciones(silencioso: false);

      // Si nos pasaron un ID de conversación específico:
      if (widget.conversacionId != null) {
        final encontrada = _conversaciones.firstWhere(
          (c) => c['id'] == widget.conversacionId,
          orElse: () => _conversacionActiva ?? {},
        );
        if (encontrada.isNotEmpty) {
          _conversacionActiva = encontrada;
        }
      }

      if (_conversacionActiva == null && _conversaciones.isNotEmpty) {
        _conversacionActiva = _conversaciones.first;
      }

      if (_conversacionActiva != null && _conversacionActiva!['id'] != null) {
        await _cargarMensajes(silencioso: false);
      }
    } catch (e) {
      setState(() => _error = 'No se pudo iniciar el chat: $e');
    } finally {
      if (mounted) setState(() => _cargando = false);
    }

    // Configurar polling en tiempo real cada 2.5s (CU14)
    _pollingTimer?.cancel();
    _pollingTimer = Timer.periodic(const Duration(milliseconds: 2500), (_) {
      if (mounted && _conversacionActiva != null) {
        _recargarConversaciones(silencioso: true);
        _cargarMensajes(silencioso: true);
      }
    });
  }

  Future<void> _recargarConversaciones({bool silencioso = false}) async {
    if (!silencioso && mounted) setState(() => _actualizando = true);
    try {
      final lista = await _chatService.obtenerMisConversaciones();
      if (mounted) {
        setState(() {
          _conversaciones = lista;
          _error = null;
        });
      }
    } catch (_) {
      // Ignorar error si es silencioso
    } finally {
      if (!silencioso && mounted) setState(() => _actualizando = false);
    }
  }

  Future<void> _cargarMensajes({bool silencioso = false}) async {
    if (_conversacionActiva == null || _conversacionActiva!['id'] == null) return;
    try {
      final id = _conversacionActiva!['id'] as int;
      final lista = await _chatService.obtenerMensajes(id);
      if (mounted) {
        setState(() {
          _mensajes = lista;
        });
      }
    } catch (_) {}
  }

  String _formatearHora(dynamic fecha) {
    if (fecha == null) return '';
    try {
      final dt = DateTime.parse(fecha.toString()).toLocal();
      final hora = dt.hour.toString().padLeft(2, '0');
      final min = dt.minute.toString().padLeft(2, '0');
      return '$hora:$min';
    } catch (_) {
      return '';
    }
  }

  Future<void> _enviarMensaje() async {
    final texto = _mensajeCtrl.text.trim();
    if (texto.isEmpty || _conversacionActiva == null || _enviando) return;

    final convId = _conversacionActiva!['id'] as int?;
    if (convId == null) return;

    final auth = context.read<AuthService>();
    final miId = auth.usuario?['id'];

    setState(() {
      _enviando = true;
      // Optimistic insert
      _mensajes.add({
        'contenido': texto,
        'es_mio': true,
        'emisor_rol': 'COMPRADOR',
        'emisor_usuario': miId,
        'fecha_envio': DateTime.now().toIso8601String(),
      });
    });
    _mensajeCtrl.clear();
    _scrollAbajo();

    try {
      await _chatService.enviarMensaje(convId, texto);
      await _cargarMensajes(silencioso: true);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error al enviar mensaje: $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _enviando = false);
    }
  }

  void _scrollAbajo() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollCtrl.hasClients) {
        _scrollCtrl.animateTo(
          _scrollCtrl.position.maxScrollExtent,
          duration: const Duration(milliseconds: 250),
          curve: Curves.easeOut,
        );
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final bgColor = isDark ? const Color(0xFF111827) : Colors.white;
    final usuario = context.watch<AuthService>().usuario;

    return Scaffold(
      backgroundColor: bgColor,
      body: SafeArea(
        child: Column(
          children: [
            // 1. TOP APP BAR CON LOGO, BÚSQUEDA Y ACCIONES (Idéntico a Captura 2)
            _buildTopHeader(isDark),

            // 2. CONTENIDO PRINCIPAL SCROLLABLE
            Expanded(
              child: SingleChildScrollView(
                child: Center(
                  child: ConstrainedBox(
                    constraints: const BoxConstraints(maxWidth: 900),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              // TÍTULO "MIS CHATS" Y SUBTÍTULO CU14
                              Row(
                                children: [
                                  IconButton(
                                    icon: const Icon(Icons.arrow_back),
                                    onPressed: () => Navigator.pop(context),
                                    padding: EdgeInsets.zero,
                                    constraints: const BoxConstraints(),
                                  ),
                                  const SizedBox(width: 8),
                                  const Icon(Icons.chat_bubble_outline, color: _brandGoldLight, size: 24),
                                  const SizedBox(width: 8),
                                  Text(
                                    'Mis chats',
                                    style: TextStyle(
                                      fontSize: 22,
                                      fontWeight: FontWeight.w800,
                                      color: isDark ? Colors.white : const Color(0xFF0F172A),
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 4),
                              Text(
                                'CU14 · Conversaciones con las empresas donde compraste.',
                                style: TextStyle(
                                  fontSize: 13,
                                  color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
                                ),
                              ),
                              const SizedBox(height: 12),

                              // EN TIEMPO REAL · SE ACTUALIZA CADA 2.5s · ACTUALIZAR AHORA
                              Row(
                                children: [
                                  Container(
                                    width: 8,
                                    height: 8,
                                    decoration: const BoxDecoration(
                                      color: _greenLive,
                                      shape: BoxShape.circle,
                                    ),
                                  ),
                                  const SizedBox(width: 6),
                                  const Text(
                                    'En tiempo real',
                                    style: TextStyle(
                                      color: _greenLive,
                                      fontWeight: FontWeight.bold,
                                      fontSize: 12,
                                    ),
                                  ),
                                  Text(
                                    ' · se actualiza cada 2.5s',
                                    style: TextStyle(
                                      color: isDark ? const Color(0xFF64748B) : const Color(0xFF94A3B8),
                                      fontSize: 12,
                                    ),
                                  ),
                                  const Spacer(),
                                  InkWell(
                                    onTap: _actualizando ? null : () => _recargarConversaciones(silencioso: false),
                                    child: Row(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        Icon(
                                          Icons.refresh,
                                          size: 14,
                                          color: _brandGoldLight,
                                        ),
                                        const SizedBox(width: 4),
                                        Text(
                                          _actualizando ? 'Actualizando...' : 'Actualizar ahora',
                                          style: const TextStyle(
                                            color: _brandGoldLight,
                                            fontWeight: FontWeight.bold,
                                            fontSize: 12,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 16),

                              // VERIFICAR SESIÓN
                              if (usuario == null)
                                _buildAvisoLogin(isDark)
                              else ...[
                                // SELECTOR DE TIENDA ACTIVA (Pestaña)
                                _buildSelectorConversaciones(isDark),
                                const SizedBox(height: 16),

                                // CONTENEDOR PRINCIPAL DEL CHAT (Captura 2 y 3)
                                _buildChatCard(isDark),
                              ],
                            ],
                          ),
                        ),

                        const SizedBox(height: 32),

                        // FOOTER COMPLETO (Captura 3)
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
                        // Icono en vivo rojo con buen tamaño interactivo
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

                        // Notificaciones
                        _buildHeaderIcon(
                          icon: Icons.notifications_none_outlined,
                          tooltip: 'Notificaciones',
                          isDark: isDark,
                          onTap: () {},
                        ),

                        // Tema claro / oscuro
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

  // ==========================================
  // PESTAÑAS / BOTONES DE TIENDAS
  // ==========================================
  Widget _buildSelectorConversaciones(bool isDark) {
    final nombreTienda = _conversacionActiva?['empresa_nombre'] ?? widget.empresaNombre ?? 'Tienda';

    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            decoration: BoxDecoration(
              color: isDark ? const Color(0xFF1E293B) : const Color(0xFFFEF3C7),
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: _brandGoldLight, width: 1.5),
            ),
            child: Text(
              nombreTienda,
              style: TextStyle(
                fontWeight: FontWeight.bold,
                fontSize: 14,
                color: isDark ? Colors.white : const Color(0xFF0F172A),
              ),
            ),
          ),
          ..._conversaciones
              .where((c) => c['id'] != _conversacionActiva?['id'])
              .map((c) {
            return Padding(
              padding: const EdgeInsets.only(left: 8),
              child: InkWell(
                onTap: () {
                  setState(() {
                    _conversacionActiva = c;
                    _mensajes = [];
                  });
                  _cargarMensajes();
                },
                borderRadius: BorderRadius.circular(8),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                  decoration: BoxDecoration(
                    color: isDark ? const Color(0xFF111827) : const Color(0xFFF1F5F9),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(
                      color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0),
                    ),
                  ),
                  child: Text(
                    c['empresa_nombre'] ?? 'Tienda',
                    style: TextStyle(
                      fontSize: 13,
                      color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF475569),
                    ),
                  ),
                ),
              ),
            );
          }),
        ],
      ),
    );
  }

  // ==========================================
  // CONTENEDOR DEL CHAT (Captura 2 y Captura 3)
  // ==========================================
  Widget _buildChatCard(bool isDark) {
    final cardBg = isDark ? const Color(0xFF111827) : const Color(0xFFF8FAFC);
    final borderColor = isDark ? const Color(0xFF1E293B) : const Color(0xFFE2E8F0);
    final usuario = context.watch<AuthService>().usuario;

    return Container(
      decoration: BoxDecoration(
        color: cardBg,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: borderColor),
      ),
      child: Column(
        children: [
          // ÁREA DE MENSAJES (Captura 2)
          Container(
            height: 380,
            padding: const EdgeInsets.all(16),
            child: _cargando
                ? const Center(child: CircularProgressIndicator(color: _brandGold))
                : _error != null
                    ? Center(
                        child: Text(
                          _error!,
                          textAlign: TextAlign.center,
                          style: const TextStyle(color: Colors.redAccent, fontSize: 13),
                        ),
                      )
                    : _mensajes.isEmpty
                        ? Center(
                            child: Text(
                              'Sin mensajes todavía.',
                              style: TextStyle(
                                fontSize: 14,
                                color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
                              ),
                            ),
                          )
                        : ListView.builder(
                            controller: _scrollCtrl,
                            itemCount: _mensajes.length,
                            itemBuilder: (context, i) {
                              final m = _mensajes[i];
                              final miId = usuario?['id'];
                              final emisorId = m['emisor_usuario'];
                              final rol = (m['emisor_rol'] ?? '').toString().toUpperCase();

                              final bool esMio;
                              if (m['es_mio'] == true) {
                                esMio = true;
                              } else if (miId != null && emisorId != null) {
                                esMio = (emisorId == miId);
                              } else if (rol == 'EMPRESA' || rol == 'VENDEDOR') {
                                esMio = false;
                              } else if (rol == 'COMPRADOR') {
                                esMio = true;
                              } else {
                                esMio = false;
                              }

                              final contenido = m['contenido'] ?? m['texto'] ?? '';
                              final horaStr = _formatearHora(m['fecha_envio']);
                              final nombreEmisor = (m['emisor_nombre'] != null && m['emisor_nombre'].toString().isNotEmpty)
                                  ? m['emisor_nombre'].toString()
                                  : (_conversacionActiva?['empresa_nombre'] ?? widget.empresaNombre ?? 'Tienda');

                              return Align(
                                alignment: esMio ? Alignment.centerRight : Alignment.centerLeft,
                                child: Container(
                                  margin: const EdgeInsets.only(bottom: 12),
                                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                                  constraints: BoxConstraints(
                                    maxWidth: MediaQuery.of(context).size.width * 0.78,
                                  ),
                                  decoration: BoxDecoration(
                                    color: esMio
                                        ? _brandGold
                                        : (isDark ? const Color(0xFF1E293B) : const Color(0xFFF1F5F9)),
                                    borderRadius: BorderRadius.only(
                                      topLeft: const Radius.circular(16),
                                      topRight: const Radius.circular(16),
                                      bottomLeft: Radius.circular(esMio ? 16 : 4),
                                      bottomRight: Radius.circular(esMio ? 4 : 16),
                                    ),
                                    border: esMio
                                        ? null
                                        : Border.all(
                                            color: isDark ? const Color(0xFF334155) : const Color(0xFFCBD5E1),
                                          ),
                                    boxShadow: const [
                                      BoxShadow(
                                        color: Color(0x0A000000),
                                        blurRadius: 4,
                                        offset: Offset(0, 2),
                                      ),
                                    ],
                                  ),
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      // Identificador del vendedor si el mensaje no es del comprador
                                      if (!esMio) ...[
                                        Row(
                                          mainAxisSize: MainAxisSize.min,
                                          children: [
                                            const Icon(Icons.storefront_outlined, size: 13, color: _greenLive),
                                            const SizedBox(width: 4),
                                            Text(
                                              nombreEmisor,
                                              style: const TextStyle(
                                                fontSize: 11,
                                                fontWeight: FontWeight.bold,
                                                color: _greenLive,
                                              ),
                                            ),
                                          ],
                                        ),
                                        const SizedBox(height: 5),
                                      ],

                                      // Contenido del mensaje
                                      Text(
                                        contenido,
                                        style: TextStyle(
                                          fontSize: 14,
                                          color: esMio
                                              ? Colors.white
                                              : (isDark ? Colors.white : const Color(0xFF0F172A)),
                                        ),
                                      ),

                                      // Hora de envío
                                      if (horaStr.isNotEmpty) ...[
                                        const SizedBox(height: 4),
                                        Align(
                                          alignment: Alignment.bottomRight,
                                          child: Text(
                                            horaStr,
                                            style: TextStyle(
                                              fontSize: 10,
                                              color: esMio
                                                  ? const Color(0xB3FFFFFF)
                                                  : (isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B)),
                                            ),
                                          ),
                                        ),
                                      ],
                                    ],
                                  ),
                                ),
                              );
                            },
                  ),
          ),

          // BARRA INFERIOR DE ESCRITURA (Captura 3)
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            decoration: BoxDecoration(
              border: Border(
                top: BorderSide(color: borderColor),
              ),
              color: isDark ? const Color(0xFF0D131F) : Colors.white,
              borderRadius: const BorderRadius.vertical(bottom: Radius.circular(16)),
            ),
            child: Row(
              children: [
                // Íconos multimedia (imagen, audio, video)
                IconButton(
                  icon: const Icon(Icons.image_outlined, size: 20),
                  color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
                  onPressed: () {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Adjuntar imagen')),
                    );
                  },
                ),
                IconButton(
                  icon: const Icon(Icons.mic_none_outlined, size: 20),
                  color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
                  onPressed: () {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Grabar nota de voz')),
                    );
                  },
                ),
                IconButton(
                  icon: const Icon(Icons.videocam_outlined, size: 20),
                  color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
                  onPressed: () {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Adjuntar video')),
                    );
                  },
                ),
                const SizedBox(width: 4),

                // Campo de texto "Escribe un mensaje..."
                Expanded(
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14),
                    decoration: BoxDecoration(
                      color: isDark ? const Color(0xFF1E293B) : const Color(0xFFF1F5F9),
                      borderRadius: BorderRadius.circular(999),
                    ),
                    child: TextField(
                      controller: _mensajeCtrl,
                      textInputAction: TextInputAction.send,
                      onSubmitted: (_) => _enviarMensaje(),
                      style: TextStyle(
                        fontSize: 14,
                        color: isDark ? Colors.white : Colors.black87,
                      ),
                      decoration: InputDecoration(
                        hintText: 'Escribe un mensaje...',
                        hintStyle: TextStyle(
                          fontSize: 14,
                          color: isDark ? const Color(0xFF64748B) : const Color(0xFF94A3B8),
                        ),
                        border: InputBorder.none,
                        isDense: true,
                        contentPadding: const EdgeInsets.symmetric(vertical: 10),
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 8),

                // Botón dorado circular para enviar
                GestureDetector(
                  onTap: _enviando ? null : _enviarMensaje,
                  child: Container(
                    width: 40,
                    height: 40,
                    decoration: const BoxDecoration(
                      color: _brandGoldLight,
                      shape: BoxShape.circle,
                    ),
                    child: _enviando
                        ? const Center(
                            child: SizedBox(
                              width: 18,
                              height: 18,
                              child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                            ),
                          )
                        : const Icon(Icons.send, color: Colors.white, size: 18),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildAvisoLogin(bool isDark) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF111827) : const Color(0xFFF8FAFC),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: isDark ? const Color(0xFF1E293B) : const Color(0xFFE2E8F0)),
      ),
      child: Column(
        children: [
          const Icon(Icons.lock_outline, size: 48, color: _brandGold),
          const SizedBox(height: 12),
          const Text(
            'Inicia sesión para chatear con las tiendas',
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 8),
          Text(
            'CU14 · Conéctate con tu cuenta de comprador para realizar consultas directas y coordinar tus compras.',
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 13,
              color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
            ),
          ),
          const SizedBox(height: 16),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: _brandGold),
            onPressed: () {
              Navigator.push(context, MaterialPageRoute(builder: (_) => const AuthScreen())).then((_) {
                _iniciarChat();
              });
            },
            child: const Text('Iniciar sesión', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }

  // ==========================================
  // FOOTER (Captura 3)
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
