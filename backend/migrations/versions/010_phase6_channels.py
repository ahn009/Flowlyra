"""Phase 6 channels: connections, outbound queue, templates, identities.

Revision ID: 010_phase6_channels
Revises: 009_phase5_ai_rag
Create Date: 2026-05-18
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "010_phase6_channels"
down_revision = "009_phase5_ai_rag"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "channel_connections",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False),
        sa.Column("channel", sa.String(length=32), nullable=False),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("external_id", sa.String(length=200), nullable=False),
        sa.Column("credentials", postgresql.JSONB(), nullable=False, server_default="{}"),
        sa.Column("settings", postgresql.JSONB(), nullable=False, server_default="{}"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("last_inbound_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_outbound_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_error", sa.Text(), nullable=True),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="healthy"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.UniqueConstraint("organization_id", "channel", "external_id", name="uq_channel_org_external"),
    )
    op.create_index("ix_channel_connections_org", "channel_connections", ["organization_id"])
    op.create_index("ix_channel_connections_channel", "channel_connections", ["channel"])

    op.create_table(
        "channel_outbound",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False),
        sa.Column("connection_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("channel_connections.id", ondelete="CASCADE"), nullable=False),
        sa.Column("chat_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("chats.id", ondelete="SET NULL"), nullable=True),
        sa.Column("message_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("messages.id", ondelete="SET NULL"), nullable=True),
        sa.Column("recipient", sa.String(length=255), nullable=False),
        sa.Column("payload", postgresql.JSONB(), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="pending"),
        sa.Column("attempts", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("next_retry_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_error", sa.Text(), nullable=True),
        sa.Column("external_message_id", sa.String(length=255), nullable=True),
        sa.Column("cost_units", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )
    op.create_index("ix_channel_outbound_org", "channel_outbound", ["organization_id"])
    op.create_index("ix_channel_outbound_conn", "channel_outbound", ["connection_id"])
    op.create_index("ix_channel_outbound_chat", "channel_outbound", ["chat_id"])
    op.create_index("ix_channel_outbound_status", "channel_outbound", ["status"])

    op.create_table(
        "channel_templates",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False),
        sa.Column("connection_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("channel_connections.id", ondelete="CASCADE"), nullable=True),
        sa.Column("channel", sa.String(length=32), nullable=False),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("language", sa.String(length=20), nullable=False, server_default="en"),
        sa.Column("category", sa.String(length=40), nullable=True),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("components", postgresql.JSONB(), nullable=False, server_default="{}"),
        sa.Column("external_id", sa.String(length=200), nullable=True),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="draft"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )
    op.create_index("ix_channel_templates_org", "channel_templates", ["organization_id"])

    op.create_table(
        "contact_identities",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False),
        sa.Column("contact_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("contacts.id", ondelete="CASCADE"), nullable=False),
        sa.Column("channel", sa.String(length=32), nullable=False),
        sa.Column("external_id", sa.String(length=255), nullable=False),
        sa.Column("meta", postgresql.JSONB(), nullable=False, server_default="{}"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.UniqueConstraint("channel", "external_id", name="uq_contact_identity_channel_external"),
    )
    op.create_index("ix_contact_identities_org", "contact_identities", ["organization_id"])
    op.create_index("ix_contact_identities_channel", "contact_identities", ["channel"])
    op.create_index("ix_contact_identities_contact", "contact_identities", ["contact_id"])

    # Chats: track external channel id
    op.add_column("chats", sa.Column("channel_connection_id", postgresql.UUID(as_uuid=True), nullable=True))
    op.add_column("chats", sa.Column("external_thread_id", sa.String(length=255), nullable=True))
    op.create_index("ix_chats_external_thread", "chats", ["external_thread_id"])

    # Messages: outbound id linkage already covered by channel_outbound
    op.add_column("messages", sa.Column("external_message_id", sa.String(length=255), nullable=True))


def downgrade() -> None:
    op.drop_column("messages", "external_message_id")
    op.drop_index("ix_chats_external_thread", table_name="chats")
    op.drop_column("chats", "external_thread_id")
    op.drop_column("chats", "channel_connection_id")
    op.drop_index("ix_contact_identities_contact", table_name="contact_identities")
    op.drop_index("ix_contact_identities_channel", table_name="contact_identities")
    op.drop_index("ix_contact_identities_org", table_name="contact_identities")
    op.drop_table("contact_identities")
    op.drop_index("ix_channel_templates_org", table_name="channel_templates")
    op.drop_table("channel_templates")
    op.drop_index("ix_channel_outbound_status", table_name="channel_outbound")
    op.drop_index("ix_channel_outbound_chat", table_name="channel_outbound")
    op.drop_index("ix_channel_outbound_conn", table_name="channel_outbound")
    op.drop_index("ix_channel_outbound_org", table_name="channel_outbound")
    op.drop_table("channel_outbound")
    op.drop_index("ix_channel_connections_channel", table_name="channel_connections")
    op.drop_index("ix_channel_connections_org", table_name="channel_connections")
    op.drop_table("channel_connections")
