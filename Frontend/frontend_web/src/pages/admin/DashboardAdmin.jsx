import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import {
  LayoutDashboard, Building2, Users, ShoppingBag, DollarSign, Percent, Star, TrendingUp,
  Mic, MicOff, Volume2, VolumeX, Sparkles, RefreshCw, X
} from 'lucide-react';
import API from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { esStaff } from '../../utils/roles';
import VentasPorDiaChart from '../../components/dashboard/VentasPorDiaChart';
import ExportarReporteMenu from '../../components/dashboard/ExportarReporteMenu';

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

function Tarjeta({ icono: Icono, etiqueta, valor, color }) {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
      <div className="flex items-center gap-2 mb-1">
        <div className={`grid h-8 w-8 place-items-center rounded-full ${color}`}>
          <Icono size={16} />
        </div>
        <span className="text-xs text-gray-500 dark:text-gray-400">{etiqueta}</span>
      </div>
      <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{valor}</p>
    </div>
  );
}

export default function DashboardAdmin() {
  const { usuario, cargando: cargandoAuth } = useAuth();
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState('');

  // Asistente por comando de voz e IA para todo el sistema (CU19)
  const [escuchandoVoz, setEscuchandoVoz] = useState(false);
  const [transcripcionVoz, setTranscripcionVoz] = useState('');
  const [consultaEscrita, setConsultaEscrita] = useState('');
  const [consultandoIA, setConsultandoIA] = useState(false);
  const [hablando, setHablando] = useState(false);
  const [vozHabilitada] = useState(true);

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
    setTranscripcionVoz('Escuchando consulta de la plataforma... Di: "¿cuál es el producto más vendido?", "¿cuál empresa vende más?", etc.');

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
    setTranscripcionVoz(`Consultando métricas de la plataforma para: "${texto}"...`);

    try {
      const res = await API.post('reportes/asistente-voz/', { pregunta: texto });
      const respuesta = res.data?.respuesta || 'Consulta analítica procesada.';
      setTranscripcionVoz(respuesta);

      const textoLimpio = respuesta
        .replace(/\*\*/g, '')
        .replace(/\*/g, '')
        .replace(/Bs\s?/g, 'Bolivianos ');
      hablar(textoLimpio);

      // Refrescar métricas del dashboard
      API.get('reportes/admin/dashboard/')
        .then((dashRes) => setDatos(dashRes.data))
        .catch(() => {});
    } catch (err) {
      console.warn('Error en asistente analítico por voz:', err);
      setTranscripcionVoz('No se pudo procesar la consulta por voz. Intenta nuevamente.');
    } finally {
      setConsultandoIA(false);
    }
  }

  useEffect(() => {
    if (!usuario || !esStaff(usuario)) return;
    API.get('reportes/admin/dashboard/')
      .then((res) => setDatos(res.data))
      .catch(() => setError('No se pudo cargar el dashboard.'));
  }, [usuario]);

  if (cargandoAuth) return null;
  if (!usuario) return <Navigate to="/login?next=/admin/dashboard" replace />;
  if (!esStaff(usuario)) return <Navigate to="/" replace />;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex items-center justify-between gap-2 mb-1">
        <div className="flex items-center gap-2">
          <LayoutDashboard className="text-brand-600 dark:text-brand-400" size={24} />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Dashboard administrativo</h1>
        </div>
        {datos && <ExportarReporteMenu url="reportes/admin/dashboard/exportar/" />}
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">CU19 · Métricas globales de la plataforma.</p>

      {/* Asistente Analítico por Voz y Texto para todo el Sistema */}
      <div className="rounded-xl border border-purple-200 dark:border-purple-800/60 bg-gradient-to-r from-purple-50/80 via-indigo-50/50 to-purple-50/80 dark:from-purple-950/30 dark:via-gray-900 dark:to-purple-950/30 p-3.5 shadow-sm space-y-2.5 mb-6">
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
              placeholder="Pregúntale a la IA del sistema (ej: ¿cuál es el producto más vendido?, ¿qué empresa vende más?, ¿cuánto se vendió en total?)..."
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
              title="Comando por voz IA para toda la plataforma"
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
                  ? 'Analizando sistema...'
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

        {/* Respuesta descriptiva por voz/texto */}
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
                  Asistente IA del Sistema Global
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

      {error && <p className="text-sm text-red-600 dark:text-red-400 mb-4">{error}</p>}

      {!datos ? (
        <p className="text-sm text-gray-400">Cargando...</p>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Tarjeta icono={DollarSign} etiqueta="Ventas totales" valor={`Bs ${datos.total_ventas.toFixed(2)}`} color="bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400" />
            <Tarjeta icono={Percent} etiqueta="Comisiones cobradas" valor={`Bs ${datos.total_comisiones.toFixed(2)}`} color="bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400" />
            <Tarjeta icono={Building2} etiqueta="Empresas" valor={datos.total_empresas} color="bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400" />
            <Tarjeta icono={Star} etiqueta="Valoración promedio" valor={`${datos.valoracion_promedio} ★`} color="bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400" />
          </div>

          <VentasPorDiaChart datos={datos.ventas_por_dia} />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
              <div className="flex items-center gap-1.5 mb-3">
                <TrendingUp size={16} className="text-brand-600 dark:text-brand-400" />
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Top empresas por ventas</p>
              </div>
              {datos.top_empresas.length === 0 ? (
                <p className="text-xs text-gray-400">Sin datos todavía.</p>
              ) : datos.top_empresas.map((e, i) => (
                <div key={i} className="flex justify-between text-sm py-1 border-b border-gray-50 dark:border-gray-800 last:border-0">
                  <span className="text-gray-700 dark:text-gray-300">{i + 1}. {e.empresa}</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">Bs {e.ventas.toFixed(2)}</span>
                </div>
              ))}
            </div>

            <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
              <div className="flex items-center gap-1.5 mb-3">
                <ShoppingBag size={16} className="text-brand-600 dark:text-brand-400" />
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Productos más vendidos</p>
              </div>
              {datos.top_productos.length === 0 ? (
                <p className="text-xs text-gray-400">Sin datos todavía.</p>
              ) : datos.top_productos.map((p, i) => (
                <div key={i} className="flex justify-between text-sm py-1 border-b border-gray-50 dark:border-gray-800 last:border-0">
                  <span className="text-gray-700 dark:text-gray-300">{i + 1}. {p.producto}</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">{p.unidades} und.</span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
              <div className="flex items-center gap-1.5 mb-3">
                <Users size={16} className="text-brand-600 dark:text-brand-400" />
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Usuarios activos por rol</p>
              </div>
              {Object.entries(datos.usuarios_por_rol).map(([rol, total]) => (
                <div key={rol} className="flex justify-between text-sm py-1 border-b border-gray-50 dark:border-gray-800 last:border-0">
                  <span className="text-gray-700 dark:text-gray-300">{rol}</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">{total}</span>
                </div>
              ))}
            </div>

            <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
              <div className="flex items-center gap-1.5 mb-3">
                <ShoppingBag size={16} className="text-brand-600 dark:text-brand-400" />
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Pedidos por estado</p>
              </div>
              {Object.entries(datos.pedidos_por_estado).map(([estado, total]) => (
                <div key={estado} className="flex justify-between text-sm py-1 border-b border-gray-50 dark:border-gray-800 last:border-0">
                  <span className="text-gray-700 dark:text-gray-300">{estado}</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">{total}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
