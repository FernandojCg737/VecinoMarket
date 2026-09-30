from django.db import migrations

# =====================================================================
# CU18/CU19: fn_ventas_por_dia arma la serie de tiempo que usan ambos
# dashboards (el de la empresa y el del SuperAdmin) — con p_empresa_id
# NULL agrega toda la plataforma, con un id la limita a esa empresa. Se
# comparte una sola función en vez de duplicar la consulta en cada vista.
# =====================================================================

FUNCIONES_SQL = r"""
CREATE OR REPLACE FUNCTION fn_ventas_por_dia(p_empresa_id BIGINT, p_dias INTEGER DEFAULT 14)
RETURNS TABLE (dia DATE, total_ventas NUMERIC, total_pedidos INTEGER) AS $$
BEGIN
    RETURN QUERY
    WITH serie AS (
        SELECT generate_series(CURRENT_DATE - (p_dias - 1), CURRENT_DATE, '1 day')::date AS dia
    )
    SELECT
        s.dia,
        COALESCE(SUM(p.subtotal) FILTER (WHERE p.id IS NOT NULL), 0)::NUMERIC AS total_ventas,
        COUNT(p.id) FILTER (WHERE p.id IS NOT NULL)::INTEGER AS total_pedidos
    FROM serie s
    LEFT JOIN pedidos_pedido p
        ON p.creado_en::date = s.dia
        AND (p_empresa_id IS NULL OR p.empresa_id = p_empresa_id)
        AND p.id IN (SELECT pe.id FROM pedidos_pedido pe JOIN pedidos_ordencompra oc ON oc.id = pe.orden_compra_id WHERE oc.estado_pago = 'PAGADO')
    GROUP BY s.dia
    ORDER BY s.dia;
END;
$$ LANGUAGE plpgsql STABLE;
"""

DROP_FUNCIONES_SQL = r"""
DROP FUNCTION IF EXISTS fn_ventas_por_dia(BIGINT, INTEGER);
"""


class Migration(migrations.Migration):

    dependencies = [
        ('reportes', '0004_recomendaciones_funciones_y_triggers'),
    ]

    operations = [
        migrations.RunSQL(sql=FUNCIONES_SQL, reverse_sql=DROP_FUNCIONES_SQL),
    ]
