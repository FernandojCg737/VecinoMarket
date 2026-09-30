import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Sparkles, RefreshCw } from 'lucide-react';
import API from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { esComprador } from '../utils/roles';

export default function Recomendaciones() {
  const { usuario, cargando: cargandoAuth } = useAuth();
  const [recomendaciones, setRecomendaciones] = useState(null);
  const [generando, setGenerando] = useState(false);
  const [error, setError] = useState('');

  function cargar() {
    return API.get('reportes/mis-recomendaciones/')
      .then((res) => setRecomendaciones(res.data))
      .catch(() => setError('No se pudo cargar tus recomendaciones.'));
  }

  useEffect(() => {
    if (!usuario || !esComprador(usuario)) return;
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuario]);

  if (cargandoAuth) return null;
  if (!usuario) return <Navigate to="/login?next=/recomendados" replace />;
  if (!esComprador(usuario)) return <Navigate to="/" replace />;

  async function generar() {
    setGenerando(true);
    setError('');
    try {
      const { data } = await API.post('reportes/mis-recomendaciones/generar/');
      setRecomendaciones(data.recomendaciones);
    } catch {
      setError('No se pudo generar tus recomendaciones.');
    } finally {
      setGenerando(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex items-center justify-between gap-2 mb-1">
        <div className="flex items-center gap-2">
          <Sparkles className="text-brand-600 dark:text-brand-400" size={24} />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Recomendado para ti</h1>
        </div>
        <button
          onClick={generar}
          disabled={generando}
          className="flex items-center gap-1.5 rounded-md bg-brand-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
        >
          <RefreshCw size={14} className={generando ? 'animate-spin' : ''} /> {generando ? 'Generando...' : 'Actualizar'}
        </button>
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        CU21 · Productos sugeridos según lo que compraron compradores con gustos parecidos a los tuyos.
      </p>

      {error && <p className="text-sm text-red-600 dark:text-red-400 mb-4">{error}</p>}

      {!recomendaciones ? (
        <p className="text-sm text-gray-400">Cargando...</p>
      ) : recomendaciones.length === 0 ? (
        <div className="text-center py-16">
          <Sparkles className="mx-auto mb-3 text-gray-300 dark:text-gray-600" size={40} />
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Todavía no tenemos recomendaciones para ti.</p>
          <button onClick={generar} disabled={generando} className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60">
            {generando ? 'Generando...' : 'Generar recomendaciones'}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {recomendaciones.map((r, i) => (
            <Link
              key={i}
              to={`/productos?q=${encodeURIComponent(r.producto_nombre)}`}
              className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden hover:border-brand-400 dark:hover:border-brand-500 hover:shadow-sm transition"
            >
              <div className="aspect-square bg-gray-100 dark:bg-gray-800">
                {r.imagen_url && <img src={r.imagen_url} alt={r.producto_nombre} className="h-full w-full object-cover" />}
              </div>
              <div className="p-3">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 line-clamp-2">{r.producto_nombre}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500">{r.empresa_nombre}</p>
                <p className="text-sm font-bold text-brand-600 dark:text-brand-400 mt-1">Bs {Number(r.producto_precio).toFixed(2)}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
