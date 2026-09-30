import { useEffect, useState } from 'react';
import { Bot, Send, User } from 'lucide-react';
import API from '../../api/axios';

export default function ChatbotWidget({ empresaId, empresaNombre }) {
  const [sugerencias, setSugerencias] = useState([]);
  const [historial, setHistorial] = useState([]);
  const [pregunta, setPregunta] = useState('');
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    setHistorial([]);
    API.get(`comunicacion/empresas/${empresaId}/faqs-chatbot/`).then((res) => setSugerencias(res.data)).catch(() => setSugerencias([]));
  }, [empresaId]);

  async function preguntar(texto) {
    const contenido = texto ?? pregunta;
    if (!contenido.trim()) return;
    setEnviando(true);
    setHistorial((prev) => [...prev, { autor: 'yo', texto: contenido }]);
    setPregunta('');
    try {
      const { data } = await API.post('comunicacion/preguntar-chatbot/', { empresa: empresaId, pregunta: contenido });
      setHistorial((prev) => [...prev, { autor: 'bot', texto: data.respuesta }]);
    } catch {
      setHistorial((prev) => [...prev, { autor: 'bot', texto: 'Ocurrió un error, intenta de nuevo.' }]);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="flex flex-col h-[50vh] rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden">
      <div className="flex items-center gap-2 border-b border-gray-100 dark:border-gray-800 px-4 py-3">
        <Bot size={18} className="text-brand-600 dark:text-brand-400" />
        <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Chatbot de {empresaNombre}</span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {historial.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-6">Pregúntale algo a esta tienda.</p>
        )}
        {historial.map((m, i) => (
          <div key={i} className={`flex ${m.autor === 'yo' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm flex items-start gap-1.5 ${m.autor === 'yo' ? 'bg-brand-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200'}`}>
              {m.autor === 'bot' && <Bot size={14} className="mt-0.5 shrink-0" />}
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
              className="rounded-full border border-gray-200 dark:border-gray-700 px-2.5 py-1 text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
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
          placeholder="Escribe tu pregunta..."
          className="flex-1 rounded-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
        />
        <button type="submit" disabled={enviando || !pregunta.trim()} className="grid h-9 w-9 place-items-center rounded-full bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50">
          <Send size={16} />
        </button>
      </form>
    </div>
  );
}
