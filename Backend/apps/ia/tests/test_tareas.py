from io import StringIO

import psycopg2
from django.conf import settings
from django.core.management import call_command
from django.db import connection
from django.test import TestCase, override_settings
from django.urls import reverse
from rest_framework.test import APIClient

from apps.auditoria.models import LogAuditoria
from apps.ia.models import SimilitudProducto
from apps.ia.tareas import LOCK_GENERAR_RECOMENDACIONES
from apps.reportes.models import RecomendacionIA

from . import fabricas as f

CLAVE = 'clave-solo-para-tests'


class TareaNocturnaTests(TestCase):
    """POST /api/ia/tareas/generar-recomendaciones/ (GitHub Actions)."""

    url = reverse('ia-tarea-generar-recomendaciones')

    def setUp(self):
        empresa = f.empresa()
        cat = f.categoria('Panadería')
        self.pan, self.torta = f.producto(empresa, cat, nombre='Pan integral'), f.producto(empresa, cat, nombre='Torta de pan')
        self.comprador = f.comprador()
        for p in (self.pan, self.torta):
            f.evento(self.comprador, p)
        self.cliente = APIClient()

    def post(self, clave=None):
        cabeceras = {'HTTP_X_CRON_KEY': clave} if clave is not None else {}
        return self.cliente.post(self.url, **cabeceras)

    @override_settings(IA_CRON_KEY='')
    def test_sin_clave_configurada_nunca_queda_abierto(self):
        self.assertEqual(self.post('cualquier-cosa').status_code, 503)
        self.assertFalse(SimilitudProducto.objects.exists())

    @override_settings(IA_CRON_KEY=CLAVE)
    def test_clave_ausente_o_incorrecta(self):
        self.assertEqual(self.post().status_code, 403)
        self.assertEqual(self.post('otra-clave').status_code, 403)
        self.assertFalse(SimilitudProducto.objects.exists())

    @override_settings(IA_CRON_KEY=CLAVE)
    def test_clave_correcta_genera_y_deja_auditoria(self):
        res = self.post(CLAVE)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['productos'], 2)
        self.assertGreater(res.data['vecinos'], 0)
        self.assertTrue(SimilitudProducto.objects.filter(producto=self.pan, similar=self.torta).exists())
        self.assertTrue(RecomendacionIA.objects.filter(comprador=self.comprador).exists())
        log = LogAuditoria.objects.get(accion='IA_GENERAR_RECOMENDACIONES')
        self.assertEqual(log.detalle['vecinos'], res.data['vecinos'])
        # El JWT no interviene: un token basura no cambia nada.
        self.cliente.credentials(HTTP_AUTHORIZATION='Bearer basura')
        self.assertEqual(self.post(CLAVE).status_code, 200)

    @override_settings(IA_CRON_KEY=CLAVE)
    def test_no_corre_dos_veces_a_la_vez(self):
        db = settings.DATABASES['default']
        otra = psycopg2.connect(
            dbname=connection.settings_dict['NAME'], user=db['USER'], password=db['PASSWORD'],
            host=db['HOST'], port=db['PORT'],
        )
        try:
            with otra.cursor() as cur:
                cur.execute('SELECT pg_advisory_lock(%s)', [LOCK_GENERAR_RECOMENDACIONES])
            self.assertEqual(self.post(CLAVE).status_code, 409)
        finally:
            otra.close()  # libera el lock
        self.assertEqual(self.post(CLAVE).status_code, 200)

    def test_comando_usa_la_misma_corrida(self):
        salida = StringIO()
        call_command('generar_recomendaciones', stdout=salida)
        self.assertIn('Vecinos guardados', salida.getvalue())
        self.assertTrue(SimilitudProducto.objects.exists())
