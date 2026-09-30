import { useEffect, useRef, useState } from 'react';
import { Send, MessageCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

const ROL_BADGE = {
  EMPRESA: 'text-brand-600 dark:text-brand-400',
  EMPLEADO: 'text-brand-600 dark:text-brand-400',
  SUPERADMIN: 'text-red-600 dark:text-red-400',
  ADMIN: 'text-red-600 dark:text-red-400',
};

export default function ChatLive({ mensajes, onEnviar, puedeComentar }) {
  const [texto, setTexto] = useState('');
  const finRef = useRef(null);

  useEffect(() => {
    finRef.current?.scrollIntoView({ block: 'end' });
  }, [mensajes.length]);

  function enviar(e) {
    e.preventDefault();
    if (!texto.trim()) return;
    onEnviar(texto.trim());
    setTexto('');
  }

  return (
    <div className="flex flex-col h-80 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden">
      <div className="flex items-center gap-2 border-b border-gray-100 dark:border-gray-800 px-4 py-2.5">
        <MessageCircle size={16} className="text-brand-600 dark:text-brand-400" />
        <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Chat en vivo</span>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
        {mensajes.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-6">Sé el primero en comentar.</p>
        ) : mensajes.map((m, i) => (
          <div key={i} className="text-sm">
            <span className={`font-semibold ${ROL_BADGE[m.usuario_rol] || 'text-gray-700 dark:text-gray-300'}`}>
              {m.usuario_nombre}
            </span>{' '}
            <span className="text-gray-600 dark:text-gray-400">{m.texto}</span>
          </div>
        ))}
        <div ref={finRef} />
      </div>

      {puedeComentar ? (
        <form onSubmit={enviar} className="flex items-center gap-2 border-t border-gray-100 dark:border-gray-800 p-2.5">
          <input
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            maxLength={280}
            placeholder="Escribe un comentario..."
            className="flex-1 rounded-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
          />
          <button type="submit" disabled={!texto.trim()} className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50">
            <Send size={14} />
          </button>
        </form>
      ) : (
        <div className="border-t border-gray-100 dark:border-gray-800 p-2.5 text-center">
          <Link to="/login" className="text-xs text-brand-600 dark:text-brand-400 hover:underline">
            Inicia sesión para comentar
          </Link>
        </div>
      )}
    </div>
  );
}
