import { createContext, useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, LogIn, UserPlus, X } from 'lucide-react';
import API from '../api/axios';
import { useAuth } from './AuthContext';
import { esComprador } from '../utils/roles';

const CartContext = createContext(null);

function getStorageKey(usuario) {
  if (usuario && usuario.id) {
    return `vecinomarket_carrito_usuario_${usuario.id}`;
  }
  return null;
}

export function CartProvider({ children }) {
  const { usuario } = useAuth();
  const navigate = useNavigate();

  // Opción B: El estado activo se carga según el comprador actualmente autenticado
  const [items, setItems] = useState([]);

  // Modal para pedir inicio de sesión al intentar usar el carrito sin sesión
  const [modalLoginAbierto, setModalLoginAbierto] = useState(false);
  const [mensajeLogin, setMensajeLogin] = useState('');

  // Sincronización del carrito según el usuario activo:
  // - Si inicia sesión un comprador: se restaura su carrito guardado (storage y backend).
  // - Si cierra sesión o cambia de cuenta: la memoria activa del carrito se vacía a [].
  useEffect(() => {
    if (usuario && esComprador(usuario)) {
      const userKey = getStorageKey(usuario);
      let localItems = [];
      if (userKey) {
        try {
          const raw = localStorage.getItem(userKey);
          localItems = raw ? JSON.parse(raw) : [];
        } catch {
          localItems = [];
        }
      }
      setItems(localItems);

      // Si no había nada en local, intentar cargar del backend en caso de sesión previa
      if (localItems.length === 0) {
        API.get('pedidos/mi-carrito/')
          .then((res) => {
            if (Array.isArray(res.data?.items) && res.data.items.length > 0) {
              setItems(res.data.items);
            }
          })
          .catch(() => {});
      }
    } else {
      setItems([]);
    }
  }, [usuario]);

  // Persistir cambios en el storage específico del comprador Y en la base de datos en tiempo real (CU11)
  useEffect(() => {
    if (usuario && esComprador(usuario)) {
      const userKey = getStorageKey(usuario);
      if (userKey) {
        localStorage.setItem(userKey, JSON.stringify(items));
      }
      // Sincronización en vivo con el backend para que el SuperAdmin lo visualice en /admin/carritos
      API.post('pedidos/mi-carrito/', { items }).catch(() => {});
    }
  }, [items, usuario]);

  function pedirLogin(mensaje) {
    setMensajeLogin(
      mensaje ||
      'Para agregar productos a tu carrito de compras y realizar pedidos en VecinoMarket, necesitas iniciar sesión con tu cuenta de comprador.'
    );
    setModalLoginAbierto(true);
  }

  function agregarAlCarrito(producto, cantidad = 1) {
    // Para usar el carrito o agregar productos, el comprador debe estar con la sesión iniciada
    if (!usuario) {
      pedirLogin('Para agregar productos a tu carrito de compras y realizar pedidos en VecinoMarket, necesitas iniciar sesión con tu cuenta de comprador.');
      return false;
    }
    if (!esComprador(usuario)) {
      pedirLogin('Tu sesión actual no es de tipo comprador. Para agregar productos al carrito y comprar, ingresa con una cuenta de comprador.');
      return false;
    }

    setItems((prev) => {
      const existente = prev.find((it) => it.id === producto.id);
      if (existente) {
        return prev.map((it) =>
          it.id === producto.id ? { ...it, cantidad: it.cantidad + cantidad } : it
        );
      }
      return [
        ...prev,
        {
          id: producto.id,
          nombre: producto.nombre,
          precio: producto.precio_descuento ?? producto.precio,
          imagen: producto.imagen,
          empresa: producto.empresa,
          empresaId: producto.empresaId,
          cantidad,
        },
      ];
    });
    return true;
  }

  function actualizarCantidad(id, cantidad) {
    if (!usuario || !esComprador(usuario)) return;
    if (cantidad < 1) return;
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, cantidad } : it)));
  }

  function quitarDelCarrito(id) {
    if (!usuario || !esComprador(usuario)) return;
    setItems((prev) => prev.filter((it) => it.id !== id));
  }

  function vaciarCarrito() {
    setItems([]);
    if (usuario && esComprador(usuario)) {
      const userKey = getStorageKey(usuario);
      if (userKey) {
        localStorage.removeItem(userKey);
      }
      API.post('pedidos/mi-carrito/', { items: [] }).catch(() => {});
    }
  }

  // Si no está autenticado como comprador, totalItems y subtotal SIEMPRE son 0
  const totalItems = (usuario && esComprador(usuario))
    ? items.reduce((acc, it) => acc + it.cantidad, 0)
    : 0;

  const subtotal = (usuario && esComprador(usuario))
    ? items.reduce((acc, it) => acc + it.precio * it.cantidad, 0)
    : 0;

  const itemsVisibles = (usuario && esComprador(usuario)) ? items : [];

  return (
    <CartContext.Provider
      value={{
        items: itemsVisibles,
        agregarAlCarrito,
        actualizarCantidad,
        quitarDelCarrito,
        vaciarCarrito,
        totalItems,
        subtotal,
        pedirLogin,
      }}
    >
      {children}

      {/* MODAL PARA PEDIR INICIAR SESIÓN */}
      {modalLoginAbierto && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/60 px-4 py-6 backdrop-blur-xs"
          onClick={() => setModalLoginAbierto(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-6 shadow-2xl text-center space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 border border-brand-200 dark:border-brand-800">
              <ShoppingCart size={28} />
            </div>

            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                Inicia sesión para usar el carrito
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 leading-relaxed">
                {mensajeLogin}
              </p>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setModalLoginAbierto(false);
                  navigate(`/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`);
                }}
                className="flex items-center justify-center gap-2 w-full rounded-xl bg-brand-600 hover:bg-brand-700 py-2.5 text-sm font-semibold text-white shadow-sm transition"
              >
                <LogIn size={16} /> Iniciar sesión
              </button>
              <button
                type="button"
                onClick={() => {
                  setModalLoginAbierto(false);
                  navigate('/registro');
                }}
                className="flex items-center justify-center gap-2 w-full rounded-xl border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-200 transition"
              >
                <UserPlus size={16} /> Crear cuenta de comprador
              </button>
              <button
                type="button"
                onClick={() => setModalLoginAbierto(false)}
                className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 py-1 transition"
              >
                Continuar viendo productos
              </button>
            </div>
          </div>
        </div>
      )}
    </CartContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components -- hook colocado junto a su Provider
export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart debe usarse dentro de <CartProvider>');
  return ctx;
}
