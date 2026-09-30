import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Receipt, ChevronDown, ChevronUp, Printer, Download } from 'lucide-react';
import API from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { esComprador } from '../utils/roles';

const ESTADO_LABEL = {
  PENDIENTE: 'Pendiente', CONFIRMADO: 'Confirmado', EN_PREPARACION: 'En preparación',
  ENVIADO: 'Enviado', ENTREGADO: 'Entregado', CANCELADO: 'Cancelado',
};

function badgeEstado(estado) {
  if (estado === 'ENTREGADO') return 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400';
  if (estado === 'CANCELADO') return 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400';
  if (estado === 'ENVIADO') return 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400';
  return 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400';
}

function exportarCsv(numeroPedido, compra) {
  const filas = [['Producto', 'Cantidad', 'Precio unitario', 'Subtotal']];
  compra.items.forEach((it) => filas.push([it.producto_nombre, it.cantidad, it.precio_unitario, it.subtotal]));
  filas.push(['', '', 'Total', compra.subtotal]);
  const csv = filas.map((fila) => fila.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `recibo-${numeroPedido}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function MisCompras() {
  const { usuario, cargando: cargandoAuth } = useAuth();
  const [compras, setCompras] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [expandido, setExpandido] = useState(null);

  useEffect(() => {
    if (!usuario || !esComprador(usuario)) return;
    setCargando(true);
    API.get('pedidos/mis-compras/', { params: { page_size: 100 } })
      .then((res) => setCompras(res.data.results))
      .catch(() => setError('No se pudo cargar tus compras.'))
      .finally(() => setCargando(false));
  }, [usuario]);

  if (cargandoAuth) return null;
  if (!usuario) return <Navigate to="/login?next=/mis-compras" replace />;
  if (!esComprador(usuario)) return <Navigate to="/" replace />;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="flex items-center gap-2 mb-1">
        <Receipt className="text-brand-600 dark:text-brand-400" size={24} />
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Mis compras</h1>
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        CU26 · Recibos de tus compras ya pagadas, con el estado de entrega de cada una — puedes verlos, imprimirlos o exportarlos.
      </p>

      {error && <p className="text-sm text-red-600 dark:text-red-400 mb-4">{error}</p>}

      <div className="space-y-3">
        {cargando ? (
          <p className="text-sm text-gray-400">Cargando...</p>
        ) : compras.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-gray-500 py-8 text-center">Todavía no tienes compras pagadas.</p>
        ) : compras.map((c) => (
          <div key={c.id} className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
            <div className="flex items-center justify-between gap-3">
              <button onClick={() => setExpandido((prev) => (prev === c.id ? null : c.id))} className="flex items-center gap-2 text-left min-w-0">
                {expandido === c.id ? <ChevronUp size={14} className="shrink-0 text-gray-400" /> : <ChevronDown size={14} className="shrink-0 text-gray-400" />}
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-900 dark:text-gray-100 truncate">{c.numero_pedido} · {c.empresa_nombre}</span>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${badgeEstado(c.estado)}`}>{ESTADO_LABEL[c.estado] || c.estado}</span>
                  </div>
                  <div className="text-xs text-gray-400 dark:text-gray-500">{new Date(c.fecha).toLocaleDateString()} · {c.metodo_pago}</div>
                </div>
              </button>
              <span className="font-semibold text-gray-800 dark:text-gray-200 shrink-0">Bs {c.subtotal}</span>
            </div>

            {expandido === c.id && (
              <div className="mt-3 border-t border-gray-100 dark:border-gray-800 pt-3 text-xs space-y-1">
                {c.items.map((it) => (
                  <div key={it.id} className="flex justify-between text-gray-600 dark:text-gray-400">
                    <span>{it.producto_nombre} × {it.cantidad}</span>
                    <span>Bs {it.subtotal}</span>
                  </div>
                ))}
                <div className="flex justify-between font-semibold text-gray-800 dark:text-gray-200 pt-1 border-t border-gray-100 dark:border-gray-800 mt-1">
                  <span>Total</span>
                  <span>Bs {c.subtotal}</span>
                </div>
                <div className="flex items-center gap-3 mt-2">
                  <button onClick={() => window.print()} className="flex items-center gap-1 text-brand-600 dark:text-brand-400 hover:text-brand-700">
                    <Printer size={12} /> Imprimir
                  </button>
                  <button onClick={() => exportarCsv(c.numero_pedido, c)} className="flex items-center gap-1 text-brand-600 dark:text-brand-400 hover:text-brand-700">
                    <Download size={12} /> Exportar
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
