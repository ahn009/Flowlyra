"""Phase 8 reports: report schedule model.

Revision ID: 012_phase8_report_schedule
Revises: 011_phase7_engage
Create Date: 2026-05-18
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "012_phase8_report_schedule"
down_revision = "011_phase7_engage"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "report_schedules",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("report_type", sa.String(length=60), nullable=False),
        sa.Column("frequency", sa.String(length=20), nullable=False, server_default="weekly"),
        sa.Column("day_of_week", sa.Integer(), nullable=True),
        sa.Column("day_of_month", sa.Integer(), nullable=True),
        sa.Column("hour_utc", sa.Integer(), nullable=False, server_default="9"),
        sa.Column("timezone", sa.String(length=80), nullable=False, server_default="UTC"),
        sa.Column("report_format", sa.String(length=20), nullable=False, server_default="csv"),
        sa.Column("recipients", postgresql.JSONB(), nullable=False, server_default='{"emails": []}'),
        sa.Column("filters", postgresql.JSONB(), nullable=False, server_default="{}"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("last_sent_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("next_run_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )
    op.create_index("ix_report_schedules_org", "report_schedules", ["organization_id"])
    op.create_index("ix_report_schedules_user", "report_schedules", ["user_id"])
    op.create_index("ix_report_schedules_next_run", "report_schedules", ["next_run_at"])


def downgrade() -> None:
    op.drop_index("ix_report_schedules_next_run", table_name="report_schedules")
    op.drop_index("ix_report_schedules_user", table_name="report_schedules")
    op.drop_index("ix_report_schedules_org", table_name="report_schedules")
    op.drop_table("report_schedules")
