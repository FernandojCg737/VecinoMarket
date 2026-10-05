import { useEffect, useMemo, useState } from 'react';
import {
  Sliders, FileText, FileSpreadsheet, FileType, Globe, Mail,
  Search, Building2, X, Table as TableIcon, Mic, MicOff, RefreshCw, Sparkles,
  Volume2, VolumeX
} from 'lucide-react';
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

function renderTextoConNegrita(txt) {
  if (!txt) return null;
  const partes = txt.split(/(\*\*[^*]+\*\*)/g);
  return partes.map((parte, i) => {
    if (parte.startsWith('**') && parte.endsWith('**')) {
      return (
        <strong key={i} className="font-bold text-purple-950 dark:text-purple-100 underline decoration-purple-300 dark:decoration-purple-600 underline-offset-2">
          {parte.slice(2, -2)}
        </strong>
      );
    }
    return parte;
  });
}

export default function ReportesDinamicosBase({
  catalogoUrl,
  generarUrl,
  permiteFiltrarEmpresa = false,
  permiteVoz = false,
}) {
  const [catalogo, setCatalogo] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  const [datasetKey, setDatasetKey] = useState('');
  const [columnas, setColumnas] = useState([]);
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [filtrosExtra, setFiltrosExtra] = useState({});
  const [generando, setGenerando] = useState(null);

  // Tabla en pantalla
  const [tablaDatos, setTablaDatos] = useState(null);
  const [cargandoTabla, setCargandoTabla] = useState(false);
  const [filtroTabla, setFiltroTabla] = useState('');

  // Reconocimiento y síntesis de voz por IA
  const [escuchandoVoz, setEscuchandoVoz] = useState(false);
  const [transcripcionVoz, setTranscripcionVoz] = useState('');
  const [consultaEscrita, setConsultaEscrita] = useState('');
  const [consultandoIA, setConsultandoIA] = useState(false);
  const [hablando, setHablando] = useState(false);
  const [vozHabilitada, setVozHabilitada] = useState(true);

  function hablar(texto) {
    if (!vozHabilitada || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(texto);
      utterance.lang = 'es-BO';
      utterance.rate = 1.05;
      utterance.pitch = 1.0;

      const voces = window.speechSynthesis.getVoices();
      const vozEs = voces.find((v) => v.lang.startsWith('es') || v.lang.includes('es-'));
      if (vozEs) utterance.voice = vozEs;

      utterance.onstart = () => setHablando(true);
      utterance.onend = () => setHablando(false);
      utterance.onerror = () => setHablando(false);

      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn('Error al reproducir voz:', err);
      setHablando(false);
    }
  }

  function detenerVoz() {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setHablando(false);
    }
  }

  // Filtro opcional por empresa (solo admin)
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
    setTablaDatos(null);
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

  async function cargarTabla(parametrosDirectos, onCompletado) {
    if (columnas.length === 0 && !parametrosDirectos?.columnas) {
      window.alert('Selecciona al menos una columna para consultar la tabla.');
      return;
    }
    setCargandoTabla(true);
    try {
      const queryParams = parametrosDirectos || { ...construirParams('json'), vista: 'tabla' };
      const res = await API.get(generarUrl, { params: queryParams });
      setTablaDatos(res.data);
      if (onCompletado) onCompletado(res.data);
    } catch (err) {
      setTablaDatos(null);
      const msg = err.response?.data?.detail || 'No se pudo obtener los datos del reporte.';
      window.alert(msg);
    } finally {
      setCargandoTabla(false);
    }
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

  function iniciarComandoVoz() {
    detenerVoz();
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      window.alert('Tu navegador no tiene soporte para la API de voz. Te recomendamos usar Google Chrome o Microsoft Edge.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'es-BO';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    setEscuchandoVoz(true);
    setTranscripcionVoz('Escuchando... Di: "¿cuál es el producto más vendido?", "ventas de este mes", etc.');

    recognition.onresult = (event) => {
      const texto = event.results[0][0].transcript;
      setTranscripcionVoz(`Comando IA reconocido: "${texto}"`);
      procesarComandoVoz(texto);
    };

    recognition.onerror = () => {
      setEscuchandoVoz(false);
      setTranscripcionVoz('No se pudo capturar la voz o se canceló el permiso de micrófono.');
    };

    recognition.onend = () => {
      setEscuchandoVoz(false);
    };

    recognition.start();
  }

  async function procesarComandoVoz(texto) {
    if (!texto || !texto.trim()) return;
    detenerVoz();
    setConsultandoIA(true);
    setTranscripcionVoz(`Consultando analítica para: "${texto}"...`);

    try {
      const payload = { pregunta: texto };
      if (permiteFiltrarEmpresa && empresaSel) {
        payload.empresa = empresaSel.id;
      }

      const res = await API.post('reportes/asistente-voz/', payload);
      const data = res.data;
      const respuesta = data.respuesta || 'Consulta analítica procesada.';
      const nuevoDataset = data.dataset;
      const nuevasCols = data.columnas;
      const fIni = data.fecha_inicio;
      const fFin = data.fecha_fin;

      // Validar que el dataset sugerido pertenezca al catálogo disponible del usuario
      const dsEncontrado = catalogo.find((c) => c.clave === nuevoDataset);
      const datasetFinal = dsEncontrado ? dsEncontrado.clave : (catalogo[0]?.clave || datasetKey);

      let colsFinales = nuevasCols;
      if (!Array.isArray(colsFinales) || colsFinales.length === 0 || !dsEncontrado) {
        const itemCat = catalogo.find((c) => c.clave === datasetFinal);
        colsFinales = itemCat ? itemCat.columnas.map((c) => c.clave) : columnas;
      }

      setDatasetKey(datasetFinal);
      setColumnas(colsFinales);
      setFechaInicio(fIni || '');
      setFechaFin(fFin || '');

      setTranscripcionVoz(respuesta);

      // Reproducir por voz la respuesta analítica descriptiva (limpiando asteriscos markdown)
      const textoLimpio = respuesta
        .replace(/\*\*/g, '')
        .replace(/\*/g, '')
        .replace(/Bs\s?/g, 'Bolivianos ');
      hablar(textoLimpio);

      // Cargar la tabla de datos correspondiente
      const directParams = {
        dataset: datasetFinal,
        columnas: colsFinales.join(','),
        formato: 'json',
        vista: 'tabla',
      };
      if (fIni) directParams.fecha_inicio = fIni;
      if (fFin) directParams.fecha_fin = fFin;
      if (permiteFiltrarEmpresa && empresaSel) directParams.empresa = empresaSel.id;

      cargarTabla(directParams);
    } catch (err) {
      console.warn('Error en asistente analítico por voz, usando fallback local:', err);
      ejecutarFallbackLocal(texto);
    } finally {
      setConsultandoIA(false);
    }
  }

  function ejecutarFallbackLocal(texto) {
    const textoNorm = (texto || '').toLowerCase();
    const encontrado = catalogo.find((d) => {
      const k = d.clave.toLowerCase();
      const nom = d.etiqueta.toLowerCase();
      return (
        textoNorm.includes(k) ||
        textoNorm.includes(nom) ||
        (k === 'pedidos' && (textoNorm.includes('venta') || textoNorm.includes('pedidos') || textoNorm.includes('ingreso') || textoNorm.includes('orden'))) ||
        (k === 'productos' && (textoNorm.includes('producto') || textoNorm.includes('stock') || textoNorm.includes('inventario') || textoNorm.includes('articulo') || textoNorm.includes('artículo') || textoNorm.includes('catálogo') || textoNorm.includes('catalogo'))) ||
        (k === 'facturas' && (textoNorm.includes('factura') || textoNorm.includes('facturacion') || textoNorm.includes('facturación'))) ||
        (k === 'empresas' && (textoNorm.includes('empresa') || textoNorm.includes('tienda')))
      );
    }) || catalogo[0];

    const nuevoDataset = encontrado ? encontrado.clave : datasetKey;
    const nuevasCols = encontrado ? encontrado.columnas.map((c) => c.clave) : columnas;
    setDatasetKey(nuevoDataset);
    setColumnas(nuevasCols);

    let fIni = fechaInicio;
    let fFin = fechaFin;
    let periodoTexto = '';
    const hoy = new Date();
    if (textoNorm.includes('hoy')) {
      fIni = hoy.toISOString().split('T')[0];
      fFin = fIni;
      periodoTexto = 'de hoy';
    } else if (textoNorm.includes('semana')) {
      const hace7 = new Date();
      hace7.setDate(hoy.getDate() - 7);
      fIni = hace7.toISOString().split('T')[0];
      fFin = hoy.toISOString().split('T')[0];
      periodoTexto = 'de la última semana';
    } else if (textoNorm.includes('mes')) {
      const hace30 = new Date();
      hace30.setDate(hoy.getDate() - 30);
      fIni = hace30.toISOString().split('T')[0];
      fFin = hoy.toISOString().split('T')[0];
      periodoTexto = 'del último mes';
    } else if (textoNorm.includes('año')) {
      fIni = `${hoy.getFullYear()}-01-01`;
      fFin = hoy.toISOString().split('T')[0];
      periodoTexto = 'de este año';
    }

    setFechaInicio(fIni);
    setFechaFin(fFin);

    const etiquetaFinal = encontrado ? encontrado.etiqueta : (catalogo.find((it) => it.clave === nuevoDataset)?.etiqueta || 'reporte');
    const directParams = {
      dataset: nuevoDataset,
      columnas: nuevasCols.join(','),
      formato: 'json',
      vista: 'tabla',
    };
    if (fIni) directParams.fecha_inicio = fIni;
    if (fFin) directParams.fecha_fin = fFin;

    cargarTabla(directParams, (data) => {
      const total = data?.total ?? data?.filas?.length ?? 0;
      const mensajeFin = `Mostrando ${total} registros del reporte de ${etiquetaFinal} en pantalla.`;
      setTranscripcionVoz(mensajeFin);
      hablar(mensajeFin);
    });
  }

  // Filtrado rápido en cliente sobre las filas de la tabla
  const filasFiltradas = useMemo(() => {
    if (!tablaDatos || !tablaDatos.filas) return [];
    if (!filtroTabla.trim()) return tablaDatos.filas;
    const q = filtroTabla.toLowerCase();
    return tablaDatos.filas.filter((fila) =>
      fila.some((celda) => String(celda).toLowerCase().includes(q))
    );
  }, [tablaDatos, filtroTabla]);

  if (cargando) return null;
  if (error) return <p className="text-sm text-red-600 dark:text-red-400">{error}</p>;
  if (catalogo.length === 0) {
    return <p className="text-sm text-gray-400 dark:text-gray-500">No tienes acceso a ningún reporte todavía.</p>;
  }

  return (
    <div className="space-y-6">
      {/* Selector de dataset */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">
          ¿Qué datos quieres consultar?
        </label>
        <div className="flex flex-wrap gap-2">
          {catalogo.map((d) => (
            <button
              key={d.clave}
              onClick={() => elegirDataset(d.clave)}
              className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
                datasetKey === d.clave
                  ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-400 shadow-sm'
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
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">
              Columnas a incluir ({columnas.length} seleccionadas)
            </label>
            <div className="flex flex-wrap gap-2">
              {dataset.columnas.map((c) => (
                <button
                  key={c.clave}
                  onClick={() => toggleColumna(c.clave)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
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
          <div className="flex flex-wrap items-end gap-4 p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
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
                  {f.opciones.map((op) => (
                    <option key={op.valor} value={op.valor}>
                      {op.etiqueta}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          {/* Filtro opcional por empresa (solo admin) */}
          {permiteFiltrarEmpresa && (
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">
                Empresa <span className="font-normal text-gray-400">— opcional, si no eliges ninguna el reporte es general</span>
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
                          onClick={() => {
                            setEmpresaSel(e);
                            setResultadosEmpresa([]);
                            setQEmpresa('');
                          }}
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

          {/* Barra del Asistente Analítico IA (voz y texto) */}
          {permiteVoz && (
            <div className="rounded-xl border border-purple-200 dark:border-purple-800/60 bg-gradient-to-r from-purple-50/70 via-indigo-50/40 to-purple-50/70 dark:from-purple-950/20 dark:via-gray-900 dark:to-purple-950/20 p-3.5 shadow-sm space-y-2.5">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <div className="relative flex-1 flex items-center bg-white dark:bg-gray-800 rounded-lg border border-purple-200 dark:border-purple-700/60 px-3 py-1.5 focus-within:ring-2 focus-within:ring-purple-400">
                  <Sparkles size={16} className="text-purple-600 dark:text-purple-400 shrink-0 mr-2" />
                  <input
                    type="text"
                    value={consultaEscrita}
                    onChange={(e) => setConsultaEscrita(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && consultaEscrita.trim()) {
                        procesarComandoVoz(consultaEscrita);
                        setConsultaEscrita('');
                      }
                    }}
                    placeholder="Pregúntale a la IA (ej: ¿cuál es el producto más vendido?, ¿cuánto vendí este mes?)..."
                    className="w-full text-xs sm:text-sm bg-transparent border-none text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none"
                  />
                  {consultaEscrita.trim() && (
                    <button
                      type="button"
                      onClick={() => {
                        procesarComandoVoz(consultaEscrita);
                        setConsultaEscrita('');
                      }}
                      disabled={consultandoIA}
                      className="text-xs font-semibold bg-purple-600 text-white rounded px-2.5 py-1 hover:bg-purple-700 transition shrink-0"
                    >
                      Preguntar
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={iniciarComandoVoz}
                    disabled={escuchandoVoz || consultandoIA}
                    className={`inline-flex items-center gap-1.5 rounded-lg border px-3.5 py-2 text-xs sm:text-sm font-semibold transition shadow-sm ${
                      escuchandoVoz
                        ? 'border-red-500 bg-red-50 dark:bg-red-950/40 text-red-600 animate-pulse'
                        : hablando
                        ? 'border-purple-500 bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 animate-pulse'
                        : consultandoIA
                        ? 'border-purple-400 bg-purple-100 dark:bg-purple-900 text-purple-700'
                        : 'border-purple-600 bg-purple-600 text-white hover:bg-purple-700'
                    }`}
                    title="Comando por voz IA (pulsa y habla)"
                  >
                    {escuchandoVoz ? (
                      <MicOff size={15} />
                    ) : hablando ? (
                      <Volume2 size={15} className="animate-bounce" />
                    ) : consultandoIA ? (
                      <RefreshCw size={15} className="animate-spin" />
                    ) : (
                      <Mic size={15} />
                    )}
                    <span>
                      {escuchandoVoz
                        ? 'Escuchando voz...'
                        : hablando
                        ? 'IA respondiendo...'
                        : consultandoIA
                        ? 'Analizando datos...'
                        : 'Comando por voz (IA)'}
                    </span>
                  </button>

                  {hablando && (
                    <button
                      type="button"
                      onClick={detenerVoz}
                      title="Silenciar respuesta por voz"
                      className="grid h-9 w-9 place-items-center rounded-lg border border-purple-200 dark:border-purple-800 bg-white dark:bg-gray-900 text-purple-600 hover:bg-purple-50 dark:hover:bg-gray-800 transition shadow-sm"
                    >
                      <VolumeX size={15} />
                    </button>
                  )}
                </div>
              </div>

              {/* Feedback y respuesta descriptiva de voz */}
              {transcripcionVoz && (
                <div className="p-3.5 rounded-lg bg-white/95 dark:bg-gray-900/95 border border-purple-200 dark:border-purple-800 text-xs sm:text-sm text-purple-950 dark:text-purple-200 flex items-start justify-between gap-3 shadow-sm">
                  <div className="flex items-start gap-2.5">
                    {hablando ? (
                      <Volume2 size={18} className="text-purple-600 dark:text-purple-400 animate-bounce shrink-0 mt-0.5" />
                    ) : consultandoIA ? (
                      <RefreshCw size={18} className="text-purple-600 dark:text-purple-400 animate-spin shrink-0 mt-0.5" />
                    ) : (
                      <Sparkles size={18} className="text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
                    )}
                    <div className="space-y-1">
                      <p className="font-bold text-[11px] text-purple-700 dark:text-purple-400 uppercase tracking-wider flex items-center gap-1.5">
                        Respuesta del Asistente Analítico IA
                        {hablando && <span className="inline-block w-2 h-2 rounded-full bg-purple-500 animate-ping" />}
                      </p>
                      <p className="leading-relaxed text-xs sm:text-sm">
                        {renderTextoConNegrita(transcripcionVoz)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {hablando && (
                      <button
                        type="button"
                        onClick={detenerVoz}
                        className="flex items-center gap-1 text-[11px] font-semibold text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-900/60 px-2 py-0.5 rounded hover:bg-purple-200 transition"
                      >
                        <VolumeX size={12} /> Silenciar
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setTranscripcionVoz('');
                        detenerVoz();
                      }}
                      className="text-purple-400 hover:text-purple-700 p-1"
                      title="Cerrar"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Barra de Acciones: Visualizar en tabla + Exportación */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-gray-200 dark:border-gray-800">
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => cargarTabla()}
                disabled={cargandoTabla || columnas.length === 0}
                className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 transition shadow-sm disabled:opacity-50"
              >
                {cargandoTabla ? <RefreshCw size={15} className="animate-spin" /> : <TableIcon size={15} />}
                {cargandoTabla ? 'Cargando datos...' : 'Visualizar tabla'}
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 mr-1 inline-flex items-center gap-1">
                <Sliders size={13} /> Exportar:
              </span>
              {FORMATOS.map(({ valor, etiqueta, icono: Icono }) => (
                <button
                  key={valor}
                  onClick={() => generar(valor)}
                  disabled={generando !== null || columnas.length === 0}
                  className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-2.5 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
                >
                  <Icono size={13} /> {generando === valor ? '...' : etiqueta}
                </button>
              ))}
              <button
                onClick={() => generar('email')}
                disabled={generando !== null || columnas.length === 0}
                className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-2.5 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
              >
                <Mail size={13} /> Correo
              </button>
            </div>
          </div>

          {/* TABLA DE RESULTADOS EN PANTALLA */}
          {tablaDatos && (
            <div className="mt-6 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/40">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">
                    {tablaDatos.titulo || 'Vista preliminar del reporte'}
                  </h3>
                  <span className="rounded-full bg-brand-100 dark:bg-brand-900/40 text-brand-700 dark:text-brand-300 px-2.5 py-0.5 text-xs font-semibold">
                    {tablaDatos.total} fila{tablaDatos.total === 1 ? '' : 's'}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={filtroTabla}
                    onChange={(e) => setFiltroTabla(e.target.value)}
                    placeholder="Filtrar en esta tabla..."
                    className="rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-1 text-xs w-48 focus:outline-none focus:ring-2 focus:ring-brand-300"
                  />
                  <button
                    onClick={() => cargarTabla()}
                    disabled={cargandoTabla}
                    className="grid h-7 w-7 place-items-center rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50"
                    title="Actualizar tabla"
                  >
                    <RefreshCw size={13} className={cargandoTabla ? 'animate-spin' : ''} />
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto max-h-[500px]">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="sticky top-0 z-10 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-semibold border-b border-gray-200 dark:border-gray-700">
                    <tr>
                      {tablaDatos.headers.map((h, i) => (
                        <th key={i} className="px-4 py-3 whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-gray-800 dark:text-gray-200">
                    {filasFiltradas.length === 0 ? (
                      <tr>
                        <td colSpan={tablaDatos.headers.length} className="px-4 py-8 text-center text-gray-400 dark:text-gray-500">
                          No se encontraron registros para los filtros seleccionados.
                        </td>
                      </tr>
                    ) : (
                      filasFiltradas.map((fila, fIndex) => (
                        <tr key={fIndex} className="hover:bg-gray-50/80 dark:hover:bg-gray-800/50 transition-colors">
                          {fila.map((celda, cIndex) => (
                            <td key={cIndex} className="px-4 py-2.5 whitespace-nowrap">
                              {celda === null || celda === undefined ? '—' : String(celda)}
                            </td>
                          ))}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
