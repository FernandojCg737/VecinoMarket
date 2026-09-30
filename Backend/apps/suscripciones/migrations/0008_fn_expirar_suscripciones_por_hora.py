from django.db import migrations

# CU01: fecha_vencimiento pasó de DATE a TIMESTAMPTZ (0007) para que las
# suscripciones autoservicio venzan a la hora exacta de adquisición, no a
# medianoche. fn_expirar_suscripciones comparaba contra CURRENT_DATE (medianoche
# de hoy) — con eso, una suscripción que vence hoy a las 10:00 seguía viendose
# "activa" hasta medianoche. Ahora compara contra NOW() para expirar en el
# instante exacto.

FUNCION_SQL = r"""
CREATE OR REPLACE FUNCTION fn_expirar_suscripciones() RETURNS INTEGER AS $$
DECLARE
    v_filas INTEGER;
BEGIN
    UPDATE suscripciones_suscripcion
    SET estado = 'VENCIDA', actualizado_en = now()
    WHERE estado = 'ACTIVA' AND fecha_vencimiento < now();

    GET DIAGNOSTICS v_filas = ROW_COUNT;
    RETURN v_filas;
END;
$$ LANGUAGE plpgsql;
"""

FUNCION_ANTERIOR_SQL = r"""
CREATE OR REPLACE FUNCTION fn_expirar_suscripciones() RETURNS INTEGER AS $$
DECLARE
    v_filas INTEGER;
BEGIN
    UPDATE suscripciones_suscripcion
    SET estado = 'VENCIDA', actualizado_en = now()
    WHERE estado = 'ACTIVA' AND fecha_vencimiento < CURRENT_DATE;

    GET DIAGNOSTICS v_filas = ROW_COUNT;
    RETURN v_filas;
END;
$$ LANGUAGE plpgsql;
"""


class Migration(migrations.Migration):

    dependencies = [
        ('suscripciones', '0007_alter_suscripcion_fecha_inicio_and_more'),
    ]

    operations = [
        migrations.RunSQL(sql=FUNCION_SQL, reverse_sql=FUNCION_ANTERIOR_SQL),
    ]
