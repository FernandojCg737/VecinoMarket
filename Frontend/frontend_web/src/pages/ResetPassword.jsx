import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import API from '../api/axios';
import PasswordInput from '../components/ui/PasswordInput';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const uid = searchParams.get('uid');
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);
  const [listo, setListo] = useState(false);

  if (!uid || !token) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Link inválido</h1>
        <p className="text-gray-500 dark:text-gray-400 mb-6">
          Este link de recuperación no es válido. Solicita uno nuevo.
        </p>
        <Link to="/olvide-password" className="font-medium text-brand-600 dark:text-brand-400 hover:underline">
          Solicitar link de recuperación
        </Link>
      </div>
    );
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    if (password !== confirmar) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    setCargando(true);
    try {
      await API.post('usuarios/auth/confirmar-reset/', { uid, token, password });
      setListo(true);
    } catch (err) {
      const data = err?.response?.data;
      const mensaje = data?.non_field_errors?.[0] || data?.password?.[0];
      setError(mensaje || 'No se pudo restablecer la contraseña. El link puede haber expirado.');
    } finally {
      setCargando(false);
    }
  }

  if (listo) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <CheckCircle2 size={48} className="mx-auto text-green-600 dark:text-green-400 mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Contraseña actualizada</h1>
        <p className="text-gray-500 dark:text-gray-400 mb-6">Ya puedes ingresar con tu nueva contraseña.</p>
        <button
          onClick={() => navigate('/login')}
          className="rounded-full bg-brand-600 px-6 py-3 font-semibold text-white hover:bg-brand-700"
        >
          Ir a ingresar
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1">Elige tu nueva contraseña</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Mínimo 8 caracteres.</p>

      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nueva contraseña</label>
          <PasswordInput
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Confirma la contraseña</label>
          <PasswordInput
            required
            minLength={8}
            value={confirmar}
            onChange={(e) => setConfirmar(e.target.value)}
            className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
          />
        </div>

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={cargando}
          className="w-full rounded-full bg-brand-600 py-3 font-semibold text-white hover:bg-brand-700 transition-colors disabled:opacity-60"
        >
          {cargando ? 'Guardando...' : 'Restablecer contraseña'}
        </button>
      </form>
    </div>
  );
}
