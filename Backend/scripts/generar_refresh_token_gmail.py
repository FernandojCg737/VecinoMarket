"""Script de un solo uso: obtiene un refresh_token de OAuth2 para que el
backend pueda mandar correos vía la Gmail API (HTTPS) en vez de SMTP —
necesario porque el plan gratuito de Render bloquea el puerto SMTP saliente.

No es parte de la app — se corre a mano, una vez, en tu compu (necesita
abrir un navegador y que inicies sesión con la cuenta de Gmail que va a
mandar los correos).

Uso:
    cd Backend
    .venv/Scripts/python.exe scripts/generar_refresh_token_gmail.py

Pide el Client ID y Client Secret del OAuth Client tipo "Desktop app" que
creaste en Google Cloud Console (Credentials), abre el navegador para que
apruebes el permiso de "enviar correo en tu nombre", y al final imprime el
refresh_token que hay que guardar en .env / Render.
"""
import http.server
import urllib.parse
import webbrowser

import requests

REDIRECT_URI = 'http://localhost:8080/'
SCOPE = 'https://www.googleapis.com/auth/gmail.send'


def main():
    client_id = input('Client ID (OAuth, tipo Desktop app): ').strip()
    client_secret = input('Client Secret: ').strip()

    auth_url = 'https://accounts.google.com/o/oauth2/v2/auth?' + urllib.parse.urlencode({
        'client_id': client_id,
        'redirect_uri': REDIRECT_URI,
        'response_type': 'code',
        'scope': SCOPE,
        'access_type': 'offline',
        'prompt': 'consent',
    })

    print('\nAbriendo el navegador. Inicia sesión con la cuenta de Gmail que')
    print('va a mandar los correos, y acepta el permiso.\n')
    print(f'Si no se abre solo, entra a este link:\n{auth_url}\n')
    webbrowser.open(auth_url)

    codigo = {}

    class Handler(http.server.BaseHTTPRequestHandler):
        def do_GET(self):
            qs = urllib.parse.urlparse(self.path).query
            params = urllib.parse.parse_qs(qs)
            codigo['valor'] = params.get('code', [None])[0]
            self.send_response(200)
            self.send_header('Content-Type', 'text/html; charset=utf-8')
            self.end_headers()
            self.wfile.write('<h2>Listo, ya puedes cerrar esta pestaña.</h2>'.encode('utf-8'))

        def log_message(self, *args):
            pass  # silencia el log de cada request en consola

    print('Esperando a que completes el login en el navegador...')
    server = http.server.HTTPServer(('localhost', 8080), Handler)
    server.handle_request()

    if not codigo.get('valor'):
        print('\nNo llegó ningún código — ¿cancelaste el login? Vuelve a correr el script.')
        return

    resp = requests.post('https://oauth2.googleapis.com/token', data={
        'code': codigo['valor'],
        'client_id': client_id,
        'client_secret': client_secret,
        'redirect_uri': REDIRECT_URI,
        'grant_type': 'authorization_code',
    })
    data = resp.json()

    if 'refresh_token' not in data:
        print('\nERROR, Google respondió:', data)
        print('\nSi dice que ya diste el permiso antes y no manda refresh_token,')
        print('ve a https://myaccount.google.com/permissions, quita el acceso de')
        print('esta app, y vuelve a correr el script.')
        return

    print('\n' + '=' * 70)
    print('LISTO. Guarda este refresh_token (no se vuelve a mostrar):\n')
    print(data['refresh_token'])
    print('=' * 70)


if __name__ == '__main__':
    main()
