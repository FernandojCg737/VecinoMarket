import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { ShoppingCart, Search, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import API from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { esStaff } from '../../utils/roles';

const ESTADOS = [
  { value: 'ABIERTO', label: 'Abiertos' },
  { value: 'CONVERTIDO', label: 'Convertidos en pedido' },
  { value: 'ABANDONADO', label: 'Abandonados' },
  { value: '', label: 'Todos' },
];

const INTERVALO_MS = 2500;

export default function Carritos() {
  const { usuario, cargando: cargandoAuth } = useAuth();
  const [carritos, setCarritos] = useState([]);
  const [estado, setEstado] = useState('ABIERTO');
  const [q, setQ] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [error, setError] = useState('');
  const [ultimaActualizacion, setUltimaActualizacion] = useState(null);

  const [expandido, setExpandido] = useState(null);
  const [detalle, setDetalle] = useState({});
  const [cargandoDetalle, setCargandoDetalle] = useState(false);

  const [actualizando, setActualizando] = useState(false);

  function cargarCarritos() {
    setActualizando(true);
    return API.get('pedidos/admin/carritos/', { params: { estado: estado || undefined, q: busqueda || undefined } })
      .then((res) => {
        setCarritos(res.data);
        setUltimaActualizacion(new Date());
        setError('');
      })
      .catch(() => setError('No se pudo cargar los carritos.'))
      .finally(() => setActualizando(false));
  }

  useEffect(() => {
    if (!usuario || !esStaff(usuario)) return;
    cargarCarritos();
    const id = setInterval(cargarCarritos, INTERVALO_MS);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuario, estado, busqueda]);

  if (cargandoAuth) return null;
  if (!usuario) return <Navigate to="/login?next=/admin/carritos" replace />;
  if (!esStaff(usuario)) return <Navigate to="/" replace />;

  function buscar(e) {
    e.preventDefault();
    setBusqueda(q);
  }

  async function toggleExpandir(carrito) {
    if (expandido === carrito.id) {
      setExpandido(null);
      return;
    }
    setExpandido(carrito.id);
    setCargandoDetalle(true);
    try {
      const { data } = await API.get(`pedidos/admin/carritos/${carrito.id}/`);
      setDetalle((prev) => ({ ...prev, [carrito.id]: data.items }));
    } catch {
      setDetalle((prev) => ({ ...prev, [carrito.id]: [] }));
    } finally {
      setCargandoDetalle(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="flex items-center gap-2 mb-1">
        <ShoppingCart className="text-brand-600 dark:text-brand-400" size={24} />
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Carritos de compra</h1>
      </div>
      {ultimaActualizacion && (
        <div className="flex items-center justify-between text-xs text-gray-400 dark:text-gray-500 mb-6">
          <span className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="text-emerald-700 dark:text-emerald-400 font-semibold">En tiempo real</span>
            <span>· se actualiza cada {INTERVALO_MS / 1000}s (última: {ultimaActualizacion.toLocaleTimeString()})</span>
          </span>
          <button
            type="button"
            onClick={cargarCarritos}
            disabled={actualizando}
            className="flex items-center gap-1.5 text-brand-600 hover:text-brand-700 dark:text-brand-400 font-semibold px-2 py-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition disabled:opacity-60"
          >
            <RefreshCw size={12} className={actualizando ? 'animate-spin' : ''} />
            <span>{actualizando ? 'Actualizando...' : 'Actualizar ahora'}</span>
          </button>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <form onSubmit={buscar} className="flex items-center gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nombre o email..."
            className="rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-1.5 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-brand-300"
          />
          <button type="submit" className="grid h-8 w-8 place-items-center rounded-md bg-brand-600 text-white hover:bg-brand-700">
            <Search size={16} />
          </button>
        </form>
        <select
          value={estado}
          onChange={(e) => setEstado(e.target.value)}
          className="rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
        >
          {ESTADOS.map((op) => <option key={op.value} value={op.value}>{op.label}</option>)}
        </select>
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400 mb-4">{error}</p>}

      <div className="space-y-3">
        {carritos.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-gray-500 py-8 text-center">No hay carritos en este estado.</p>
        ) : carritos.map((c) => (
          <div key={c.id} className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
            <button onClick={() => toggleExpandir(c)} className="w-full flex items-center justify-between gap-3 text-left">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-900 dark:text-gray-100">{c.comprador_nombre}</span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      c.estado === 'ABIERTO'
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                        : c.estado === 'CONVERTIDO'
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
                        : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                    }`}
                  >
                    {c.estado === 'ABIERTO' ? 'Activo en vivo' : c.estado === 'CONVERTIDO' ? 'Convertido en compra' : 'Abandonado'}
                  </span>
                </div>
                <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{c.comprador_email}</div>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <span className="text-gray-600 dark:text-gray-400">{c.total_items} ítems</span>
                <span className="font-semibold text-gray-800 dark:text-gray-200">Bs {c.total_monto}</span>
                {expandido === c.id ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
              </div>
            </button>

            {expandido === c.id && (
              <div className="mt-3 border-t border-gray-100 dark:border-gray-800 pt-3">
                {cargandoDetalle && !detalle[c.id] ? (
                  <p className="text-xs text-gray-400">Cargando...</p>
                ) : (detalle[c.id] ?? []).length === 0 ? (
                  <p className="text-xs text-gray-400 dark:text-gray-500">Carrito vacío.</p>
                ) : (
                  <div className="space-y-2">
                    {(detalle[c.id] ?? []).map((it) => (
                      <div key={it.id} className="flex items-center justify-between text-xs py-1 border-b border-gray-50 dark:border-gray-800/50 last:border-0">
                        <div>
                          <span className="text-gray-800 dark:text-gray-200 font-medium">{it.producto_nombre}</span>
                          <span className="text-gray-500 dark:text-gray-400 ml-1.5 font-semibold">× {it.cantidad}</span>
                          {it.empresa_nombre && (
                            <span className="text-[11px] text-brand-600 dark:text-brand-400 ml-2">
                              ({it.empresa_nombre})
                            </span>
                          )}
                        </div>
                        <span className="text-gray-700 dark:text-gray-300 font-semibold">Bs {it.subtotal}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
