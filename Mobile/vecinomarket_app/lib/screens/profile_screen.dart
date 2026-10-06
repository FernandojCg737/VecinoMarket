import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/api_client.dart';
import '../services/auth_service.dart';
import 'admin/admin_empresas_screen.dart';
import 'admin/admin_usuarios_screen.dart';
import 'admin/bitacora_screen.dart';
import 'buyer/buyer_addresses_screen.dart';
import 'buyer/buyer_cards_screen.dart';
import 'buyer/buyer_dashboard_screen.dart';
import 'buyer/buyer_recommendations_screen.dart';
import 'buyer/buyer_reviews_screen.dart';
import 'buyer/buyer_store_chatbot_screen.dart';
import 'chat_screen.dart';
import 'mis_pedidos_screen.dart';

const _nombresRol = {
  'SUPERADMIN': 'Super administrador',
  'ADMIN': 'Administrador (soporte)',
  'EMPRESA': 'Empresa',
  'EMPLEADO': 'Empleado',
  'COMPRADOR': 'Comprador',
};

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  bool _editando = false;
  bool _guardando = false;
  String? _error;
  String? _mensaje;

  late final TextEditingController _nombreCtrl;
  late final TextEditingController _apellidoCtrl;
  late final TextEditingController _telefonoCtrl;

  bool _cambiandoPassword = false;
  final _actualCtrl = TextEditingController();
  final _nuevaCtrl = TextEditingController();
  final _confirmarCtrl = TextEditingController();

  @override
  void initState() {
    super.initState();
    final usuario = context.read<AuthService>().usuario ?? {};
    _nombreCtrl = TextEditingController(text: usuario['nombre'] ?? '');
    _apellidoCtrl = TextEditingController(text: usuario['apellido'] ?? '');
    _telefonoCtrl = TextEditingController(text: usuario['telefono'] ?? '');
  }

  Future<void> _guardarPerfil() async {
    setState(() {
      _guardando = true;
      _error = null;
    });
    try {
      await context.read<AuthService>().actualizarPerfil(
            nombre: _nombreCtrl.text.trim(),
            apellido: _apellidoCtrl.text.trim(),
            telefono: _telefonoCtrl.text.trim(),
          );
      setState(() => _editando = false);
    } on ApiException catch (e) {
      setState(() => _error = e.mensaje);
    } finally {
      if (mounted) setState(() => _guardando = false);
    }
  }

  Future<void> _guardarPassword() async {
    if (_nuevaCtrl.text != _confirmarCtrl.text) {
      setState(() => _error = 'Las contraseñas no coinciden.');
      return;
    }
    setState(() {
      _guardando = true;
      _error = null;
      _mensaje = null;
    });
    try {
      await context.read<AuthService>().cambiarPassword(_actualCtrl.text, _nuevaCtrl.text);
      _actualCtrl.clear();
      _nuevaCtrl.clear();
      _confirmarCtrl.clear();
      setState(() {
        _cambiandoPassword = false;
        _mensaje = 'Contraseña actualizada correctamente.';
      });
    } on ApiException catch (e) {
      setState(() => _error = e.mensaje);
    } finally {
      if (mounted) setState(() => _guardando = false);
    }
  }

  Future<void> _confirmarCerrarSesion() async {
    final confirmar = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('¿Cerrar sesión?'),
        content: const Text('¿Estás seguro de que deseas salir de tu cuenta de VecinoMarket?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancelar')),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: Colors.red),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Cerrar sesión'),
          ),
        ],
      ),
    );

    if (confirmar == true && mounted) {
      context.read<AuthService>().logout();
      Navigator.pop(context);
    }
  }

  @override
  Widget build(BuildContext context) {
    final usuario = context.watch<AuthService>().usuario;
    if (usuario == null) {
      return const Scaffold(body: Center(child: Text('No hay sesión activa.')));
    }
    final rol = usuario['rol'] as String? ?? '';
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final bgColor = isDark ? const Color(0xFF111827) : Colors.white;
    final cardBg = isDark ? const Color(0xFF1F2937) : const Color(0xFFF9FAFB);
    final borderColor = isDark ? const Color(0xFF374151) : const Color(0xFFE5E7EB);

    return Scaffold(
      backgroundColor: bgColor,
      appBar: AppBar(
        title: const Text('Mi perfil', style: TextStyle(fontWeight: FontWeight.bold)),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Saludo y encabezado superior (Idéntico a Captura 2)
            Text(
              'Hola, ${usuario['nombre'] ?? 'Usuario'}',
              style: TextStyle(
                fontSize: 14,
                color: isDark ? const Color(0xFF9CA3AF) : const Color(0xFF6B7280),
              ),
            ),
            const SizedBox(height: 2),
            const Text(
              'Mi perfil',
              style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: 16),

            // Tarjeta de información del usuario
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: cardBg,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: borderColor),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      CircleAvatar(
                        radius: 24,
                        backgroundColor: const Color(0xFFD97706).withValues(alpha: 0.15),
                        child: Text(
                          (usuario['nombre'] as String? ?? 'U').characters.first.toUpperCase(),
                          style: const TextStyle(color: Color(0xFFD97706), fontWeight: FontWeight.bold, fontSize: 20),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              '${usuario['nombre'] ?? ''} ${usuario['apellido'] ?? ''}'.trim(),
                              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              usuario['email'] ?? '',
                              style: TextStyle(fontSize: 12, color: isDark ? const Color(0xFF9CA3AF) : const Color(0xFF6B7280)),
                            ),
                          ],
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                          color: const Color(0xFFD97706).withValues(alpha: 0.15),
                          borderRadius: BorderRadius.circular(999),
                        ),
                        child: Text(
                          _nombresRol[rol] ?? rol,
                          style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFFD97706)),
                        ),
                      ),
                    ],
                  ),
                  const Divider(height: 24),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Datos personales',
                        style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: isDark ? Colors.white70 : Colors.black87),
                      ),
                      TextButton.icon(
                        icon: Icon(_editando ? Icons.close : Icons.edit, size: 15),
                        label: Text(_editando ? 'Cancelar' : 'Editar'),
                        onPressed: () => setState(() => _editando = !_editando),
                      ),
                    ],
                  ),
                  if (_editando) ...[
                    const SizedBox(height: 8),
                    TextField(
                      controller: _nombreCtrl,
                      decoration: const InputDecoration(labelText: 'Nombre', border: OutlineInputBorder(), isDense: true),
                    ),
                    const SizedBox(height: 10),
                    TextField(
                      controller: _apellidoCtrl,
                      decoration: const InputDecoration(labelText: 'Apellido', border: OutlineInputBorder(), isDense: true),
                    ),
                    const SizedBox(height: 10),
                    TextField(
                      controller: _telefonoCtrl,
                      keyboardType: TextInputType.phone,
                      decoration: const InputDecoration(labelText: 'Teléfono', border: OutlineInputBorder(), isDense: true),
                    ),
                    const SizedBox(height: 12),
                    FilledButton(
                      style: FilledButton.styleFrom(backgroundColor: const Color(0xFFD97706)),
                      onPressed: _guardando ? null : _guardarPerfil,
                      child: _guardando
                          ? const SizedBox(height: 16, width: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                          : const Text('Guardar cambios'),
                    ),
                  ] else ...[
                    _filaDato('Teléfono', (usuario['telefono'] as String?)?.isNotEmpty == true ? usuario['telefono'] : 'No registrado'),
                  ],

                  // Sección contraseña
                  const SizedBox(height: 8),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Seguridad y contraseña',
                        style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: isDark ? Colors.white70 : Colors.black87),
                      ),
                      TextButton(
                        onPressed: () => setState(() => _cambiandoPassword = !_cambiandoPassword),
                        child: Text(_cambiandoPassword ? 'Cancelar' : 'Cambiar'),
                      ),
                    ],
                  ),
                  if (_cambiandoPassword) ...[
                    const SizedBox(height: 6),
                    TextField(
                      controller: _actualCtrl,
                      obscureText: true,
                      decoration: const InputDecoration(labelText: 'Contraseña actual', border: OutlineInputBorder(), isDense: true),
                    ),
                    const SizedBox(height: 10),
                    TextField(
                      controller: _nuevaCtrl,
                      obscureText: true,
                      decoration: const InputDecoration(labelText: 'Contraseña nueva', border: OutlineInputBorder(), isDense: true),
                    ),
                    const SizedBox(height: 10),
                    TextField(
                      controller: _confirmarCtrl,
                      obscureText: true,
                      decoration: const InputDecoration(labelText: 'Confirmar contraseña nueva', border: OutlineInputBorder(), isDense: true),
                    ),
                    const SizedBox(height: 12),
                    FilledButton(
                      style: FilledButton.styleFrom(backgroundColor: const Color(0xFFD97706)),
                      onPressed: _guardando ? null : _guardarPassword,
                      child: _guardando
                          ? const SizedBox(height: 16, width: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                          : const Text('Actualizar contraseña'),
                    ),
                  ],
                  if (_error != null) ...[
                    const SizedBox(height: 8),
                    Text(_error!, style: const TextStyle(color: Colors.red, fontSize: 12)),
                  ],
                  if (_mensaje != null) ...[
                    const SizedBox(height: 8),
                    Text(_mensaje!, style: const TextStyle(color: Colors.green, fontSize: 12)),
                  ],
                ],
              ),
            ),

            const SizedBox(height: 20),

            // SECCIÓN COMPRADOR: TODAS LAS FUNCIONALIDADES (Captura 2)
            if (rol == 'COMPRADOR' || rol.isEmpty) ...[
              const Text(
                'Opciones de comprador',
                style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 10),

              _buildMenuOpcion(
                icon: Icons.dashboard_outlined,
                titulo: 'Mi cuenta',
                subtitulo: 'Resumen, estadísticas y accesos directos',
                onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const BuyerDashboardScreen())),
              ),
              _buildMenuOpcion(
                icon: Icons.auto_awesome_outlined,
                titulo: 'Recomendado para ti',
                subtitulo: 'Productos sugeridos con inteligencia artificial',
                onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const BuyerRecommendationsScreen())),
              ),
              _buildMenuOpcion(
                icon: Icons.location_on_outlined,
                titulo: 'Mis direcciones',
                subtitulo: 'Gestiona tus direcciones de envío a domicilio',
                onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const BuyerAddressesScreen())),
              ),
              _buildMenuOpcion(
                icon: Icons.credit_card_outlined,
                titulo: 'Métodos de pago',
                subtitulo: 'Tarjetas y métodos guardados seguros',
                onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const BuyerCardsScreen())),
              ),
              _buildMenuOpcion(
                icon: Icons.receipt_long_outlined,
                titulo: 'Mis compras',
                subtitulo: 'Historial de pedidos y compras realizadas (CU26)',
                onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const MisPedidosScreen())),
              ),
              _buildMenuOpcion(
                icon: Icons.star_outline,
                titulo: 'Mis reseñas',
                subtitulo: 'Calificaciones y opiniones de tus compras (CU13)',
                onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const BuyerReviewsScreen())),
              ),
              _buildMenuOpcion(
                icon: Icons.chat_bubble_outline,
                titulo: 'Mis chats',
                subtitulo: 'Mensajería directa en tiempo real con las tiendas (CU14)',
                onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const ChatScreen())),
              ),
              _buildMenuOpcion(
                icon: Icons.smart_toy_outlined,
                titulo: 'Chatbot de tiendas',
                subtitulo: 'Pregunta a los asistentes virtuales de cada tienda (CU15)',
                onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const BuyerStoreChatbotScreen())),
              ),
              const SizedBox(height: 6),
              _buildMenuOpcion(
                icon: Icons.logout,
                titulo: 'Cerrar sesión',
                subtitulo: 'Salir de tu cuenta en este dispositivo',
                colorTexto: Colors.redAccent,
                colorIcono: Colors.redAccent,
                mostrarChevron: false,
                onTap: _confirmarCerrarSesion,
              ),
            ],

            // SECCIÓN ADMINISTRACIÓN (Si es ADMIN o SUPERADMIN)
            if (rol == 'ADMIN' || rol == 'SUPERADMIN') ...[
              const SizedBox(height: 20),
              const Text(
                'Administración del sistema',
                style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 10),
              if (rol == 'SUPERADMIN')
                _buildMenuOpcion(
                  icon: Icons.receipt_long_outlined,
                  titulo: 'Bitácora',
                  subtitulo: 'Accesos y acciones críticas (CU22)',
                  onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const BitacoraScreen())),
                ),
              _buildMenuOpcion(
                icon: Icons.people_outline,
                titulo: 'Usuarios',
                subtitulo: 'Bloquear o desbloquear cuentas',
                onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const AdminUsuariosScreen())),
              ),
              _buildMenuOpcion(
                icon: Icons.store_outlined,
                titulo: 'Empresas',
                subtitulo: 'Suspender o reactivar empresas',
                onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const AdminEmpresasScreen())),
              ),
              const SizedBox(height: 6),
              _buildMenuOpcion(
                icon: Icons.logout,
                titulo: 'Cerrar sesión',
                colorTexto: Colors.redAccent,
                colorIcono: Colors.redAccent,
                mostrarChevron: false,
                onTap: _confirmarCerrarSesion,
              ),
            ],

            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }

  Widget _buildMenuOpcion({
    required IconData icon,
    required String titulo,
    String? subtitulo,
    required VoidCallback onTap,
    Color? colorTexto,
    Color? colorIcono,
    bool mostrarChevron = true,
  }) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final cardBg = isDark ? const Color(0xFF1F2937) : const Color(0xFFF9FAFB);
    final borderColor = isDark ? const Color(0xFF374151) : const Color(0xFFE5E7EB);

    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      decoration: BoxDecoration(
        color: cardBg,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: borderColor),
      ),
      child: ListTile(
        leading: Icon(icon, color: colorIcono ?? const Color(0xFFD97706), size: 22),
        title: Text(
          titulo,
          style: TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.bold,
            color: colorTexto ?? (isDark ? Colors.white : const Color(0xFF111827)),
          ),
        ),
        subtitle: subtitulo != null
            ? Text(
                subtitulo,
                style: TextStyle(
                  fontSize: 11,
                  color: isDark ? const Color(0xFF9CA3AF) : const Color(0xFF6B7280),
                ),
              )
            : null,
        trailing: mostrarChevron
            ? Icon(Icons.chevron_right, size: 20, color: isDark ? const Color(0xFF9CA3AF) : const Color(0xFF6B7280))
            : null,
        onTap: onTap,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      ),
    );
  }

  Widget _filaDato(String etiqueta, String? valor) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 4),
      child: Row(
        children: [
          SizedBox(width: 90, child: Text(etiqueta, style: const TextStyle(color: Colors.grey, fontSize: 13))),
          Expanded(child: Text(valor ?? '—', style: const TextStyle(fontSize: 13))),
        ],
      ),
    );
  }
}
