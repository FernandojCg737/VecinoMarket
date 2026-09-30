import asyncio
import json
from urllib.parse import parse_qs

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.layers import get_channel_layer
from django.utils import timezone
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import AccessToken

from apps.usuarios.models import Usuario

from .models import LiveCommerceSesion

MINUTOS_PAUSA_ANTES_DE_CERRAR = 30


class LiveSignalingConsumer(AsyncWebsocketConsumer):
    """CU17: señalización WebRTC para live commerce.

    Solo reenvía mensajes (SDP offer/answer, candidatos ICE) entre el
    navegador de la empresa (rol=broadcaster) y los de los compradores
    (rol=viewer) — el video/audio real viaja peer-to-peer directo entre
    navegadores, este consumer nunca ve un frame.

    Protocolo dentro del grupo `live_<id>`:
    - Al conectar un viewer, se avisa a todo el grupo con
      {type: 'viewer-joined', from: <channel_name>} — el cliente de la
      empresa (el único que reacciona a esto) crea una RTCPeerConnection
      nueva para ese viewer y le manda una oferta.
    - Al conectar el broadcaster (primera vez O al reconectar tras una
      pausa), se avisa {type: 'broadcaster-ready'} a todo el grupo — cubre
      tanto a viewers que ya estaban esperando como a los que veían "Live
      pausado" (dejan de verlo y esperan una oferta nueva).
    - Los mensajes con un campo "to" (offer/answer/ice-candidate) se
      reenvían 1 a 1 a ese channel_name puntual, nunca al grupo entero.
    - Si el broadcaster manda {type: 'end-broadcast'} antes de
      desconectarse (botón "Terminar transmisión"), la sesión se finaliza
      de inmediato. Si en cambio se desconecta SIN avisar (cerró la
      pestaña, perdió señal), la sesión queda "pausada"
      ({type: 'live-paused'} al grupo) durante hasta
      MINUTOS_PAUSA_ANTES_DE_CERRAR minutos por si vuelve — recién después
      de ese plazo sin reconectar se finaliza sola.
    """

    async def connect(self):
        self.live_id = self.scope['url_route']['kwargs']['live_id']
        self.group_name = f'live_{self.live_id}'
        query = parse_qs(self.scope['query_string'].decode())
        rol = (query.get('rol') or ['viewer'])[0]
        token = (query.get('token') or [''])[0]
        self.es_broadcaster = False
        self.finalizando_explicito = False

        if rol == 'broadcaster':
            autorizado = await self._puede_transmitir(token)
            if not autorizado:
                await self.close()
                return
            self.es_broadcaster = True
            await self._limpiar_pausa()

        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

        tipo = 'broadcaster-ready' if self.es_broadcaster else 'viewer-joined'
        await self.channel_layer.group_send(self.group_name, {
            'type': 'live_relay',
            'payload': {'type': tipo, 'from': self.channel_name},
        })

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.group_name, self.channel_name)
        if not self.es_broadcaster:
            return

        if self.finalizando_explicito:
            await self.channel_layer.group_send(self.group_name, {
                'type': 'live_relay', 'payload': {'type': 'live-ended'},
            })
            await self._finalizar_sesion()
            return

        pausado_en = await self._marcar_pausado()
        if pausado_en is None:
            return  # la sesión ya no estaba EN_VIVO (ya la habían finalizado por otro lado)
        await self.channel_layer.group_send(self.group_name, {
            'type': 'live_relay', 'payload': {'type': 'live-paused'},
        })
        asyncio.create_task(self._auto_finalizar_tras_pausa(pausado_en))

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
        except ValueError:
            return

        if data.get('type') == 'end-broadcast' and self.es_broadcaster:
            self.finalizando_explicito = True
            return

        destino = data.get('to')
        if not destino:
            return
        await self.channel_layer.send(destino, {
            'type': 'live_relay',
            'payload': {**data, 'from': self.channel_name},
        })

    async def live_relay(self, event):
        """Handler invocado por Channels (type 'live.relay' -> live_relay) —
        entrega el payload tal cual al cliente conectado a este socket."""
        await self.send(text_data=json.dumps(event['payload']))

    async def _auto_finalizar_tras_pausa(self, pausado_en):
        await asyncio.sleep(MINUTOS_PAUSA_ANTES_DE_CERRAR * 60)
        finalizado = await self._finalizar_si_sigue_pausado(pausado_en)
        if finalizado:
            channel_layer = get_channel_layer()
            await channel_layer.group_send(self.group_name, {
                'type': 'live_relay', 'payload': {'type': 'live-ended'},
            })

    @database_sync_to_async
    def _puede_transmitir(self, token):
        try:
            access = AccessToken(token)
            usuario = Usuario.objects.get(id=access['user_id'])
        except (TokenError, KeyError, Usuario.DoesNotExist):
            return False

        try:
            sesion = LiveCommerceSesion.objects.get(id=self.live_id, activo=True)
        except LiveCommerceSesion.DoesNotExist:
            return False

        if usuario.es_empresa():
            empresa = getattr(usuario, 'empresa', None)
            return bool(empresa) and empresa.id == sesion.empresa_id
        if usuario.es_empleado():
            empleado = getattr(usuario, 'empleado', None)
            return (
                bool(empleado)
                and empleado.empresa_id == sesion.empresa_id
                and empleado.permisos.filter(permiso__codigo='gestionar_promociones').exists()
            )
        return False

    @database_sync_to_async
    def _limpiar_pausa(self):
        LiveCommerceSesion.objects.filter(id=self.live_id).update(pausado_desde=None)

    @database_sync_to_async
    def _marcar_pausado(self):
        ahora = timezone.now()
        actualizados = LiveCommerceSesion.objects.filter(
            id=self.live_id, estado=LiveCommerceSesion.Estado.EN_VIVO
        ).update(pausado_desde=ahora)
        return ahora if actualizados else None

    @database_sync_to_async
    def _finalizar_si_sigue_pausado(self, pausado_en):
        """Solo finaliza si sigue pausada CON ESE MISMO timestamp — si el
        anfitrión volvió y se volvió a ir mientras tanto, pausado_desde ya
        cambió (o es None) y este timer viejo no debe finalizar nada."""
        return bool(LiveCommerceSesion.objects.filter(
            id=self.live_id, estado=LiveCommerceSesion.Estado.EN_VIVO, pausado_desde=pausado_en
        ).update(estado=LiveCommerceSesion.Estado.FINALIZADA, fecha_fin=timezone.now(), pausado_desde=None))

    @database_sync_to_async
    def _finalizar_sesion(self):
        LiveCommerceSesion.objects.filter(
            id=self.live_id, estado=LiveCommerceSesion.Estado.EN_VIVO
        ).update(estado=LiveCommerceSesion.Estado.FINALIZADA, fecha_fin=timezone.now(), pausado_desde=None)
