from decimal import Decimal

from django.db import migrations

# CU01: los 3 planes de autoservicio que se eligen al solicitar una cuenta
# de empresa (Prueba/Básico/Premium). precio_mensual aquí es el precio total
# fijo del plan (no una tarifa recurrente) — ver nota en Plan.__doc__.
PLANES = [
    {
        'codigo': 'PRUEBA', 'nombre': 'Prueba', 'precio_mensual': Decimal('0.00'), 'duracion_dias': 14,
        'limite_productos': 20, 'incluye_live_commerce': False, 'incluye_ia': False, 'porcentaje_comision': Decimal('0.00'),
    },
    {
        'codigo': 'BASICO', 'nombre': 'Básico', 'precio_mensual': Decimal('49.90'), 'duracion_dias': 30,
        'limite_productos': 100, 'incluye_live_commerce': False, 'incluye_ia': True, 'porcentaje_comision': Decimal('5.00'),
    },
    {
        'codigo': 'PREMIUM', 'nombre': 'Premium', 'precio_mensual': Decimal('129.90'), 'duracion_dias': 365,
        'limite_productos': None, 'incluye_live_commerce': True, 'incluye_ia': True, 'porcentaje_comision': Decimal('3.00'),
    },
]


def sembrar_planes(apps, schema_editor):
    Plan = apps.get_model('suscripciones', 'Plan')
    for datos in PLANES:
        Plan.objects.update_or_create(codigo=datos['codigo'], defaults={**datos, 'estado': 'ACTIVO'})


def eliminar_planes(apps, schema_editor):
    Plan = apps.get_model('suscripciones', 'Plan')
    Plan.objects.filter(codigo__in=[p['codigo'] for p in PLANES]).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('suscripciones', '0005_plan_codigo_plan_duracion_dias'),
    ]

    operations = [
        migrations.RunPython(sembrar_planes, eliminar_planes),
    ]
