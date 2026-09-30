import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Building2, ChevronLeft, ChevronRight, Ban, RotateCcw, Search, Check, X, CreditCard, Pencil, Plus } from 'lucide-react';
import API from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { esStaff } from '../../utils/roles';

const ESTADOS = [
  { value: '', label: 'Todos los estados' },
  { value: 'ACTIVA', label: 'Activa' },
  { value: 'SUSPENDIDA', label: 'Suspendida' },
  { value: 'CANCELADA', label: 'Cancelada' },
];

const ESTADOS_SUSCRIPCION = [
  { value: '', label: 'Todas' },
  { value: 'ACTIVA', label: 'Activas' },
  { value: 'SOLICITANDO_SUSCRIPCION', label: 'Solicitando suscripción' },
  { value: 'EXPIRADA', label: 'Expiradas' },
];

function badgeEstado(estado) {
  if (estado === 'ACTIVA') return 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400';
  if (estado === 'SUSPENDIDA') return 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400';
  return 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300';
}

function badgeSuscripcion(estado) {
  if (estado === 'ACTIVA') return 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400';
  if (estado === 'EXPIRADA') return 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400';
  return 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400';
}

function labelSuscripcion(estado) {
  if (estado === 'ACTIVA') return 'Activa';
  if (estado === 'EXPIRADA') return 'Expirada';
  return 'Solicitando suscripción';
}

function fechaEnDias(dias) {
  const f = new Date();
  f.setDate(f.getDate() + dias);
  return f.toISOString().slice(0, 10);
}

function formatearFechaHora(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleString('es-BO', { dateStyle: 'medium', timeStyle: 'short' });
}

function slugSugerido(texto) {
  return texto
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export default function EmpresasAdmin() {
  const { usuario, cargando: cargandoAuth } = useAuth();
  const [tab, setTab] = useState('empresas');

  // --- Tab "Empresas" ---
  const [resultados, setResultados] = useState([]);
  const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [estado, setEstado] = useState('');
  const [estadoSuscripcion, setEstadoSuscripcion] = useState('');
  const [q, setQ] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [accionando, setAccionando] = useState(null);
  const [error, setError] = useState('');

  // --- Tab "Solicitudes pendientes" ---
  const [solicitudes, setSolicitudes] = useState([]);
  const [errorSolicitudes, setErrorSolicitudes] = useState('');
  const [procesandoSolicitud, setProcesandoSolicitud] = useState(null);
  const [slugPorSolicitud, setSlugPorSolicitud] = useState({});
  const [motivoPorSolicitud, setMotivoPorSolicitud] = useState({});

  // --- Modal "Editar suscripción" ---
  const [empresaParaAsignar, setEmpresaParaAsignar] = useState(null);
  const [planes, setPlanes] = useState([]);
  const [planSeleccionado, setPlanSeleccionado] = useState('');
  const [fechaVencimiento, setFechaVencimiento] = useState('');
  const [asignando, setAsignando] = useState(false);
  const [errorAsignar, setErrorAsignar] = useState('');

  // --- Modal "Editar empresa" ---
  const [empresaEditando, setEmpresaEditando] = useState(null);
  const [datosEdicion, setDatosEdicion] = useState({});
  const [guardandoEdicion, setGuardandoEdicion] = useState(false);
  const [errorEdicion, setErrorEdicion] = useState('');

  // --- Modal "Nueva empresa" (CU01: alta directa del SuperAdmin) ---
  const [creandoEmpresa, setCreandoEmpresa] = useState(false);
  const [datosNuevaEmpresa, setDatosNuevaEmpresa] = useState({ razon_social: '', nit: '', correo_empresa: '', plan_id: '' });
  const [guardandoNuevaEmpresa, setGuardandoNuevaEmpresa] = useState(false);
  const [errorNuevaEmpresa, setErrorNuevaEmpresa] = useState('');

  const porPagina = 30;

  function cargarEmpresas() {
    return API.get('usuarios/empresas/lista/', {
      params: {
        page: pagina,
        estado: estado || undefined,
        estado_suscripcion: estadoSuscripcion || undefined,
        q: busqueda || undefined,
      },
    })
      .then((res) => {
        setResultados(res.data.results);
        setTotal(res.data.count);
        setError('');
      })
      .catch(() => setError('No se pudo cargar la lista de empresas.'));
  }

  useEffect(() => {
    if (!usuario || !esStaff(usuario) || tab !== 'empresas') return;
    cargarEmpresas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuario, tab, pagina, estado, estadoSuscripcion, busqueda]);

  function cargarSolicitudes() {
    API.get('usuarios/solicitudes-empresa/lista/')
      .then((res) => {
        setSolicitudes(res.data);
        setErrorSolicitudes('');
      })
      .catch(() => setErrorSolicitudes('No se pudieron cargar las solicitudes.'));
  }

  useEffect(() => {
    if (!usuario || !esStaff(usuario) || tab !== 'solicitudes') return;
    cargarSolicitudes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuario, tab]);

  if (cargandoAuth) return null;
  if (!usuario) return <Navigate to="/login?next=/admin/empresas" replace />;
  if (!esStaff(usuario)) return <Navigate to="/" replace />;

  async function toggleEstado(empresa) {
    setAccionando(empresa.id);
    const accion = empresa.estado === 'SUSPENDIDA' ? 'reactivar' : 'suspender';
    try {
      await API.post(`usuarios/empresas/${empresa.id}/${accion}/`);
      setResultados((prev) => prev.map((it) => (
        it.id === empresa.id ? { ...it, estado: accion === 'suspender' ? 'SUSPENDIDA' : 'ACTIVA' } : it
      )));
    } catch (err) {
      setError(err?.response?.data?.detail || 'No se pudo completar la acción.');
    } finally {
      setAccionando(null);
    }
  }

  async function aprobarSolicitud(solicitud) {
    const slug = (slugPorSolicitud[solicitud.id] ?? slugSugerido(solicitud.razon_social)).trim();
    if (!slug) return;
    setProcesandoSolicitud(solicitud.id);
    try {
      await API.post(`usuarios/solicitudes-empresa/${solicitud.id}/aprobar/`, { slug });
      setSolicitudes((prev) => prev.filter((s) => s.id !== solicitud.id));
      setErrorSolicitudes('');
    } catch (err) {
      setErrorSolicitudes(err?.response?.data?.slug?.[0] || 'No se pudo aprobar la solicitud.');
    } finally {
      setProcesandoSolicitud(null);
    }
  }

  async function rechazarSolicitud(solicitud) {
    const motivo = (motivoPorSolicitud[solicitud.id] ?? '').trim();
    if (!motivo) {
      setErrorSolicitudes('Escribe un motivo antes de rechazar.');
      return;
    }
    setProcesandoSolicitud(solicitud.id);
    try {
      await API.post(`usuarios/solicitudes-empresa/${solicitud.id}/rechazar/`, { motivo_rechazo: motivo });
      setSolicitudes((prev) => prev.filter((s) => s.id !== solicitud.id));
      setErrorSolicitudes('');
    } catch {
      setErrorSolicitudes('No se pudo rechazar la solicitud.');
    } finally {
      setProcesandoSolicitud(null);
    }
  }

  function abrirAsignarPlan(empresa) {
    setEmpresaParaAsignar(empresa);
    setPlanSeleccionado(empresa.plan ?? '');
    // fecha_vencimiento ahora llega con hora incluida (ISO datetime) — el
    // <input type="date"> del modal solo acepta YYYY-MM-DD.
    setFechaVencimiento(empresa.fecha_vencimiento ? empresa.fecha_vencimiento.slice(0, 10) : fechaEnDias(30));
    setErrorAsignar('');
    if (planes.length === 0) {
      API.get('suscripciones/planes/')
        .then((res) => setPlanes(res.data))
        .catch(() => setErrorAsignar('No se pudieron cargar los planes.'));
    }
  }

  function seleccionarPlan(planId) {
    setPlanSeleccionado(planId);
    const plan = planes.find((p) => String(p.id) === String(planId));
    if (plan) setFechaVencimiento(fechaEnDias(plan.duracion_dias));
  }

  async function confirmarAsignarPlan() {
    if (!planSeleccionado) {
      setErrorAsignar('Elige un plan.');
      return;
    }
    if (!fechaVencimiento) {
      setErrorAsignar('Elige una fecha de vencimiento.');
      return;
    }
    setAsignando(true);
    try {
      await API.post(`suscripciones/empresas/${empresaParaAsignar.id}/suscripcion/`, {
        plan_id: planSeleccionado,
        fecha_vencimiento: fechaVencimiento,
      });
      setEmpresaParaAsignar(null);
      await cargarEmpresas();
    } catch (err) {
      setErrorAsignar(err?.response?.data?.plan_id?.[0] || err?.response?.data?.fecha_vencimiento?.[0] || 'No se pudo guardar la suscripción.');
    } finally {
      setAsignando(false);
    }
  }

  function abrirEdicion(empresa) {
    setEmpresaEditando(empresa);
    setDatosEdicion({
      razon_social: empresa.razon_social || '',
      nit: empresa.nit || '',
      slug: empresa.slug || '',
      ciudad: empresa.ciudad || '',
      departamento: empresa.departamento || '',
      estado: empresa.estado,
    });
    setErrorEdicion('');
  }

  async function guardarEdicion(e) {
    e.preventDefault();
    setGuardandoEdicion(true);
    setErrorEdicion('');
    try {
      await API.patch(`usuarios/empresas/${empresaEditando.id}/editar/`, datosEdicion);
      setEmpresaEditando(null);
      await cargarEmpresas();
    } catch (err) {
      setErrorEdicion(err?.response?.data?.slug?.[0] || err?.response?.data?.nit?.[0] || 'No se pudo guardar los cambios.');
    } finally {
      setGuardandoEdicion(false);
    }
  }

  function abrirCrearEmpresa() {
    setCreandoEmpresa(true);
    setDatosNuevaEmpresa({ razon_social: '', nit: '', correo_empresa: '', plan_id: '' });
    setErrorNuevaEmpresa('');
    if (planes.length === 0) {
      API.get('suscripciones/planes/')
        .then((res) => setPlanes(res.data))
        .catch(() => setErrorNuevaEmpresa('No se pudieron cargar los planes.'));
    }
  }

  async function guardarNuevaEmpresa(e) {
    e.preventDefault();
    if (!datosNuevaEmpresa.plan_id) {
      setErrorNuevaEmpresa('Elige un plan.');
      return;
    }
    setGuardandoNuevaEmpresa(true);
    setErrorNuevaEmpresa('');
    try {
      await API.post('usuarios/empresas/crear-directa/', datosNuevaEmpresa);
      setCreandoEmpresa(false);
      await cargarEmpresas();
    } catch (err) {
      setErrorNuevaEmpresa(err?.response?.data?.detail || 'No se pudo crear la empresa.');
    } finally {
      setGuardandoNuevaEmpresa(false);
    }
  }

  function buscar(e) {
    e.preventDefault();
    setPagina(1);
    setBusqueda(q);
  }

  const totalPaginas = Math.max(1, Math.ceil(total / porPagina));

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex items-center justify-between gap-2 mb-1">
        <div className="flex items-center gap-2">
          <Building2 className="text-brand-600 dark:text-brand-400" size={24} />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Gestión de empresas</h1>
        </div>
        <button
          onClick={abrirCrearEmpresa}
          className="inline-flex items-center gap-1.5 rounded-full bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700"
        >
          <Plus size={14} /> Nueva empresa
        </button>
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        CU01 · Cuentas de empresa, su estado de suscripción y las solicitudes de alta pendientes.
      </p>

      <div className="flex gap-1 mb-6 border-b border-gray-200 dark:border-gray-800">
        <button
          onClick={() => setTab('empresas')}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
            tab === 'empresas'
              ? 'border-brand-600 text-brand-600 dark:text-brand-400'
              : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700'
          }`}
        >
          Empresas
        </button>
        <button
          onClick={() => setTab('solicitudes')}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
            tab === 'solicitudes'
              ? 'border-brand-600 text-brand-600 dark:text-brand-400'
              : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700'
          }`}
        >
          Solicitudes pendientes{solicitudes.length > 0 ? ` (${solicitudes.length})` : ''}
        </button>
      </div>

      {tab === 'empresas' ? (
        <>
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <form onSubmit={buscar} className="flex items-center gap-2">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar por razón social o NIT..."
                className="rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-1.5 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-brand-300"
              />
              <button type="submit" className="grid h-8 w-8 place-items-center rounded-md bg-brand-600 text-white hover:bg-brand-700">
                <Search size={16} />
              </button>
            </form>
            <select
              value={estado}
              onChange={(e) => { setEstado(e.target.value); setPagina(1); }}
              className="rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
            >
              {ESTADOS.map((op) => <option key={op.value} value={op.value}>{op.label}</option>)}
            </select>
            <div className="flex gap-1">
              {ESTADOS_SUSCRIPCION.map((op) => (
                <button
                  key={op.value}
                  onClick={() => { setEstadoSuscripcion(op.value); setPagina(1); }}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium border ${
                    estadoSuscripcion === op.value
                      ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-400'
                      : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-300'
                  }`}
                >
                  {op.label}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-sm text-red-600 dark:text-red-400 mb-4">{error}</p>}

          <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-900 text-left text-gray-500 dark:text-gray-400">
                <tr>
                  <th className="px-4 py-3 font-medium">Empresa</th>
                  <th className="px-4 py-3 font-medium">Dueño</th>
                  <th className="px-4 py-3 font-medium">Ubicación</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  <th className="px-4 py-3 font-medium">Suscripción</th>
                  <th className="px-4 py-3 font-medium text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800 bg-white dark:bg-gray-900">
                {resultados.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400 dark:text-gray-500">Sin resultados.</td></tr>
                ) : resultados.map((e) => (
                  <tr key={e.id}>
                    <td className="px-4 py-3">
                      <div className="text-gray-800 dark:text-gray-200 font-medium">{e.razon_social}</div>
                      <div className="text-xs text-gray-400 dark:text-gray-500">NIT {e.nit}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-gray-700 dark:text-gray-300">{e.dueno_nombre}</div>
                      <div className="text-xs text-gray-400 dark:text-gray-500">{e.dueno_email}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{e.ciudad || '—'}{e.departamento ? `, ${e.departamento}` : ''}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${badgeEstado(e.estado)}`}>{e.estado}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${badgeSuscripcion(e.estado_suscripcion)}`}>
                        {labelSuscripcion(e.estado_suscripcion)}
                      </span>
                      {e.plan_nombre && (
                        <div className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                          <div>{e.plan_nombre}</div>
                          {e.fecha_inicio && <div>Adquirida: {formatearFechaHora(e.fecha_inicio)}</div>}
                          {e.fecha_vencimiento && <div>Vence: {formatearFechaHora(e.fecha_vencimiento)}</div>}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => abrirEdicion(e)}
                          className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 dark:bg-gray-800 px-3 py-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-200"
                        >
                          <Pencil size={12} /> Editar
                        </button>
                        <button
                          onClick={() => abrirAsignarPlan(e)}
                          className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 dark:bg-blue-900/30 px-3 py-1.5 text-xs font-semibold text-blue-700 dark:text-blue-400 hover:bg-blue-100"
                        >
                          <CreditCard size={12} /> Suscripción
                        </button>
                        {e.estado !== 'CANCELADA' && (
                          <button
                            onClick={() => toggleEstado(e)}
                            disabled={accionando === e.id}
                            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold disabled:opacity-50 ${
                              e.estado === 'SUSPENDIDA'
                                ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-100'
                                : 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 hover:bg-amber-100'
                            }`}
                          >
                            {e.estado === 'SUSPENDIDA' ? <RotateCcw size={12} /> : <Ban size={12} />}
                            {e.estado === 'SUSPENDIDA' ? 'Reactivar' : 'Suspender'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between mt-4 text-sm text-gray-600 dark:text-gray-400">
            <span>{total} empresas en total</span>
            <div className="flex items-center gap-2">
              <button onClick={() => setPagina((p) => Math.max(1, p - 1))} disabled={pagina <= 1}
                className="grid h-8 w-8 place-items-center rounded-full border border-gray-300 dark:border-gray-700 disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-gray-800">
                <ChevronLeft size={16} />
              </button>
              <span>Página {pagina} de {totalPaginas}</span>
              <button onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))} disabled={pagina >= totalPaginas}
                className="grid h-8 w-8 place-items-center rounded-full border border-gray-300 dark:border-gray-700 disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-gray-800">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </>
      ) : (
        <div>
          {errorSolicitudes && <p className="text-sm text-red-600 dark:text-red-400 mb-4">{errorSolicitudes}</p>}
          {solicitudes.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-gray-500 py-8 text-center">No hay solicitudes pendientes.</p>
          ) : (
            <div className="space-y-3">
              {solicitudes.map((s) => (
                <div key={s.id} className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold text-gray-900 dark:text-gray-100">{s.razon_social}</div>
                      <div className="text-xs text-gray-400 dark:text-gray-500">NIT {s.nit} · Solicitado {new Date(s.creado_en).toLocaleDateString()}</div>
                      {s.documento_url && (
                        <a href={s.documento_url} target="_blank" rel="noreferrer" className="text-xs text-brand-600 dark:text-brand-400 hover:underline">
                          Ver documento adjunto
                        </a>
                      )}
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <input
                      value={slugPorSolicitud[s.id] ?? slugSugerido(s.razon_social)}
                      onChange={(e) => setSlugPorSolicitud((prev) => ({ ...prev, [s.id]: e.target.value }))}
                      placeholder="slug-de-la-empresa"
                      className="rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-2 py-1.5 text-xs w-48 focus:outline-none focus:ring-2 focus:ring-brand-300"
                    />
                    <button
                      onClick={() => aprobarSolicitud(s)}
                      disabled={procesandoSolicitud === s.id}
                      className="inline-flex items-center gap-1.5 rounded-full bg-green-50 dark:bg-green-900/30 px-3 py-1.5 text-xs font-semibold text-green-700 dark:text-green-400 hover:bg-green-100 disabled:opacity-50"
                    >
                      <Check size={12} /> Aprobar
                    </button>
                    <input
                      value={motivoPorSolicitud[s.id] ?? ''}
                      onChange={(e) => setMotivoPorSolicitud((prev) => ({ ...prev, [s.id]: e.target.value }))}
                      placeholder="Motivo de rechazo"
                      className="rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-2 py-1.5 text-xs w-48 focus:outline-none focus:ring-2 focus:ring-brand-300"
                    />
                    <button
                      onClick={() => rechazarSolicitud(s)}
                      disabled={procesandoSolicitud === s.id}
                      className="inline-flex items-center gap-1.5 rounded-full bg-red-50 dark:bg-red-900/30 px-3 py-1.5 text-xs font-semibold text-red-700 dark:text-red-400 hover:bg-red-100 disabled:opacity-50"
                    >
                      <X size={12} /> Rechazar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {empresaParaAsignar && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 px-4" onClick={() => setEmpresaParaAsignar(null)}>
          <div
            className="w-full max-w-sm rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-5 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">Editar suscripción</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">{empresaParaAsignar.razon_social}</p>

            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Plan</label>
            <select
              value={planSeleccionado}
              onChange={(e) => seleccionarPlan(e.target.value)}
              className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-brand-300"
            >
              <option value="">Selecciona un plan...</option>
              {planes.map((p) => (
                <option key={p.id} value={p.id}>{p.nombre} — Bs {p.precio_mensual} / {p.duracion_dias} días</option>
              ))}
            </select>

            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              Fecha de vencimiento <span className="text-gray-400 dark:text-gray-500 font-normal">— se calcula sola al elegir el plan, pero puedes ajustarla</span>
            </label>
            <input
              type="date"
              value={fechaVencimiento}
              onChange={(e) => setFechaVencimiento(e.target.value)}
              className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-brand-300"
            />

            {errorAsignar && <p className="text-xs text-red-600 dark:text-red-400 mb-3">{errorAsignar}</p>}

            <div className="flex gap-2">
              <button
                onClick={() => setEmpresaParaAsignar(null)}
                className="flex-1 rounded-md border border-gray-300 dark:border-gray-700 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarAsignarPlan}
                disabled={asignando}
                className="flex-1 rounded-md bg-brand-600 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
              >
                {asignando ? 'Asignando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {empresaEditando && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 px-4" onClick={() => setEmpresaEditando(null)}>
          <form
            onSubmit={guardarEdicion}
            className="w-full max-w-sm rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-5 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">Editar empresa</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Como SuperAdmin puedes editar cualquier dato de esta empresa.</p>

            <div className="space-y-3">
              <input
                required
                value={datosEdicion.razon_social}
                onChange={(e) => setDatosEdicion((prev) => ({ ...prev, razon_social: e.target.value }))}
                placeholder="Razón social"
                className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
              />
              <input
                required
                value={datosEdicion.nit}
                onChange={(e) => setDatosEdicion((prev) => ({ ...prev, nit: e.target.value }))}
                placeholder="NIT"
                className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
              />
              <input
                required
                value={datosEdicion.slug}
                onChange={(e) => setDatosEdicion((prev) => ({ ...prev, slug: e.target.value }))}
                placeholder="slug-de-la-empresa"
                className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  value={datosEdicion.ciudad}
                  onChange={(e) => setDatosEdicion((prev) => ({ ...prev, ciudad: e.target.value }))}
                  placeholder="Ciudad"
                  className="rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
                />
                <input
                  value={datosEdicion.departamento}
                  onChange={(e) => setDatosEdicion((prev) => ({ ...prev, departamento: e.target.value }))}
                  placeholder="Departamento"
                  className="rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
                />
              </div>
              <select
                value={datosEdicion.estado}
                onChange={(e) => setDatosEdicion((prev) => ({ ...prev, estado: e.target.value }))}
                className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
              >
                {ESTADOS.filter((op) => op.value).map((op) => <option key={op.value} value={op.value}>{op.label}</option>)}
              </select>
            </div>

            {errorEdicion && <p className="text-xs text-red-600 dark:text-red-400 mt-3">{errorEdicion}</p>}

            <div className="flex gap-2 mt-4">
              <button
                type="button"
                onClick={() => setEmpresaEditando(null)}
                className="flex-1 rounded-md border border-gray-300 dark:border-gray-700 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={guardandoEdicion}
                className="flex-1 rounded-md bg-brand-600 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
              >
                {guardandoEdicion ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </form>
        </div>
      )}

      {creandoEmpresa && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 px-4" onClick={() => setCreandoEmpresa(false)}>
          <form
            onSubmit={guardarNuevaEmpresa}
            className="w-full max-w-sm rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-5 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">Nueva empresa</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
              Crea una cuenta de empresa directamente, sin pasar por una solicitud — se le enviarán
              las credenciales al correo indicado.
            </p>

            <div className="space-y-3">
              <input
                required
                value={datosNuevaEmpresa.razon_social}
                onChange={(e) => setDatosNuevaEmpresa((prev) => ({ ...prev, razon_social: e.target.value }))}
                placeholder="Razón social"
                className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
              />
              <input
                required
                value={datosNuevaEmpresa.nit}
                onChange={(e) => setDatosNuevaEmpresa((prev) => ({ ...prev, nit: e.target.value }))}
                placeholder="NIT"
                className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
              />
              <input
                required
                type="email"
                value={datosNuevaEmpresa.correo_empresa}
                onChange={(e) => setDatosNuevaEmpresa((prev) => ({ ...prev, correo_empresa: e.target.value }))}
                placeholder="Correo de la cuenta de empresa"
                className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
              />
              <select
                required
                value={datosNuevaEmpresa.plan_id}
                onChange={(e) => setDatosNuevaEmpresa((prev) => ({ ...prev, plan_id: e.target.value }))}
                className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
              >
                <option value="">Selecciona un plan...</option>
                {planes.map((p) => (
                  <option key={p.id} value={p.id}>{p.nombre} — Bs {p.precio_mensual} / {p.duracion_dias} días</option>
                ))}
              </select>
            </div>

            {errorNuevaEmpresa && <p className="text-xs text-red-600 dark:text-red-400 mt-3">{errorNuevaEmpresa}</p>}

            <div className="flex gap-2 mt-4">
              <button
                type="button"
                onClick={() => setCreandoEmpresa(false)}
                className="flex-1 rounded-md border border-gray-300 dark:border-gray-700 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={guardandoNuevaEmpresa}
                className="flex-1 rounded-md bg-brand-600 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
              >
                {guardandoNuevaEmpresa ? 'Creando...' : 'Crear empresa'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
