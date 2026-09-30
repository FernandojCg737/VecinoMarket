from django.db import migrations

# =====================================================================
# CU23: fn_enviar_notificacion_masiva inserta una fila por cada usuario
# destinatario en una sola sentencia (en vez de que la vista haga un
# INSERT por usuario desde Python) — la usa el SuperAdmin para mandar un
# aviso a todos los usuarios de un rol (o a todos) de una sola vez.
# Devuelve cuántos usuarios recibieron la notificación.
# =====================================================================

FUNCIONES_SQL = r"""
CREATE OR REPLACE FUNCTION fn_enviar_notificacion_masiva(
    p_rol VARCHAR, p_tipo VARCHAR, p_titulo VARCHAR, p_mensaje VARCHAR, p_enlace VARCHAR DEFAULT ''
)
RETURNS INTEGER AS $$
DECLARE
    v_total INTEGER;
BEGIN
    INSERT INTO notificaciones_notificacion
        (usuario_id, tipo, titulo, mensaje, enlace, leido, creado_en, actualizado_en, activo)
    SELECT u.id, p_tipo, p_titulo, p_mensaje, p_enlace, false, now(), now(), true
    FROM usuarios_usuario u
    WHERE u.estado = 'ACTIVO'
      AND (p_rol = 'TODOS' OR u.rol = p_rol);

    GET DIAGNOSTICS v_total = ROW_COUNT;
    RETURN v_total;
END;
$$ LANGUAGE plpgsql;
"""

TRIGGERS_SQL = r"""
CREATE TRIGGER trg_touch_notificacion
BEFORE UPDATE ON notificaciones_notificacion
FOR EACH ROW EXECUTE FUNCTION fn_touch_actualizado_en();
"""

DROP_TRIGGERS_SQL = r"""
DROP TRIGGER IF EXISTS trg_touch_notificacion ON notificaciones_notificacion;
"""

DROP_FUNCIONES_SQL = r"""
DROP FUNCTION IF EXISTS fn_enviar_notificacion_masiva(VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR);
"""


class Migration(migrations.Migration):

    dependencies = [
        ('notificaciones', '0002_initial'),
        ('core', '0001_funciones_y_triggers'),
        ('usuarios', '0001_initial'),
    ]

    operations = [
        migrations.RunSQL(sql=FUNCIONES_SQL, reverse_sql=DROP_FUNCIONES_SQL),
        migrations.RunSQL(sql=TRIGGERS_SQL, reverse_sql=DROP_TRIGGERS_SQL),
    ]
