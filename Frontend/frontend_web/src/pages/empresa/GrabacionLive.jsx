import { useEffect, useState } from 'react';
import { Navigate, useParams, Link } from 'react-router-dom';
import { Film, ArrowLeft } from 'lucide-react';
import API from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { esEmpresaOEmpleado } from '../../utils/roles';
import ChatLive from '../../components/live/ChatLive';

export default function GrabacionLive() {
  const { id } = useParams();
  const { usuario, cargando: cargandoAuth } = useAuth();
  const [datos, setDatos] = useState(null);
  const [sinPermiso, setSinPermiso] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!usuario || !esEmpresaOEmpleado(usuario)) return;
    API.get(`promociones/mis-lives/${id}/grabacion/`)
      .then((res) => setDatos(res.data))
      .catch((err) => {
        if (err?.response?.status === 403) setSinPermiso(true);
        else setError('No se pudo cargar esta grabación.');
      });
  }, [id, usuario]);

  if (cargandoAuth) return null;
  if (!usuario) return <Navigate to={`/login?next=/mi-empresa/lives/${id}/grabacion`} replace />;
  if (!esEmpresaOEmpleado(usuario)) return <Navigate to="/" replace />;

  if (sinPermiso) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <Film className="mx-auto mb-3 text-gray-300 dark:text-gray-600" size={40} />
        <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">Sin acceso</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          No tienes el permiso "gestionar_promociones" para ver esta grabación.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link to="/mi-empresa/lives" className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-brand-600 dark:hover:text-brand-400 mb-4">
        <ArrowLeft size={16} /> Volver a mis lives
      </Link>

      <div className="flex items-center gap-2 mb-1">
        <Film className="text-brand-600 dark:text-brand-400" size={24} />
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{datos?.titulo || 'Grabación'}</h1>
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        CU17 · Grabación privada — solo tu empresa puede verla, con el chat completo de cuando estuvo en vivo.
      </p>

      {error && <p className="text-sm text-red-600 dark:text-red-400 mb-4">{error}</p>}

      {!datos ? (
        <p className="text-sm text-gray-400">Cargando...</p>
      ) : !datos.grabacion_url ? (
        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-8 text-center">
          <Film className="mx-auto mb-3 text-gray-300 dark:text-gray-600" size={32} />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Esta transmisión no quedó grabada — probablemente se cerró sin usar el botón "Terminar transmisión".
          </p>
        </div>
      ) : (
        <div className="rounded-xl overflow-hidden bg-black aspect-video mb-6">
          <video src={datos.grabacion_url} controls className="h-full w-full" />
        </div>
      )}

      {datos && (
        <ChatLive mensajes={datos.comentarios} onEnviar={() => {}} puedeComentar={false} />
      )}
    </div>
  );
}
