import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Users, Copy, Check } from 'lucide-react';
import API from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { esEmpresaOEmpleado } from '../../utils/roles';

function badgeEstado(estado) {
  return estado === 'CONFIRMADO'
    ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400'
    : 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400';
}

export default function MisReferidos() {
  const { usuario, cargando: cargandoAuth } = useAuth();
  const [referidos, setReferidos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [sinPermiso, setSinPermiso] = useState(false);
  const [error, setError] = useState('');
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    if (!usuario || !esEmpresaOEmpleado(usuario)) return;
    setCargando(true);
    API.get('facturacion/mis-referidos/')
      .then((res) => setReferidos(res.data))
      .catch((err) => {
        if (err?.response?.status === 403) setSinPermiso(true);
        else setError('No se pudo cargar tus referidos.');
      })
      .finally(() => setCargando(false));
  }, [usuario]);

  if (cargandoAuth) return null;
  if (!usuario) return <Navigate to="/login?next=/mi-empresa/referidos" replace />;
  if (!esEmpresaOEmpleado(usuario)) return <Navigate to="/" replace />;

  if (!cargando && sinPermiso) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <Users className="mx-auto mb-3 text-gray-300 dark:text-gray-600" size={40} />
        <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">Sin acceso</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          No tienes el permiso "ver_reportes" para ver los referidos de tu empresa.
          Pídele al dueño de la cuenta que te lo asigne.
        </p>
      </div>
    );
  }

  const enlace = usuario.empresa_id && usuario.empresa_slug
    ? `${window.location.origin}/solicitar-empresa?ref=${usuario.empresa_slug}`
    : '';

  function copiar() {
    if (!enlace) return;
    navigator.clipboard.writeText(enlace).then(() => {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    });
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="flex items-center gap-2 mb-1">
        <Users className="text-brand-600 dark:text-brand-400" size={24} />
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Programa de referidos</h1>
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
        CU27 · Invita a otros negocios a VecinoMarket. Cuando se confirme su registro, ganas 30 días extra de suscripción.
      </p>

      {enlace && (
        <div className="flex items-center gap-2 mb-6 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2">
          <code className="flex-1 truncate text-xs text-gray-600 dark:text-gray-400">{enlace}</code>
          <button onClick={copiar} className="flex items-center gap-1 rounded-md bg-gray-100 dark:bg-gray-800 px-2 py-1 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200">
            {copiado ? <Check size={12} /> : <Copy size={12} />} {copiado ? 'Copiado' : 'Copiar'}
          </button>
        </div>
      )}

      {error && <p className="text-sm text-red-600 dark:text-red-400 mb-4">{error}</p>}

      <div className="space-y-3">
        {cargando ? (
          <p className="text-sm text-gray-400">Cargando...</p>
        ) : referidos.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-gray-500 py-8 text-center">Todavía no invitaste a ninguna empresa.</p>
        ) : referidos.map((r) => (
          <div key={r.id} className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
            <div className="min-w-0">
              <div className="font-semibold text-gray-900 dark:text-gray-100">{r.empresa_referida_nombre}</div>
              <div className="text-xs text-gray-400 dark:text-gray-500">{new Date(r.creado_en).toLocaleDateString()}</div>
            </div>
            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold shrink-0 ${badgeEstado(r.estado)}`}>{r.estado}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
