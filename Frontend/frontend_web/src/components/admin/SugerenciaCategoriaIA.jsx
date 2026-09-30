import { useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import API from '../../api/axios';

export default function SugerenciaCategoriaIA({ productoId, tieneImagenes, onAplicar, url }) {
  const [cargando, setCargando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [error, setError] = useState('');

  async function sugerir() {
    setCargando(true);
    setError('');
    setResultado(null);
    try {
      const { data } = await API.post(url || `catalogo/admin/productos/${productoId}/sugerir-categoria/`);
      setResultado(data);
    } catch (err) {
      setError(err?.response?.data?.detail || 'No se pudo obtener una sugerencia.');
    } finally {
      setCargando(false);
    }
  }

  if (!tieneImagenes) return null;

  return (
    <div className="rounded-md border border-dashed border-brand-300 dark:border-brand-700 bg-brand-50/50 dark:bg-brand-900/10 p-3">
      <p className="text-[11px] text-gray-400 dark:text-gray-500 mb-1.5">
        <span className="font-semibold text-brand-600 dark:text-brand-400">CU08</span> · Categorizar producto mediante visión artificial
      </p>
      <button
        type="button"
        onClick={sugerir}
        disabled={cargando}
        className="flex items-center gap-1.5 text-xs font-semibold text-brand-700 dark:text-brand-400 hover:text-brand-800 disabled:opacity-60"
      >
        {cargando ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
        {cargando ? 'Analizando imagen...' : 'Sugerir categoría con IA'}
      </button>

      {error && <p className="text-xs text-red-600 dark:text-red-400 mt-2">{error}</p>}

      {resultado && (
        <div className="mt-2 text-xs">
          {resultado.categoria_sugerida ? (
            <div className="flex items-center justify-between gap-2">
              <span className="text-gray-700 dark:text-gray-300">
                Sugerencia: <strong>{resultado.categoria_sugerida.nombre}</strong> ({resultado.confianza}% de confianza)
              </span>
              <button
                type="button"
                onClick={() => onAplicar(resultado.categoria_sugerida.id)}
                className="shrink-0 rounded-full bg-brand-600 px-2.5 py-1 text-white font-medium hover:bg-brand-700"
              >
                Usar
              </button>
            </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400">
              La IA detectó "{resultado.alternativas?.[0]?.nombre}" en la imagen, pero no encontró una categoría de tu catálogo que corresponda.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
