import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { MessageCircle, Search, ArrowLeft, Store } from 'lucide-react';
import API from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { esStaff } from '../../utils/roles';
import ChatThread from '../../components/chat/ChatThread';

export default function ChatAdmin() {
  const { usuario, cargando: cargandoAuth } = useAuth();

  const [empresas, setEmpresas] = useState([]);
  const [q, setQ] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [cargandoEmpresas, setCargandoEmpresas] = useState(true);
  const [error, setError] = useState('');

  const [empresaSel, setEmpresaSel] = useState(null);
  const [conversaciones, setConversaciones] = useState([]);
  const [seleccionada, setSeleccionada] = useState(null);

  function cargarEmpresas() {
    setCargandoEmpresas(true);
    return API.get('comunicacion/admin/resumen-empresas/', { params: { q: busqueda || undefined } })
      .then((res) => {
        setEmpresas(res.data);
        setError('');
      })
      .catch(() => setError('No se pudo cargar las empresas.'))
      .finally(() => setCargandoEmpresas(false));
  }

  useEffect(() => {
    if (!usuario || !esStaff(usuario)) return;
    cargarEmpresas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuario, busqueda]);

  useEffect(() => {
    if (!empresaSel) return;
    API.get('comunicacion/admin/conversaciones/', { params: { empresa: empresaSel.id } })
      .then((res) => {
        setConversaciones(res.data);
        setSeleccionada(res.data[0]?.id ?? null);
      })
      .catch(() => setError('No se pudo cargar las conversaciones.'));
  }, [empresaSel]);

  if (cargandoAuth) return null;
  if (!usuario) return <Navigate to="/login?next=/admin/chat" replace />;
  if (!esStaff(usuario)) return <Navigate to="/" replace />;

  if (empresaSel) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <button
          onClick={() => { setEmpresaSel(null); cargarEmpresas(); }}
          className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-brand-600 dark:hover:text-brand-400 mb-4"
        >
          <ArrowLeft size={16} /> Volver a empresas
        </button>

        <div className="flex items-center gap-2 mb-1">
          <MessageCircle className="text-brand-600 dark:text-brand-400" size={24} />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{empresaSel.razon_social}</h1>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">CU14 · Solo lectura — no puedes editar ni eliminar mensajes.</p>

        {error && <p className="text-sm text-red-600 dark:text-red-400 mb-4">{error}</p>}

        {conversaciones.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-gray-500 py-8 text-center">Esta empresa no tiene conversaciones.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              {conversaciones.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSeleccionada(c.id)}
                  className={`w-full text-left rounded-lg border p-3 text-sm ${seleccionada === c.id ? 'border-brand-500 bg-brand-50 dark:bg-gray-800' : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900'}`}
                >
                  <span className="font-medium text-gray-900 dark:text-gray-100 truncate block">{c.comprador_nombre}</span>
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
                <ChatThread
                  conversacionId={seleccionada}
                  mensajesUrlBase="comunicacion/admin/conversaciones/"
                  usuarioId={usuario.id}
                  soloLectura
                />
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex items-center gap-2 mb-1">
        <MessageCircle className="text-brand-600 dark:text-brand-400" size={24} />
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Chat interno</h1>
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        CU14 · Busca una empresa para ver sus conversaciones con compradores (solo lectura).
      </p>

      <form onSubmit={(e) => { e.preventDefault(); setBusqueda(q); }} className="flex items-center gap-2 mb-6">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar empresa por razón social..."
          className="rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-1.5 text-sm w-72 focus:outline-none focus:ring-2 focus:ring-brand-300"
        />
        <button type="submit" className="grid h-8 w-8 place-items-center rounded-md bg-brand-600 text-white hover:bg-brand-700">
          <Search size={16} />
        </button>
      </form>

      {error && <p className="text-sm text-red-600 dark:text-red-400 mb-4">{error}</p>}

      {cargandoEmpresas ? (
        <p className="text-sm text-gray-400">Cargando...</p>
      ) : empresas.length === 0 ? (
        <p className="text-sm text-gray-400">No se encontraron empresas.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {empresas.map((e) => (
            <button
              key={e.id}
              onClick={() => setEmpresaSel(e)}
              className="text-left rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 hover:border-brand-400 dark:hover:border-brand-500 hover:shadow-sm transition"
            >
              <div className="flex items-center gap-3">
                {e.logo_url ? (
                  <img src={e.logo_url} alt="" className="h-10 w-10 rounded-full object-cover border border-gray-200 dark:border-gray-700" />
                ) : (
                  <div className="grid h-10 w-10 place-items-center rounded-full bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400">
                    <Store size={18} />
                  </div>
                )}
                <div>
                  <div className="font-semibold text-gray-900 dark:text-gray-100 leading-tight">{e.razon_social}</div>
                  {e.ciudad && <div className="text-xs text-gray-400 dark:text-gray-500">{e.ciudad}</div>}
                </div>
              </div>
              <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">{e.total_conversaciones} conversaciones</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
