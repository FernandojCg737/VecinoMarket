import { Link } from 'react-router-dom';
import { ShoppingCart } from 'lucide-react';
import StarRating from './StarRating';
import WishlistButton from './WishlistButton';
import { useCart } from '../../context/CartContext';

// insignia (opcional): { texto, icono } — etiqueta arriba a la izquierda
// ("Para ti", "0,6 km"). nota (opcional): línea chica bajo el nombre
// ("★ 4,7", "Sucursal Centro"). Sin ellas la tarjeta se ve igual que siempre.
export default function ProductCard({ producto, insignia = null, nota = '' }) {
  const { agregarAlCarrito } = useCart();
  const tieneDescuento = Boolean(producto.precio_descuento);
  const porcentaje = tieneDescuento
    ? Math.round(100 - (producto.precio_descuento / producto.precio) * 100)
    : 0;

  return (
    <div className="group relative flex flex-col rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden hover:shadow-lg dark:hover:shadow-none dark:hover:border-gray-700 transition-shadow">
      <Link to={`/productos/${producto.id}`} className="block relative aspect-square overflow-hidden bg-gray-100 dark:bg-gray-800">
        <img
          src={producto.imagen}
          alt={producto.nombre}
          loading="lazy"
          className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        {insignia && (
          <span className="absolute top-2 left-2 flex items-center gap-1 rounded-full border border-brand-200 dark:border-brand-800 bg-brand-50/95 dark:bg-gray-900/90 px-2 py-0.5 text-[11px] font-semibold text-brand-700 dark:text-brand-300">
            {insignia.icono && <insignia.icono size={11} />}
            {insignia.texto}
          </span>
        )}
        {tieneDescuento && (
          // Con insignia, el descuento va debajo de ella (arriba a la derecha está el corazón de CU30).
          <span className={`absolute ${insignia ? 'top-9' : 'top-2'} left-2 rounded-full bg-brand-600 px-2 py-0.5 text-xs font-bold text-white`}>
            -{porcentaje}%
          </span>
        )}
        <div className="absolute top-2 right-2 z-10">
          <WishlistButton producto={producto} className="h-8 w-8" size={16} />
        </div>
      </Link>

      <div className="flex flex-1 flex-col gap-1.5 p-3">
        {producto.empresaId ? (
          <Link
            to={`/productos?empresa=${producto.empresaId}&empresaNombre=${encodeURIComponent(producto.empresa)}`}
            className="text-[11px] uppercase tracking-wide text-green-600 dark:text-green-400 font-semibold hover:underline w-fit"
            onClick={(e) => e.stopPropagation()}
          >
            {producto.empresa}
          </Link>
        ) : (
          <span className="text-[11px] uppercase tracking-wide text-green-600 dark:text-green-400 font-semibold">
            {producto.empresa}
          </span>
        )}
        <Link to={`/productos/${producto.id}`} className="line-clamp-2 text-sm font-medium text-gray-800 dark:text-gray-200 hover:text-brand-600 dark:hover:text-brand-400">
          {producto.nombre}
        </Link>
        <StarRating rating={producto.rating} resenas={producto.resenas} />
        {nota && <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">{nota}</p>}

        <div className="mt-auto flex items-end justify-between pt-2">
          <div>
            {tieneDescuento ? (
              <div className="flex items-baseline gap-1.5">
                <span className="text-lg font-bold text-brand-600 dark:text-brand-400">Bs {producto.precio_descuento}</span>
                <span className="text-xs text-gray-400 dark:text-gray-500 line-through">Bs {producto.precio}</span>
              </div>
            ) : (
              <span className="text-lg font-bold text-gray-900 dark:text-gray-100">Bs {producto.precio}</span>
            )}
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              agregarAlCarrito(producto);
            }}
            className="grid h-9 w-9 place-items-center rounded-full bg-brand-50 dark:bg-gray-800 text-brand-600 dark:text-brand-400 hover:bg-brand-600 hover:text-white transition-colors"
            title="Agregar al carrito"
          >
            <ShoppingCart size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
