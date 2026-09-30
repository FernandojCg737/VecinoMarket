from django.db import migrations

# =====================================================================
# CU16: función que cuenta las promociones activas y vigentes (dentro de
# su rango de fechas) de una empresa — la usa el panel del SuperAdmin
# para el vistazo por empresa, mismo patrón que las demás fn_resumen_*.
# Más los triggers de auditoría/touch que le faltaban a promociones_promocion.
# =====================================================================

FUNCIONES_SQL = r"""
CREATE OR REPLACE FUNCTION fn_contar_promociones_activas_empresa(p_empresa_id BIGINT)
RETURNS INTEGER AS $$
DECLARE
    v_total INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_total
    FROM promociones_promocion
    WHERE empresa_id = p_empresa_id
      AND estado = 'ACTIVA'
      AND activo = true
      AND now() BETWEEN fecha_inicio AND fecha_fin;

    RETURN v_total;
END;
$$ LANGUAGE plpgsql STABLE;
"""

TRIGGERS_SQL = r"""
CREATE TRIGGER trg_auditoria_promocion
AFTER INSERT OR UPDATE OR DELETE ON promociones_promocion
FOR EACH ROW EXECUTE FUNCTION fn_auditoria_generica();

CREATE TRIGGER trg_touch_promocion
BEFORE UPDATE ON promociones_promocion
FOR EACH ROW EXECUTE FUNCTION fn_touch_actualizado_en();
"""

DROP_TRIGGERS_SQL = r"""
DROP TRIGGER IF EXISTS trg_touch_promocion ON promociones_promocion;
DROP TRIGGER IF EXISTS trg_auditoria_promocion ON promociones_promocion;
"""

DROP_FUNCIONES_SQL = r"""
DROP FUNCTION IF EXISTS fn_contar_promociones_activas_empresa(BIGINT);
"""


class Migration(migrations.Migration):

    dependencies = [
        ('promociones', '0002_initial'),
        ('core', '0001_funciones_y_triggers'),
    ]

    operations = [
        migrations.RunSQL(sql=FUNCIONES_SQL, reverse_sql=DROP_FUNCIONES_SQL),
        migrations.RunSQL(sql=TRIGGERS_SQL, reverse_sql=DROP_TRIGGERS_SQL),
    ]
