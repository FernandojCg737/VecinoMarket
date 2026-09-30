from django.db import migrations

# =====================================================================
# CU15: fn_responder_chatbot hace el emparejamiento por palabras clave
# dentro de la base de datos (no en Python) — separa palabras_clave por
# coma, busca cuáles aparecen dentro de la pregunta, y devuelve la
# respuesta de la FAQ con más coincidencias. Si ninguna FAQ matchea,
# devuelve NULL y la vista responde con un mensaje por defecto.
# =====================================================================

FUNCIONES_SQL = r"""
CREATE OR REPLACE FUNCTION fn_responder_chatbot(p_empresa_id BIGINT, p_pregunta TEXT)
RETURNS TEXT AS $$
DECLARE
    v_respuesta TEXT;
BEGIN
    SELECT f.respuesta INTO v_respuesta
    FROM comunicacion_chatbotfaq f
    WHERE f.empresa_id = p_empresa_id
      AND f.activo = true
      AND EXISTS (
          SELECT 1
          FROM unnest(string_to_array(lower(f.palabras_clave), ',')) AS palabra
          WHERE length(trim(palabra)) > 0 AND lower(p_pregunta) LIKE '%' || trim(palabra) || '%'
      )
    ORDER BY (
        SELECT COUNT(*)
        FROM unnest(string_to_array(lower(f.palabras_clave), ',')) AS palabra
        WHERE length(trim(palabra)) > 0 AND lower(p_pregunta) LIKE '%' || trim(palabra) || '%'
    ) DESC
    LIMIT 1;

    RETURN v_respuesta;
END;
$$ LANGUAGE plpgsql STABLE;
"""

TRIGGERS_SQL = r"""
CREATE TRIGGER trg_auditoria_chatbotfaq
AFTER INSERT OR UPDATE OR DELETE ON comunicacion_chatbotfaq
FOR EACH ROW EXECUTE FUNCTION fn_auditoria_generica();

CREATE TRIGGER trg_touch_chatbotfaq
BEFORE UPDATE ON comunicacion_chatbotfaq
FOR EACH ROW EXECUTE FUNCTION fn_touch_actualizado_en();
"""

DROP_TRIGGERS_SQL = r"""
DROP TRIGGER IF EXISTS trg_touch_chatbotfaq ON comunicacion_chatbotfaq;
DROP TRIGGER IF EXISTS trg_auditoria_chatbotfaq ON comunicacion_chatbotfaq;
"""

DROP_FUNCIONES_SQL = r"""
DROP FUNCTION IF EXISTS fn_responder_chatbot(BIGINT, TEXT);
"""


class Migration(migrations.Migration):

    dependencies = [
        ('comunicacion', '0005_chatbotinteraccion_empresa_chatbotfaq'),
        ('core', '0001_funciones_y_triggers'),
    ]

    operations = [
        migrations.RunSQL(sql=FUNCIONES_SQL, reverse_sql=DROP_FUNCIONES_SQL),
        migrations.RunSQL(sql=TRIGGERS_SQL, reverse_sql=DROP_TRIGGERS_SQL),
    ]
