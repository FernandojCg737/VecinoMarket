from rest_framework import serializers

from apps.catalogo.models import Producto

from .models import EventoInteraccion

TIPOS_REGISTRABLES = [
    EventoInteraccion.Tipo.VISTA,
    EventoInteraccion.Tipo.BUSQUEDA,
    EventoInteraccion.Tipo.CARRITO,
]


class EventoInteraccionSerializer(serializers.ModelSerializer):
    """POST /api/ia/eventos/. COMPRA no se acepta: se deriva de los pedidos
    pagados. comprador, resultados y fecha los pone el backend."""

    tipo = serializers.ChoiceField(choices=[(t.value, t.label) for t in TIPOS_REGISTRABLES])
    producto = serializers.PrimaryKeyRelatedField(queryset=Producto.objects.all(), required=False, allow_null=True)
    termino_busqueda = serializers.CharField(max_length=150, required=False, allow_blank=True)
    departamento = serializers.CharField(max_length=60, required=False, allow_blank=True)

    class Meta:
        model = EventoInteraccion
        fields = ['tipo', 'producto', 'termino_busqueda', 'departamento']

    def validate(self, attrs):
        tipo = attrs['tipo']
        if tipo == EventoInteraccion.Tipo.BUSQUEDA:
            termino = (attrs.get('termino_busqueda') or '').strip()
            if len(termino) < 2:
                raise serializers.ValidationError({'termino_busqueda': 'Requerido para BUSQUEDA (mínimo 2 caracteres).'})
            attrs['termino_busqueda'] = termino
            attrs['producto'] = None
        else:
            if not attrs.get('producto'):
                raise serializers.ValidationError({'producto': f'Requerido para {tipo}.'})
            attrs['termino_busqueda'] = ''
        return attrs
