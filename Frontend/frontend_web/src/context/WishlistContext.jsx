import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, LogIn, UserPlus } from 'lucide-react';
import API from '../api/axios';
import { useAuth } from './AuthContext';
import { useCart } from './CartContext';
import { esComprador } from '../utils/roles';

const WishlistContext = createContext(null);

export function WishlistProvider({ children }) {
  const { usuario } = useAuth();
  const { agregarAlCarrito } = useCart();
  const navigate = useNavigate();

  const [wishlistIds, setWishlistIds] = useState(new Set());
  const [items, setItems] = useState([]);
  const [cargando, setCargando] = useState(false);

  // Modal para requerir cuenta de comprador
  const [modalLoginAbierto, setModalLoginAbierto] = useState(false);
  const [mensajeLogin, setMensajeLogin] = useState('');

  const pedirLogin = useCallback((mensaje) => {
    setMensajeLogin(
      mensaje ||
      'Para guardar productos en tu lista de deseos y recibir alertas de baja de precio en VecinoMarket, necesitas iniciar sesión con tu cuenta de comprador.'
    );
    setModalLoginAbierto(true);
  }, []);

  // Cargar lista de deseos si el usuario es comprador
  const cargarWishlist = useCallback(async () => {
    if (!usuario || !esComprador(usuario)) {
      setWishlistIds(new Set());
      setItems([]);
      return;
    }

    try {
      setCargando(true);
      const res = await API.get('pedidos/wishlist/');
      const data = res.data?.items || [];
      setItems(data);
      setWishlistIds(new Set(data.map((it) => it.producto_id)));
    } catch (err) {
      console.error('Error al cargar lista de deseos:', err);
    } finally {
      setCargando(false);
    }
  }, [usuario]);

  useEffect(() => {
    cargarWishlist();
  }, [cargarWishlist]);

  // Alternar favorito (guardar / quitar)
  const toggleWishlist = async (producto, opciones = {}) => {
    if (!usuario) {
      pedirLogin('Para guardar productos en tu lista de deseos y recibir alertas de precio, necesitas iniciar sesión con tu cuenta de comprador.');
      return false;
    }
    if (!esComprador(usuario)) {
      pedirLogin('Tu sesión actual no es de tipo comprador. Para guardar productos en tu lista de deseos y recibir alertas, ingresa con una cuenta de comprador.');
      return false;
    }

    const prodId = Number(producto.id);
    const yaEstaba = wishlistIds.has(prodId);

    // Optimistic update
    setWishlistIds((prev) => {
      const next = new Set(prev);
      if (yaEstaba) next.delete(prodId);
      else next.add(prodId);
      return next;
    });

    try {
      const payload = {
        producto_id: prodId,
        notificar_baja_precio: opciones.notificar_baja_precio ?? true,
        precio_objetivo: opciones.precio_objetivo || null,
      };
      const res = await API.post('pedidos/wishlist/toggle/', payload);

      if (res.data.agregado && res.data.item) {
        setItems((prev) => [res.data.item, ...prev.filter((it) => it.producto_id !== prodId)]);
      } else {
        setItems((prev) => prev.filter((it) => it.producto_id !== prodId));
      }
      return res.data;
    } catch (err) {
      console.error('Error en toggleWishlist:', err);
      // Revert optimistic update
      setWishlistIds((prev) => {
        const next = new Set(prev);
        if (yaEstaba) next.add(prodId);
        else next.delete(prodId);
        return next;
      });
      throw err;
    }
  };

  const esDeseado = (productoId) => {
    return wishlistIds.has(Number(productoId));
  };

  const actualizarAlerta = async (itemId, config) => {
    if (!usuario || !esComprador(usuario)) return;
    try {
      const res = await API.patch(`pedidos/wishlist/${itemId}/alerta/`, config);
      if (res.data.item) {
        setItems((prev) => prev.map((it) => (it.id === itemId ? res.data.item : it)));
      }
      return res.data;
    } catch (err) {
      console.error('Error al actualizar alerta de precio:', err);
      throw err;
    }
  };

  const moverAlCarrito = async (item, mantenerEnDeseos = false) => {
    if (!usuario || !esComprador(usuario)) return;
    try {
      await API.post(`pedidos/wishlist/${item.id}/mover-al-carrito/`, {
        mantener_en_deseos: mantenerEnDeseos,
      });

      // Añadir al estado local del carrito
      agregarAlCarrito({
        id: item.producto_id,
        nombre: item.nombre,
        precio: item.precio_actual,
        imagen: item.imagen,
        empresa: item.empresa_nombre,
        empresaId: item.empresa_id,
      }, 1);

      if (!mantenerEnDeseos) {
        setItems((prev) => prev.filter((it) => it.id !== item.id));
        setWishlistIds((prev) => {
          const next = new Set(prev);
          next.delete(item.producto_id);
          return next;
        });
      }
      return true;
    } catch (err) {
      console.error('Error al mover producto al carrito:', err);
      throw err;
    }
  };

  return (
    <WishlistContext.Provider
      value={{
        items,
        wishlistIds,
        cargando,
        esDeseado,
        toggleWishlist,
        actualizarAlerta,
        moverAlCarrito,
        cargarWishlist,
        totalDeseados: items.length,
      }}
    >
      {children}

      {/* Modal estricto de restricción de rol para Lista de Deseos (Mismo diseño del Carrito) */}
      {modalLoginAbierto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
          onClick={() => setModalLoginAbierto(false)}
        >
          <div
            className="relative w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-gray-100 dark:border-slate-800 text-center space-y-4 animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
              <Heart size={28} className="fill-rose-500/20" />
            </div>

            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                Inicia sesión para guardar favoritos
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
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error('useWishlist debe usarse dentro de <WishlistProvider>');
  return ctx;
}

