import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, TrendingUp } from 'lucide-react';
import { notaReputacion, obtenerRecomendaciones } from '../../api/ia';
import ProductCard from '../product/ProductCard';
import { useAuth } from '../../context/AuthContext';
import { esComprador } from '../../utils/roles';

export function AvisoArranqueEnFrio() {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-dashed border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
        <TrendingUp size={18} />
      </div>
      <div>
        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Aún estamos conociendo tus gustos</p>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Te mostramos lo más vendido de los últimos 30 días. A medida que navegues y compres, esta sección se adapta a ti.
        </p>
      </div>
    </div>
  );
}

// CU1 (RF44): grilla "Para ti" (Home y /recomendados). Con estrategia
// 'popular' (sin historial o invitado) cambia el título y muestra el aviso.
// `version` fuerza una recarga (por ej. después de "Actualizar").
export default function SeccionParaTi({ limite = 8, verTodos = false, version = 0, compacta = false }) {
  const { usuario } = useAuth();
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let vigente = true;
    obtenerRecomendaciones(limite)
      .then((res) => {
        if (!vigente) return;
        setDatos(res);
        setError('');
      })
      .catch(() => {
        if (vigente) setError('No se pudieron cargar tus recomendaciones.');
      });
    return () => {
      vigente = false;
    };
  }, [limite, version]);

  // En el Home, si no hay nada que mostrar, la sección simplemente no aparece.
  if (compacta && (error || (datos && datos.productos.length === 0))) return null;

  const popular = datos?.estrategia === 'popular';

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-xl font-bold text-gray-900 dark:text-gray-100">
          {popular ? <TrendingUp size={20} className="text-brand-600 dark:text-brand-400" /> : <Sparkles size={20} className="text-brand-600 dark:text-brand-400" />}
          {popular ? 'Lo más vendido' : 'Para ti'}
        </h2>
        {verTodos && (
          // /recomendados es del comprador; el invitado va al catálogo.
          <Link to={esComprador(usuario) ? '/recomendados' : '/productos'} className="text-sm font-medium text-brand-600 dark:text-brand-400 hover:underline">
            Ver todos
          </Link>
        )}
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      {!datos && !error ? (
        <p className="text-sm text-gray-400">Cargando...</p>
      ) : datos && datos.productos.length === 0 ? (
        <div className="text-center py-12">
          <Sparkles className="mx-auto mb-3 text-gray-300 dark:text-gray-600" size={40} />
          <p className="text-sm text-gray-500 dark:text-gray-400">Todavía no hay productos para recomendarte.</p>
        </div>
      ) : datos ? (
        <>
          {popular && !compacta && <AvisoArranqueEnFrio />}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {datos.productos.map((p) => (
              <ProductCard
                key={p.id}
                producto={p}
                insignia={popular ? null : { texto: 'Para ti', icono: Sparkles }}
                nota={notaReputacion(p)}
              />
            ))}
          </div>
        </>
      ) : null}
    </section>
  );
}
