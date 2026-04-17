from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('chatbots', '0005_add_theme_colour'),
    ]

    operations = [
        migrations.AddField(
            model_name='chatbot',
            name='placeholder',
            field=models.CharField(default='Message...', max_length=100),
        ),
        migrations.AddField(
            model_name='chatbot',
            name='widget_align',
            field=models.CharField(
                choices=[('left', 'Left'), ('right', 'Right')],
                default='right',
                max_length=5,
            ),
        ),
    ]
