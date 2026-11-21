"""
CU1 (RF44): precalcula el recomendador híbrido y reemplaza las tablas
ia_similitudproducto (top-K vecinos por producto) y reportes_recomendacionia
(top-N por comprador con historia). Pensado para correr de noche (Paso 8).

Uso:
    python manage.py generar_recomendaciones
    python manage.py generar_recomendaciones --top-vecinos 50 --por-comprador 20
"""
import tracemalloc

from django.core.management.base import BaseCommand

from apps.ia import recomendador


class Command(BaseCommand):
    help = 'CU1: precalcula vecinos por producto y recomendaciones por comprador (híbrido 0.7 colaborativo / 0.3 contenido).'

    def add_arguments(self, parser):
        parser.add_argument('--top-vecinos', type=int, default=recomendador.TOP_VECINOS)
        parser.add_argument('--por-comprador', type=int, default=recomendador.POR_COMPRADOR)

    def handle(self, *args, **opts):
        tracemalloc.start()  # numpy/scipy reportan sus buffers a tracemalloc
        modelo = recomendador.entrenar(top_vecinos=opts['top_vecinos'])
        recos = recomendador.recomendar(modelo, por_comprador=opts['por_comprador'])
        vecinos = recomendador.guardar(modelo, recos)
        _, pico = tracemalloc.get_traced_memory()
        tracemalloc.stop()

        n_compradores, n_productos = modelo.R.shape
        self.stdout.write(
            f'Matriz: {n_compradores} compradores × {n_productos} productos ({modelo.R.nnz} celdas con interacción)'
        )
        self.stdout.write(f'Vecinos guardados: {vecinos} (top-{opts["top_vecinos"]} por producto)')
        self.stdout.write(
            f'Recomendaciones: {sum(len(v) for v in recos.values())} para {len(recos)} compradores '
            '(el resto usa arranque en frío)'
        )
        self.stdout.write(self.style.SUCCESS(
            f'Listo en {modelo.segundos:.1f}s de entrenamiento · pico de memoria del cálculo: {pico / 1024 / 1024:.1f} MB'
        ))
