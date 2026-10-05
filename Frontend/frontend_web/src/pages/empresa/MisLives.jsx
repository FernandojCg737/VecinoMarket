import { useEffect, useState } from 'react';
import { Navigate, useNavigate, Link } from 'react-router-dom';
import { Radio, Plus, Trash2, Play, Square, Film, Lock, Check, Sparkles } from 'lucide-react';
import API from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { esEmpresaOEmpleado, planPermiteLive } from '../../utils/roles';

const VACIO = { titulo: '', url_stream: '', productos: [] };

function badgeEstado(estado) {
  if (estado === 'EN_VIVO') return 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400';
  if (estado === 'FINALIZADA') return 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300';
  return 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400';
}

export default function MisLives() {
  const { usuario, cargando: cargandoAuth } = useAuth();
  const navigate = useNavigate();
  const [lives, setLives] = useState([]);
  const [productos, setProductos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [sinPermiso, setSinPermiso] = useState(false);
  const [sinPermisoPlan, setSinPermisoPlan] = useState(false);
  const [error, setError] = useState('');

  const [mostrarForm, setMostrarForm] = useState(false);
  const [form, setForm] = useState(VACIO);
  const [guardando, setGuardando] = useState(false);
  const [errorForm, setErrorForm] = useState('');

  function cargarLives() {
    setCargando(true);
    return API.get('promociones/mis-lives/')
      .then((res) => {
        setLives(res.data);
        setError('');
      })
      .catch((err) => {
        if (err?.response?.status === 403) {
          const detail = (err?.response?.data?.detail || '').toLowerCase();
          if (detail.includes('plan') || detail.includes('premium')) {
            setSinPermisoPlan(true);
          } else {
            setSinPermiso(true);
          }
        } else {
          setError('No se pudo cargar tus transmisiones.');
        }
      })
      .finally(() => setCargando(false));
  }

  useEffect(() => {
    if (!usuario || !esEmpresaOEmpleado(usuario)) return;
    if (planPermiteLive(usuario)) {
      cargarLives();
      API.get('catalogo/productos/', { params: { empresa: usuario.empresa_id, page_size: 100 } })
        .then((res) => setProductos(res.data.results))
        .catch(() => {});
    } else {
      setCargando(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuario]);

  if (cargandoAuth) return null;
  if (!usuario) return <Navigate to="/login?next=/mi-empresa/lives" replace />;
  if (!esEmpresaOEmpleado(usuario)) return <Navigate to="/" replace />;

  // CU17 / CU20: Bloqueo para empresas cuyo plan no incluye Live Commerce (ej. Plan Básico)
  if (!planPermiteLive(usuario) || sinPermisoPlan) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-purple-50 dark:bg-purple-950/60 flex items-center justify-center mb-4 text-purple-600 dark:text-purple-400">
          <Radio size={32} />
        </div>
        <span className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 mb-3 border border-amber-200 dark:border-amber-800">
          <Lock size={12} /> FUNCIÓN EXCLUSIVA PLAN PREMIUM
        </span>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Live Commerce no disponible en tu plan actual
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 max-w-lg mx-auto mb-6">
          Tu empresa tiene activo el <strong>{usuario?.empresa_plan?.nombre ? `Plan ${usuario.empresa_plan.nombre}` : 'Plan Básico'}</strong>.
          Este plan incluye acceso completo a herramientas de <strong>Inteligencia Artificial (IA)</strong>, pero las transmisiones de <strong>Live Commerce</strong> en video interactivo están reservadas para el <strong>Plan Premium</strong>.
        </p>

        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 text-left max-w-md mx-auto mb-6 space-y-2.5 text-xs text-gray-600 dark:text-gray-300 shadow-xs">
          <div className="flex items-center gap-2 font-bold text-gray-900 dark:text-gray-100 mb-1">
            <Sparkles size={14} className="text-amber-500" />
            <span>Beneficios del Live Commerce en Plan Premium:</span>
          </div>
          <div className="flex items-start gap-2">
            <Check size={14} className="text-green-500 shrink-0 mt-0.5" />
            <span>Transmisión en vivo de audio y video peer-to-peer directamente con tus compradores.</span>
          </div>
          <div className="flex items-start gap-2">
            <Check size={14} className="text-green-500 shrink-0 mt-0.5" />
            <span>Catálogo interactivo con productos fijados y venta directa al carrito durante el streaming.</span>
          </div>
          <div className="flex items-start gap-2">
            <Check size={14} className="text-green-500 shrink-0 mt-0.5" />
            <span>Grabación automática de cada sesión para que tus clientes puedan ver la repetición.</span>
          </div>
        </div>

        <div className="flex items-center justify-center gap-3">
          <Link
            to="/mi-empresa/dashboard"
            className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
          >
            Volver a mi Dashboard
          </Link>
          <Link
            to="/mi-empresa/suscripcion"
            className="px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-sm font-bold text-white shadow-xs transition"
          >
            Mejorar a Plan Premium (Bs 129.90)
          </Link>
        </div>
      </div>
    );
  }

  if (!cargando && sinPermiso) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <Radio className="mx-auto mb-3 text-gray-300 dark:text-gray-600" size={40} />
        <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">Sin acceso</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          No tienes el permiso "gestionar_promociones" para administrar los lives de tu empresa.
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
      await API.post('promociones/mis-lives/', form);
      setMostrarForm(false);
      await cargarLives();
    } catch (err) {
      setErrorForm(err?.response?.data?.detail || err?.response?.data?.titulo?.[0] || 'No se pudo crear la transmisión.');
    } finally {
      setGuardando(false);
    }
  }

  async function cambiarEstado(live, nuevoEstado) {
    try {
      const { data } = await API.patch(`promociones/mis-lives/${live.id}/`, { estado: nuevoEstado });
      setLives((prev) => prev.map((l) => (l.id === live.id ? data : l)));
    } catch (err) {
      setError(err?.response?.data?.detail || 'No se pudo actualizar el estado.');
    }
  }

  async function eliminar(live) {
    if (!window.confirm(`¿Eliminar la transmisión "${live.titulo}"?`)) return;
    try {
      await API.delete(`promociones/mis-lives/${live.id}/`);
      await cargarLives();
    } catch {
      setError('No se pudo eliminar la transmisión.');
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="flex items-center justify-between gap-2 mb-1">
        <div className="flex items-center gap-2">
          <Radio className="text-brand-600 dark:text-brand-400" size={24} />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Mis transmisiones en vivo</h1>
        </div>
        <button onClick={abrirNueva} className="flex items-center gap-1.5 rounded-md bg-brand-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-700">
          <Plus size={16} /> Nueva transmisión
        </button>
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">CU17 · Vende tus productos en vivo, transmitiendo con tu cámara directo desde VecinoMarket.</p>

      {error && <p className="text-sm text-red-600 dark:text-red-400 mb-4">{error}</p>}

      {cargando ? (
        <p className="text-sm text-gray-400">Cargando...</p>
      ) : lives.length === 0 ? (
        <p className="text-sm text-gray-400 dark:text-gray-500 py-8 text-center">Todavía no programaste ninguna transmisión.</p>
      ) : (
        <div className="space-y-3">
          {lives.map((l) => (
            <div key={l.id} className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-900 dark:text-gray-100">{l.titulo}</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${badgeEstado(l.estado)}`}>{l.estado}</span>
                    {l.estado === 'EN_VIVO' && l.pausado && (
                      <span className="rounded-full px-2 py-0.5 text-xs font-semibold bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300">PAUSADO</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{l.url_stream}</p>
                  {l.productos_detalle.length > 0 && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{l.productos_detalle.map((p) => p.nombre).join(', ')}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {l.estado !== 'EN_VIVO' && l.estado !== 'FINALIZADA' && (
                    <button onClick={() => navigate(`/mi-empresa/lives/${l.id}/transmitir`)} title="Empezar transmisión" className="grid h-8 w-8 place-items-center rounded-full bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 hover:bg-red-100">
                      <Play size={14} />
                    </button>
                  )}
                  {l.estado === 'EN_VIVO' && l.pausado && (
                    <button onClick={() => navigate(`/mi-empresa/lives/${l.id}/transmitir`)} title="Reanudar transmisión" className="grid h-8 w-8 place-items-center rounded-full bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 hover:bg-red-100">
                      <Play size={14} />
                    </button>
                  )}
                  {l.estado === 'EN_VIVO' && (
                    <button onClick={() => cambiarEstado(l, 'FINALIZADA')} title="Terminar transmisión (sin grabación — para grabarla, termínala desde la pantalla de transmisión)" className="grid h-8 w-8 place-items-center rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200">
                      <Square size={14} />
                    </button>
                  )}
                  {l.estado === 'FINALIZADA' && (
                    <button onClick={() => navigate(`/mi-empresa/lives/${l.id}/grabacion`)} title="Ver grabación" className="grid h-8 w-8 place-items-center rounded-full bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-400 hover:bg-brand-100">
                      <Film size={14} />
                    </button>
                  )}
                  <button onClick={() => eliminar(l)} className="grid h-8 w-8 place-items-center rounded-full bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 hover:bg-red-100">
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
            <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">Nueva transmisión</h2>
            <div className="space-y-3">
              <input
                required
                value={form.titulo}
                onChange={(e) => setForm((prev) => ({ ...prev, titulo: e.target.value }))}
                placeholder="Título de la transmisión"
                className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
              />
              <input
                value={form.url_stream}
                onChange={(e) => setForm((prev) => ({ ...prev, url_stream: e.target.value }))}
                placeholder="Link externo opcional (YouTube, etc.)"
                className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
              />
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Productos que vas a vender</label>
                <div className="max-h-36 overflow-y-auto rounded-md border border-gray-200 dark:border-gray-700 p-2 space-y-1">
                  {productos.length === 0 ? (
                    <p className="text-xs text-gray-400">No tienes productos registrados.</p>
                  ) : productos.map((p) => (
                    <label key={p.id} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                      <input type="checkbox" checked={form.productos.includes(p.id)} onChange={() => toggleProducto(p.id)} className="rounded border-gray-300 dark:border-gray-600" />
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
