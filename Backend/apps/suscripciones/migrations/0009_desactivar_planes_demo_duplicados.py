from django.db import migrations

# CU01: 'Plan Básico'/'Plan Premium' eran planes de demo creados por
# poblar_datos.py ANTES de que existieran los 3 planes canónicos de
# autoservicio (Prueba/Básico/Premium, identificados por 'codigo') — con
# los mismos precios, aparecían duplicados en el selector de "Editar
# suscripción" del admin. poblar_datos.py ya no los crea (usa el plan
# 'BASICO' canónico), pero las filas ya sembradas en bases existentes
# siguen ahí con empresas de demo apuntándolas (Suscripcion.plan es
# PROTECT, así que no se pueden borrar) — se desactivan para que dejen de
# ofrecerse como opción nueva, sin tocar las suscripciones ya asignadas.

NOMBRES_DUPLICADOS = ['Plan Básico', 'Plan Premium']


def desactivar(apps, schema_editor):
    Plan = apps.get_model('suscripciones', 'Plan')
    Plan.objects.filter(codigo__isnull=True, nombre__in=NOMBRES_DUPLICADOS).update(estado='INACTIVO')


def reactivar(apps, schema_editor):
    Plan = apps.get_model('suscripciones', 'Plan')
    Plan.objects.filter(codigo__isnull=True, nombre__in=NOMBRES_DUPLICADOS).update(estado='ACTIVO')


class Migration(migrations.Migration):

    dependencies = [
        ('suscripciones', '0008_fn_expirar_suscripciones_por_hora'),
    ]

    operations = [
        migrations.RunPython(desactivar, reactivar),
    ]
