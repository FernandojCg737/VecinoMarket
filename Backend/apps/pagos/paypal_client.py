"""Wrapper delgado sobre las REST API de PayPal (Vault v3 + Orders v2) —
sin SDK oficial, PayPal recomienda llamadas REST directas desde hace
varios años. Todo en modo sandbox salvo que PAYPAL_MODE=live.

Uso típico:
- Cuenta PayPal guardada: crear_setup_token(customer_id) -> el frontend
  aprueba con el popup de PayPal (createPayPalSavePaymentSession) ->
  crear_payment_token(setup_token_id) guarda la cuenta de verdad en el
  vault de PayPal (nunca datos de tarjeta en nuestra base — esta cuenta
  sandbox no tiene Advanced Card Processing habilitado).
- Checkout: crear_orden(monto_usd, payment_token_id) -> si vino
  payment_token_id cobra directo con la cuenta guardada; si no, el
  frontend abre el popup estándar de PayPal
  (createPayPalOneTimePaymentSession) contra la orden creada ->
  capturar_orden(paypal_order_id) confirma el cobro.
"""
import uuid

import requests
from django.conf import settings
from django.core.cache import cache

_CACHE_KEY_TOKEN = 'paypal_access_token'


class PaypalError(Exception):
    """Encapsula un error de la API de PayPal con el detalle que devuelve
    (útil para mostrarle al comprador algo más claro que un 500)."""

    def __init__(self, mensaje, detalle=None):
        super().__init__(mensaje)
        self.detalle = detalle or {}


def _access_token():
    token = cache.get(_CACHE_KEY_TOKEN)
    if token:
        return token

    resp = requests.post(
        f'{settings.PAYPAL_API_BASE}/v1/oauth2/token',
        auth=(settings.PAYPAL_CLIENT_ID, settings.PAYPAL_CLIENT_SECRET),
        data={'grant_type': 'client_credentials'},
        headers={'Accept': 'application/json', 'Accept-Language': 'en_US'},
        timeout=15,
    )
    if resp.status_code != 200:
        raise PaypalError('No se pudo autenticar con PayPal.', resp.json() if resp.content else {})

    data = resp.json()
    token = data['access_token']
    # Un poco menos que expires_in para no usarlo justo cuando ya venció.
    cache.set(_CACHE_KEY_TOKEN, token, timeout=max(data.get('expires_in', 32400) - 60, 60))
    return token


def _request(method, path, json=None, params=None, idempotency_key=None):
    headers = {
        'Authorization': f'Bearer {_access_token()}',
        'Content-Type': 'application/json',
    }
    if idempotency_key:
        headers['PayPal-Request-Id'] = idempotency_key

    resp = requests.request(
        method, f'{settings.PAYPAL_API_BASE}{path}',
        json=json, params=params, headers=headers, timeout=20,
    )
    if resp.status_code >= 400:
        detalle = resp.json() if resp.content else {}
        raise PaypalError(detalle.get('message', 'Error al comunicarse con PayPal.'), detalle)
    return resp.json() if resp.content else {}


def crear_setup_token(customer_id):
    """POST /v3/vault/setup-tokens — vincula la cuenta PayPal del
    comprador (no una tarjeta suelta: esta cuenta sandbox no tiene
    habilitado Advanced Card Processing, solo el checkout/botón estándar
    de PayPal, así que lo que se guarda es la cuenta PayPal aprobada vía
    el popup de createPayPalSavePaymentSession). Se manda nuestro propio
    customer_id para poder listar luego los tokens de este comprador."""
    return _request('POST', '/v3/vault/setup-tokens', json={
        'customer': {'id': customer_id},
        'payment_source': {
            'paypal': {
                'usage_type': 'MERCHANT',
                'customer_type': 'CONSUMER',
                'permit_multiple_payment_tokens': True,
                'experience_context': {
                    'return_url': 'https://example.com/retorno',
                    'cancel_url': 'https://example.com/cancelado',
                },
            },
        },
    }, idempotency_key=str(uuid.uuid4()))


def crear_payment_token(setup_token_id):
    """POST /v3/vault/payment-tokens — guarda la tarjeta de verdad en el
    vault de PayPal a partir de un setup token ya aprobado por CardFields."""
    return _request('POST', '/v3/vault/payment-tokens', json={
        'payment_source': {'token': {'id': setup_token_id, 'type': 'SETUP_TOKEN'}},
    }, idempotency_key=str(uuid.uuid4()))


def listar_payment_tokens(customer_id):
    """GET /v3/vault/payment-tokens?customer_id= — todos los métodos de
    pago guardados de un comprador. customer_id es cualquier string
    estable nuestro (usamos str(comprador.id)), PayPal no exige crear un
    'customer' aparte. Si el comprador nunca vinculó nada, PayPal
    responde CUSTOMER_ID_NOT_FOUND en vez de una lista vacía."""
    try:
        data = _request('GET', '/v3/vault/payment-tokens', params={'customer_id': customer_id})
    except PaypalError as exc:
        if exc.detalle.get('name') == 'RESOURCE_NOT_FOUND':
            return []
        raise
    return data.get('payment_tokens', [])


def eliminar_payment_token(payment_token_id):
    _request('DELETE', f'/v3/vault/payment-tokens/{payment_token_id}')


def crear_orden(monto_usd, payment_token_id=None, return_url=None, cancel_url=None):
    """POST /v2/checkout/orders — intent=CAPTURE. Si hay payment_token_id
    cobra directo con la cuenta PayPal guardada del comprador (sin volver
    a pasar por el popup); si no, el frontend abre el popup estándar de
    PayPal (createPayPalOneTimePaymentSession) contra este order_id antes
    de capturar.

    return_url/cancel_url: solo los usa la app móvil (ver
    apps/pedidos/views.py::IniciarCheckoutView) para que, tras aprobar el
    pago en el Custom Tab, PayPal redirija de vuelta a un deep link de la
    app en vez de dejar al comprador en una pantalla de PayPal sin salida.
    El SDK de JS de la web (Web SDK v6, popup) maneja su propio puente y no
    depende de esto -- pasarlo no le afecta."""
    payload = {
        'intent': 'CAPTURE',
        'purchase_units': [{'amount': {'currency_code': 'USD', 'value': f'{monto_usd:.2f}'}}],
    }
    if payment_token_id:
        payload['payment_source'] = {
            'token': {'id': payment_token_id, 'type': 'PAYMENT_METHOD_TOKEN'},
        }
    elif return_url and cancel_url:
        payload['application_context'] = {'return_url': return_url, 'cancel_url': cancel_url}
    return _request('POST', '/v2/checkout/orders', json=payload, idempotency_key=str(uuid.uuid4()))


def capturar_orden(paypal_order_id):
    """POST /v2/checkout/orders/{id}/capture — confirma el cobro."""
    return _request('POST', f'/v2/checkout/orders/{paypal_order_id}/capture', json={},
                     idempotency_key=str(uuid.uuid4()))
