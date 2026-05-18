"""Phase 5 AI: pgvector + knowledge sources/chunks + chatbot + sentiment.

Revision ID: 009_phase5_ai_rag
Revises: 008_phase4_kb
Create Date: 2026-05-18
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "009_phase5_ai_rag"
down_revision = "008_phase4_kb"
branch_labels = None
depends_on = None

EMBED_DIM = 1536


def upgrade() -> None:
    vector_enabled = True
    op.execute(
        """
        DO $$
        BEGIN
          CREATE EXTENSION IF NOT EXISTS vector;
        EXCEPTION WHEN OTHERS THEN
          RAISE NOTICE 'pgvector extension unavailable; falling back to JSONB embeddings';
        END $$;
        """
    )
    bind = op.get_bind()
    vector_enabled = bool(bind.execute(sa.text("SELECT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector')")).scalar())

    op.create_table(
        "knowledge_sources",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("source_type", sa.String(length=20), nullable=False),
        sa.Column("url", sa.Text(), nullable=True),
        sa.Column("content", sa.Text(), nullable=True),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="pending"),
        sa.Column("chunk_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("error", sa.Text(), nullable=True),
        sa.Column("meta", postgresql.JSONB(), nullable=False, server_default="{}"),
        sa.Column("last_ingested_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )
    op.create_index("ix_knowledge_sources_org", "knowledge_sources", ["organization_id"])

    op.create_table(
        "knowledge_chunks",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False),
        sa.Column("source_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("knowledge_sources.id", ondelete="CASCADE"), nullable=True),
        sa.Column("kb_article_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("kb_articles.id", ondelete="CASCADE"), nullable=True),
        sa.Column("position", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("token_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("meta", postgresql.JSONB(), nullable=False, server_default="{}"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )
    if vector_enabled:
        op.execute(f"ALTER TABLE knowledge_chunks ADD COLUMN embedding vector({EMBED_DIM})")
    else:
        op.add_column("knowledge_chunks", sa.Column("embedding", postgresql.JSONB(), nullable=True, server_default="[]"))
    op.create_index("ix_knowledge_chunks_org", "knowledge_chunks", ["organization_id"])
    op.create_index("ix_knowledge_chunks_source", "knowledge_chunks", ["source_id"])
    op.create_index("ix_knowledge_chunks_article", "knowledge_chunks", ["kb_article_id"])
    if vector_enabled:
        op.execute(
            "CREATE INDEX ix_knowledge_chunks_embedding ON knowledge_chunks "
            "USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100)"
        )

    # Message sentiment
    op.add_column("messages", sa.Column("sentiment", sa.String(length=20), nullable=True))
    op.add_column("messages", sa.Column("sentiment_score", sa.Float(), nullable=True))

    # Chat AI fields
    op.add_column("chats", sa.Column("ai_summary", sa.Text(), nullable=True))
    op.add_column("chats", sa.Column("ai_tags", postgresql.JSONB(), nullable=False, server_default="[]"))
    op.add_column("chats", sa.Column("ai_sentiment", sa.String(length=20), nullable=True))
    op.add_column("chats", sa.Column("ai_qa_score", sa.Float(), nullable=True))
    op.add_column("chats", sa.Column("ai_qa_notes", sa.Text(), nullable=True))

    # Ticket AI category
    op.add_column("tickets", sa.Column("ai_category", sa.String(length=80), nullable=True))

    # User skills + max load (routing)
    op.add_column("users", sa.Column("skills", postgresql.JSONB(), nullable=False, server_default="[]"))
    op.add_column("users", sa.Column("max_concurrent_chats", sa.Integer(), nullable=False, server_default="5"))
    op.add_column("users", sa.Column("is_vip_handler", sa.Boolean(), nullable=False, server_default=sa.false()))
    # Contacts: vip flag
    op.add_column("contacts", sa.Column("is_vip", sa.Boolean(), nullable=False, server_default=sa.false()))

    # Chatbot flow
    op.create_table(
        "chatbot_flows",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False),
        sa.Column("widget_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("chat_widgets.id", ondelete="SET NULL"), nullable=True),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="draft"),
        sa.Column("trigger", postgresql.JSONB(), nullable=False, server_default="{}"),
        sa.Column("nodes", postgresql.JSONB(), nullable=False, server_default="[]"),
        sa.Column("edges", postgresql.JSONB(), nullable=False, server_default="[]"),
        sa.Column("variables", postgresql.JSONB(), nullable=False, server_default="{}"),
        sa.Column("ab_variant_of", postgresql.UUID(as_uuid=True), sa.ForeignKey("chatbot_flows.id", ondelete="SET NULL"), nullable=True),
        sa.Column("ab_weight", sa.Integer(), nullable=False, server_default="50"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )
    op.create_index("ix_chatbot_flows_org", "chatbot_flows", ["organization_id"])

    op.create_table(
        "chatbot_sessions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False),
        sa.Column("flow_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("chatbot_flows.id", ondelete="CASCADE"), nullable=False),
        sa.Column("chat_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("chats.id", ondelete="CASCADE"), nullable=False),
        sa.Column("current_node", sa.String(length=80), nullable=True),
        sa.Column("state", postgresql.JSONB(), nullable=False, server_default="{}"),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="active"),
        sa.Column("completed", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("handed_off", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )
    op.create_index("ix_chatbot_sessions_org", "chatbot_sessions", ["organization_id"])
    op.create_index("ix_chatbot_sessions_chat", "chatbot_sessions", ["chat_id"])


def downgrade() -> None:
    op.drop_index("ix_chatbot_sessions_chat", table_name="chatbot_sessions")
    op.drop_index("ix_chatbot_sessions_org", table_name="chatbot_sessions")
    op.drop_table("chatbot_sessions")
    op.drop_index("ix_chatbot_flows_org", table_name="chatbot_flows")
    op.drop_table("chatbot_flows")
    op.drop_column("contacts", "is_vip")
    op.drop_column("users", "is_vip_handler")
    op.drop_column("users", "max_concurrent_chats")
    op.drop_column("users", "skills")
    op.drop_column("tickets", "ai_category")
    op.drop_column("chats", "ai_qa_notes")
    op.drop_column("chats", "ai_qa_score")
    op.drop_column("chats", "ai_sentiment")
    op.drop_column("chats", "ai_tags")
    op.drop_column("chats", "ai_summary")
    op.drop_column("messages", "sentiment_score")
    op.drop_column("messages", "sentiment")
    op.execute("DROP INDEX IF EXISTS ix_knowledge_chunks_embedding")
    op.drop_index("ix_knowledge_chunks_article", table_name="knowledge_chunks")
    op.drop_index("ix_knowledge_chunks_source", table_name="knowledge_chunks")
    op.drop_index("ix_knowledge_chunks_org", table_name="knowledge_chunks")
    op.drop_table("knowledge_chunks")
    op.drop_index("ix_knowledge_sources_org", table_name="knowledge_sources")
    op.drop_table("knowledge_sources")
