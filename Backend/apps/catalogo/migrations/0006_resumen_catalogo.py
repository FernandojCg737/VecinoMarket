from django.db import migrations

# =====================================================================
# CU05: función que resume el catálogo de una empresa (total de
# productos, activos y categorías distintas que usa) — la usa el
# panel del SuperAdmin para mostrar un vistazo rápido de cada empresa
# antes de entrar a ver el detalle de su catálogo.
# =====================================================================

FUNCIONES_SQL = r"""
CREATE OR REPLACE FUNCTION fn_resumen_catalogo_empresa(p_empresa_id BIGINT)
RETURNS TABLE (
    total_productos INTEGER,
    productos_activos INTEGER,
    categorias_distintas INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*)::INTEGER AS total_productos,
        COUNT(*) FILTER (WHERE p.estado = 'ACTIVO')::INTEGER AS productos_activos,
        COUNT(DISTINCT p.categoria_id)::INTEGER AS categorias_distintas
    FROM catalogo_producto p
    WHERE p.empresa_id = p_empresa_id AND p.activo = true;
END;
$$ LANGUAGE plpgsql STABLE;
"""

DROP_FUNCIONES_SQL = r"""
DROP FUNCTION IF EXISTS fn_resumen_catalogo_empresa(BIGINT);
"""


class Migration(migrations.Migration):

    dependencies = [
        ('catalogo', '0005_productoimagen_archivo_alter_productoimagen_url'),
    ]

    operations = [
        migrations.RunSQL(sql=FUNCIONES_SQL, reverse_sql=DROP_FUNCIONES_SQL),
    ]
