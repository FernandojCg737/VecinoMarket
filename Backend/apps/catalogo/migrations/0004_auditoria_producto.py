from django.db import migrations

# =====================================================================
# CU07: catalogo_producto ya tenía trg_touch_producto y
# trg_stock_actualiza_estado_producto (core/migrations/0001), pero le
# faltaba el trigger de auditoría genérico que sí tienen usuarios_empresa,
# pedidos_pedido, usuarios_usuario, suscripciones_suscripcion y
# catalogo_categoria.
# =====================================================================

TRIGGERS_SQL = r"""
CREATE TRIGGER trg_auditoria_producto
AFTER INSERT OR UPDATE OR DELETE ON catalogo_producto
FOR EACH ROW EXECUTE FUNCTION fn_auditoria_generica();
"""

DROP_TRIGGERS_SQL = r"""
DROP TRIGGER IF EXISTS trg_auditoria_producto ON catalogo_producto;
"""


class Migration(migrations.Migration):

    dependencies = [
        ('catalogo', '0003_funciones_y_triggers'),
    ]

    operations = [
        migrations.RunSQL(sql=TRIGGERS_SQL, reverse_sql=DROP_TRIGGERS_SQL),
    ]
