from django.db import migrations

# Crea la extensión PostGIS antes que cualquier migración que use campos
# geométricos (p. ej. Empresa.ubicacion en usuarios/0001_initial). En el
# entorno de desarrollo local la extensión ya existe (se crea a mano según
# basedatos/01_crear_base_datos.sql), así que esto no hace nada ahí; en un
# Postgres nuevo (como el de Render) la crea automáticamente en el primer
# `migrate`, sin pasos manuales.


class Migration(migrations.Migration):

    initial = True

    dependencies = []

    operations = [
        migrations.RunSQL(
            'CREATE EXTENSION IF NOT EXISTS postgis;',
            reverse_sql='DROP EXTENSION IF EXISTS postgis;',
        ),
    ]
