import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';
import API from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { esEmpresaOEmpleado } from '../../utils/roles';
import ChatThread from '../../components/chat/ChatThread';

export default function MiChat() {
  const { usuario, cargando: cargandoAuth } = useAuth();
  const [conversaciones, setConversaciones] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [sinPermiso, setSinPermiso] = useState(false);
  const [error, setError] = useState('');
  const [seleccionada, setSeleccionada] = useState(null);

  useEffect(() => {
    if (!usuario || !esEmpresaOEmpleado(usuario)) return;
    setCargando(true);
    API.get('comunicacion/conversaciones-empresa/')
      .then((res) => {
        setConversaciones(res.data);
        if (res.data.length > 0) setSeleccionada(res.data[0].id);
      })
      .catch((err) => {
        if (err?.response?.status === 403) setSinPermiso(true);
        else setError('No se pudo cargar las conversaciones.');
      })
      .finally(() => setCargando(false));
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

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="flex items-center gap-2 mb-1">
        <MessageCircle className="text-brand-600 dark:text-brand-400" size={24} />
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Chat con compradores</h1>
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">CU14 · Conversaciones de tu empresa con sus compradores.</p>

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
                onClick={() => setSeleccionada(c.id)}
                className={`w-full text-left rounded-lg border p-3 text-sm ${seleccionada === c.id ? 'border-brand-500 bg-brand-50 dark:bg-gray-800' : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900'}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-gray-900 dark:text-gray-100 truncate">{c.comprador_nombre}</span>
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
          <div className="sm:col-span-2">
            {seleccionada && (
              <ChatThread conversacionId={seleccionada} mensajesUrlBase="comunicacion/conversaciones/" usuarioId={usuario.id} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
