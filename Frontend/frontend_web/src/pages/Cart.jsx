import { Link, useNavigate } from 'react-router-dom';
import { Minus, Plus, Trash2, ShoppingBag } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';

export default function Cart() {
  const { items, actualizarCantidad, quitarDelCarrito, subtotal } = useCart();
  const { usuario } = useAuth();
  const navigate = useNavigate();

  function irACheckout() {
    navigate(usuario ? '/checkout' : '/login?next=/checkout');
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <ShoppingBag size={48} className="mx-auto text-gray-300 dark:text-gray-700 mb-4" />
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">Tu carrito está vacío</h1>
        <p className="text-gray-500 dark:text-gray-400 mb-6">Explora el catálogo y encuentra productos de tu barrio.</p>
        <Link to="/productos" className="rounded-full bg-brand-600 px-6 py-3 font-semibold text-white hover:bg-brand-700">
          Ir a comprar
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">Mi carrito</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          {items.map((item) => (
            <div key={item.id} className="flex gap-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
              <img src={item.imagen} alt={item.nombre} className="h-20 w-20 rounded-lg object-cover" />
              <div className="flex-1">
                <span className="text-xs font-semibold text-green-600 dark:text-green-400">{item.empresa}</span>
                <Link to={`/productos/${item.id}`} className="block font-medium text-gray-800 dark:text-gray-200 hover:text-brand-600 dark:hover:text-brand-400">
                  {item.nombre}
                </Link>
                <span className="text-sm font-bold text-gray-900 dark:text-gray-100">Bs {item.precio}</span>
              </div>
              <div className="flex flex-col items-end justify-between">
                <button onClick={() => quitarDelCarrito(item.id)} className="text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400">
                  <Trash2 size={18} />
                </button>
                <div className="flex items-center border border-gray-300 dark:border-gray-700 rounded-full">
                  <button
                    onClick={() => actualizarCantidad(item.id, item.cantidad - 1)}
                    className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-l-full"
                  >
                    <Minus size={14} />
                  </button>
                  <span className="w-8 text-center text-sm text-gray-900 dark:text-gray-100">{item.cantidad}</span>
                  <button
                    onClick={() => actualizarCantidad(item.id, item.cantidad + 1)}
                    className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-r-full"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 h-fit">
          <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">Resumen</h2>
          <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
            <span>Subtotal</span>
            <span>Bs {subtotal.toFixed(2)}</span>
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">El costo de envío se calcula en el siguiente paso.</p>
          <button
            onClick={irACheckout}
            className="w-full rounded-full bg-brand-600 py-3 font-semibold text-white hover:bg-brand-700 transition-colors"
          >
            Continuar compra
          </button>
        </div>
      </div>
    </div>
  );
}
