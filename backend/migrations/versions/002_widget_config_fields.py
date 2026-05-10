"""Add production widget configuration fields.

Revision ID: 002_widget_config_fields
Revises: 001_initial_schema
Create Date: 2026-05-10
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "002_widget_config_fields"
down_revision = "001_initial_schema"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("organizations", sa.Column("widget_theme", sa.String(length=20), nullable=False, server_default="auto"))
    op.add_column(
        "organizations",
        sa.Column(
            "widget_domain_allowlist",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'{\"domains\": []}'::jsonb"),
        ),
    )
    op.add_column(
        "organizations",
        sa.Column(
            "widget_pre_chat_form",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'{\"enabled\": true, \"fields\": [\"name\", \"email\", \"subject\", \"message\"]}'::jsonb"),
        ),
    )
    op.add_column(
        "organizations",
        sa.Column(
            "widget_post_chat_survey",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'{\"enabled\": true, \"type\": \"csat_5\"}'::jsonb"),
        ),
    )


def downgrade() -> None:
    op.drop_column("organizations", "widget_post_chat_survey")
    op.drop_column("organizations", "widget_pre_chat_form")
    op.drop_column("organizations", "widget_domain_allowlist")
    op.drop_column("organizations", "widget_theme")
