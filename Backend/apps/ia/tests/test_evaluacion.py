import json
from io import StringIO

from django.core.management import CommandError, call_command
from django.test import TestCase

from apps.ia import evaluacion, recomendador

from . import fabricas as f


class EvaluacionOfflineTests(TestCase):
    """Escenario: quien compra Alfa luego compra Beta; Gamma es lo más vendido.
    El híbrido debe acertar Beta para los compradores de prueba y "más
    vendidos" no (les ofrece Gamma)."""

    def setUp(self):
        empresa = f.empresa()
        cat = f.categoria()
        self.alfa, self.beta, self.gamma = (f.producto(empresa, cat, nombre=n) for n in ('Alfa', 'Beta', 'Gamma'))
        for _ in range(6):
            u = f.comprador()
            f.venta(u, [self.alfa], dias_atras=20)
            f.venta(u, [self.beta], dias_atras=15)
        f.venta(f.comprador(), [self.gamma], dias_atras=10, cantidad=50)
        self.prueba = [f.comprador(), f.comprador()]
        for t in self.prueba:
            f.venta(t, [self.alfa], dias_atras=20)
        for t in self.prueba:
            f.venta(t, [self.beta], dias_atras=2)
        # 17 compras: con 10 % de prueba el corte cae en la primera compra de Beta de los de prueba.
        self.pct = 10

    def test_separacion_temporal(self):
        corte, prueba, antes = evaluacion.separar(self.pct)
        self.assertEqual(prueba, {t.id: {self.beta.id} for t in self.prueba})
        self.assertEqual(antes[self.prueba[0].id], {self.alfa.id})

    def test_no_ve_el_futuro(self):
        corte, _, _ = evaluacion.separar(self.pct)
        f.evento(self.prueba[0], self.gamma, 'CARRITO', dias_atras=1)  # después del corte
        modelo = recomendador.entrenar(ahora=corte, hasta=corte)
        fila = list(modelo.comprador_ids).index(self.prueba[0].id)
        columna = modelo.indice_producto()[self.gamma.id]
        self.assertEqual(modelo.R[fila, columna], 0)

    def test_hibrido_le_gana_a_mas_vendidos(self):
        resultado = evaluacion.evaluar(k=1, pct_prueba=self.pct)
        self.assertEqual(resultado['compradores_prueba'], 2)
        self.assertEqual(resultado['precision_maxima'], 1.0)
        self.assertEqual(resultado['variantes']['hibrido']['precision'], 1.0)
        self.assertEqual(resultado['variantes']['popular']['precision'], 0.0)
        for metricas in resultado['variantes'].values():
            for clave in ('precision', 'recall', 'hit_rate'):
                self.assertTrue(0 <= metricas[clave] <= 1)

    def test_comando(self):
        salida = StringIO()
        call_command('evaluar_recomendaciones', '--k', '1', '--pct-prueba', str(self.pct), '--json', stdout=salida)
        datos = json.loads(salida.getvalue())
        self.assertEqual(datos['variantes']['hibrido']['hit_rate'], 1.0)
        tabla = StringIO()
        call_command('evaluar_recomendaciones', stdout=tabla)
        self.assertIn('precision@10', tabla.getvalue())
        with self.assertRaises(CommandError):
            call_command('evaluar_recomendaciones', '--pct-prueba', '0', stdout=StringIO())


class EvaluacionSinDatosTests(TestCase):
    def test_pocas_compras(self):
        with self.assertRaises(CommandError):
            call_command('evaluar_recomendaciones', stdout=StringIO())
