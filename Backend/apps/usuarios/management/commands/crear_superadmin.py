from django.core.management.base import BaseCommand

from apps.usuarios.models import Usuario


class Command(BaseCommand):
    help = 'Crea el superadministrador inicial de la plataforma (idempotente).'

    def add_arguments(self, parser):
        parser.add_argument('--email', default='admin@vecinomarket.com')
        parser.add_argument('--password', default='cambiar-en-produccion')
        parser.add_argument('--nombre', default='Superadmin')

    def handle(self, *args, **options):
        if Usuario.objects.filter(rol=Usuario.Rol.SUPERADMIN).exists():
            self.stdout.write(self.style.WARNING('Ya existe un superadministrador. No se creó otro.'))
            return

        Usuario.objects.create_superuser(
            email=options['email'],
            password=options['password'],
            nombre=options['nombre'],
        )
        self.stdout.write(self.style.SUCCESS(f"Superadmin creado: {options['email']}"))
