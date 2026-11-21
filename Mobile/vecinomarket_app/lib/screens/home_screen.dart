import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/categoria.dart';
import '../models/producto.dart';
import '../services/auth_service.dart';
import '../services/cart_service.dart';
import '../services/catalogo_service.dart';
import '../services/notificacion_service.dart';
import '../services/theme_service.dart';
import 'auth_screen.dart';
import 'cart_screen.dart';
import 'live_commerce_screen.dart';
import '../services/ia_service.dart';
import '../widgets/notification_badge_button.dart';
import '../widgets/secciones_ia.dart';
import '../widgets/tarjeta_producto.dart';
import 'buyer/buyer_nearby_screen.dart';
import 'profile_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final _catalogo = CatalogoService();
  final _busquedaCtrl = TextEditingController();

  List<Categoria> _categorias = [];
  int? _categoriaSeleccionada;
  late Future<List<Producto>> _productosFuture;

  bool _notifFetched = false;

  @override
  void initState() {
    super.initState();
    _productosFuture = _catalogo.obtenerProductos();
    _catalogo.obtenerCategorias().then((cats) {
      if (mounted) setState(() => _categorias = cats);
    });
  }

  void _recargar() {
    // RF46: registra la búsqueda (el backend cuenta sus resultados para CU3).
    final termino = _busquedaCtrl.text.trim();
    if (termino.length >= 2) IaService.registrarEvento('BUSQUEDA', termino: termino);
    setState(() {
      _productosFuture = _catalogo.obtenerProductos(
        q: _busquedaCtrl.text.trim(),
        categoriaId: _categoriaSeleccionada,
      );
    });
  }

  @override
  Widget build(BuildContext context) {
    final usuario = context.watch<AuthService>().usuario;
    final totalCarrito = context.watch<CartService>().totalItems;
    final tema = context.watch<ThemeService>();
    final esOscuro = Theme.of(context).brightness == Brightness.dark;

    if (usuario != null && !_notifFetched) {
      _notifFetched = true;
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) context.read<NotificacionService>().fetchUnreadCount();
      });
    }

    return Scaffold(
      appBar: AppBar(
        titleSpacing: 10,
        title: FittedBox(
          fit: BoxFit.scaleDown,
          alignment: Alignment.centerLeft,
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Image.asset(
                esOscuro ? 'assets/images/logo-dark.png' : 'assets/images/logo.png',
                height: 24,
                fit: BoxFit.contain,
              ),
              const SizedBox(width: 6),
              InkWell(
                onTap: () => Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => const LiveCommerceScreen()),
                ),
                borderRadius: BorderRadius.circular(999),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                  decoration: BoxDecoration(
                    color: const Color(0xFFDC2626),
                    borderRadius: BorderRadius.circular(999),
                    boxShadow: const [
                      BoxShadow(
                        color: Color(0x33DC2626),
                        blurRadius: 4,
                        offset: Offset(0, 2),
                      ),
                    ],
                  ),
                  child: const Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.sensors, color: Colors.white, size: 12),
                      SizedBox(width: 3),
                      Text(
                        'LIVE',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 9.5,
                          fontWeight: FontWeight.w900,
                          letterSpacing: 0.5,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(width: 4),
              const NotificationBadgeButton(size: 21),
            ],
          ),
        ),
        actions: [
          // CU2 (RF45): "Cerca de ti"
          IconButton(
            icon: const Icon(Icons.location_on_outlined, size: 21),
            padding: const EdgeInsets.all(6),
            constraints: const BoxConstraints(minWidth: 34, minHeight: 34),
            visualDensity: VisualDensity.compact,
            tooltip: 'Cerca de ti',
            onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const BuyerNearbyScreen())),
          ),
          IconButton(
            icon: Icon(esOscuro ? Icons.light_mode_outlined : Icons.dark_mode_outlined, size: 21),
            padding: const EdgeInsets.all(6),
            constraints: const BoxConstraints(minWidth: 34, minHeight: 34),
            visualDensity: VisualDensity.compact,
            tooltip: esOscuro ? 'Modo claro' : 'Modo noche',
            onPressed: () => tema.alternar(),
          ),
          Stack(
            alignment: Alignment.center,
            children: [
              IconButton(
                icon: const Icon(Icons.shopping_cart_outlined, size: 21),
                padding: const EdgeInsets.all(6),
                constraints: const BoxConstraints(minWidth: 34, minHeight: 34),
                visualDensity: VisualDensity.compact,
                onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const CartScreen())),
              ),
              if (totalCarrito > 0)
                Positioned(
                  top: 3,
                  right: 1,
                  child: Container(
                    padding: const EdgeInsets.all(2),
                    decoration: const BoxDecoration(color: Colors.red, shape: BoxShape.circle),
                    constraints: const BoxConstraints(minWidth: 15, minHeight: 15),
                    child: Text(
                      '$totalCarrito',
                      textAlign: TextAlign.center,
                      style: const TextStyle(color: Colors.white, fontSize: 9.5, fontWeight: FontWeight.bold),
                    ),
                  ),
                ),
            ],
          ),
          IconButton(
            icon: Icon(usuario != null ? Icons.person : Icons.person_outline, size: 21),
            padding: const EdgeInsets.all(6),
            constraints: const BoxConstraints(minWidth: 34, minHeight: 34),
            visualDensity: VisualDensity.compact,
            tooltip: usuario != null ? 'Mi perfil (${usuario['nombre']})' : 'Ingresar',
            onPressed: () => Navigator.push(
              context,
              MaterialPageRoute(
                builder: (_) => usuario != null ? const ProfileScreen() : const AuthScreen(),
              ),
            ),
          ),
          const SizedBox(width: 4),
        ],
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(12, 12, 12, 0),
            child: TextField(
              controller: _busquedaCtrl,
              decoration: InputDecoration(
                hintText: 'Busca productos, tiendas o categorías...',
                prefixIcon: const Icon(Icons.search),
                filled: true,
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
              ),
              textInputAction: TextInputAction.search,
              onSubmitted: (_) => _recargar(),
            ),
          ),
          if (_categorias.isNotEmpty)
            SizedBox(
              height: 48,
              child: ListView(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                children: [
                  _chipCategoria('Todas', _categoriaSeleccionada == null, () {
                    setState(() => _categoriaSeleccionada = null);
                    _recargar();
                  }),
                  ..._categorias.map(
                    (c) => _chipCategoria(c.nombre, _categoriaSeleccionada == c.id, () {
                      setState(() => _categoriaSeleccionada = c.id);
                      _recargar();
                    }),
                  ),
                ],
              ),
            ),
          Expanded(
            child: RefreshIndicator(
              onRefresh: () async {
                _recargar();
                await _productosFuture;
              },
              child: FutureBuilder<List<Producto>>(
                future: _productosFuture,
                builder: (context, snapshot) {
                  if (snapshot.connectionState == ConnectionState.waiting) {
                    return const Center(child: CircularProgressIndicator());
                  }
                  if (snapshot.hasError) {
                    return ListView(
                      children: [
                        const SizedBox(height: 80),
                        Icon(Icons.error_outline, size: 48, color: Colors.grey.shade400),
                        const SizedBox(height: 12),
                        const Center(child: Text('No se pudo cargar el catálogo.')),
                      ],
                    );
                  }
                  final productos = snapshot.data ?? [];
                  // Los carruseles de IA solo en la portada "limpia" (sin búsqueda ni categoría).
                  final portada = _busquedaCtrl.text.trim().isEmpty && _categoriaSeleccionada == null;
                  return CustomScrollView(
                    physics: const AlwaysScrollableScrollPhysics(),
                    slivers: [
                      if (portada) ...[
                        const SliverToBoxAdapter(child: SeccionParaTi()),
                        const SliverToBoxAdapter(child: SeccionCercaDeTi()),
                        const SliverToBoxAdapter(
                          child: Padding(
                            padding: EdgeInsets.fromLTRB(16, 16, 16, 0),
                            child: Text('Todos los productos', style: TextStyle(fontSize: 17, fontWeight: FontWeight.bold)),
                          ),
                        ),
                      ],
                      if (productos.isEmpty)
                        const SliverFillRemaining(
                          hasScrollBody: false,
                          child: Center(child: Text('No hay productos con esos filtros.')),
                        )
                      else
                        SliverPadding(
                          padding: const EdgeInsets.all(12),
                          sliver: SliverGrid.builder(
                            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                              crossAxisCount: 2,
                              childAspectRatio: 0.62,
                              crossAxisSpacing: 12,
                              mainAxisSpacing: 12,
                            ),
                            itemCount: productos.length,
                            itemBuilder: (context, i) => TarjetaProducto(producto: productos[i]),
                          ),
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

  Widget _chipCategoria(String texto, bool seleccionado, VoidCallback onTap) {
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: ChoiceChip(
        label: Text(texto),
        selected: seleccionado,
        onSelected: (_) => onTap(),
      ),
    );
  }
}
