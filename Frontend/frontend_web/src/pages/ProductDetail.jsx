import { useEffect, useState } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { ShoppingCart, Minus, Plus, Store, Truck, ShieldCheck, Bot } from 'lucide-react';
import { obtenerProducto } from '../api/catalogo';
import { useCatalogo } from '../context/CatalogoContext';
import StarRating from '../components/product/StarRating';
import { useCart } from '../context/CartContext';
import ChatbotWidget from '../components/chat/ChatbotWidget';

export default function ProductDetail() {
  const { id } = useParams();
  const { categorias } = useCatalogo();
  const [producto, setProducto] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [noEncontrado, setNoEncontrado] = useState(false);
  const [cantidad, setCantidad] = useState(1);
  const [imagenActiva, setImagenActiva] = useState(0);
  const [mostrarChatbot, setMostrarChatbot] = useState(false);
  const { agregarAlCarrito } = useCart();

  // Igual que en ProductListing: si cambia el id (navegar de un producto a
  // otro), se resetea el estado durante el render, no en el efecto.
  const [idAnterior, setIdAnterior] = useState(id);
  if (idAnterior !== id) {
    setIdAnterior(id);
    setCargando(true);
    setNoEncontrado(false);
    setImagenActiva(0);
  }

  useEffect(() => {
    obtenerProducto(id)
      .then(setProducto)
      .catch(() => setNoEncontrado(true))
      .finally(() => setCargando(false));
  }, [id]);

  if (noEncontrado) return <Navigate to="/productos" replace />;
  if (cargando || !producto) {
    return <div className="mx-auto max-w-7xl px-4 py-16 text-center text-gray-500 dark:text-gray-400">Cargando...</div>;
  }

  const categoria = categorias.find((c) => c.id === producto.categoriaId);
  const tieneDescuento = Boolean(producto.precio_descuento);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <nav className="text-xs text-gray-500 dark:text-gray-400 mb-4">
        <Link to="/" className="hover:underline">Inicio</Link> {' / '}
        <Link to={`/productos?categoria=${producto.categoriaId}`} className="hover:underline">
          {categoria?.nombre}
        </Link> {' / '}
        <span className="text-gray-700 dark:text-gray-300">{producto.nombre}</span>
      </nav>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        <div>
          <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
            <img
              src={producto.imagenes[imagenActiva] || producto.imagen}
              alt={producto.nombre}
              className="w-full aspect-square object-cover"
            />
          </div>
          {producto.imagenes.length > 1 && (
            <div className="mt-3 flex gap-2 overflow-x-auto">
              {producto.imagenes.map((url, i) => (
                <button
                  key={url + i}
                  onClick={() => setImagenActiva(i)}
                  className={`shrink-0 rounded-lg overflow-hidden border-2 ${
                    i === imagenActiva ? 'border-brand-600' : 'border-transparent'
                  }`}
                >
                  <img src={url} alt={`${producto.nombre} ${i + 1}`} className="h-16 w-16 object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <Link to={`/productos?q=${encodeURIComponent(producto.empresa)}`} className="flex items-center gap-1.5 text-sm font-semibold text-green-600 dark:text-green-400 hover:underline mb-2">
            <Store size={16} /> {producto.empresa}
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">{producto.nombre}</h1>
          <StarRating rating={producto.rating} resenas={producto.resenas} size={16} />

          <div className="mt-4 mb-2">
            {tieneDescuento ? (
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-brand-600 dark:text-brand-400">Bs {producto.precio_descuento}</span>
                <span className="text-base text-gray-400 dark:text-gray-500 line-through">Bs {producto.precio}</span>
              </div>
            ) : (
              <span className="text-3xl font-bold text-gray-900 dark:text-gray-100">Bs {producto.precio}</span>
            )}
          </div>

          <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed mb-6">{producto.descripcion}</p>

          <div className="flex items-center gap-4 mb-6">
            <div className="flex items-center border border-gray-300 dark:border-gray-700 rounded-full">
              <button
                onClick={() => setCantidad((c) => Math.max(1, c - 1))}
                className="p-2.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-l-full"
              >
                <Minus size={16} />
              </button>
              <span className="w-10 text-center font-medium text-gray-900 dark:text-gray-100">{cantidad}</span>
              <button
                onClick={() => setCantidad((c) => Math.min(producto.stock, c + 1))}
                className="p-2.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-r-full"
              >
                <Plus size={16} />
              </button>
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400">{producto.stock} disponibles</span>
          </div>

          <button
            onClick={() => agregarAlCarrito(producto, cantidad)}
            className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-full bg-brand-600 px-8 py-3 font-semibold text-white hover:bg-brand-700 transition-colors"
          >
            <ShoppingCart size={18} /> Agregar al carrito
          </button>

          <div className="mt-8 space-y-3 border-t border-gray-200 dark:border-gray-800 pt-6 text-sm text-gray-600 dark:text-gray-400">
            <div className="flex items-center gap-2">
              <Truck size={18} className="text-brand-600" /> Envío a domicilio o recojo en tienda
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck size={18} className="text-brand-600" /> Compra protegida por VecinoMarket
            </div>
          </div>

          {producto.empresaId && (
            <div className="mt-6">
              {mostrarChatbot ? (
                <ChatbotWidget empresaId={producto.empresaId} empresaNombre={producto.empresa} />
              ) : (
                <button
                  onClick={() => setMostrarChatbot(true)}
                  className="flex items-center gap-2 rounded-full border border-gray-300 dark:border-gray-700 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  <Bot size={16} className="text-brand-600 dark:text-brand-400" /> Preguntarle al chatbot de {producto.empresa}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
