import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Receipt, ChevronDown, ChevronUp, Download } from 'lucide-react';
import API from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { esEmpresaOEmpleado } from '../../utils/roles';
import ExportarReporteMenu from '../../components/dashboard/ExportarReporteMenu';

function badgeEstado(estado) {
  if (estado === 'PAGADA') return 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400';
  if (estado === 'VENCIDA') return 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400';
  return 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400';
}

function exportarCsv(facturas) {
  const filas = [['ID', 'Tipo', 'Monto', 'Estado de pago', 'Fecha de pago', 'Creada']];
  facturas.forEach((f) => filas.push([f.id, f.tipo, f.monto, f.estado_pago, f.fecha_pago || '', f.creado_en]));
  const csv = filas.map((fila) => fila.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'mis-facturas.csv';
  a.click();
  URL.revokeObjectURL(url);
}

export default function MisFacturas() {
  const { usuario, cargando: cargandoAuth } = useAuth();
  const [facturas, setFacturas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [sinPermiso, setSinPermiso] = useState(false);
  const [error, setError] = useState('');
  const [expandido, setExpandido] = useState(null);

  function cargarFacturas() {
    setCargando(true);
    return API.get('facturacion/mis-facturas/')
      .then((res) => {
        setFacturas(res.data);
        setError('');
      })
      .catch((err) => {
        if (err?.response?.status === 403) setSinPermiso(true);
        else setError('No se pudo cargar tus facturas.');
      })
      .finally(() => setCargando(false));
  }

  useEffect(() => {
    if (!usuario || !esEmpresaOEmpleado(usuario)) return;
    cargarFacturas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuario]);

  if (cargandoAuth) return null;
  if (!usuario) return <Navigate to="/login?next=/mi-empresa/facturas" replace />;
  if (!esEmpresaOEmpleado(usuario)) return <Navigate to="/" replace />;

  async function eliminar(factura) {
    if (!window.confirm(`¿Eliminar la factura #${factura.id}?`)) return;
    try {
      await API.delete(`facturacion/mis-facturas/${factura.id}/`);
      await cargarFacturas();
    } catch {
      setError('No se pudo eliminar la factura.');
    }
  }

  if (!cargando && sinPermiso) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <Receipt className="mx-auto mb-3 text-gray-300 dark:text-gray-600" size={40} />
        <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">Sin acceso</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          No tienes el permiso "gestionar_facturacion" para ver las facturas de tu empresa.
          Pídele al dueño de la cuenta que te lo asigne.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="flex items-center justify-between gap-2 mb-1">
        <div className="flex items-center gap-2">
          <Receipt className="text-brand-600 dark:text-brand-400" size={24} />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Mis facturas</h1>
        </div>
        <button
          onClick={() => exportarCsv(facturas)}
          className="flex items-center gap-1.5 rounded-md border border-gray-300 dark:border-gray-700 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
        >
          <Download size={14} /> Exportar CSV
        </button>
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        CU26 · Facturas de suscripción y de comisión por tus ventas.
      </p>

      {error && <p className="text-sm text-red-600 dark:text-red-400 mb-4">{error}</p>}

      <div className="space-y-3">
        {cargando ? (
          <p className="text-sm text-gray-400">Cargando...</p>
        ) : facturas.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-gray-500 py-8 text-center">Todavía no tienes facturas.</p>
        ) : facturas.map((f) => (
          <div key={f.id} className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
            <div className="flex items-center justify-between gap-3">
              <button onClick={() => setExpandido((prev) => (prev === f.id ? null : f.id))} className="flex items-center gap-2 text-left min-w-0">
                {expandido === f.id ? <ChevronUp size={14} className="shrink-0 text-gray-400" /> : <ChevronDown size={14} className="shrink-0 text-gray-400" />}
                <div className="min-w-0">
                  <div className="font-semibold text-gray-900 dark:text-gray-100 truncate">Factura #{f.id}</div>
                  <div className="text-xs text-gray-400 dark:text-gray-500">{f.tipo === 'SUSCRIPCION' ? 'Suscripción' : 'Comisión'} · {new Date(f.creado_en).toLocaleDateString()}</div>
                </div>
              </button>
              <div className="flex items-center gap-2 shrink-0">
                <span className="font-semibold text-gray-800 dark:text-gray-200">Bs {f.monto}</span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${badgeEstado(f.estado_pago)}`}>{f.estado_pago}</span>
                <button
                  onClick={() => eliminar(f)}
                  className="rounded-md border border-gray-300 dark:border-gray-700 px-2.5 py-1 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  Eliminar
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
                  <ExportarReporteMenu url={`facturacion/mis-facturas/${f.id}/exportar/`} />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
