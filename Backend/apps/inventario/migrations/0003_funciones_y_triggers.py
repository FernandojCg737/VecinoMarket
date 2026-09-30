from django.db import migrations

# =====================================================================
# CU10: función que ajusta el stock de un producto en una sucursal por un
# delta (+/-), en vez de dejar que el cliente mande directamente el nuevo
# valor absoluto — así queda una única puerta de entrada (la función) que
# garantiza que el stock nunca quede negativo, sin importar si el ajuste
# viene del admin (CU10) o, más adelante, de un descuento automático por
# venta confirmada. Más los triggers de auditoría/touch que le faltaban.
# =====================================================================

FUNCIONES_SQL = r"""
CREATE OR REPLACE FUNCTION fn_ajustar_stock(p_inventario_id BIGINT, p_delta INTEGER)
RETURNS INTEGER AS $$
DECLARE
    v_nueva INTEGER;
BEGIN
    UPDATE inventario_inventariosucursal
    SET cantidad_disponible = cantidad_disponible + p_delta
    WHERE id = p_inventario_id
    RETURNING cantidad_disponible INTO v_nueva;

    IF v_nueva IS NULL THEN
        RAISE EXCEPTION 'El registro de inventario % no existe', p_inventario_id;
    END IF;

    IF v_nueva < 0 THEN
        RAISE EXCEPTION 'Stock insuficiente: quedaría en % unidades', v_nueva;
    END IF;

    RETURN v_nueva;
END;
$$ LANGUAGE plpgsql;
"""

TRIGGERS_SQL = r"""
CREATE TRIGGER trg_auditoria_inventariosucursal
AFTER INSERT OR UPDATE OR DELETE ON inventario_inventariosucursal
FOR EACH ROW EXECUTE FUNCTION fn_auditoria_generica();

CREATE TRIGGER trg_touch_inventariosucursal
BEFORE UPDATE ON inventario_inventariosucursal
FOR EACH ROW EXECUTE FUNCTION fn_touch_actualizado_en();

CREATE TRIGGER trg_auditoria_sucursal
AFTER INSERT OR UPDATE OR DELETE ON inventario_sucursal
FOR EACH ROW EXECUTE FUNCTION fn_auditoria_generica();

CREATE TRIGGER trg_touch_sucursal
BEFORE UPDATE ON inventario_sucursal
FOR EACH ROW EXECUTE FUNCTION fn_touch_actualizado_en();
"""

DROP_TRIGGERS_SQL = r"""
DROP TRIGGER IF EXISTS trg_touch_sucursal ON inventario_sucursal;
DROP TRIGGER IF EXISTS trg_auditoria_sucursal ON inventario_sucursal;
DROP TRIGGER IF EXISTS trg_touch_inventariosucursal ON inventario_inventariosucursal;
DROP TRIGGER IF EXISTS trg_auditoria_inventariosucursal ON inventario_inventariosucursal;
"""

DROP_FUNCIONES_SQL = r"""
DROP FUNCTION IF EXISTS fn_ajustar_stock(BIGINT, INTEGER);
"""


class Migration(migrations.Migration):

    dependencies = [
        ('inventario', '0002_initial'),
        ('core', '0001_funciones_y_triggers'),
    ]

    operations = [
        migrations.RunSQL(sql=FUNCIONES_SQL, reverse_sql=DROP_FUNCIONES_SQL),
        migrations.RunSQL(sql=TRIGGERS_SQL, reverse_sql=DROP_TRIGGERS_SQL),
    ]
