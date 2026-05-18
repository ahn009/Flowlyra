"""Phase 12 enterprise security tables + user/org columns.

Revision ID: 015_phase12_security
Revises: 014_phase10_integrations
Create Date: 2026-05-18
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "015_phase12_security"
down_revision = "014_phase10_integrations"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ---- user + organization extensions ----
    op.add_column(
        "users",
        sa.Column("two_factor_enrolled_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "users",
        sa.Column("backup_codes_generated_at", sa.DateTime(timezone=True), nullable=True),
    )

    # Organization gets captcha + retention pointers (ip_allowlist already JSONB on org)
    op.add_column(
        "organizations",
        sa.Column("captcha_enabled", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.add_column(
        "organizations",
        sa.Column("captcha_provider", sa.String(length=30), nullable=False, server_default="hcaptcha"),
    )
    op.add_column(
        "organizations",
        sa.Column(
            "cookie_consent",
            postgresql.JSONB(),
            nullable=False,
            server_default=sa.text("'{\"enabled\": false, \"text\": null}'::jsonb"),
        ),
    )

    # ---- sso_configs ----
    op.create_table(
        "sso_configs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False),
        sa.Column("provider", sa.String(length=20), nullable=False, server_default="saml"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("idp_entity_id", sa.Text(), nullable=True),
        sa.Column("idp_sso_url", sa.Text(), nullable=True),
        sa.Column("idp_slo_url", sa.Text(), nullable=True),
        sa.Column("idp_cert", sa.Text(), nullable=True),
        sa.Column("sp_acs_url", sa.Text(), nullable=True),
        sa.Column(
            "attribute_map",
            postgresql.JSONB(),
            nullable=False,
            server_default=sa.text(
                "'{\"email\": \"email\", \"full_name\": \"displayName\", \"first_name\": \"givenName\", \"last_name\": \"surname\"}'::jsonb"
            ),
        ),
        sa.Column("default_role", sa.String(length=30), nullable=False, server_default="agent"),
        sa.Column("auto_provision", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("require_sso", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.UniqueConstraint("organization_id", "provider", name="uq_sso_org_provider"),
    )
    op.create_index("ix_sso_configs_org", "sso_configs", ["organization_id"])

    # ---- scim_tokens ----
    op.create_table(
        "scim_tokens",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False),
        sa.Column("label", sa.String(length=120), nullable=False),
        sa.Column("token_hash", sa.String(length=128), nullable=False, unique=True),
        sa.Column("token_prefix", sa.String(length=16), nullable=False),
        sa.Column(
            "scopes",
            postgresql.JSONB(),
            nullable=False,
            server_default=sa.text("'{\"items\": [\"users.read\", \"users.write\"]}'::jsonb"),
        ),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("last_used_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )
    op.create_index("ix_scim_tokens_org", "scim_tokens", ["organization_id"])
    op.create_index("ix_scim_tokens_hash", "scim_tokens", ["token_hash"])

    # ---- oauth_identities ----
    op.create_table(
        "oauth_identities",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False),
        sa.Column("provider", sa.String(length=30), nullable=False),
        sa.Column("subject", sa.String(length=255), nullable=False),
        sa.Column("email", sa.String(length=320), nullable=True),
        sa.Column("raw_profile", postgresql.JSONB(), nullable=False, server_default="{}"),
        sa.Column("last_login_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.UniqueConstraint("provider", "subject", name="uq_oauth_provider_subject"),
    )
    op.create_index("ix_oauth_identities_user", "oauth_identities", ["user_id"])
    op.create_index("ix_oauth_identities_org", "oauth_identities", ["organization_id"])

    # ---- user_backup_codes ----
    op.create_table(
        "user_backup_codes",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("code_hash", sa.String(length=128), nullable=False, unique=True),
        sa.Column("used_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )
    op.create_index("ix_backup_codes_user", "user_backup_codes", ["user_id"])
    op.create_index("ix_backup_codes_hash", "user_backup_codes", ["code_hash"])

    # ---- retention_policies ----
    op.create_table(
        "retention_policies",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, unique=True),
        sa.Column("chat_days", sa.Integer(), nullable=False, server_default="365"),
        sa.Column("ticket_days", sa.Integer(), nullable=False, server_default="730"),
        sa.Column("audit_days", sa.Integer(), nullable=False, server_default="365"),
        sa.Column("session_days", sa.Integer(), nullable=False, server_default="90"),
        sa.Column("enabled", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )

    # ---- data_export_jobs ----
    op.create_table(
        "data_export_jobs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False),
        sa.Column("requested_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("scope", sa.String(length=20), nullable=False, server_default="org"),
        sa.Column("target_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="pending"),
        sa.Column("file_url", sa.Text(), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("size_bytes", sa.Integer(), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )
    op.create_index("ix_data_export_jobs_org", "data_export_jobs", ["organization_id"])

    # ---- security_events ----
    op.create_table(
        "security_events",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("event", sa.String(length=80), nullable=False),
        sa.Column("severity", sa.String(length=20), nullable=False, server_default="info"),
        sa.Column("ip_address", sa.String(length=64), nullable=True),
        sa.Column("user_agent", sa.Text(), nullable=True),
        sa.Column("country", sa.String(length=80), nullable=True),
        sa.Column("details", postgresql.JSONB(), nullable=False, server_default="{}"),
        sa.Column("notified_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )
    op.create_index("ix_security_events_org", "security_events", ["organization_id"])
    op.create_index("ix_security_events_user", "security_events", ["user_id"])
    op.create_index("ix_security_events_event", "security_events", ["event"])

    # ---- visitor_bans ----
    op.create_table(
        "visitor_bans",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False),
        sa.Column("ban_type", sa.String(length=20), nullable=False),
        sa.Column("value", sa.String(length=255), nullable=False),
        sa.Column("reason", sa.Text(), nullable=True),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.UniqueConstraint("organization_id", "ban_type", "value", name="uq_ban_org_type_value"),
    )
    op.create_index("ix_visitor_bans_org", "visitor_bans", ["organization_id"])


def downgrade() -> None:
    op.drop_index("ix_visitor_bans_org", table_name="visitor_bans")
    op.drop_table("visitor_bans")

    op.drop_index("ix_security_events_event", table_name="security_events")
    op.drop_index("ix_security_events_user", table_name="security_events")
    op.drop_index("ix_security_events_org", table_name="security_events")
    op.drop_table("security_events")

    op.drop_index("ix_data_export_jobs_org", table_name="data_export_jobs")
    op.drop_table("data_export_jobs")

    op.drop_table("retention_policies")

    op.drop_index("ix_backup_codes_hash", table_name="user_backup_codes")
    op.drop_index("ix_backup_codes_user", table_name="user_backup_codes")
    op.drop_table("user_backup_codes")

    op.drop_index("ix_oauth_identities_org", table_name="oauth_identities")
    op.drop_index("ix_oauth_identities_user", table_name="oauth_identities")
    op.drop_table("oauth_identities")

    op.drop_index("ix_scim_tokens_hash", table_name="scim_tokens")
    op.drop_index("ix_scim_tokens_org", table_name="scim_tokens")
    op.drop_table("scim_tokens")

    op.drop_index("ix_sso_configs_org", table_name="sso_configs")
    op.drop_table("sso_configs")

    op.drop_column("organizations", "cookie_consent")
    op.drop_column("organizations", "captcha_provider")
    op.drop_column("organizations", "captcha_enabled")

    op.drop_column("users", "backup_codes_generated_at")
    op.drop_column("users", "two_factor_enrolled_at")
