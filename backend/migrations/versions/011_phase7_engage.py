"""Phase 7 engage: goals + achievements + watched visitors.

Revision ID: 011_phase7_engage
Revises: 010_phase6_channels
Create Date: 2026-05-18
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "011_phase7_engage"
down_revision = "010_phase6_channels"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "goals",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("goal_type", sa.String(length=40), nullable=False, server_default="event"),
        sa.Column("event_name", sa.String(length=120), nullable=True),
        sa.Column("target_url", sa.Text(), nullable=True),
        sa.Column("default_value", sa.Numeric(12, 2), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )
    op.create_index("ix_goals_org", "goals", ["organization_id"])

    op.create_table(
        "goal_achievements",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False),
        sa.Column("goal_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("goals.id", ondelete="CASCADE"), nullable=False),
        sa.Column("session_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("sessions.id", ondelete="SET NULL"), nullable=True),
        sa.Column("chat_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("chats.id", ondelete="SET NULL"), nullable=True),
        sa.Column("campaign_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("proactive_triggers.id", ondelete="SET NULL"), nullable=True),
        sa.Column("value", sa.Numeric(12, 2), nullable=True),
        sa.Column("metadata", postgresql.JSONB(), nullable=False, server_default="{}"),
        sa.Column("achieved_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )
    op.create_index("ix_goal_achievements_org", "goal_achievements", ["organization_id"])
    op.create_index("ix_goal_achievements_goal", "goal_achievements", ["goal_id"])
    op.create_index("ix_goal_achievements_session", "goal_achievements", ["session_id"])
    op.create_index("ix_goal_achievements_chat", "goal_achievements", ["chat_id"])
    op.create_index("ix_goal_achievements_campaign", "goal_achievements", ["campaign_id"])
    op.create_index("ix_goal_achievements_achieved_at", "goal_achievements", ["achieved_at"])

    op.create_table(
        "visitor_watches",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("session_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("sessions.id", ondelete="CASCADE"), nullable=False),
        sa.Column("note", sa.String(length=240), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.UniqueConstraint("organization_id", "user_id", "session_id", name="uq_visitor_watch_org_user_session"),
    )
    op.create_index("ix_visitor_watches_org", "visitor_watches", ["organization_id"])
    op.create_index("ix_visitor_watches_user", "visitor_watches", ["user_id"])
    op.create_index("ix_visitor_watches_session", "visitor_watches", ["session_id"])


def downgrade() -> None:
    op.drop_index("ix_visitor_watches_session", table_name="visitor_watches")
    op.drop_index("ix_visitor_watches_user", table_name="visitor_watches")
    op.drop_index("ix_visitor_watches_org", table_name="visitor_watches")
    op.drop_table("visitor_watches")

    op.drop_index("ix_goal_achievements_achieved_at", table_name="goal_achievements")
    op.drop_index("ix_goal_achievements_campaign", table_name="goal_achievements")
    op.drop_index("ix_goal_achievements_chat", table_name="goal_achievements")
    op.drop_index("ix_goal_achievements_session", table_name="goal_achievements")
    op.drop_index("ix_goal_achievements_goal", table_name="goal_achievements")
    op.drop_index("ix_goal_achievements_org", table_name="goal_achievements")
    op.drop_table("goal_achievements")

    op.drop_index("ix_goals_org", table_name="goals")
    op.drop_table("goals")
