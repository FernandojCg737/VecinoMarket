import { useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { LogOut, Store, Pencil, X, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
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
