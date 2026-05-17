"""Phase 1: per-org Giphy key for widget GIF picker.

Revision ID: 005_phase1_widget_giphy_key
Revises: 004_phase1_widget
Create Date: 2026-05-18
"""

from alembic import op
import sqlalchemy as sa


revision = "005_phase1_widget_giphy_key"
down_revision = "004_phase1_widget"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("organizations", sa.Column("widget_giphy_api_key", sa.String(length=255), nullable=True))


def downgrade() -> None:
    op.drop_column("organizations", "widget_giphy_api_key")
