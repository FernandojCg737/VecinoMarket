// Carga perezosa del SDK JS de PayPal v6 (Web SDK) — sin librería npm,
// PayPal recomienda el <script> dinámico oficial. Se carga una sola vez;
// llamadas posteriores reusan la misma promesa.
//
// Esta cuenta de PayPal (sandbox) no tiene habilitado "Advanced Credit
// and Debit Card Payments", solo el checkout/botón estándar de PayPal
// (lo que el dashboard llama "Payment links and buttons" + "JavaScript
// SDK v6"). Por eso se usa createPayPalOneTimePaymentSession /
// createPayPalSavePaymentSession (popup hospedado por PayPal, donde el
// comprador paga con su cuenta o con una tarjeta como invitado) en vez
// de Card Fields — Card Fields requiere esa habilitación que no está
// disponible.
let promesaSdk = null;

function scriptUrlSdk() {
  const modo = import.meta.env.VITE_PAYPAL_MODE || 'sandbox';
  return modo === 'live'
    ? 'https://www.paypal.com/web-sdk/v6/core'
    : 'https://www.sandbox.paypal.com/web-sdk/v6/core';
}

function cargarScriptSdk() {
  if (window.paypal) return Promise.resolve(window.paypal);
  if (promesaSdk) return promesaSdk;

  promesaSdk = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = scriptUrlSdk();
    script.async = true;
    script.onload = () => resolve(window.paypal);
    script.onerror = () => reject(new Error('No se pudo cargar PayPal.'));
    document.body.appendChild(script);
  });
  return promesaSdk;
}

let promesaInstancia = null;

// Instancia única del SDK (createInstance es la operación cara: negocia
// con PayPal qué métodos están habilitados para esta cuenta).
export function obtenerInstanciaPaypal() {
  if (promesaInstancia) return promesaInstancia;

  promesaInstancia = cargarScriptSdk().then((paypal) =>
    paypal.createInstance({
      clientId: import.meta.env.VITE_PAYPAL_CLIENT_ID,
      components: ['paypal-payments'],
      pageType: 'checkout',
    })
  );
  return promesaInstancia;
}
