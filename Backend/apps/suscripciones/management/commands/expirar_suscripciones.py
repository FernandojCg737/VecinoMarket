from django.core.management.base import BaseCommand
from django.db import connection


class Command(BaseCommand):
    help = 'Marca como VENCIDA toda suscripción activa cuya fecha de vencimiento ya pasó (CU01/CU20).'

    def handle(self, *args, **options):
        with connection.cursor() as cursor:
            cursor.execute('CALL sp_expirar_suscripciones_vencidas();')
        self.stdout.write(self.style.SUCCESS('Suscripciones vencidas actualizadas.'))
