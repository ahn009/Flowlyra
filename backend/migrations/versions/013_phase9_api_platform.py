"""Phase 9 API platform: API keys and surveys.

Revision ID: 013_phase9_api_platform
Revises: 012_phase8_report_schedule
Create Date: 2026-05-18
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "013_phase9_api_platform"
down_revision = "012_phase8_report_schedule"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "api_keys",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False),
        sa.Column("created_by_user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("key_prefix", sa.String(length=20), nullable=False),
        sa.Column("key_hash", sa.String(length=128), nullable=False),
        sa.Column("scopes", postgresql.JSONB(), nullable=False, server_default='{"items": []}'),
        sa.Column("rate_limit_per_min", sa.Integer(), nullable=True),
        sa.Column("usage_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("last_used_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_used_ip", sa.String(length=64), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_error", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )
    op.create_index("ix_api_keys_org", "api_keys", ["organization_id"])
    op.create_index("ix_api_keys_org_active", "api_keys", ["organization_id", "is_active"])
    op.create_index("ix_api_keys_prefix", "api_keys", ["key_prefix"], unique=True)
    op.create_index("ix_api_keys_created_by", "api_keys", ["created_by_user_id"])

    op.create_table(
        "surveys",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(length=180), nullable=False),
        sa.Column("trigger", sa.String(length=60), nullable=False, server_default="post_chat"),
        sa.Column("questions", postgresql.JSONB(), nullable=False, server_default='{"items": []}'),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )
    op.create_index("ix_surveys_org", "surveys", ["organization_id"])

    op.create_table(
        "survey_responses",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False),
        sa.Column("survey_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("surveys.id", ondelete="CASCADE"), nullable=False),
        sa.Column("chat_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("chats.id", ondelete="SET NULL"), nullable=True),
        sa.Column("contact_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("contacts.id", ondelete="SET NULL"), nullable=True),
        sa.Column("score", sa.Integer(), nullable=True),
        sa.Column("answers", postgresql.JSONB(), nullable=False, server_default="{}"),
        sa.Column("comment", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )
    op.create_index("ix_survey_responses_org", "survey_responses", ["organization_id"])
    op.create_index("ix_survey_responses_survey", "survey_responses", ["survey_id"])
    op.create_index("ix_survey_responses_chat", "survey_responses", ["chat_id"])
    op.create_index("ix_survey_responses_contact", "survey_responses", ["contact_id"])


def downgrade() -> None:
    op.drop_index("ix_survey_responses_contact", table_name="survey_responses")
    op.drop_index("ix_survey_responses_chat", table_name="survey_responses")
    op.drop_index("ix_survey_responses_survey", table_name="survey_responses")
    op.drop_index("ix_survey_responses_org", table_name="survey_responses")
    op.drop_table("survey_responses")

    op.drop_index("ix_surveys_org", table_name="surveys")
    op.drop_table("surveys")

    op.drop_index("ix_api_keys_created_by", table_name="api_keys")
    op.drop_index("ix_api_keys_prefix", table_name="api_keys")
    op.drop_index("ix_api_keys_org_active", table_name="api_keys")
    op.drop_index("ix_api_keys_org", table_name="api_keys")
    op.drop_table("api_keys")
