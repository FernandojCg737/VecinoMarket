import { useEffect, useState } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { MessageCircle, RefreshCw } from 'lucide-react';
import API from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { esComprador } from '../utils/roles';
import ChatThread from '../components/chat/ChatThread';

const INTERVALO_MS = 2500;

export default function Chat() {
  const { usuario, cargando: cargandoAuth } = useAuth();
  const [searchParams] = useSearchParams();
  const conversacionParam = searchParams.get('conversacion');

  const [conversaciones, setConversaciones] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [actualizando, setActualizando] = useState(false);
  const [error, setError] = useState('');
  const [seleccionada, setSeleccionada] = useState(null);

  function cargarConversaciones(silencioso = false) {
    if (!silencioso) {
      setActualizando(true);
      if (conversaciones.length === 0) setCargando(true);
    }
    return API.get('comunicacion/mis-conversaciones/')
      .then((res) => {
        setConversaciones(res.data);
        setError('');
        const targetId = conversacionParam ? Number(conversacionParam) : null;
        setSeleccionada((prev) => {
          if (res.data.length === 0) return targetId || null;
          // Si hay un targetId en la URL, siempre tiene prioridad
          if (targetId) {
            // Si ya llegó en la lista, úsalo; si no, espera (mantén targetId)
            return res.data.some((c) => c.id === targetId) ? targetId : (prev || targetId);
          }
          // Sin targetId: si ya hay una seleccionada y sigue existiendo, mantenla
          if (prev) return res.data.some((c) => c.id === prev) ? prev : res.data[0].id;
          // Primera carga sin targetId: seleccionar la primera
          return res.data[0].id;
        });
      })
      .catch(() => {
        if (!silencioso) setError('No se pudo cargar tus conversaciones.');
      })
      .finally(() => {
        if (!silencioso) {
          setCargando(false);
          setActualizando(false);
        }
      });
  }

  useEffect(() => {
    if (!usuario || !esComprador(usuario)) return;
    cargarConversaciones(false);
    const id = setInterval(() => {
      cargarConversaciones(true);
    }, INTERVALO_MS);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuario, conversacionParam]);

  useEffect(() => {
    if (conversacionParam) {
      setSeleccionada(Number(conversacionParam));
    }
  }, [conversacionParam]);

  if (cargandoAuth) return null;
  if (!usuario) return <Navigate to="/login?next=/chat" replace />;
  if (!esComprador(usuario)) return <Navigate to="/" replace />;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="flex items-center gap-2 mb-1">
        <MessageCircle className="text-brand-600 dark:text-brand-400" size={24} />
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Mis chats</h1>
      </div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-6">
        <p className="text-sm text-gray-500 dark:text-gray-400">CU14 · Conversaciones con las empresas donde compraste.</p>
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
      ) : conversaciones.length === 0 && !seleccionada ? (
        <p className="text-sm text-gray-400 dark:text-gray-500 py-8 text-center">
          Todavía no tienes conversaciones. Escríbele a una empresa desde la página de su tienda.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-2">
            {conversaciones.length === 0 ? (
              <p className="text-xs text-gray-400 dark:text-gray-500 px-1">Abriendo conversación...</p>
            ) : (
              conversaciones.map((c) => (
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
                    <span className="font-medium text-gray-900 dark:text-gray-100 truncate">{c.empresa_nombre}</span>
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
              ))
            )}
          </div>
          <div className="sm:col-span-2">
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
