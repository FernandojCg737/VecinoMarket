from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.usuarios.models import Comprador
from apps.usuarios.permissions import EsComprador

from . import paypal_client
from .paypal_client import PaypalError


def _resumen_tarjeta(payment_token):
    """Esta cuenta sandbox no tiene Advanced Card Processing habilitado
    (solo el checkout/botón estándar de PayPal), así que lo que se guarda
    en el vault es la cuenta PayPal del comprador, no una tarjeta suelta.
    PayPal la devuelve anidada bajo payment_source.paypal."""
    paypal_account = payment_token.get('payment_source', {}).get('paypal', {})
    return {
        'id': payment_token.get('id'),
        'email': paypal_account.get('email_address', ''),
        'nombre': (paypal_account.get('name') or {}).get('given_name', ''),
    }


class ListaCrearMisTarjetasView(APIView):
    """El comprador ve sus tarjetas guardadas en PayPal (GET) o inicia el
    guardado de una nueva (POST) — nunca guardamos datos de tarjeta en
    nuestra propia base, PayPal es la única fuente de verdad."""

    permission_classes = [EsComprador]

    def get(self, request):
        comprador = Comprador.objects.get(usuario=request.user)
        try:
            tokens = paypal_client.listar_payment_tokens(str(comprador.id))
        except PaypalError as exc:
            return Response({'detail': str(exc), 'paypal': exc.detalle}, status=status.HTTP_502_BAD_GATEWAY)
        return Response([_resumen_tarjeta(t) for t in tokens])

    def post(self, request):
        comprador = Comprador.objects.get(usuario=request.user)
        try:
            setup_token = paypal_client.crear_setup_token(str(comprador.id))
        except PaypalError as exc:
            return Response({'detail': str(exc), 'paypal': exc.detalle}, status=status.HTTP_502_BAD_GATEWAY)
        return Response({'setup_token_id': setup_token['id']}, status=status.HTTP_201_CREATED)


class ConfirmarTarjetaView(APIView):
    """El frontend ya completó CardFields con el setup_token de arriba —
    acá se convierte en un payment_token real (la tarjeta queda guardada
    de verdad en el vault de PayPal)."""

    permission_classes = [EsComprador]

    def post(self, request):
        setup_token_id = request.data.get('setup_token_id')
        if not setup_token_id:
            return Response({'detail': 'Falta setup_token_id.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            payment_token = paypal_client.crear_payment_token(setup_token_id)
        except PaypalError as exc:
            return Response({'detail': str(exc), 'paypal': exc.detalle}, status=status.HTTP_502_BAD_GATEWAY)
        return Response(_resumen_tarjeta(payment_token), status=status.HTTP_201_CREATED)


class EliminarMiTarjetaView(APIView):
    permission_classes = [EsComprador]

    def delete(self, request, payment_token_id):
        try:
            paypal_client.eliminar_payment_token(payment_token_id)
        except PaypalError as exc:
            return Response({'detail': str(exc), 'paypal': exc.detalle}, status=status.HTTP_502_BAD_GATEWAY)
        return Response(status=status.HTTP_204_NO_CONTENT)
