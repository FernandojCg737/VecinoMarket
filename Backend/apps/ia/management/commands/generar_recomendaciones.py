"""
CU1 (RF44): precalcula el recomendador híbrido y reemplaza las tablas
ia_similitudproducto (top-K vecinos por producto) y reportes_recomendacionia
(top-N por comprador con historia).

Corre cada noche vía GitHub Actions (.github/workflows/
ia-recomendaciones-nocturnas.yml → POST /api/ia/tareas/generar-recomendaciones/);
este comando sirve para correrlo a mano o desde un cron propio.

Uso:
    python manage.py generar_recomendaciones
    python manage.py generar_recomendaciones --top-vecinos 50 --por-comprador 20
"""
from django.core.management.base import BaseCommand

from apps.ia import recomendador


class Command(BaseCommand):
    help = 'CU1: precalcula vecinos por producto y recomendaciones por comprador (híbrido 0.7 colaborativo / 0.3 contenido).'

    def add_arguments(self, parser):
        parser.add_argument('--top-vecinos', type=int, default=recomendador.TOP_VECINOS)
        parser.add_argument('--por-comprador', type=int, default=recomendador.POR_COMPRADOR)

    def handle(self, *args, **opts):
        r = recomendador.ejecutar(top_vecinos=opts['top_vecinos'], por_comprador=opts['por_comprador'])
        self.stdout.write(
            f'Matriz: {r["compradores"]} compradores × {r["productos"]} productos ({r["interacciones"]} celdas con interacción)'
        )
        self.stdout.write(f'Vecinos guardados: {r["vecinos"]} (top-{r["top_vecinos"]} por producto)')
        self.stdout.write(
            f'Recomendaciones: {r["recomendaciones"]} para {r["compradores_con_recomendaciones"]} compradores '
            '(el resto usa arranque en frío)'
        )
        self.stdout.write(self.style.SUCCESS(
            f'Listo en {r["segundos"]:.1f}s de entrenamiento · pico de memoria del cálculo: {r["pico_memoria_mb"]:.1f} MB'
        ))
