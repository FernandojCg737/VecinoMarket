import { useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { Radio, Users, Square, MicOff, VideoOff, ArrowLeft } from 'lucide-react';
import API from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { esEmpresaOEmpleado } from '../../utils/roles';
import { ICE_SERVERS, urlSenalizacion } from '../../utils/liveSignaling';
import ChatLive from '../../components/live/ChatLive';

export default function TransmitirLive() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { usuario, cargando: cargandoAuth } = useAuth();

  const [estado, setEstado] = useState('conectando'); // conectando | en-vivo | terminando | error
  const [error, setError] = useState('');
  const [totalEspectadores, setTotalEspectadores] = useState(0);
  const [comentarios, setComentarios] = useState([]);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const wsRef = useRef(null);
  const peersRef = useRef(new Map());
  const terminandoRef = useRef(false);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const grabacionGuardadaRef = useRef(false);

  useEffect(() => {
    API.get(`promociones/lives/${id}/comentarios/`).then((res) => setComentarios(res.data)).catch(() => {});
  }, [id]);

  useEffect(() => {
    if (!usuario || !esEmpresaOEmpleado(usuario)) return;
    let cancelado = false;

    async function iniciar() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (cancelado) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
        iniciarGrabacion(stream);
      } catch {
        setError('No se pudo acceder a tu cámara/micrófono. Revisa los permisos del navegador.');
        setEstado('error');
        return;
      }

      const token = localStorage.getItem('vecinomarket_access');
      const ws = new WebSocket(urlSenalizacion(id, { rol: 'broadcaster', token }));
      wsRef.current = ws;

      ws.onopen = async () => {
        try {
          await API.patch(`promociones/mis-lives/${id}/`, { estado: 'EN_VIVO' });
          setEstado('en-vivo');
        } catch (err) {
          setError(err?.response?.data?.detail || 'No se pudo iniciar la transmisión.');
          setEstado('error');
        }
      };

      ws.onclose = () => {
        if (!terminandoRef.current) {
          setError('Se perdió la conexión con el servidor de señalización.');
          setEstado('error');
        }
      };

      ws.onmessage = async (event) => {
        const data = JSON.parse(event.data);

        if (data.type === 'chat-message') {
          setComentarios((prev) => [...prev, data]);
          return;
        }

        if (data.type === 'live-ended') {
          // Alguien finalizó esta sesión desde otro lado (ej. el botón
          // "Terminar" de la lista "Mis lives", en otra pestaña) mientras
          // esta pestaña seguía abierta transmitiendo o pausada-pero-
          // conectada — hay que guardar YA lo que se alcanzó a grabar.
          setEstado('terminando');
          await guardarGrabacion();
          limpiar();
          setEstado('finalizada-externa');
          return;
        }

        if (data.type === 'viewer-joined' || data.type === 'viewer-ready') {
          if (peersRef.current.has(data.from)) return; // ya tiene una conexión (evita duplicados en carreras)
          const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
          peersRef.current.set(data.from, pc);
          setTotalEspectadores(peersRef.current.size);

          streamRef.current.getTracks().forEach((track) => pc.addTrack(track, streamRef.current));
          pc.onicecandidate = (e) => {
            if (e.candidate) ws.send(JSON.stringify({ type: 'ice-candidate', to: data.from, candidate: e.candidate }));
          };
          pc.onconnectionstatechange = () => {
            if (['disconnected', 'failed', 'closed'].includes(pc.connectionState)) {
              peersRef.current.delete(data.from);
              setTotalEspectadores(peersRef.current.size);
            }
          };

          const oferta = await pc.createOffer();
          await pc.setLocalDescription(oferta);
          ws.send(JSON.stringify({ type: 'offer', to: data.from, sdp: oferta }));
          return;
        }

        const pc = peersRef.current.get(data.from);
        if (!pc) return;

        if (data.type === 'answer') {
          await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
        } else if (data.type === 'ice-candidate' && data.candidate) {
          await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
        }
      };
    }

    iniciar();

    return () => {
      cancelado = true;
      // Aunque se vaya sin usar el botón "Terminar" (navegó a otra pantalla,
      // el live quedó pausado del lado del servidor), esta pestaña TODAVÍA
      // tiene lo grabado hasta ahora en memoria — se guarda igual, así al
      // finalizar la sesión desde otro lado (ej. la lista de "Mis lives")
      // la grabación ya está subida.
      guardarGrabacion();
      limpiar();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuario]);

  function iniciarGrabacion(stream) {
    if (typeof MediaRecorder === 'undefined') return; // navegador sin soporte, el live sigue sin grabarse
    try {
      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus') ? 'video/webm;codecs=vp9,opus' : 'video/webm';
      const recorder = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.start(1000);
      recorderRef.current = recorder;
      // Recién ahora hay algo real que guardar — si un montaje "fantasma"
      // anterior (React StrictMode en desarrollo hace mount→cleanup→mount
      // de este mismo efecto) ya había marcado la bandera de "guardado" sin
      // haber llegado a crear ningún grabador, hay que destrabarla acá,
      // si no la grabación real de este montaje nunca se sube.
      grabacionGuardadaRef.current = false;
    } catch {
      recorderRef.current = null;
    }
  }

  function detenerGrabacion() {
    return new Promise((resolve) => {
      const recorder = recorderRef.current;
      if (!recorder || recorder.state === 'inactive') {
        resolve(null);
        return;
      }
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'video/webm' });
        resolve(blob.size > 0 ? blob : null);
      };
      recorder.stop();
    });
  }

  async function guardarGrabacion() {
    if (grabacionGuardadaRef.current) return; // ya se guardó (por el botón Terminar o por un desmontaje anterior)
    grabacionGuardadaRef.current = true;
    const grabacion = await detenerGrabacion();
    if (!grabacion) return;
    try {
      const formData = new FormData();
      formData.append('archivo', grabacion, 'grabacion.webm');
      await API.post(`promociones/mis-lives/${id}/subir-grabacion/`, formData, { headers: { 'Content-Type': undefined } });
    } catch {
      // no se pudo subir la grabación — no bloqueamos nada por esto
    }
  }

  function limpiar() {
    terminandoRef.current = true;
    peersRef.current.forEach((pc) => pc.close());
    peersRef.current.clear();
    wsRef.current?.close();
    streamRef.current?.getTracks().forEach((t) => t.stop());
  }

  if (cargandoAuth) return null;
  if (!usuario) return <Navigate to="/login" replace />;
  if (!esEmpresaOEmpleado(usuario)) return <Navigate to="/" replace />;

  async function enviarComentario(texto) {
    try {
      await API.post(`promociones/lives/${id}/comentarios/`, { texto });
    } catch {
      // el chat no es crítico para la transmisión, se ignora el error puntual
    }
  }

  async function terminar() {
    setEstado('terminando');
    wsRef.current?.send(JSON.stringify({ type: 'end-broadcast' }));
    await guardarGrabacion();
    limpiar();

    try {
      await API.patch(`promociones/mis-lives/${id}/`, { estado: 'FINALIZADA' });
    } catch {
      // el consumer ya lo marca FINALIZADA al recibir end-broadcast, esto es solo el camino feliz
    }

    navigate('/mi-empresa/lives');
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="flex items-center gap-2 mb-1">
        <Radio className="text-red-600" size={24} />
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Transmitiendo en vivo</h1>
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">CU17 · Tu cámara sale en vivo dentro de VecinoMarket.</p>

      {error && <p className="text-sm text-red-600 dark:text-red-400 mb-4">{error}</p>}

      <div className="relative rounded-xl overflow-hidden bg-black aspect-video">
        <video ref={videoRef} autoPlay muted playsInline className="h-full w-full object-cover" />
        {estado === 'en-vivo' && (
          <span className="absolute top-3 left-3 flex items-center gap-1.5 rounded-full bg-red-600 px-3 py-1 text-xs font-bold text-white">
            <Radio size={12} className="animate-pulse" /> EN VIVO
          </span>
        )}
        <span className="absolute top-3 right-3 flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1 text-xs font-semibold text-white">
          <Users size={12} /> {totalEspectadores}
        </span>
        {estado === 'conectando' && (
          <div className="absolute inset-0 grid place-items-center text-sm text-gray-300">Conectando cámara...</div>
        )}
        {(estado === 'terminando' || estado === 'finalizada-externa') && (
          <div className="absolute inset-0 grid place-items-center bg-black/70 text-sm text-gray-200 text-center px-6">
            {estado === 'terminando' ? 'Guardando grabación...' : 'Esta transmisión se finalizó desde otra pantalla. La grabación se guardó.'}
          </div>
        )}
      </div>

      {estado !== 'finalizada-externa' && (
        <div className="flex items-center gap-2 mt-4 text-xs text-gray-500 dark:text-gray-400">
          <VideoOff size={14} /> <MicOff size={14} />
          <span>Si navegas a otra pantalla sin terminar, el live queda pausado (hasta 30 minutos) y lo grabado hasta ese momento se guarda igual. Si cierras la pestaña del todo, eso sí se pierde.</span>
        </div>
      )}

      {estado === 'finalizada-externa' ? (
        <button
          onClick={() => navigate('/mi-empresa/lives')}
          className="mt-6 mb-6 flex items-center gap-1.5 rounded-full bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
        >
          <ArrowLeft size={14} /> Volver a mis lives
        </button>
      ) : (
        <button
          onClick={terminar}
          disabled={estado === 'terminando'}
          className="mt-6 mb-6 flex items-center gap-1.5 rounded-full bg-gray-800 dark:bg-gray-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-gray-900 disabled:opacity-60"
        >
          <Square size={14} /> {estado === 'terminando' ? 'Guardando...' : 'Terminar transmisión'}
        </button>
      )}

      {estado !== 'finalizada-externa' && (
        <ChatLive mensajes={comentarios} onEnviar={enviarComentario} puedeComentar />
      )}
    </div>
  );
}
