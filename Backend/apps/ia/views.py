from datetime import timedelta

from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.catalogo.models import Producto
from apps.catalogo.serializers import EmpresaResumenSerializer, ProductoSerializer
from apps.usuarios.permissions import PlanPermiteIA, TienePermisoEmpleado

from . import recomendaciones
from .datos import coincidencias_busqueda
from .cercania import (
    RADIO_DEFECTO_KM, RADIO_MAX_KM, RADIO_MIN_KM, UbicacionNoDisponible, recomendar_cercanos, reputacion_empresas,
    resolver_ubicacion,
)
from .models import EventoInteraccion
from .serializers import EventoInteraccionSerializer


def leer_limite(request, defecto, maximo=50):
    try:
        return min(max(int(request.query_params.get('limite', defecto)), 1), maximo)
    except (TypeError, ValueError):
        return defecto


def serializar_resultados(resultados, request):
    """La valoración es por EMPRESA (no hay valoración por producto en el
    modelo): se adjunta la de la empresa de cada producto."""
    reputacion = reputacion_empresas({producto.empresa_id for producto, _ in resultados})
    return [
        {
            'score': round(score, 4),
            'empresa_reputacion': {
                'promedio': reputacion[producto.empresa_id][1], 'total': reputacion[producto.empresa_id][2],
            },
            'producto': ProductoSerializer(producto, context={'request': request}).data,
        }
        for producto, score in resultados
    ]


def comprador_de(request):
    usuario = request.user
    if usuario.is_authenticated and usuario.es_comprador():
        return getattr(usuario, 'comprador', None)
    return None

# Una misma VISTA del mismo comprador al mismo producto dentro de esta
# ventana cuenta una sola vez (recargar la página no infla la señal).
VENTANA_VISTA_DUPLICADA = timedelta(minutes=30)


class RegistrarEventoView(APIView):
    """RF44–RF46: registro silencioso del historial de navegación (VISTA,
    BUSQUEDA, CARRITO). Abierto a invitados (comprador queda nulo). Las
    cuentas que no son de comprador (empresa, empleado, staff) se ignoran
    para no ensuciar las métricas con sus propias visitas. Responde 204
    siempre que el payload sea válido, se haya guardado o no."""

    permission_classes = [AllowAny]

    def post(self, request):
        usuario = request.user
        if usuario.is_authenticated and not usuario.es_comprador():
            return Response(status=status.HTTP_204_NO_CONTENT)

        serializer = EventoInteraccionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        datos = serializer.validated_data

        comprador = getattr(usuario, 'comprador', None) if usuario.is_authenticated else None
        tipo = datos['tipo']
        producto = datos.get('producto')

        if tipo == EventoInteraccion.Tipo.VISTA and comprador and EventoInteraccion.objects.filter(
            comprador=comprador, producto=producto, tipo=tipo,
            fecha__gte=timezone.now() - VENTANA_VISTA_DUPLICADA,
        ).exists():
            return Response(status=status.HTTP_204_NO_CONTENT)

        extra = {}
        if tipo == EventoInteraccion.Tipo.BUSQUEDA:
            coincide = coincidencias_busqueda(datos['termino_busqueda'])
            extra = {
                'resultados': coincide['resultados'],
                'categorias_coincidentes': coincide['categorias'],
                'productos_coincidentes': coincide['productos'],
            }
        EventoInteraccion.objects.create(
            comprador=comprador,
            producto=producto,
            tipo=tipo,
            termino_busqueda=datos['termino_busqueda'],
            departamento=(datos.get('departamento') or (comprador.departamento if comprador else '')).strip(),
            **extra,
        )
        return Response(status=status.HTTP_204_NO_CONTENT)


class RecomendacionesParaTiView(APIView):
    """CU1 (RF44): "Para ti". Comprador con historia -> personalizada
    (híbrido precalculado o, si es nuevo desde la última corrida, calculado
    en línea). Sin historia, o invitado -> arranque en frío con los más
    vendidos de los últimos 30 días (`estrategia: "popular"`, para que el
    front cambie el título). Solo productos activos, con stock y de empresas
    con plan de IA vigente. ?limite= (1..50, por defecto 10)."""

    permission_classes = [AllowAny]

    def get(self, request):
        datos = recomendaciones.para_comprador(comprador_de(request), limite=leer_limite(request, 10))
        return Response({
            'estrategia': datos['estrategia'],
            'generado_en': datos['generado_en'],
            'resultados': serializar_resultados(datos['resultados'], request),
        })


class ProductosSimilaresView(APIView):
    """CU1 (RF44): "Productos similares" en el detalle de un producto
    (vecinos híbridos precalculados; si el producto es nuevo, lo más vendido
    de su categoría con `estrategia: "categoria"`). Público. ?limite= (por defecto 8)."""

    permission_classes = [AllowAny]

    def get(self, request, producto_id):
        producto = get_object_or_404(Producto, id=producto_id, activo=True)
        datos = recomendaciones.similares(producto, limite=leer_limite(request, 8))
        return Response({
            'producto': producto.id,
            'estrategia': datos['estrategia'],
            'resultados': serializar_resultados(datos['resultados'], request),
        })


def _sucursal_json(sucursal):
    return {
        'id': sucursal.id, 'nombre': sucursal.nombre, 'direccion': sucursal.direccion_texto,
        'telefono': sucursal.telefono, 'lat': sucursal.ubicacion.y, 'lng': sucursal.ubicacion.x,
        'distancia_km': round(sucursal.distancia.km, 2),
    }


def _numero(request, nombre, minimo, maximo):
    valor = request.query_params.get(nombre)
    if valor in (None, ''):
        return None
    try:
        numero = float(valor)
    except ValueError:
        raise ValueError(f'"{nombre}" debe ser un número.')
    if not (minimo <= numero <= maximo):
        raise ValueError(f'"{nombre}" debe estar entre {minimo} y {maximo}.')
    return numero


class RecomendacionesCercanasView(APIView):
    """CU2 (RF45): productos y emprendedores cercanos, en tiempo real.
    ?lat=&lng= (GPS del móvil o geolocalización del navegador); sin ellos se
    usa la ubicacion_default del comprador o su dirección predeterminada, y
    si no hay ninguna responde 400. ?radio_km= (0.5..50, por defecto 5),
    ?limite= de productos (por defecto 20). Público: el invitado debe mandar
    lat/lng y recibe la versión por popularidad."""

    permission_classes = [AllowAny]

    def get(self, request):
        try:
            lat = _numero(request, 'lat', -90, 90)
            lng = _numero(request, 'lng', -180, 180)
            radio = _numero(request, 'radio_km', RADIO_MIN_KM, RADIO_MAX_KM) or RADIO_DEFECTO_KM
        except ValueError as error:
            return Response({'detail': str(error)}, status=status.HTTP_400_BAD_REQUEST)
        if (lat is None) != (lng is None):
            return Response({'detail': 'Envía "lat" y "lng" juntos.'}, status=status.HTTP_400_BAD_REQUEST)

        comprador = comprador_de(request)
        try:
            punto, fuente = resolver_ubicacion(comprador, lat, lng)
        except UbicacionNoDisponible:
            return Response({
                'detail': 'No tenemos tu ubicación. Activa la ubicación de tu dispositivo o registra una '
                          'dirección predeterminada en "Mis direcciones".',
                'codigo': 'SIN_UBICACION',
            }, status=status.HTTP_400_BAD_REQUEST)

        datos = recomendar_cercanos(punto, radio_km=radio, comprador=comprador, limite=leer_limite(request, 20))
        return Response({
            'ubicacion': {'lat': punto.y, 'lng': punto.x, 'fuente': fuente},
            'radio_km': radio,
            'estrategia': datos['estrategia'],
            'productos': [
                {
                    'score': item['score'], 'distancia_km': item['distancia_km'], 'componentes': item['componentes'],
                    'stock_sucursal': item['stock_sucursal'], 'sucursal': _sucursal_json(item['sucursal']),
                    'producto': ProductoSerializer(item['producto'], context={'request': request}).data,
                }
                for item in datos['productos']
            ],
            'emprendedores': [
                {
                    'empresa': EmpresaResumenSerializer(e['empresa']).data,
                    'score': e['score'], 'distancia_km': e['distancia_km'], 'reputacion': e['reputacion'],
                    'productos_cercanos': e['productos_cercanos'], 'categoria_principal': e['categoria_principal'],
                    'sucursales': [_sucursal_json(s) for s in e['sucursales']],
                }
                for e in datos['emprendedores']
            ],
        })


class TendenciasConsumoView(APIView):
    """CU3 (RF46): tendencias de consumo (solo web). Empresa o empleado con
    permiso 'ver_reportes' y plan con IA vigente -> el mercado de su zona por
    categoría, sus productos y su comparación con el promedio del mercado.
    ADMIN/SUPERADMIN -> versión global (?departamento= para filtrar una zona).
    ?semanas= (4..26, por defecto 12; solo semanas cerradas)."""

    permiso_requerido = 'ver_reportes'

    def get_permissions(self):
        usuario = self.request.user
        if usuario.is_authenticated and usuario.es_admin():
            return [IsAuthenticated()]
        return [TienePermisoEmpleado(), PlanPermiteIA()]

    def get(self, request):
        from . import tendencias  # numpy: solo se carga en este endpoint

        try:
            semanas = int(request.query_params.get('semanas', tendencias.SEMANAS_DEFECTO))
        except ValueError:
            semanas = 0
        if not tendencias.SEMANAS_MIN <= semanas <= tendencias.SEMANAS_MAX:
            return Response(
                {'detail': f'"semanas" debe estar entre {tendencias.SEMANAS_MIN} y {tendencias.SEMANAS_MAX}.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if request.user.es_admin():
            alcance = tendencias.Alcance(zona=(request.query_params.get('departamento') or '').strip() or None)
        else:
            empresa = request.user.get_empresa()
            alcance = tendencias.Alcance(empresa=empresa, zona=(empresa.departamento or '').strip() or None)
        return Response(tendencias.analizar(alcance, semanas=semanas))
