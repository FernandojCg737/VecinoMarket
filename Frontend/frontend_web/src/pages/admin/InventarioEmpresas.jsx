import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Boxes, Search, ArrowLeft, Store, AlertTriangle, Plus, Minus } from 'lucide-react';
import API from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { esStaff } from '../../utils/roles';

export default function InventarioEmpresas() {
  const { usuario, cargando: cargandoAuth } = useAuth();

  const [empresas, setEmpresas] = useState([]);
  const [q, setQ] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [cargandoEmpresas, setCargandoEmpresas] = useState(true);
  const [error, setError] = useState('');

  const [empresaSel, setEmpresaSel] = useState(null);
  const [inventario, setInventario] = useState([]);
  const [cargandoInventario, setCargandoInventario] = useState(false);
  const [deltas, setDeltas] = useState({});
  const [ajustando, setAjustando] = useState(null);

  function cargarEmpresas() {
    setCargandoEmpresas(true);
    return API.get('catalogo/admin/catalogos-empresas/', { params: { q: busqueda || undefined } })
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

  function cargarInventario() {
    if (!empresaSel) return;
    setCargandoInventario(true);
    return API.get('inventario/admin/inventario/', { params: { empresa: empresaSel.id } })
      .then((res) => setInventario(res.data))
      .catch(() => setError('No se pudo cargar el inventario.'))
      .finally(() => setCargandoInventario(false));
  }

  useEffect(() => {
    if (!empresaSel) return;
    cargarInventario();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empresaSel]);

  if (cargandoAuth) return null;
  if (!usuario) return <Navigate to="/login?next=/admin/inventario" replace />;
  if (!esStaff(usuario)) return <Navigate to="/" replace />;

  function buscarEmpresa(e) {
    e.preventDefault();
    setBusqueda(q);
  }

  function abrirEmpresa(e) {
    setEmpresaSel(e);
    setInventario([]);
  }

  function volverAEmpresas() {
    setEmpresaSel(null);
    cargarEmpresas();
  }

  async function editarStockMinimo(registro, nuevoValor) {
    const valor = parseInt(nuevoValor, 10);
    if (Number.isNaN(valor) || valor < 0 || valor === registro.stock_minimo) return;
    try {
      const { data } = await API.patch(`inventario/admin/inventario/${registro.id}/`, { stock_minimo: valor });
      setInventario((prev) => prev.map((it) => (it.id === registro.id ? data : it)));
    } catch {
      setError('No se pudo actualizar el stock mínimo.');
    }
  }

  async function ajustarStock(registro, signo) {
    const crudo = deltas[registro.id];
    const cantidad = parseInt(crudo, 10);
    if (!crudo || Number.isNaN(cantidad) || cantidad <= 0) {
      setError('Indica una cantidad válida para ajustar el stock.');
      return;
    }
    setAjustando(registro.id);
    setError('');
    try {
      const { data } = await API.post(`inventario/admin/inventario/${registro.id}/ajustar-stock/`, { delta: cantidad * signo });
      setInventario((prev) => prev.map((it) => (it.id === registro.id ? data : it)));
      setDeltas((prev) => ({ ...prev, [registro.id]: '' }));
    } catch (err) {
      setError(err?.response?.data?.detail || 'No se pudo ajustar el stock.');
    } finally {
      setAjustando(null);
    }
  }

  if (empresaSel) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8">
        <button
          onClick={volverAEmpresas}
          className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-brand-600 dark:hover:text-brand-400 mb-4"
        >
          <ArrowLeft size={16} /> Volver a empresas
        </button>

        <div className="flex items-center gap-2 mb-1">
          <Boxes className="text-brand-600 dark:text-brand-400" size={24} />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{empresaSel.razon_social}</h1>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          CU10 · Stock por producto y sucursal. El stock disponible solo se ajusta con +/- (nunca puede quedar negativo).
        </p>

        {error && <p className="text-sm text-red-600 dark:text-red-400 mb-4">{error}</p>}

        {cargandoInventario ? (
          <p className="text-sm text-gray-400">Cargando...</p>
        ) : inventario.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-gray-500 py-8 text-center">Esta empresa no tiene inventario registrado.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-900 text-left text-gray-500 dark:text-gray-400">
                <tr>
                  <th className="px-4 py-3 font-medium">Producto</th>
                  <th className="px-4 py-3 font-medium">Sucursal</th>
                  <th className="px-4 py-3 font-medium">Stock disponible</th>
                  <th className="px-4 py-3 font-medium">Stock mínimo</th>
                  <th className="px-4 py-3 font-medium">Ajustar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800 bg-white dark:bg-gray-900">
                {inventario.map((it) => (
                  <tr key={it.id}>
                    <td className="px-4 py-3 text-gray-800 dark:text-gray-200 font-medium">{it.producto_nombre}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{it.sucursal_nombre}</td>
                    <td className="px-4 py-3">
                      <span className={`font-semibold ${it.stock_bajo ? 'text-amber-600 dark:text-amber-400' : 'text-gray-800 dark:text-gray-200'}`}>
                        {it.cantidad_disponible}
                      </span>
                      {it.stock_bajo && (
                        <span className="ml-1.5 inline-flex items-center gap-0.5 rounded-full bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 text-[10px] font-semibold align-middle">
                          <AlertTriangle size={10} /> Bajo
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        min="0"
                        defaultValue={it.stock_minimo}
                        onBlur={(e) => editarStockMinimo(it, e.target.value)}
                        className="w-16 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          min="1"
                          placeholder="0"
                          value={deltas[it.id] || ''}
                          onChange={(e) => setDeltas((prev) => ({ ...prev, [it.id]: e.target.value }))}
                          className="w-16 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
                        />
                        <button
                          onClick={() => ajustarStock(it, 1)}
                          disabled={ajustando === it.id}
                          className="grid h-7 w-7 place-items-center rounded-full bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-100 disabled:opacity-50"
                          title="Sumar al stock"
                        >
                          <Plus size={14} />
                        </button>
                        <button
                          onClick={() => ajustarStock(it, -1)}
                          disabled={ajustando === it.id}
                          className="grid h-7 w-7 place-items-center rounded-full bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 hover:bg-red-100 disabled:opacity-50"
                          title="Restar del stock"
                        >
                          <Minus size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex items-center gap-2 mb-1">
        <Boxes className="text-brand-600 dark:text-brand-400" size={24} />
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Inventario y stock</h1>
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        CU10 · Busca una empresa para ver y ajustar el stock de sus productos.
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
              onClick={() => abrirEmpresa(e)}
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
