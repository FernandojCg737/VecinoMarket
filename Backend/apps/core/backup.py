"""Backup/Restore de todo el sistema — punto 6 de las características
generales del parcial. Usa los comandos dumpdata/loaddata que ya trae
Django (formato JSON estándar), sin reinventar nada: dumpdata para bajar
un respaldo completo, loaddata para restaurarlo.

Nota: loaddata hace upsert por PK (inserta o actualiza), no borra lo que
ya existe en la base antes de restaurar — para un "restore" que reemplace
todo habría que vaciar las tablas primero (flush), algo mucho más
delicado que se dejó fuera a propósito para no arriesgar borrar datos por
error en una demo.
"""
import os
import tempfile
from io import StringIO

from django.core import management

# Se excluyen las tablas que Django/DRF regeneran solas y que causan
# choques de PK si se restauran tal cual (sesiones, tokens, permisos de
# contenttypes) — no son "datos del negocio".
_APPS_EXCLUIR = [
    'contenttypes', 'auth.permission', 'admin.logentry',
    'sessions.session', 'token_blacklist',
]


def generar_backup_json():
    buffer = StringIO()
    management.call_command(
        'dumpdata',
        exclude=_APPS_EXCLUIR,
        natural_foreign=True,
        natural_primary=True,
        indent=2,
        stdout=buffer,
    )
    return buffer.getvalue()


def restaurar_backup_json(archivo_subido):
    """archivo_subido: un UploadedFile de Django (request.FILES['archivo'])."""
    tmp = tempfile.NamedTemporaryFile(suffix='.json', delete=False)
    try:
        for chunk in archivo_subido.chunks():
            tmp.write(chunk)
        tmp.close()
        management.call_command('loaddata', tmp.name)
    finally:
        os.unlink(tmp.name)
