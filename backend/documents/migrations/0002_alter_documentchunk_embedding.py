# Migration: replace JSONField with pgvector VectorField on DocumentChunk.embedding
#
# Why a hand-written migration instead of `makemigrations`:
#   Django's migration framework cannot auto-generate RunSQL operations.
#   Three steps are required in order:
#     1. Enable the pgvector PostgreSQL extension (idempotent — safe to re-run)
#     2. Swap the column type from jsonb → vector(1536)
#     3. Build the HNSW index on the new column
#   Steps 2 and 3 cannot be expressed as AlterField because pgvector's VectorField
#   requires the extension to exist first, and index creation must follow column creation.
#
# DATA WARNING:
#   The column is dropped and re-added, so any existing embeddings stored as JSON
#   will be lost (set to NULL). All documents with status='completed' must be
#   reprocessed after running this migration to regenerate their embeddings.

from django.db import migrations
from pgvector.django import VectorField


class Migration(migrations.Migration):

    dependencies = [
        ('documents', '0001_initial'),
    ]

    operations = [
        # Step 1: Enable the pgvector extension in PostgreSQL.
        # CREATE EXTENSION IF NOT EXISTS is idempotent — safe to run even if
        # the extension already exists. Must happen before any 'vector' column
        # is created, otherwise PostgreSQL does not recognise the type.
        migrations.RunSQL(
            sql="CREATE EXTENSION IF NOT EXISTS vector;",
            reverse_sql="DROP EXTENSION IF EXISTS vector;",
        ),

        # Step 2: Replace the jsonb column with a native vector(1536) column.
        # jsonb cannot be cast to vector automatically, so we drop and re-add.
        # dimensions=1536 matches OpenAI text-embedding-ada-002 exactly —
        # mismatched dimensions would cause insertion errors at runtime.
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

        # Step 3: Build an HNSW index for cosine distance on the new column.
        #
        # HNSW (Hierarchical Navigable Small World) is an approximate nearest-
        # neighbour graph structure. It answers top-k similarity queries in
        # O(log n) time rather than a full sequential scan of every row.
        # Benchmarks show >99% recall at ~40ms for millions of vectors, comfortably
        # inside the NFR target of <100ms vector search time.
        #
        # 'vector_cosine_ops' tells pgvector to index for cosine distance (<=>).
        # This must match the operator used in retrieve_relevant_chunks — if the
        # index and the query operator differ, PostgreSQL cannot use the index.
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
