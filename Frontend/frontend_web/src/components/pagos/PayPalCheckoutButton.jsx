import { useEffect, useRef, useState } from 'react';
import { obtenerInstanciaPaypal } from '../../utils/paypal';

/**
 * Botón que abre el popup hospedado de PayPal (Web SDK v6) — ni el número
 * de tarjeta ni la sesión de PayPal pasan por nuestro código, todo ocurre
 * en el dominio de PayPal. Esta cuenta no tiene "Advanced Credit and Debit
 * Card Payments" habilitado, así que no se usan Card Fields: el popup deja
 * pagar con la cuenta de PayPal o con una tarjeta como invitado.
 *
 * `modo="pago"` abre una orden de pago (createPayPalOneTimePaymentSession);
 * `modo="guardar"` vincula la cuenta PayPal del comprador para pagos
 * futuros sin popup (createPayPalSavePaymentSession).
 *
 * `crearPromesaInicio` se llama recién al hacer click y debe devolver una
 * promesa que resuelva `{ orderId }` (modo pago) o `{ vaultSetupToken }`
 * (modo guardar) — ya viene de nuestro backend, que ya creó la orden o el
 * setup token de antemano.
 */
export default function PayPalCheckoutButton({
  modo = 'pago',
  crearPromesaInicio,
  onApprove,
  onCancel,
  textoBoton = 'Pagar con PayPal',
}) {
  const sessionRef = useRef(null);
  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelado = false;

    obtenerInstanciaPaypal()
      .then((sdk) => {
        if (cancelado) return;
        const callbacks = {
          onApprove: async (data) => {
            try {
              await onApprove(data);
            } catch (err) {
              setError(err?.message || 'No se pudo completar la operación.');
            } finally {
              setProcesando(false);
            }
          },
          onCancel: () => {
            setProcesando(false);
            onCancel?.();
          },
          onError: (err) => {
            setError(err?.message || 'Ocurrió un error con PayPal.');
            setProcesando(false);
          },
        };
        sessionRef.current = modo === 'guardar'
          ? sdk.createPayPalSavePaymentSession(callbacks)
          : sdk.createPayPalOneTimePaymentSession(callbacks);
        setCargando(false);
      })
      .catch(() => setError('No se pudo cargar PayPal.'));

    return () => {
      cancelado = true;
      sessionRef.current?.destroy?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modo]);

  async function iniciar() {
    if (!sessionRef.current || procesando) return;
    setError('');
    setProcesando(true);
    try {
      await sessionRef.current.start({ presentationMode: 'popup' }, crearPromesaInicio());
    } catch (err) {
      setError(err?.message || 'No se pudo iniciar el pago con PayPal.');
      setProcesando(false);
    }
  }

  return (
    <div className="space-y-2">
      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
      <button
        type="button"
        onClick={iniciar}
        disabled={cargando || procesando}
        className="w-full rounded-md bg-brand-600 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
      >
        {procesando ? 'Procesando...' : cargando ? 'Cargando PayPal...' : textoBoton}
      </button>
    </div>
  );
}
