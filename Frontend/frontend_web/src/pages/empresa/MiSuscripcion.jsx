import { useEffect, useRef, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { CreditCard, CheckCircle2, Check } from 'lucide-react';
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

  const paypalOrderIdRef = useRef(null);

  function cargarTodo() {
    Promise.all([
      API.get('suscripciones/mi-suscripcion/'),
      API.get('suscripciones/planes/'),
    ])
      .then(([resSusc, resPlanes]) => {
        setSuscripcion(resSusc.data);
        // El endpoint también lo usa el catálogo del SuperAdmin (planes
        // armados a mano, sin 'codigo') — acá solo van los 3 de autoservicio.
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

  const planActualId = suscripcion?.plan?.id;
  const opcionesUpgrade = planes.filter((p) => p.codigo !== 'PRUEBA' && p.id !== planActualId);
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
    setExito(`¡Listo! Ahora tienes el plan ${destino.nombre}.`);
    setPlanDestino(null);
    cargarTodo();
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="flex items-center gap-2 mb-1">
        <CreditCard className="text-brand-600 dark:text-brand-400" size={24} />
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Mi suscripción</h1>
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        CU01 · Tu plan actual y las opciones para mejorarlo.
      </p>

      {error && <p className="text-sm text-red-600 dark:text-red-400 mb-4">{error}</p>}
      {exito && (
        <div className="flex items-center gap-2 rounded-lg bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-4 py-3 text-sm mb-6">
          <CheckCircle2 size={18} /> {exito}
        </div>
      )}

      <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 mb-8">
        <p className="text-xs uppercase font-semibold text-gray-400 dark:text-gray-500 mb-1">Plan actual</p>
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{suscripcion?.plan?.nombre || 'Sin plan'}</h2>
        {suscripcion?.fecha_inicio && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Adquirida el {formatearFechaHora(suscripcion.fecha_inicio)}
          </p>
        )}
        {suscripcion?.fecha_vencimiento && (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Vence el {formatearFechaHora(suscripcion.fecha_vencimiento)} · {suscripcion.estado}
          </p>
        )}
      </div>

      {opcionesUpgrade.length > 0 && (
        <>
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Mejorar de plan</h3>
          <div className="space-y-2 mb-6">
            {opcionesUpgrade.map((p) => (
              <label
                key={p.id}
                className={`flex items-center justify-between gap-3 rounded-lg border p-4 cursor-pointer ${
                  planDestino === p.id ? 'border-brand-500 bg-brand-50 dark:bg-gray-800' : 'border-gray-200 dark:border-gray-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <input type="radio" name="plan-destino" checked={planDestino === p.id} onChange={() => setPlanDestino(p.id)} />
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
                    {p.incluye_ia && <span className="flex items-center gap-1"><Check size={12} className="text-green-600" /> IA</span>}
                    {p.incluye_live_commerce && <span className="flex items-center gap-1"><Check size={12} className="text-green-600" /> Live commerce</span>}
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
