"""phase2 chat depth

Revision ID: 007_phase2_chat_depth
Revises: 006_phase3_ticketing_depth
Create Date: 2026-05-18
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = "007_phase2_chat_depth"
down_revision = "006_phase3_ticketing_depth"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("chats", sa.Column("is_pinned", sa.Boolean(), nullable=False, server_default=sa.text("false")))
    op.add_column("chats", sa.Column("pinned_by_user_id", postgresql.UUID(as_uuid=True), nullable=True))
    op.add_column("chats", sa.Column("snoozed_until", sa.DateTime(timezone=True), nullable=True))
    op.add_column("chats", sa.Column("is_spam", sa.Boolean(), nullable=False, server_default=sa.text("false")))
    op.create_index("ix_chats_is_pinned", "chats", ["is_pinned"], unique=False)
    op.create_index("ix_chats_pinned_by_user_id", "chats", ["pinned_by_user_id"], unique=False)
    op.create_index("ix_chats_snoozed_until", "chats", ["snoozed_until"], unique=False)
    op.create_index("ix_chats_is_spam", "chats", ["is_spam"], unique=False)
    op.create_foreign_key("fk_chats_pinned_by_user_id", "chats", "users", ["pinned_by_user_id"], ["id"], ondelete="SET NULL")

    op.add_column("messages", sa.Column("reactions", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")))
    op.add_column("messages", sa.Column("edited_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("messages", sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column("messages", "deleted_at")
    op.drop_column("messages", "edited_at")
    op.drop_column("messages", "reactions")

    op.drop_constraint("fk_chats_pinned_by_user_id", "chats", type_="foreignkey")
    op.drop_index("ix_chats_is_spam", table_name="chats")
    op.drop_index("ix_chats_snoozed_until", table_name="chats")
    op.drop_index("ix_chats_pinned_by_user_id", table_name="chats")
    op.drop_index("ix_chats_is_pinned", table_name="chats")
    op.drop_column("chats", "is_spam")
    op.drop_column("chats", "snoozed_until")
    op.drop_column("chats", "pinned_by_user_id")
    op.drop_column("chats", "is_pinned")
