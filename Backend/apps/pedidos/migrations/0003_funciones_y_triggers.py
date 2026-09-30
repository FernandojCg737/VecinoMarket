from django.db import migrations

# =====================================================================
# CU11: función que resume un carrito (cuántos ítems distintos y el monto
# total) — la usa el listado del SuperAdmin en vez de traer todos los ítems
# de cada carrito solo para sumarlos. Más los triggers de auditoría/touch
# que le faltaban a pedidos_carrito (pedidos_carritoitem no tiene
# creado_en/actualizado_en propios, así que solo lleva auditoría).
# =====================================================================

FUNCIONES_SQL = r"""
CREATE OR REPLACE FUNCTION fn_resumen_carrito(p_carrito_id BIGINT)
RETURNS TABLE (total_items INTEGER, total_monto NUMERIC) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COALESCE(SUM(ci.cantidad), 0)::INTEGER AS total_items,
        COALESCE(SUM(ci.cantidad * ci.precio_unitario), 0)::NUMERIC AS total_monto
    FROM pedidos_carritoitem ci
    WHERE ci.carrito_id = p_carrito_id;
END;
$$ LANGUAGE plpgsql STABLE;
"""

TRIGGERS_SQL = r"""
CREATE TRIGGER trg_auditoria_carrito
AFTER INSERT OR UPDATE OR DELETE ON pedidos_carrito
FOR EACH ROW EXECUTE FUNCTION fn_auditoria_generica();

CREATE TRIGGER trg_touch_carrito
BEFORE UPDATE ON pedidos_carrito
FOR EACH ROW EXECUTE FUNCTION fn_touch_actualizado_en();

CREATE TRIGGER trg_auditoria_carritoitem
AFTER INSERT OR UPDATE OR DELETE ON pedidos_carritoitem
FOR EACH ROW EXECUTE FUNCTION fn_auditoria_generica();
"""

DROP_TRIGGERS_SQL = r"""
DROP TRIGGER IF EXISTS trg_auditoria_carritoitem ON pedidos_carritoitem;
DROP TRIGGER IF EXISTS trg_touch_carrito ON pedidos_carrito;
DROP TRIGGER IF EXISTS trg_auditoria_carrito ON pedidos_carrito;
"""

DROP_FUNCIONES_SQL = r"""
DROP FUNCTION IF EXISTS fn_resumen_carrito(BIGINT);
"""


class Migration(migrations.Migration):

    dependencies = [
        ('pedidos', '0002_initial'),
        ('core', '0001_funciones_y_triggers'),
    ]

    operations = [
        migrations.RunSQL(sql=FUNCIONES_SQL, reverse_sql=DROP_FUNCIONES_SQL),
        migrations.RunSQL(sql=TRIGGERS_SQL, reverse_sql=DROP_TRIGGERS_SQL),
    ]
