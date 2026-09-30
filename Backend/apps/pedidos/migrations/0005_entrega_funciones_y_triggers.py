from django.db import migrations

# =====================================================================
# CU13: pedidos_entrega no tenía nada todavía (ni siquiera auditoría). Se
# agrega, más fn_marcar_entregada: una sola función que marca la entrega
# como ENTREGADA (con fecha_entregada = now()) Y el pedido como ENTREGADO
# en la misma transacción — así el trigger trg_pedido_comision (que ya
# existía desde core/migrations/0001) dispara solo, generando la comisión
# de venta (CU26) sin que la vista tenga que orquestar los dos updates.
# =====================================================================

FUNCIONES_SQL = r"""
CREATE OR REPLACE FUNCTION fn_marcar_entregada(p_pedido_id BIGINT)
RETURNS VOID AS $$
BEGIN
    UPDATE pedidos_entrega
    SET estado = 'ENTREGADA', fecha_entregada = now()
    WHERE pedido_id = p_pedido_id;

    UPDATE pedidos_pedido
    SET estado = 'ENTREGADO'
    WHERE id = p_pedido_id;
END;
$$ LANGUAGE plpgsql;
"""

TRIGGERS_SQL = r"""
CREATE TRIGGER trg_auditoria_entrega
AFTER INSERT OR UPDATE OR DELETE ON pedidos_entrega
FOR EACH ROW EXECUTE FUNCTION fn_auditoria_generica();
"""

DROP_TRIGGERS_SQL = r"""
DROP TRIGGER IF EXISTS trg_auditoria_entrega ON pedidos_entrega;
"""

DROP_FUNCIONES_SQL = r"""
DROP FUNCTION IF EXISTS fn_marcar_entregada(BIGINT);
"""


class Migration(migrations.Migration):

    dependencies = [
        ('pedidos', '0004_pedido_venta_funciones_y_triggers'),
    ]

    operations = [
        migrations.RunSQL(sql=FUNCIONES_SQL, reverse_sql=DROP_FUNCIONES_SQL),
        migrations.RunSQL(sql=TRIGGERS_SQL, reverse_sql=DROP_TRIGGERS_SQL),
    ]
