import { Fragment, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { ClipboardList, ChevronDown, ChevronUp, Eye, X, FileText } from 'lucide-react';
import API from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { esEmpresaOEmpleado } from '../../utils/roles';

const ESTADOS_PEDIDO = [
  { value: 'PENDIENTE', label: 'Verificando pago QR' },
  { value: 'CONFIRMADO', label: 'Confirmado' },
  { value: 'EN_PREPARACION', label: 'En preparación' },
  { value: 'ENVIADO', label: 'Enviado' },
  { value: 'ENTREGADO', label: 'Entregado' },
  { value: 'CANCELADO', label: 'Cancelado' },
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

export default function MisPedidos() {
  const { usuario, cargando: cargandoAuth } = useAuth();
  const [tipo, setTipo] = useState('venta');
  const [resultados, setResultados] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [sinPermiso, setSinPermiso] = useState(false);
  const [error, setError] = useState('');
  const [expandido, setExpandido] = useState(null);
  const [modalComprobante, setModalComprobante] = useState(null);

  function cargarPedidos() {
    setCargando(true);
    return API.get('pedidos/mis-pedidos/', { params: { tipo, page_size: 100 } })
      .then((res) => {
        setResultados(res.data.results);
        setError('');
      })
      .catch((err) => {
        if (err?.response?.status === 403) setSinPermiso(true);
        else setError('No se pudo cargar tus pedidos.');
      })
      .finally(() => setCargando(false));
  }

  useEffect(() => {
    if (!usuario || !esEmpresaOEmpleado(usuario)) return;
    cargarPedidos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuario, tipo]);

  if (cargandoAuth) return null;
  if (!usuario) return <Navigate to="/login?next=/mi-empresa/pedidos" replace />;
  if (!esEmpresaOEmpleado(usuario)) return <Navigate to="/" replace />;

  async function cambiarEstado(pedido, nuevoEstado) {
    try {
      const { data } = await API.patch(`pedidos/mis-pedidos/${pedido.id}/`, { estado: nuevoEstado });
      setResultados((prev) => prev.map((p) => (p.id === pedido.id ? data : p)));
    } catch {
      setError('No se pudo actualizar el estado.');
    }
  }

  async function aceptarComprobante(pedido) {
    if (!window.confirm(`¿Confirmar venta del pedido "${pedido.numero_pedido}"? Se marcará el pago como PAGADO y el pedido como CONFIRMADO.`)) return;
    try {
      const { data } = await API.patch(`pedidos/mis-pedidos/${pedido.id}/`, {
        estado_pago: 'PAGADO',
        estado: 'CONFIRMADO',
      });
      setResultados((prev) => prev.map((p) => (p.id === pedido.id ? data : p)));
      setModalComprobante(null);
    } catch {
      setError('No se pudo confirmar la venta.');
    }
  }

  async function eliminar(pedido) {
    if (!window.confirm(`¿Eliminar el pedido "${pedido.numero_pedido}"?`)) return;
    try {
      await API.delete(`pedidos/mis-pedidos/${pedido.id}/`);
      await cargarPedidos();
    } catch {
      setError('No se pudo eliminar el pedido.');
    }
  }

  if (!cargando && sinPermiso) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <ClipboardList className="mx-auto mb-3 text-gray-300 dark:text-gray-600" size={40} />
        <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">Sin acceso</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          No tienes el permiso "gestionar_pedidos" para ver los pedidos de tu empresa.
          Pídele al dueño de la cuenta que te lo asigne.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="flex items-center gap-2 mb-1">
        <ClipboardList className="text-brand-600 dark:text-brand-400" size={24} />
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Mis pedidos y ventas</h1>
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        CU12 · "Pedido" = pago pendiente, "Venta" = ya pagado.
      </p>

      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={() => setTipo('venta')}
          className={`rounded-full px-4 py-1.5 text-sm font-semibold ${tipo === 'venta' ? 'bg-brand-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'}`}
        >
          Ventas
        </button>
        <button
          onClick={() => setTipo('pedido')}
          className={`rounded-full px-4 py-1.5 text-sm font-semibold ${tipo === 'pedido' ? 'bg-brand-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'}`}
        >
          Pedidos (pago pendiente)
        </button>
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400 mb-4">{error}</p>}

      <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-900 text-left text-gray-500 dark:text-gray-400">
            <tr>
              <th className="px-4 py-3 font-medium">Pedido</th>
              <th className="px-4 py-3 font-medium">Comprador</th>
              <th className="px-4 py-3 font-medium">Método pago</th>
              <th className="px-4 py-3 font-medium">Pago</th>
              <th className="px-4 py-3 font-medium">Fecha</th>
              <th className="px-4 py-3 font-medium">Estado</th>
              <th className="px-4 py-3 font-medium text-right">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800 bg-white dark:bg-gray-900">
            {cargando ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400 dark:text-gray-500">Cargando...</td></tr>
            ) : resultados.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400 dark:text-gray-500">Sin resultados.</td></tr>
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
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{p.comprador_nombre}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                    <div className="flex flex-col gap-1 items-start">
                      <span className="font-medium">{p.metodo_pago}</span>
                      {p.comprobante_url && (
                        <button
                          type="button"
                          onClick={() => setModalComprobante(p)}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400 underline"
                        >
                          <Eye size={12} /> Comprobante
                        </button>
                      )}
                    </div>
                  </td>
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
                      {ESTADOS_PEDIDO.map((op) => <option key={op.value} value={op.value}>{op.label}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {p.estado_pago === 'PENDIENTE' && (
                        <button
                          type="button"
                          onClick={() => aceptarComprobante(p)}
                          className="rounded-md bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-700 shadow-sm transition-colors whitespace-nowrap"
                          title="Aceptar comprobante y confirmar venta"
                        >
                          ✓ Confirmar
                        </button>
                      )}
                      <button
                        onClick={() => eliminar(p)}
                        className="rounded-md border border-gray-300 dark:border-gray-700 px-2 py-1 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                      >
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
                {expandido === p.id && (
                  <tr>
                    <td colSpan={7} className="px-4 py-3 bg-gray-50 dark:bg-gray-900/40">
                      <div className="space-y-1">
                        {p.items.map((it) => (
                          <div key={it.id} className="flex items-center justify-between text-xs">
                            <span className="text-gray-700 dark:text-gray-300">{it.producto_nombre} × {it.cantidad}</span>
                            <span className="text-gray-500 dark:text-gray-400">Bs {it.subtotal}</span>
                          </div>
                        ))}
                        <div className="flex items-center justify-between text-xs font-semibold pt-1 border-t border-gray-200 dark:border-gray-700 mt-1">
                          <span className="text-gray-700 dark:text-gray-300">Subtotal</span>
                          <span className="text-gray-800 dark:text-gray-200">Bs {p.subtotal}</span>
                        </div>
                        {p.estado !== 'CANCELADO' && (
                          <div className="pt-2 flex justify-end gap-3">
                            <a
                              href={`${API.defaults.baseURL}pedidos/${p.id}/factura/?token=${localStorage.getItem('vecinomarket_access')}&action=view`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-brand-600 dark:text-brand-400 hover:text-brand-700 hover:underline text-xs font-semibold"
                            >
                              <FileText size={14} /> Ver Factura
                            </a>
                            <a
                              href={`${API.defaults.baseURL}pedidos/${p.id}/factura/?token=${localStorage.getItem('vecinomarket_access')}&action=download`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-brand-600 dark:text-brand-400 hover:text-brand-700 hover:underline text-xs font-semibold"
                            >
                              <FileText size={14} /> Descargar Factura
                            </a>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {modalComprobante && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" onClick={() => setModalComprobante(null)}>
          <div
            className="w-full max-w-lg rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b pb-2 dark:border-gray-800">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                Comprobante de pago — {modalComprobante.numero_pedido}
              </h3>
              <button onClick={() => setModalComprobante(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <X size={20} />
              </button>
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-300 space-y-1 bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg">
              <p><strong>Comprador:</strong> {modalComprobante.comprador_nombre} ({modalComprobante.comprador_email})</p>
              <p><strong>Monto total:</strong> Bs {modalComprobante.subtotal}</p>
              <p><strong>Método de pago:</strong> {modalComprobante.metodo_pago}</p>
              <p><strong>Estado del pago:</strong> {modalComprobante.estado_pago}</p>
            </div>
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden bg-gray-50 dark:bg-gray-950 flex justify-center p-2">
              <img
                src={modalComprobante.comprobante_url}
                alt="Comprobante de pago"
                className="max-h-96 w-auto object-contain rounded"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setModalComprobante(null)}
                className="rounded-md border border-gray-300 dark:border-gray-700 px-3 py-1.5 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                Cerrar
              </button>
              {modalComprobante.estado_pago === 'PENDIENTE' && (
                <button
                  type="button"
                  onClick={() => aceptarComprobante(modalComprobante)}
                  className="rounded-md bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 shadow-sm"
                >
                  ✓ Aceptar comprobante y confirmar venta
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
