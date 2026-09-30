from django.db import migrations

# =====================================================================
# CU20: triggers de auditoría/touch que le faltaban a suscripciones_plan
# (0003 ya cubrió suscripciones_suscripcion).
# =====================================================================

TRIGGERS_SQL = r"""
CREATE TRIGGER trg_auditoria_plan
AFTER INSERT OR UPDATE OR DELETE ON suscripciones_plan
FOR EACH ROW EXECUTE FUNCTION fn_auditoria_generica();

CREATE TRIGGER trg_touch_plan
BEFORE UPDATE ON suscripciones_plan
FOR EACH ROW EXECUTE FUNCTION fn_touch_actualizado_en();
"""

DROP_TRIGGERS_SQL = r"""
DROP TRIGGER IF EXISTS trg_touch_plan ON suscripciones_plan;
DROP TRIGGER IF EXISTS trg_auditoria_plan ON suscripciones_plan;
"""


class Migration(migrations.Migration):

    dependencies = [
        ('suscripciones', '0003_funciones_y_triggers'),
    ]

    operations = [
        migrations.RunSQL(sql=TRIGGERS_SQL, reverse_sql=DROP_TRIGGERS_SQL),
    ]
