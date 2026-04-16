from django.db import migrations
from pgvector.django import VectorField


class Migration(migrations.Migration):

    dependencies = [
        ('documents', '0001_initial'),
    ]

    operations = [
        # : Enable the pgvector extension in PostgreSQL.
        migrations.RunSQL(
            sql="CREATE EXTENSION IF NOT EXISTS vector;",
            reverse_sql="DROP EXTENSION IF EXISTS vector;",
        ),

        #Replace the jsonb column with a native vector(1536) column.
        migrations.RunSQL(
            sql="""
                ALTER TABLE document_chunks DROP COLUMN embedding;
                ALTER TABLE document_chunks ADD COLUMN embedding vector(1536);
            """,
            reverse_sql="""
                ALTER TABLE document_chunks DROP COLUMN embedding;
                ALTER TABLE document_chunks ADD COLUMN embedding jsonb;
            """,
        ),

        #  Build an HNSW index for cosine distance on the new column.

        migrations.RunSQL(
            sql="""
                CREATE INDEX IF NOT EXISTS document_chunks_embedding_hnsw_idx
                ON document_chunks
                USING hnsw (embedding vector_cosine_ops);
            """,
            reverse_sql="""
                DROP INDEX IF EXISTS document_chunks_embedding_hnsw_idx;
            """,
        ),
    ]
