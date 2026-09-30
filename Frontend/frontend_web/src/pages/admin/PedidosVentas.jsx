import { Fragment, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { ClipboardList, Search, ChevronLeft, ChevronRight, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import API from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { esStaff } from '../../utils/roles';

const ESTADOS_PEDIDO = [
  { value: '', label: 'Todos los estados' },
  { value: 'PENDIENTE', label: 'Pendiente' },
  { value: 'CONFIRMADO', label: 'Confirmado' },
  { value: 'EN_PREPARACION', label: 'En preparación' },
  { value: 'ENVIADO', label: 'Enviado' },
  { value: 'ENTREGADO', label: 'Entregado' },
  { value: 'CANCELADO', label: 'Cancelado' },
];

const METODOS_PAGO = [
  { value: '', label: 'Todos los métodos' },
  { value: 'TARJETA', label: 'Tarjeta' },
  { value: 'QR', label: 'QR' },
];

function badgeEstado(estado) {
  if (estado === 'ENTREGADO') return 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400';
  if (estado === 'CANCELADO') return 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400';
  if (estado === 'ENVIADO') return 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400';
  return 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400';
}

function badgeEstadoPago(estado) {
  if (estado === 'PAGADO') return 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400';
  if (estado === 'FALLIDO' || estado === 'REEMBOLSADO') return 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400';
  return 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400';
}

export default function PedidosVentas() {
  const { usuario, cargando: cargandoAuth } = useAuth();
  const [tipo, setTipo] = useState('venta');
  const [resultados, setResultados] = useState([]);
  const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [empresas, setEmpresas] = useState([]);
  const [filtroEmpresa, setFiltroEmpresa] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [filtroMetodo, setFiltroMetodo] = useState('');
  const [q, setQ] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [error, setError] = useState('');
  const [expandido, setExpandido] = useState(null);

  const porPagina = 30;

  function cargarPedidos() {
    return API.get('pedidos/admin/pedidos/', {
      params: {
        tipo, page: pagina,
        empresa: filtroEmpresa || undefined,
        estado: filtroEstado || undefined,
        metodo_pago: filtroMetodo || undefined,
        q: busqueda || undefined,
      },
    })
      .then((res) => {
        setResultados(res.data.results);
        setTotal(res.data.count);
        setError('');
      })
      .catch(() => setError('No se pudo cargar los pedidos.'));
  }

  useEffect(() => {
    if (!usuario || !esStaff(usuario)) return;
    cargarPedidos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuario, tipo, pagina, filtroEmpresa, filtroEstado, filtroMetodo, busqueda]);

  useEffect(() => {
    if (!usuario || !esStaff(usuario)) return;
    API.get('usuarios/empresas/lista/', { params: { page_size: 100 } }).then((res) => setEmpresas(res.data.results)).catch(() => {});
  }, [usuario]);

  if (cargandoAuth) return null;
  if (!usuario) return <Navigate to="/login?next=/admin/pedidos" replace />;
  if (!esStaff(usuario)) return <Navigate to="/" replace />;

  function cambiarTipo(nuevo) {
    setTipo(nuevo);
    setPagina(1);
  }

  function buscar(e) {
    e.preventDefault();
    setPagina(1);
    setBusqueda(q);
  }

  async function cambiarEstado(pedido, nuevoEstado) {
    try {
      const { data } = await API.patch(`pedidos/admin/pedidos/${pedido.id}/`, { estado: nuevoEstado });
      setResultados((prev) => prev.map((p) => (p.id === pedido.id ? data : p)));
    } catch {
      setError('No se pudo actualizar el estado.');
    }
  }

  async function eliminar(pedido) {
    if (!window.confirm(`¿Eliminar el pedido "${pedido.numero_pedido}"?`)) return;
    try {
      await API.delete(`pedidos/admin/pedidos/${pedido.id}/`);
      await cargarPedidos();
    } catch {
      setError('No se pudo eliminar el pedido.');
    }
  }

  const totalPaginas = Math.max(1, Math.ceil(total / porPagina));

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex items-center gap-2 mb-1">
        <ClipboardList className="text-brand-600 dark:text-brand-400" size={24} />
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Pedidos y ventas</h1>
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        CU12 · "Pedido" = pago pendiente, "Venta" = ya pagado. Ver, editar y eliminar de cualquier empresa.
      </p>

      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={() => cambiarTipo('venta')}
          className={`rounded-full px-4 py-1.5 text-sm font-semibold ${tipo === 'venta' ? 'bg-brand-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'}`}
        >
          Ventas
        </button>
        <button
          onClick={() => cambiarTipo('pedido')}
          className={`rounded-full px-4 py-1.5 text-sm font-semibold ${tipo === 'pedido' ? 'bg-brand-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'}`}
        >
          Pedidos (pago pendiente)
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <form onSubmit={buscar} className="flex items-center gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por número o comprador..."
            className="rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-1.5 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-brand-300"
          />
          <button type="submit" className="grid h-8 w-8 place-items-center rounded-md bg-brand-600 text-white hover:bg-brand-700">
            <Search size={16} />
          </button>
        </form>
        <select
          value={filtroEmpresa}
          onChange={(e) => { setFiltroEmpresa(e.target.value); setPagina(1); }}
          className="rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
        >
          <option value="">Todas las empresas</option>
          {empresas.map((e) => <option key={e.id} value={e.id}>{e.razon_social}</option>)}
        </select>
        <select
          value={filtroEstado}
          onChange={(e) => { setFiltroEstado(e.target.value); setPagina(1); }}
          className="rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
        >
          {ESTADOS_PEDIDO.map((op) => <option key={op.value} value={op.value}>{op.label}</option>)}
        </select>
        <select
          value={filtroMetodo}
          onChange={(e) => { setFiltroMetodo(e.target.value); setPagina(1); }}
          className="rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
        >
          {METODOS_PAGO.map((op) => <option key={op.value} value={op.value}>{op.label}</option>)}
        </select>
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400 mb-4">{error}</p>}

      <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-900 text-left text-gray-500 dark:text-gray-400">
            <tr>
              <th className="px-4 py-3 font-medium">Pedido</th>
              <th className="px-4 py-3 font-medium">Empresa</th>
              <th className="px-4 py-3 font-medium">Comprador</th>
              <th className="px-4 py-3 font-medium">Método pago</th>
              <th className="px-4 py-3 font-medium">Pago</th>
              <th className="px-4 py-3 font-medium">Fecha</th>
              <th className="px-4 py-3 font-medium">Estado</th>
              <th className="px-4 py-3 font-medium text-right">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800 bg-white dark:bg-gray-900">
            {resultados.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400 dark:text-gray-500">Sin resultados.</td></tr>
            ) : resultados.map((p) => (
              <Fragment key={p.id}>
                <tr>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setExpandido((prev) => (prev === p.id ? null : p.id))}
                      className="flex items-center gap-1 font-medium text-gray-800 dark:text-gray-200"
                    >
                      {expandido === p.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      {p.numero_pedido}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{p.empresa_nombre}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{p.comprador_nombre}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{p.metodo_pago}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${badgeEstadoPago(p.estado_pago)}`}>{p.estado_pago}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400 text-xs">{new Date(p.fecha).toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <select
                      value={p.estado}
                      onChange={(e) => cambiarEstado(p, e.target.value)}
                      className={`rounded-full border-0 px-2 py-0.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-300 ${badgeEstado(p.estado)}`}
                    >
                      {ESTADOS_PEDIDO.filter((op) => op.value).map((op) => <option key={op.value} value={op.value}>{op.label}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => eliminar(p)}
                      className="grid h-8 w-8 place-items-center rounded-full bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 hover:bg-red-100 ml-auto"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
                {expandido === p.id && (
                  <tr>
                    <td colSpan={8} className="px-4 py-3 bg-gray-50 dark:bg-gray-900/40">
                      <div className="space-y-1">
                        {p.items.map((it) => (
                          <div key={it.id} className="flex items-center justify-between text-xs">
                            <span className="text-gray-700 dark:text-gray-300">{it.producto_nombre} × {it.cantidad}</span>
                            <span className="text-gray-500 dark:text-gray-400">Bs {it.subtotal}</span>
                          </div>
                        ))}
                        <div className="flex items-center justify-between text-xs pt-1 border-t border-gray-200 dark:border-gray-700 mt-1">
                          <span className="text-gray-500 dark:text-gray-400">Comisión de la plataforma</span>
                          <span className="text-gray-500 dark:text-gray-400">Bs {p.comision_monto}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs font-semibold">
                          <span className="text-gray-700 dark:text-gray-300">Subtotal</span>
                          <span className="text-gray-800 dark:text-gray-200">Bs {p.subtotal}</span>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between mt-4 text-sm text-gray-600 dark:text-gray-400">
        <span>{total} en total</span>
        <div className="flex items-center gap-2">
          <button onClick={() => setPagina((p) => Math.max(1, p - 1))} disabled={pagina <= 1}
            className="grid h-8 w-8 place-items-center rounded-full border border-gray-300 dark:border-gray-700 disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-gray-800">
            <ChevronLeft size={16} />
          </button>
          <span>Página {pagina} de {totalPaginas}</span>
          <button onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))} disabled={pagina >= totalPaginas}
            className="grid h-8 w-8 place-items-center rounded-full border border-gray-300 dark:border-gray-700 disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-gray-800">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
