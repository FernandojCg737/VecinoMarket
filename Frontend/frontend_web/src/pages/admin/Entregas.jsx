import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Truck, ChevronLeft, ChevronRight, Trash2, CheckCircle2 } from 'lucide-react';
import API from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { esStaff } from '../../utils/roles';

const ESTADOS_ENTREGA = [
  { value: '', label: 'Todos los estados' },
  { value: 'PENDIENTE', label: 'Pendiente' },
  { value: 'EN_CAMINO', label: 'En camino' },
  { value: 'ENTREGADA', label: 'Entregada' },
  { value: 'CANCELADA', label: 'Cancelada' },
];

function badgeEstado(estado) {
  if (estado === 'ENTREGADA') return 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400';
  if (estado === 'CANCELADA') return 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400';
  if (estado === 'EN_CAMINO') return 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400';
  return 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400';
}

export default function Entregas() {
  const { usuario, cargando: cargandoAuth } = useAuth();
  const [resultados, setResultados] = useState([]);
  const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [empresas, setEmpresas] = useState([]);
  const [filtroEmpresa, setFiltroEmpresa] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [error, setError] = useState('');

  const porPagina = 30;

  function cargarEntregas() {
    return API.get('pedidos/admin/entregas/', {
      params: { page: pagina, empresa: filtroEmpresa || undefined, estado: filtroEstado || undefined },
    })
      .then((res) => {
        setResultados(res.data.results);
        setTotal(res.data.count);
        setError('');
      })
      .catch(() => setError('No se pudo cargar las entregas.'));
  }

  useEffect(() => {
    if (!usuario || !esStaff(usuario)) return;
    cargarEntregas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuario, pagina, filtroEmpresa, filtroEstado]);

  useEffect(() => {
    if (!usuario || !esStaff(usuario)) return;
    API.get('usuarios/empresas/lista/', { params: { page_size: 100 } }).then((res) => setEmpresas(res.data.results)).catch(() => {});
  }, [usuario]);

  if (cargandoAuth) return null;
  if (!usuario) return <Navigate to="/login?next=/admin/entregas" replace />;
  if (!esStaff(usuario)) return <Navigate to="/" replace />;

  async function cambiarEstado(entrega, nuevoEstado) {
    try {
      const { data } = await API.patch(`pedidos/admin/entregas/${entrega.id}/`, { estado: nuevoEstado });
      setResultados((prev) => prev.map((e) => (e.id === entrega.id ? data : e)));
    } catch {
      setError('No se pudo actualizar el estado.');
    }
  }

  async function cambiarFechaEstimada(entrega, nuevaFecha) {
    if (!nuevaFecha) return;
    try {
      const { data } = await API.patch(`pedidos/admin/entregas/${entrega.id}/`, { fecha_estimada: nuevaFecha });
      setResultados((prev) => prev.map((e) => (e.id === entrega.id ? data : e)));
    } catch {
      setError('No se pudo actualizar la fecha estimada.');
    }
  }

  async function marcarEntregada(entrega) {
    try {
      const { data } = await API.post(`pedidos/admin/entregas/${entrega.id}/marcar-entregada/`);
      setResultados((prev) => prev.map((e) => (e.id === entrega.id ? data : e)));
    } catch {
      setError('No se pudo marcar como entregada.');
    }
  }

  async function eliminar(entrega) {
    if (!window.confirm(`¿Eliminar la entrega del pedido "${entrega.numero_pedido}"?`)) return;
    try {
      await API.delete(`pedidos/admin/entregas/${entrega.id}/`);
      await cargarEntregas();
    } catch {
      setError('No se pudo eliminar la entrega.');
    }
  }

  const totalPaginas = Math.max(1, Math.ceil(total / porPagina));

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex items-center gap-2 mb-1">
        <Truck className="text-brand-600 dark:text-brand-400" size={24} />
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Entregas</h1>
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        CU13 · Envíos de pedidos ya pagados — dirección del comprador o sucursal de recojo, y estado del envío.
      </p>

      <div className="flex flex-wrap items-center gap-3 mb-4">
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
          {ESTADOS_ENTREGA.map((op) => <option key={op.value} value={op.value}>{op.label}</option>)}
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
              <th className="px-4 py-3 font-medium">Destino</th>
              <th className="px-4 py-3 font-medium">Fecha estimada</th>
              <th className="px-4 py-3 font-medium">Estado</th>
              <th className="px-4 py-3 font-medium text-right">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800 bg-white dark:bg-gray-900">
            {resultados.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400 dark:text-gray-500">Sin resultados.</td></tr>
            ) : resultados.map((e) => (
              <tr key={e.id}>
                <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-200">{e.numero_pedido}</td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{e.empresa_nombre}</td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{e.comprador_nombre}</td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-400 max-w-[220px] truncate" title={e.destino}>{e.destino}</td>
                <td className="px-4 py-3">
                  <input
                    type="date"
                    defaultValue={e.fecha_estimada || ''}
                    onBlur={(ev) => cambiarFechaEstimada(e, ev.target.value)}
                    className="rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-brand-300"
                  />
                </td>
                <td className="px-4 py-3">
                  <select
                    value={e.estado}
                    onChange={(ev) => cambiarEstado(e, ev.target.value)}
                    className={`rounded-full border-0 px-2 py-0.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-300 ${badgeEstado(e.estado)}`}
                  >
                    {ESTADOS_ENTREGA.filter((op) => op.value).map((op) => <option key={op.value} value={op.value}>{op.label}</option>)}
                  </select>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-2">
                    {e.estado !== 'ENTREGADA' && (
                      <button
                        onClick={() => marcarEntregada(e)}
                        title="Marcar como entregada"
                        className="grid h-8 w-8 place-items-center rounded-full bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-100"
                      >
                        <CheckCircle2 size={14} />
                      </button>
                    )}
                    <button
                      onClick={() => eliminar(e)}
                      className="grid h-8 w-8 place-items-center rounded-full bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 hover:bg-red-100"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
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
