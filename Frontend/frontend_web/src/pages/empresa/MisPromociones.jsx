import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Tag, Plus, Trash2, Percent } from 'lucide-react';
import API from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { esEmpresaOEmpleado } from '../../utils/roles';

const ESTADOS = [
  { value: 'ACTIVA', label: 'Activa' },
  { value: 'FINALIZADA', label: 'Finalizada' },
  { value: 'CANCELADA', label: 'Cancelada' },
];

const VACIO = { nombre: '', tipo: 'PORCENTAJE', valor: '', fecha_inicio: '', fecha_fin: '', productos: [] };

function badgeEstado(estado) {
  if (estado === 'ACTIVA') return 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400';
  if (estado === 'CANCELADA') return 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400';
  return 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300';
}

function aFechaInput(iso) {
  return iso ? iso.slice(0, 10) : '';
}

export default function MisPromociones() {
  const { usuario, cargando: cargandoAuth } = useAuth();
  const [promociones, setPromociones] = useState([]);
  const [productos, setProductos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [sinPermiso, setSinPermiso] = useState(false);
  const [error, setError] = useState('');

  const [mostrarForm, setMostrarForm] = useState(false);
  const [form, setForm] = useState(VACIO);
  const [guardando, setGuardando] = useState(false);
  const [errorForm, setErrorForm] = useState('');

  function cargarPromociones() {
    setCargando(true);
    return API.get('promociones/mis-promociones/')
      .then((res) => {
        setPromociones(res.data);
        setError('');
      })
      .catch((err) => {
        if (err?.response?.status === 403) setSinPermiso(true);
        else setError('No se pudo cargar tus promociones.');
      })
      .finally(() => setCargando(false));
  }

  useEffect(() => {
    if (!usuario || !esEmpresaOEmpleado(usuario)) return;
    cargarPromociones();
    API.get('catalogo/productos/', { params: { empresa: usuario.empresa_id, page_size: 100 } })
      .then((res) => setProductos(res.data.results))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuario]);

  if (cargandoAuth) return null;
  if (!usuario) return <Navigate to="/login?next=/mi-empresa/promociones" replace />;
  if (!esEmpresaOEmpleado(usuario)) return <Navigate to="/" replace />;

  if (!cargando && sinPermiso) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <Tag className="mx-auto mb-3 text-gray-300 dark:text-gray-600" size={40} />
        <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">Sin acceso</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          No tienes el permiso "gestionar_promociones" para administrar las promociones de tu empresa.
          Pídele al dueño de la cuenta que te lo asigne.
        </p>
      </div>
    );
  }

  function abrirNueva() {
    setForm(VACIO);
    setErrorForm('');
    setMostrarForm(true);
  }

  function toggleProducto(id) {
    setForm((prev) => ({
      ...prev,
      productos: prev.productos.includes(id) ? prev.productos.filter((p) => p !== id) : [...prev.productos, id],
    }));
  }

  async function guardar(e) {
    e.preventDefault();
    setGuardando(true);
    setErrorForm('');
    try {
      await API.post('promociones/mis-promociones/', form);
      setMostrarForm(false);
      await cargarPromociones();
    } catch (err) {
      setErrorForm(err?.response?.data?.productos?.[0] || err?.response?.data?.nombre?.[0] || 'No se pudo guardar la promoción.');
    } finally {
      setGuardando(false);
    }
  }

  async function cambiarEstado(promocion, nuevoEstado) {
    try {
      const { data } = await API.patch(`promociones/mis-promociones/${promocion.id}/`, { estado: nuevoEstado });
      setPromociones((prev) => prev.map((p) => (p.id === promocion.id ? data : p)));
    } catch {
      setError('No se pudo actualizar el estado.');
    }
  }

  async function eliminar(promocion) {
    if (!window.confirm(`¿Eliminar la promoción "${promocion.nombre}"?`)) return;
    try {
      await API.delete(`promociones/mis-promociones/${promocion.id}/`);
      await cargarPromociones();
    } catch {
      setError('No se pudo eliminar la promoción.');
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="flex items-center justify-between gap-2 mb-1">
        <div className="flex items-center gap-2">
          <Tag className="text-brand-600 dark:text-brand-400" size={24} />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Mis promociones</h1>
        </div>
        <button
          onClick={abrirNueva}
          className="flex items-center gap-1.5 rounded-md bg-brand-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-700"
        >
          <Plus size={16} /> Nueva promoción
        </button>
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">CU16 · Descuentos sobre tus propios productos.</p>

      {error && <p className="text-sm text-red-600 dark:text-red-400 mb-4">{error}</p>}

      {cargando ? (
        <p className="text-sm text-gray-400">Cargando...</p>
      ) : promociones.length === 0 ? (
        <p className="text-sm text-gray-400 dark:text-gray-500 py-8 text-center">Todavía no tienes promociones.</p>
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
                    {ESTADOS.map((op) => <option key={op.value} value={op.value}>{op.label}</option>)}
                  </select>
                  <button onClick={() => eliminar(p)} className="grid h-8 w-8 place-items-center rounded-full bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 hover:bg-red-100">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {mostrarForm && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 px-4 overflow-y-auto py-8" onClick={() => setMostrarForm(false)}>
          <form onSubmit={guardar} className="w-full max-w-md rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-5 shadow-lg" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">Nueva promoción</h2>
            <div className="space-y-3">
              <input
                required
                value={form.nombre}
                onChange={(e) => setForm((prev) => ({ ...prev, nombre: e.target.value }))}
                placeholder="Nombre de la promoción"
                className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
              />
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={form.tipo}
                  onChange={(e) => setForm((prev) => ({ ...prev, tipo: e.target.value }))}
                  className="rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
                >
                  <option value="PORCENTAJE">Porcentaje</option>
                  <option value="MONTO_FIJO">Monto fijo</option>
                </select>
                <input
                  required
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.valor}
                  onChange={(e) => setForm((prev) => ({ ...prev, valor: e.target.value }))}
                  placeholder={form.tipo === 'PORCENTAJE' ? 'Ej. 15' : 'Ej. 10.00'}
                  className="rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-gray-500 dark:text-gray-400">Desde</label>
                  <input
                    required
                    type="date"
                    value={aFechaInput(form.fecha_inicio)}
                    onChange={(e) => setForm((prev) => ({ ...prev, fecha_inicio: e.target.value }))}
                    className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 dark:text-gray-400">Hasta</label>
                  <input
                    required
                    type="date"
                    value={aFechaInput(form.fecha_fin)}
                    onChange={(e) => setForm((prev) => ({ ...prev, fecha_fin: e.target.value }))}
                    className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Productos en descuento</label>
                <div className="max-h-36 overflow-y-auto rounded-md border border-gray-200 dark:border-gray-700 p-2 space-y-1">
                  {productos.length === 0 ? (
                    <p className="text-xs text-gray-400">No tienes productos registrados.</p>
                  ) : productos.map((p) => (
                    <label key={p.id} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                      <input
                        type="checkbox"
                        checked={form.productos.includes(p.id)}
                        onChange={() => toggleProducto(p.id)}
                        className="rounded border-gray-300 dark:border-gray-600"
                      />
                      {p.nombre}
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {errorForm && <p className="text-xs text-red-600 dark:text-red-400 mt-3">{errorForm}</p>}

            <div className="flex gap-2 mt-4">
              <button type="button" onClick={() => setMostrarForm(false)} className="flex-1 rounded-md border border-gray-300 dark:border-gray-700 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
                Cancelar
              </button>
              <button type="submit" disabled={guardando} className="flex-1 rounded-md bg-brand-600 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60">
                {guardando ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
