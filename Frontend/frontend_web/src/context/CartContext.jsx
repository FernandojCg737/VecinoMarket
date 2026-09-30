import { createContext, useContext, useEffect, useState } from 'react';

const CartContext = createContext(null);
const STORAGE_KEY = 'vecinomarket_carrito';

function cargarCarrito() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }) {
  const [items, setItems] = useState(cargarCarrito);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  function agregarAlCarrito(producto, cantidad = 1) {
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
  }

  function actualizarCantidad(id, cantidad) {
    if (cantidad < 1) return;
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, cantidad } : it)));
  }

  function quitarDelCarrito(id) {
    setItems((prev) => prev.filter((it) => it.id !== id));
  }

  function vaciarCarrito() {
    setItems([]);
  }

  const totalItems = items.reduce((acc, it) => acc + it.cantidad, 0);
  const subtotal = items.reduce((acc, it) => acc + it.precio * it.cantidad, 0);

  return (
    <CartContext.Provider
      value={{ items, agregarAlCarrito, actualizarCantidad, quitarDelCarrito, vaciarCarrito, totalItems, subtotal }}
    >
      {children}
    </CartContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components -- hook colocado junto a su Provider
export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart debe usarse dentro de <CartProvider>');
  return ctx;
}
