from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0003_email_change_otp_fields'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='anthropic_api_key',
            field=models.CharField(blank=True, max_length=500, null=True),
        ),
        migrations.AddField(
            model_name='user',
            name='google_api_key',
            field=models.CharField(blank=True, max_length=500, null=True),
        ),
        migrations.AddField(
            model_name='user',
            name='xai_api_key',
            field=models.CharField(blank=True, max_length=500, null=True),
        ),
    ]
