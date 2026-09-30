import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { UserCog, Plus, Ban, RotateCcw } from 'lucide-react';
import API from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { esEmpresa } from '../../utils/roles';

const VACIO = { nombre: '', apellido: '', email: '', telefono: '', cargo: '', password: '' };

function badgeEstado(estado) {
  return estado === 'ACTIVO'
    ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400'
    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300';
}

export default function MisEmpleados() {
  const { usuario, cargando: cargandoAuth } = useAuth();
  const [empleados, setEmpleados] = useState([]);
  const [permisos, setPermisos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [accionando, setAccionando] = useState(null);
  const [error, setError] = useState('');

  const [mostrarForm, setMostrarForm] = useState(false);
  const [form, setForm] = useState(VACIO);
  const [guardando, setGuardando] = useState(false);
  const [errorForm, setErrorForm] = useState('');

  function cargar() {
    setCargando(true);
    return API.get('usuarios/empleados/lista/')
      .then((res) => { setEmpleados(res.data); setError(''); })
      .catch(() => setError('No se pudo cargar tu lista de empleados.'))
      .finally(() => setCargando(false));
  }

  useEffect(() => {
    if (!usuario || !esEmpresa(usuario)) return;
    cargar();
    API.get('usuarios/permisos/').then((res) => setPermisos(res.data)).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuario]);

  if (cargandoAuth) return null;
  if (!usuario) return <Navigate to="/login?next=/mi-empresa/empleados" replace />;
  if (!esEmpresa(usuario)) return <Navigate to="/" replace />;

  function abrirNuevo() {
    setForm(VACIO);
    setErrorForm('');
    setMostrarForm(true);
  }

  async function crearEmpleado(e) {
    e.preventDefault();
    setGuardando(true);
    setErrorForm('');
    try {
      await API.post('usuarios/empleados/', form);
      setMostrarForm(false);
      await cargar();
    } catch (err) {
      setErrorForm(err?.response?.data?.email?.[0] || err?.response?.data?.password?.[0] || 'No se pudo crear el empleado.');
    } finally {
      setGuardando(false);
    }
  }

  async function toggleEstado(empleado) {
    setAccionando(empleado.id);
    const accion = empleado.estado === 'INACTIVO' ? 'reactivar' : 'desactivar';
    try {
      await API.post(`usuarios/empleados/${empleado.id}/${accion}/`);
      setEmpleados((prev) => prev.map((it) => (
        it.id === empleado.id ? { ...it, estado: accion === 'desactivar' ? 'INACTIVO' : 'ACTIVO' } : it
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
        ? await API.delete(`usuarios/empleados/${empleado.id}/mis-permisos/${permiso.id}/`)
        : await API.post(`usuarios/empleados/${empleado.id}/mis-permisos/${permiso.id}/`);
      setEmpleados((prev) => prev.map((it) => (it.id === empleado.id ? data : it)));
    } catch {
      setError('No se pudo actualizar el permiso.');
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="flex items-center justify-between gap-2 mb-1">
        <div className="flex items-center gap-2">
          <UserCog className="text-brand-600 dark:text-brand-400" size={24} />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Mis empleados</h1>
        </div>
        <button onClick={abrirNuevo} className="flex items-center gap-1.5 rounded-md bg-brand-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-700">
          <Plus size={16} /> Nuevo empleado
        </button>
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        CU09 · Da de alta a tus empleados y marca a qué secciones de tu cuenta tienen acceso.
      </p>

      {error && <p className="text-sm text-red-600 dark:text-red-400 mb-4">{error}</p>}

      {cargando ? (
        <p className="text-sm text-gray-400">Cargando...</p>
      ) : empleados.length === 0 ? (
        <p className="text-sm text-gray-400 dark:text-gray-500 py-8 text-center">Todavía no tienes empleados registrados.</p>
      ) : (
        <div className="space-y-3">
          {empleados.map((emp) => (
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
      )}

      {mostrarForm && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 px-4 overflow-y-auto py-8" onClick={() => setMostrarForm(false)}>
          <form onSubmit={crearEmpleado} className="w-full max-w-md rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-5 shadow-lg" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">Nuevo empleado</h2>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <input required value={form.nombre} onChange={(e) => setForm((prev) => ({ ...prev, nombre: e.target.value }))} placeholder="Nombre" className="rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300" />
                <input value={form.apellido} onChange={(e) => setForm((prev) => ({ ...prev, apellido: e.target.value }))} placeholder="Apellido" className="rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300" />
              </div>
              <input required type="email" value={form.email} onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))} placeholder="Email" className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300" />
              <input value={form.telefono} onChange={(e) => setForm((prev) => ({ ...prev, telefono: e.target.value }))} placeholder="Teléfono (opcional)" className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300" />
              <input value={form.cargo} onChange={(e) => setForm((prev) => ({ ...prev, cargo: e.target.value }))} placeholder="Cargo (opcional, ej: Vendedor)" className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300" />
              <input required type="password" minLength={8} value={form.password} onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))} placeholder="Contraseña (mínimo 8 caracteres)" className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300" />
            </div>
            {errorForm && <p className="text-xs text-red-600 dark:text-red-400 mt-3">{errorForm}</p>}
            <div className="flex gap-2 mt-4">
              <button type="button" onClick={() => setMostrarForm(false)} className="flex-1 rounded-md border border-gray-300 dark:border-gray-700 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">Cancelar</button>
              <button type="submit" disabled={guardando} className="flex-1 rounded-md bg-brand-600 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60">{guardando ? 'Creando...' : 'Crear'}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
