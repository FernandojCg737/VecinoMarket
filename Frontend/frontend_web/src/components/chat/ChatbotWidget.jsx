import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bot, Send, User, Lock } from 'lucide-react';
import API from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { esComprador } from '../../utils/roles';

export default function ChatbotWidget({ empresaId, empresaNombre }) {
  const { usuario } = useAuth();
  const [sugerencias, setSugerencias] = useState([]);
  const [historial, setHistorial] = useState([]);
  const [pregunta, setPregunta] = useState('');
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    setHistorial([]);
    API.get(`comunicacion/empresas/${empresaId}/faqs-chatbot/`).then((res) => setSugerencias(res.data)).catch(() => setSugerencias([]));
  }, [empresaId]);

  async function preguntar(texto) {
    if (!usuario) {
      alert('Debes iniciar sesión con tu cuenta de comprador para usar el chatbot.');
      return;
    }
    if (!esComprador(usuario)) {
      alert('El chatbot de tiendas está disponible exclusivamente para compradores.');
      return;
    }

    const contenido = texto ?? pregunta;
    if (!contenido.trim()) return;
    setEnviando(true);
    setHistorial((prev) => [...prev, { autor: 'yo', texto: contenido }]);
    setPregunta('');
    try {
      const { data } = await API.post('comunicacion/preguntar-chatbot/', { empresa: empresaId, pregunta: contenido });
      setHistorial((prev) => [...prev, { autor: 'bot', texto: data.respuesta }]);
    } catch {
      setHistorial((prev) => [...prev, { autor: 'bot', texto: 'Ocurrió un error al consultar al chatbot. Intenta de nuevo.' }]);
    } finally {
      setEnviando(false);
    }
  }

  const puedeUsar = Boolean(usuario && esComprador(usuario));

  return (
    <div className="flex flex-col h-[50vh] rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden shadow-sm">
      <div className="flex items-center gap-2 border-b border-gray-100 dark:border-gray-800 px-4 py-3 bg-gray-50/50 dark:bg-gray-800/40">
        <Bot size={18} className="text-brand-600 dark:text-brand-400" />
        <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Chatbot de {empresaNombre}</span>
      </div>

      {!puedeUsar ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="grid h-12 w-12 place-items-center rounded-full bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 mb-3">
            <Lock size={22} />
          </div>
          <h4 className="font-semibold text-gray-900 dark:text-gray-100 text-sm mb-1">
            Inicia sesión como comprador
          </h4>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4 max-w-xs">
            CU15 · El asistente virtual está disponible exclusivamente para compradores con sesión activa.
          </p>
          <Link
            to={`/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`}
            className="rounded-full bg-brand-600 px-5 py-2 text-xs font-semibold text-white hover:bg-brand-700 transition"
          >
            Iniciar sesión
          </Link>
        </div>
      ) : (
        <>
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {historial.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-6">
                ¡Hola! Pregúntale sobre horarios, envíos, métodos de pago o catálogo a esta tienda.
              </p>
            )}
            {historial.map((m, i) => (
              <div key={i} className={`flex ${m.autor === 'yo' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm flex items-start gap-1.5 ${m.autor === 'yo' ? 'bg-brand-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200'}`}>
                  {m.autor === 'bot' && <Bot size={14} className="mt-0.5 shrink-0 text-brand-600 dark:text-brand-400" />}
                  <span>{m.texto}</span>
                  {m.autor === 'yo' && <User size={14} className="mt-0.5 shrink-0" />}
                </div>
              </div>
            ))}
          </div>

          {sugerencias.length > 0 && historial.length === 0 && (
            <div className="flex flex-wrap gap-1.5 px-4 pb-2">
              {sugerencias.map((s) => (
                <button
                  key={s.id}
                  onClick={() => preguntar(s.pregunta_ejemplo)}
                  className="rounded-full border border-gray-200 dark:border-gray-700 px-2.5 py-1 text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                >
                  {s.pregunta_ejemplo}
                </button>
              ))}
            </div>
          )}

          <form onSubmit={(e) => { e.preventDefault(); preguntar(); }} className="flex items-center gap-2 border-t border-gray-100 dark:border-gray-800 p-3">
            <input
              value={pregunta}
              onChange={(e) => setPregunta(e.target.value)}
              placeholder="Escribe tu pregunta a la tienda..."
              className="flex-1 rounded-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
            />
            <button type="submit" disabled={enviando || !pregunta.trim()} className="grid h-9 w-9 place-items-center rounded-full bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50">
              <Send size={16} />
            </button>
          </form>
        </>
      )}
    </div>
  );
}
