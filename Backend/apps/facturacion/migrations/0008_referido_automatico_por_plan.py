from django.db import migrations

# =====================================================================
# CU27: el referido se confirma SOLO, sin aprobación del SuperAdmin (las
# empresas se crean automáticamente tras el pago, no hay una aprobación
# manual de la que colgar el premio). El premio depende del plan que
# contrata la empresa referida:
#   - Prueba (gratis): sin premio, el referido queda PENDIENTE hasta que
#     contrate un plan pagado.
#   - Básico: +3 días de suscripción para la empresa que refirió.
#   - Premium: +5 días.
# trg_referido_por_suscripcion se dispara con cada Suscripcion nueva, así
# cubre el alta (crear_cuenta_empresa) y el cambio de plan (CU20) por igual.
# =====================================================================

FUNCIONES_SQL = r"""
CREATE OR REPLACE FUNCTION fn_dias_premio_referido(p_plan_id BIGINT)
RETURNS INTEGER AS $$
    SELECT CASE (SELECT codigo FROM suscripciones_plan WHERE id = p_plan_id)
        WHEN 'BASICO' THEN 3
        WHEN 'PREMIUM' THEN 5
        ELSE 0
    END;
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION fn_aplicar_premio_referido(p_referido_id BIGINT, p_plan_id BIGINT)
RETURNS VOID AS $$
DECLARE
    v_referente_id BIGINT;
    v_dias INTEGER := fn_dias_premio_referido(p_plan_id);
    v_plan_nombre VARCHAR;
    v_referida_nombre VARCHAR;
    v_suscripcion_id BIGINT;
    v_dueno_id BIGINT;
BEGIN
    SELECT r.empresa_referente_id, e.razon_social INTO v_referente_id, v_referida_nombre
    FROM facturacion_referido r JOIN usuarios_empresa e ON e.id = r.empresa_referida_id
    WHERE r.id = p_referido_id AND r.estado = 'PENDIENTE';

    IF v_referente_id IS NULL THEN
        RAISE EXCEPTION 'El referido % no existe o ya fue confirmado', p_referido_id;
    END IF;
    IF v_dias = 0 THEN
        RAISE EXCEPTION 'La empresa referida aun esta en el plan de prueba: el premio se aplica al contratar un plan pagado';
    END IF;

    SELECT nombre INTO v_plan_nombre FROM suscripciones_plan WHERE id = p_plan_id;

    UPDATE facturacion_referido
    SET estado = 'CONFIRMADO',
        beneficio_aplicado = LEFT(v_dias || ' dias extra de suscripcion (referida con plan ' || v_plan_nombre || ')', 100)
    WHERE id = p_referido_id;

    SELECT id INTO v_suscripcion_id
    FROM suscripciones_suscripcion
    WHERE empresa_id = v_referente_id
    ORDER BY fecha_vencimiento DESC
    LIMIT 1;

    IF v_suscripcion_id IS NOT NULL THEN
        UPDATE suscripciones_suscripcion
        SET fecha_vencimiento = fecha_vencimiento + make_interval(days => v_dias)
        WHERE id = v_suscripcion_id;
    END IF;

    SELECT usuario_dueno_id INTO v_dueno_id FROM usuarios_empresa WHERE id = v_referente_id;
    INSERT INTO notificaciones_notificacion
        (usuario_id, tipo, titulo, mensaje, enlace, leido, creado_en, actualizado_en, activo)
    VALUES
        (v_dueno_id, 'REFERIDO_CONFIRMADO', 'Ganaste dias por tu referido',
         LEFT(v_referida_nombre || ' contrato el plan ' || v_plan_nombre || ': sumamos ' || v_dias
              || ' dias a tu suscripcion.', 255),
         '/mi-empresa/referidos', false, now(), now(), true);
END;
$$ LANGUAGE plpgsql;

-- Usada por el SuperAdmin (ConfirmarReferidoAdminView): mismo premio según
-- el plan actual de la empresa referida.
CREATE OR REPLACE FUNCTION fn_confirmar_referido(p_referido_id BIGINT)
RETURNS VOID AS $$
DECLARE
    v_plan_id BIGINT;
BEGIN
    SELECT e.plan_id INTO v_plan_id
    FROM facturacion_referido r JOIN usuarios_empresa e ON e.id = r.empresa_referida_id
    WHERE r.id = p_referido_id;
    PERFORM fn_aplicar_premio_referido(p_referido_id, v_plan_id);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION fn_referido_por_suscripcion()
RETURNS TRIGGER AS $$
DECLARE
    v_referido_id BIGINT;
BEGIN
    IF fn_dias_premio_referido(NEW.plan_id) > 0 THEN
        SELECT id INTO v_referido_id
        FROM facturacion_referido
        WHERE empresa_referida_id = NEW.empresa_id AND estado = 'PENDIENTE'
        LIMIT 1;
        IF v_referido_id IS NOT NULL THEN
            PERFORM fn_aplicar_premio_referido(v_referido_id, NEW.plan_id);
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
"""

TRIGGERS_SQL = r"""
DROP TRIGGER IF EXISTS trg_referido_por_suscripcion ON suscripciones_suscripcion;
CREATE TRIGGER trg_referido_por_suscripcion
AFTER INSERT ON suscripciones_suscripcion
FOR EACH ROW EXECUTE FUNCTION fn_referido_por_suscripcion();
"""

DROP_TRIGGERS_SQL = r"""
DROP TRIGGER IF EXISTS trg_referido_por_suscripcion ON suscripciones_suscripcion;
"""

# Vuelve a la versión anterior (confirmación manual, 30 días fijos).
DROP_FUNCIONES_SQL = r"""
DROP FUNCTION IF EXISTS fn_referido_por_suscripcion();
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
DROP FUNCTION IF EXISTS fn_aplicar_premio_referido(BIGINT, BIGINT);
DROP FUNCTION IF EXISTS fn_dias_premio_referido(BIGINT);
"""


class Migration(migrations.Migration):

    dependencies = [
        ('facturacion', '0007_alter_metodopago_tipo'),
        ('suscripciones', '0009_desactivar_planes_demo_duplicados'),
        ('notificaciones', '0003_funciones_y_triggers'),
    ]

    operations = [
        migrations.RunSQL(sql=FUNCIONES_SQL, reverse_sql=DROP_FUNCIONES_SQL),
        migrations.RunSQL(sql=TRIGGERS_SQL, reverse_sql=DROP_TRIGGERS_SQL),
    ]
