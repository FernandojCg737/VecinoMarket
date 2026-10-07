import { createContext, useContext, useEffect, useState } from 'react';
import API from '../api/axios';
import { useAuth } from './AuthContext';

const NotificacionesContext = createContext(null);
const INTERVALO_MS = 30000;

// El polling vivía dentro de NotificationBell.jsx, pero Header.jsx monta DOS
// campanitas a la vez (una para escritorio, otra para móvil, ocultas solo
// con CSS) -- eso duplicaba cada petición. Centralizando el estado acá, sin
// importar cuántas <NotificationBell/> haya en pantalla, solo hay un
// setInterval. También se detiene solo si `usuario` deja de existir (por
// ejemplo, al expirar la sesión -- ver api/axios.js).
export function NotificacionesProvider({ children }) {
  const { usuario } = useAuth();
  const [notificaciones, setNotificaciones] = useState([]);

  function cargar() {
    API.get('notificaciones/mis-notificaciones/').then((res) => setNotificaciones(res.data)).catch(() => {});
  }

  useEffect(() => {
    // Sin usuario no hay a quién pedirle notificaciones -- y tampoco importa
    // limpiar `notificaciones` acá: sin usuario, Header.jsx ni siquiera
    // monta <NotificationBell/>, así que nadie llega a leer datos viejos.
    if (!usuario) return undefined;
    cargar();
    const id = setInterval(cargar, INTERVALO_MS);
    return () => clearInterval(id);
  }, [usuario]);

  async function marcarLeida(n) {
    if (n.leido) return;
    await API.post(`notificaciones/mis-notificaciones/${n.id}/marcar-leida/`);
    setNotificaciones((prev) => prev.map((it) => (it.id === n.id ? { ...it, leido: true } : it)));
  }

  async function marcarTodas() {
    await API.post('notificaciones/mis-notificaciones/marcar-todas-leidas/');
    setNotificaciones((prev) => prev.map((it) => ({ ...it, leido: true })));
  }

  async function eliminarNotificacion(id) {
    await API.delete(`notificaciones/mis-notificaciones/${id}/`);
    setNotificaciones((prev) => prev.filter((it) => it.id !== id));
  }

  return (
    <NotificacionesContext.Provider value={{ notificaciones, cargar, marcarLeida, marcarTodas, eliminarNotificacion }}>
      {children}
    </NotificacionesContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components -- hook colocado junto a su Provider
export function useNotificaciones() {
  const ctx = useContext(NotificacionesContext);
  if (!ctx) throw new Error('useNotificaciones debe usarse dentro de <NotificacionesProvider>');
  return ctx;
}
