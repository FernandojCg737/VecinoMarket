import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, Building2, Eye, Tag } from 'lucide-react';
import API from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { esStaff } from '../../utils/roles';

export default function WidgetDemandaDeseos() {
  const { usuario } = useAuth();
  const [productosDeseados, setProductosDeseados] = useState([]);
  const [cargando, setCargando] = useState(true);
  const esAdmin = esStaff(usuario);

  useEffect(() => {
    API.get('pedidos/wishlist/demanda-empresa/')
      .then((res) => {
        setProductosDeseados(res.data?.productos || []);
      })
      .catch((err) => {
        console.error('Error cargando demanda de deseos:', err);
      })
      .finally(() => setCargando(false));
  }, []);

  if (cargando) return null;
  if (productosDeseados.length === 0) return null;

  return (
    <div className="rounded-2xl border border-rose-200 dark:border-rose-900/50 bg-gradient-to-br from-rose-50/50 via-white to-white dark:from-rose-950/20 dark:via-gray-900 dark:to-gray-900 p-5 shadow-xs space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="grid h-8 w-8 place-items-center rounded-xl bg-rose-100 dark:bg-rose-900/60 text-rose-600 dark:text-rose-400">
            <Heart size={16} className="fill-rose-500" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">
              {esAdmin ? 'Lista de Deseos y Alertas (Multi-tenant)' : 'Lista de Deseos y Alertas de Precio'}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {esAdmin
                ? 'CU30 · Demanda de productos guardados en listas de deseos en toda la plataforma.'
                : 'CU30 · Clientes que tienen tus productos en lista de deseos esperando rebaja.'}
            </p>
          </div>
        </div>

        <Link
          to={esAdmin ? '/admin/deseos' : '/mi-empresa/deseos'}
          className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 px-3 py-1.5 text-xs font-semibold text-white shadow-xs transition"
        >
          <Eye size={13} /> Ver gestión completa
        </Link>
      </div>

      <div className="divide-y divide-gray-100 dark:divide-gray-800">
        {productosDeseados.slice(0, 5).map((p) => (
          <div key={p.producto_id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5 min-w-0">
              {p.imagen ? (
                <img src={p.imagen} alt={p.nombre} className="h-9 w-9 rounded-lg object-cover shrink-0" />
              ) : (
                <div className="h-9 w-9 rounded-lg bg-gray-100 dark:bg-gray-800 grid place-items-center shrink-0">
                  <Heart size={12} className="text-gray-400" />
                </div>
              )}
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <p className="font-medium text-gray-900 dark:text-gray-100 truncate">{p.nombre}</p>
                  {esAdmin && p.empresa_nombre && (
                    <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.2 rounded bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                      <Building2 size={10} /> {p.empresa_nombre}
                    </span>
                  )}
                </div>
                <p className="text-gray-500 dark:text-gray-400">Precio de catálogo: Bs {p.precio_actual.toFixed(2)}</p>
              </div>
            </div>

            <div className="text-right shrink-0">
              <span className="inline-flex items-center gap-1 font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 px-2 py-0.5 rounded-full">
                <Heart size={11} className="fill-rose-500" />
                {p.total_deseados} {p.total_deseados === 1 ? 'cliente' : 'clientes'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
