"""Phase 10 integrations marketplace framework.

Revision ID: 014_phase10_integrations
Revises: 013_phase9_api_platform
Create Date: 2026-05-18
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "014_phase10_integrations"
down_revision = "013_phase9_api_platform"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "integrations",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False),
        sa.Column("provider", sa.String(length=80), nullable=False),
        sa.Column("display_name", sa.String(length=160), nullable=False),
        sa.Column("category", sa.String(length=40), nullable=False, server_default="other"),
        sa.Column("install_type", sa.String(length=30), nullable=False, server_default="api_key"),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="installed"),
        sa.Column("config", postgresql.JSONB(), nullable=False, server_default="{}"),
        sa.Column("credentials", postgresql.JSONB(), nullable=False, server_default="{}"),
        sa.Column("capabilities", postgresql.JSONB(), nullable=False, server_default='{"items": []}'),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("health_status", sa.String(length=20), nullable=False, server_default="unknown"),
        sa.Column("failure_streak", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("last_sync_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_success_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_error_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_error_message", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.UniqueConstraint("organization_id", "provider", name="uq_integrations_org_provider"),
    )
    op.create_index("ix_integrations_org", "integrations", ["organization_id"])
    op.create_index("ix_integrations_provider", "integrations", ["provider"])
    op.create_index("ix_integrations_org_status", "integrations", ["organization_id", "status"])

    op.create_table(
        "oauth_connections",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False),
        sa.Column("integration_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("integrations.id", ondelete="SET NULL"), nullable=True),
        sa.Column("provider", sa.String(length=80), nullable=False),
        sa.Column("account_id", sa.String(length=255), nullable=True),
        sa.Column("account_label", sa.String(length=255), nullable=True),
        sa.Column("access_token", sa.Text(), nullable=True),
        sa.Column("refresh_token", sa.Text(), nullable=True),
        sa.Column("token_type", sa.String(length=40), nullable=True),
        sa.Column("scopes", postgresql.JSONB(), nullable=False, server_default='{"items": []}'),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("metadata", postgresql.JSONB(), nullable=False, server_default="{}"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )
    op.create_index("ix_oauth_connections_org", "oauth_connections", ["organization_id"])
    op.create_index("ix_oauth_connections_integration", "oauth_connections", ["integration_id"])
    op.create_index("ix_oauth_org_provider", "oauth_connections", ["organization_id", "provider"])

    op.create_table(
        "integration_logs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("integration_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("integrations.id", ondelete="CASCADE"), nullable=False),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False),
        sa.Column("level", sa.String(length=10), nullable=False, server_default="info"),
        sa.Column("event", sa.String(length=80), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("payload", postgresql.JSONB(), nullable=False, server_default="{}"),
        sa.Column("status_code", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )
    op.create_index("ix_integration_logs_integration", "integration_logs", ["integration_id"])
    op.create_index("ix_integration_logs_org", "integration_logs", ["organization_id"])
    op.create_index("ix_integration_logs_integration_created", "integration_logs", ["integration_id", "created_at"])


def downgrade() -> None:
    op.drop_index("ix_integration_logs_integration_created", table_name="integration_logs")
    op.drop_index("ix_integration_logs_org", table_name="integration_logs")
    op.drop_index("ix_integration_logs_integration", table_name="integration_logs")
    op.drop_table("integration_logs")

    op.drop_index("ix_oauth_org_provider", table_name="oauth_connections")
    op.drop_index("ix_oauth_connections_integration", table_name="oauth_connections")
    op.drop_index("ix_oauth_connections_org", table_name="oauth_connections")
    op.drop_table("oauth_connections")

    op.drop_index("ix_integrations_org_status", table_name="integrations")
    op.drop_index("ix_integrations_provider", table_name="integrations")
    op.drop_index("ix_integrations_org", table_name="integrations")
    op.drop_table("integrations")
