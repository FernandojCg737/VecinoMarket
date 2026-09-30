import { useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import GoogleSignInButton from '../components/auth/GoogleSignInButton';
import PasswordInput from '../components/ui/PasswordInput';

const inputClass = 'w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300';
const labelClass = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1';

export default function Auth() {
  const { login, registrarComprador, loginConGoogle } = useAuth();
  const { tema } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const next = searchParams.get('next') || '/';

  const [logoError, setLogoError] = useState(false);
  const [logoOscuroError, setLogoOscuroError] = useState(false);
  const usarLogoOscuro = tema === 'dark' && !logoOscuroError;

  // Derivado de la URL (no de un useState) para que también reaccione a
  // navegaciones que no pasan por cambiarTab (p. ej. el link "Crear Cuenta"
  // del menú del encabezado), ya que React reutiliza esta misma instancia
  // del componente al navegar entre /login y /registro.
  const tab = location.pathname === '/registro' ? 'registro' : 'login';
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [registerForm, setRegisterForm] = useState({ nombre: '', apellido: '', email: '', telefono: '', password: '' });

  // Al cambiar de pestaña (por click o por navegación externa, p. ej. el
  // link "Crear Cuenta" del encabezado) se limpia el error de la pestaña
  // anterior. Ajuste de estado durante el render, no en un efecto.
  const [tabAnterior, setTabAnterior] = useState(tab);
  if (tabAnterior !== tab) {
    setTabAnterior(tab);
    if (error) setError('');
  }

  function cambiarTab(nuevaTab) {
    navigate(nuevaTab === 'registro' ? `/registro${location.search}` : `/login${location.search}`, { replace: true });
  }

  function irSegunRol(perfil) {
    // CU22: el SUPERADMIN entra directo a la bitácora. El ADMIN de soporte
    // no tiene acceso a la bitácora, así que va a la gestión de usuarios.
    if (perfil.rol === 'SUPERADMIN') navigate('/bitacora');
    else if (perfil.rol === 'ADMIN') navigate('/admin/usuarios');
    else navigate(next);
  }

  async function onSubmitLogin(e) {
    e.preventDefault();
    setError('');
    setCargando(true);
    try {
      const perfil = await login(loginForm.email, loginForm.password);
      irSegunRol(perfil);
    } catch (err) {
      if (!err.response) {
        setError('No se pudo conectar con el servidor. ¿Está corriendo el backend (python manage.py runserver)?');
      } else {
        const data = err.response.data;
        setError('Email o contraseña incorrectos.');
      }
    } finally {
      setCargando(false);
    }
  }

  async function onSubmitRegistro(e) {
    e.preventDefault();
    setError('');
    setCargando(true);
    try {
      await registrarComprador({ ...registerForm });
      navigate('/');
    } catch (err) {
      const data = err?.response?.data;
      const primerError = data ? Object.values(data)[0] : null;
      setError(Array.isArray(primerError) ? primerError[0] : 'No se pudo completar el registro.');
    } finally {
      setCargando(false);
    }
  }

  async function onGoogleCredential(credential) {
    setError('');
    try {
      const perfil = await loginConGoogle(credential);
      irSegunRol(perfil);
    } catch {
      setError('No se pudo continuar con Google. Intenta de nuevo.');
    }
  }

  return (
    <div className="relative flex items-center justify-center px-4 py-16 min-h-screen">
      {/* La imagen se extiende 4rem más abajo del final del bloque (-bottom-16) para
          tapar el hueco que deja el margen superior del <Footer> (mt-16); el footer
          igual queda pintado encima porque va después en el DOM. */}
      <div
        className="absolute inset-x-0 top-0 -bottom-16 bg-cover bg-center"
        style={{ backgroundImage: "url('/login-fondo.jpeg')" }}
      />
      <div className="absolute inset-x-0 top-0 -bottom-16 bg-black/50 dark:bg-black/70" />

      <div className="relative w-full max-w-md rounded-2xl bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm shadow-2xl p-8">
        <h1 className="flex flex-wrap items-center justify-center gap-2 text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6 text-center">
          Bienvenido a
          {logoError ? (
            <span className="text-brand-600">VecinoMarket</span>
          ) : usarLogoOscuro ? (
            <img
              src="/logo-dark.png"
              alt="VecinoMarket"
              className="h-7 w-auto object-contain"
              onError={() => setLogoOscuroError(true)}
            />
          ) : (
            <span className="dark:bg-white dark:rounded-lg dark:px-2 dark:py-1 inline-flex items-center">
              <img
                src="/logo.png"
                alt="VecinoMarket"
                className="h-7 w-auto object-contain"
                onError={() => setLogoError(true)}
              />
            </span>
          )}
        </h1>

        <div className="flex rounded-full bg-gray-100 dark:bg-gray-800 p-1 mb-6">
        <button
          type="button"
          onClick={() => cambiarTab('login')}
          className={`flex-1 rounded-full py-2 text-sm font-semibold transition-colors ${
            tab === 'login'
              ? 'bg-brand-600 text-white shadow'
              : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100'
          }`}
        >
          Inicia sesión
        </button>
        <button
          type="button"
          onClick={() => cambiarTab('registro')}
          className={`flex-1 rounded-full py-2 text-sm font-semibold transition-colors ${
            tab === 'registro'
              ? 'bg-brand-600 text-white shadow'
              : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100'
          }`}
        >
          Únete
        </button>
      </div>

      {tab === 'login' ? (
        <form onSubmit={onSubmitLogin} className="space-y-4">
          <div>
            <label className={labelClass}>Email</label>
            <input
              type="email"
              required
              value={loginForm.email}
              onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
              className={inputClass}
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className={labelClass}>Contraseña</label>
              <Link to="/olvide-password" className="text-xs font-medium text-brand-600 dark:text-brand-400 hover:underline">
                ¿Olvidaste tu contraseña?
              </Link>
            </div>
            <PasswordInput
              required
              value={loginForm.password}
              onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
              className={inputClass}
            />
          </div>

          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={cargando}
            className="w-full rounded-full bg-brand-600 py-3 font-semibold text-white hover:bg-brand-700 transition-colors disabled:opacity-60"
          >
            {cargando ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>
      ) : (
        <form onSubmit={onSubmitRegistro} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Nombre</label>
              <input
                required
                value={registerForm.nombre}
                onChange={(e) => setRegisterForm({ ...registerForm, nombre: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Apellido</label>
              <input
                value={registerForm.apellido}
                onChange={(e) => setRegisterForm({ ...registerForm, apellido: e.target.value })}
                className={inputClass}
              />
            </div>
          </div>
          <div>
            <label className={labelClass}>Email</label>
            <input
              type="email"
              required
              value={registerForm.email}
              onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Teléfono</label>
            <input
              value={registerForm.telefono}
              onChange={(e) => setRegisterForm({ ...registerForm, telefono: e.target.value })}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Contraseña</label>
            <PasswordInput
              required
              minLength={8}
              value={registerForm.password}
              onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
              className={inputClass}
            />
            <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">Mínimo 8 caracteres.</p>
          </div>

          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={cargando}
            className="w-full rounded-full bg-brand-600 py-3 font-semibold text-white hover:bg-brand-700 transition-colors disabled:opacity-60"
          >
            {cargando ? 'Creando cuenta...' : 'Crear cuenta'}
          </button>
        </form>
      )}

      <div className="flex items-center gap-3 my-6">
        <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
        <span className="text-xs text-gray-400 dark:text-gray-500">
          {tab === 'login' ? 'o inicia sesión con' : 'o únete con'}
        </span>
        <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
      </div>

        <GoogleSignInButton onCredential={onGoogleCredential} onError={setError} />
      </div>
    </div>
  );
}
