import 'package:flutter/material.dart';
import '../../services/api_client.dart';
import '../../services/auth_service.dart';
import '../../services/chat_service.dart';
import 'package:provider/provider.dart';

class BuyerStoreChatbotScreen extends StatefulWidget {
  const BuyerStoreChatbotScreen({super.key});

  @override
  State<BuyerStoreChatbotScreen> createState() => _BuyerStoreChatbotScreenState();
}

class _BuyerStoreChatbotScreenState extends State<BuyerStoreChatbotScreen> {
  final _api = ApiClient.instance;
  final _busquedaCtrl = TextEditingController();
  List<dynamic> _empresas = [];
  bool _cargando = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _cargarEmpresas();
  }

  Future<void> _cargarEmpresas([String? query]) async {
    setState(() {
      _cargando = true;
      _error = null;
    });

    try {
      final params = query != null && query.trim().isNotEmpty ? {'q': query.trim()} : null;
      final res = await _api.get('usuarios/empresas/lista-publica/', params: params, autenticado: false);
      if (mounted) {
        setState(() {
          _empresas = (res as List?) ?? [];
          _cargando = false;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _error = 'No se pudo cargar la lista de tiendas.';
          _cargando = false;
        });
      }
    }
  }

  void _abrirChatbot(Map<String, dynamic> empresa) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => _ChatbotDialogScreen(
          empresaId: empresa['id'] as int,
          empresaNombre: empresa['razon_social'] ?? empresa['nombre'] ?? 'Tienda',
        ),
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
            Icon(Icons.smart_toy_outlined, size: 22, color: Color(0xFFD97706)),
            SizedBox(width: 8),
            Text('Chatbot de tiendas', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
          ],
        ),
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'CU15 · Selecciona una tienda para consultar horarios, formas de pago y dudas a su asistente de IA.',
                  style: TextStyle(fontSize: 13, color: isDark ? const Color(0xFF9CA3AF) : const Color(0xFF6B7280)),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: _busquedaCtrl,
                  decoration: InputDecoration(
                    hintText: 'Buscar tienda por razón social o nombre...',
                    prefixIcon: const Icon(Icons.search),
                    suffixIcon: IconButton(
                      icon: const Icon(Icons.arrow_forward),
                      onPressed: () => _cargarEmpresas(_busquedaCtrl.text),
                    ),
                    filled: true,
                    fillColor: cardBg,
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: borderColor)),
                  ),
                  onSubmitted: _cargarEmpresas,
                ),
              ],
            ),
          ),
          Expanded(
            child: _cargando
                ? const Center(child: CircularProgressIndicator())
                : _error != null
                    ? Center(child: Text(_error!))
                    : _empresas.isEmpty
                        ? const Center(child: Text('No se encontraron tiendas disponibles.'))
                        : RefreshIndicator(
                            onRefresh: () => _cargarEmpresas(_busquedaCtrl.text),
                            child: ListView.builder(
                              padding: const EdgeInsets.symmetric(horizontal: 16),
                              itemCount: _empresas.length,
                              itemBuilder: (context, i) {
                                final emp = _empresas[i] as Map<String, dynamic>;
                                final nombre = emp['razon_social'] ?? emp['nombre'] ?? 'Tienda';
                                final ciudad = emp['ciudad'] ?? '';
                                final logo = emp['logo_url'] ?? emp['logo'];

                                return Container(
                                  margin: const EdgeInsets.only(bottom: 10),
                                  decoration: BoxDecoration(
                                    color: cardBg,
                                    borderRadius: BorderRadius.circular(14),
                                    border: Border.all(color: borderColor),
                                  ),
                                  child: ListTile(
                                    leading: CircleAvatar(
                                      backgroundColor: const Color(0xFFD97706).withValues(alpha: 0.15),
                                      backgroundImage: logo != null && logo.toString().isNotEmpty ? NetworkImage(logo.toString()) : null,
                                      child: logo == null || logo.toString().isEmpty
                                          ? const Icon(Icons.storefront, color: Color(0xFFD97706))
                                          : null,
                                    ),
                                    title: Text(nombre, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                                    subtitle: Text(ciudad.isNotEmpty ? ciudad : 'Comercio local', style: const TextStyle(fontSize: 12, color: Colors.grey)),
                                    trailing: const Row(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        Icon(Icons.smart_toy_outlined, color: Color(0xFFD97706), size: 18),
                                        SizedBox(width: 4),
                                        Text('Preguntar', style: TextStyle(color: Color(0xFFD97706), fontWeight: FontWeight.bold, fontSize: 12)),
                                        Icon(Icons.chevron_right, size: 18, color: Colors.grey),
                                      ],
                                    ),
                                    onTap: () => _abrirChatbot(emp),
                                  ),
                                );
                              },
                            ),
                          ),
          ),
        ],
      ),
    );
  }
}

class _ChatbotDialogScreen extends StatefulWidget {
  final int empresaId;
  final String empresaNombre;

  const _ChatbotDialogScreen({required this.empresaId, required this.empresaNombre});

  @override
  State<_ChatbotDialogScreen> createState() => _ChatbotDialogScreenState();
}

class _ChatbotDialogScreenState extends State<_ChatbotDialogScreen> {
  final _chatService = ChatService();
  final _inputCtrl = TextEditingController();
  final _scrollCtrl = ScrollController();
  final List<Map<String, String>> _mensajes = [];
  bool _enviando = false;

  final _sugerencias = [
    '¿Cuáles son sus horarios de atención?',
    '¿Qué formas de pago aceptan?',
    '¿Hacen envíos a domicilio y cuánto demora?',
    '¿Qué garantía tienen sus productos?',
  ];

  Future<void> _enviar(String texto) async {
    final t = texto.trim();
    if (t.isEmpty || _enviando) return;

    final usuario = context.read<AuthService>().usuario;
    final isAuth = usuario != null;

    setState(() {
      _mensajes.add({'autor': 'yo', 'texto': t});
      _enviando = true;
    });
    _inputCtrl.clear();
    _scrollAbajo();

    try {
      final respuesta = await _chatService.preguntarChatbot(
        empresaId: widget.empresaId,
        empresaNombre: widget.empresaNombre,
        pregunta: t,
        autenticado: isAuth,
      );
      if (mounted) {
        setState(() {
          _mensajes.add({'autor': 'bot', 'texto': respuesta});
        });
        _scrollAbajo();
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _mensajes.add({'autor': 'bot', 'texto': 'Ocurrió un error al procesar tu consulta.'});
        });
      }
    } finally {
      if (mounted) setState(() => _enviando = false);
    }
  }

  void _scrollAbajo() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollCtrl.hasClients) {
        _scrollCtrl.animateTo(_scrollCtrl.position.maxScrollExtent, duration: const Duration(milliseconds: 250), curve: Curves.easeOut);
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final cardBg = isDark ? const Color(0xFF1F2937) : const Color(0xFFF9FAFB);

    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(Icons.smart_toy_outlined, color: Color(0xFFD97706), size: 18),
                const SizedBox(width: 6),
                Text(widget.empresaNombre, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
              ],
            ),
            const Text('Asistente virtual inteligente', style: TextStyle(fontSize: 11, color: Colors.grey)),
          ],
        ),
      ),
      body: Column(
        children: [
          // Mensajes
          Expanded(
            child: ListView(
              controller: _scrollCtrl,
              padding: const EdgeInsets.all(16),
              children: [
                if (_mensajes.isEmpty) ...[
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: cardBg,
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Row(
                          children: [
                            Icon(Icons.auto_awesome, color: Color(0xFFD97706), size: 18),
                            SizedBox(width: 8),
                            Text('¡Hola! Soy el asistente de la tienda.', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                          ],
                        ),
                        const SizedBox(height: 8),
                        const Text(
                          'Puedes hacerme cualquier pregunta o seleccionar una de las sugerencias rápidas:',
                          style: TextStyle(fontSize: 13),
                        ),
                        const SizedBox(height: 12),
                        Wrap(
                          spacing: 8,
                          runSpacing: 8,
                          children: _sugerencias.map((sug) {
                            return ActionChip(
                              label: Text(sug, style: const TextStyle(fontSize: 12)),
                              onPressed: () => _enviar(sug),
                            );
                          }).toList(),
                        ),
                      ],
                    ),
                  ),
                ],
                ..._mensajes.map((m) {
                  final esYo = m['autor'] == 'yo';
                  return Align(
                    alignment: esYo ? Alignment.centerRight : Alignment.centerLeft,
                    child: Container(
                      margin: const EdgeInsets.only(bottom: 10),
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                      constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.78),
                      decoration: BoxDecoration(
                        color: esYo
                            ? const Color(0xFFD97706)
                            : (isDark ? const Color(0xFF1F2937) : const Color(0xFFF3F4F6)),
                        borderRadius: BorderRadius.circular(14),
                      ),
                      child: Text(
                        m['texto'] ?? '',
                        style: TextStyle(
                          color: esYo ? Colors.white : (isDark ? Colors.white : Colors.black87),
                          fontSize: 14,
                        ),
                      ),
                    ),
                  );
                }),
                if (_enviando)
                  const Align(
                    alignment: Alignment.centerLeft,
                    child: Padding(
                      padding: EdgeInsets.all(8),
                      child: SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Color(0xFFD97706))),
                    ),
                  ),
              ],
            ),
          ),

          // Campo de entrada
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            decoration: BoxDecoration(
              color: isDark ? const Color(0xFF111827) : Colors.white,
              border: Border(top: BorderSide(color: isDark ? const Color(0xFF374151) : const Color(0xFFE5E7EB))),
            ),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _inputCtrl,
                    decoration: const InputDecoration(
                      hintText: 'Escribe tu pregunta a la tienda...',
                      border: InputBorder.none,
                      isDense: true,
                    ),
                    onSubmitted: _enviar,
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.send, color: Color(0xFFD97706)),
                  onPressed: () => _enviar(_inputCtrl.text),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
