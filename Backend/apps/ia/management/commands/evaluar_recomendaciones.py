"""
CU1: evaluación offline precision@K del recomendador, dejando las últimas
compras como prueba (corte temporal). No escribe nada en la base de datos.

Uso:
    python manage.py evaluar_recomendaciones
    python manage.py evaluar_recomendaciones --k 10 --pct-prueba 20 --json
"""
import json

from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone

from apps.ia.evaluacion import evaluar


class Command(BaseCommand):
    help = 'CU1: precision@K / recall@K / hit@K del híbrido vs. colaborativo, contenido y más vendidos.'

    def add_arguments(self, parser):
        parser.add_argument('--k', type=int, default=10)
        parser.add_argument('--pct-prueba', type=float, default=20, help='% final de las compras (por fecha) usado como prueba.')
        parser.add_argument('--json', action='store_true', help='Salida en JSON (para guardar o comparar corridas).')

    def handle(self, *args, **opts):
        if not 0 < opts['pct_prueba'] < 100 or opts['k'] < 1:
            raise CommandError('--pct-prueba debe estar entre 0 y 100 y --k ser mayor que 0.')
        resultado = evaluar(k=opts['k'], pct_prueba=opts['pct_prueba'])
        if resultado is None:
            raise CommandError('No hay suficientes compras para evaluar (mínimo 10). Corre seed_interacciones en una base de demo.')

        if opts['json']:
            self.stdout.write(json.dumps({**resultado, 'corte': resultado['corte'].isoformat()}, ensure_ascii=False, indent=2))
            return

        k = resultado['k']
        self.stdout.write(
            f"Corte: {timezone.localtime(resultado['corte']):%Y-%m-%d %H:%M} · prueba = último {resultado['pct_prueba']:g}% de las compras\n"
            f"Compradores evaluados: {resultado['compradores_prueba']} · productos relevantes: {resultado['productos_relevantes']} · "
            f"catálogo candidato: {resultado['catalogo']}\n"
            f"precision@{k} máxima alcanzable con estos datos: {resultado['precision_maxima']:.4f}\n"
        )
        self.stdout.write(f"{'variante':14} {'precision@' + str(k):>13} {'recall@' + str(k):>10} {'hit@' + str(k):>8} {'en frío':>8}")
        for nombre, m in resultado['variantes'].items():
            self.stdout.write(f"{nombre:14} {m['precision']:13.4f} {m['recall']:10.4f} {m['hit_rate']:8.4f} {m['arranque_en_frio']:8d}")
        if resultado['catalogo'] <= 3 * k:
            self.stdout.write(self.style.WARNING(
                f'\nOjo: con un catálogo de {resultado["catalogo"]} productos, un top-{k} cubre buena parte del catálogo; '
                'las métricas salen infladas y sirven más para comparar variantes que como valor absoluto.'
            ))
