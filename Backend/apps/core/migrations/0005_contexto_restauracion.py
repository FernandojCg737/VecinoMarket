"""Evita efectos secundarios de triggers solo en la transacción de restore.

No se desactivan triggers internos de FK ni se necesita superusuario. Las
peticiones normales conservan sus triggers, también durante un restore.
"""
import re

from django.db import migrations

FUNCIONES = (
    'fn_auditoria_generica', 'fn_touch_actualizado_en',
    'fn_actualizar_estado_producto', 'fn_registrar_comision_pedido',
    'fn_registrar_cambio_rol', 'fn_crear_referido_por_empresa',
    'fn_generar_factura_comision', 'fn_unica_direccion_predeterminada',
    'fn_unico_metodo_predeterminado', 'fn_verificar_bloqueo_live',
)
GUARDA = """
    IF current_setting('vecinomarket.restoring', true) = 'on' THEN
        IF TG_OP = 'DELETE' THEN
            RETURN OLD;
        END IF;
        RETURN NEW;
    END IF;
"""


def actualizar_funciones(schema_editor, agregar):
    if schema_editor.connection.vendor != 'postgresql':
        return
    with schema_editor.connection.cursor() as cursor:
        for nombre in FUNCIONES:
            cursor.execute(
                "SELECT pg_get_functiondef(p.oid) FROM pg_proc p "
                "JOIN pg_namespace n ON n.oid=p.pronamespace "
                "WHERE n.nspname='public' AND p.proname=%s AND p.pronargs=0 "
                "AND p.prorettype='trigger'::regtype", [nombre],
            )
            fila = cursor.fetchone()
            if not fila:
                raise RuntimeError(f'No existe la función de negocio {nombre}.')
            definicion = fila[0]
            if agregar:
                if GUARDA in definicion:
                    continue
                definicion, reemplazos = re.subn(r'(?m)^BEGIN\s*$', lambda match: match[0] + GUARDA, definicion, count=1)
                if reemplazos != 1:
                    raise RuntimeError(f'No se pudo preparar la función {nombre}.')
            else:
                definicion = definicion.replace(GUARDA, '', 1)
            cursor.execute(definicion)


def preparar(apps, schema_editor):
    actualizar_funciones(schema_editor, True)


def revertir(apps, schema_editor):
    actualizar_funciones(schema_editor, False)


class Migration(migrations.Migration):
    dependencies = [
        ('core', '0004_configuracionsistema'),
        ('usuarios', '0005_direccion_funciones_y_triggers'),
        ('facturacion', '0006_referido_funciones_y_triggers'),
        ('promociones', '0004_live_funciones_y_triggers'),
    ]
    operations = [migrations.RunPython(preparar, revertir)]
