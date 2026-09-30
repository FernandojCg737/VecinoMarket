import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { LayoutDashboard, Building2, Users, ShoppingBag, DollarSign, Percent, Star, TrendingUp } from 'lucide-react';
import API from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { esStaff } from '../../utils/roles';
import VentasPorDiaChart from '../../components/dashboard/VentasPorDiaChart';
import ExportarReporteMenu from '../../components/dashboard/ExportarReporteMenu';

function Tarjeta({ icono: Icono, etiqueta, valor, color }) {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
      <div className="flex items-center gap-2 mb-1">
        <div className={`grid h-8 w-8 place-items-center rounded-full ${color}`}>
          <Icono size={16} />
        </div>
        <span className="text-xs text-gray-500 dark:text-gray-400">{etiqueta}</span>
      </div>
      <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{valor}</p>
    </div>
  );
}

export default function DashboardAdmin() {
  const { usuario, cargando: cargandoAuth } = useAuth();
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!usuario || !esStaff(usuario)) return;
    API.get('reportes/admin/dashboard/')
      .then((res) => setDatos(res.data))
      .catch(() => setError('No se pudo cargar el dashboard.'));
  }, [usuario]);

  if (cargandoAuth) return null;
  if (!usuario) return <Navigate to="/login?next=/admin/dashboard" replace />;
  if (!esStaff(usuario)) return <Navigate to="/" replace />;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex items-center justify-between gap-2 mb-1">
        <div className="flex items-center gap-2">
          <LayoutDashboard className="text-brand-600 dark:text-brand-400" size={24} />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Dashboard administrativo</h1>
        </div>
        {datos && <ExportarReporteMenu url="reportes/admin/dashboard/exportar/" />}
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">CU19 · Métricas globales de la plataforma.</p>

      {error && <p className="text-sm text-red-600 dark:text-red-400 mb-4">{error}</p>}

      {!datos ? (
        <p className="text-sm text-gray-400">Cargando...</p>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Tarjeta icono={DollarSign} etiqueta="Ventas totales" valor={`Bs ${datos.total_ventas.toFixed(2)}`} color="bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400" />
            <Tarjeta icono={Percent} etiqueta="Comisiones cobradas" valor={`Bs ${datos.total_comisiones.toFixed(2)}`} color="bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400" />
            <Tarjeta icono={Building2} etiqueta="Empresas" valor={datos.total_empresas} color="bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400" />
            <Tarjeta icono={Star} etiqueta="Valoración promedio" valor={`${datos.valoracion_promedio} ★`} color="bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400" />
          </div>

          <VentasPorDiaChart datos={datos.ventas_por_dia} />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
              <div className="flex items-center gap-1.5 mb-3">
                <TrendingUp size={16} className="text-brand-600 dark:text-brand-400" />
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Top empresas por ventas</p>
              </div>
              {datos.top_empresas.length === 0 ? (
                <p className="text-xs text-gray-400">Sin datos todavía.</p>
              ) : datos.top_empresas.map((e, i) => (
                <div key={i} className="flex justify-between text-sm py-1 border-b border-gray-50 dark:border-gray-800 last:border-0">
                  <span className="text-gray-700 dark:text-gray-300">{i + 1}. {e.empresa}</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">Bs {e.ventas.toFixed(2)}</span>
                </div>
              ))}
            </div>

            <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
              <div className="flex items-center gap-1.5 mb-3">
                <ShoppingBag size={16} className="text-brand-600 dark:text-brand-400" />
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Productos más vendidos</p>
              </div>
              {datos.top_productos.length === 0 ? (
                <p className="text-xs text-gray-400">Sin datos todavía.</p>
              ) : datos.top_productos.map((p, i) => (
                <div key={i} className="flex justify-between text-sm py-1 border-b border-gray-50 dark:border-gray-800 last:border-0">
                  <span className="text-gray-700 dark:text-gray-300">{i + 1}. {p.producto}</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">{p.unidades} und.</span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
              <div className="flex items-center gap-1.5 mb-3">
                <Users size={16} className="text-brand-600 dark:text-brand-400" />
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Usuarios activos por rol</p>
              </div>
              {Object.entries(datos.usuarios_por_rol).map(([rol, total]) => (
                <div key={rol} className="flex justify-between text-sm py-1 border-b border-gray-50 dark:border-gray-800 last:border-0">
                  <span className="text-gray-700 dark:text-gray-300">{rol}</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">{total}</span>
                </div>
              ))}
            </div>

            <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
              <div className="flex items-center gap-1.5 mb-3">
                <ShoppingBag size={16} className="text-brand-600 dark:text-brand-400" />
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Pedidos por estado</p>
              </div>
              {Object.entries(datos.pedidos_por_estado).map(([estado, total]) => (
                <div key={estado} className="flex justify-between text-sm py-1 border-b border-gray-50 dark:border-gray-800 last:border-0">
                  <span className="text-gray-700 dark:text-gray-300">{estado}</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">{total}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
