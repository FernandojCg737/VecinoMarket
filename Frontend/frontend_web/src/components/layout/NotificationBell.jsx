import { Link } from 'react-router-dom';
import { Bell, Check } from 'lucide-react';
import Dropdown from '../ui/Dropdown';
import { useNotificaciones } from '../../context/NotificacionesContext';

export default function NotificationBell() {
  const { notificaciones, marcarLeida, marcarTodas } = useNotificaciones();
  const noLeidas = notificaciones.filter((n) => !n.leido).length;

  return (
    <Dropdown
      align="right"
      triggerClassName="relative rounded-full p-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
      panelPositionClassName="fixed inset-x-3 top-16 sm:absolute sm:inset-x-auto sm:top-auto sm:right-0 sm:mt-2"
      panelClassName="sm:w-80 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 py-2 shadow-lg text-sm text-gray-700 dark:text-gray-200 max-h-[70vh] overflow-y-auto"
      trigger={
        <>
          <Bell size={20} />
          {noLeidas > 0 && (
            <span className="absolute -top-0.5 -right-0.5 grid h-4 w-4 place-items-center rounded-full bg-red-600 text-[9px] font-bold text-white">
              {noLeidas > 9 ? '9+' : noLeidas}
            </span>
          )}
        </>
      }
    >
      <div className="flex items-center justify-between px-4 py-1.5">
        <span className="text-xs font-semibold uppercase text-gray-400 dark:text-gray-500">Notificaciones</span>
        {noLeidas > 0 && (
          <button onClick={marcarTodas} className="flex items-center gap-1 text-xs text-brand-600 dark:text-brand-400 hover:text-brand-700">
            <Check size={12} /> Marcar todas
          </button>
        )}
      </div>
      {notificaciones.length === 0 ? (
        <p className="px-4 py-4 text-xs text-gray-400">Sin notificaciones.</p>
      ) : (
        notificaciones.map((n) => {
          const contenido = (
            <div className={`px-4 py-2 border-l-2 ${n.leido ? 'border-transparent' : 'border-brand-500 bg-brand-50/50 dark:bg-brand-900/10'}`}>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{n.titulo}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{n.mensaje}</p>
              <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">{new Date(n.creado_en).toLocaleString()}</p>
            </div>
          );
          return n.enlace ? (
            <Link key={n.id} to={n.enlace} onClick={() => marcarLeida(n)} className="block hover:bg-gray-50 dark:hover:bg-gray-700">
              {contenido}
            </Link>
          ) : (
            <button key={n.id} onClick={() => marcarLeida(n)} className="block w-full text-left hover:bg-gray-50 dark:hover:bg-gray-700">
              {contenido}
            </button>
          );
        })
      )}
    </Dropdown>
  );
}
