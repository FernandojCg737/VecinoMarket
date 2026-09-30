from django.db import migrations, models


def migrar_admins_a_superadmin(apps, schema_editor):
    """Las cuentas 'ADMIN' que ya existían eran el dueño de la plataforma
    (el único rol admin que existía hasta ahora); pasan a SUPERADMIN. El
    rol 'ADMIN' queda libre para el nuevo personal de soporte, que se crea
    de ahora en más con CU24 (cambiar el rol de un usuario existente)."""
    Usuario = apps.get_model('usuarios', 'Usuario')
    Usuario.objects.filter(rol='ADMIN').update(rol='SUPERADMIN')


def revertir_superadmin_a_admin(apps, schema_editor):
    Usuario = apps.get_model('usuarios', 'Usuario')
    Usuario.objects.filter(rol='SUPERADMIN').update(rol='ADMIN')


class Migration(migrations.Migration):

    dependencies = [
        ('usuarios', '0002_funciones_y_triggers'),
    ]

    operations = [
        migrations.AlterField(
            model_name='usuario',
            name='rol',
            field=models.CharField(
                choices=[
                    ('SUPERADMIN', 'Super administrador'),
                    ('ADMIN', 'Administrador de soporte'),
                    ('EMPRESA', 'Empresa'),
                    ('EMPLEADO', 'Empleado'),
                    ('COMPRADOR', 'Comprador'),
                ],
                max_length=20,
            ),
        ),
        migrations.RunPython(migrar_admins_a_superadmin, revertir_superadmin_a_admin),
    ]
