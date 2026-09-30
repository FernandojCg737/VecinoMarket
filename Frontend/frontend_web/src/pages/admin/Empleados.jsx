import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { UserCog, ChevronLeft, ChevronRight, Ban, RotateCcw, Search, Building2 } from 'lucide-react';
import API from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { esSuperAdmin } from '../../utils/roles';

const ESTADOS = [
  { value: '', label: 'Todos los estados' },
  { value: 'ACTIVO', label: 'Activo' },
  { value: 'INACTIVO', label: 'Inactivo' },
];

function badgeEstado(estado) {
  return estado === 'ACTIVO'
    ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400'
    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300';
}

export default function Empleados() {
  const { usuario, cargando: cargandoAuth } = useAuth();

  // --- columna izquierda: empresas ---
  const [empresas, setEmpresas] = useState([]);
  const [totalEmpresas, setTotalEmpresas] = useState(0);
  const [paginaEmpresas, setPaginaEmpresas] = useState(1);
  const [qEmpresa, setQEmpresa] = useState('');
  const [busquedaEmpresa, setBusquedaEmpresa] = useState('');
  const [empresaSel, setEmpresaSel] = useState(null);
  const [errorEmpresas, setErrorEmpresas] = useState('');

  // --- columna derecha: empleados de la empresa seleccionada ---
  const [resultados, setResultados] = useState([]);
  const [permisos, setPermisos] = useState([]);
  const [totalEmpleados, setTotalEmpleados] = useState(0);
  const [paginaEmpleados, setPaginaEmpleados] = useState(1);
  const [estado, setEstado] = useState('');
  const [accionando, setAccionando] = useState(null);
  const [error, setError] = useState('');

  const porPaginaEmpresas = 20;
  const porPaginaEmpleados = 20;

  function cargarEmpresas() {
    return API.get('usuarios/empresas/lista/', {
      params: { page: paginaEmpresas, q: busquedaEmpresa || undefined },
    })
      .then((res) => {
        setEmpresas(res.data.results);
        setTotalEmpresas(res.data.count);
        setErrorEmpresas('');
      })
      .catch(() => setErrorEmpresas('No se pudo cargar la lista de empresas.'));
  }

  function cargarEmpleados(empresaId) {
    return API.get('usuarios/empleados/lista-admin/', {
      params: { page: paginaEmpleados, estado: estado || undefined, empresa: empresaId },
    })
      .then((res) => {
        setResultados(res.data.results);
        setTotalEmpleados(res.data.count);
        setError('');
      })
      .catch(() => setError('No se pudo cargar los empleados de esta empresa.'));
  }

  useEffect(() => {
    if (!usuario || !esSuperAdmin(usuario)) return;
    cargarEmpresas();
    API.get('usuarios/permisos/').then((res) => setPermisos(res.data)).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuario, paginaEmpresas, busquedaEmpresa]);

  useEffect(() => {
    if (!usuario || !esSuperAdmin(usuario) || !empresaSel) return;
    cargarEmpleados(empresaSel.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuario, empresaSel, paginaEmpleados, estado]);

  if (cargandoAuth) return null;
  if (!usuario) return <Navigate to="/login?next=/admin/empleados" replace />;
  if (!esSuperAdmin(usuario)) return <Navigate to="/" replace />;

  function seleccionarEmpresa(emp) {
    setEmpresaSel(emp);
    setPaginaEmpleados(1);
    setEstado('');
  }

  async function toggleEstado(empleado) {
    setAccionando(empleado.id);
    const accion = empleado.estado === 'INACTIVO' ? 'reactivar-admin' : 'desactivar-admin';
    try {
      await API.post(`usuarios/empleados/${empleado.id}/${accion}/`);
      setResultados((prev) => prev.map((it) => (
        it.id === empleado.id ? { ...it, estado: accion === 'desactivar-admin' ? 'INACTIVO' : 'ACTIVO' } : it
      )));
    } catch {
      setError('No se pudo completar la acción.');
    } finally {
      setAccionando(null);
    }
  }

  async function togglePermiso(empleado, permiso) {
    const tiene = empleado.permisos.some((p) => p.id === permiso.id);
    try {
      const { data } = tiene
        ? await API.delete(`usuarios/empleados/${empleado.id}/permisos/${permiso.id}/`)
        : await API.post(`usuarios/empleados/${empleado.id}/permisos/${permiso.id}/`);
      setResultados((prev) => prev.map((it) => (it.id === empleado.id ? data : it)));
    } catch {
      setError('No se pudo actualizar el permiso.');
    }
  }

  function buscarEmpresa(e) {
    e.preventDefault();
    setPaginaEmpresas(1);
    setBusquedaEmpresa(qEmpresa);
  }

  const totalPaginasEmpresas = Math.max(1, Math.ceil(totalEmpresas / porPaginaEmpresas));
  const totalPaginasEmpleados = Math.max(1, Math.ceil(totalEmpleados / porPaginaEmpleados));

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex items-center gap-2 mb-1">
        <UserCog className="text-brand-600 dark:text-brand-400" size={24} />
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Empleados y permisos</h1>
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        CU09 · Elige una empresa para ver a sus empleados y a qué secciones tiene acceso cada cuenta.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] gap-6">
        {/* Columna izquierda: empresas */}
        <div>
          <form onSubmit={buscarEmpresa} className="flex items-center gap-2 mb-3">
            <input
              value={qEmpresa}
              onChange={(e) => setQEmpresa(e.target.value)}
              placeholder="Buscar empresa..."
              className="min-w-0 flex-1 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
            />
            <button type="submit" className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-brand-600 text-white hover:bg-brand-700">
              <Search size={16} />
            </button>
          </form>

          {errorEmpresas && <p className="text-sm text-red-600 dark:text-red-400 mb-3">{errorEmpresas}</p>}

          <div className="space-y-1.5">
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
                <span className="truncate">{emp.razon_social}</span>
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between mt-3 text-xs text-gray-500 dark:text-gray-400">
            <span>{totalEmpresas} empresas</span>
            <div className="flex items-center gap-1">
              <button onClick={() => setPaginaEmpresas((p) => Math.max(1, p - 1))} disabled={paginaEmpresas <= 1}
                className="grid h-6 w-6 place-items-center rounded-full border border-gray-300 dark:border-gray-700 disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-gray-800">
                <ChevronLeft size={12} />
              </button>
              <span>{paginaEmpresas}/{totalPaginasEmpresas}</span>
              <button onClick={() => setPaginaEmpresas((p) => Math.min(totalPaginasEmpresas, p + 1))} disabled={paginaEmpresas >= totalPaginasEmpresas}
                className="grid h-6 w-6 place-items-center rounded-full border border-gray-300 dark:border-gray-700 disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-gray-800">
                <ChevronRight size={12} />
              </button>
            </div>
          </div>
        </div>

        {/* Columna derecha: empleados de la empresa seleccionada */}
        <div>
          {!empresaSel ? (
            <div className="flex h-full min-h-[240px] items-center justify-center rounded-xl border border-dashed border-gray-300 dark:border-gray-700 text-sm text-gray-400 dark:text-gray-500">
              Selecciona una empresa a la izquierda para ver sus empleados.
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <h2 className="font-semibold text-gray-900 dark:text-gray-100">{empresaSel.razon_social}</h2>
                <select
                  value={estado}
                  onChange={(e) => { setEstado(e.target.value); setPaginaEmpleados(1); }}
                  className="rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
                >
                  {ESTADOS.map((op) => <option key={op.value} value={op.value}>{op.label}</option>)}
                </select>
              </div>

              {error && <p className="text-sm text-red-600 dark:text-red-400 mb-4">{error}</p>}

              <div className="space-y-3">
                {resultados.length === 0 ? (
                  <p className="text-sm text-gray-400 dark:text-gray-500 py-8 text-center">Esta empresa no tiene empleados.</p>
                ) : resultados.map((emp) => (
                  <div key={emp.id} className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-900 dark:text-gray-100">{emp.usuario_nombre}</span>
                          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${badgeEstado(emp.estado)}`}>{emp.estado}</span>
                        </div>
                        <div className="text-xs text-gray-400 dark:text-gray-500">{emp.usuario_email}</div>
                        {emp.cargo && <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{emp.cargo}</div>}
                      </div>
                      <button
                        onClick={() => toggleEstado(emp)}
                        disabled={accionando === emp.id}
                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold disabled:opacity-50 ${
                          emp.estado === 'INACTIVO'
                            ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-100'
                            : 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 hover:bg-red-100'
                        }`}
                      >
                        {emp.estado === 'INACTIVO' ? <RotateCcw size={12} /> : <Ban size={12} />}
                        {emp.estado === 'INACTIVO' ? 'Reactivar' : 'Desactivar'}
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {permisos.map((permiso) => {
                        const activo = emp.permisos.some((p) => p.id === permiso.id);
                        return (
                          <button
                            key={permiso.id}
                            onClick={() => togglePermiso(emp, permiso)}
                            title={permiso.descripcion}
                            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                              activo
                                ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-400'
                                : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-300'
                            }`}
                          >
                            {permiso.codigo}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between mt-4 text-sm text-gray-600 dark:text-gray-400">
                <span>{totalEmpleados} empleados</span>
                <div className="flex items-center gap-2">
                  <button onClick={() => setPaginaEmpleados((p) => Math.max(1, p - 1))} disabled={paginaEmpleados <= 1}
                    className="grid h-8 w-8 place-items-center rounded-full border border-gray-300 dark:border-gray-700 disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-gray-800">
                    <ChevronLeft size={16} />
                  </button>
                  <span>Página {paginaEmpleados} de {totalPaginasEmpleados}</span>
                  <button onClick={() => setPaginaEmpleados((p) => Math.min(totalPaginasEmpleados, p + 1))} disabled={paginaEmpleados >= totalPaginasEmpleados}
                    className="grid h-8 w-8 place-items-center rounded-full border border-gray-300 dark:border-gray-700 disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-gray-800">
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
