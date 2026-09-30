from django.db import migrations

# Solo trg_touch (no trg_auditoria): un chat en vivo genera muchísimas filas
# por sesión y son mensajes de usuarios, no acciones administrativas — igual
# que se decidió para notificaciones_notificacion, no tiene sentido llenar
# la bitácora con cada comentario.

TRIGGERS_SQL = r"""
CREATE TRIGGER trg_touch_comentariolive
BEFORE UPDATE ON promociones_comentariolive
FOR EACH ROW EXECUTE FUNCTION fn_touch_actualizado_en();
"""

DROP_TRIGGERS_SQL = r"""
DROP TRIGGER IF EXISTS trg_touch_comentariolive ON promociones_comentariolive;
"""


class Migration(migrations.Migration):

    dependencies = [
        ('promociones', '0005_comentariolive'),
    ]

    operations = [
        migrations.RunSQL(sql=TRIGGERS_SQL, reverse_sql=DROP_TRIGGERS_SQL),
    ]
