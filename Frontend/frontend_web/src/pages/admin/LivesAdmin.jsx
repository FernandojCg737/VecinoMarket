import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Radio, Square, ExternalLink, ShieldAlert } from 'lucide-react';
import API from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { esStaff } from '../../utils/roles';

const ESTADOS = [
  { value: '', label: 'Todos los estados' },
  { value: 'PROGRAMADA', label: 'Programada' },
  { value: 'EN_VIVO', label: 'En vivo' },
  { value: 'FINALIZADA', label: 'Finalizada' },
];

function badgeEstado(estado) {
  if (estado === 'EN_VIVO') return 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400';
  if (estado === 'FINALIZADA') return 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300';
  return 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400';
}

export default function LivesAdmin() {
  const { usuario, cargando: cargandoAuth } = useAuth();
  const [lives, setLives] = useState([]);
  const [filtroEstado, setFiltroEstado] = useState('EN_VIVO');
  const [error, setError] = useState('');

  function cargar() {
    return API.get('promociones/admin/lives/', { params: { estado: filtroEstado || undefined } })
      .then((res) => {
        setLives(res.data);
        setError('');
      })
      .catch(() => setError('No se pudo cargar las transmisiones.'));
  }

  useEffect(() => {
    if (!usuario || !esStaff(usuario)) return;
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuario, filtroEstado]);

  if (cargandoAuth) return null;
  if (!usuario) return <Navigate to="/login?next=/admin/live-commerce" replace />;
  if (!esStaff(usuario)) return <Navigate to="/" replace />;

  async function darDeBaja(live) {
    if (!window.confirm(`¿Dar de baja la transmisión "${live.titulo}" de "${live.empresa_nombre}"?`)) return;
    try {
      const { data } = await API.post(`promociones/admin/lives/${live.id}/dar-de-baja/`);
      setLives((prev) => prev.map((l) => (l.id === live.id ? data : l)));
    } catch {
      setError('No se pudo dar de baja la transmisión.');
    }
  }

  async function bloquear(live) {
    const dias = window.prompt(`¿Por cuántos días bloqueamos a "${live.empresa_nombre}" para emitir en vivo?`, '7');
    if (!dias) return;
    try {
      await API.post(`promociones/admin/empresas/${live.empresa}/bloquear-live/`, { dias: parseInt(dias, 10) });
      await darDeBaja(live);
    } catch (err) {
      setError(err?.response?.data?.detail || 'No se pudo bloquear a la empresa.');
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="flex items-center gap-2 mb-1">
        <Radio className="text-brand-600 dark:text-brand-400" size={24} />
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Live commerce</h1>
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        CU17 · Panel de soporte: unirte, dar de baja, o bloquear a una empresa por incumplimiento.
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
        {lives.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-gray-500 py-8 text-center">Sin transmisiones en este estado.</p>
        ) : lives.map((l) => (
          <div key={l.id} className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-gray-900 dark:text-gray-100">{l.titulo}</span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${badgeEstado(l.estado)}`}>{l.estado}</span>
              </div>
              <div className="text-xs text-gray-400 dark:text-gray-500">{l.empresa_nombre}</div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {l.url_stream && (
                <a href={l.url_stream} target="_blank" rel="noreferrer" title="Unirse" className="grid h-8 w-8 place-items-center rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 hover:bg-blue-100">
                  <ExternalLink size={14} />
                </a>
              )}
              {l.estado === 'EN_VIVO' && (
                <button onClick={() => darDeBaja(l)} title="Dar de baja" className="grid h-8 w-8 place-items-center rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200">
                  <Square size={14} />
                </button>
              )}
              <button onClick={() => bloquear(l)} title="Bloquear empresa (incumplimiento)" className="grid h-8 w-8 place-items-center rounded-full bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 hover:bg-red-100">
                <ShieldAlert size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
