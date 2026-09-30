from django.db import migrations

# =====================================================================
# CU01/CU20: función, procedimiento almacenado y triggers para el ciclo de
# vida de las suscripciones. Sigue la misma convención que
# apps/core/migrations/0001_funciones_y_triggers.py (RunSQL en vez de
# modelos, porque es lógica de base de datos pura).
# =====================================================================

FUNCIONES_SQL = r"""
-- ---------------------------------------------------------------------
-- fn_expirar_suscripciones: marca como VENCIDA toda suscripción ACTIVA
-- cuya fecha_vencimiento ya pasó. Devuelve cuántas filas actualizó.
-- La usa sp_expirar_suscripciones_vencidas.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_expirar_suscripciones() RETURNS INTEGER AS $$
DECLARE
    v_filas INTEGER;
BEGIN
    UPDATE suscripciones_suscripcion
    SET estado = 'VENCIDA', actualizado_en = now()
    WHERE estado = 'ACTIVA' AND fecha_vencimiento < CURRENT_DATE;

    GET DIAGNOSTICS v_filas = ROW_COUNT;
    RETURN v_filas;
END;
$$ LANGUAGE plpgsql;
"""

PROCEDIMIENTOS_SQL = r"""
-- ---------------------------------------------------------------------
-- sp_expirar_suscripciones_vencidas: procedimiento almacenado (PA) que
-- envuelve fn_expirar_suscripciones para invocarse con CALL. Lo dispara
-- ListaEmpresasAdminView en cada carga del listado de empresas del
-- SuperAdmin (CU01), y también el comando `expirar_suscripciones` si se
-- quiere programar aparte (cron / scheduler).
-- Uso: CALL sp_expirar_suscripciones_vencidas();
-- ---------------------------------------------------------------------
CREATE OR REPLACE PROCEDURE sp_expirar_suscripciones_vencidas()
LANGUAGE plpgsql AS $$
BEGIN
    PERFORM fn_expirar_suscripciones();
END;
$$;
"""

TRIGGERS_SQL = r"""
CREATE TRIGGER trg_auditoria_suscripcion
AFTER INSERT OR UPDATE OR DELETE ON suscripciones_suscripcion
FOR EACH ROW EXECUTE FUNCTION fn_auditoria_generica();

CREATE TRIGGER trg_touch_suscripcion
BEFORE UPDATE ON suscripciones_suscripcion
FOR EACH ROW EXECUTE FUNCTION fn_touch_actualizado_en();
"""

DROP_TRIGGERS_SQL = r"""
DROP TRIGGER IF EXISTS trg_touch_suscripcion ON suscripciones_suscripcion;
DROP TRIGGER IF EXISTS trg_auditoria_suscripcion ON suscripciones_suscripcion;
"""

DROP_PROCEDIMIENTOS_SQL = r"""
DROP PROCEDURE IF EXISTS sp_expirar_suscripciones_vencidas();
"""

DROP_FUNCIONES_SQL = r"""
DROP FUNCTION IF EXISTS fn_expirar_suscripciones();
"""


class Migration(migrations.Migration):

    dependencies = [
        ('suscripciones', '0002_initial'),
        ('core', '0001_funciones_y_triggers'),
    ]

    operations = [
        migrations.RunSQL(sql=FUNCIONES_SQL, reverse_sql=DROP_FUNCIONES_SQL),
        migrations.RunSQL(sql=PROCEDIMIENTOS_SQL, reverse_sql=DROP_PROCEDIMIENTOS_SQL),
        migrations.RunSQL(sql=TRIGGERS_SQL, reverse_sql=DROP_TRIGGERS_SQL),
    ]
