from django.db import migrations

# =====================================================================
# CU25: triggers de auditoría/touch para facturacion_metodopago (mismo
# patrón que catalogo_categoria/catalogo_producto), más una función que
# garantiza que cada empresa tenga como máximo un método de pago marcado
# como predeterminado — si se marca uno nuevo, desmarca los demás en la
# misma transacción en vez de dejarlo a la validación de la API.
# =====================================================================

FUNCIONES_SQL = r"""
CREATE OR REPLACE FUNCTION fn_unico_metodo_predeterminado()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.predeterminado THEN
        UPDATE facturacion_metodopago
        SET predeterminado = false
        WHERE empresa_id = NEW.empresa_id
          AND id <> NEW.id
          AND predeterminado = true;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
"""

TRIGGERS_SQL = r"""
CREATE TRIGGER trg_unico_metodo_predeterminado
BEFORE INSERT OR UPDATE OF predeterminado ON facturacion_metodopago
FOR EACH ROW EXECUTE FUNCTION fn_unico_metodo_predeterminado();

CREATE TRIGGER trg_auditoria_metodopago
AFTER INSERT OR UPDATE OR DELETE ON facturacion_metodopago
FOR EACH ROW EXECUTE FUNCTION fn_auditoria_generica();

CREATE TRIGGER trg_touch_metodopago
BEFORE UPDATE ON facturacion_metodopago
FOR EACH ROW EXECUTE FUNCTION fn_touch_actualizado_en();
"""

DROP_TRIGGERS_SQL = r"""
DROP TRIGGER IF EXISTS trg_touch_metodopago ON facturacion_metodopago;
DROP TRIGGER IF EXISTS trg_auditoria_metodopago ON facturacion_metodopago;
DROP TRIGGER IF EXISTS trg_unico_metodo_predeterminado ON facturacion_metodopago;
"""

DROP_FUNCIONES_SQL = r"""
DROP FUNCTION IF EXISTS fn_unico_metodo_predeterminado();
"""


class Migration(migrations.Migration):

    dependencies = [
        ('facturacion', '0003_metodopago'),
        ('core', '0001_funciones_y_triggers'),
    ]

    operations = [
        migrations.RunSQL(sql=FUNCIONES_SQL, reverse_sql=DROP_FUNCIONES_SQL),
        migrations.RunSQL(sql=TRIGGERS_SQL, reverse_sql=DROP_TRIGGERS_SQL),
    ]
