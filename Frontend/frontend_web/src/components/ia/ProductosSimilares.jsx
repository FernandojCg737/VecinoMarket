import { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { obtenerSimilares } from '../../api/ia';
import ProductMiniCard from '../product/ProductMiniCard';

// CU1 (RF44): "Productos similares" al final del detalle de un producto.
// Si no hay similares (o falla), la sección no se muestra.
export default function ProductosSimilares({ productoId, limite = 4 }) {
  const [datos, setDatos] = useState(null);

  useEffect(() => {
    let vigente = true;
    obtenerSimilares(productoId, limite)
      .then((res) => {
        if (vigente) setDatos(res);
      })
      .catch(() => {
        if (vigente) setDatos(null);
      });
    return () => {
      vigente = false;
    };
  }, [productoId, limite]);

  if (!datos || datos.productos.length === 0) return null;

  return (
    <section className="mt-12 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5">
      <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-gray-100">
        <Sparkles size={18} className="text-brand-600 dark:text-brand-400" /> Productos similares
      </h2>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
        {datos.estrategia === 'categoria'
          ? 'Lo más vendido de la misma categoría.'
          : 'Según lo que miran y compran otros clientes y lo parecido que es cada producto.'}
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {datos.productos.map((p) => (
          <ProductMiniCard key={p.id} producto={p} />
        ))}
      </div>
    </section>
  );
}
