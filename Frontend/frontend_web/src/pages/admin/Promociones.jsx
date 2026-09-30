import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Tag, Search, ArrowLeft, Store, Trash2, Percent } from 'lucide-react';
import API from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { esStaff } from '../../utils/roles';

const ESTADOS = [
  { value: '', label: 'Todos los estados' },
  { value: 'ACTIVA', label: 'Activa' },
  { value: 'FINALIZADA', label: 'Finalizada' },
  { value: 'CANCELADA', label: 'Cancelada' },
];

function badgeEstado(estado) {
  if (estado === 'ACTIVA') return 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400';
  if (estado === 'CANCELADA') return 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400';
  return 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300';
}

export default function Promociones() {
  const { usuario, cargando: cargandoAuth } = useAuth();

  const [empresas, setEmpresas] = useState([]);
  const [q, setQ] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [cargandoEmpresas, setCargandoEmpresas] = useState(true);
  const [error, setError] = useState('');

  const [empresaSel, setEmpresaSel] = useState(null);
  const [promociones, setPromociones] = useState([]);
  const [cargandoPromociones, setCargandoPromociones] = useState(false);
  const [filtroEstado, setFiltroEstado] = useState('');

  function cargarEmpresas() {
    setCargandoEmpresas(true);
    return API.get('promociones/admin/resumen-empresas/', { params: { q: busqueda || undefined } })
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

  function cargarPromociones() {
    if (!empresaSel) return;
    setCargandoPromociones(true);
    return API.get('promociones/admin/promociones/', { params: { empresa: empresaSel.id, estado: filtroEstado || undefined } })
      .then((res) => setPromociones(res.data))
      .catch(() => setError('No se pudo cargar las promociones.'))
      .finally(() => setCargandoPromociones(false));
  }

  useEffect(() => {
    if (!empresaSel) return;
    cargarPromociones();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empresaSel, filtroEstado]);

  if (cargandoAuth) return null;
  if (!usuario) return <Navigate to="/login?next=/admin/promociones" replace />;
  if (!esStaff(usuario)) return <Navigate to="/" replace />;

  async function cambiarEstado(promocion, nuevoEstado) {
    try {
      const { data } = await API.patch(`promociones/admin/promociones/${promocion.id}/`, { estado: nuevoEstado });
      setPromociones((prev) => prev.map((p) => (p.id === promocion.id ? data : p)));
    } catch {
      setError('No se pudo actualizar el estado.');
    }
  }

  async function eliminar(promocion) {
    if (!window.confirm(`¿Eliminar la promoción "${promocion.nombre}"?`)) return;
    try {
      await API.delete(`promociones/admin/promociones/${promocion.id}/`);
      await cargarPromociones();
    } catch {
      setError('No se pudo eliminar la promoción.');
    }
  }

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
          <Tag className="text-brand-600 dark:text-brand-400" size={24} />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{empresaSel.razon_social}</h1>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          CU16 · Promociones y artículos en descuento de esta empresa.
        </p>

        <select
          value={filtroEstado}
          onChange={(e) => setFiltroEstado(e.target.value)}
          className="rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-1.5 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-brand-300"
        >
          {ESTADOS.map((op) => <option key={op.value} value={op.value}>{op.label}</option>)}
        </select>

        {error && <p className="text-sm text-red-600 dark:text-red-400 mb-4">{error}</p>}

        {cargandoPromociones ? (
          <p className="text-sm text-gray-400">Cargando...</p>
        ) : promociones.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-gray-500 py-8 text-center">Sin promociones.</p>
        ) : (
          <div className="space-y-3">
            {promociones.map((p) => (
              <div key={p.id} className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900 dark:text-gray-100">{p.nombre}</span>
                      <span className="flex items-center gap-0.5 text-xs font-semibold text-brand-600 dark:text-brand-400">
                        <Percent size={11} /> {p.tipo === 'PORCENTAJE' ? `${p.valor}%` : `Bs ${p.valor}`}
                      </span>
                    </div>
                    <div className="text-xs text-gray-400 dark:text-gray-500">
                      {new Date(p.fecha_inicio).toLocaleDateString()} — {new Date(p.fecha_fin).toLocaleDateString()}
                    </div>
                    {p.productos_nombres.length > 0 && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{p.productos_nombres.join(', ')}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <select
                      value={p.estado}
                      onChange={(e) => cambiarEstado(p, e.target.value)}
                      className={`rounded-full border-0 px-2 py-0.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-300 ${badgeEstado(p.estado)}`}
                    >
                      {ESTADOS.filter((op) => op.value).map((op) => <option key={op.value} value={op.value}>{op.label}</option>)}
                    </select>
                    <button
                      onClick={() => eliminar(p)}
                      className="grid h-8 w-8 place-items-center rounded-full bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 hover:bg-red-100"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex items-center gap-2 mb-1">
        <Tag className="text-brand-600 dark:text-brand-400" size={24} />
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Promociones y descuentos</h1>
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        CU16 · Busca una empresa para ver, editar o eliminar sus promociones.
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
              <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">{e.promociones_activas} promociones activas</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
