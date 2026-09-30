import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Users, ChevronLeft, ChevronRight, Lock, Unlock, Search, UserPlus, Pencil } from 'lucide-react';
import API from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { esStaff, esSuperAdmin } from '../../utils/roles';

const NUEVO_USUARIO_VACIO = { nombre: '', apellido: '', email: '', telefono: '', password: '' };

const ROLES = [
  { value: '', label: 'Todos los roles' },
  { value: 'SUPERADMIN', label: 'Superadmin' },
  { value: 'ADMIN', label: 'Admin (soporte)' },
  { value: 'EMPRESA', label: 'Empresa' },
  { value: 'EMPLEADO', label: 'Empleado' },
  { value: 'COMPRADOR', label: 'Comprador' },
];

const ESTADOS = [
  { value: '', label: 'Todos los estados' },
  { value: 'ACTIVO', label: 'Activo' },
  { value: 'INACTIVO', label: 'Inactivo' },
  { value: 'BLOQUEADO', label: 'Bloqueado' },
];

function badgeEstado(estado) {
  if (estado === 'ACTIVO') return 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400';
  if (estado === 'BLOQUEADO') return 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400';
  return 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300';
}

export default function Usuarios() {
  const { usuario, cargando: cargandoAuth } = useAuth();
  const [resultados, setResultados] = useState([]);
  const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [rol, setRol] = useState('');
  const [estado, setEstado] = useState('');
  const [q, setQ] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [accionando, setAccionando] = useState(null);
  const [error, setError] = useState('');

  const [mostrarNuevo, setMostrarNuevo] = useState(false);
  const [nuevoUsuario, setNuevoUsuario] = useState(NUEVO_USUARIO_VACIO);
  const [registrando, setRegistrando] = useState(false);
  const [errorNuevo, setErrorNuevo] = useState('');

  const [usuarioEditando, setUsuarioEditando] = useState(null);
  const [datosEdicion, setDatosEdicion] = useState({ email: '', nombre: '', apellido: '', telefono: '', rol: '', estado: '' });
  const [guardandoEdicion, setGuardandoEdicion] = useState(false);
  const [errorEdicion, setErrorEdicion] = useState('');

  const porPagina = 30;

  function cargarUsuarios() {
    return API.get('usuarios/lista/', { params: { page: pagina, rol: rol || undefined, estado: estado || undefined, q: busqueda || undefined } })
      .then((res) => {
        setResultados(res.data.results);
        setTotal(res.data.count);
        setError('');
      })
      .catch(() => setError('No se pudo cargar la lista de usuarios.'));
  }

  useEffect(() => {
    if (!usuario || !esStaff(usuario)) return;
    cargarUsuarios();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuario, pagina, rol, estado, busqueda]);

  if (cargandoAuth) return null;
  if (!usuario) return <Navigate to="/login?next=/admin/usuarios" replace />;
  if (!esStaff(usuario)) return <Navigate to="/" replace />;

  async function toggleBloqueo(u) {
    setAccionando(u.id);
    const accion = u.estado === 'BLOQUEADO' ? 'desbloquear' : 'bloquear';
    try {
      await API.post(`usuarios/${u.id}/${accion}/`);
      setResultados((prev) => prev.map((it) => (
        it.id === u.id ? { ...it, estado: accion === 'bloquear' ? 'BLOQUEADO' : 'ACTIVO' } : it
      )));
    } catch (err) {
      setError(err?.response?.data?.detail || 'No se pudo completar la acción.');
    } finally {
      setAccionando(null);
    }
  }

  function buscar(e) {
    e.preventDefault();
    setPagina(1);
    setBusqueda(q);
  }

  function abrirNuevoUsuario() {
    setNuevoUsuario(NUEVO_USUARIO_VACIO);
    setErrorNuevo('');
    setMostrarNuevo(true);
  }

  async function registrarUsuario(e) {
    e.preventDefault();
    setRegistrando(true);
    setErrorNuevo('');
    try {
      await API.post('usuarios/registrar/', nuevoUsuario);
      setMostrarNuevo(false);
      setPagina(1);
      await cargarUsuarios();
    } catch (err) {
      const data = err?.response?.data || {};
      setErrorNuevo(data.email?.[0] || data.password?.[0] || data.detail || 'No se pudo registrar el usuario.');
    } finally {
      setRegistrando(false);
    }
  }

  function abrirEdicion(u) {
    setUsuarioEditando(u);
    setDatosEdicion({
      email: u.email || '',
      nombre: u.nombre || '',
      apellido: u.apellido || '',
      telefono: u.telefono || '',
      rol: u.rol,
      estado: u.estado,
      password_nueva: '',
    });
    setErrorEdicion('');
  }

  async function guardarEdicion(e) {
    e.preventDefault();
    setGuardandoEdicion(true);
    setErrorEdicion('');
    try {
      const { password_nueva, rol: _rol, ...datos } = datosEdicion;
      await API.patch(`usuarios/${usuarioEditando.id}/editar/`, datos);
      if (password_nueva && esSuperAdmin(usuario)) {
        await API.post(`usuarios/${usuarioEditando.id}/restablecer-password/`, { password_nueva });
      }
      setUsuarioEditando(null);
      await cargarUsuarios();
    } catch (err) {
      const data = err?.response?.data || {};
      setErrorEdicion(data.detail || data.email?.[0] || data.password_nueva?.[0] || 'No se pudo guardar los cambios.');
    } finally {
      setGuardandoEdicion(false);
    }
  }

  const totalPaginas = Math.max(1, Math.ceil(total / porPagina));

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex items-center justify-between gap-2 mb-1">
        <div className="flex items-center gap-2">
          <Users className="text-brand-600 dark:text-brand-400" size={24} />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Gestión de usuarios</h1>
        </div>
        <button
          onClick={abrirNuevoUsuario}
          className="flex items-center gap-1.5 rounded-md bg-brand-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-700"
        >
          <UserPlus size={16} /> Nuevo usuario
        </button>
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        CU02 · Usuarios de toda la plataforma: compradores, empresas, empleados y administradores.
      </p>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <form onSubmit={buscar} className="flex items-center gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nombre o email..."
            className="rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-1.5 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-brand-300"
          />
          <button type="submit" className="grid h-8 w-8 place-items-center rounded-md bg-brand-600 text-white hover:bg-brand-700">
            <Search size={16} />
          </button>
        </form>
        <select
          value={rol}
          onChange={(e) => { setRol(e.target.value); setPagina(1); }}
          className="rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
        >
          {ROLES.map((op) => <option key={op.value} value={op.value}>{op.label}</option>)}
        </select>
        <select
          value={estado}
          onChange={(e) => { setEstado(e.target.value); setPagina(1); }}
          className="rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
        >
          {ESTADOS.map((op) => <option key={op.value} value={op.value}>{op.label}</option>)}
        </select>
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400 mb-4">{error}</p>}

      <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-900 text-left text-gray-500 dark:text-gray-400">
            <tr>
              <th className="px-4 py-3 font-medium">Usuario</th>
              <th className="px-4 py-3 font-medium">Rol</th>
              <th className="px-4 py-3 font-medium">Estado</th>
              <th className="px-4 py-3 font-medium">Registrado</th>
              <th className="px-4 py-3 font-medium text-right">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800 bg-white dark:bg-gray-900">
            {resultados.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400 dark:text-gray-500">Sin resultados.</td></tr>
            ) : resultados.map((u) => (
              <tr key={u.id}>
                <td className="px-4 py-3">
                  <div className="text-gray-800 dark:text-gray-200 font-medium">{u.nombre} {u.apellido}</div>
                  <div className="text-xs text-gray-400 dark:text-gray-500">{u.email}</div>
                </td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{u.rol}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${badgeEstado(u.estado)}`}>{u.estado}</span>
                </td>
                <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                  {new Date(u.fecha_registro).toLocaleDateString('es-BO')}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => abrirEdicion(u)}
                      className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 dark:bg-blue-900/30 px-3 py-1.5 text-xs font-semibold text-blue-700 dark:text-blue-400 hover:bg-blue-100"
                    >
                      <Pencil size={12} /> Editar
                    </button>
                    {u.id === usuario.id ? (
                      <span className="text-xs text-gray-400 dark:text-gray-500">Tu cuenta</span>
                    ) : (
                      <button
                        onClick={() => toggleBloqueo(u)}
                        disabled={accionando === u.id}
                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold disabled:opacity-50 ${
                          u.estado === 'BLOQUEADO'
                            ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-100'
                            : 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 hover:bg-red-100'
                        }`}
                      >
                        {u.estado === 'BLOQUEADO' ? <Unlock size={12} /> : <Lock size={12} />}
                        {u.estado === 'BLOQUEADO' ? 'Desbloquear' : 'Bloquear'}
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
        <span>{total} usuarios en total</span>
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

      {mostrarNuevo && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 px-4" onClick={() => setMostrarNuevo(false)}>
          <form
            onSubmit={registrarUsuario}
            className="w-full max-w-sm rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-5 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">Nuevo usuario</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Se registra como comprador.</p>

            <div className="space-y-3">
              <input
                required
                value={nuevoUsuario.nombre}
                onChange={(e) => setNuevoUsuario((prev) => ({ ...prev, nombre: e.target.value }))}
                placeholder="Nombre"
                className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
              />
              <input
                value={nuevoUsuario.apellido}
                onChange={(e) => setNuevoUsuario((prev) => ({ ...prev, apellido: e.target.value }))}
                placeholder="Apellido"
                className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
              />
              <input
                required
                type="email"
                value={nuevoUsuario.email}
                onChange={(e) => setNuevoUsuario((prev) => ({ ...prev, email: e.target.value }))}
                placeholder="Email"
                className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
              />
              <input
                value={nuevoUsuario.telefono}
                onChange={(e) => setNuevoUsuario((prev) => ({ ...prev, telefono: e.target.value }))}
                placeholder="Teléfono (opcional)"
                className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
              />
              <input
                required
                type="password"
                minLength={8}
                value={nuevoUsuario.password}
                onChange={(e) => setNuevoUsuario((prev) => ({ ...prev, password: e.target.value }))}
                placeholder="Contraseña (mínimo 8 caracteres)"
                className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
              />
            </div>

            {errorNuevo && <p className="text-xs text-red-600 dark:text-red-400 mt-3">{errorNuevo}</p>}

            <div className="flex gap-2 mt-4">
              <button
                type="button"
                onClick={() => setMostrarNuevo(false)}
                className="flex-1 rounded-md border border-gray-300 dark:border-gray-700 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={registrando}
                className="flex-1 rounded-md bg-brand-600 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
              >
                {registrando ? 'Registrando...' : 'Registrar'}
              </button>
            </div>
          </form>
        </div>
      )}

      {usuarioEditando && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 px-4" onClick={() => setUsuarioEditando(null)}>
          <form
            onSubmit={guardarEdicion}
            className="w-full max-w-sm rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-5 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">Editar usuario</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Como SuperAdmin puedes editar cualquier dato de esta cuenta.</p>

            <div className="space-y-3">
              <input
                required
                type="email"
                value={datosEdicion.email}
                onChange={(e) => setDatosEdicion((prev) => ({ ...prev, email: e.target.value }))}
                placeholder="Email"
                className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
              />
              <input
                required
                value={datosEdicion.nombre}
                onChange={(e) => setDatosEdicion((prev) => ({ ...prev, nombre: e.target.value }))}
                placeholder="Nombre"
                className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
              />
              <input
                value={datosEdicion.apellido}
                onChange={(e) => setDatosEdicion((prev) => ({ ...prev, apellido: e.target.value }))}
                placeholder="Apellido"
                className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
              />
              <input
                value={datosEdicion.telefono}
                onChange={(e) => setDatosEdicion((prev) => ({ ...prev, telefono: e.target.value }))}
                placeholder="Teléfono"
                className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
              />
              <div>
                <label className="block text-xs text-gray-400 dark:text-gray-500 mb-1">
                  Rol: <span className="font-medium text-gray-600 dark:text-gray-300">{datosEdicion.rol}</span>
                  {' '}(para cambiarlo, usa "Administrar roles")
                </label>
                <select
                  value={datosEdicion.estado}
                  onChange={(e) => setDatosEdicion((prev) => ({ ...prev, estado: e.target.value }))}
                  className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
                >
                  {ESTADOS.filter((op) => op.value).map((op) => <option key={op.value} value={op.value}>{op.label}</option>)}
                </select>
              </div>
              {esSuperAdmin(usuario) && (
                <input
                  type="password"
                  minLength={8}
                  value={datosEdicion.password_nueva}
                  onChange={(e) => setDatosEdicion((prev) => ({ ...prev, password_nueva: e.target.value }))}
                  placeholder="Nueva contraseña (opcional, mínimo 8 caracteres)"
                  className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
                />
              )}
            </div>

            {errorEdicion && <p className="text-xs text-red-600 dark:text-red-400 mt-3">{errorEdicion}</p>}

            <div className="flex gap-2 mt-4">
              <button
                type="button"
                onClick={() => setUsuarioEditando(null)}
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
    </div>
  );
}
