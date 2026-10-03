from datetime import datetime
from django.core.management.base import BaseCommand
from django.core.files.base import ContentFile
from apps.core.models import BackupLog
from apps.core.backup import generar_backup_json

class Command(BaseCommand):
    help = "Genera un backup automático y lo guarda en la nube (Cloudinary) a través del modelo BackupLog."

    def handle(self, *args, **options):
        self.stdout.write("Iniciando respaldo automático...")
        
        try:
            contenido = generar_backup_json()
            nombre = f'vecinomarket_backup_auto_{datetime.now():%Y%m%d_%H%M}.json'
            
            backup_log = BackupLog(tipo=BackupLog.TipoBackup.AUTOMATICO)
            backup_log.archivo.save(nombre, ContentFile(contenido.encode('utf-8')))
            
            self.stdout.write(self.style.SUCCESS(f"¡Backup automático generado exitosamente! ({nombre})"))
        except Exception as e:
            self.stderr.write(self.style.ERROR(f"Error generando el backup: {e}"))
