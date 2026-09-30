"""Backend de correo para Django que manda por la Gmail API (HTTPS) en vez
de SMTP — necesario porque el plan gratuito de Render bloquea el puerto
SMTP saliente (587/465), pero sí permite HTTPS normal (mismo motivo por el
que paypal_client.py funciona). Requiere un refresh_token de OAuth2 con el
scope gmail.send, generado una sola vez con
scripts/generar_refresh_token_gmail.py — ver GMAIL_API_* en settings."""
import base64
from email.mime.text import MIMEText

import requests
from django.conf import settings
from django.core.cache import cache
from django.core.mail.backends.base import BaseEmailBackend

_CACHE_KEY_TOKEN = 'gmail_api_access_token'


class GmailApiError(Exception):
    pass


def _access_token():
    token = cache.get(_CACHE_KEY_TOKEN)
    if token:
        return token

    resp = requests.post('https://oauth2.googleapis.com/token', data={
        'client_id': settings.GMAIL_API_CLIENT_ID,
        'client_secret': settings.GMAIL_API_CLIENT_SECRET,
        'refresh_token': settings.GMAIL_API_REFRESH_TOKEN,
        'grant_type': 'refresh_token',
    }, timeout=15)
    if resp.status_code != 200:
        raise GmailApiError(f'No se pudo refrescar el token de la Gmail API: {resp.text}')

    data = resp.json()
    token = data['access_token']
    cache.set(_CACHE_KEY_TOKEN, token, timeout=max(data.get('expires_in', 3600) - 60, 60))
    return token


class GmailApiBackend(BaseEmailBackend):
    """Solo soporta correos de texto plano (lo único que usa este
    proyecto) — basta con EmailMessage.subject/body/to/from_email."""

    def send_messages(self, email_messages):
        enviados = 0
        for mensaje in email_messages:
            try:
                self._enviar_uno(mensaje)
                enviados += 1
            except Exception:
                if not self.fail_silently:
                    raise
        return enviados

    def _enviar_uno(self, mensaje):
        mime = MIMEText(mensaje.body)
        mime['To'] = ', '.join(mensaje.to)
        mime['From'] = mensaje.from_email
        mime['Subject'] = mensaje.subject
        raw = base64.urlsafe_b64encode(mime.as_bytes()).decode('ascii')

        resp = requests.post(
            'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
            headers={'Authorization': f'Bearer {_access_token()}'},
            json={'raw': raw},
            timeout=15,
        )
        if resp.status_code >= 400:
            raise GmailApiError(f'Gmail API respondió {resp.status_code}: {resp.text}')
