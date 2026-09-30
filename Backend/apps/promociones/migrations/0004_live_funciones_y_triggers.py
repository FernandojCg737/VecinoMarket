from django.db import migrations

# =====================================================================
# CU17: trg_verificar_bloqueo_live impide que una sesión pase a EN_VIVO
# si la empresa tiene una sanción activa (usuarios_empresa.bloqueo_live_
# hasta en el futuro) — se aplica tanto al crear directo en EN_VIVO como
# al pasar de PROGRAMADA a EN_VIVO. Más los triggers de auditoría/touch
# que le faltaban a promociones_livecommercesesion.
# =====================================================================

FUNCIONES_SQL = r"""
CREATE OR REPLACE FUNCTION fn_verificar_bloqueo_live()
RETURNS TRIGGER AS $$
DECLARE
    v_bloqueo_hasta TIMESTAMPTZ;
BEGIN
    IF NEW.estado = 'EN_VIVO' THEN
        SELECT bloqueo_live_hasta INTO v_bloqueo_hasta
        FROM usuarios_empresa
        WHERE id = NEW.empresa_id;

        IF v_bloqueo_hasta IS NOT NULL AND v_bloqueo_hasta > now() THEN
            RAISE EXCEPTION 'Esta empresa tiene bloqueada la transmisión en vivo hasta %', v_bloqueo_hasta;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
"""

TRIGGERS_SQL = r"""
CREATE TRIGGER trg_verificar_bloqueo_live
BEFORE INSERT OR UPDATE OF estado ON promociones_livecommercesesion
FOR EACH ROW EXECUTE FUNCTION fn_verificar_bloqueo_live();

CREATE TRIGGER trg_auditoria_livecommercesesion
AFTER INSERT OR UPDATE OR DELETE ON promociones_livecommercesesion
FOR EACH ROW EXECUTE FUNCTION fn_auditoria_generica();

CREATE TRIGGER trg_touch_livecommercesesion
BEFORE UPDATE ON promociones_livecommercesesion
FOR EACH ROW EXECUTE FUNCTION fn_touch_actualizado_en();
"""

DROP_TRIGGERS_SQL = r"""
DROP TRIGGER IF EXISTS trg_touch_livecommercesesion ON promociones_livecommercesesion;
DROP TRIGGER IF EXISTS trg_auditoria_livecommercesesion ON promociones_livecommercesesion;
DROP TRIGGER IF EXISTS trg_verificar_bloqueo_live ON promociones_livecommercesesion;
"""

DROP_FUNCIONES_SQL = r"""
DROP FUNCTION IF EXISTS fn_verificar_bloqueo_live();
"""


class Migration(migrations.Migration):

    dependencies = [
        ('promociones', '0003_promocion_funciones_y_triggers'),
        ('usuarios', '0008_empresa_bloqueo_live_hasta'),
    ]

    operations = [
        migrations.RunSQL(sql=FUNCIONES_SQL, reverse_sql=DROP_FUNCIONES_SQL),
        migrations.RunSQL(sql=TRIGGERS_SQL, reverse_sql=DROP_TRIGGERS_SQL),
    ]
