import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { LayoutDashboard, Boxes, Clock, DollarSign, Percent, Star, ShoppingBag } from 'lucide-react';
import API from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { esEmpresaOEmpleado } from '../../utils/roles';
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

export default function DashboardEmpresa() {
  const { usuario, cargando: cargandoAuth } = useAuth();
  const [datos, setDatos] = useState(null);
  const [sinPermiso, setSinPermiso] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!usuario || !esEmpresaOEmpleado(usuario)) return;
    API.get('reportes/mi-dashboard/')
      .then((res) => setDatos(res.data))
      .catch((err) => {
        if (err?.response?.status === 403) setSinPermiso(true);
        else setError('No se pudo cargar tu dashboard.');
      });
  }, [usuario]);

  if (cargandoAuth) return null;
  if (!usuario) return <Navigate to="/login?next=/mi-empresa/dashboard" replace />;
  if (!esEmpresaOEmpleado(usuario)) return <Navigate to="/" replace />;

  if (sinPermiso) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <LayoutDashboard className="mx-auto mb-3 text-gray-300 dark:text-gray-600" size={40} />
        <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">Sin acceso</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          No tienes el permiso "ver_reportes" para ver el dashboard de tu empresa.
          Pídele al dueño de la cuenta que te lo asigne.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="flex items-center justify-between gap-2 mb-1">
        <div className="flex items-center gap-2">
          <LayoutDashboard className="text-brand-600 dark:text-brand-400" size={24} />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Mi dashboard</h1>
        </div>
        {datos && <ExportarReporteMenu url="reportes/mi-dashboard/exportar/" />}
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">CU18 · Métricas de tu empresa.</p>

      {error && <p className="text-sm text-red-600 dark:text-red-400 mb-4">{error}</p>}

      {!datos ? (
        <p className="text-sm text-gray-400">Cargando...</p>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Tarjeta icono={DollarSign} etiqueta="Ventas totales" valor={`Bs ${datos.total_ventas.toFixed(2)}`} color="bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400" />
            <Tarjeta icono={Clock} etiqueta="Pedidos pendientes de pago" valor={datos.pedidos_pendientes} color="bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400" />
            <Tarjeta icono={Boxes} etiqueta="Productos activos" valor={datos.productos_activos} color="bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400" />
            <Tarjeta icono={Star} etiqueta="Valoración" valor={datos.total_valoraciones > 0 ? `${datos.valoracion_promedio} ★ (${datos.total_valoraciones})` : 'Sin reseñas'} color="bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400" />
          </div>

          <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 flex items-center gap-2">
            <Percent size={16} className="text-brand-600 dark:text-brand-400" />
            <span className="text-sm text-gray-600 dark:text-gray-400">Comisión pagada a la plataforma:</span>
            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Bs {datos.total_comisiones.toFixed(2)}</span>
          </div>

          <VentasPorDiaChart datos={datos.ventas_por_dia} />

          <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
            <div className="flex items-center gap-1.5 mb-3">
              <ShoppingBag size={16} className="text-brand-600 dark:text-brand-400" />
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Tus productos más vendidos</p>
            </div>
            {datos.top_productos.length === 0 ? (
              <p className="text-xs text-gray-400">Todavía no tienes ventas.</p>
            ) : datos.top_productos.map((p, i) => (
              <div key={i} className="flex justify-between text-sm py-1 border-b border-gray-50 dark:border-gray-800 last:border-0">
                <span className="text-gray-700 dark:text-gray-300">{i + 1}. {p.producto}</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">{p.unidades} und.</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
