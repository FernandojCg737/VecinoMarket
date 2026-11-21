import django.db.models.deletion
import django.utils.timezone
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('catalogo', '0006_resumen_catalogo'),
        ('usuarios', '0010_usuario_correo_recuperacion'),
    ]

    operations = [
        migrations.CreateModel(
            name='EventoInteraccion',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('tipo', models.CharField(choices=[('VISTA', 'Vista de producto'), ('BUSQUEDA', 'Búsqueda'), ('CARRITO', 'Agregado al carrito'), ('COMPRA', 'Compra')], max_length=20)),
                ('termino_busqueda', models.CharField(blank=True, max_length=150)),
                ('resultados', models.PositiveIntegerField(blank=True, help_text='Solo BUSQUEDA: cuántos productos devolvió el catálogo.', null=True)),
                ('departamento', models.CharField(blank=True, help_text='Zona del comprador al momento del evento (CU3: demanda por zona).', max_length=60)),
                ('fecha', models.DateTimeField(default=django.utils.timezone.now)),
                ('comprador', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='eventos_interaccion', to='usuarios.comprador')),
                ('producto', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='eventos_interaccion', to='catalogo.producto')),
            ],
            options={
                'verbose_name': 'Evento de interacción',
                'verbose_name_plural': 'Eventos de interacción',
                'indexes': [
                    models.Index(fields=['comprador', 'fecha'], name='ia_evento_comprador_fecha_idx'),
                    models.Index(fields=['producto', 'fecha'], name='ia_evento_producto_fecha_idx'),
                    models.Index(fields=['tipo', 'fecha'], name='ia_evento_tipo_fecha_idx'),
                ],
            },
        ),
    ]
