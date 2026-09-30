"""Corrige la secuencia seq_numero_pedido para que el próximo
fn_generar_numero_pedido() (usado por el checkout real, ver
apps/pedidos/views.py::IniciarCheckoutView) no choque con un numero_pedido
que ya existe -- ver la migración apps/core/migrations/0001_funciones_y_triggers.py.

Hacía falta porque poblar_datos.py sembraba pedidos con numero_pedido fijo
(VM-100001, VM-100002, ...) sin pasar por la secuencia, así que esta nunca se
enteraba de que esos números ya estaban tomados. Tarde o temprano un pedido
real generado por el checkout terminaba pisando uno de los sembrados
(IntegrityError: duplicate key value violates unique constraint
"pedidos_pedido_numero_pedido_key").

Seguro de correr en producción: no toca ninguna fila, solo mueve el
contador interno de la secuencia hacia adelante si hace falta.
"""
from django.core.management.base import BaseCommand
from django.db import connection


class Command(BaseCommand):
    help = 'Sincroniza seq_numero_pedido para que no choque con numero_pedido ya existentes.'

    def handle(self, *args, **options):
        with connection.cursor() as cursor:
            cursor.execute("SELECT last_value FROM seq_numero_pedido")
            anterior = cursor.fetchone()[0]

            cursor.execute(
                "SELECT setval('seq_numero_pedido', "
                "GREATEST(100001, (SELECT COALESCE(MAX(SUBSTRING(numero_pedido FROM '[0-9]+$')::bigint), 100000) "
                "FROM pedidos_pedido) + 1), false)"
            )
            nuevo = cursor.fetchone()[0]

        self.stdout.write(self.style.SUCCESS(
            f'seq_numero_pedido: {anterior} -> {nuevo} (próximo numero_pedido: VM-{nuevo})'
        ))
