# CU25: nuevo permiso asignable a empleados para que la empresa les delegue
# la gestión de sus métodos de pago (ver apps/facturacion). Se agrega acá
# como dato de catálogo, en vez de solo en poblar_datos.py, para que exista
# también en producción sin depender de volver a correr el seed de desarrollo.

from django.db import migrations


def crear_permiso(apps, schema_editor):
    Permiso = apps.get_model('usuarios', 'Permiso')
    Permiso.objects.get_or_create(
        codigo='gestionar_pagos',
        defaults={'descripcion': 'Configurar los métodos de pago de la empresa (QR, cuenta bancaria, pasarela)'},
    )


def eliminar_permiso(apps, schema_editor):
    Permiso = apps.get_model('usuarios', 'Permiso')
    Permiso.objects.filter(codigo='gestionar_pagos').delete()


class Migration(migrations.Migration):

    dependencies = [
        ('usuarios', '0003_rol_superadmin'),
    ]

    operations = [
        migrations.RunPython(crear_permiso, reverse_code=eliminar_permiso),
    ]
