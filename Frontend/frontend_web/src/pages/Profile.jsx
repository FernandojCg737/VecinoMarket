import { useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { LogOut, Store, Pencil, X, Check, Bell, CheckCheck, Trash2, ExternalLink } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotificaciones } from '../context/NotificacionesContext';
import API from '../api/axios';
import PasswordInput from '../components/ui/PasswordInput';
import { esStaff } from '../utils/roles';

const inputClass = 'w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300';
const labelClass = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1';

export default function Profile() {
  const { usuario, cargando, logout, actualizarPerfil } = useAuth();
  const [editando, setEditando] = useState(false);
  const [form, setForm] = useState({ email: '', nombre: '', apellido: '', telefono: '' });
  const [errorPerfil, setErrorPerfil] = useState('');
  const [guardando, setGuardando] = useState(false);

  const [passwordForm, setPasswordForm] = useState({ password_actual: '', password_nueva: '', confirmar: '' });
  const [mensajePassword, setMensajePassword] = useState('');
  const [errorPassword, setErrorPassword] = useState('');
  const [cambiandoPassword, setCambiandoPassword] = useState(false);
  const [modalNotificacion, setModalNotificacion] = useState(null);

  const { notificaciones, marcarLeida, marcarTodas, eliminarNotificacion } = useNotificaciones();

  if (cargando) return null;
  if (!usuario) return <Navigate to="/login?next=/perfil" replace />;

  const esAdmin = esStaff(usuario);

  function iniciarEdicion() {
    setForm({
      email: usuario.email || '',
      nombre: usuario.nombre || '',
      apellido: usuario.apellido || '',
      telefono: usuario.telefono || '',
    });
    setErrorPerfil('');
    setEditando(true);
  }

  async function guardarPerfil(e) {
    e.preventDefault();
    setErrorPerfil('');
    setGuardando(true);
    try {
      await actualizarPerfil(esAdmin ? form : { nombre: form.nombre, apellido: form.apellido, telefono: form.telefono });
      setEditando(false);
    } catch (err) {
      setErrorPerfil(err?.response?.data?.email?.[0] || 'No se pudo guardar los cambios.');
    } finally {
      setGuardando(false);
    }
  }

  async function cambiarPassword(e) {
    e.preventDefault();
    setErrorPassword('');
    setMensajePassword('');
    if (passwordForm.password_nueva !== passwordForm.confirmar) {
      setErrorPassword('Las contraseñas nuevas no coinciden.');
      return;
    }
    setCambiandoPassword(true);
    try {
      await API.post('usuarios/auth/cambiar-password/', {
        password_actual: passwordForm.password_actual,
        password_nueva: passwordForm.password_nueva,
      });
      setMensajePassword('Contraseña actualizada correctamente.');
      setPasswordForm({ password_actual: '', password_nueva: '', confirmar: '' });
    } catch (err) {
      const data = err?.response?.data;
      setErrorPassword(data?.password_actual?.[0] || data?.password_nueva?.[0] || 'No se pudo cambiar la contraseña.');
    } finally {
      setCambiandoPassword(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">Mi perfil</h1>

      <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6">
        {editando ? (
          <form onSubmit={guardarPerfil} className="space-y-4">
            {esAdmin && (
              <div>
                <label className={labelClass}>Email</label>
                <input
                  required
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className={inputClass}
                />
              </div>
            )}
            <div>
              <label className={labelClass}>Nombre</label>
              <input
                required value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Apellido</label>
              <input
                value={form.apellido}
                onChange={(e) => setForm({ ...form, apellido: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Teléfono</label>
              <input
                value={form.telefono}
                onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                className={inputClass}
              />
            </div>
            {errorPerfil && <p className="text-sm text-red-600 dark:text-red-400">{errorPerfil}</p>}
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={guardando}
                className="flex items-center gap-1.5 rounded-full bg-brand-600 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
              >
                <Check size={16} /> {guardando ? 'Guardando...' : 'Guardar'}
              </button>
              <button
                type="button"
                onClick={() => setEditando(false)}
                className="flex items-center gap-1.5 rounded-full border border-gray-300 dark:border-gray-700 px-5 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                <X size={16} /> Cancelar
              </button>
            </div>
          </form>
        ) : (
          <>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Nombre</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">{usuario.nombre} {usuario.apellido}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Email</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">{usuario.email}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Teléfono</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">{usuario.telefono || '—'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Rol</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">{usuario.rol}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Estado</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">{usuario.estado}</span>
              </div>
            </div>
            <button
              onClick={iniciarEdicion}
              className="mt-4 flex items-center gap-1.5 text-sm font-medium text-brand-600 dark:text-brand-400 hover:underline"
            >
              <Pencil size={14} /> Editar datos
            </button>
          </>
        )}
      </div>

      <div className="mt-6 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6">
        <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">Cambiar contraseña</h2>
        <form onSubmit={cambiarPassword} className="space-y-3">
          <div>
            <label className={labelClass}>Contraseña actual</label>
            <PasswordInput
              required
              value={passwordForm.password_actual}
              onChange={(e) => setPasswordForm({ ...passwordForm, password_actual: e.target.value })}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Contraseña nueva</label>
            <PasswordInput
              required minLength={8}
              value={passwordForm.password_nueva}
              onChange={(e) => setPasswordForm({ ...passwordForm, password_nueva: e.target.value })}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Confirma la contraseña nueva</label>
            <PasswordInput
              required minLength={8}
              value={passwordForm.confirmar}
              onChange={(e) => setPasswordForm({ ...passwordForm, confirmar: e.target.value })}
              className={inputClass}
            />
          </div>
          {errorPassword && <p className="text-sm text-red-600 dark:text-red-400">{errorPassword}</p>}
          {mensajePassword && <p className="text-sm text-green-600 dark:text-green-400">{mensajePassword}</p>}
          <button
            type="submit"
            disabled={cambiandoPassword}
            className="rounded-full bg-brand-600 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {cambiandoPassword ? 'Guardando...' : 'Cambiar contraseña'}
          </button>
        </form>
      </div>

      {/* Sección de notificaciones y avisos de pedidos/pagos */}
      <div className="mt-6 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Bell size={20} className="text-brand-600 dark:text-brand-400" />
            <h2 className="font-semibold text-gray-900 dark:text-gray-100">
              Mis notificaciones y avisos
            </h2>
            {notificaciones.filter((n) => !n.leido).length > 0 && (
              <span className="rounded-full bg-red-600 px-2 py-0.5 text-xs font-bold text-white">
                {notificaciones.filter((n) => !n.leido).length} no leídas
              </span>
            )}
          </div>
          {notificaciones.some((n) => !n.leido) && (
            <button
              onClick={marcarTodas}
              className="flex items-center gap-1 text-xs font-medium text-brand-600 dark:text-brand-400 hover:text-brand-700 hover:underline"
            >
              <CheckCheck size={14} /> Marcar todas leídas
            </button>
          )}
        </div>

        {notificaciones.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 py-3">
            No tienes notificaciones por el momento.
          </p>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800 max-h-80 overflow-y-auto">
            {notificaciones.map((notif) => (
              <div
                key={notif.id}
                onClick={() => {
                  marcarLeida(notif);
                  setModalNotificacion(notif);
                }}
                className={`py-3 px-3 rounded-lg flex items-start justify-between cursor-pointer transition-colors ${
                  notif.leido
                    ? 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                    : 'bg-brand-50/40 dark:bg-brand-900/10 hover:bg-brand-50 dark:hover:bg-brand-900/20'
                }`}
              >
                <div className="flex items-start gap-3">
                  <span
                    className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${
                      notif.leido ? 'bg-transparent' : 'bg-brand-500'
                    }`}
                  />
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                      {notif.titulo}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 mt-0.5">
                      {notif.mensaje}
                    </p>
                    <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">
                      {new Date(notif.creado_en).toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  <span className="text-xs text-brand-600 dark:text-brand-400 font-medium">
                    Ver detalle
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      eliminarNotificacion(notif.id);
                    }}
                    title="Eliminar"
                    className="p-1 text-gray-400 hover:text-red-600 rounded transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de Detalle de Notificación */}
      {modalNotificacion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-2xl">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <div className="rounded-full bg-brand-50 dark:bg-brand-900/40 p-2 text-brand-600 dark:text-brand-400">
                  <Bell size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-gray-100 text-base">
                    {modalNotificacion.titulo}
                  </h3>
                  <p className="text-[11px] text-gray-400 dark:text-gray-500">
                    {new Date(modalNotificacion.creado_en).toLocaleString()}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setModalNotificacion(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-4 rounded-xl bg-gray-50 dark:bg-gray-800/60 p-4 border border-gray-100 dark:border-gray-800">
              <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed">
                {modalNotificacion.mensaje}
              </p>
            </div>

            <div className="mt-6 flex items-center justify-between gap-3">
              <button
                onClick={() => {
                  eliminarNotificacion(modalNotificacion.id);
                  setModalNotificacion(null);
                }}
                className="flex items-center gap-1.5 text-xs text-red-600 hover:text-red-700 py-2 px-3 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                <Trash2 size={14} /> Eliminar
              </button>
              <div className="flex items-center gap-2">
                {modalNotificacion.enlace && (
                  <Link
                    to={modalNotificacion.enlace}
                    onClick={() => setModalNotificacion(null)}
                    className="flex items-center gap-1 rounded-full bg-brand-600 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-700"
                  >
                    <ExternalLink size={14} /> Ver en el sistema
                  </Link>
                )}
                <button
                  onClick={() => setModalNotificacion(null)}
                  className="rounded-full border border-gray-300 dark:border-gray-700 px-4 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {usuario.rol === 'COMPRADOR' && (
        <Link
          to="/solicitar-empresa"
          className="mt-6 flex items-center gap-2 rounded-xl border border-dashed border-brand-300 dark:border-brand-700 bg-brand-50 dark:bg-gray-900 p-4 text-sm font-medium text-brand-700 dark:text-brand-400 hover:bg-brand-100 dark:hover:bg-gray-800"
        >
          <Store size={18} /> ¿Tienes un emprendimiento? Solicita tu cuenta de empresa
        </Link>
      )}

      <button
        onClick={logout}
        className="mt-6 flex items-center gap-2 text-sm font-medium text-red-600 dark:text-red-400 hover:underline"
      >
        <LogOut size={16} /> Cerrar sesión
      </button>
    </div>
  );
}
