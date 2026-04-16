import pgvector.django
from django.db import migrations


class Migration(migrations.Migration):
    """
    Migration 0002 used raw SQL to change the embedding column to vector(1536).
    This migration only updates Django's state to match — no DB changes needed.
    """

    dependencies = [
        ('documents', '0002_alter_documentchunk_embedding'),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            database_operations=[],   # column already correct — nothing to run
            state_operations=[
                migrations.AlterField(
                    model_name='documentchunk',
                    name='embedding',
                    field=pgvector.django.VectorField(
                        blank=True,
                        dimensions=1536,
                        help_text='1536-dimension vector embedding (OpenAI text-embedding-ada-002)',
                        null=True,
                    ),
                ),
            ],
        ),
    ]
