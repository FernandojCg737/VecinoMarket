import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Sparkles, RefreshCw } from 'lucide-react';
import API from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { esComprador } from '../utils/roles';
import SeccionParaTi from '../components/ia/SeccionParaTi';

export default function Recomendaciones() {
  const { usuario, cargando: cargandoAuth } = useAuth();
  const [version, setVersion] = useState(0);
  const [generando, setGenerando] = useState(false);
  const [error, setError] = useState('');

  if (cargandoAuth) return null;
  if (!usuario) return <Navigate to="/login?next=/recomendados" replace />;
  if (!esComprador(usuario)) return <Navigate to="/" replace />;

  // Recalcula en línea con la historia más reciente (los vecinos son los de
  // la última corrida nocturna) y vuelve a pedir la lista.
  async function actualizar() {
    setGenerando(true);
    setError('');
    try {
      await API.post('reportes/mis-recomendaciones/generar/');
      setVersion((v) => v + 1);
    } catch {
      setError('No se pudo actualizar tus recomendaciones.');
    } finally {
      setGenerando(false);
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-8">
        <div className="flex items-start gap-3">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-brand-50 dark:bg-gray-800 text-brand-600 dark:text-brand-400">
            <Sparkles size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Recomendados para ti</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              CU21 · RF44 · Según tu historial de navegación, tus compras y compradores con gustos parecidos
            </p>
          </div>
        </div>
        <button
          onClick={actualizar}
          disabled={generando}
          className="flex items-center gap-1.5 rounded-md bg-brand-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
        >
          <RefreshCw size={14} className={generando ? 'animate-spin' : ''} /> {generando ? 'Actualizando...' : 'Actualizar'}
        </button>
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400 mb-4">{error}</p>}

      <SeccionParaTi limite={20} version={version} />
    </div>
  );
}
