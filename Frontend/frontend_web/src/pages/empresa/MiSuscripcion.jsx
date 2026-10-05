import { useEffect, useRef, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { CreditCard, CheckCircle2, Check, Sparkles, Video, AlertTriangle, XCircle, ShieldCheck } from 'lucide-react';
import API from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { esEmpresa } from '../../utils/roles';
import PayPalCheckoutButton from '../../components/pagos/PayPalCheckoutButton';

const TASA_CAMBIO = 6.96;

function formatearFechaHora(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleString('es-BO', { dateStyle: 'medium', timeStyle: 'short' });
}

export default function MiSuscripcion() {
  const { usuario, cargando: cargandoAuth } = useAuth();
  const [suscripcion, setSuscripcion] = useState(null);
  const [planes, setPlanes] = useState([]);
  const [planDestino, setPlanDestino] = useState(null);
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');
  const [cargando, setCargando] = useState(true);
  const [cancelando, setCancelando] = useState(false);
  const [mostrarConfirmacionCancelar, setMostrarConfirmacionCancelar] = useState(false);

  const paypalOrderIdRef = useRef(null);

  function cargarTodo() {
    return Promise.all([
      API.get('suscripciones/mi-suscripcion/'),
      API.get('suscripciones/planes/'),
    ])
      .then(([resSusc, resPlanes]) => {
        setSuscripcion(resSusc.data);
        // El endpoint también lo usa el catálogo del SuperAdmin (planes
        // armados a mano, sin 'codigo') — acá solo van los de autoservicio con código.
        setPlanes(resPlanes.data.filter((p) => p.codigo));
      })
      .catch(() => setError('No se pudo cargar tu suscripción.'))
      .finally(() => setCargando(false));
  }

  useEffect(() => {
    if (!usuario || !esEmpresa(usuario)) return;
    cargarTodo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuario]);

  if (cargandoAuth) return null;
  if (!usuario) return <Navigate to="/login?next=/mi-empresa/suscripcion" replace />;
  if (!esEmpresa(usuario)) return <Navigate to="/" replace />;
  if (cargando) return null;

  const planActual = suscripcion?.plan;
  const precioActual = Number(planActual?.precio_mensual || 0);
  const esPlanMaximo = planActual?.codigo === 'PREMIUM';
  const esPlanPrueba = !planActual || planActual?.codigo === 'PRUEBA';

  // Solo mostrar planes que realmente representen una mejora respecto al plan actual
  const opcionesUpgrade = esPlanMaximo
    ? []
    : planes.filter(
        (p) =>
          p.codigo !== 'PRUEBA' &&
          p.id !== planActual?.id &&
          Number(p.precio_mensual) > precioActual
      );

  const destino = planes.find((p) => p.id === planDestino);
  const montoUsd = destino ? (destino.precio_mensual / TASA_CAMBIO).toFixed(2) : '0.00';

  async function crearPromesaOrden() {
    const { data } = await API.post('suscripciones/mi-suscripcion/mejorar/checkout/', { plan_id: planDestino });
    paypalOrderIdRef.current = data.paypal_order_id;
    return { orderId: data.paypal_order_id };
  }

  async function onApprovePago() {
    await API.post('suscripciones/mi-suscripcion/mejorar/confirmar/', {
      paypal_order_id: paypalOrderIdRef.current,
    });
    setExito(`¡Listo! Ahora tu empresa cuenta con el plan ${destino.nombre}.`);
    setPlanDestino(null);
    await cargarTodo();
  }

  async function handleCancelarSuscripcion() {
    setCancelando(true);
    setError('');
    try {
      const { data } = await API.post('suscripciones/mi-suscripcion/cancelar/');
      setExito(data?.detail || 'Suscripción cancelada exitosamente. Tu empresa ha vuelto al plan de Prueba.');
      setMostrarConfirmacionCancelar(false);
      setPlanDestino(null);
      await cargarTodo();
    } catch (err) {
      setError(err?.response?.data?.detail || 'No se pudo cancelar la suscripción.');
    } finally {
      setCancelando(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="flex items-center gap-2 mb-1">
        <CreditCard className="text-brand-600 dark:text-brand-400" size={24} />
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Mi suscripción</h1>
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        CU01 · Tu plan actual y la administración de tu suscripción.
      </p>

      {error && (
        <div className="flex items-center justify-between gap-2 rounded-lg bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 px-4 py-3 text-sm mb-6 border border-red-200 dark:border-red-800">
          <span>{error}</span>
          <button onClick={() => setError('')} className="text-xs underline">Cerrar</button>
        </div>
      )}

      {exito && (
        <div className="flex items-center justify-between gap-2 rounded-lg bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-4 py-3 text-sm mb-6 border border-green-200 dark:border-green-800">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={18} />
            <span>{exito}</span>
          </div>
          <button onClick={() => setExito('')} className="text-xs underline">Cerrar</button>
        </div>
      )}

      {/* TARJETA PLAN ACTUAL */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 mb-8 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <p className="text-xs uppercase font-semibold tracking-wider text-gray-400 dark:text-gray-500 mb-1">
              Plan actual
            </p>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {planActual?.nombre || 'Sin plan'}
              </h2>
              {esPlanMaximo && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-950/60 px-2.5 py-0.5 text-xs font-semibold text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                  <Sparkles size={12} className="text-amber-600 dark:text-amber-400" /> Plan Máximo
                </span>
              )}
            </div>

            {suscripcion?.fecha_inicio && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                Adquirida el {formatearFechaHora(suscripcion.fecha_inicio)}
              </p>
            )}
            {suscripcion?.fecha_vencimiento && (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Vence el {formatearFechaHora(suscripcion.fecha_vencimiento)} ·{' '}
                <span className="font-semibold text-brand-600 dark:text-brand-400">{suscripcion.estado}</span>
              </p>
            )}

            {/* CARACTERÍSTICAS DEL PLAN ACTUAL */}
            {planActual && (
              <div className="flex flex-wrap items-center gap-2 mt-3 text-xs text-gray-600 dark:text-gray-400">
                <span className="rounded-md bg-gray-100 dark:bg-gray-800 px-2 py-1">
                  📦 {planActual.limite_productos ? `Hasta ${planActual.limite_productos} productos` : 'Productos ilimitados'}
                </span>
                {planActual.incluye_ia && (
                  <span className="rounded-md bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 px-2 py-1 flex items-center gap-1">
                    <Sparkles size={12} /> Asistente IA
                  </span>
                )}
                {planActual.incluye_live_commerce && (
                  <span className="rounded-md bg-pink-50 dark:bg-pink-950/50 text-pink-700 dark:text-pink-300 px-2 py-1 flex items-center gap-1">
                    <Video size={12} /> Live Commerce
                  </span>
                )}
              </div>
            )}
          </div>

          {/* BOTÓN CANCELAR SUSCRIPCIÓN (SI NO ES PRUEBA) */}
          {!esPlanPrueba && (
            <div className="sm:self-start">
              <button
                type="button"
                onClick={() => setMostrarConfirmacionCancelar(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-red-300 dark:border-red-800 bg-white dark:bg-gray-800 px-3 py-2 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition shadow-sm"
              >
                <XCircle size={14} /> Cancelar suscripción
              </button>
            </div>
          )}
        </div>

        {/* MODAL / CONFIRMACIÓN PARA CANCELAR SUSCRIPCIÓN */}
        {mostrarConfirmacionCancelar && (
          <div className="mt-5 p-4 rounded-xl border border-red-200 dark:border-red-900 bg-red-50/60 dark:bg-red-950/30 text-left">
            <div className="flex items-start gap-3">
              <AlertTriangle className="text-red-600 dark:text-red-400 shrink-0 mt-0.5" size={20} />
              <div>
                <h4 className="text-sm font-bold text-red-900 dark:text-red-200">
                  ¿Confirmas que deseas cancelar tu suscripción {planActual?.nombre}?
                </h4>
                <p className="text-xs text-red-700 dark:text-red-300 mt-1">
                  Tu plan se cancelará de inmediato y tu empresa pasará al plan de <strong>Prueba gratuito</strong> (30 días). Perderás el acceso a las funciones exclusivas y límites ampliados de tu plan de pago.
                </p>
                <div className="flex items-center gap-2 mt-3">
                  <button
                    type="button"
                    onClick={handleCancelarSuscripcion}
                    disabled={cancelando}
                    className="rounded-lg bg-red-600 hover:bg-red-700 px-3 py-1.5 text-xs font-semibold text-white transition disabled:opacity-50"
                  >
                    {cancelando ? 'Cancelando...' : 'Sí, cancelar y pasar a Prueba'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setMostrarConfirmacionCancelar(false)}
                    disabled={cancelando}
                    className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                  >
                    No, conservar mi plan
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* SI YA ESTÁ EN EL PLAN MÁXIMO (PREMIUM) */}
      {esPlanMaximo && (
        <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-gradient-to-r from-amber-500/10 via-yellow-500/5 to-transparent p-6 mb-8">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400">
              <ShieldCheck size={24} />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">
                ¡Tu empresa tiene el Plan Premium!
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 leading-relaxed">
                Actualmente disfrutas del plan más completo disponible en VecinoMarket. Cuentas con productos ilimitados, transmisiones de Live Commerce en directo y asistencia avanzada con Inteligencia Artificial.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* OPCIONES DE MEJORA DE PLAN (SOLO SI HAY PLANES SUPERIORES) */}
      {opcionesUpgrade.length > 0 && (
        <>
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Mejorar de plan</h3>
          <div className="space-y-2 mb-6">
            {opcionesUpgrade.map((p) => (
              <label
                key={p.id}
                className={`flex items-center justify-between gap-3 rounded-lg border p-4 cursor-pointer transition ${
                  planDestino === p.id ? 'border-brand-500 bg-brand-50 dark:bg-gray-800' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="plan-destino"
                    checked={planDestino === p.id}
                    onChange={() => setPlanDestino(p.id)}
                  />
                  <div>
                    <div className="font-semibold text-gray-900 dark:text-gray-100">{p.nombre}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      Bs {p.precio_mensual} · {p.duracion_dias} días
                      {p.limite_productos ? ` · hasta ${p.limite_productos} productos` : ' · productos ilimitados'}
                    </div>
                  </div>
                </div>
                {(p.incluye_live_commerce || p.incluye_ia) && (
                  <div className="hidden sm:flex flex-col gap-0.5 text-xs text-gray-500 dark:text-gray-400">
                    {p.incluye_ia && (
                      <span className="flex items-center gap-1">
                        <Check size={12} className="text-green-600" /> Asistente IA
                      </span>
                    )}
                    {p.incluye_live_commerce && (
                      <span className="flex items-center gap-1">
                        <Check size={12} className="text-green-600" /> Live commerce
                      </span>
                    )}
                  </div>
                )}
              </label>
            ))}
          </div>

          {destino && (
            <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                Se cobrará <strong>${montoUsd} USD</strong> vía PayPal (Bs {destino.precio_mensual} al tipo de cambio oficial).
                Tu suscripción se renueva desde hoy por {destino.duracion_dias} días.
              </p>
              <PayPalCheckoutButton
                key={destino.id}
                modo="pago"
                crearPromesaInicio={crearPromesaOrden}
                onApprove={onApprovePago}
                textoBoton={`Pagar $${montoUsd} USD y cambiar a ${destino.nombre}`}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
