from django.db import migrations

# =====================================================================
# CU04: función que resume las valoraciones de una empresa (promedio en
# estrellas + total) — la usa el panel del SuperAdmin para mostrar un
# vistazo rápido de cada empresa antes de entrar a ver los comentarios,
# mismo patrón que fn_resumen_catalogo_empresa (CU05). Más los triggers
# de auditoría/touch que le faltaban a reportes_valoracion.
# =====================================================================

FUNCIONES_SQL = r"""
CREATE OR REPLACE FUNCTION fn_resumen_valoraciones_empresa(p_empresa_id BIGINT)
RETURNS TABLE (promedio NUMERIC, total INTEGER) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COALESCE(ROUND(AVG(v.calificacion)::numeric, 2), 0) AS promedio,
        COUNT(*)::INTEGER AS total
    FROM reportes_valoracion v
    WHERE v.empresa_id = p_empresa_id AND v.activo = true;
END;
$$ LANGUAGE plpgsql STABLE;
"""

TRIGGERS_SQL = r"""
CREATE TRIGGER trg_auditoria_valoracion
AFTER INSERT OR UPDATE OR DELETE ON reportes_valoracion
FOR EACH ROW EXECUTE FUNCTION fn_auditoria_generica();

CREATE TRIGGER trg_touch_valoracion
BEFORE UPDATE ON reportes_valoracion
FOR EACH ROW EXECUTE FUNCTION fn_touch_actualizado_en();
"""

DROP_TRIGGERS_SQL = r"""
DROP TRIGGER IF EXISTS trg_touch_valoracion ON reportes_valoracion;
DROP TRIGGER IF EXISTS trg_auditoria_valoracion ON reportes_valoracion;
"""

DROP_FUNCIONES_SQL = r"""
DROP FUNCTION IF EXISTS fn_resumen_valoraciones_empresa(BIGINT);
"""


class Migration(migrations.Migration):

    dependencies = [
        ('reportes', '0002_initial'),
        ('core', '0001_funciones_y_triggers'),
    ]

    operations = [
        migrations.RunSQL(sql=FUNCIONES_SQL, reverse_sql=DROP_FUNCIONES_SQL),
        migrations.RunSQL(sql=TRIGGERS_SQL, reverse_sql=DROP_TRIGGERS_SQL),
    ]
