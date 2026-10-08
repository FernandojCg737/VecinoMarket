import importlib
import json
from datetime import datetime, timezone
from unittest import skipUnless
from unittest.mock import patch

import psycopg2
from django.core import serializers
from django.core.files.uploadedfile import SimpleUploadedFile
from django.db import IntegrityError, connection, transaction
from django.test import TransactionTestCase
from django.test.utils import CaptureQueriesContext
from rest_framework.test import APIRequestFactory, force_authenticate

from apps.auditoria.models import LogAuditoria
from apps.catalogo.models import Categoria
from apps.usuarios.models import Usuario
from apps.core.backup import (
    ErrorRespaldo, RestauracionEnCurso, RestauracionNoDisponible,
    _CERROJO_RESTAURACION, restaurar_backup_json,
)
from apps.core.views import RestoreView


@skipUnless(connection.vendor == 'postgresql', 'La restauración utiliza PostgreSQL.')
class RestauracionBackupTests(TransactionTestCase):
    def setUp(self):
        self.owner = Usuario.objects.create_user(
            email='admin@example.test', password='Password-only-for-tests',
            nombre='Administrador', rol=Usuario.Rol.SUPERADMIN,
        )

    def upload(self, records):
        return SimpleUploadedFile('backup.json', json.dumps(records).encode(), content_type='application/json')

    def record(self, obj):
        return json.loads(serializers.serialize('json', [obj], use_natural_foreign_keys=True))[0]

    def audit(self, pk, user=None):
        fecha = datetime(2024, 1, 2, 3, 4, 5, tzinfo=timezone.utc)
        return LogAuditoria(
            pk=pk, usuario=user or self.owner, accion='PRUEBA_BACKUP', detalle={'n': pk},
            creado_en=fecha, actualizado_en=fecha, activo=True, user_agent='backup-test',
        )

    def test_restores_large_audit_in_batches_and_caches_natural_keys(self):
        records = [self.record(self.audit(pk)) for pk in range(1000, 1501)]
        with CaptureQueriesContext(connection) as queries:
            result = restaurar_backup_json(self.upload(records))
        self.assertEqual(result['registros_restaurados'], 501)
        self.assertEqual(LogAuditoria.objects.count(), 501)
        self.assertEqual(self.record(LogAuditoria.objects.get(pk=1000)), records[0])
        inserts = [q for q in queries if q['sql'].startswith('INSERT INTO "auditoria_logauditoria"')]
        self.assertEqual(len(inserts), 3)
        user_reads = [q for q in queries if q['sql'].startswith('SELECT') and 'FROM "usuarios_usuario"' in q['sql']]
        self.assertLessEqual(len(user_reads), 1)

    def test_preserves_password_hash_and_keeps_rows_absent_from_backup(self):
        record = self.record(self.owner)
        extra = Usuario.objects.create_user('extra@example.test', 'Another-test-password', nombre='Extra', rol='COMPRADOR')
        original_hash = self.owner.password
        self.owner.nombre = 'Modificado'
        self.owner.set_password('Changed-only-in-test')
        self.owner.save()
        restaurar_backup_json(self.upload([record]))
        self.owner.refresh_from_db()
        self.assertEqual(self.owner.nombre, 'Administrador')
        self.assertEqual(self.owner.password, original_hash)
        self.assertTrue(Usuario.objects.filter(pk=extra.pk).exists())

    def test_business_triggers_do_not_generate_audit_during_restore(self):
        fecha = datetime(2024, 1, 2, tzinfo=timezone.utc)
        category = Categoria(pk=9000, nombre='Restaurada', creado_en=fecha, actualizado_en=fecha)
        record = self.record(category)
        restaurar_backup_json(self.upload([record]))
        self.assertEqual(LogAuditoria.objects.count(), 0)
        self.assertEqual(self.record(Categoria.objects.get(pk=9000)), record)
        restaurar_backup_json(self.upload([record]))
        self.assertEqual(LogAuditoria.objects.count(), 0)

    def test_invalid_foreign_key_rolls_back_prior_batches(self):
        user_record = self.record(self.owner)
        user_record['fields']['nombre'] = 'No debe persistir'
        log = self.record(self.audit(9000))
        log['fields']['usuario'] = 999999
        with self.assertRaises(IntegrityError):
            restaurar_backup_json(self.upload([user_record, log]))
        self.owner.refresh_from_db()
        self.assertEqual(self.owner.nombre, 'Administrador')
        self.assertFalse(LogAuditoria.objects.exists())

    def test_resets_sequences_after_explicit_ids(self):
        restaurar_backup_json(self.upload([self.record(self.audit(9000))]))
        log = LogAuditoria.objects.create(usuario=self.owner, accion='POST_RESTORE')
        self.assertGreater(log.pk, 9000)

    def test_resolves_groups_without_pk_and_m2m_natural_references(self):
        user = self.record(self.owner)
        user['fields']['groups'] = [['Recovered group']]
        group = {'model': 'auth.group', 'fields': {'name': 'Recovered group', 'permissions': []}}
        restaurar_backup_json(self.upload([group, user]))
        self.assertEqual(list(self.owner.groups.values_list('name', flat=True)), ['Recovered group'])

    def test_rejects_malformed_files_duplicate_ids_and_invalid_pk(self):
        record = self.record(self.audit(9000))
        bad_pk = {**record, 'pk': 'invalid-id'}
        for records in ({'wrong': 'format'}, [], [record, record], [bad_pk]):
            with self.subTest(records_type=type(records).__name__), self.assertRaises(ErrorRespaldo):
                restaurar_backup_json(self.upload(records))
        with self.assertRaises(ErrorRespaldo):
            restaurar_backup_json(SimpleUploadedFile('bad.json', b'{broken'))
        self.assertFalse(LogAuditoria.objects.exists())

    def test_prevents_simultaneous_restores(self):
        other = psycopg2.connect(**connection.get_connection_params())
        try:
            with other.cursor() as cursor:
                cursor.execute('SELECT pg_advisory_xact_lock(%s)', [_CERROJO_RESTAURACION])
            with self.assertRaises(RestauracionEnCurso):
                restaurar_backup_json(self.upload([self.record(self.audit(9000))]))
        finally:
            other.rollback()
            other.close()
        self.assertFalse(LogAuditoria.objects.exists())

    def test_trigger_context_is_transaction_local_and_normal_touch_still_works(self):
        with connection.cursor() as cursor:
            cursor.execute('CREATE TEMP TABLE backup_touch_probe (id integer, actualizado_en timestamptz)')
            cursor.execute('CREATE TRIGGER touch_probe BEFORE UPDATE ON backup_touch_probe FOR EACH ROW EXECUTE FUNCTION fn_touch_actualizado_en()')
            cursor.execute("INSERT INTO backup_touch_probe VALUES (1, '2020-01-01')")
        other = psycopg2.connect(**connection.get_connection_params())
        try:
            with transaction.atomic(), connection.cursor() as cursor:
                cursor.execute("SELECT set_config('vecinomarket.restoring', 'on', true)")
                cursor.execute("UPDATE backup_touch_probe SET actualizado_en='2021-01-01' RETURNING actualizado_en")
                self.assertEqual(cursor.fetchone()[0].year, 2021)
                with other.cursor() as other_cursor:
                    other_cursor.execute("SELECT current_setting('vecinomarket.restoring', true)")
                    self.assertNotEqual(other_cursor.fetchone()[0], 'on')
            with connection.cursor() as cursor:
                cursor.execute("UPDATE backup_touch_probe SET actualizado_en='2021-01-01' RETURNING actualizado_en")
                self.assertGreater(cursor.fetchone()[0].year, 2021)
        finally:
            other.close()
            with connection.cursor() as cursor:
                cursor.execute('DROP TABLE backup_touch_probe')

    def test_guard_migration_is_reversible_and_restore_requires_it(self):
        migration = importlib.import_module('apps.core.migrations.0005_contexto_restauracion')
        try:
            with connection.schema_editor() as editor:
                migration.revertir(None, editor)
            with self.assertRaises(RestauracionNoDisponible):
                restaurar_backup_json(self.upload([self.record(self.audit(9000))]))
        finally:
            with connection.schema_editor() as editor:
                migration.preparar(None, editor)
        with connection.schema_editor() as editor:
            migration.preparar(None, editor)
        self.assertEqual(restaurar_backup_json(self.upload([self.record(self.audit(9000))]))['registros_restaurados'], 1)

    def test_api_reports_success_and_logs_once(self):
        request = APIRequestFactory().post('/api/core/restore/', {'archivo': self.upload([self.record(self.audit(9000))])})
        force_authenticate(request, user=self.owner)
        response = RestoreView.as_view()(request)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['registros_restaurados'], 1)
        self.assertEqual(LogAuditoria.objects.filter(accion='RESTORE_SISTEMA').count(), 1)

    def test_api_rejects_non_superadmin(self):
        self.owner.rol = Usuario.Rol.COMPRADOR
        request = APIRequestFactory().post('/api/core/restore/', {'archivo': self.upload([self.record(self.audit(9000))])})
        force_authenticate(request, user=self.owner)
        self.assertEqual(RestoreView.as_view()(request).status_code, 403)
        self.assertFalse(LogAuditoria.objects.exists())

    def test_api_invalid_json_is_reported_without_writes(self):
        request = APIRequestFactory().post('/api/core/restore/', {'archivo': SimpleUploadedFile('bad.json', b'{broken')})
        force_authenticate(request, user=self.owner)
        response = RestoreView.as_view()(request)
        self.assertEqual(response.status_code, 400)
        self.assertIn('JSON válido', response.data['detail'])
        self.assertFalse(LogAuditoria.objects.exists())

    def test_api_audit_failure_rolls_back_restored_data(self):
        user = self.record(self.owner)
        user['fields']['nombre'] = 'No debe persistir'
        request = APIRequestFactory().post('/api/core/restore/', {'archivo': self.upload([user])})
        force_authenticate(request, user=self.owner)
        with patch('apps.core.views.LogAuditoria.objects.create', side_effect=IntegrityError('test audit failure')):
            response = RestoreView.as_view()(request)
        self.assertEqual(response.status_code, 400)
        self.owner.refresh_from_db()
        self.assertEqual(self.owner.nombre, 'Administrador')
