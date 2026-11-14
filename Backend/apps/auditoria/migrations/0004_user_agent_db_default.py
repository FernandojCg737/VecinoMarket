from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [('auditoria', '0003_add_user_agent')]

    operations = [
        # Los triggers históricos pueden insertar sin un agente HTTP.
        migrations.AlterField(
            model_name='logauditoria',
            name='user_agent',
            field=models.TextField(blank=True, default='', db_default=''),
        ),
    ]
