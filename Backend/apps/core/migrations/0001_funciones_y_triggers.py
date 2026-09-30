from django.db import migrations

# =====================================================================
# Funciones y triggers PL/pgSQL.
#
# Se aplican vía RunSQL (en vez de modelos) porque son lógica de base de
# datos pura: no representan una tabla ni un campo, así que no hay nada
# que un modelo de Django pueda expresar aquí. Quedan versionados igual
# que cualquier otra migración, y se pueden revertir con
# `python manage.py migrate core 0001` hacia atrás (usa el SQL en
# reverse_sql para hacer DROP de todo).
# =====================================================================

FUNCIONES_SQL = r"""
-- ---------------------------------------------------------------------
-- fn_auditoria_generica: usada por triggers de auditoría (CU22). Registra
-- en auditoria_logauditoria cualquier INSERT/UPDATE/DELETE de la tabla a
-- la que esté enganchada, con el estado antes/después en JSON. No conoce
-- al usuario de la app (eso lo sigue logueando la vista de Django con
-- más contexto); esto es una red de seguridad para cambios hechos
-- directamente en la base de datos.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_auditoria_generica() RETURNS TRIGGER AS $$
DECLARE
    v_detalle JSONB;
    v_entidad_id BIGINT;
BEGIN
    IF TG_OP = 'INSERT' THEN
        v_detalle := to_jsonb(NEW);
        v_entidad_id := NEW.id;
    ELSIF TG_OP = 'UPDATE' THEN
        v_detalle := jsonb_build_object('antes', to_jsonb(OLD), 'despues', to_jsonb(NEW));
        v_entidad_id := NEW.id;
    ELSE
        v_detalle := to_jsonb(OLD);
        v_entidad_id := OLD.id;
    END IF;

    INSERT INTO auditoria_logauditoria
        (usuario_id, accion, entidad_afectada, entidad_id, detalle, ip_origen, creado_en, actualizado_en, activo)
    VALUES
        (NULL, TG_TABLE_NAME || '_' || TG_OP, TG_TABLE_NAME, v_entidad_id, v_detalle, NULL, now(), now(), true);

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;


-- ---------------------------------------------------------------------
-- fn_touch_actualizado_en: refresca actualizado_en en cada UPDATE. Django
-- ya lo hace a nivel de ORM (auto_now=True); esto es una red de
-- seguridad para ediciones hechas por fuera de la app (SQL directo,
-- pgAdmin, etc).
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_touch_actualizado_en() RETURNS TRIGGER AS $$
BEGIN
    NEW.actualizado_en := now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ---------------------------------------------------------------------
-- fn_calcular_comision: dado el id de una empresa y un monto de venta,
-- calcula la comisión según el porcentaje_comision de su plan actual.
-- La usa trg_pedido_comision, y queda disponible para reportes/consultas
-- manuales (SELECT fn_calcular_comision(empresa_id, monto)).
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_calcular_comision(p_empresa_id BIGINT, p_monto NUMERIC)
RETURNS NUMERIC AS $$
DECLARE
    v_porcentaje NUMERIC(5,2);
BEGIN
    SELECT COALESCE(p.porcentaje_comision, 0) INTO v_porcentaje
    FROM usuarios_empresa e
    LEFT JOIN suscripciones_plan p ON p.id = e.plan_id
    WHERE e.id = p_empresa_id;

    RETURN ROUND(COALESCE(p_monto, 0) * COALESCE(v_porcentaje, 0) / 100, 2);
END;
$$ LANGUAGE plpgsql STABLE;


-- ---------------------------------------------------------------------
-- fn_empresas_cercanas: usa el índice GIST de PostGIS para encontrar
-- empresas activas dentro de un radio (en km) de un punto dado, ordenadas
-- por cercanía. Pensada para "negocios cerca de mí" en el frontend.
-- Uso: SELECT * FROM fn_empresas_cercanas(-68.15, -16.50, 5);
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_empresas_cercanas(
    p_lon DOUBLE PRECISION,
    p_lat DOUBLE PRECISION,
    p_radio_km NUMERIC DEFAULT 10
)
RETURNS TABLE (
    empresa_id BIGINT,
    razon_social VARCHAR,
    slug VARCHAR,
    distancia_km NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        e.id,
        e.razon_social,
        e.slug,
        ROUND(
            (ST_Distance(e.ubicacion, ST_SetSRID(ST_MakePoint(p_lon, p_lat), 4326)::geography) / 1000)::numeric,
            2
        ) AS distancia_km
    FROM usuarios_empresa e
    WHERE e.ubicacion IS NOT NULL
      AND e.estado = 'ACTIVA'
      AND ST_DWithin(
            e.ubicacion,
            ST_SetSRID(ST_MakePoint(p_lon, p_lat), 4326)::geography,
            p_radio_km * 1000
          )
    ORDER BY e.ubicacion <-> ST_SetSRID(ST_MakePoint(p_lon, p_lat), 4326)::geography;
END;
$$ LANGUAGE plpgsql STABLE;


-- ---------------------------------------------------------------------
-- fn_generar_numero_pedido: siguiente número de pedido correlativo
-- (VM-100001, VM-100002, ...). Para usar el día que exista la vista de
-- checkout real: numero_pedido = fn_generar_numero_pedido().
-- ---------------------------------------------------------------------
CREATE SEQUENCE IF NOT EXISTS seq_numero_pedido START 100001;

CREATE OR REPLACE FUNCTION fn_generar_numero_pedido() RETURNS VARCHAR AS $$
BEGIN
    RETURN 'VM-' || nextval('seq_numero_pedido');
END;
$$ LANGUAGE plpgsql;


-- ---------------------------------------------------------------------
-- fn_actualizar_estado_producto: cuando cambia el stock de un producto en
-- cualquier sucursal, revisa el stock total (sumando todas sus
-- sucursales) y marca el producto como AGOTADO o lo reactiva a ACTIVO.
-- No toca productos que estén INACTIVO a propósito (desactivados por la
-- empresa), solo alterna entre ACTIVO y AGOTADO.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_actualizar_estado_producto() RETURNS TRIGGER AS $$
DECLARE
    v_producto_id BIGINT;
    v_stock_total INTEGER;
BEGIN
    IF TG_OP = 'DELETE' THEN
        v_producto_id := OLD.producto_id;
    ELSE
        v_producto_id := NEW.producto_id;
    END IF;

    SELECT COALESCE(SUM(cantidad_disponible), 0) INTO v_stock_total
    FROM inventario_inventariosucursal
    WHERE producto_id = v_producto_id;

    IF v_stock_total <= 0 THEN
        UPDATE catalogo_producto
        SET estado = 'AGOTADO', actualizado_en = now()
        WHERE id = v_producto_id AND estado = 'ACTIVO';
    ELSE
        UPDATE catalogo_producto
        SET estado = 'ACTIVO', actualizado_en = now()
        WHERE id = v_producto_id AND estado = 'AGOTADO';
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;


-- ---------------------------------------------------------------------
-- fn_registrar_comision_pedido: cuando un pedido pasa a ENTREGADO, crea
-- automáticamente su fila en facturacion_comisionventa (CU26), usando
-- fn_calcular_comision. Es la red de seguridad a nivel de BD del mismo
-- cálculo que hará la vista de Django cuando exista.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_registrar_comision_pedido() RETURNS TRIGGER AS $$
DECLARE
    v_porcentaje NUMERIC(5,2);
BEGIN
    IF NEW.estado = 'ENTREGADO' AND OLD.estado IS DISTINCT FROM 'ENTREGADO' THEN
        IF NOT EXISTS (SELECT 1 FROM facturacion_comisionventa WHERE pedido_id = NEW.id) THEN
            SELECT COALESCE(p.porcentaje_comision, 0) INTO v_porcentaje
            FROM usuarios_empresa e
            LEFT JOIN suscripciones_plan p ON p.id = e.plan_id
            WHERE e.id = NEW.empresa_id;

            INSERT INTO facturacion_comisionventa
                (pedido_id, empresa_id, monto_venta, porcentaje_aplicado, monto_comision,
                 factura_id, creado_en, actualizado_en, activo)
            VALUES
                (NEW.id, NEW.empresa_id, NEW.subtotal, v_porcentaje,
                 fn_calcular_comision(NEW.empresa_id, NEW.subtotal),
                 NULL, now(), now(), true);
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
"""

TRIGGERS_SQL = r"""
CREATE TRIGGER trg_auditoria_empresa
AFTER INSERT OR UPDATE OR DELETE ON usuarios_empresa
FOR EACH ROW EXECUTE FUNCTION fn_auditoria_generica();

CREATE TRIGGER trg_auditoria_pedido
AFTER INSERT OR UPDATE OR DELETE ON pedidos_pedido
FOR EACH ROW EXECUTE FUNCTION fn_auditoria_generica();

CREATE TRIGGER trg_touch_empresa
BEFORE UPDATE ON usuarios_empresa
FOR EACH ROW EXECUTE FUNCTION fn_touch_actualizado_en();

CREATE TRIGGER trg_touch_producto
BEFORE UPDATE ON catalogo_producto
FOR EACH ROW EXECUTE FUNCTION fn_touch_actualizado_en();

CREATE TRIGGER trg_stock_actualiza_estado_producto
AFTER INSERT OR DELETE OR UPDATE OF cantidad_disponible ON inventario_inventariosucursal
FOR EACH ROW EXECUTE FUNCTION fn_actualizar_estado_producto();

CREATE TRIGGER trg_pedido_comision
AFTER UPDATE OF estado ON pedidos_pedido
FOR EACH ROW EXECUTE FUNCTION fn_registrar_comision_pedido();
"""

DROP_TRIGGERS_SQL = r"""
DROP TRIGGER IF EXISTS trg_pedido_comision ON pedidos_pedido;
DROP TRIGGER IF EXISTS trg_stock_actualiza_estado_producto ON inventario_inventariosucursal;
DROP TRIGGER IF EXISTS trg_touch_producto ON catalogo_producto;
DROP TRIGGER IF EXISTS trg_touch_empresa ON usuarios_empresa;
DROP TRIGGER IF EXISTS trg_auditoria_pedido ON pedidos_pedido;
DROP TRIGGER IF EXISTS trg_auditoria_empresa ON usuarios_empresa;
"""

DROP_FUNCIONES_SQL = r"""
DROP FUNCTION IF EXISTS fn_registrar_comision_pedido();
DROP FUNCTION IF EXISTS fn_actualizar_estado_producto();
DROP FUNCTION IF EXISTS fn_generar_numero_pedido();
DROP SEQUENCE IF EXISTS seq_numero_pedido;
DROP FUNCTION IF EXISTS fn_empresas_cercanas(DOUBLE PRECISION, DOUBLE PRECISION, NUMERIC);
DROP FUNCTION IF EXISTS fn_calcular_comision(BIGINT, NUMERIC);
DROP FUNCTION IF EXISTS fn_touch_actualizado_en();
DROP FUNCTION IF EXISTS fn_auditoria_generica();
"""


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('core', '0000_postgis_extension'),
        ('usuarios', '0001_initial'),
        ('catalogo', '0002_initial'),
        ('inventario', '0002_initial'),
        ('pedidos', '0002_initial'),
        ('facturacion', '0002_initial'),
        ('suscripciones', '0002_initial'),
        ('auditoria', '0002_initial'),
    ]

    operations = [
        migrations.RunSQL(sql=FUNCIONES_SQL, reverse_sql=DROP_FUNCIONES_SQL),
        migrations.RunSQL(sql=TRIGGERS_SQL, reverse_sql=DROP_TRIGGERS_SQL),
    ]
