"""Respaldo JSON de Django y restauración por lotes, sin vaciar la base.

Las imágenes/archivos se incluyen como referencias al almacenamiento, no
como contenido binario. La restauración conserva PK, hashes y fechas del
archivo; las filas ausentes en el respaldo permanecen en la base.
"""
import json
from collections import Counter
from io import StringIO

from django.apps import apps
from django.conf import settings
from django.core import management, serializers
from django.core.exceptions import ObjectDoesNotExist, ValidationError
from django.core.management.color import no_style
from django.db import connection, transaction
from django.db.models.constants import OnConflict
from django.db.models.sql.subqueries import InsertQuery

_APPS_EXCLUIR = [
    'contenttypes', 'auth.permission', 'admin.logentry',
    'sessions.session', 'token_blacklist',
]
_APPS_NEGOCIO = {
    'core', 'usuarios', 'catalogo', 'inventario', 'pedidos', 'comunicacion',
    'promociones', 'reportes', 'auditoria', 'notificaciones', 'suscripciones',
    'facturacion',
}
_FUNCIONES_RESTAURACION = (
    'fn_auditoria_generica', 'fn_touch_actualizado_en',
    'fn_actualizar_estado_producto', 'fn_registrar_comision_pedido',
    'fn_registrar_cambio_rol', 'fn_crear_referido_por_empresa',
    'fn_generar_factura_comision', 'fn_unica_direccion_predeterminada',
    'fn_unico_metodo_predeterminado', 'fn_verificar_bloqueo_live',
)
_TAMANO_LOTE = 250
_CERROJO_RESTAURACION = 867526483001


class ErrorRespaldo(ValueError):
    """Archivo inválido o incompatible con este sistema."""


class RestauracionEnCurso(ErrorRespaldo):
    """Otra petición ya está restaurando un respaldo."""


class RestauracionNoDisponible(ErrorRespaldo):
    """La base todavía no tiene las guardas de la migración de restauración."""


def generar_backup_json():
    buffer = StringIO()
    management.call_command(
        'dumpdata', exclude=_APPS_EXCLUIR, natural_foreign=True,
        natural_primary=True, indent=2, stdout=buffer,
    )
    return buffer.getvalue()


def _leer_backup(archivo):
    limite = getattr(settings, 'BACKUP_MAX_BYTES', 64 * 1024 * 1024)
    contenido = bytearray()
    for chunk in archivo.chunks():
        contenido.extend(chunk)
        if len(contenido) > limite:
            raise ErrorRespaldo(f'El respaldo supera el límite de {limite // (1024 * 1024)} MB.')
    try:
        registros = json.loads(contenido.decode('utf-8-sig'))
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise ErrorRespaldo('El archivo no contiene un respaldo JSON válido.') from exc
    if not isinstance(registros, list) or not registros:
        raise ErrorRespaldo('Se esperaba una lista de registros generada por Descargar backup.')

    identificadores = set()
    for numero, registro in enumerate(registros, 1):
        if not isinstance(registro, dict) or not isinstance(registro.get('model'), str):
            raise ErrorRespaldo(f'El registro {numero} no identifica un modelo válido.')
        etiqueta = registro['model']
        try:
            modelo = apps.get_model(etiqueta)
        except (LookupError, ValueError) as exc:
            raise ErrorRespaldo(f'El modelo del registro {numero} no existe en esta versión.') from exc
        if modelo._meta.app_label not in _APPS_NEGOCIO and etiqueta != 'auth.group':
            raise ErrorRespaldo(f'El modelo del registro {numero} no pertenece al respaldo del negocio.')
        campos = registro.get('fields')
        permitidos = {campo.name for campo in modelo._meta.fields + modelo._meta.many_to_many}
        if not isinstance(campos, dict) or set(campos) - permitidos or modelo._meta.pk.name in campos:
            raise ErrorRespaldo(f'Los campos del registro {numero} no corresponden al modelo.')
        pk = registro.get('pk')
        if pk is None:
            if not hasattr(modelo, 'natural_key') or not hasattr(modelo._default_manager, 'get_by_natural_key'):
                raise ErrorRespaldo(f'Falta el identificador del registro {numero}.')
        else:
            try:
                clave = (etiqueta, modelo._meta.pk.to_python(pk))
                if clave in identificadores:
                    raise ErrorRespaldo(f'El registro {numero} repite un identificador del respaldo.')
                identificadores.add(clave)
            except (TypeError, ValueError, ValidationError) as exc:
                if isinstance(exc, ErrorRespaldo):
                    raise
                raise ErrorRespaldo(f'El identificador del registro {numero} no es válido.') from exc
    return registros


def _normalizar_referencias(entrada, cache):
    """Resuelve una sola vez cada correo/grupo/permisos como clave natural.

    Un mismo usuario puede aparecer en miles de entradas de auditoría. El
    deserializador normal hace una consulta por cada aparición del correo.
    """
    modelo = apps.get_model(entrada['model'])
    campos = dict(entrada['fields'])

    def resolver(relacionado, valores, atributo):
        clave = (relacionado._meta.label_lower, tuple(valores), atributo)
        if clave not in cache:
            objeto = relacionado._default_manager.db_manager(connection.alias).get_by_natural_key(*valores)
            cache[clave] = getattr(objeto, atributo)
        return cache[clave]

    for nombre, valor in campos.items():
        campo = modelo._meta.get_field(nombre)
        if not campo.is_relation or valor is None:
            continue
        relacionado = campo.remote_field.model
        if not hasattr(relacionado._default_manager, 'get_by_natural_key'):
            continue
        if campo.many_to_many:
            campos[nombre] = [resolver(relacionado, item, relacionado._meta.pk.attname)
                              if isinstance(item, list) else item for item in valor]
        elif isinstance(valor, list):
            campos[nombre] = resolver(relacionado, valor, campo.target_field.attname)
    return {**entrada, 'fields': campos}


def _guardar_lote(modelo, deserializados):
    """INSERT ... ON CONFLICT por PK; raw=True conserva auto_now del JSON.

    InsertQuery es el compilador usado por bulk_create en Django 5.0 (la
    versión fijada en requirements). bulk_create normal ejecutaría pre_save
    y reemplazaría las fechas del respaldo por la hora de restauración.
    """
    for con_pk in (True, False):
        grupo = [registro for registro in deserializados if (registro.object.pk is not None) == con_pk]
        if not grupo:
            continue
        campos = list(modelo._meta.local_concrete_fields)
        if not con_pk:
            campos = [campo for campo in campos if campo != modelo._meta.pk]
        consulta = InsertQuery(
            modelo, on_conflict=OnConflict.UPDATE,
            update_fields=[campo for campo in campos if not campo.primary_key],
            unique_fields=[modelo._meta.pk],
        )
        consulta.insert_values(campos, [registro.object for registro in grupo], raw=True)
        filas = consulta.get_compiler(using=connection.alias).execute_sql([modelo._meta.pk])
        for registro, fila in zip(grupo, filas):
            registro.object.pk = fila[0]
            registro.object._state.adding = False
            registro.object._state.db = connection.alias

    # Las relaciones M2M automáticas no son columnas del INSERT. Sus claves
    # naturales ya fueron resueltas por el deserializador de Django.
    for registro in deserializados:
        for nombre, ids in (registro.m2m_data or {}).items():
            getattr(registro.object, nombre).set(ids)


def restaurar_backup_json(archivo_subido):
    """Carga atómica de datos del negocio; no usa flush ni desactiva FK."""
    registros = _leer_backup(archivo_subido)
    if connection.vendor != 'postgresql':
        raise RestauracionNoDisponible('La restauración del sistema requiere PostgreSQL.')
    cantidades = Counter()
    modelos = set()
    referencias = {}
    with transaction.atomic():
        with connection.cursor() as cursor:
            cursor.execute('SELECT pg_try_advisory_xact_lock(%s)', [_CERROJO_RESTAURACION])
            if not cursor.fetchone()[0]:
                raise RestauracionEnCurso('Ya hay una restauración en curso. Espera a que termine.')
            cursor.execute(
                "SELECT count(DISTINCT p.proname) FROM pg_proc p "
                "JOIN pg_namespace n ON n.oid=p.pronamespace "
                "WHERE n.nspname='public' AND p.proname=ANY(%s) "
                "AND p.prorettype='trigger'::regtype "
                "AND position('vecinomarket.restoring' in p.prosrc)>0",
                [list(_FUNCIONES_RESTAURACION)],
            )
            if cursor.fetchone()[0] != len(_FUNCIONES_RESTAURACION):
                raise RestauracionNoDisponible('La base requiere la migración de restauración antes de cargar respaldos.')
            cursor.execute("SELECT current_setting('vecinomarket.restoring', true), current_setting('lock_timeout')")
            contexto_previo, espera_previa = cursor.fetchone()
            cursor.execute("SELECT set_config('vecinomarket.restoring', 'on', true), set_config('lock_timeout', '5s', true)")
            # Solo se pausan las escrituras de las tablas afectadas; las
            # lecturas siguen funcionando. El orden fijo y el límite de 5 s
            # evitan esperar indefinidamente y protegen el reajuste de secuencias.
            tablas = set()
            for etiqueta in {registro['model'] for registro in registros}:
                meta = apps.get_model(etiqueta)._meta
                tablas.add(meta.db_table)
                tablas.update(campo.remote_field.through._meta.db_table for campo in meta.many_to_many
                              if campo.remote_field.through._meta.auto_created)
            nombres = ', '.join(connection.ops.quote_name(tabla) for tabla in sorted(tablas))
            cursor.execute(f'LOCK TABLE {nombres} IN SHARE ROW EXCLUSIVE MODE')
            cursor.execute('SET CONSTRAINTS ALL DEFERRED')

        lote = []
        modelo_actual = None
        for numero, entrada in enumerate(registros, 1):
            modelo = apps.get_model(entrada['model'])
            if lote and (modelo != modelo_actual or len(lote) == _TAMANO_LOTE):
                _guardar_lote(modelo_actual, lote)
                lote = []
            try:
                registro = next(serializers.deserialize('python', [_normalizar_referencias(entrada, referencias)]))
            except (serializers.base.DeserializationError, ObjectDoesNotExist, ValidationError, ValueError, TypeError) as exc:
                raise ErrorRespaldo(f'El registro {numero} contiene valores o referencias incompatibles.') from exc
            lote.append(registro)
            modelo_actual = modelo
            cantidades[entrada['model']] += 1
            modelos.add(modelo)
        if lote:
            _guardar_lote(modelo_actual, lote)

        with connection.cursor() as cursor:
            cursor.execute('SET CONSTRAINTS ALL IMMEDIATE')
            for consulta in connection.ops.sequence_reset_sql(no_style(), sorted(modelos, key=lambda m: m._meta.label_lower)):
                cursor.execute(consulta)
            cursor.execute(
                "SELECT set_config('vecinomarket.restoring', %s, true), set_config('lock_timeout', %s, true)",
                [contexto_previo or 'off', espera_previa],
            )
    return {'registros_restaurados': sum(cantidades.values()), 'modelos_restaurados': dict(cantidades)}
