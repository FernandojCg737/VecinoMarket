import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Users, Search, Building2, Gift } from 'lucide-react';
import API from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { esStaff } from '../../utils/roles';

export default function Referidos() {
  const { usuario, cargando: cargandoAuth } = useAuth();

  // --- columna izquierda: tenants con su resumen de referidos ---
  const [empresas, setEmpresas] = useState([]);
  const [q, setQ] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [errorEmpresas, setErrorEmpresas] = useState('');

  // --- columna derecha: referidos exitosos del tenant elegido ---
  const [empresaSel, setEmpresaSel] = useState(null);
  const [referidos, setReferidos] = useState([]);
  const [cargandoReferidos, setCargandoReferidos] = useState(false);
  const [error, setError] = useState('');

  function cargarEmpresas() {
    return API.get('facturacion/admin/referidos/resumen-empresas/', { params: { q: busqueda || undefined } })
      .then((res) => {
        setEmpresas(res.data);
        setErrorEmpresas('');
      })
      .catch(() => setErrorEmpresas('No se pudo cargar las empresas.'));
  }

  function cargarReferidos(empresaId) {
    return API.get('facturacion/admin/referidos/', { params: { empresa: empresaId, estado: 'CONFIRMADO' } })
      .then((res) => {
        setReferidos(res.data);
        setError('');
      })
      .catch(() => setError('No se pudo cargar los referidos de esta empresa.'))
      .finally(() => setCargandoReferidos(false));
  }

  useEffect(() => {
    if (!usuario || !esStaff(usuario)) return;
    cargarEmpresas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuario, busqueda]);

  useEffect(() => {
    if (!usuario || !esStaff(usuario) || !empresaSel) return;
    cargarReferidos(empresaSel.id);
  }, [usuario, empresaSel]);

  if (cargandoAuth) return null;
  if (!usuario) return <Navigate to="/login?next=/admin/referidos" replace />;
  if (!esStaff(usuario)) return <Navigate to="/" replace />;

  function buscar(e) {
    e.preventDefault();
    setBusqueda(q);
  }

  function seleccionarEmpresa(emp) {
    setEmpresaSel(emp);
    setCargandoReferidos(true);
  }

  const totalDias = referidos.reduce((acc, r) => acc + (r.dias_premio || 0), 0);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex items-center gap-2 mb-1">
        <Users className="text-brand-600 dark:text-brand-400" size={24} />
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Programa de referidos</h1>
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        CU27 · Elige una empresa para ver los referidos que concretó. El referido se confirma solo cuando la empresa invitada
        contrata un plan pagado: Básico da 3 días extra de suscripción a la que refirió y Premium, 5 días.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-[320px_1fr] gap-6">
        {/* Columna izquierda: tenants */}
        <div>
          <form onSubmit={buscar} className="flex items-center gap-2 mb-3">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar empresa..."
              className="min-w-0 flex-1 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
            />
            <button type="submit" className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-brand-600 text-white hover:bg-brand-700">
              <Search size={16} />
            </button>
          </form>

          {errorEmpresas && <p className="text-sm text-red-600 dark:text-red-400 mb-3">{errorEmpresas}</p>}

          <div className="space-y-1.5 max-h-[70vh] overflow-y-auto pr-1">
            {empresas.length === 0 ? (
              <p className="text-sm text-gray-400 dark:text-gray-500 py-4 text-center">Sin empresas.</p>
            ) : empresas.map((emp) => (
              <button
                key={emp.id}
                onClick={() => seleccionarEmpresa(emp)}
                className={`flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                  empresaSel?.id === emp.id
                    ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-400'
                    : 'border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                }`}
              >
                <Building2 size={14} className="shrink-0" />
                <span className="min-w-0 flex-1 truncate">{emp.razon_social}</span>
                <span
                  title="Referidos exitosos"
                  className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${
                    emp.referidos_confirmados > 0
                      ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                  }`}
                >
                  {emp.referidos_confirmados}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Columna derecha: referidos exitosos del tenant */}
        <div>
          {!empresaSel ? (
            <div className="flex h-full min-h-[240px] items-center justify-center rounded-xl border border-dashed border-gray-300 dark:border-gray-700 text-sm text-gray-400 dark:text-gray-500">
              Selecciona una empresa a la izquierda para ver sus referidos exitosos.
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <h2 className="font-semibold text-gray-900 dark:text-gray-100">{empresaSel.razon_social}</h2>
                <div className="flex items-center gap-2 text-xs">
                  <span className="rounded-full bg-green-50 dark:bg-green-900/30 px-3 py-1 font-semibold text-green-700 dark:text-green-400">
                    {referidos.length} referido(s) exitoso(s)
                  </span>
                  <span className="flex items-center gap-1 rounded-full bg-brand-50 dark:bg-brand-900/30 px-3 py-1 font-semibold text-brand-700 dark:text-brand-400">
                    <Gift size={12} /> {totalDias} día(s) ganados
                  </span>
                  {empresaSel.referidos_pendientes > 0 && (
                    <span className="rounded-full bg-amber-50 dark:bg-amber-900/30 px-3 py-1 font-semibold text-amber-700 dark:text-amber-400">
                      {empresaSel.referidos_pendientes} pendiente(s) en plan de prueba
                    </span>
                  )}
                </div>
              </div>

              {error && <p className="text-sm text-red-600 dark:text-red-400 mb-4">{error}</p>}

              <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-900 text-left text-gray-500 dark:text-gray-400">
                    <tr>
                      <th className="px-4 py-3 font-medium">Empresa referida</th>
                      <th className="px-4 py-3 font-medium">Plan contratado</th>
                      <th className="px-4 py-3 font-medium">Premio</th>
                      <th className="px-4 py-3 font-medium">Confirmado el</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800 bg-white dark:bg-gray-900">
                    {cargandoReferidos ? (
                      <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">Cargando...</td></tr>
                    ) : referidos.length === 0 ? (
                      <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400 dark:text-gray-500">Esta empresa todavía no tiene referidos exitosos.</td></tr>
                    ) : referidos.map((r) => (
                      <tr key={r.id}>
                        <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-200">{r.empresa_referida_nombre}</td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{r.plan_referido || '—'}</td>
                        <td className="px-4 py-3">
                          <span className="rounded-full bg-green-50 dark:bg-green-900/30 px-2 py-0.5 text-xs font-semibold text-green-700 dark:text-green-400">
                            +{r.dias_premio} día(s)
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
                          {r.fecha_confirmacion ? new Date(r.fecha_confirmacion).toLocaleString() : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
