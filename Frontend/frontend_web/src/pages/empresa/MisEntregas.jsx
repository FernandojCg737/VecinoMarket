import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Truck, CheckCircle2 } from 'lucide-react';
import API from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { esEmpresaOEmpleado } from '../../utils/roles';

const ESTADOS_ENTREGA = [
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

export default function MisEntregas() {
  const { usuario, cargando: cargandoAuth } = useAuth();
  const [resultados, setResultados] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [sinPermiso, setSinPermiso] = useState(false);
  const [error, setError] = useState('');

  function cargarEntregas() {
    setCargando(true);
    return API.get('pedidos/mis-entregas/', { params: { page_size: 100 } })
      .then((res) => {
        setResultados(res.data.results);
        setError('');
      })
      .catch((err) => {
        if (err?.response?.status === 403) setSinPermiso(true);
        else setError('No se pudo cargar tus entregas.');
      })
      .finally(() => setCargando(false));
  }

  useEffect(() => {
    if (!usuario || !esEmpresaOEmpleado(usuario)) return;
    cargarEntregas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuario]);

  if (cargandoAuth) return null;
  if (!usuario) return <Navigate to="/login?next=/mi-empresa/entregas" replace />;
  if (!esEmpresaOEmpleado(usuario)) return <Navigate to="/" replace />;

  async function cambiarEstado(entrega, nuevoEstado) {
    try {
      const { data } = await API.patch(`pedidos/mis-entregas/${entrega.id}/`, { estado: nuevoEstado });
      setResultados((prev) => prev.map((e) => (e.id === entrega.id ? data : e)));
    } catch {
      setError('No se pudo actualizar el estado.');
    }
  }

  async function marcarEntregada(entrega) {
    try {
      const { data } = await API.post(`pedidos/mis-entregas/${entrega.id}/marcar-entregada/`);
      setResultados((prev) => prev.map((e) => (e.id === entrega.id ? data : e)));
    } catch {
      setError('No se pudo marcar como entregada.');
    }
  }

  async function eliminar(entrega) {
    if (!window.confirm(`¿Eliminar la entrega del pedido "${entrega.numero_pedido}"?`)) return;
    try {
      await API.delete(`pedidos/mis-entregas/${entrega.id}/`);
      await cargarEntregas();
    } catch {
      setError('No se pudo eliminar la entrega.');
    }
  }

  if (!cargando && sinPermiso) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <Truck className="mx-auto mb-3 text-gray-300 dark:text-gray-600" size={40} />
        <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">Sin acceso</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          No tienes el permiso "gestionar_pedidos" para ver las entregas de tu empresa.
          Pídele al dueño de la cuenta que te lo asigne.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="flex items-center gap-2 mb-1">
        <Truck className="text-brand-600 dark:text-brand-400" size={24} />
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Mis entregas</h1>
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        CU13 · Envíos de tus pedidos pagados — dirección o sucursal de recojo, y estado del envío.
      </p>

      {error && <p className="text-sm text-red-600 dark:text-red-400 mb-4">{error}</p>}

      <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-900 text-left text-gray-500 dark:text-gray-400">
            <tr>
              <th className="px-4 py-3 font-medium">Pedido</th>
              <th className="px-4 py-3 font-medium">Comprador</th>
              <th className="px-4 py-3 font-medium">Destino</th>
              <th className="px-4 py-3 font-medium">Estado</th>
              <th className="px-4 py-3 font-medium text-right">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800 bg-white dark:bg-gray-900">
            {cargando ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400 dark:text-gray-500">Cargando...</td></tr>
            ) : resultados.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400 dark:text-gray-500">Sin resultados.</td></tr>
            ) : resultados.map((e) => (
              <tr key={e.id}>
                <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-200">{e.numero_pedido}</td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{e.comprador_nombre}</td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-400 max-w-[220px] truncate" title={e.destino}>{e.destino}</td>
                <td className="px-4 py-3">
                  <select
                    value={e.estado}
                    onChange={(ev) => cambiarEstado(e, ev.target.value)}
                    className={`rounded-full border-0 px-2 py-0.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-300 ${badgeEstado(e.estado)}`}
                  >
                    {ESTADOS_ENTREGA.map((op) => <option key={op.value} value={op.value}>{op.label}</option>)}
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
                      className="rounded-md border border-gray-300 dark:border-gray-700 px-2.5 py-1 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      Eliminar
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
