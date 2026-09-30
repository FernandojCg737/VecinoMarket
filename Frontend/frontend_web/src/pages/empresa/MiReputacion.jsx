import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Star } from 'lucide-react';
import API from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { esEmpresaOEmpleado } from '../../utils/roles';

function Estrellas({ valor }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} size={14} className={n <= Math.round(valor) ? 'text-amber-400 fill-amber-400' : 'text-gray-300 dark:text-gray-600'} />
      ))}
    </div>
  );
}

export default function MiReputacion() {
  const { usuario, cargando: cargandoAuth } = useAuth();
  const [valoraciones, setValoraciones] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [sinPermiso, setSinPermiso] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!usuario || !esEmpresaOEmpleado(usuario)) return;
    setCargando(true);
    API.get('reportes/mis-valoraciones-recibidas/')
      .then((res) => setValoraciones(res.data))
      .catch((err) => {
        if (err?.response?.status === 403) setSinPermiso(true);
        else setError('No se pudo cargar tus valoraciones.');
      })
      .finally(() => setCargando(false));
  }, [usuario]);

  if (cargandoAuth) return null;
  if (!usuario) return <Navigate to="/login?next=/mi-empresa/reputacion" replace />;
  if (!esEmpresaOEmpleado(usuario)) return <Navigate to="/" replace />;

  if (!cargando && sinPermiso) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <Star className="mx-auto mb-3 text-gray-300 dark:text-gray-600" size={40} />
        <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">Sin acceso</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          No tienes el permiso "ver_reportes" para ver las valoraciones de tu empresa.
          Pídele al dueño de la cuenta que te lo asigne.
        </p>
      </div>
    );
  }

  const promedio = valoraciones.length
    ? (valoraciones.reduce((acc, v) => acc + v.calificacion, 0) / valoraciones.length).toFixed(2)
    : 0;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="flex items-center gap-2 mb-1">
        <Star className="text-brand-600 dark:text-brand-400" size={24} />
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Mi reputación</h1>
      </div>
      {!cargando && valoraciones.length > 0 && (
        <div className="flex items-center gap-2 mb-1">
          <Estrellas valor={promedio} />
          <span className="text-sm text-gray-500 dark:text-gray-400">{promedio} ({valoraciones.length} reseñas)</span>
        </div>
      )}
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        CU04 · Lo que opinan tus compradores — solo lectura, no se puede editar ni eliminar.
      </p>

      {error && <p className="text-sm text-red-600 dark:text-red-400 mb-4">{error}</p>}

      {cargando ? (
        <p className="text-sm text-gray-400">Cargando...</p>
      ) : valoraciones.length === 0 ? (
        <p className="text-sm text-gray-400 dark:text-gray-500 py-8 text-center">Todavía no tienes reseñas.</p>
      ) : (
        <div className="space-y-3">
          {valoraciones.map((v) => (
            <div key={v.id} className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-gray-900 dark:text-gray-100">{v.comprador_nombre}</span>
                <Estrellas valor={v.calificacion} />
              </div>
              <div className="text-xs text-gray-400 dark:text-gray-500">{v.numero_pedido} · {new Date(v.creado_en).toLocaleDateString()}</div>
              {v.comentario && <p className="text-sm text-gray-700 dark:text-gray-300 mt-1.5">{v.comentario}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
