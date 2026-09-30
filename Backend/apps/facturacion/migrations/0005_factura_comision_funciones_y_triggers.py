from django.db import migrations

# =====================================================================
# CU26: cuando se crea una comisión de venta (facturacion_comisionventa —
# ya se genera sola vía trg_pedido_comision, core/migrations/0001, cuando
# un pedido pasa a ENTREGADO), esta función genera automáticamente su
# factura (tipo COMISION) y la deja enlazada — así el SuperAdmin/empresa
# ven "la factura de esa venta" sin tener que crearla a mano. Es BEFORE
# INSERT (no AFTER) porque necesita escribir NEW.factura_id antes de que
# la fila de comisionventa se guarde.
# =====================================================================

FUNCIONES_SQL = r"""
CREATE OR REPLACE FUNCTION fn_generar_factura_comision()
RETURNS TRIGGER AS $$
DECLARE
    v_factura_id BIGINT;
BEGIN
    IF NEW.factura_id IS NULL THEN
        INSERT INTO facturacion_factura
            (empresa_id, suscripcion_id, tipo, monto, periodo_desde, periodo_hasta,
             estado_pago, fecha_pago, creado_en, actualizado_en, activo)
        VALUES
            (NEW.empresa_id, NULL, 'COMISION', NEW.monto_comision, CURRENT_DATE, CURRENT_DATE,
             'PAGADA', now(), now(), now(), true)
        RETURNING id INTO v_factura_id;

        NEW.factura_id := v_factura_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
"""

TRIGGERS_SQL = r"""
CREATE TRIGGER trg_generar_factura_comision
BEFORE INSERT ON facturacion_comisionventa
FOR EACH ROW EXECUTE FUNCTION fn_generar_factura_comision();

CREATE TRIGGER trg_auditoria_factura
AFTER INSERT OR UPDATE OR DELETE ON facturacion_factura
FOR EACH ROW EXECUTE FUNCTION fn_auditoria_generica();

CREATE TRIGGER trg_touch_factura
BEFORE UPDATE ON facturacion_factura
FOR EACH ROW EXECUTE FUNCTION fn_touch_actualizado_en();

CREATE TRIGGER trg_auditoria_comisionventa
AFTER INSERT OR UPDATE OR DELETE ON facturacion_comisionventa
FOR EACH ROW EXECUTE FUNCTION fn_auditoria_generica();
"""

DROP_TRIGGERS_SQL = r"""
DROP TRIGGER IF EXISTS trg_auditoria_comisionventa ON facturacion_comisionventa;
DROP TRIGGER IF EXISTS trg_touch_factura ON facturacion_factura;
DROP TRIGGER IF EXISTS trg_auditoria_factura ON facturacion_factura;
DROP TRIGGER IF EXISTS trg_generar_factura_comision ON facturacion_comisionventa;
"""

DROP_FUNCIONES_SQL = r"""
DROP FUNCTION IF EXISTS fn_generar_factura_comision();
"""


class Migration(migrations.Migration):

    dependencies = [
        ('facturacion', '0004_funciones_y_triggers'),
    ]

    operations = [
        migrations.RunSQL(sql=FUNCIONES_SQL, reverse_sql=DROP_FUNCIONES_SQL),
        migrations.RunSQL(sql=TRIGGERS_SQL, reverse_sql=DROP_TRIGGERS_SQL),
    ]
