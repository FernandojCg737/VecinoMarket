import { useEffect, useRef, useState } from 'react';
import { Send, Image as ImageIcon, Mic, Video } from 'lucide-react';
import API from '../../api/axios';

const INTERVALO_MS = 5000;

export default function ChatThread({ conversacionId, mensajesUrlBase, usuarioId, soloLectura = false }) {
  const [mensajes, setMensajes] = useState([]);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');
  const finRef = useRef(null);

  const url = `${mensajesUrlBase}${conversacionId}/mensajes/`;

  function cargar() {
    return API.get(url).then((res) => setMensajes(res.data)).catch(() => setError('No se pudo cargar los mensajes.'));
  }

  useEffect(() => {
    cargar();
    if (soloLectura) return;
    const id = setInterval(cargar, INTERVALO_MS);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversacionId]);

  useEffect(() => {
    finRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensajes.length]);

  async function enviarTexto(e) {
    e.preventDefault();
    if (!texto.trim()) return;
    setEnviando(true);
    try {
      await API.post(url, { tipo: 'TEXTO', contenido: texto.trim() });
      setTexto('');
      await cargar();
    } catch {
      setError('No se pudo enviar el mensaje.');
    } finally {
      setEnviando(false);
    }
  }

  async function enviarArchivo(tipo, archivo) {
    if (!archivo) return;
    setEnviando(true);
    setError('');
    const formData = new FormData();
    formData.append('tipo', tipo);
    formData.append('archivo', archivo);
    try {
      await API.post(url, formData, { headers: { 'Content-Type': undefined } });
      await cargar();
    } catch {
      setError('No se pudo enviar el archivo.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="flex flex-col h-[60vh] rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden">
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {mensajes.map((m) => {
          const propio = m.emisor_usuario === usuarioId;
          return (
            <div key={m.id} className={`flex ${propio ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${propio ? 'bg-brand-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200'}`}>
                {!propio && <div className="text-[10px] opacity-70 mb-0.5">{m.emisor_nombre}</div>}
                {m.tipo === 'TEXTO' && <p>{m.contenido}</p>}
                {m.tipo === 'IMAGEN' && <img src={m.archivo_url} alt="" className="max-w-full rounded-md" />}
                {m.tipo === 'AUDIO' && <audio controls src={m.archivo_url} className="max-w-full" />}
                {m.tipo === 'VIDEO' && (
                  <video controls src={m.archivo_url} className="max-w-full rounded-md" style={{ maxHeight: 200 }} />
                )}
                <div className="text-[10px] opacity-60 mt-0.5 text-right">{new Date(m.fecha_envio).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
              </div>
            </div>
          );
        })}
        <div ref={finRef} />
        {mensajes.length === 0 && <p className="text-sm text-gray-400 text-center py-8">Sin mensajes todavía.</p>}
      </div>

      {error && <p className="text-xs text-red-600 dark:text-red-400 px-4">{error}</p>}

      {!soloLectura && (
        <form onSubmit={enviarTexto} className="flex items-center gap-2 border-t border-gray-100 dark:border-gray-800 p-3">
          <label className="cursor-pointer text-gray-400 hover:text-brand-600 dark:hover:text-brand-400">
            <ImageIcon size={18} />
            <input type="file" accept="image/*" className="hidden" onChange={(e) => { enviarArchivo('IMAGEN', e.target.files?.[0]); e.target.value = ''; }} />
          </label>
          <label className="cursor-pointer text-gray-400 hover:text-brand-600 dark:hover:text-brand-400">
            <Mic size={18} />
            <input type="file" accept="audio/*" className="hidden" onChange={(e) => { enviarArchivo('AUDIO', e.target.files?.[0]); e.target.value = ''; }} />
          </label>
          <label className="cursor-pointer text-gray-400 hover:text-brand-600 dark:hover:text-brand-400">
            <Video size={18} />
            <input type="file" accept="video/*" className="hidden" onChange={(e) => { enviarArchivo('VIDEO', e.target.files?.[0]); e.target.value = ''; }} />
          </label>
          <input
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Escribe un mensaje..."
            className="flex-1 rounded-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
          />
          <button type="submit" disabled={enviando || !texto.trim()} className="grid h-9 w-9 place-items-center rounded-full bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50">
            <Send size={16} />
          </button>
        </form>
      )}
    </div>
  );
}
