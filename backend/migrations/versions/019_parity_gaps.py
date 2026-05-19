"""LiveChat parity gaps: moments, agent priority, inactivity msg, voice/video, availability log.

Revision ID: 019_parity_gaps
Revises: 018_phase15_polish
Create Date: 2026-05-18
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "019_parity_gaps"
down_revision = "018_phase15_polish"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Agent priority in team_members
    op.add_column("team_members", sa.Column("priority", sa.Integer(), nullable=False, server_default="0"))

    # 2. Organization: inactivity message + voice/video toggle
    op.add_column(
        "organizations",
        sa.Column(
            "widget_inactivity_message",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text('\'{"enabled": false, "delay_seconds": 60, "text": "Still there? Can I help you with anything?"}\'::jsonb'),
        ),
    )
    op.add_column("organizations", sa.Column("widget_voice_video_enabled", sa.Boolean(), nullable=False, server_default=sa.text("false")))

    # 3. ChatMoment table (Moments / in-chat apps parity)
    op.create_table(
        "chat_moments",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("chat_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_by_user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("url", sa.Text(), nullable=False),
        sa.Column("moment_type", sa.String(length=40), nullable=False, server_default="custom"),
        sa.Column("config", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="pending"),
        sa.Column("visitor_completed", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("visitor_completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["chat_id"], ["chats.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["created_by_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_chat_moments_org", "chat_moments", ["organization_id"])
    op.create_index("ix_chat_moments_chat", "chat_moments", ["chat_id"])
    op.create_index("ix_chat_moments_status", "chat_moments", ["status"])
    op.create_index("ix_chat_moments_created_at", "chat_moments", ["created_at"])

    # 4. AgentAvailabilityLog table
    op.create_table(
        "agent_availability_log",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("occurred_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_agent_avail_log_org", "agent_availability_log", ["organization_id"])
    op.create_index("ix_agent_avail_log_user", "agent_availability_log", ["user_id"])
    op.create_index("ix_agent_avail_log_occurred_at", "agent_availability_log", ["occurred_at"])


def downgrade() -> None:
    op.drop_table("agent_availability_log")
    op.drop_table("chat_moments")
    op.drop_column("organizations", "widget_voice_video_enabled")
    op.drop_column("organizations", "widget_inactivity_message")
    op.drop_column("team_members", "priority")
