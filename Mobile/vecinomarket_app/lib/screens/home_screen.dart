import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/categoria.dart';
import '../models/producto.dart';
import '../services/auth_service.dart';
import '../services/cart_service.dart';
import '../services/catalogo_service.dart';
import '../services/theme_service.dart';
import 'auth_screen.dart';
import 'cart_screen.dart';
import 'live_commerce_screen.dart';
import 'product_detail_screen.dart';
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

  @override
  void initState() {
    super.initState();
    _productosFuture = _catalogo.obtenerProductos();
    _catalogo.obtenerCategorias().then((cats) {
      if (mounted) setState(() => _categorias = cats);
    });
  }

  void _recargar() {
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
            ],
          ),
        ),
        actions: [
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
                  if (productos.isEmpty) {
                    return const Center(child: Text('No hay productos con esos filtros.'));
                  }
                  return GridView.builder(
                    padding: const EdgeInsets.all(12),
                    gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                      crossAxisCount: 2,
                      childAspectRatio: 0.62,
                      crossAxisSpacing: 12,
                      mainAxisSpacing: 12,
                    ),
                    itemCount: productos.length,
                    itemBuilder: (context, i) => _TarjetaProducto(producto: productos[i]),
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

class _TarjetaProducto extends StatelessWidget {
  const _TarjetaProducto({required this.producto});
  final Producto producto;

  @override
  Widget build(BuildContext context) {
    return Card(
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => ProductDetailScreen(producto: producto))),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            AspectRatio(
              aspectRatio: 1,
              child: producto.imagenUrl != null
                  ? Image.network(producto.imagenUrl!, fit: BoxFit.cover)
                  : Container(color: Colors.grey.shade200, child: const Icon(Icons.image_not_supported)),
            ),
            Padding(
              padding: const EdgeInsets.all(8),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    producto.empresaNombre,
                    style: const TextStyle(fontSize: 10, color: Colors.green, fontWeight: FontWeight.bold),
                    maxLines: 1,
                  ),
                  Text(producto.nombre, style: const TextStyle(fontSize: 13), maxLines: 2, overflow: TextOverflow.ellipsis),
                  const SizedBox(height: 4),
                  if (producto.tieneDescuento)
                    Row(
                      children: [
                        Text('Bs ${producto.precioDescuento}', style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.deepOrange)),
                        const SizedBox(width: 4),
                        Flexible(
                          child: Text(
                            'Bs ${producto.precio}',
                            style: const TextStyle(fontSize: 11, color: Colors.grey, decoration: TextDecoration.lineThrough),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                    )
                  else
                    Text('Bs ${producto.precio}', style: const TextStyle(fontWeight: FontWeight.bold)),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
