"""Phase 0 foundation: memberships, audit log, refresh tokens, notifications, webhooks, security columns.

Revision ID: 003_phase0_foundation
Revises: 002_widget_config_fields
Create Date: 2026-05-17
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "003_phase0_foundation"
down_revision = "002_widget_config_fields"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # --- Organization additions ------------------------------------------------
    op.add_column(
        "organizations",
        sa.Column("cors_origin_allowlist", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{\"origins\": []}'::jsonb")),
    )
    op.add_column(
        "organizations",
        sa.Column("ip_allowlist", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{\"enabled\": false, \"cidrs\": []}'::jsonb")),
    )
    op.add_column("organizations", sa.Column("enforce_two_factor", sa.Boolean(), nullable=False, server_default=sa.text("false")))
    op.add_column("organizations", sa.Column("feature_flags", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")))
    op.add_column("organizations", sa.Column("locale_default", sa.String(length=10), nullable=False, server_default="en"))
    op.add_column("organizations", sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True))

    # --- User additions --------------------------------------------------------
    op.add_column("users", sa.Column("failed_login_count", sa.Integer(), nullable=False, server_default="0"))
    op.add_column("users", sa.Column("locked_until", sa.DateTime(timezone=True), nullable=True))
    op.add_column("users", sa.Column("two_factor_secret", sa.Text(), nullable=True))
    op.add_column("users", sa.Column("two_factor_enabled", sa.Boolean(), nullable=False, server_default=sa.text("false")))
    op.add_column("users", sa.Column("password_changed_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("users", sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True))

    # --- Workspace memberships ------------------------------------------------
    op.create_table(
        "workspace_memberships",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("role", sa.String(length=30), nullable=False, server_default="agent"),
        sa.Column("permissions", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{\"granted\": [], \"denied\": []}'::jsonb")),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("is_primary", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("invited_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("joined_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.UniqueConstraint("user_id", "organization_id", name="uq_membership_user_org"),
    )

    # Backfill existing users into memberships
    op.execute(
        """
        INSERT INTO workspace_memberships (id, user_id, organization_id, role, permissions, is_active, is_primary, joined_at, created_at)
        SELECT uuid_generate_v4(), u.id, u.organization_id, u.role, '{"granted": [], "denied": []}'::jsonb, true, true, now(), now()
        FROM users u
        LEFT JOIN workspace_memberships m ON m.user_id = u.id AND m.organization_id = u.organization_id
        WHERE m.id IS NULL
        """
    )

    # Promote first admin per org to owner if there is no owner yet
    op.execute(
        """
        WITH first_admin AS (
          SELECT DISTINCT ON (organization_id) id, organization_id
          FROM users
          WHERE role = 'admin'
          ORDER BY organization_id, created_at ASC
        ),
        orgs_without_owner AS (
          SELECT organization_id FROM users GROUP BY organization_id
          EXCEPT
          SELECT organization_id FROM users WHERE role = 'owner'
        )
        UPDATE users SET role = 'owner'
        WHERE id IN (
          SELECT fa.id FROM first_admin fa
          JOIN orgs_without_owner o ON o.organization_id = fa.organization_id
        );
        UPDATE workspace_memberships m
        SET role = 'owner'
        FROM users u
        WHERE m.user_id = u.id AND u.role = 'owner';
        """
    )

    # --- Audit log -------------------------------------------------------------
    op.create_table(
        "audit_logs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=True, index=True),
        sa.Column("actor_user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("actor_email", sa.String(length=320), nullable=True),
        sa.Column("event", sa.String(length=80), nullable=False),
        sa.Column("target_type", sa.String(length=60), nullable=True),
        sa.Column("target_id", sa.String(length=80), nullable=True),
        sa.Column("ip_address", sa.String(length=64), nullable=True),
        sa.Column("user_agent", sa.Text(), nullable=True),
        sa.Column("request_id", sa.String(length=64), nullable=True),
        sa.Column("method", sa.String(length=10), nullable=True),
        sa.Column("path", sa.Text(), nullable=True),
        sa.Column("status_code", sa.Integer(), nullable=True),
        sa.Column("details", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )
    op.create_index("ix_audit_org_created", "audit_logs", ["organization_id", "created_at"])
    op.create_index("ix_audit_actor", "audit_logs", ["actor_user_id"])
    op.create_index("ix_audit_event", "audit_logs", ["event"])

    # --- Refresh tokens --------------------------------------------------------
    op.create_table(
        "refresh_tokens",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("family_id", postgresql.UUID(as_uuid=True), nullable=False, index=True),
        sa.Column("jti", sa.String(length=64), nullable=False, unique=True),
        sa.Column("parent_jti", sa.String(length=64), nullable=True),
        sa.Column("token_hash", sa.Text(), nullable=False),
        sa.Column("user_agent", sa.Text(), nullable=True),
        sa.Column("ip_address", sa.String(length=64), nullable=True),
        sa.Column("is_revoked", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("revoked_reason", sa.String(length=60), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("last_used_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )

    # --- Notifications ---------------------------------------------------------
    op.create_table(
        "notifications",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("kind", sa.String(length=80), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("body", sa.Text(), nullable=True),
        sa.Column("link_url", sa.Text(), nullable=True),
        sa.Column("icon", sa.String(length=60), nullable=True),
        sa.Column("priority", sa.String(length=20), nullable=False, server_default="normal"),
        sa.Column("meta", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("is_read", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("read_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )
    op.create_index("ix_notif_user_unread", "notifications", ["user_id", "is_read"])

    op.create_table(
        "notification_preferences",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True),
        sa.Column("in_app", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{\"all\": true}'::jsonb")),
        sa.Column("email", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{\"digest\": \"instant\"}'::jsonb")),
        sa.Column("push", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{\"all\": true}'::jsonb")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )

    # --- Webhooks --------------------------------------------------------------
    op.create_table(
        "webhooks",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("url", sa.Text(), nullable=False),
        sa.Column("events", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{\"subscribed\": [\"*\"]}'::jsonb")),
        sa.Column("secret", sa.Text(), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("last_success_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_failure_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("failure_streak", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )

    op.create_table(
        "webhook_deliveries",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("webhook_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("webhooks.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("event", sa.String(length=80), nullable=False),
        sa.Column("payload", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="pending"),
        sa.Column("status_code", sa.Integer(), nullable=True),
        sa.Column("response_body", sa.Text(), nullable=True),
        sa.Column("attempt", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("next_retry_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("delivered_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )
    op.create_index("ix_wh_delivery_status", "webhook_deliveries", ["webhook_id", "status"])


def downgrade() -> None:
    op.drop_index("ix_wh_delivery_status", table_name="webhook_deliveries")
    op.drop_table("webhook_deliveries")
    op.drop_table("webhooks")
    op.drop_table("notification_preferences")
    op.drop_index("ix_notif_user_unread", table_name="notifications")
    op.drop_table("notifications")
    op.drop_table("refresh_tokens")
    op.drop_index("ix_audit_event", table_name="audit_logs")
    op.drop_index("ix_audit_actor", table_name="audit_logs")
    op.drop_index("ix_audit_org_created", table_name="audit_logs")
    op.drop_table("audit_logs")
    op.drop_table("workspace_memberships")
    for col in ("deleted_at", "password_changed_at", "two_factor_enabled", "two_factor_secret", "locked_until", "failed_login_count"):
        op.drop_column("users", col)
    for col in ("deleted_at", "locale_default", "feature_flags", "enforce_two_factor", "ip_allowlist", "cors_origin_allowlist"):
        op.drop_column("organizations", col)
