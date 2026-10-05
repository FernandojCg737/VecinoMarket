import { useEffect, useState, useMemo } from 'react';
import { Navigate } from 'react-router-dom';
import {
  CreditCard,
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  Building2,
  Calendar,
  Clock,
  Sparkles,
  Video,
  Search,
  RefreshCw,
  AlertCircle,
  ShieldCheck,
  ShieldAlert,
  Layers,
  ChevronRight,
  TrendingUp,
  Package,
  Percent,
} from 'lucide-react';
import API from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { esSuperAdmin } from '../../utils/roles';

const VACIO_PLAN = {
  nombre: '',
  precio_mensual: '',
  duracion_dias: 30,
  limite_productos: '',
  porcentaje_comision: '',
  incluye_live_commerce: false,
  incluye_ia: false,
  estado: 'ACTIVO',
};

export default function PlanesAdmin() {
  const { usuario, cargando: cargandoAuth } = useAuth();

  // Tab activo: 'suscripciones' o 'planes'
  const [tabActivo, setTabActivo] = useState('suscripciones');

  // Datos de planes y empresas
  const [planes, setPlanes] = useState([]);
  const [empresas, setEmpresas] = useState([]);
  const [cargandoPlanes, setCargandoPlanes] = useState(true);
  const [cargandoEmpresas, setCargandoEmpresas] = useState(true);
  const [error, setError] = useState('');
  const [mensajeExito, setMensajeExito] = useState('');

  // Filtros de la tabla de empresas
  const [busqueda, setBusqueda] = useState('');
  const [filtroPlan, setFiltroPlan] = useState('TODOS');
  const [filtroEstadoSusc, setFiltroEstadoSusc] = useState('TODOS');
  const [filtroPrivilegio, setFiltroPrivilegio] = useState('TODOS');

  // Modal para Crear / Editar Plan
  const [mostrarFormPlan, setMostrarFormPlan] = useState(false);
  const [editandoPlan, setEditandoPlan] = useState(null);
  const [formPlan, setFormPlan] = useState(VACIO_PLAN);
  const [guardandoPlan, setGuardandoPlan] = useState(false);
  const [errorFormPlan, setErrorFormPlan] = useState('');

  // Modal para Asignar / Renovar Suscripción de Empresa
  const [empresaModal, setEmpresaModal] = useState(null);
  const [planSeleccionadoId, setPlanSeleccionadoId] = useState('');
  const [fechaVencimientoModal, setFechaVencimientoModal] = useState('');
  const [guardandoSuscripcion, setGuardandoSuscripcion] = useState(false);
  const [errorModalSuscripcion, setErrorModalSuscripcion] = useState('');

  // Cargar Catálogo de Planes
  function cargarPlanes() {
    setCargandoPlanes(true);
    return API.get('suscripciones/admin/planes/')
      .then((res) => {
        setPlanes(res.data || []);
      })
      .catch(() => setError('No se pudo cargar el catálogo de planes.'))
      .finally(() => setCargandoPlanes(false));
  }

  // Cargar Empresas y sus suscripciones
  function cargarEmpresas() {
    setCargandoEmpresas(true);
    return API.get('usuarios/empresas/lista/?page_size=100')
      .then((res) => {
        const lista = Array.isArray(res.data) ? res.data : (res.data?.results || []);
        setEmpresas(lista);
      })
      .catch(() => setError('No se pudo cargar el listado de empresas.'))
      .finally(() => setCargandoEmpresas(false));
  }

  useEffect(() => {
    if (!usuario || !esSuperAdmin(usuario)) return;
    cargarPlanes();
    cargarEmpresas();

    function onFocus() {
      cargarPlanes();
      cargarEmpresas();
    }
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuario]);

  // Redirecciones de autorización
  if (cargandoAuth) return null;
  if (!usuario) return <Navigate to="/login?next=/admin/planes" replace />;
  if (!esSuperAdmin(usuario)) return <Navigate to="/" replace />;

  // CRUD PLANES
  function abrirNuevoPlan() {
    setEditandoPlan(null);
    setFormPlan(VACIO_PLAN);
    setErrorFormPlan('');
    setMostrarFormPlan(true);
  }

  function abrirEdicionPlan(p) {
    setEditandoPlan(p);
    setFormPlan({
      nombre: p.nombre,
      precio_mensual: p.precio_mensual,
      duracion_dias: p.duracion_dias ?? 30,
      limite_productos: p.limite_productos ?? '',
      porcentaje_comision: p.porcentaje_comision,
      incluye_live_commerce: Boolean(p.incluye_live_commerce),
      incluye_ia: Boolean(p.incluye_ia),
      estado: p.estado,
    });
    setErrorFormPlan('');
    setMostrarFormPlan(true);
  }

  async function guardarPlan(e) {
    e.preventDefault();
    setGuardandoPlan(true);
    setErrorFormPlan('');
    const payload = {
      ...formPlan,
      limite_productos: formPlan.limite_productos === '' ? null : Number(formPlan.limite_productos),
      duracion_dias: Number(formPlan.duracion_dias) || 30,
    };
    try {
      if (editandoPlan) {
        await API.patch(`suscripciones/admin/planes/${editandoPlan.id}/`, payload);
        lanzarExito('Plan actualizado correctamente.');
      } else {
        await API.post('suscripciones/admin/planes/', payload);
        lanzarExito('Plan creado correctamente.');
      }
      setMostrarFormPlan(false);
      await cargarPlanes();
    } catch (err) {
      setErrorFormPlan(
        err?.response?.data?.nombre?.[0] ||
        err?.response?.data?.precio_mensual?.[0] ||
        err?.response?.data?.detail ||
        'No se pudo guardar el plan.'
      );
    } finally {
      setGuardandoPlan(false);
    }
  }

  async function eliminarPlan(p) {
    if (!window.confirm(`¿Seguro que deseas eliminar el plan "${p.nombre}"?`)) return;
    try {
      await API.delete(`suscripciones/admin/planes/${p.id}/`);
      lanzarExito(`Plan "${p.nombre}" eliminado.`);
      await cargarPlanes();
    } catch (err) {
      setError(err?.response?.data?.detail || 'No se pudo eliminar el plan.');
    }
  }

  // ACCIONES DE SUSCRIPCIÓN PARA EMPRESAS
  function abrirModalSuscripcion(emp) {
    setEmpresaModal(emp);
    setErrorModalSuscripcion('');
    // Seleccionar plan activo correspondiente
    const planActivo = planes.find((p) => p.id === emp.plan) || planes.find((p) => p.estado === 'ACTIVO');
    const planIdDefault = planActivo ? planActivo.id : (emp.plan || '');
    setPlanSeleccionadoId(planIdDefault);

    // Calcular fecha de vencimiento sugerida según la duración oficial del plan (ej. 30 días para Básico)
    const duracion = planActivo?.duracion_dias || 30;
    const base = new Date();
    base.setDate(base.getDate() + duracion);
    setFechaVencimientoModal(base.toISOString().split('T')[0]);
  }

  function cambiarPlanModal(nuevoPlanId) {
    setPlanSeleccionadoId(nuevoPlanId);
    const planObj = planes.find((p) => String(p.id) === String(nuevoPlanId));
    const duracion = planObj?.duracion_dias || 30;
    const base = new Date();
    base.setDate(base.getDate() + duracion);
    setFechaVencimientoModal(base.toISOString().split('T')[0]);
  }

  function sumarDiasAFecha(dias) {
    const base = new Date();
    base.setDate(base.getDate() + dias);
    setFechaVencimientoModal(base.toISOString().split('T')[0]);
  }

  async function guardarSuscripcionEmpresa(e) {
    e.preventDefault();
    if (!empresaModal || !planSeleccionadoId || !fechaVencimientoModal) {
      setErrorModalSuscripcion('Por favor completa todos los campos requeridos.');
      return;
    }
    setGuardandoSuscripcion(true);
    setErrorModalSuscripcion('');

    try {
      await API.post(`suscripciones/empresas/${empresaModal.id}/suscripcion/`, {
        plan_id: planSeleccionadoId,
        fecha_vencimiento: fechaVencimientoModal,
      });
      lanzarExito(`Suscripción de "${empresaModal.razon_social}" actualizada con éxito.`);
      setEmpresaModal(null);
      await cargarEmpresas();
    } catch (err) {
      setErrorModalSuscripcion(
        err?.response?.data?.detail ||
        err?.response?.data?.fecha_vencimiento?.[0] ||
        'Error al actualizar la suscripción.'
      );
    } finally {
      setGuardandoSuscripcion(false);
    }
  }

  async function alternarEstadoEmpresa(emp) {
    const nuevoEstado = emp.estado === 'ACTIVA' ? 'SUSPENDIDA' : 'ACTIVA';
    const accion = nuevoEstado === 'ACTIVA' ? 'reactivar' : 'suspender';
    if (!window.confirm(`¿Estás seguro de que deseas ${accion} la empresa "${emp.razon_social}"?`)) return;

    try {
      await API.patch(`usuarios/empresas/${emp.id}/editar/`, { estado: nuevoEstado });
      lanzarExito(`Empresa "${emp.razon_social}" ${nuevoEstado.toLowerCase()} exitosamente.`);
      await cargarEmpresas();
    } catch (err) {
      setError(err?.response?.data?.detail || `No se pudo ${accion} la empresa.`);
    }
  }

  function lanzarExito(msg) {
    setMensajeExito(msg);
    setTimeout(() => setMensajeExito(''), 4500);
  }

  // Filtrado reactivo de empresas (ordenando suscripciones y altas más recientes primero)
  const empresasFiltradas = useMemo(() => {
    const filtradas = empresas.filter((emp) => {
      // Búsqueda de texto
      if (busqueda.trim()) {
        const q = busqueda.toLowerCase();
        const coincideNombre = emp.razon_social?.toLowerCase().includes(q);
        const coincideNit = emp.nit?.toLowerCase().includes(q);
        const coincideEmail = emp.dueno_email?.toLowerCase().includes(q);
        const coincideDueno = emp.dueno_nombre?.toLowerCase().includes(q);
        const coincideCiudad = emp.ciudad?.toLowerCase().includes(q);
        if (!coincideNombre && !coincideNit && !coincideEmail && !coincideDueno && !coincideCiudad) {
          return false;
        }
      }

      // Filtro por Plan
      if (filtroPlan !== 'TODOS') {
        if (filtroPlan === 'SIN_PLAN' && emp.plan) return false;
        if (filtroPlan !== 'SIN_PLAN' && String(emp.plan) !== String(filtroPlan)) return false;
      }

      // Filtro por Estado Suscripción
      if (filtroEstadoSusc !== 'TODOS') {
        if (emp.estado_suscripcion !== filtroEstadoSusc) return false;
      }

      // Filtro por Privilegio
      if (filtroPrivilegio === 'IA' && !emp.plan_info?.incluye_ia) return false;
      if (filtroPrivilegio === 'LIVE' && !emp.plan_info?.incluye_live_commerce) return false;

      return true;
    });

    return filtradas.sort((a, b) => {
      const fechaA = new Date(a.fecha_inicio || a.actualizado_en || a.creado_en || 0).getTime();
      const fechaB = new Date(b.fecha_inicio || b.actualizado_en || b.creado_en || 0).getTime();
      return fechaB - fechaA;
    });
  }, [empresas, busqueda, filtroPlan, filtroEstadoSusc, filtroPrivilegio]);

  // Resumen métricas
  const totalEmpresas = empresas.length;
  const suscripcionesActivas = empresas.filter((e) => e.estado_suscripcion === 'ACTIVA').length;
  const empresasConIA = empresas.filter((e) => e.plan_info?.incluye_ia).length;
  const empresasConLive = empresas.filter((e) => e.plan_info?.incluye_live_commerce).length;

  // Plan actualmente seleccionado en el modal
  const planModalDetalle = planes.find((p) => String(p.id) === String(planSeleccionadoId));

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      {/* ENCABEZADO */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 border border-brand-200 dark:border-brand-800">
              <CreditCard size={26} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                Planes y Suscripciones (CU20)
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Control de planes de catálogo, suscripciones vigentes de empresas y privilegios de IA y Live Commerce.
              </p>
            </div>
          </div>
        </div>

        {/* Acciones del encabezado */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              cargarPlanes();
              cargarEmpresas();
            }}
            disabled={cargandoEmpresas || cargandoPlanes}
            className="flex items-center gap-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 px-3.5 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 shadow-sm transition disabled:opacity-50"
            title="Recargar listado de empresas y suscripciones"
          >
            <RefreshCw size={15} className={cargandoEmpresas || cargandoPlanes ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">Refrescar</span>
          </button>

          <button
            onClick={abrirNuevoPlan}
            className="flex items-center gap-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition"
          >
            <Plus size={16} /> Nuevo Plan de Catálogo
          </button>
        </div>
      </div>

      {/* MENSAJES DE ESTADO */}
      {mensajeExito && (
        <div className="mb-4 flex items-center gap-2 rounded-xl bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-800 p-3 text-sm text-green-800 dark:text-green-300">
          <Check size={18} className="text-green-600" />
          <span>{mensajeExito}</span>
        </div>
      )}
      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 p-3 text-sm text-red-800 dark:text-red-300">
          <AlertCircle size={18} className="text-red-600" />
          <span>{error}</span>
          <button onClick={() => setError('')} className="ml-auto text-xs underline">Cerrar</button>
        </div>
      )}

      {/* TARJETAS DE MÉTRICAS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 shadow-xs">
          <div className="flex items-center justify-between text-gray-500 dark:text-gray-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Empresas</span>
            <Building2 size={18} className="text-brand-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-2">{totalEmpresas}</p>
          <span className="text-xs text-gray-400">Registradas en plataforma</span>
        </div>

        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 shadow-xs">
          <div className="flex items-center justify-between text-gray-500 dark:text-gray-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Suscripciones Activas</span>
            <ShieldCheck size={18} className="text-green-600" />
          </div>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-2">{suscripcionesActivas}</p>
          <span className="text-xs text-gray-400">Vigentes y al día</span>
        </div>

        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 shadow-xs">
          <div className="flex items-center justify-between text-gray-500 dark:text-gray-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Privilegios IA</span>
            <Sparkles size={18} className="text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-2">{empresasConIA}</p>
          <span className="text-xs text-gray-400">Empresas con IA habilitada</span>
        </div>

        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 shadow-xs">
          <div className="flex items-center justify-between text-gray-500 dark:text-gray-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Live Commerce</span>
            <Video size={18} className="text-purple-500" />
          </div>
          <p className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-2">{empresasConLive}</p>
          <span className="text-xs text-gray-400">Empresas con streaming</span>
        </div>
      </div>

      {/* PESTAÑAS (TABS) */}
      <div className="flex border-b border-gray-200 dark:border-gray-800 mb-6 gap-2">
        <button
          onClick={() => setTabActivo('suscripciones')}
          className={`flex items-center gap-2 pb-3 px-4 text-sm font-semibold border-b-2 transition ${
            tabActivo === 'suscripciones'
              ? 'border-brand-600 text-brand-600 dark:text-brand-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
          }`}
        >
          <Building2 size={17} />
          Suscripciones por Empresa
          <span className="ml-1 rounded-full bg-brand-100 dark:bg-brand-900/50 text-brand-700 dark:text-brand-300 text-xs px-2 py-0.5">
            {empresas.length}
          </span>
        </button>

        <button
          onClick={() => setTabActivo('planes')}
          className={`flex items-center gap-2 pb-3 px-4 text-sm font-semibold border-b-2 transition ${
            tabActivo === 'planes'
              ? 'border-brand-600 text-brand-600 dark:text-brand-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
          }`}
        >
          <CreditCard size={17} />
          Catálogo de Planes
          <span className="ml-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-xs px-2 py-0.5">
            {planes.length}
          </span>
        </button>
      </div>

      {/* TAB 1: SUSCRIPCIONES POR EMPRESA */}
      {tabActivo === 'suscripciones' && (
        <div className="space-y-4">
          {/* BARRA DE BÚSQUEDA Y FILTROS */}
          <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between rounded-xl bg-white dark:bg-gray-900 p-3 border border-gray-200 dark:border-gray-800">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por empresa, NIT, dueño, correo o ciudad..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div className="flex flex-wrap gap-2 items-center">
              {/* Filtro Plan */}
              <select
                value={filtroPlan}
                onChange={(e) => setFiltroPlan(e.target.value)}
                className="text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 py-1.5 px-2.5 focus:outline-none"
              >
                <option value="TODOS">Todos los planes</option>
                {planes.map((p) => (
                  <option key={p.id} value={p.id}>{p.nombre}</option>
                ))}
                <option value="SIN_PLAN">Sin plan asignado</option>
              </select>

              {/* Filtro Estado Suscripción */}
              <select
                value={filtroEstadoSusc}
                onChange={(e) => setFiltroEstadoSusc(e.target.value)}
                className="text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 py-1.5 px-2.5 focus:outline-none"
              >
                <option value="TODOS">Todos los estados</option>
                <option value="ACTIVA">Suscripción Activa</option>
                <option value="EXPIRADA">Expirada / Vencida</option>
                <option value="SOLICITANDO_SUSCRIPCION">Solicitando Suscripción</option>
              </select>

              {/* Filtro Privilegios */}
              <select
                value={filtroPrivilegio}
                onChange={(e) => setFiltroPrivilegio(e.target.value)}
                className="text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 py-1.5 px-2.5 focus:outline-none"
              >
                <option value="TODOS">Todos los privilegios</option>
                <option value="IA">Con Funciones de IA</option>
                <option value="LIVE">Con Live Commerce</option>
              </select>

              <button
                onClick={() => { cargarEmpresas(); cargarPlanes(); }}
                title="Recargar datos"
                className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 hover:text-brand-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                <RefreshCw size={15} />
              </button>
            </div>
          </div>

          {/* TABLA PRINCIPAL DE EMPRESAS Y SUSCRIPCIONES */}
          <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden shadow-xs">
            {cargandoEmpresas ? (
              <div className="p-8 text-center text-sm text-gray-400">
                <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-brand-500" />
                Cargando empresas y estado de suscripciones...
              </div>
            ) : empresasFiltradas.length === 0 ? (
              <div className="p-8 text-center text-sm text-gray-400">
                No se encontraron empresas con los filtros especificados.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead className="bg-gray-50/80 dark:bg-gray-800/60 text-xs font-semibold text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-800">
                    <tr>
                      <th className="py-3 px-4">Empresa</th>
                      <th className="py-3 px-4">Plan Actual & Privilegios</th>
                      <th className="py-3 px-4">Adquisición / Vencimiento</th>
                      <th className="py-3 px-4">Tiempo Restante</th>
                      <th className="py-3 px-4">Estado</th>
                      <th className="py-3 px-4 text-right">Acciones (CRUD)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-gray-700 dark:text-gray-200">
                    {empresasFiltradas.map((emp) => {
                      const tieneIA = emp.plan_info?.incluye_ia;
                      const tieneLive = emp.plan_info?.incluye_live_commerce;
                      const tiempo = emp.tiempo_restante;

                      // Fechas formateadas
                      const fInicio = emp.fecha_inicio ? new Date(emp.fecha_inicio).toLocaleDateString() : '—';
                      const fVenc = emp.fecha_vencimiento ? new Date(emp.fecha_vencimiento).toLocaleDateString() : '—';

                      return (
                        <tr key={emp.id} className="hover:bg-gray-50/60 dark:hover:bg-gray-800/40 transition">
                          {/* EMPRESA */}
                          <td className="py-3 px-4">
                            <div>
                              <div className="font-semibold text-gray-900 dark:text-gray-100">
                                {emp.razon_social}
                              </div>
                              <div className="text-xs text-gray-400 flex items-center gap-1.5 mt-0.5">
                                <span>NIT: {emp.nit || 'S/N'}</span>
                                <span>•</span>
                                <span>{emp.ciudad || 'Bolivia'}</span>
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate max-w-[200px]" title={emp.dueno_email}>
                                {emp.dueno_nombre ? `${emp.dueno_nombre} (${emp.dueno_email})` : emp.dueno_email}
                              </div>
                            </div>
                          </td>

                          {/* PLAN & PRIVILEGIOS */}
                          <td className="py-3 px-4">
                            <div>
                              {emp.plan_nombre ? (
                                <div className="inline-flex items-center gap-1.5 font-medium text-gray-900 dark:text-gray-100">
                                  <CreditCard size={14} className="text-brand-500" />
                                  <span>{emp.plan_nombre}</span>
                                  {emp.plan_info?.precio_mensual && (
                                    <span className="text-xs text-gray-500 dark:text-gray-400 font-normal">
                                      (Bs {emp.plan_info.precio_mensual} • {emp.plan_info.duracion_dias || 30} días)
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="inline-block text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                                  Sin plan asignado
                                </span>
                              )}

                              {/* BADGES DE PRIVILEGIOS */}
                              <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                                {/* Privilegio IA */}
                                <span
                                  className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full ${
                                    tieneIA
                                      ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                                      : 'bg-gray-100 dark:bg-gray-800/80 text-gray-400'
                                  }`}
                                  title={tieneIA ? 'Incluye asistente y funciones de Inteligencia Artificial' : 'Sin funciones de IA'}
                                >
                                  <Sparkles size={11} className={tieneIA ? 'text-amber-600 dark:text-amber-400' : 'text-gray-400'} />
                                  {tieneIA ? 'IA Activa' : 'Sin IA'}
                                </span>

                                {/* Privilegio Live Commerce */}
                                <span
                                  className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full ${
                                    tieneLive
                                      ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                                      : 'bg-gray-100 dark:bg-gray-800/80 text-gray-400'
                                  }`}
                                  title={tieneLive ? 'Incluye transmisión de Live Commerce en vivo' : 'Sin Live Commerce'}
                                >
                                  <Video size={11} className={tieneLive ? 'text-purple-600 dark:text-purple-400' : 'text-gray-400'} />
                                  {tieneLive ? 'Live Commerce' : 'Sin Live'}
                                </span>

                                {/* Límite de productos */}
                                {emp.plan_info && (
                                  <span className="text-[11px] text-gray-500 dark:text-gray-400">
                                    📦 {emp.plan_info.limite_productos ? `Hasta ${emp.plan_info.limite_productos}` : 'Ilimitados'}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* FECHAS */}
                          <td className="py-3 px-4 text-xs">
                            <div className="space-y-0.5">
                              <p className="text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                <span className="font-medium text-gray-700 dark:text-gray-300">Alta:</span> {fInicio}
                              </p>
                              <p className="text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                <span className="font-medium text-gray-700 dark:text-gray-300">Vence:</span> {fVenc}
                              </p>
                              {emp.fecha_inicio && emp.fecha_vencimiento && (
                                <p className="text-[11px] font-semibold text-brand-600 dark:text-brand-400">
                                  Ciclo: {Math.max(1, Math.round((new Date(emp.fecha_vencimiento) - new Date(emp.fecha_inicio)) / (1000 * 60 * 60 * 24)))} días
                                </p>
                              )}
                            </div>
                          </td>

                          {/* TIEMPO RESTANTE */}
                          <td className="py-3 px-4">
                            {tiempo ? (
                              <div>
                                <span
                                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                                    tiempo.expirado
                                      ? 'bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800'
                                      : tiempo.dias <= 15
                                      ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                                      : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                  }`}
                                >
                                  <Clock size={12} />
                                  {tiempo.texto}
                                </span>
                              </div>
                            ) : (
                              <span className="text-xs text-gray-400 italic">No disponible</span>
                            )}
                          </td>

                          {/* ESTADO */}
                          <td className="py-3 px-4">
                            <div className="space-y-1">
                              <div>
                                <span
                                  className={`inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                                    emp.estado === 'ACTIVA'
                                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                      : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                  }`}
                                >
                                  Empresa: {emp.estado}
                                </span>
                              </div>
                              <div>
                                <span
                                  className={`inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                                    emp.estado_suscripcion === 'ACTIVA'
                                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                      : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                                  }`}
                                >
                                  Suscripción: {emp.estado_suscripcion}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* ACCIONES CRUD */}
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Asignar / Renovar Plan */}
                              <button
                                onClick={() => abrirModalSuscripcion(emp)}
                                title="Cambiar plan o renovar fecha de vencimiento"
                                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white shadow-xs transition cursor-pointer"
                              >
                                <RefreshCw size={13} className="text-white" />
                                <span>Plan/Renovar</span>
                              </button>

                              {/* Suspender / Reactivar */}
                              <button
                                onClick={() => alternarEstadoEmpresa(emp)}
                                title={emp.estado === 'ACTIVA' ? 'Suspender empresa' : 'Reactivar empresa'}
                                className={`p-1.5 rounded-lg text-xs font-semibold transition ${
                                  emp.estado === 'ACTIVA'
                                    ? 'bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-950/50 dark:hover:bg-red-900 dark:text-red-400'
                                    : 'bg-green-50 hover:bg-green-100 text-green-600 dark:bg-green-950/50 dark:hover:bg-green-900 dark:text-green-400'
                                }`}
                              >
                                {emp.estado === 'ACTIVA' ? <ShieldAlert size={15} /> : <ShieldCheck size={15} />}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: CATÁLOGO DE PLANES */}
      {tabActivo === 'planes' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Catálogo de Planes Oficiales</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Define tarifas, comisiones y privilegios (IA y Live Commerce) ofrecidos a las empresas registradas.
              </p>
            </div>
            <button
              onClick={abrirNuevoPlan}
              className="flex items-center gap-1.5 rounded-md bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700"
            >
              <Plus size={15} /> Nuevo plan
            </button>
          </div>

          {cargandoPlanes ? (
            <p className="text-sm text-gray-400">Cargando catálogo...</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {planes.map((p) => (
                <div
                  key={p.id}
                  className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-xs flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gray-900 dark:text-gray-100 text-lg">{p.nombre}</span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                              p.estado === 'ACTIVO'
                                ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                            }`}
                          >
                            {p.estado}
                          </span>
                        </div>
                        <p className="text-2xl font-black text-gray-900 dark:text-gray-100 mt-1">
                          Bs {p.precio_mensual}
                          <span className="text-xs font-normal text-gray-400"> / {p.duracion_dias || 30} días</span>
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => abrirEdicionPlan(p)}
                          title="Editar plan"
                          className="grid h-8 w-8 place-items-center rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 hover:bg-blue-100"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => eliminarPlan(p)}
                          title="Eliminar plan"
                          className="grid h-8 w-8 place-items-center rounded-lg bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 hover:bg-red-100"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    {/* DETALLE Y PRIVILEGIOS */}
                    <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800 space-y-2 text-xs text-gray-600 dark:text-gray-300">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">Límite de productos:</span>
                        <span className="font-semibold text-gray-800 dark:text-gray-200">
                          {p.limite_productos ? `${p.limite_productos} productos` : 'Ilimitado'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">Comisión por venta:</span>
                        <span className="font-semibold text-gray-800 dark:text-gray-200">{p.porcentaje_comision}%</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">Live Commerce:</span>
                        <span className="flex items-center gap-1 font-semibold">
                          {p.incluye_live_commerce ? (
                            <span className="text-purple-600 dark:text-purple-400 flex items-center gap-1">
                              <Check size={13} /> Incluido
                            </span>
                          ) : (
                            <span className="text-gray-400 flex items-center gap-1">
                              <X size={13} /> No disponible
                            </span>
                          )}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">Funciones de IA:</span>
                        <span className="flex items-center gap-1 font-semibold">
                          {p.incluye_ia ? (
                            <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1">
                              <Sparkles size={13} /> Incluido
                            </span>
                          ) : (
                            <span className="text-gray-400 flex items-center gap-1">
                              <X size={13} /> No disponible
                            </span>
                          )}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800 text-[11px] text-gray-400 text-center">
                    Empresas con este plan:{' '}
                    <strong className="text-gray-700 dark:text-gray-300">
                      {empresas.filter((e) => String(e.plan) === String(p.id)).length}
                    </strong>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: ASIGNAR / RENOVAR PLAN DE EMPRESA (CRUD ACCIÓN) */}
      {empresaModal && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/50 px-4 py-8 overflow-y-auto backdrop-blur-xs"
          onClick={() => setEmpresaModal(null)}
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                  Gestionar Suscripción de Empresa
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Asigna un nuevo plan o renueva el plazo para <span className="font-semibold text-gray-800 dark:text-gray-200">{empresaModal.razon_social}</span>.
                </p>
              </div>
              <button
                onClick={() => setEmpresaModal(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1"
              >
                <X size={18} />
              </button>
            </div>

            {errorModalSuscripcion && (
              <div className="p-3 text-xs text-red-600 dark:text-red-400 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800">
                {errorModalSuscripcion}
              </div>
            )}

            <form onSubmit={guardarSuscripcionEmpresa} className="space-y-4">
              {/* SELECTOR DE PLAN */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Selecciona el Plan
                </label>
                <select
                  required
                  value={planSeleccionadoId}
                  onChange={(e) => cambiarPlanModal(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="" disabled>Selecciona un plan...</option>
                  {planes.filter((p) => p.estado === 'ACTIVO').map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre} — Bs {p.precio_mensual} ({p.duracion_dias || 30} días)
                    </option>
                  ))}
                </select>
              </div>

              {/* PREVIEW DE PRIVILEGIOS DEL PLAN SELECCIONADO */}
              {planModalDetalle && (
                <div className="rounded-xl bg-gray-50 dark:bg-gray-800/60 p-3.5 border border-gray-200 dark:border-gray-700/60 text-xs space-y-2">
                  <div className="flex items-center justify-between font-semibold text-gray-900 dark:text-gray-100">
                    <span>Privilegios del plan seleccionado:</span>
                    <span className="text-brand-600 dark:text-brand-400 font-bold">
                      Bs {planModalDetalle.precio_mensual} • {planModalDetalle.duracion_dias || 30} días
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-gray-600 dark:text-gray-300">
                    <div className="flex items-center gap-1.5">
                      <Sparkles size={13} className={planModalDetalle.incluye_ia ? 'text-amber-500' : 'text-gray-400'} />
                      <span>IA: <strong>{planModalDetalle.incluye_ia ? 'Habilitada' : 'Deshabilitada'}</strong></span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Video size={13} className={planModalDetalle.incluye_live_commerce ? 'text-purple-500' : 'text-gray-400'} />
                      <span>Live: <strong>{planModalDetalle.incluye_live_commerce ? 'Habilitado' : 'Deshabilitado'}</strong></span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Package size={13} className="text-blue-500" />
                      <span>Límite: <strong>{planModalDetalle.limite_productos || 'Ilimitado'}</strong></span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Percent size={13} className="text-green-500" />
                      <span>Comisión: <strong>{planModalDetalle.porcentaje_comision}%</strong></span>
                    </div>
                  </div>
                </div>
              )}

              {/* FECHA DE VENCIMIENTO */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                    Nueva Fecha de Vencimiento
                  </label>
                  {planModalDetalle && (
                    <span className="text-[11px] text-brand-600 dark:text-brand-400 font-medium">
                      Duración oficial: {planModalDetalle.duracion_dias || 30} días
                    </span>
                  )}
                </div>
                <input
                  required
                  type="date"
                  value={fechaVencimientoModal}
                  onChange={(e) => setFechaVencimientoModal(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />

                {/* BOTONES RÁPIDOS PARA EXTENDER TIEMPO */}
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <span className="text-[11px] text-gray-400">Extender desde hoy:</span>
                  <button
                    type="button"
                    onClick={() => sumarDiasAFecha(planModalDetalle?.duracion_dias || 30)}
                    className="px-2.5 py-0.5 text-xs rounded-md bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/40 dark:hover:bg-blue-900/70 text-blue-700 dark:text-blue-200 font-semibold border border-blue-200 dark:border-blue-700 transition cursor-pointer"
                    title={`Establecer fecha según la duración oficial del plan (${planModalDetalle?.duracion_dias || 30} días)`}
                  >
                    Por plan ({planModalDetalle?.duracion_dias || 30}d)
                  </button>
                  <button
                    type="button"
                    onClick={() => sumarDiasAFecha(30)}
                    className="px-2 py-0.5 text-xs rounded-md bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium"
                  >
                    +30 días
                  </button>
                  <button
                    type="button"
                    onClick={() => sumarDiasAFecha(90)}
                    className="px-2 py-0.5 text-xs rounded-md bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium"
                  >
                    +3 meses
                  </button>
                  <button
                    type="button"
                    onClick={() => sumarDiasAFecha(365)}
                    className="px-2 py-0.5 text-xs rounded-md bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium"
                  >
                    +1 año
                  </button>
                </div>
              </div>

              {/* BOTONES DE ACCIÓN */}
              <div className="flex gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => setEmpresaModal(null)}
                  className="flex-1 rounded-lg border border-gray-300 dark:border-gray-700 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardandoSuscripcion}
                  className="flex-1 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60 shadow-sm"
                >
                  {guardandoSuscripcion ? 'Guardando...' : 'Aplicar Suscripción'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: CREAR / EDITAR PLAN DE CATÁLOGO */}
      {mostrarFormPlan && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/50 px-4 overflow-y-auto py-8 backdrop-blur-xs"
          onClick={() => setMostrarFormPlan(false)}
        >
          <form
            onSubmit={guardarPlan}
            className="w-full max-w-md rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-bold text-lg text-gray-900 dark:text-gray-100 mb-4">
              {editandoPlan ? 'Editar Plan de Catálogo' : 'Nuevo Plan de Catálogo'}
            </h2>

            <div className="space-y-3 text-sm">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Nombre</label>
                <input
                  required
                  value={formPlan.nombre}
                  onChange={(e) => setFormPlan((prev) => ({ ...prev, nombre: e.target.value }))}
                  placeholder="Ej: Plan Emprendedor Plus"
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Precio (Bs)</label>
                  <input
                    required
                    type="number"
                    step="0.01"
                    min="0"
                    value={formPlan.precio_mensual}
                    onChange={(e) => setFormPlan((prev) => ({ ...prev, precio_mensual: e.target.value }))}
                    placeholder="0.00"
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Duración (Días)</label>
                  <input
                    required
                    type="number"
                    min="1"
                    value={formPlan.duracion_dias}
                    onChange={(e) => setFormPlan((prev) => ({ ...prev, duracion_dias: e.target.value }))}
                    placeholder="30"
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Límite Productos</label>
                  <input
                    type="number"
                    min="0"
                    value={formPlan.limite_productos}
                    onChange={(e) => setFormPlan((prev) => ({ ...prev, limite_productos: e.target.value }))}
                    placeholder="Vacío = ilimitado"
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Comisión (%)</label>
                  <input
                    required
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={formPlan.porcentaje_comision}
                    onChange={(e) => setFormPlan((prev) => ({ ...prev, porcentaje_comision: e.target.value }))}
                    placeholder="Ej: 3.5"
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              {/* PRIVILEGIOS CHECKBOXES */}
              <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-3 space-y-2 bg-gray-50/50 dark:bg-gray-800/40">
                <span className="block text-xs font-bold text-gray-800 dark:text-gray-200">Privilegios y Capacidades</span>
                <label className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formPlan.incluye_ia}
                    onChange={(e) => setFormPlan((prev) => ({ ...prev, incluye_ia: e.target.checked }))}
                    className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                  />
                  <Sparkles size={14} className="text-amber-500" />
                  <span>Incluye funciones de Inteligencia Artificial (IA)</span>
                </label>
                <label className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formPlan.incluye_live_commerce}
                    onChange={(e) => setFormPlan((prev) => ({ ...prev, incluye_live_commerce: e.target.checked }))}
                    className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                  />
                  <Video size={14} className="text-purple-500" />
                  <span>Incluye transmisión de Live Commerce</span>
                </label>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Estado</label>
                <select
                  value={formPlan.estado}
                  onChange={(e) => setFormPlan((prev) => ({ ...prev, estado: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="ACTIVO">Activo</option>
                  <option value="INACTIVO">Inactivo</option>
                </select>
              </div>
            </div>

            {errorFormPlan && (
              <p className="text-xs text-red-600 dark:text-red-400 mt-3 p-2 bg-red-50 dark:bg-red-950/40 rounded-md">
                {errorFormPlan}
              </p>
            )}

            <div className="flex gap-2 mt-5">
              <button
                type="button"
                onClick={() => setMostrarFormPlan(false)}
                className="flex-1 rounded-lg border border-gray-300 dark:border-gray-700 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={guardandoPlan}
                className="flex-1 rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
              >
                {guardandoPlan ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
