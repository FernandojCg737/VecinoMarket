from django.db import migrations

# =====================================================================
# CU14: triggers de auditoría/touch para comunicacion_chatconversacion
# (tiene actualizado_en) y solo auditoría para comunicacion_chatmensaje
# (no tiene campos de BaseModel). Más una función que cuenta las
# conversaciones abiertas de una empresa — la usa el panel del SuperAdmin
# para el vistazo por empresa.
# =====================================================================

FUNCIONES_SQL = r"""
CREATE OR REPLACE FUNCTION fn_contar_conversaciones_empresa(p_empresa_id BIGINT)
RETURNS INTEGER AS $$
DECLARE
    v_total INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_total
    FROM comunicacion_chatconversacion
    WHERE empresa_id = p_empresa_id AND activo = true;

    RETURN v_total;
END;
$$ LANGUAGE plpgsql STABLE;
"""

TRIGGERS_SQL = r"""
CREATE TRIGGER trg_auditoria_chatconversacion
AFTER INSERT OR UPDATE OR DELETE ON comunicacion_chatconversacion
FOR EACH ROW EXECUTE FUNCTION fn_auditoria_generica();

CREATE TRIGGER trg_touch_chatconversacion
BEFORE UPDATE ON comunicacion_chatconversacion
FOR EACH ROW EXECUTE FUNCTION fn_touch_actualizado_en();

CREATE TRIGGER trg_auditoria_chatmensaje
AFTER INSERT OR DELETE ON comunicacion_chatmensaje
FOR EACH ROW EXECUTE FUNCTION fn_auditoria_generica();
"""

DROP_TRIGGERS_SQL = r"""
DROP TRIGGER IF EXISTS trg_auditoria_chatmensaje ON comunicacion_chatmensaje;
DROP TRIGGER IF EXISTS trg_touch_chatconversacion ON comunicacion_chatconversacion;
DROP TRIGGER IF EXISTS trg_auditoria_chatconversacion ON comunicacion_chatconversacion;
"""

DROP_FUNCIONES_SQL = r"""
DROP FUNCTION IF EXISTS fn_contar_conversaciones_empresa(BIGINT);
"""


class Migration(migrations.Migration):

    dependencies = [
        ('comunicacion', '0003_chatmensaje_archivo_alter_chatmensaje_contenido_and_more'),
        ('core', '0001_funciones_y_triggers'),
    ]

    operations = [
        migrations.RunSQL(sql=FUNCIONES_SQL, reverse_sql=DROP_FUNCIONES_SQL),
        migrations.RunSQL(sql=TRIGGERS_SQL, reverse_sql=DROP_TRIGGERS_SQL),
    ]
