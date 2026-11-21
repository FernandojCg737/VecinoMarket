import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, Tag, Boxes, Sparkles, Bell, Building2, Filter } from 'lucide-react';
import API from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { esEmpresaOEmpleado, esStaff } from '../../utils/roles';

export default function DemandaDeseosEmpresa() {
  const { usuario } = useAuth();
  const [productos, setProductos] = useState([]);
  const [empresas, setEmpresas] = useState([]);
  const [empresaFiltro, setEmpresaFiltro] = useState('');
  const [cargando, setCargando] = useState(true);

  const esAdmin = esStaff(usuario);

  const cargarDatos = (empresaId = '') => {
    setCargando(true);
    const params = empresaId ? { empresa_id: empresaId } : {};
    API.get('pedidos/wishlist/demanda-empresa/', { params })
      .then((res) => {
        setProductos(res.data?.productos || []);
        if (res.data?.empresas) {
          setEmpresas(res.data.empresas);
        }
      })
      .catch((err) => {
        console.error('Error al cargar lista de deseos:', err);
      })
      .finally(() => setCargando(false));
  };

  useEffect(() => {
    if (!usuario) return;
    if (!esEmpresaOEmpleado(usuario) && !esAdmin) return;
    cargarDatos(empresaFiltro);
  }, [usuario, empresaFiltro]);

  const totalDeseosAcumulados = productos.reduce((acc, p) => acc + (p.total_deseados || 0), 0);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 space-y-6 animate-in fade-in duration-200">
      {/* Cabecera oficial del Caso de Uso */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-200 dark:border-gray-800 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400">
              <Heart size={22} className="fill-rose-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                Gestionar Lista de Deseos y Alertas de Precio
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {esAdmin
                  ? 'CU30 · Supervisión Multi-tenant: Demanda de productos guardados en listas de deseos y alertas de rebajas activas.'
                  : 'CU30 · Productos de tu empresa guardados por compradores en su lista de deseos y alertas de precio activas.'}
              </p>
            </div>
          </div>
        </div>

        {esAdmin ? (
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-gray-400" />
            <select
              value={empresaFiltro}
              onChange={(e) => setEmpresaFiltro(e.target.value)}
              className="text-sm rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">Todas las empresas (Multi-tenant)</option>
              {empresas.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.razon_social || emp.nombre_comercial}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <Link
            to="/mi-empresa/promociones"
            className="inline-flex items-center gap-2 rounded-xl bg-brand-600 hover:bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition"
          >
            <Tag size={16} /> Crear promoción
          </Link>
        )}
      </div>

      {/* Tarjetas resumen */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
            <Boxes size={15} /> Productos Deseados
          </div>
          <p className="text-2xl font-black text-gray-900 dark:text-gray-100">{productos.length}</p>
          <p className="text-xs text-gray-500">
            {esAdmin ? 'En toda la plataforma' : 'En tu catálogo de empresa'}
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-rose-600 dark:text-rose-400">
            <Heart size={15} className="fill-rose-500" /> Total Deseos Guardados
          </div>
          <p className="text-2xl font-black text-rose-600 dark:text-rose-400">{totalDeseosAcumulados}</p>
          <p className="text-xs text-gray-500">Compradores con interés directo</p>
        </div>

        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
            <Bell size={15} /> Alertas de Precio
          </div>
          <p className="text-sm font-bold text-gray-800 dark:text-gray-200 mt-1">
            Disparador en tiempo real
          </p>
          <p className="text-xs text-gray-500">Notifica al rebajar precio</p>
        </div>
      </div>

      {/* Lista de productos con demanda */}
      {cargando ? (
        <div className="py-20 text-center text-gray-400">Cargando productos en lista de deseos...</div>
      ) : productos.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 p-12 text-center space-y-3">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-gray-100 dark:bg-gray-800 text-gray-400">
            <Heart size={28} />
          </div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
            Aún no hay productos en la lista de deseos
          </h3>
          <p className="text-sm text-gray-500 max-w-md mx-auto">
            {esAdmin
              ? 'Cuando los compradores añadan productos a su lista de deseos en cualquier tienda, aparecerán aquí agrupados.'
              : 'Cuando los clientes guarden tus productos en su lista de deseos o activen alertas de precio, aparecerán reflejados aquí.'}
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden shadow-xs">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-800 dark:text-gray-200">
              Productos con compradores interesados
            </h2>
            <span className="text-xs text-gray-500">Ordenados por mayor cantidad de deseos</span>
          </div>

          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {productos.map((prod) => (
              <div
                key={prod.producto_id}
                className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-gray-50/50 dark:hover:bg-gray-800/40 transition"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <img
                    src={prod.imagen || '/placeholder.png'}
                    alt={prod.nombre}
                    className="h-14 w-14 rounded-xl object-cover border border-gray-200 dark:border-gray-700 shrink-0"
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link
                        to={`/productos/${prod.producto_id}`}
                        className="font-bold text-gray-900 dark:text-gray-100 hover:text-brand-600 transition truncate block text-base"
                      >
                        {prod.nombre}
                      </Link>
                      {esAdmin && prod.empresa_nombre && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900">
                          <Building2 size={11} />
                          {prod.empresa_nombre}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Precio de catálogo: <span className="font-semibold text-gray-700 dark:text-gray-300">Bs {prod.precio_actual.toFixed(2)}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 sm:gap-6 shrink-0">
                  <div className="text-left sm:text-right">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 font-bold text-xs border border-rose-200 dark:border-rose-900/60">
                      <Heart size={13} className="fill-rose-500 text-rose-500" />
                      {prod.total_deseados} {prod.total_deseados === 1 ? 'cliente interesado' : 'clientes interesados'}
                    </span>
                    <p className="text-[11px] text-gray-400 mt-1">Con alerta de precio activa</p>
                  </div>

                  {!esAdmin && (
                    <Link
                      to="/mi-empresa/promociones"
                      className="inline-flex items-center gap-1.5 rounded-xl bg-brand-600 hover:bg-brand-700 px-3.5 py-2 text-xs font-semibold text-white shadow-xs transition"
                    >
                      <Sparkles size={14} /> Aplicar oferta
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
