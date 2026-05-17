"""Phase 4 knowledge base tables.

Revision ID: 008_phase4_kb
Revises: 007_phase2_chat_depth
Create Date: 2026-05-18
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "008_phase4_kb"
down_revision = "007_phase2_chat_depth"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm")

    op.create_table(
        "kb_categories",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False),
        sa.Column("parent_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("kb_categories.id", ondelete="SET NULL"), nullable=True),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("slug", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("icon", sa.String(length=80), nullable=True),
        sa.Column("position", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.UniqueConstraint("organization_id", "slug", name="uq_kb_category_org_slug"),
    )
    op.create_index("ix_kb_categories_organization_id", "kb_categories", ["organization_id"])

    op.create_table(
        "kb_articles",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False),
        sa.Column("category_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("kb_categories.id", ondelete="SET NULL"), nullable=True),
        sa.Column("author_user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("translation_group_id", postgresql.UUID(as_uuid=True), nullable=False, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("title", sa.String(length=500), nullable=False),
        sa.Column("slug", sa.String(length=255), nullable=False),
        sa.Column("summary", sa.Text(), nullable=True),
        sa.Column("body", sa.Text(), nullable=False, server_default=""),
        sa.Column("body_format", sa.String(length=20), nullable=False, server_default="markdown"),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="draft"),
        sa.Column("locale", sa.String(length=10), nullable=False, server_default="en"),
        sa.Column("featured", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("internal_only", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("seo_title", sa.String(length=255), nullable=True),
        sa.Column("seo_description", sa.Text(), nullable=True),
        sa.Column("og_image", sa.String(length=500), nullable=True),
        sa.Column("tags", postgresql.ARRAY(sa.Text()), nullable=False, server_default=sa.text("ARRAY[]::text[]")),
        sa.Column("related_article_ids", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{\"items\": []}'::jsonb")),
        sa.Column("scheduled_publish_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("archived_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("view_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("helpful_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("not_helpful_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.UniqueConstraint("organization_id", "slug", "locale", name="uq_kb_article_org_slug_locale"),
    )
    op.create_index("ix_kb_articles_organization_id", "kb_articles", ["organization_id"])
    op.create_index("ix_kb_articles_category_id", "kb_articles", ["category_id"])
    op.create_index("ix_kb_articles_status", "kb_articles", ["status"])
    op.create_index("ix_kb_articles_locale", "kb_articles", ["locale"])
    op.create_index("ix_kb_articles_featured", "kb_articles", ["featured"])
    op.create_index("ix_kb_articles_internal_only", "kb_articles", ["internal_only"])
    op.create_index("ix_kb_articles_scheduled_publish_at", "kb_articles", ["scheduled_publish_at"])
    op.create_index("ix_kb_articles_translation_group_id", "kb_articles", ["translation_group_id"])
    op.execute(
        "CREATE INDEX ix_kb_articles_title_trgm ON kb_articles USING gin (title gin_trgm_ops)"
    )
    op.execute(
        "CREATE INDEX ix_kb_articles_body_trgm ON kb_articles USING gin (body gin_trgm_ops)"
    )

    op.create_table(
        "kb_article_revisions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("article_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("kb_articles.id", ondelete="CASCADE"), nullable=False),
        sa.Column("revision_number", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(length=500), nullable=False),
        sa.Column("body", sa.Text(), nullable=False, server_default=""),
        sa.Column("summary", sa.Text(), nullable=True),
        sa.Column("change_summary", sa.Text(), nullable=True),
        sa.Column("author_user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )
    op.create_index("ix_kb_article_revisions_article_id", "kb_article_revisions", ["article_id"])

    op.create_table(
        "kb_article_feedback",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("article_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("kb_articles.id", ondelete="CASCADE"), nullable=False),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False),
        sa.Column("helpful", sa.Boolean(), nullable=False),
        sa.Column("comment", sa.Text(), nullable=True),
        sa.Column("contact_email", sa.String(length=255), nullable=True),
        sa.Column("visitor_session_id", sa.String(length=120), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )
    op.create_index("ix_kb_article_feedback_article_id", "kb_article_feedback", ["article_id"])
    op.create_index("ix_kb_article_feedback_organization_id", "kb_article_feedback", ["organization_id"])

    op.create_table(
        "kb_article_views",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("article_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("kb_articles.id", ondelete="CASCADE"), nullable=False),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False),
        sa.Column("source", sa.String(length=30), nullable=False, server_default="public"),
        sa.Column("visitor_session_id", sa.String(length=120), nullable=True),
        sa.Column("referrer", sa.String(length=500), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )
    op.create_index("ix_kb_article_views_article_id", "kb_article_views", ["article_id"])
    op.create_index("ix_kb_article_views_organization_id", "kb_article_views", ["organization_id"])
    op.create_index("ix_kb_article_views_created_at", "kb_article_views", ["created_at"])

    op.create_table(
        "kb_article_comments",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("article_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("kb_articles.id", ondelete="CASCADE"), nullable=False),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False),
        sa.Column("author_user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )
    op.create_index("ix_kb_article_comments_article_id", "kb_article_comments", ["article_id"])


def downgrade() -> None:
    op.drop_index("ix_kb_article_comments_article_id", table_name="kb_article_comments")
    op.drop_table("kb_article_comments")

    op.drop_index("ix_kb_article_views_created_at", table_name="kb_article_views")
    op.drop_index("ix_kb_article_views_organization_id", table_name="kb_article_views")
    op.drop_index("ix_kb_article_views_article_id", table_name="kb_article_views")
    op.drop_table("kb_article_views")

    op.drop_index("ix_kb_article_feedback_organization_id", table_name="kb_article_feedback")
    op.drop_index("ix_kb_article_feedback_article_id", table_name="kb_article_feedback")
    op.drop_table("kb_article_feedback")

    op.drop_index("ix_kb_article_revisions_article_id", table_name="kb_article_revisions")
    op.drop_table("kb_article_revisions")

    op.execute("DROP INDEX IF EXISTS ix_kb_articles_body_trgm")
    op.execute("DROP INDEX IF EXISTS ix_kb_articles_title_trgm")
    op.drop_index("ix_kb_articles_translation_group_id", table_name="kb_articles")
    op.drop_index("ix_kb_articles_scheduled_publish_at", table_name="kb_articles")
    op.drop_index("ix_kb_articles_internal_only", table_name="kb_articles")
    op.drop_index("ix_kb_articles_featured", table_name="kb_articles")
    op.drop_index("ix_kb_articles_locale", table_name="kb_articles")
    op.drop_index("ix_kb_articles_status", table_name="kb_articles")
    op.drop_index("ix_kb_articles_category_id", table_name="kb_articles")
    op.drop_index("ix_kb_articles_organization_id", table_name="kb_articles")
    op.drop_table("kb_articles")

    op.drop_index("ix_kb_categories_organization_id", table_name="kb_categories")
    op.drop_table("kb_categories")
