from importlib import import_module

from django.db import migrations

ventas_original = import_module('apps.reportes.migrations.0005_dashboard_funciones').FUNCIONES_SQL
recomendaciones_original = import_module(
    'apps.reportes.migrations.0004_recomendaciones_funciones_y_triggers'
).FUNCIONES_SQL

ventas = ventas_original.replace(
    "oc.estado_pago = 'PAGADO'",
    "oc.estado_pago IN ('PAGADO', 'REEMBOLSO_PARCIAL') AND pe.estado <> 'DEVUELTO'",
)
recomendaciones = recomendaciones_original.replace(
    "oc.estado_pago = 'PAGADO'",
    "oc.estado_pago IN ('PAGADO', 'REEMBOLSO_PARCIAL') AND p.estado <> 'DEVUELTO'",
).replace(
    "oc2.estado_pago = 'PAGADO'",
    "oc2.estado_pago IN ('PAGADO', 'REEMBOLSO_PARCIAL') AND p2.estado <> 'DEVUELTO'",
)


class Migration(migrations.Migration):
    dependencies = [
        ('pedidos', '0010_metodos_historicos'),
        ('reportes', '0005_dashboard_funciones'),
    ]

    operations = [
        migrations.RunSQL(ventas, reverse_sql=ventas_original),
        migrations.RunSQL(recomendaciones, reverse_sql=recomendaciones_original),
    ]
