import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { MessageCircle, RefreshCw } from 'lucide-react';
import API from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { esEmpresaOEmpleado } from '../../utils/roles';
import ChatThread from '../../components/chat/ChatThread';

const INTERVALO_MS = 2500;

export default function MiChat() {
  const { usuario, cargando: cargandoAuth } = useAuth();
  const [conversaciones, setConversaciones] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [actualizando, setActualizando] = useState(false);
  const [sinPermiso, setSinPermiso] = useState(false);
  const [error, setError] = useState('');
  const [seleccionada, setSeleccionada] = useState(null);

  function cargarConversaciones(silencioso = false) {
    if (!silencioso) {
      setActualizando(true);
      if (conversaciones.length === 0) setCargando(true);
    }
    return API.get('comunicacion/conversaciones-empresa/')
      .then((res) => {
        setConversaciones(res.data);
        setError('');
        setSeleccionada((prev) => {
          if (res.data.length === 0) return null;
          if (!prev) return res.data[0].id;
          const sigueExiste = res.data.some((c) => c.id === prev);
          return sigueExiste ? prev : res.data[0].id;
        });
      })
      .catch((err) => {
        if (err?.response?.status === 403) setSinPermiso(true);
        else if (!silencioso) setError('No se pudo cargar las conversaciones.');
      })
      .finally(() => {
        if (!silencioso) {
          setCargando(false);
          setActualizando(false);
        }
      });
  }

  useEffect(() => {
    if (!usuario || !esEmpresaOEmpleado(usuario)) return;
    cargarConversaciones(false);
    const id = setInterval(() => {
      cargarConversaciones(true);
    }, INTERVALO_MS);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuario]);

  if (cargandoAuth) return null;
  if (!usuario) return <Navigate to="/login?next=/mi-empresa/chat" replace />;
  if (!esEmpresaOEmpleado(usuario)) return <Navigate to="/" replace />;

  if (!cargando && sinPermiso) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <MessageCircle className="mx-auto mb-3 text-gray-300 dark:text-gray-600" size={40} />
        <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">Sin acceso</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          No tienes el permiso "gestionar_chat" para ver los chats de tu empresa.
          Pídele al dueño de la cuenta que te lo asigne.
        </p>
      </div>
    );
  }

  const convActiva = conversaciones.find((c) => c.id === seleccionada);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="flex items-center gap-2 mb-1">
        <MessageCircle className="text-brand-600 dark:text-brand-400" size={24} />
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Chat con compradores</h1>
      </div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-6">
        <p className="text-sm text-gray-500 dark:text-gray-400">CU14 · Conversaciones de tu empresa con sus compradores.</p>
        <div className="flex items-center gap-3 text-xs text-gray-400 dark:text-gray-500">
          <span className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="text-emerald-700 dark:text-emerald-400 font-semibold">En tiempo real</span>
            <span>· se actualiza cada {INTERVALO_MS / 1000}s</span>
          </span>
          <button
            type="button"
            onClick={() => cargarConversaciones(false)}
            disabled={actualizando}
            className="flex items-center gap-1.5 text-brand-600 hover:text-brand-700 dark:text-brand-400 font-semibold px-2 py-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition disabled:opacity-50"
          >
            <RefreshCw size={12} className={actualizando ? 'animate-spin' : ''} />
            <span>{actualizando ? 'Actualizando...' : 'Actualizar ahora'}</span>
          </button>
        </div>
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400 mb-4">{error}</p>}

      {cargando ? (
        <p className="text-sm text-gray-400">Cargando...</p>
      ) : conversaciones.length === 0 ? (
        <p className="text-sm text-gray-400 dark:text-gray-500 py-8 text-center">Todavía no tienes conversaciones.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-2">
            {conversaciones.map((c) => (
              <button
                key={c.id}
                onClick={() => {
                  setSeleccionada(c.id);
                  setConversaciones((prev) =>
                    prev.map((item) => (item.id === c.id ? { ...item, no_leidos: 0 } : item))
                  );
                }}
                className={`w-full text-left rounded-lg border p-3 text-sm ${seleccionada === c.id ? 'border-brand-500 bg-brand-50 dark:bg-gray-800' : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900'}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-gray-900 dark:text-gray-100 truncate">{c.comprador_nombre}</span>
                  {c.no_leidos > 0 && (
                    <span className="grid h-5 w-5 place-items-center rounded-full bg-brand-600 text-white text-[10px] font-semibold shrink-0">{c.no_leidos}</span>
                  )}
                </div>
                {c.ultimo_mensaje && (
                  <p className="text-xs text-gray-400 dark:text-gray-500 truncate mt-0.5">
                    {c.ultimo_mensaje.tipo === 'TEXTO' ? c.ultimo_mensaje.contenido : `[${c.ultimo_mensaje.tipo.toLowerCase()}]`}
                  </p>
                )}
              </button>
            ))}
          </div>
          <div className="sm:col-span-2 flex flex-col">
            {convActiva && (
              <div className="mb-2 p-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-2.5">
                  <div className="grid h-10 w-10 place-items-center rounded-full bg-brand-100 dark:bg-brand-900/40 text-brand-700 dark:text-brand-300 font-bold text-sm">
                    {convActiva.comprador_nombre?.charAt(0)?.toUpperCase() || 'C'}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 leading-tight">
                      {convActiva.comprador_nombre}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      <span>Comprador</span>
                      {convActiva.comprador_telefono && <span>· Tel: {convActiva.comprador_telefono}</span>}
                      {convActiva.comprador_email && <span>· {convActiva.comprador_email}</span>}
                    </div>
                  </div>
                </div>
              </div>
            )}
            {seleccionada && (
              <ChatThread
                conversacionId={seleccionada}
                mensajesUrlBase="comunicacion/conversaciones/"
                usuarioId={usuario.id}
                onMensajeEnviado={() => cargarConversaciones(true)}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
