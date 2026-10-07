from django.core.wsgi import get_wsgi_application
import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
application = get_wsgi_application()

from apps.pedidos.factura_pdf import DescargarFacturaView
from rest_framework.test import APIRequestFactory
from apps.usuarios.models import Usuario
from apps.pedidos.models import Pedido

try:
    pedido = Pedido.objects.get(pk=79)
    user = pedido.orden_compra.comprador.usuario if pedido.orden_compra else Usuario.objects.filter(rol='SUPERADMIN').first()
    
    factory = APIRequestFactory()
    request = factory.get('/api/pedidos/79/factura/')
    request.user = user

    view = DescargarFacturaView()
    response = view.get(request, pedido_id=79)
    print("Success! Status code:", response.status_code)
except Exception as e:
    import traceback
    traceback.print_exc()
