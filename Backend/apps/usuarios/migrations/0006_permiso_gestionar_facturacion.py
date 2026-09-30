# CU26: permiso para que la empresa delegue a un empleado la gestión de
# facturas y comisiones (ver/editar/eliminar/exportar), igual que se hizo
# con 'gestionar_pagos' para CU25.

from django.db import migrations


def crear_permiso(apps, schema_editor):
    Permiso = apps.get_model('usuarios', 'Permiso')
    Permiso.objects.get_or_create(
        codigo='gestionar_facturacion',
        defaults={'descripcion': 'Ver, editar, eliminar y exportar las facturas y comisiones de la empresa'},
    )


def eliminar_permiso(apps, schema_editor):
    Permiso = apps.get_model('usuarios', 'Permiso')
    Permiso.objects.filter(codigo='gestionar_facturacion').delete()


class Migration(migrations.Migration):

    dependencies = [
        ('usuarios', '0005_direccion_funciones_y_triggers'),
    ]

    operations = [
        migrations.RunPython(crear_permiso, reverse_code=eliminar_permiso),
    ]
