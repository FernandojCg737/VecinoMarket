import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Users, CheckCircle2 } from 'lucide-react';
import API from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { esStaff } from '../../utils/roles';

const ESTADOS = [
  { value: '', label: 'Todos los estados' },
  { value: 'PENDIENTE', label: 'Pendiente' },
  { value: 'CONFIRMADO', label: 'Confirmado' },
];

function badgeEstado(estado) {
  return estado === 'CONFIRMADO'
    ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400'
    : 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400';
}

export default function Referidos() {
  const { usuario, cargando: cargandoAuth } = useAuth();
  const [referidos, setReferidos] = useState([]);
  const [filtroEstado, setFiltroEstado] = useState('');
  const [error, setError] = useState('');

  function cargar() {
    return API.get('facturacion/admin/referidos/', { params: { estado: filtroEstado || undefined } })
      .then((res) => {
        setReferidos(res.data);
        setError('');
      })
      .catch(() => setError('No se pudo cargar los referidos.'));
  }

  useEffect(() => {
    if (!usuario || !esStaff(usuario)) return;
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuario, filtroEstado]);

  if (cargandoAuth) return null;
  if (!usuario) return <Navigate to="/login?next=/admin/referidos" replace />;
  if (!esStaff(usuario)) return <Navigate to="/" replace />;

  async function confirmar(referido) {
    if (!window.confirm(`¿Confirmar que "${referido.empresa_referente_nombre}" refirió a "${referido.empresa_referida_nombre}"? Esto le suma 30 días a su suscripción.`)) return;
    try {
      const { data } = await API.post(`facturacion/admin/referidos/${referido.id}/confirmar/`);
      setReferidos((prev) => prev.map((r) => (r.id === referido.id ? data : r)));
    } catch (err) {
      setError(err?.response?.data?.detail || 'No se pudo confirmar el referido.');
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="flex items-center gap-2 mb-1">
        <Users className="text-brand-600 dark:text-brand-400" size={24} />
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Programa de referidos</h1>
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        CU27 · Empresas que invitaron a otras a unirse a VecinoMarket. Al confirmar, la que refirió gana 30 días extra de suscripción.
      </p>

      <select
        value={filtroEstado}
        onChange={(e) => setFiltroEstado(e.target.value)}
        className="rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-1.5 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-brand-300"
      >
        {ESTADOS.map((op) => <option key={op.value} value={op.value}>{op.label}</option>)}
      </select>

      {error && <p className="text-sm text-red-600 dark:text-red-400 mb-4">{error}</p>}

      <div className="space-y-3">
        {referidos.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-gray-500 py-8 text-center">Sin referidos todavía.</p>
        ) : referidos.map((r) => (
          <div key={r.id} className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
            <div className="min-w-0">
              <div className="text-sm text-gray-900 dark:text-gray-100">
                <span className="font-semibold">{r.empresa_referente_nombre}</span> refirió a <span className="font-semibold">{r.empresa_referida_nombre}</span>
              </div>
              <div className="text-xs text-gray-400 dark:text-gray-500">{new Date(r.creado_en).toLocaleDateString()}</div>
              {r.beneficio_aplicado && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{r.beneficio_aplicado}</p>}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${badgeEstado(r.estado)}`}>{r.estado}</span>
              {r.estado === 'PENDIENTE' && (
                <button
                  onClick={() => confirmar(r)}
                  title="Confirmar referido"
                  className="grid h-8 w-8 place-items-center rounded-full bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-100"
                >
                  <CheckCircle2 size={14} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
