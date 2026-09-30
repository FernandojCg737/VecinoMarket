from django.db import migrations

# =====================================================================
# CU27: cuando se aprueba una empresa que se registró con el código
# (slug) de otra (usuarios_empresa.referida_por_id), este trigger crea
# automáticamente su fila de facturacion_referido en estado PENDIENTE —
# nadie tiene que crearla a mano. fn_confirmar_referido es la acción que
# usa el SuperAdmin para confirmar un referido y aplicar el beneficio:
# 30 días extra en la suscripción activa de la empresa que refirió.
# =====================================================================

FUNCIONES_SQL = r"""
CREATE OR REPLACE FUNCTION fn_crear_referido_por_empresa()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.referida_por_id IS NOT NULL THEN
        INSERT INTO facturacion_referido
            (empresa_referente_id, empresa_referida_id, estado, beneficio_aplicado,
             creado_en, actualizado_en, activo)
        VALUES
            (NEW.referida_por_id, NEW.id, 'PENDIENTE', '', now(), now(), true);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION fn_confirmar_referido(p_referido_id BIGINT)
RETURNS VOID AS $$
DECLARE
    v_empresa_referente_id BIGINT;
    v_suscripcion_id BIGINT;
BEGIN
    SELECT empresa_referente_id INTO v_empresa_referente_id
    FROM facturacion_referido
    WHERE id = p_referido_id AND estado = 'PENDIENTE';

    IF v_empresa_referente_id IS NULL THEN
        RAISE EXCEPTION 'El referido % no existe o ya fue confirmado', p_referido_id;
    END IF;

    UPDATE facturacion_referido
    SET estado = 'CONFIRMADO', beneficio_aplicado = '30 dias extra de suscripcion para la empresa que refirio'
    WHERE id = p_referido_id;

    SELECT id INTO v_suscripcion_id
    FROM suscripciones_suscripcion
    WHERE empresa_id = v_empresa_referente_id
    ORDER BY fecha_vencimiento DESC
    LIMIT 1;

    IF v_suscripcion_id IS NOT NULL THEN
        UPDATE suscripciones_suscripcion
        SET fecha_vencimiento = fecha_vencimiento + INTERVAL '30 days'
        WHERE id = v_suscripcion_id;
    END IF;
END;
$$ LANGUAGE plpgsql;
"""

TRIGGERS_SQL = r"""
CREATE TRIGGER trg_crear_referido_por_empresa
AFTER INSERT ON usuarios_empresa
FOR EACH ROW EXECUTE FUNCTION fn_crear_referido_por_empresa();

CREATE TRIGGER trg_auditoria_referido
AFTER INSERT OR UPDATE OR DELETE ON facturacion_referido
FOR EACH ROW EXECUTE FUNCTION fn_auditoria_generica();

CREATE TRIGGER trg_touch_referido
BEFORE UPDATE ON facturacion_referido
FOR EACH ROW EXECUTE FUNCTION fn_touch_actualizado_en();
"""

DROP_TRIGGERS_SQL = r"""
DROP TRIGGER IF EXISTS trg_touch_referido ON facturacion_referido;
DROP TRIGGER IF EXISTS trg_auditoria_referido ON facturacion_referido;
DROP TRIGGER IF EXISTS trg_crear_referido_por_empresa ON usuarios_empresa;
"""

DROP_FUNCIONES_SQL = r"""
DROP FUNCTION IF EXISTS fn_confirmar_referido(BIGINT);
DROP FUNCTION IF EXISTS fn_crear_referido_por_empresa();
"""


class Migration(migrations.Migration):

    dependencies = [
        ('facturacion', '0005_factura_comision_funciones_y_triggers'),
        ('usuarios', '0007_empresa_referida_por_and_more'),
        ('suscripciones', '0002_initial'),
    ]

    operations = [
        migrations.RunSQL(sql=FUNCIONES_SQL, reverse_sql=DROP_FUNCIONES_SQL),
        migrations.RunSQL(sql=TRIGGERS_SQL, reverse_sql=DROP_TRIGGERS_SQL),
    ]
