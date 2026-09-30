from django.db import migrations

# =====================================================================
# CU12: pedidos_pedido ya tenía trg_auditoria_pedido y trg_pedido_comision
# desde core/migrations/0001 (crea la comisión automáticamente cuando el
# pedido pasa a ENTREGADO) — acá solo le falta el touch. pedidos_ordencompra
# (dueña de estado_pago, el campo que CU12 usa para separar "Pedido" de
# "Venta") y pedidos_pago no tenían nada todavía.
# =====================================================================

TRIGGERS_SQL = r"""
CREATE TRIGGER trg_touch_pedido
BEFORE UPDATE ON pedidos_pedido
FOR EACH ROW EXECUTE FUNCTION fn_touch_actualizado_en();

CREATE TRIGGER trg_auditoria_ordencompra
AFTER INSERT OR UPDATE OR DELETE ON pedidos_ordencompra
FOR EACH ROW EXECUTE FUNCTION fn_auditoria_generica();

CREATE TRIGGER trg_touch_ordencompra
BEFORE UPDATE ON pedidos_ordencompra
FOR EACH ROW EXECUTE FUNCTION fn_touch_actualizado_en();

CREATE TRIGGER trg_auditoria_pago
AFTER INSERT OR UPDATE OR DELETE ON pedidos_pago
FOR EACH ROW EXECUTE FUNCTION fn_auditoria_generica();

CREATE TRIGGER trg_auditoria_pedidoitem
AFTER INSERT OR UPDATE OR DELETE ON pedidos_pedidoitem
FOR EACH ROW EXECUTE FUNCTION fn_auditoria_generica();
"""

DROP_TRIGGERS_SQL = r"""
DROP TRIGGER IF EXISTS trg_auditoria_pedidoitem ON pedidos_pedidoitem;
DROP TRIGGER IF EXISTS trg_auditoria_pago ON pedidos_pago;
DROP TRIGGER IF EXISTS trg_touch_ordencompra ON pedidos_ordencompra;
DROP TRIGGER IF EXISTS trg_auditoria_ordencompra ON pedidos_ordencompra;
DROP TRIGGER IF EXISTS trg_touch_pedido ON pedidos_pedido;
"""


class Migration(migrations.Migration):

    dependencies = [
        ('pedidos', '0003_funciones_y_triggers'),
    ]

    operations = [
        migrations.RunSQL(sql=TRIGGERS_SQL, reverse_sql=DROP_TRIGGERS_SQL),
    ]
