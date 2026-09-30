from rest_framework.generics import ListAPIView
from rest_framework.pagination import PageNumberPagination

from apps.usuarios.permissions import EsSuperAdmin

from .models import LogAuditoria
from .permissions import TieneLlaveDesarrollador
from .serializers import LogAuditoriaSerializer


class BitacoraPagination(PageNumberPagination):
    page_size = 50
    page_size_query_param = 'page_size'
    max_page_size = 200


class BitacoraView(ListAPIView):
    """CU22: bitácora de accesos y acciones críticas — exclusiva del
    SUPERADMIN, y además exige la llave de desarrollador (confidencial ni
    para el admin de BD, ver TieneLlaveDesarrollador)."""

    permission_classes = [EsSuperAdmin, TieneLlaveDesarrollador]
    serializer_class = LogAuditoriaSerializer
    pagination_class = BitacoraPagination

    def get_queryset(self):
        queryset = LogAuditoria.objects.select_related('usuario').order_by('-creado_en')

        accion = self.request.query_params.get('accion')
        if accion:
            queryset = queryset.filter(accion=accion)

        usuario_id = self.request.query_params.get('usuario_id')
        if usuario_id:
            queryset = queryset.filter(usuario_id=usuario_id)

        return queryset
