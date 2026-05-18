"""Phase 13: push devices + notification digest persistence.

Revision ID: 016_phase13_pwa_push_notifications
Revises: 015_phase12_security
Create Date: 2026-05-18
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "016_phase13_pwa_push_notifications"
down_revision = "015_phase12_security"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "push_devices",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("channel", sa.String(length=20), nullable=False),
        sa.Column("endpoint", sa.Text(), nullable=True),
        sa.Column("p256dh", sa.Text(), nullable=True),
        sa.Column("auth", sa.Text(), nullable=True),
        sa.Column("native_token", sa.Text(), nullable=True),
        sa.Column("user_agent", sa.Text(), nullable=True),
        sa.Column("platform", sa.String(length=40), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("last_seen_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_sent_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_error", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.UniqueConstraint("user_id", "channel", "endpoint", name="uq_push_device_user_channel_endpoint"),
        sa.UniqueConstraint("user_id", "channel", "native_token", name="uq_push_device_user_channel_token"),
    )
    op.create_index("ix_push_device_org_channel", "push_devices", ["organization_id", "channel"])
    op.create_index("ix_push_device_user_active", "push_devices", ["user_id", "is_active"])

    op.add_column("notifications", sa.Column("email_digest_sent_at", sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column("notifications", "email_digest_sent_at")

    op.drop_index("ix_push_device_user_active", table_name="push_devices")
    op.drop_index("ix_push_device_org_channel", table_name="push_devices")
    op.drop_table("push_devices")
