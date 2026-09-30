import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { CreditCard, Plus, Pencil, Trash2, Check, X } from 'lucide-react';
import API from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { esSuperAdmin } from '../../utils/roles';

const VACIO = {
  nombre: '', precio_mensual: '', limite_productos: '', porcentaje_comision: '',
  incluye_live_commerce: false, incluye_ia: false, estado: 'ACTIVO',
};

export default function PlanesAdmin() {
  const { usuario, cargando: cargandoAuth } = useAuth();
  const [planes, setPlanes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  const [mostrarForm, setMostrarForm] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(VACIO);
  const [guardando, setGuardando] = useState(false);
  const [errorForm, setErrorForm] = useState('');

  function cargar() {
    setCargando(true);
    return API.get('suscripciones/admin/planes/')
      .then((res) => {
        setPlanes(res.data);
        setError('');
      })
      .catch(() => setError('No se pudo cargar los planes.'))
      .finally(() => setCargando(false));
  }

  useEffect(() => {
    if (!usuario || !esSuperAdmin(usuario)) return;
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuario]);

  if (cargandoAuth) return null;
  if (!usuario) return <Navigate to="/login?next=/admin/planes" replace />;
  if (!esSuperAdmin(usuario)) return <Navigate to="/" replace />;

  function abrirNuevo() {
    setEditando(null);
    setForm(VACIO);
    setErrorForm('');
    setMostrarForm(true);
  }

  function abrirEdicion(p) {
    setEditando(p);
    setForm({
      nombre: p.nombre, precio_mensual: p.precio_mensual, limite_productos: p.limite_productos ?? '',
      porcentaje_comision: p.porcentaje_comision, incluye_live_commerce: p.incluye_live_commerce,
      incluye_ia: p.incluye_ia, estado: p.estado,
    });
    setErrorForm('');
    setMostrarForm(true);
  }

  async function guardar(e) {
    e.preventDefault();
    setGuardando(true);
    setErrorForm('');
    const payload = { ...form, limite_productos: form.limite_productos === '' ? null : form.limite_productos };
    try {
      if (editando) {
        await API.patch(`suscripciones/admin/planes/${editando.id}/`, payload);
      } else {
        await API.post('suscripciones/admin/planes/', payload);
      }
      setMostrarForm(false);
      await cargar();
    } catch (err) {
      setErrorForm(err?.response?.data?.nombre?.[0] || err?.response?.data?.precio_mensual?.[0] || 'No se pudo guardar el plan.');
    } finally {
      setGuardando(false);
    }
  }

  async function eliminar(p) {
    if (!window.confirm(`¿Eliminar el plan "${p.nombre}"?`)) return;
    try {
      await API.delete(`suscripciones/admin/planes/${p.id}/`);
      await cargar();
    } catch (err) {
      setError(err?.response?.data?.detail || 'No se pudo eliminar el plan.');
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="flex items-center justify-between gap-2 mb-1">
        <div className="flex items-center gap-2">
          <CreditCard className="text-brand-600 dark:text-brand-400" size={24} />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Planes y suscripciones</h1>
        </div>
        <button onClick={abrirNuevo} className="flex items-center gap-1.5 rounded-md bg-brand-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-700">
          <Plus size={16} /> Nuevo plan
        </button>
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        CU20 · Catálogo de planes que se ofrecen a las empresas (asignación por empresa en CU01).
      </p>

      {error && <p className="text-sm text-red-600 dark:text-red-400 mb-4">{error}</p>}

      {cargando ? (
        <p className="text-sm text-gray-400">Cargando...</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {planes.map((p) => (
            <div key={p.id} className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-900 dark:text-gray-100">{p.nombre}</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${p.estado === 'ACTIVO' ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'}`}>{p.estado}</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">Bs {p.precio_mensual}<span className="text-xs font-normal text-gray-400">/mes</span></p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button onClick={() => abrirEdicion(p)} className="grid h-8 w-8 place-items-center rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 hover:bg-blue-100">
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => eliminar(p)} className="grid h-8 w-8 place-items-center rounded-full bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 hover:bg-red-100">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <div className="mt-3 space-y-1 text-xs text-gray-600 dark:text-gray-400">
                <p>Límite de productos: {p.limite_productos ?? 'Ilimitado'}</p>
                <p>Comisión por venta: {p.porcentaje_comision}%</p>
                <p className="flex items-center gap-1">{p.incluye_live_commerce ? <Check size={12} className="text-green-600" /> : <X size={12} className="text-gray-300" />} Live commerce</p>
                <p className="flex items-center gap-1">{p.incluye_ia ? <Check size={12} className="text-green-600" /> : <X size={12} className="text-gray-300" />} Funciones de IA</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {mostrarForm && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 px-4 overflow-y-auto py-8" onClick={() => setMostrarForm(false)}>
          <form onSubmit={guardar} className="w-full max-w-md rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-5 shadow-lg" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">{editando ? 'Editar plan' : 'Nuevo plan'}</h2>
            <div className="space-y-3">
              <input required value={form.nombre} onChange={(e) => setForm((prev) => ({ ...prev, nombre: e.target.value }))} placeholder="Nombre del plan" className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300" />
              <div className="grid grid-cols-2 gap-2">
                <input required type="number" step="0.01" min="0" value={form.precio_mensual} onChange={(e) => setForm((prev) => ({ ...prev, precio_mensual: e.target.value }))} placeholder="Precio mensual (Bs)" className="rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300" />
                <input type="number" min="0" value={form.limite_productos} onChange={(e) => setForm((prev) => ({ ...prev, limite_productos: e.target.value }))} placeholder="Límite productos (vacío=ilimitado)" className="rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300" />
              </div>
              <input required type="number" step="0.01" min="0" max="100" value={form.porcentaje_comision} onChange={(e) => setForm((prev) => ({ ...prev, porcentaje_comision: e.target.value }))} placeholder="Comisión por venta (%)" className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300" />
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input type="checkbox" checked={form.incluye_live_commerce} onChange={(e) => setForm((prev) => ({ ...prev, incluye_live_commerce: e.target.checked }))} className="rounded border-gray-300 dark:border-gray-600" />
                Incluye live commerce
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input type="checkbox" checked={form.incluye_ia} onChange={(e) => setForm((prev) => ({ ...prev, incluye_ia: e.target.checked }))} className="rounded border-gray-300 dark:border-gray-600" />
                Incluye funciones de IA
              </label>
              <select value={form.estado} onChange={(e) => setForm((prev) => ({ ...prev, estado: e.target.value }))} className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300">
                <option value="ACTIVO">Activo</option>
                <option value="INACTIVO">Inactivo</option>
              </select>
            </div>
            {errorForm && <p className="text-xs text-red-600 dark:text-red-400 mt-3">{errorForm}</p>}
            <div className="flex gap-2 mt-4">
              <button type="button" onClick={() => setMostrarForm(false)} className="flex-1 rounded-md border border-gray-300 dark:border-gray-700 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">Cancelar</button>
              <button type="submit" disabled={guardando} className="flex-1 rounded-md bg-brand-600 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60">{guardando ? 'Guardando...' : 'Guardar'}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
