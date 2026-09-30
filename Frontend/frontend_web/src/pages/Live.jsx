import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Radio, PlayCircle, Store } from 'lucide-react';
import API from '../api/axios';

export default function Live() {
  const [lives, setLives] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setCargando(true);
    API.get('promociones/lives/')
      .then((res) => setLives(res.data))
      .catch(() => setError('No se pudo cargar las transmisiones en vivo.'))
      .finally(() => setCargando(false));
  }, []);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex items-center gap-2 mb-1">
        <Radio className="text-red-600" size={24} />
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Transmisiones en vivo</h1>
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        CU17 · Empresas vendiendo sus productos en vivo ahora mismo.
      </p>

      {error && <p className="text-sm text-red-600 dark:text-red-400 mb-4">{error}</p>}

      {cargando ? (
        <p className="text-sm text-gray-400">Cargando...</p>
      ) : lives.length === 0 ? (
        <div className="py-20 text-center">
          <Radio className="mx-auto mb-3 text-gray-300 dark:text-gray-600" size={40} />
          <p className="text-sm text-gray-400 dark:text-gray-500">Ninguna empresa está transmitiendo en vivo ahora mismo.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {lives.map((l) => (
            <div key={l.id} className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden">
              <div className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="flex items-center gap-1 rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-bold text-white">
                    <Radio size={10} className="animate-pulse" /> EN VIVO
                  </span>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  {l.empresa_logo_url ? (
                    <img src={l.empresa_logo_url} alt="" className="h-8 w-8 rounded-full object-cover border border-gray-200 dark:border-gray-700" />
                  ) : (
                    <div className="grid h-8 w-8 place-items-center rounded-full bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400">
                      <Store size={14} />
                    </div>
                  )}
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{l.empresa_nombre}</span>
                </div>
                <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">{l.titulo}</h2>

                {l.productos_detalle.length > 0 && (
                  <div className="mb-3 space-y-1">
                    {l.productos_detalle.slice(0, 3).map((p) => (
                      <div key={p.id} className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                        <span className="truncate">{p.nombre}</span>
                        <span className="shrink-0">Bs {p.precio}</span>
                      </div>
                    ))}
                  </div>
                )}

                <Link
                  to={`/live/${l.id}`}
                  className="flex items-center justify-center gap-1.5 rounded-full bg-red-600 py-2 text-sm font-semibold text-white hover:bg-red-700"
                >
                  <PlayCircle size={14} /> Unirme al vivo
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
