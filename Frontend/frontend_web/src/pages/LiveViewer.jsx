import { useEffect, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Radio, Store, ArrowLeft, Share2, Film } from 'lucide-react';
import API from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { esEmpresaOEmpleado } from '../utils/roles';
import { ICE_SERVERS, urlSenalizacion } from '../utils/liveSignaling';
import ChatLive from '../components/live/ChatLive';

export default function LiveViewer() {
  const { id } = useParams();
  const { usuario } = useAuth();
  const [sesion, setSesion] = useState(null);
  const [error, setError] = useState('');
  const [conectado, setConectado] = useState(false);
  const [terminado, setTerminado] = useState(false);
  const [pausado, setPausado] = useState(false);
  const [remoteStream, setRemoteStream] = useState(null);
  const [comentarios, setComentarios] = useState([]);
  const [copiado, setCopiado] = useState(false);

  const videoRef = useRef(null);
  const wsRef = useRef(null);
  const pcRef = useRef(null);
  const broadcasterChannelRef = useRef(null);

  useEffect(() => {
    if (remoteStream && videoRef.current) videoRef.current.srcObject = remoteStream;
  }, [remoteStream]);

  useEffect(() => {
    API.get(`promociones/lives/${id}/`)
      .then((res) => {
        setSesion(res.data);
        setPausado(res.data.pausado);
        // Una vez finalizada, el chat queda archivado — solo la propia
        // empresa puede leerlo, y eso lo ve en /mi-empresa/lives/:id/grabacion
        // (ver el enlace más abajo), no acá.
        if (res.data.estado === 'FINALIZADA') return;
        API.get(`promociones/lives/${id}/comentarios/`)
          .then((r) => setComentarios(r.data))
          .catch(() => {});
      })
      .catch(() => setError('No se encontró esta transmisión.'));
  }, [id]);

  useEffect(() => {
    if (!sesion || sesion.estado === 'FINALIZADA') return;

    const ws = new WebSocket(urlSenalizacion(id, { rol: 'viewer' }));
    wsRef.current = ws;

    ws.onmessage = async (event) => {
      const data = JSON.parse(event.data);

      if (data.type === 'chat-message') {
        setComentarios((prev) => [...prev, data]);
        return;
      }

      if (data.type === 'live-ended') {
        setTerminado(true);
        setConectado(false);
        return;
      }

      if (data.type === 'live-paused') {
        setPausado(true);
        setConectado(false);
        return;
      }

      if (data.type === 'broadcaster-ready') {
        setPausado(false);
        broadcasterChannelRef.current = data.from;
        ws.send(JSON.stringify({ type: 'viewer-ready', to: data.from }));
        return;
      }

      if (data.type === 'offer') {
        broadcasterChannelRef.current = data.from;
        const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
        pcRef.current = pc;

        pc.ontrack = (e) => {
          setRemoteStream(e.streams[0]);
          setConectado(true);
        };
        pc.onicecandidate = (e) => {
          if (e.candidate) ws.send(JSON.stringify({ type: 'ice-candidate', to: data.from, candidate: e.candidate }));
        };

        await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
        const respuesta = await pc.createAnswer();
        await pc.setLocalDescription(respuesta);
        ws.send(JSON.stringify({ type: 'answer', to: data.from, sdp: respuesta }));
        return;
      }

      if (data.type === 'ice-candidate' && data.candidate && pcRef.current) {
        await pcRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
      }
    };

    return () => {
      pcRef.current?.close();
      ws.close();
    };
  }, [sesion, id]);

  async function enviarComentario(texto) {
    try {
      await API.post(`promociones/lives/${id}/comentarios/`, { texto });
    } catch {
      // el chat no es crítico para ver el live, se ignora el error puntual
    }
  }

  async function compartir() {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: sesion?.titulo, url });
        return;
      } catch {
        // el usuario canceló el share nativo, sigue al fallback de copiar
      }
    }
    await navigator.clipboard.writeText(url);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  if (error) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <Radio className="mx-auto mb-3 text-gray-300 dark:text-gray-600" size={40} />
        <p className="text-sm text-gray-500 dark:text-gray-400">{error}</p>
        <Link to="/live" className="inline-flex items-center gap-1.5 mt-4 text-sm text-brand-600 dark:text-brand-400 hover:underline">
          <ArrowLeft size={14} /> Volver a lives
        </Link>
      </div>
    );
  }

  if (!sesion) {
    return <div className="mx-auto max-w-3xl px-4 py-16 text-center text-gray-400">Cargando...</div>;
  }

  const yaTermino = terminado || sesion.estado === 'FINALIZADA';
  const noEmpezoTodavia = !yaTermino && !pausado && !conectado && sesion.estado === 'PROGRAMADA';

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link to="/live" className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-brand-600 dark:hover:text-brand-400 mb-4">
        <ArrowLeft size={16} /> Volver a lives
      </Link>

      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          {sesion.empresa_logo_url ? (
            <img src={sesion.empresa_logo_url} alt="" className="h-8 w-8 rounded-full object-cover border border-gray-200 dark:border-gray-700" />
          ) : (
            <div className="grid h-8 w-8 place-items-center rounded-full bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400">
              <Store size={14} />
            </div>
          )}
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{sesion.empresa_nombre}</span>
        </div>
        <button onClick={compartir} className="flex items-center gap-1.5 rounded-full border border-gray-300 dark:border-gray-700 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
          <Share2 size={13} /> {copiado ? 'Enlace copiado' : 'Compartir'}
        </button>
      </div>
      <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">{sesion.titulo}</h1>

      <div className="relative rounded-xl overflow-hidden bg-black aspect-video">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className="h-full w-full object-cover"
          style={{ display: conectado && !yaTermino && !pausado ? 'block' : 'none' }}
        />
        {conectado && !yaTermino && !pausado && (
          <span className="absolute top-3 left-3 flex items-center gap-1.5 rounded-full bg-red-600 px-3 py-1 text-xs font-bold text-white">
            <Radio size={12} className="animate-pulse" /> EN VIVO
          </span>
        )}
        {yaTermino && (
          <div className="absolute inset-0 grid place-items-center text-sm text-gray-300">Esta transmisión terminó.</div>
        )}
        {yaTermino && esEmpresaOEmpleado(usuario) && usuario.empresa_id === sesion.empresa && (
          <Link
            to={`/mi-empresa/lives/${id}/grabacion`}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 rounded-full bg-brand-600 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-700"
          >
            <Film size={13} /> Ver grabación completa
          </Link>
        )}
        {!yaTermino && pausado && (
          <div className="absolute inset-0 grid place-items-center bg-gray-700 text-center px-6">
            <div>
              <p className="text-sm font-semibold text-gray-100">Live pausado</p>
              <p className="text-xs text-gray-300 mt-1">El anfitrión pronto volverá.</p>
            </div>
          </div>
        )}
        {noEmpezoTodavia && (
          <div className="absolute inset-0 grid place-items-center text-sm text-gray-300">Esperando a que la empresa empiece...</div>
        )}
        {!conectado && !yaTermino && !pausado && !noEmpezoTodavia && (
          <div className="absolute inset-0 grid place-items-center text-sm text-gray-300">Conectando...</div>
        )}
      </div>

      {!yaTermino && (
        <div className="mt-6">
          <ChatLive mensajes={comentarios} onEnviar={enviarComentario} puedeComentar={Boolean(usuario)} />
        </div>
      )}

      {sesion.productos_detalle?.length > 0 && (
        <div className="mt-6">
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Productos en este live</p>
          <div className="space-y-2">
            {sesion.productos_detalle.map((p) => (
              <Link
                key={p.id}
                to={`/productos/${p.id}`}
                className="flex items-center justify-between rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-2.5 hover:border-brand-400 dark:hover:border-brand-500"
              >
                <span className="text-sm text-gray-800 dark:text-gray-200">{p.nombre}</span>
                <span className="text-sm font-semibold text-brand-600 dark:text-brand-400">Bs {p.precio}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
