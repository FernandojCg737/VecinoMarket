from io import BytesIO
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated, AllowAny
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.pdfgen import canvas
from apps.pedidos.models import Pedido
from apps.usuarios.models import Comprador

from rest_framework_simplejwt.authentication import JWTAuthentication

class DescargarFacturaView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, pedido_id):
        user = request.user
        if not user.is_authenticated:
            token = request.GET.get('token')
            if token:
                try:
                    jwt_auth = JWTAuthentication()
                    validated_token = jwt_auth.get_validated_token(token)
                    user = jwt_auth.get_user(validated_token)
                except Exception:
                    pass
        if not user or not user.is_authenticated:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Debes iniciar sesión.")

        # Permitir que tanto el comprador como el dueño de la empresa descarguen
        # O administradores
        pedido = get_object_or_404(Pedido, pk=pedido_id)
        es_admin = user.rol in ['SUPERADMIN', 'ADMIN_SOPORTE']
        es_dueno = (pedido.empresa and pedido.empresa.usuario_dueno_id == user.id)
        es_comprador = (user.rol == 'COMPRADOR' and pedido.orden_compra and pedido.orden_compra.comprador.usuario_id == user.id)
        
        if not (es_admin or es_dueno or es_comprador):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("No tienes permiso para ver esta factura.")

        buffer = BytesIO()
        c = canvas.Canvas(buffer, pagesize=A4)
        width, height = A4
        
        # Diseño basado en "Rojo Polo Paella Inc." (estilo minimalista y limpio)
        c.setFont("Helvetica-Bold", 40)
        c.setFillColor(colors.HexColor("#1A2B4C")) # Azul oscuro
        c.drawString(40, height - 80, "FACTURA")
        
        # Logo de la Empresa o Placeholder
        c.setFillColor(colors.HexColor("#9CA3AF"))
        c.circle(width - 80, height - 70, 35, fill=1, stroke=0)
        c.setFillColor(colors.white)
        c.setFont("Helvetica-Bold", 14)
        c.drawCentredString(width - 80, height - 75, "LOGO")

        # Datos de la Empresa emisora
        c.setFillColor(colors.black)
        c.setFont("Helvetica-Bold", 12)
        empresa_nombre = pedido.empresa.razon_social if pedido.empresa else "VecinoMarket"
        c.drawString(40, height - 130, empresa_nombre)
        c.setFont("Helvetica", 10)
        c.drawString(40, height - 145, "Plataforma VecinoMarket")
        c.drawString(40, height - 160, f"NIT / ID Empresa: {pedido.empresa.id if pedido.empresa else '0000'}")

        # Cliente
        c.setFont("Helvetica-Bold", 10)
        c.setFillColor(colors.HexColor("#1A2B4C"))
        c.drawString(40, height - 210, "FACTURAR A")
        c.setFillColor(colors.black)
        c.setFont("Helvetica", 10)
        cliente_nombre = "Consumidor Final"
        cliente_celular = ""
        if pedido.orden_compra and pedido.orden_compra.comprador:
            cliente_nombre = f"{pedido.orden_compra.comprador.usuario.nombre} {pedido.orden_compra.comprador.usuario.apellido}"
            cliente_celular = pedido.orden_compra.comprador.usuario.telefono
        c.drawString(40, height - 225, cliente_nombre)
        if cliente_celular:
            c.drawString(40, height - 240, f"Celular: {cliente_celular}")

        # Fechas y detalles
        c.setFont("Helvetica-Bold", 10)
        c.setFillColor(colors.HexColor("#1A2B4C"))
        c.drawString(width - 250, height - 210, "N° DE FACTURA")
        c.drawString(width - 250, height - 230, "FECHA")
        c.drawString(width - 250, height - 250, "N° DE PEDIDO")
        
        c.setFillColor(colors.black)
        c.setFont("Helvetica", 10)
        c.drawString(width - 120, height - 210, f"F-{pedido.id:06d}")
        c.drawString(width - 120, height - 230, pedido.creado_en.strftime("%d/%m/%Y"))
        c.drawString(width - 120, height - 250, pedido.numero_pedido)

        # Línea divisoria cabecera
        c.setStrokeColor(colors.HexColor("#DC2626"))
        c.setLineWidth(1)
        c.line(40, height - 280, width - 40, height - 280)

        # Encabezado tabla
        c.setFont("Helvetica-Bold", 10)
        c.setFillColor(colors.HexColor("#1A2B4C"))
        c.drawString(50, height - 300, "CANT.")
        c.drawString(120, height - 300, "DESCRIPCIÓN")
        c.drawString(350, height - 300, "PRECIO UNITARIO")
        c.drawString(480, height - 300, "IMPORTE")
        
        # Línea divisoria tabla
        c.setStrokeColor(colors.HexColor("#DC2626"))
        c.line(40, height - 310, width - 40, height - 310)

        # Items
        y = height - 330
        c.setFont("Helvetica", 10)
        c.setFillColor(colors.black)
        for item in pedido.items.all():
            c.drawString(55, y, str(item.cantidad))
            # Truncar descripción si es muy larga
            desc = item.producto.nombre[:40] + "..." if len(item.producto.nombre) > 40 else item.producto.nombre
            c.drawString(120, y, desc)
            c.drawString(360, y, f"Bs {item.precio_unitario}")
            c.drawString(480, y, f"Bs {item.subtotal}")
            y -= 25
            if y < 150:
                c.showPage()
                y = height - 50

        # Totales
        y -= 20
        c.setFont("Helvetica", 10)
        c.drawString(380, y, "Subtotal")
        c.drawString(480, y, f"Bs {pedido.subtotal}")
        y -= 20
        # Supongamos 0% IVA para simplificar, o 13% si se quiere
        c.drawString(380, y, "IVA 0.0%")
        c.drawString(480, y, "Bs 0.00")
        y -= 30
        
        c.setFont("Helvetica-Bold", 12)
        c.setFillColor(colors.HexColor("#1A2B4C"))
        c.drawString(380, y, "TOTAL")
        c.drawString(470, y, f"Bs {pedido.subtotal}")

        # Pie de página
        c.setFont("Helvetica-Bold", 12)
        c.setFillColor(colors.HexColor("#DC2626"))
        c.drawString(300, 100, "CONDICIONES Y FORMA DE PAGO")
        
        c.setFont("Helvetica", 9)
        c.setFillColor(colors.black)
        metodo = "No especificado"
        if hasattr(pedido, 'orden_compra') and pedido.orden_compra:
            pago = pedido.orden_compra.pagos.filter(estado='APROBADO').first()
            if pago:
                metodo = pago.metodo
        c.drawString(300, 80, f"Método utilizado: {metodo}")
        c.drawString(300, 65, "El pago ya ha sido procesado.")
        
        c.setFont("Helvetica-Bold", 30)
        c.setFillColor(colors.HexColor("#1A2B4C"))
        c.drawString(60, 70, "Gracias")

        c.save()
        buffer.seek(0)
        
        response = HttpResponse(buffer, content_type='application/pdf')
        action = request.GET.get('action', 'download')
        disposition = 'inline' if action == 'view' else 'attachment'
        response['Content-Disposition'] = f'{disposition}; filename="factura_{pedido.numero_pedido}.pdf"'
        return response
