import { useState } from 'react';
import { Link } from 'react-router-dom';
import { MailCheck } from 'lucide-react';
import API from '../api/axios';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [enviado, setEnviado] = useState(false);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setCargando(true);
    try {
      await API.post('usuarios/auth/solicitar-reset/', { email });
      setEnviado(true);
    } catch {
      setError('No se pudo enviar la solicitud. Intenta de nuevo.');
    } finally {
      setCargando(false);
    }
  }

  if (enviado) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <MailCheck size={48} className="mx-auto text-green-600 dark:text-green-400 mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Revisa tu correo</h1>
        <p className="text-gray-500 dark:text-gray-400">
          Si <strong className="text-gray-700 dark:text-gray-300">{email}</strong> está registrado en VecinoMarket,
          te enviamos un link para elegir una nueva contraseña.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1">Recupera tu contraseña</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        Ingresa el email de tu cuenta y te mandamos un link para restablecerla.
      </p>

      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
          />
        </div>

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={cargando}
          className="w-full rounded-full bg-brand-600 py-3 font-semibold text-white hover:bg-brand-700 transition-colors disabled:opacity-60"
        >
          {cargando ? 'Enviando...' : 'Enviar link de recuperación'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
        <Link to="/login" className="font-medium text-brand-600 dark:text-brand-400 hover:underline">
          Volver a ingresar
        </Link>
      </p>
    </div>
  );
}
