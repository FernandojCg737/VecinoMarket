import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Receipt, Trash2, ChevronDown, ChevronUp, Download } from 'lucide-react';
import API from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { esStaff } from '../../utils/roles';
import ExportarReporteMenu from '../../components/dashboard/ExportarReporteMenu';

const TIPOS = [
  { value: '', label: 'Todos los tipos' },
  { value: 'SUSCRIPCION', label: 'Suscripción' },
  { value: 'COMISION', label: 'Comisión' },
];

const ESTADOS_PAGO = [
  { value: '', label: 'Todos los estados' },
  { value: 'PENDIENTE', label: 'Pendiente' },
  { value: 'PAGADA', label: 'Pagada' },
  { value: 'VENCIDA', label: 'Vencida' },
];

function badgeEstado(estado) {
  if (estado === 'PAGADA') return 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400';
  if (estado === 'VENCIDA') return 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400';
  return 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400';
}

function exportarCsv(facturas) {
  const filas = [['ID', 'Empresa', 'Tipo', 'Monto', 'Estado de pago', 'Fecha de pago', 'Creada']];
  facturas.forEach((f) => filas.push([f.id, f.empresa_nombre, f.tipo, f.monto, f.estado_pago, f.fecha_pago || '', f.creado_en]));
  const csv = filas.map((fila) => fila.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'facturas.csv';
  a.click();
  URL.revokeObjectURL(url);
}

export default function Facturacion() {
  const { usuario, cargando: cargandoAuth } = useAuth();
  const [facturas, setFacturas] = useState([]);
  const [empresas, setEmpresas] = useState([]);
  const [filtroEmpresa, setFiltroEmpresa] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [error, setError] = useState('');
  const [expandido, setExpandido] = useState(null);

  function cargarFacturas() {
    return API.get('facturacion/admin/facturas/', {
      params: { empresa: filtroEmpresa || undefined, tipo: filtroTipo || undefined, estado_pago: filtroEstado || undefined },
    })
      .then((res) => {
        setFacturas(res.data);
        setError('');
      })
      .catch(() => setError('No se pudo cargar las facturas.'));
  }

  useEffect(() => {
    if (!usuario || !esStaff(usuario)) return;
    cargarFacturas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuario, filtroEmpresa, filtroTipo, filtroEstado]);

  useEffect(() => {
    if (!usuario || !esStaff(usuario)) return;
    API.get('usuarios/empresas/lista/', { params: { page_size: 100 } }).then((res) => setEmpresas(res.data.results)).catch(() => {});
  }, [usuario]);

  if (cargandoAuth) return null;
  if (!usuario) return <Navigate to="/login?next=/admin/facturacion" replace />;
  if (!esStaff(usuario)) return <Navigate to="/" replace />;

  async function cambiarEstado(factura, nuevoEstado) {
    try {
      const { data } = await API.patch(`facturacion/admin/facturas/${factura.id}/`, { estado_pago: nuevoEstado });
      setFacturas((prev) => prev.map((f) => (f.id === factura.id ? data : f)));
    } catch {
      setError('No se pudo actualizar el estado.');
    }
  }

  async function eliminar(factura) {
    if (!window.confirm(`¿Eliminar la factura #${factura.id} de "${factura.empresa_nombre}"?`)) return;
    try {
      await API.delete(`facturacion/admin/facturas/${factura.id}/`);
      await cargarFacturas();
    } catch {
      setError('No se pudo eliminar la factura.');
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="flex items-center justify-between gap-2 mb-1">
        <div className="flex items-center gap-2">
          <Receipt className="text-brand-600 dark:text-brand-400" size={24} />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Facturación y comisiones</h1>
        </div>
        <button
          onClick={() => exportarCsv(facturas)}
          className="flex items-center gap-1.5 rounded-md border border-gray-300 dark:border-gray-700 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
        >
          <Download size={14} /> Exportar CSV
        </button>
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        CU26 · Facturas de suscripción y de comisión (se generan solas cuando un pedido se marca entregado, CU13).
      </p>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <select
          value={filtroEmpresa}
          onChange={(e) => setFiltroEmpresa(e.target.value)}
          className="rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
        >
          <option value="">Todas las empresas</option>
          {empresas.map((e) => <option key={e.id} value={e.id}>{e.razon_social}</option>)}
        </select>
        <select
          value={filtroTipo}
          onChange={(e) => setFiltroTipo(e.target.value)}
          className="rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
        >
          {TIPOS.map((op) => <option key={op.value} value={op.value}>{op.label}</option>)}
        </select>
        <select
          value={filtroEstado}
          onChange={(e) => setFiltroEstado(e.target.value)}
          className="rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
        >
          {ESTADOS_PAGO.map((op) => <option key={op.value} value={op.value}>{op.label}</option>)}
        </select>
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400 mb-4">{error}</p>}

      <div className="space-y-3">
        {facturas.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-gray-500 py-8 text-center">Sin resultados.</p>
        ) : facturas.map((f) => (
          <div key={f.id} className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
            <div className="flex items-center justify-between gap-3">
              <button onClick={() => setExpandido((prev) => (prev === f.id ? null : f.id))} className="flex items-center gap-2 text-left min-w-0">
                {expandido === f.id ? <ChevronUp size={14} className="shrink-0 text-gray-400" /> : <ChevronDown size={14} className="shrink-0 text-gray-400" />}
                <div className="min-w-0">
                  <div className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                    Factura #{f.id} · {f.empresa_nombre}
                  </div>
                  <div className="text-xs text-gray-400 dark:text-gray-500">{f.tipo === 'SUSCRIPCION' ? 'Suscripción' : 'Comisión'} · {new Date(f.creado_en).toLocaleDateString()}</div>
                </div>
              </button>
              <div className="flex items-center gap-2 shrink-0">
                <span className="font-semibold text-gray-800 dark:text-gray-200">Bs {f.monto}</span>
                <select
                  value={f.estado_pago}
                  onChange={(e) => cambiarEstado(f, e.target.value)}
                  className={`rounded-full border-0 px-2 py-0.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-300 ${badgeEstado(f.estado_pago)}`}
                >
                  {ESTADOS_PAGO.filter((op) => op.value).map((op) => <option key={op.value} value={op.value}>{op.label}</option>)}
                </select>
                <button
                  onClick={() => eliminar(f)}
                  className="grid h-8 w-8 place-items-center rounded-full bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 hover:bg-red-100"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

            {expandido === f.id && (
              <div className="mt-3 border-t border-gray-100 dark:border-gray-800 pt-3 text-xs space-y-1.5">
                <div className="flex justify-between text-gray-500 dark:text-gray-400">
                  <span>Periodo</span>
                  <span>{f.periodo_desde} — {f.periodo_hasta}</span>
                </div>
                <div className="flex justify-between text-gray-500 dark:text-gray-400">
                  <span>Fecha de pago</span>
                  <span>{f.fecha_pago ? new Date(f.fecha_pago).toLocaleString() : '—'}</span>
                </div>
                {f.comisiones.length > 0 && (
                  <div className="pt-1.5 border-t border-gray-100 dark:border-gray-800">
                    <p className="text-gray-500 dark:text-gray-400 mb-1">Comisiones incluidas:</p>
                    {f.comisiones.map((c) => (
                      <div key={c.id} className="flex justify-between text-gray-600 dark:text-gray-400">
                        <span>{c.numero_pedido} (venta Bs {c.monto_venta} · {c.porcentaje_aplicado}%)</span>
                        <span>Bs {c.monto_comision}</span>
                      </div>
                    ))}
                  </div>
                )}
                <div className="mt-2">
                  <ExportarReporteMenu url={`facturacion/admin/facturas/${f.id}/exportar/`} />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
