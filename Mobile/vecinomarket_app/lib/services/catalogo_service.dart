import '../models/categoria.dart';
import '../models/producto.dart';
import 'api_client.dart';

class CatalogoService {
  Future<List<Categoria>> obtenerCategorias() async {
    final data = await ApiClient.instance.get('catalogo/categorias/', autenticado: false) as List<dynamic>;
    return data.map((c) => Categoria.fromJson(c as Map<String, dynamic>)).toList();
  }

  Future<List<Producto>> obtenerProductos({String? q, int? categoriaId}) async {
    final params = <String, dynamic>{'page_size': 100};
    if (q != null && q.isNotEmpty) params['q'] = q;
    if (categoriaId != null) params['categoria'] = categoriaId;

    final data = await ApiClient.instance.get('catalogo/productos/', params: params, autenticado: false);
    final results = data['results'] as List<dynamic>;
    return results.map((p) => Producto.fromJson(p as Map<String, dynamic>)).toList();
  }
}
