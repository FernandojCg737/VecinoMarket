from django.utils import timezone
from rest_framework import serializers

from .models import Plan, Suscripcion


class PlanSerializer(serializers.ModelSerializer):
    """CU01/CU20: catálogo de planes activos que el admin puede asignar a una empresa."""

    class Meta:
        model = Plan
        fields = [
            'id', 'codigo', 'nombre', 'precio_mensual', 'duracion_dias', 'limite_productos',
            'incluye_live_commerce', 'incluye_ia', 'porcentaje_comision', 'estado',
        ]
        read_only_fields = fields


class PlanAdminSerializer(serializers.ModelSerializer):
    """CU20: el SuperAdmin crea y edita el catálogo de planes (a diferencia
    de PlanSerializer, que es de solo lectura para la asignación en CU01)."""

    class Meta:
        model = Plan
        fields = [
            'id', 'codigo', 'nombre', 'precio_mensual', 'duracion_dias', 'limite_productos',
            'incluye_live_commerce', 'incluye_ia', 'porcentaje_comision', 'estado',
        ]


class SuscripcionSerializer(serializers.ModelSerializer):
    plan_nombre = serializers.CharField(source='plan.nombre', read_only=True)

    class Meta:
        model = Suscripcion
        fields = [
            'id', 'empresa', 'plan', 'plan_nombre', 'fecha_inicio',
            'fecha_vencimiento', 'estado', 'renovacion_automatica',
        ]
        read_only_fields = fields


class EditarSuscripcionSerializer(serializers.Serializer):
    """CU01: el admin edita la suscripción vigente de una empresa (plan y
    fecha de vencimiento exacta). Si la empresa ya tiene una suscripción
    (activa, expirada o recién asignada), se edita esa misma fila en vez de
    acumular una nueva por cada cambio; si no tiene ninguna todavía (recién
    aprobada, "solicitando suscripción"), se crea la primera."""

    plan_id = serializers.PrimaryKeyRelatedField(
        queryset=Plan.objects.filter(estado=Plan.Estado.ACTIVO), source='plan'
    )
    fecha_vencimiento = serializers.DateField()

    def save(self):
        empresa = self.context['empresa']
        plan = self.validated_data['plan']
        fecha_vencimiento = self.validated_data['fecha_vencimiento']
        hoy = timezone.now().date()

        suscripcion = Suscripcion.objects.filter(empresa=empresa).order_by('-fecha_vencimiento').first()
        nuevo_estado = Suscripcion.Estado.ACTIVA if fecha_vencimiento >= hoy else Suscripcion.Estado.VENCIDA

        if suscripcion is None:
            suscripcion = Suscripcion.objects.create(
                empresa=empresa,
                plan=plan,
                fecha_inicio=hoy,
                fecha_vencimiento=fecha_vencimiento,
                estado=nuevo_estado,
            )
        else:
            suscripcion.plan = plan
            suscripcion.fecha_vencimiento = fecha_vencimiento
            suscripcion.estado = nuevo_estado
            suscripcion.save(update_fields=['plan', 'fecha_vencimiento', 'estado'])

        empresa.plan = plan
        empresa.save(update_fields=['plan'])
        return suscripcion
