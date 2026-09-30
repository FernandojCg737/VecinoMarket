import { useEffect, useMemo, useState } from 'react';
import { Sliders, FileText, FileSpreadsheet, FileType, Globe, Mail, Search, Building2, X } from 'lucide-react';
import API from '../../api/axios';

const FORMATOS = [
  { valor: 'pdf', etiqueta: 'PDF', icono: FileText },
  { valor: 'xlsx', etiqueta: 'Excel (XLSX)', icono: FileSpreadsheet },
  { valor: 'csv', etiqueta: 'CSV', icono: FileType },
  { valor: 'html', etiqueta: 'HTML', icono: Globe },
];

function nombreDesdeCabecera(cabecera, respaldo) {
  const match = /filename="?([^"]+)"?/.exec(cabecera || '');
  return match ? match[1] : respaldo;
}

/**
 * Punto 5 (Sprint_2): reportes dinámicos -- el usuario elige el dataset, las
 * columnas, un rango de fechas y filtros extra, en vez de un reporte con
 * contenido fijo. Se usa tanto en /mi-empresa/reportes (dueño/empleado) como
 * en /admin/reportes-dinamicos (SuperAdmin/Admin, con `admite empresa` para
 * acotar a una empresa puntual).
 */
export default function ReportesDinamicosBase({ catalogoUrl, generarUrl, permiteFiltrarEmpresa = false }) {
  const [catalogo, setCatalogo] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  const [datasetKey, setDatasetKey] = useState('');
  const [columnas, setColumnas] = useState([]);
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [filtrosExtra, setFiltrosExtra] = useState({});
  const [generando, setGenerando] = useState(null);

  // --- filtro opcional por empresa (solo admin) ---
  const [qEmpresa, setQEmpresa] = useState('');
  const [resultadosEmpresa, setResultadosEmpresa] = useState([]);
  const [empresaSel, setEmpresaSel] = useState(null);

  useEffect(() => {
    API.get(catalogoUrl)
      .then((res) => {
        setCatalogo(res.data);
        if (res.data.length > 0) {
          setDatasetKey(res.data[0].clave);
          setColumnas(res.data[0].columnas.map((c) => c.clave));
        }
        setError('');
      })
      .catch(() => setError('No se pudo cargar el catálogo de reportes.'))
      .finally(() => setCargando(false));
  }, [catalogoUrl]);

  const dataset = useMemo(() => catalogo.find((d) => d.clave === datasetKey), [catalogo, datasetKey]);

  function elegirDataset(clave) {
    const d = catalogo.find((it) => it.clave === clave);
    setDatasetKey(clave);
    setColumnas(d ? d.columnas.map((c) => c.clave) : []);
    setFiltrosExtra({});
  }

  function toggleColumna(clave) {
    setColumnas((prev) => (prev.includes(clave) ? prev.filter((c) => c !== clave) : [...prev, clave]));
  }

  function buscarEmpresas(e) {
    e.preventDefault();
    API.get('usuarios/empresas/lista/', { params: { q: qEmpresa || undefined } })
      .then((res) => setResultadosEmpresa(res.data.results))
      .catch(() => {});
  }

  function construirParams(formato) {
    const params = {
      dataset: datasetKey,
      columnas: columnas.join(','),
      formato,
    };
    if (fechaInicio) params.fecha_inicio = fechaInicio;
    if (fechaFin) params.fecha_fin = fechaFin;
    if (permiteFiltrarEmpresa && empresaSel) params.empresa = empresaSel.id;
    Object.entries(filtrosExtra).forEach(([clave, valor]) => {
      if (valor) params[`filtro_${clave}`] = valor;
    });
    return params;
  }

  async function generar(formato) {
    setGenerando(formato);
    try {
      if (formato === 'email') {
        const res = await API.get(generarUrl, { params: construirParams('email') });
        window.alert(res.data?.detail || 'Reporte enviado por correo.');
        return;
      }
      const res = await API.get(generarUrl, { params: construirParams(formato), responseType: 'blob' });
      const nombre = nombreDesdeCabecera(res.headers['content-disposition'], `reporte.${formato}`);
      const blobUrl = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = nombre;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(blobUrl);
    } catch {
      window.alert('No se pudo generar el reporte. Intenta de nuevo.');
    } finally {
      setGenerando(null);
    }
  }

  if (cargando) return null;
  if (error) return <p className="text-sm text-red-600 dark:text-red-400">{error}</p>;
  if (catalogo.length === 0) {
    return <p className="text-sm text-gray-400 dark:text-gray-500">No tienes acceso a ningún reporte todavía.</p>;
  }

  return (
    <div className="space-y-6">
      {/* Selector de dataset */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">¿Qué quieres reportar?</label>
        <div className="flex flex-wrap gap-2">
          {catalogo.map((d) => (
            <button
              key={d.clave}
              onClick={() => elegirDataset(d.clave)}
              className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
                datasetKey === d.clave
                  ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-400'
                  : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300'
              }`}
            >
              {d.etiqueta}
            </button>
          ))}
        </div>
      </div>

      {dataset && (
        <>
          {/* Columnas */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">Columnas a incluir</label>
            <div className="flex flex-wrap gap-2">
              {dataset.columnas.map((c) => (
                <button
                  key={c.clave}
                  onClick={() => toggleColumna(c.clave)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                    columnas.includes(c.clave)
                      ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-400'
                      : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-300'
                  }`}
                >
                  {c.etiqueta}
                </button>
              ))}
            </div>
          </div>

          {/* Rango de fechas + filtros extra */}
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Desde</label>
              <input
                type="date"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
                className="rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Hasta</label>
              <input
                type="date"
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
                className="rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
              />
            </div>
            {dataset.filtros.map((f) => (
              <div key={f.clave}>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{f.etiqueta}</label>
                <select
                  value={filtrosExtra[f.clave] || ''}
                  onChange={(e) => setFiltrosExtra((prev) => ({ ...prev, [f.clave]: e.target.value }))}
                  className="rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
                >
                  <option value="">Todos</option>
                  {f.opciones.map((op) => <option key={op.valor} value={op.valor}>{op.etiqueta}</option>)}
                </select>
              </div>
            ))}
          </div>

          {/* Filtro opcional por empresa (solo admin) */}
          {permiteFiltrarEmpresa && (
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">
                Empresa <span className="font-normal text-gray-400">— opcional, si no eliges ninguna el reporte es de toda la plataforma</span>
              </label>
              {empresaSel ? (
                <div className="inline-flex items-center gap-2 rounded-full border border-brand-500 bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-400 px-3 py-1.5 text-sm">
                  <Building2 size={14} /> {empresaSel.razon_social}
                  <button onClick={() => setEmpresaSel(null)} className="hover:text-brand-900 dark:hover:text-brand-200">
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <div>
                  <form onSubmit={buscarEmpresas} className="flex items-center gap-2 mb-2">
                    <input
                      value={qEmpresa}
                      onChange={(e) => setQEmpresa(e.target.value)}
                      placeholder="Buscar empresa..."
                      className="rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-1.5 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-brand-300"
                    />
                    <button type="submit" className="grid h-8 w-8 place-items-center rounded-md bg-brand-600 text-white hover:bg-brand-700">
                      <Search size={16} />
                    </button>
                  </form>
                  {resultadosEmpresa.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {resultadosEmpresa.map((e) => (
                        <button
                          key={e.id}
                          onClick={() => { setEmpresaSel(e); setResultadosEmpresa([]); setQEmpresa(''); }}
                          className="rounded-full border border-gray-200 dark:border-gray-700 px-3 py-1.5 text-xs text-gray-600 dark:text-gray-300 hover:border-gray-300"
                        >
                          {e.razon_social}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Exportar */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 mr-1 inline-flex items-center gap-1">
              <Sliders size={13} /> Generar:
            </span>
            {FORMATOS.map(({ valor, etiqueta, icono: Icono }) => (
              <button
                key={valor}
                onClick={() => generar(valor)}
                disabled={generando !== null || columnas.length === 0}
                className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
              >
                <Icono size={14} /> {generando === valor ? 'Generando...' : etiqueta}
              </button>
            ))}
            <button
              onClick={() => generar('email')}
              disabled={generando !== null || columnas.length === 0}
              className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
            >
              <Mail size={14} /> {generando === 'email' ? 'Enviando...' : 'Enviar por correo'}
            </button>
            {columnas.length === 0 && <span className="text-xs text-red-500">Elige al menos una columna.</span>}
          </div>
        </>
      )}
    </div>
  );
}
