from django.db import migrations

# =====================================================================
# CU06: función de conteo de productos por categoría, más los triggers de
# auditoría/touch que le faltaban a catalogo_categoria (catalogo_producto
# ya los tenía desde core/migrations/0001).
# =====================================================================

FUNCIONES_SQL = r"""
-- ---------------------------------------------------------------------
-- fn_contar_productos_categoria: cuántos productos activos tiene una
-- categoría. La usa CategoriaAdminSerializer (CU06), y queda disponible
-- para reportes/consultas manuales.
-- Uso: SELECT fn_contar_productos_categoria(5);
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_contar_productos_categoria(p_categoria_id BIGINT)
RETURNS INTEGER AS $$
DECLARE
    v_total INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_total
    FROM catalogo_producto
    WHERE categoria_id = p_categoria_id AND activo = true;

    RETURN v_total;
END;
$$ LANGUAGE plpgsql STABLE;
"""

TRIGGERS_SQL = r"""
CREATE TRIGGER trg_auditoria_categoria
AFTER INSERT OR UPDATE OR DELETE ON catalogo_categoria
FOR EACH ROW EXECUTE FUNCTION fn_auditoria_generica();

CREATE TRIGGER trg_touch_categoria
BEFORE UPDATE ON catalogo_categoria
FOR EACH ROW EXECUTE FUNCTION fn_touch_actualizado_en();
"""

DROP_TRIGGERS_SQL = r"""
DROP TRIGGER IF EXISTS trg_touch_categoria ON catalogo_categoria;
DROP TRIGGER IF EXISTS trg_auditoria_categoria ON catalogo_categoria;
"""

DROP_FUNCIONES_SQL = r"""
DROP FUNCTION IF EXISTS fn_contar_productos_categoria(BIGINT);
"""


class Migration(migrations.Migration):

    dependencies = [
        ('catalogo', '0002_initial'),
        ('core', '0001_funciones_y_triggers'),
    ]

    operations = [
        migrations.RunSQL(sql=FUNCIONES_SQL, reverse_sql=DROP_FUNCIONES_SQL),
        migrations.RunSQL(sql=TRIGGERS_SQL, reverse_sql=DROP_TRIGGERS_SQL),
    ]
