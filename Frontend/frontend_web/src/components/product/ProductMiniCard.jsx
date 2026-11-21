import { Link } from 'react-router-dom';

// Versión compacta (horizontal) de ProductCard, para listas secundarias como
// "Productos similares". Mismos colores, bordes y formato de precio.
export default function ProductMiniCard({ producto }) {
  const precio = producto.precio_descuento ?? producto.precio;

  return (
    <Link
      to={`/productos/${producto.id}`}
      className="group flex items-center gap-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-3 hover:border-brand-400 dark:hover:border-brand-500 hover:shadow-sm transition"
    >
      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800">
        <img src={producto.imagen} alt={producto.nombre} loading="lazy" className="h-full w-full object-cover group-hover:scale-105 transition-transform" />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 line-clamp-1 group-hover:text-brand-600 dark:group-hover:text-brand-400">
          {producto.nombre}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">{producto.empresa}</p>
        <p className="text-sm font-bold text-gray-900 dark:text-gray-100 mt-0.5">
          Bs {precio}
          {producto.precio_descuento != null && (
            <span className="ml-1.5 text-xs font-normal text-gray-400 dark:text-gray-500 line-through">Bs {producto.precio}</span>
          )}
        </p>
      </div>
    </Link>
  );
}
