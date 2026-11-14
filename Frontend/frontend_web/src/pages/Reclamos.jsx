import { useEffect, useState } from 'react';
import { ArrowLeft, ClipboardList } from 'lucide-react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import API from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { esComprador, esStaff, tienePermisoEmpleado } from '../utils/roles';

const motivos = { DANADO: 'Producto dañado', NO_CORRESPONDE: 'El producto no corresponde', INCOMPLETO: 'Pedido incompleto' };
const acciones = {
  aprobar: 'Aprobar devolución', rechazar: 'Rechazar reclamo', escalar: 'Solicitar mediación',
  mediar_aprobar: 'Resolver a favor del comprador', mediar_rechazar: 'Confirmar rechazo',
  confirmar_qr: 'Registrar transferencia realizada', verificar_paypal: 'Verificar reembolso en PayPal',
  conciliar_paypal: 'Conciliar referencia de PayPal',
};
const estados = {
  PENDIENTE: 'En revisión', RECHAZADA: 'Rechazada por la empresa', EN_MEDIACION: 'En mediación',
  RECHAZADA_MEDIACION: 'Rechazo confirmado', REEMBOLSO_PENDIENTE: 'Reembolso pendiente', APROBADA: 'Reembolsada',
};
const campo = 'mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900';
const tarjeta = 'rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900';
const boton = 'rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60';
const enlace = 'text-sm font-semibold text-brand-600 dark:text-brand-400';

function mensaje(err) {
  const datos = err.response?.data;
  return datos?.detail || Object.values(datos || {}).flat().find((v) => typeof v === 'string') || 'No se pudo completar la solicitud.';
}

function usarConsulta(ruta, pagina = 1, estado = '') {
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const cancel = new AbortController();
    API.get(ruta, { params: { page: pagina, estado }, signal: cancel.signal })
      .then(({ data }) => { if (!cancel.signal.aborted) setDatos(data); })
      .catch((err) => { if (!cancel.signal.aborted) setError(mensaje(err)); });
    return () => cancel.abort();
  }, [ruta, pagina, estado, revision]);
  function recargar() {
    setError('');
    setDatos(null);
    setRevision((n) => n + 1);
  }
  return { datos, setDatos, error, setError, recargar };
}

function Estado({ caso }) {
  const color = caso.estado === 'APROBADA'
    ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300'
    : 'bg-amber-50 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300';
  return <span className={'rounded-full px-2.5 py-1 text-xs font-semibold ' + color}>{caso.estado_label}</span>;
}

function Evidencia({ ruta }) {
  const [src, setSrc] = useState('');
  const [error, setError] = useState(false);
  useEffect(() => {
    const cancel = new AbortController();
    let url;
    API.get(ruta.replace(/^\/api\//, ''), { responseType: 'blob', signal: cancel.signal })
      .then(({ data }) => {
        if (!cancel.signal.aborted) {
          url = URL.createObjectURL(data);
          setSrc(url);
        }
      })
      .catch(() => { if (!cancel.signal.aborted) setError(true); });
    return () => {
      cancel.abort();
      if (url) URL.revokeObjectURL(url);
    };
  }, [ruta]);
  if (error) return <p role="status">La foto no está disponible.</p>;
  if (!src) return <p role="status">Cargando foto…</p>;
  return <a href={src} target="_blank" rel="noreferrer"><img src={src} alt="Foto de evidencia" className="max-h-72 rounded-lg object-contain" /></a>;
}

function Bandeja({ base }) {
  const [estado, setEstado] = useState('');
  const [pagina, setPagina] = useState(1);
  const { datos, error, recargar } = usarConsulta('pedidos/reclamos/', pagina, estado);
  return <>
    <label className="block max-w-xs text-sm font-medium">Estado
      <select className={campo} value={estado} onChange={(e) => { setEstado(e.target.value); setPagina(1); recargar(); }}>
        <option value="">Todos los estados</option>
        {Object.entries(estados).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select>
    </label>
    {error ? <div role="alert" className={tarjeta}>{error} <button className={enlace} onClick={recargar}>Reintentar</button></div>
      : !datos ? <p role="status">Cargando reclamos…</p>
        : datos.results.length === 0 ? <p className={tarjeta}>No hay reclamos en este estado.</p>
          : datos.results.map((caso) => <Link key={caso.id} to={base + '/' + caso.id}
            className={tarjeta + ' flex flex-wrap items-center justify-between gap-3 hover:border-brand-400'}>
            <div><p className="font-semibold">{caso.numero_pedido} · {caso.empresa}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">{caso.motivo_label} · {new Date(caso.creado_en).toLocaleDateString('es-BO')}</p></div>
            <Estado caso={caso} />
          </Link>)}
    {datos && (datos.next || datos.previous) && <nav aria-label="Páginas de reclamos" className="flex gap-3">
      <button className={boton} disabled={!datos.previous} onClick={() => { setPagina(pagina - 1); recargar(); }}>Anterior</button>
      <button className={boton} disabled={!datos.next} onClick={() => { setPagina(pagina + 1); recargar(); }}>Siguiente</button>
    </nav>}
  </>;
}

function NuevoReclamo({ pedido }) {
  const navegar = useNavigate();
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState('');
  async function enviar(e) {
    e.preventDefault();
    if (ocupado) return;
    const datos = new FormData(e.currentTarget);
    if (!datos.get('evidencia')?.size || datos.get('evidencia').size > 5 * 1024 * 1024) {
      setError('Adjunta una foto de hasta 5 MB.');
      return;
    }
    datos.set('pedido', pedido);
    setError('');
    setOcupado(true);
    try {
      const { data } = await API.post('pedidos/reclamos/crear/', datos);
      navegar('/mis-reclamos/' + data.id, { replace: true });
    } catch (err) {
      setError(mensaje(err));
    } finally {
      setOcupado(false);
    }
  }
  return <>
    <Link to="/mis-compras" className={enlace}>Volver a Mis compras</Link>
    <form className={tarjeta + ' space-y-4'} onSubmit={enviar}>
      <h2 className="font-semibold">Solicitar devolución</h2>
      <label className="block text-sm">Motivo
        <select name="motivo" className={campo} required defaultValue="">
          <option value="" disabled>Selecciona un motivo</option>
          {Object.entries(motivos).map(([valor, label]) => <option key={valor} value={valor}>{label}</option>)}
        </select>
      </label>
      <label className="block text-sm">Descripción
        <textarea name="descripcion" className={campo} rows={4} maxLength={2000} required />
      </label>
      <label className="block text-sm">Foto de evidencia
        <input type="file" name="evidencia" accept="image/jpeg,image/png,image/webp" required className={campo} />
      </label>
      {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      <button className={boton} disabled={ocupado}>{ocupado ? 'Enviando…' : 'Enviar reclamo'}</button>
    </form>
  </>;
}

function Detalle({ id, base }) {
  const ruta = 'pedidos/reclamos/' + id + '/';
  const { datos: caso, setDatos, error, setError, recargar } = usarConsulta(ruta);
  const [ocupado, setOcupado] = useState(false);
  const [accion, setAccion] = useState('');
  const [errorAccion, setErrorAccion] = useState('');
  async function resolver(e) {
    e.preventDefault();
    if (ocupado) return;
    const form = new FormData(e.currentTarget);
    const datos = { accion };
    for (const nombre of ['respuesta', 'referencia']) {
      if (form.has(nombre)) datos[nombre] = form.get(nombre);
    }
    datos.sucursales = Object.fromEntries(
      [...form].filter(([nombre]) => nombre.startsWith('sucursal-')).map(([nombre, valor]) => [nombre.slice(9), Number(valor)]),
    );
    setErrorAccion('');
    setOcupado(true);
    try {
      const { data } = await API.post(ruta + 'accion/', datos);
      setDatos(data);
      setAccion('');
    } catch (err) {
      setErrorAccion(mensaje(err));
      if ([409, 502].includes(err.response?.status)) { setAccion(''); recargar(); }
    } finally {
      setOcupado(false);
    }
  }
  const aprobacion = accion === 'aprobar' || accion === 'mediar_aprobar';
  return <>
    <Link to={base} className={enlace + ' flex items-center gap-2'}><ArrowLeft size={16} /> Volver a reclamos</Link>
    {(error || errorAccion) && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error || errorAccion}</p>}
    {!caso ? (error ? <button className={boton} onClick={() => { setError(''); recargar(); }}>Reintentar</button> : <p role="status">Cargando reclamo…</p>) : <>
      <section className={tarjeta + ' space-y-3'}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-bold">{caso.numero_pedido} · {caso.empresa}</h2><Estado caso={caso} />
        </div>
        <p className="text-xs text-gray-500">Abierto el {new Date(caso.creado_en).toLocaleString('es-BO')}</p>
        <div><h3 className="text-sm font-semibold">{caso.motivo_label}</h3><p className="whitespace-pre-wrap break-words text-sm">{caso.descripcion}</p></div>
        <Evidencia ruta={caso.evidencia_path} />
        {[
          ['Respuesta de la empresa', caso.respuesta, caso.fecha_respuesta],
          ['Motivo de mediación', caso.motivo_mediacion, caso.fecha_mediacion],
          ['Resolución de la plataforma', caso.resolucion_mediacion, caso.fecha_resolucion],
        ].map(([titulo, texto, fecha]) => texto && <div key={titulo} className="border-t border-gray-200 pt-3 dark:border-gray-700">
          <h3 className="text-sm font-semibold">{titulo}</h3>
          {fecha && <time className="text-xs text-gray-500">{new Date(fecha).toLocaleString('es-BO')}</time>}
          <p className="whitespace-pre-wrap break-words text-sm">{texto}</p>
        </div>)}
        {caso.monto_reembolso && <p className="text-sm">Reembolso de Bs {caso.monto_reembolso} por {caso.metodo_pago}</p>}
        {caso.fecha_reembolso && <p className="text-sm">Confirmado el {new Date(caso.fecha_reembolso).toLocaleString('es-BO')} · {caso.referencia_reembolso}</p>}
      </section>
      {caso.acciones.length > 0 && <form onSubmit={resolver} className={tarjeta + ' space-y-3'}>
        <label className="block text-sm">Acción
          <select required className={campo} value={accion} onChange={(e) => setAccion(e.target.value)}>
            <option value="">Selecciona una acción</option>
            {caso.acciones.map((opcion) => <option key={opcion} value={opcion}>{acciones[opcion]}</option>)}
          </select>
        </label>
        {aprobacion && <p className="text-sm">{caso.metodo_pago === 'PAYPAL'
          ? 'Se solicitará a PayPal el reembolso de este pedido.'
          : 'Confirma el reembolso después de realizar y registrar la transferencia.'}</p>}
        {accion && !['confirmar_qr', 'verificar_paypal', 'conciliar_paypal'].includes(accion) && <label className="block text-sm">
          {accion === 'escalar' ? 'Motivo de la mediación' : 'Respuesta'}
          <textarea className={campo} name="respuesta" rows={3} required maxLength={2000} />
        </label>}
        {accion === 'confirmar_qr' && <label className="block text-sm">Referencia de la transferencia ya realizada
          <input className={campo} name="referencia" required maxLength={100} />
        </label>}
        {accion === 'conciliar_paypal' && <label className="block text-sm">ID de reembolso de PayPal
          <input className={campo} name="referencia" required maxLength={100} />
        </label>}
        {aprobacion && caso.items_sucursales.map((item) => <label className="block text-sm" key={item.id}>
          Sucursal de origen de {item.producto}
          <select className={campo} name={'sucursal-' + item.id} required defaultValue="">
            <option value="">{item.opciones.length ? 'Selecciona la sucursal' : 'Sin inventario de origen registrado'}</option>
            {item.opciones.map((opcion) => <option key={opcion.id} value={opcion.id}>{opcion.nombre}</option>)}
          </select>
        </label>)}
        <button className={boton} disabled={!accion || ocupado}>{ocupado ? 'Guardando…' : 'Confirmar acción'}</button>
      </form>}
    </>}
  </>;
}

export default function Reclamos({ comprador = false, nuevo = false }) {
  const { usuario, cargando } = useAuth();
  const { id, pedido } = useParams();
  const base = comprador ? '/mis-reclamos' : '/reclamos';
  if (cargando) return null;
  if (!usuario) return <Navigate to={'/login?next=' + encodeURIComponent(window.location.pathname)} replace />;
  if (comprador ? !esComprador(usuario) : !esStaff(usuario) && !tienePermisoEmpleado(usuario, 'gestionar_pedidos')) {
    return <Navigate to="/perfil" replace />;
  }
  return <div className="mx-auto max-w-3xl space-y-4 px-4 py-8 text-gray-900 dark:text-gray-100">
    <h1 className="flex items-center gap-2 text-2xl font-bold">
      <ClipboardList size={24} className="text-brand-600 dark:text-brand-400" />
      {comprador ? 'Mis reclamos' : 'Reclamos de devolución'}
    </h1>
    {nuevo ? <NuevoReclamo key={pedido} pedido={pedido} /> : id ? <Detalle key={id} id={id} base={base} /> : <Bandeja base={base} />}
  </div>;
}
