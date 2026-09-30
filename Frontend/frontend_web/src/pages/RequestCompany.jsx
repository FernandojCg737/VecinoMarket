import { useEffect, useRef, useState } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Check } from 'lucide-react';
import API from '../api/axios';
import { useAuth } from '../context/AuthContext';
import PayPalCheckoutButton from '../components/pagos/PayPalCheckoutButton';

const TASA_CAMBIO = 6.96;

export default function RequestCompany() {
  const { usuario, cargando } = useAuth();
  const [searchParams] = useSearchParams();
  const [form, setForm] = useState({
    razon_social: '', nit: '', documento_url: '', codigo_referido: searchParams.get('ref') || '',
  });
  const [planes, setPlanes] = useState([]);
  const [planId, setPlanId] = useState(null);
  const [enviado, setEnviado] = useState(false);
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  const solicitudIdRef = useRef(null);
  const paypalOrderIdRef = useRef(null);

  useEffect(() => {
    API.get('suscripciones/planes/')
      .then((res) => {
        // El endpoint también lo usa el catálogo del SuperAdmin (planes
        // armados a mano, sin 'codigo') — acá solo van los 3 de autoservicio.
        const autoservicio = res.data.filter((p) => p.codigo);
        setPlanes(autoservicio);
        if (autoservicio.length > 0) setPlanId(autoservicio[0].id);
      })
      .catch(() => setError('No se pudieron cargar los planes disponibles.'));
  }, []);

  if (cargando) return null;
  if (!usuario) return <Navigate to="/login?next=/solicitar-empresa" replace />;

  const planSeleccionado = planes.find((p) => p.id === planId);
  const esPrueba = planSeleccionado?.codigo === 'PRUEBA';
  const datosCompletos = form.razon_social.trim() && form.nit.trim() && planId;
  const montoUsd = planSeleccionado ? (planSeleccionado.precio_mensual / TASA_CAMBIO).toFixed(2) : '0.00';

  function onChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function enviarSolicitudPrueba(e) {
    e.preventDefault();
    setError('');
    setEnviando(true);
    try {
      await API.post('usuarios/solicitudes-empresa/', { ...form, plan_id: planId });
      setEnviado(true);
    } catch (err) {
      setError(err?.response?.data?.detail || 'No se pudo enviar la solicitud. Intenta de nuevo.');
    } finally {
      setEnviando(false);
    }
  }

  async function crearPromesaOrden() {
    const { data } = await API.post('usuarios/solicitudes-empresa/checkout/', { ...form, plan_id: planId });
    solicitudIdRef.current = data.solicitud_id;
    paypalOrderIdRef.current = data.paypal_order_id;
    return { orderId: data.paypal_order_id };
  }

  async function onApprovePago() {
    await API.post(`usuarios/solicitudes-empresa/checkout/${solicitudIdRef.current}/confirmar/`, {
      paypal_order_id: paypalOrderIdRef.current,
    });
    setEnviado(true);
  }

  if (enviado) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <CheckCircle2 size={48} className="mx-auto text-green-600 dark:text-green-400 mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">¡Tu cuenta de empresa está lista!</h1>
        <p className="text-gray-500 dark:text-gray-400">
          Te enviamos por correo las credenciales para ingresar con tu nueva cuenta de empresa
          (revisa también la carpeta de spam).
        </p>
      </div>
    );
  }

  const inputClass = 'w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300';
  const labelClass = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1';

  return (
    <div className="mx-auto max-w-xl px-4 py-16">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1">Solicita tu cuenta de empresa</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        Elige un plan y completa tus datos — tu cuenta de empresa se activa de inmediato y te
        mandamos las credenciales por correo.
      </p>

      <div className="space-y-2 mb-6">
        {planes.map((p) => (
          <label
            key={p.id}
            className={`flex items-center justify-between gap-3 rounded-lg border p-4 cursor-pointer ${
              planId === p.id ? 'border-brand-500 bg-brand-50 dark:bg-gray-800' : 'border-gray-200 dark:border-gray-700'
            }`}
          >
            <div className="flex items-center gap-3">
              <input type="radio" name="plan" checked={planId === p.id} onChange={() => setPlanId(p.id)} />
              <div>
                <div className="font-semibold text-gray-900 dark:text-gray-100">{p.nombre}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {p.precio_mensual > 0 ? `Bs ${p.precio_mensual}` : 'Gratis'} · {p.duracion_dias} días
                  {p.limite_productos ? ` · hasta ${p.limite_productos} productos` : ' · productos ilimitados'}
                </div>
              </div>
            </div>
            {(p.incluye_live_commerce || p.incluye_ia) && (
              <div className="hidden sm:flex flex-col gap-0.5 text-xs text-gray-500 dark:text-gray-400">
                {p.incluye_ia && <span className="flex items-center gap-1"><Check size={12} className="text-green-600" /> IA</span>}
                {p.incluye_live_commerce && <span className="flex items-center gap-1"><Check size={12} className="text-green-600" /> Live commerce</span>}
              </div>
            )}
          </label>
        ))}
      </div>

      <form onSubmit={esPrueba ? enviarSolicitudPrueba : (e) => e.preventDefault()} className="space-y-4">
        <div>
          <label className={labelClass}>Razón social / nombre del negocio</label>
          <input
            name="razon_social" required value={form.razon_social} onChange={onChange}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>NIT</label>
          <input
            name="nit" required value={form.nit} onChange={onChange}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>
            Documento de respaldo (URL) <span className="text-gray-400 dark:text-gray-500 font-normal">— opcional</span>
          </label>
          <input
            name="documento_url" value={form.documento_url} onChange={onChange}
            placeholder="https://..."
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>
            Código de referido <span className="text-gray-400 dark:text-gray-500 font-normal">— opcional</span>
          </label>
          <input
            name="codigo_referido" value={form.codigo_referido} onChange={onChange}
            placeholder="Ej. ferreteria-san-pedro"
            className={inputClass}
          />
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            Si otra empresa de VecinoMarket te invitó, pon aquí su código para que reciba su beneficio.
          </p>
        </div>

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

        {esPrueba ? (
          <button
            type="submit"
            disabled={enviando || !datosCompletos}
            className="w-full rounded-full bg-brand-600 py-3 font-semibold text-white hover:bg-brand-700 transition-colors disabled:opacity-60"
          >
            {enviando ? 'Enviando...' : 'Activar mi cuenta de prueba'}
          </button>
        ) : datosCompletos ? (
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
              Se cobrará <strong>${montoUsd} USD</strong> vía PayPal (Bs {planSeleccionado.precio_mensual} al tipo de cambio oficial).
            </p>
            <PayPalCheckoutButton
              modo="pago"
              crearPromesaInicio={crearPromesaOrden}
              onApprove={onApprovePago}
              textoBoton={`Pagar $${montoUsd} USD y activar mi empresa`}
            />
          </div>
        ) : (
          <p className="text-xs text-gray-400">Completa razón social y NIT para continuar al pago.</p>
        )}
      </form>
    </div>
  );
}
