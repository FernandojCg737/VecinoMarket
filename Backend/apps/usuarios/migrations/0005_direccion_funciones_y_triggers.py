from django.db import migrations

# =====================================================================
# CU13: usuarios_direccion no tenía ningún trigger todavía. Se agrega
# auditoría/touch (mismo patrón que el resto de la app) más una función
# que garantiza una sola dirección predeterminada por comprador — mismo
# enfoque que fn_unico_metodo_predeterminado (CU25) pero para direcciones.
# =====================================================================

FUNCIONES_SQL = r"""
CREATE OR REPLACE FUNCTION fn_unica_direccion_predeterminada()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.es_predeterminada THEN
        UPDATE usuarios_direccion
        SET es_predeterminada = false
        WHERE comprador_id = NEW.comprador_id
          AND id <> NEW.id
          AND es_predeterminada = true;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
"""

TRIGGERS_SQL = r"""
CREATE TRIGGER trg_unica_direccion_predeterminada
BEFORE INSERT OR UPDATE OF es_predeterminada ON usuarios_direccion
FOR EACH ROW EXECUTE FUNCTION fn_unica_direccion_predeterminada();

CREATE TRIGGER trg_auditoria_direccion
AFTER INSERT OR UPDATE OR DELETE ON usuarios_direccion
FOR EACH ROW EXECUTE FUNCTION fn_auditoria_generica();

CREATE TRIGGER trg_touch_direccion
BEFORE UPDATE ON usuarios_direccion
FOR EACH ROW EXECUTE FUNCTION fn_touch_actualizado_en();
"""

DROP_TRIGGERS_SQL = r"""
DROP TRIGGER IF EXISTS trg_touch_direccion ON usuarios_direccion;
DROP TRIGGER IF EXISTS trg_auditoria_direccion ON usuarios_direccion;
DROP TRIGGER IF EXISTS trg_unica_direccion_predeterminada ON usuarios_direccion;
"""

DROP_FUNCIONES_SQL = r"""
DROP FUNCTION IF EXISTS fn_unica_direccion_predeterminada();
"""


class Migration(migrations.Migration):

    dependencies = [
        ('usuarios', '0004_permiso_gestionar_pagos'),
        ('core', '0001_funciones_y_triggers'),
    ]

    operations = [
        migrations.RunSQL(sql=FUNCIONES_SQL, reverse_sql=DROP_FUNCIONES_SQL),
        migrations.RunSQL(sql=TRIGGERS_SQL, reverse_sql=DROP_TRIGGERS_SQL),
    ]
