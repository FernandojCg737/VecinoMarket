import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Users, Copy, Check, Gift } from 'lucide-react';
import API from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { esEmpresaOEmpleado } from '../../utils/roles';

export default function MisReferidos() {
  const { usuario, cargando: cargandoAuth } = useAuth();
  const [referidos, setReferidos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [sinPermiso, setSinPermiso] = useState(false);
  const [error, setError] = useState('');
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    if (!usuario || !esEmpresaOEmpleado(usuario)) return;
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

  const exitosos = referidos.filter((r) => r.estado === 'CONFIRMADO');
  const pendientes = referidos.filter((r) => r.estado !== 'CONFIRMADO');
  const totalDias = exitosos.reduce((acc, r) => acc + (r.dias_premio || 0), 0);

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
        CU27 · Invita a otros negocios a VecinoMarket. Cuando tu invitado contrata un plan pagado ganas días extra de
        suscripción automáticamente: 3 días si elige el plan Básico y 5 días si elige el Premium.
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

      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <h2 className="font-semibold text-gray-900 dark:text-gray-100">Referidos exitosos y premios recibidos</h2>
        <span className="flex items-center gap-1 rounded-full bg-brand-50 dark:bg-brand-900/30 px-3 py-1 text-xs font-semibold text-brand-700 dark:text-brand-400">
          <Gift size={12} /> {totalDias} día(s) ganados en total
        </span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-900 text-left text-gray-500 dark:text-gray-400">
            <tr>
              <th className="px-4 py-3 font-medium">Empresa referida</th>
              <th className="px-4 py-3 font-medium">Plan contratado</th>
              <th className="px-4 py-3 font-medium">Premio recibido</th>
              <th className="px-4 py-3 font-medium">Fecha</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800 bg-white dark:bg-gray-900">
            {cargando ? (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">Cargando...</td></tr>
            ) : exitosos.length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400 dark:text-gray-500">Todavía no tienes referidos exitosos. Comparte tu enlace para empezar a ganar días.</td></tr>
            ) : exitosos.map((r) => (
              <tr key={r.id}>
                <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-200">{r.empresa_referida_nombre}</td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{r.plan_referido || '—'}</td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-green-50 dark:bg-green-900/30 px-2 py-0.5 text-xs font-semibold text-green-700 dark:text-green-400">
                    +{r.dias_premio} día(s) de suscripción
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
                  {r.fecha_confirmacion ? new Date(r.fecha_confirmacion).toLocaleDateString() : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pendientes.length > 0 && (
        <p className="mt-3 text-xs text-amber-700 dark:text-amber-400">
          {pendientes.length} empresa(s) invitada(s) siguen en el plan de prueba: recibirás tu premio cuando contraten un plan pagado
          ({pendientes.map((r) => r.empresa_referida_nombre).join(', ')}).
        </p>
      )}
    </div>
  );
}
