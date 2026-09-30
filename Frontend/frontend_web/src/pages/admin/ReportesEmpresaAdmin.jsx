import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { LayoutDashboard, Search, ArrowLeft, Store, Boxes, Clock, DollarSign, Percent, Star, ShoppingBag } from 'lucide-react';
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

export default function ReportesEmpresaAdmin() {
  const { usuario, cargando: cargandoAuth } = useAuth();

  const [empresas, setEmpresas] = useState([]);
  const [q, setQ] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [cargandoEmpresas, setCargandoEmpresas] = useState(true);
  const [error, setError] = useState('');

  const [empresaSel, setEmpresaSel] = useState(null);
  const [datos, setDatos] = useState(null);

  function cargarEmpresas() {
    setCargandoEmpresas(true);
    return API.get('reportes/admin/dashboard-empresas/', { params: { q: busqueda || undefined } })
      .then((res) => {
        setEmpresas(res.data);
        setError('');
      })
      .catch(() => setError('No se pudo cargar las empresas.'))
      .finally(() => setCargandoEmpresas(false));
  }

  useEffect(() => {
    if (!usuario || !esStaff(usuario)) return;
    cargarEmpresas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuario, busqueda]);

  useEffect(() => {
    if (!empresaSel) return;
    setDatos(null);
    API.get(`reportes/admin/dashboard-empresas/${empresaSel.id}/`)
      .then((res) => setDatos(res.data))
      .catch(() => setError('No se pudo cargar el dashboard de esta empresa.'));
  }, [empresaSel]);

  if (cargandoAuth) return null;
  if (!usuario) return <Navigate to="/login?next=/admin/reportes-empresa" replace />;
  if (!esStaff(usuario)) return <Navigate to="/" replace />;

  function buscarEmpresa(e) {
    e.preventDefault();
    setBusqueda(q);
  }

  if (empresaSel) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8">
        <button
          onClick={() => { setEmpresaSel(null); setDatos(null); }}
          className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-brand-600 dark:hover:text-brand-400 mb-4"
        >
          <ArrowLeft size={16} /> Volver a empresas
        </button>

        <div className="flex items-center justify-between gap-2 mb-1">
          <div className="flex items-center gap-2">
            <LayoutDashboard className="text-brand-600 dark:text-brand-400" size={24} />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{empresaSel.razon_social}</h1>
          </div>
          {datos && <ExportarReporteMenu url={`reportes/admin/dashboard-empresas/${empresaSel.id}/exportar/`} />}
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">CU18 · Dashboard de esta empresa (solo lectura).</p>

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
              <span className="text-sm text-gray-600 dark:text-gray-400">Comisión generada para la plataforma:</span>
              <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Bs {datos.total_comisiones.toFixed(2)}</span>
            </div>

            <VentasPorDiaChart datos={datos.ventas_por_dia} />

            <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
              <div className="flex items-center gap-1.5 mb-3">
                <ShoppingBag size={16} className="text-brand-600 dark:text-brand-400" />
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Productos más vendidos</p>
              </div>
              {datos.top_productos.length === 0 ? (
                <p className="text-xs text-gray-400">Todavía no tiene ventas.</p>
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

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex items-center gap-2 mb-1">
        <LayoutDashboard className="text-brand-600 dark:text-brand-400" size={24} />
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Dashboard y reportes de empresa</h1>
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        CU18 · Busca una empresa para ver sus métricas de ventas, pedidos y reputación.
      </p>

      <form onSubmit={buscarEmpresa} className="flex items-center gap-2 mb-6">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar empresa por razón social..."
          className="rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-1.5 text-sm w-72 focus:outline-none focus:ring-2 focus:ring-brand-300"
        />
        <button type="submit" className="grid h-8 w-8 place-items-center rounded-md bg-brand-600 text-white hover:bg-brand-700">
          <Search size={16} />
        </button>
      </form>

      {error && <p className="text-sm text-red-600 dark:text-red-400 mb-4">{error}</p>}

      {cargandoEmpresas ? (
        <p className="text-sm text-gray-400">Cargando...</p>
      ) : empresas.length === 0 ? (
        <p className="text-sm text-gray-400">No se encontraron empresas.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {empresas.map((e) => (
            <button
              key={e.id}
              onClick={() => setEmpresaSel(e)}
              className="text-left rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 hover:border-brand-400 dark:hover:border-brand-500 hover:shadow-sm transition"
            >
              <div className="flex items-center gap-3">
                {e.logo_url ? (
                  <img src={e.logo_url} alt="" className="h-10 w-10 rounded-full object-cover border border-gray-200 dark:border-gray-700" />
                ) : (
                  <div className="grid h-10 w-10 place-items-center rounded-full bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400">
                    <Store size={18} />
                  </div>
                )}
                <div>
                  <div className="font-semibold text-gray-900 dark:text-gray-100 leading-tight">{e.razon_social}</div>
                  {e.ciudad && <div className="text-xs text-gray-400 dark:text-gray-500">{e.ciudad}</div>}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
