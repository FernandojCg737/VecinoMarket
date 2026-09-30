from django.db import migrations

# =====================================================================
# CU21: fn_generar_recomendaciones implementa filtrado colaborativo
# ítem-a-ítem ("los compradores que compraron lo que tú compraste, también
# compraron...") calculado enteramente en SQL, sin depender de ningún
# servicio de IA externo — decisión tomada después de que Hugging Face
# (CU08) dejó de tener un tier gratuito confiable para nuestro caso de uso.
# Si el comprador no tiene historial suficiente para que el filtrado
# colaborativo arme nada (comprador nuevo), cae a un segundo bloque que
# completa con los productos más vendidos de la plataforma.
# =====================================================================

FUNCIONES_SQL = r"""
CREATE OR REPLACE FUNCTION fn_generar_recomendaciones(p_comprador_id BIGINT, p_limite INTEGER DEFAULT 10)
RETURNS INTEGER AS $$
DECLARE
    v_total INTEGER;
    v_faltan INTEGER;
BEGIN
    DELETE FROM reportes_recomendacionia WHERE comprador_id = p_comprador_id;

    -- Filtrado colaborativo: productos que compraron otros compradores que
    -- comparten al menos un producto con el historial de este comprador.
    WITH mis_productos AS (
        SELECT DISTINCT pi.producto_id
        FROM pedidos_pedidoitem pi
        JOIN pedidos_pedido p ON p.id = pi.pedido_id
        JOIN pedidos_ordencompra oc ON oc.id = p.orden_compra_id
        WHERE oc.comprador_id = p_comprador_id AND oc.estado_pago = 'PAGADO'
    ),
    compradores_afines AS (
        SELECT DISTINCT oc.comprador_id
        FROM pedidos_pedidoitem pi
        JOIN pedidos_pedido p ON p.id = pi.pedido_id
        JOIN pedidos_ordencompra oc ON oc.id = p.orden_compra_id
        WHERE pi.producto_id IN (SELECT producto_id FROM mis_productos)
          AND oc.comprador_id <> p_comprador_id
          AND oc.estado_pago = 'PAGADO'
    ),
    candidatos AS (
        SELECT pi.producto_id, COUNT(DISTINCT oc.comprador_id) AS coincidencias
        FROM pedidos_pedidoitem pi
        JOIN pedidos_pedido p ON p.id = pi.pedido_id
        JOIN pedidos_ordencompra oc ON oc.id = p.orden_compra_id
        WHERE oc.comprador_id IN (SELECT comprador_id FROM compradores_afines)
          AND oc.estado_pago = 'PAGADO'
          AND pi.producto_id NOT IN (SELECT producto_id FROM mis_productos)
        GROUP BY pi.producto_id
    )
    INSERT INTO reportes_recomendacionia (comprador_id, producto_id, score, fecha_generada)
    SELECT
        p_comprador_id,
        c.producto_id,
        LEAST(ROUND(c.coincidencias::numeric / GREATEST((SELECT COUNT(*) FROM compradores_afines), 1), 4), 0.9999),
        now()
    FROM candidatos c
    JOIN catalogo_producto prod ON prod.id = c.producto_id AND prod.activo = true AND prod.estado = 'ACTIVO'
    ORDER BY c.coincidencias DESC
    LIMIT p_limite;

    GET DIAGNOSTICS v_total = ROW_COUNT;
    v_faltan := p_limite - v_total;

    -- Respaldo por popularidad: completa el resto con los productos más
    -- vendidos que el comprador todavía no tenga (ni recomendados recién,
    -- ni ya comprados) — cubre al comprador nuevo sin historial.
    IF v_faltan > 0 THEN
        INSERT INTO reportes_recomendacionia (comprador_id, producto_id, score, fecha_generada)
        SELECT p_comprador_id, pi.producto_id, LEAST(ROUND(COUNT(*)::numeric / 50, 4), 0.4999), now()
        FROM pedidos_pedidoitem pi
        JOIN pedidos_pedido p ON p.id = pi.pedido_id
        JOIN pedidos_ordencompra oc ON oc.id = p.orden_compra_id
        JOIN catalogo_producto prod ON prod.id = pi.producto_id AND prod.activo = true AND prod.estado = 'ACTIVO'
        WHERE oc.estado_pago = 'PAGADO'
          AND pi.producto_id NOT IN (
              SELECT producto_id FROM reportes_recomendacionia WHERE comprador_id = p_comprador_id
              UNION
              SELECT pi2.producto_id
              FROM pedidos_pedidoitem pi2
              JOIN pedidos_pedido p2 ON p2.id = pi2.pedido_id
              JOIN pedidos_ordencompra oc2 ON oc2.id = p2.orden_compra_id
              WHERE oc2.comprador_id = p_comprador_id AND oc2.estado_pago = 'PAGADO'
          )
        GROUP BY pi.producto_id
        ORDER BY COUNT(*) DESC
        LIMIT v_faltan;
    END IF;

    SELECT COUNT(*) INTO v_total FROM reportes_recomendacionia WHERE comprador_id = p_comprador_id;
    RETURN v_total;
END;
$$ LANGUAGE plpgsql;
"""

DROP_FUNCIONES_SQL = r"""
DROP FUNCTION IF EXISTS fn_generar_recomendaciones(BIGINT, INTEGER);
"""


class Migration(migrations.Migration):

    dependencies = [
        ('reportes', '0003_valoracion_funciones_y_triggers'),
    ]

    operations = [
        migrations.RunSQL(sql=FUNCIONES_SQL, reverse_sql=DROP_FUNCIONES_SQL),
    ]
