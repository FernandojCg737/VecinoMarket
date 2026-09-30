from django.db import migrations

# =====================================================================
# CU24: trigger dedicado para cambios de rol de usuario.
#
# A propósito NO se engancha aquí el trigger de auditoría genérico
# (fn_auditoria_generica, el que usan usuarios_empresa y pedidos_pedido)
# porque ese hace to_jsonb(NEW) de la fila completa, y usuarios_usuario
# tiene la columna `password` (el hash) — no queremos que el hash quede
# copiado en auditoria_logauditoria.detalle en cada UPDATE. Este trigger
# es angosto a propósito: solo guarda rol_anterior/rol_nuevo.
# =====================================================================

FUNCIONES_SQL = r"""
-- ---------------------------------------------------------------------
-- fn_registrar_cambio_rol: además de la auditoría genérica (INSERT/UPDATE
-- completo), deja una fila de bitácora específica y liviana solo cuando
-- cambia el rol, para poder filtrar/reportar cambios de rol sin tener que
-- bucear en el detalle JSON del registro genérico.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_registrar_cambio_rol() RETURNS TRIGGER AS $$
BEGIN
    IF NEW.rol IS DISTINCT FROM OLD.rol THEN
        INSERT INTO auditoria_logauditoria
            (usuario_id, accion, entidad_afectada, entidad_id, detalle, ip_origen, creado_en, actualizado_en, activo)
        VALUES
            (NEW.id, 'CAMBIO_ROL_TRIGGER', 'usuario', NEW.id,
             jsonb_build_object('rol_anterior', OLD.rol, 'rol_nuevo', NEW.rol),
             NULL, now(), now(), true);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
"""

TRIGGERS_SQL = r"""
CREATE TRIGGER trg_registrar_cambio_rol
AFTER UPDATE OF rol ON usuarios_usuario
FOR EACH ROW EXECUTE FUNCTION fn_registrar_cambio_rol();
"""

DROP_TRIGGERS_SQL = r"""
DROP TRIGGER IF EXISTS trg_registrar_cambio_rol ON usuarios_usuario;
"""

DROP_FUNCIONES_SQL = r"""
DROP FUNCTION IF EXISTS fn_registrar_cambio_rol();
"""


class Migration(migrations.Migration):

    dependencies = [
        ('usuarios', '0001_initial'),
        ('auditoria', '0002_initial'),
    ]

    operations = [
        migrations.RunSQL(sql=FUNCIONES_SQL, reverse_sql=DROP_FUNCIONES_SQL),
        migrations.RunSQL(sql=TRIGGERS_SQL, reverse_sql=DROP_TRIGGERS_SQL),
    ]
