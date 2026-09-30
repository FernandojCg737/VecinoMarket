import API from './axios';

// Adaptadores: convierten la forma real de la API (categoria/empresa anidados,
// imagenes como lista, sin rating por producto) a la forma plana que ya
// esperan ProductCard/Cart/Checkout desde que existían con datos mock.
// El id de categoría se guarda como string porque los query params de la URL
// (?categoria=) siempre llegan como string, y así las comparaciones ===
// existentes en ProductListing/ProductDetail siguen funcionando igual.

function adaptarCategoria(c) {
  return { id: String(c.id), nombre: c.nombre, icono: c.icono || 'Package' };
}

function adaptarProducto(p) {
  return {
    id: p.id,
    nombre: p.nombre,
    descripcion: p.descripcion || '',
    categoriaId: p.categoria ? String(p.categoria.id) : '',
    empresa: p.empresa?.razon_social || '',
    empresaId: p.empresa?.id ?? null,
    precio: Number(p.precio),
    precio_descuento: p.precio_descuento != null ? Number(p.precio_descuento) : null,
    stock: p.stock ?? 0,
    imagen: p.imagenes?.[0]?.url || '/logo.png',
    // Lista completa para la galería del detalle; ProductCard/Cart/Checkout
    // siguen usando solo 'imagen' (la primera) y no necesitan tocarse.
    imagenes: p.imagenes?.length ? p.imagenes.map((img) => img.url) : ['/logo.png'],
    // El modelo real no tiene valoración por producto (Valoracion es por
    // pedido/empresa), así que StarRating simplemente no se dibuja.
    rating: null,
    resenas: null,
  };
}

export async function obtenerCategorias() {
  const { data } = await API.get('catalogo/categorias/');
  return data.map(adaptarCategoria);
}

export async function obtenerProductos({ q = '', categoriaId = '' } = {}) {
  const params = { page_size: 100 };
  if (q) params.q = q;
  if (categoriaId) params.categoria = categoriaId;
  const { data } = await API.get('catalogo/productos/', { params });
  return data.results.map(adaptarProducto);
}

export async function obtenerProducto(id) {
  const { data } = await API.get(`catalogo/productos/${id}/`);
  return adaptarProducto(data);
}
