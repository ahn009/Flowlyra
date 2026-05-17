"""Phase 1: widget feature-complete columns/tables.

Revision ID: 004_phase1_widget
Revises: 003_phase0_foundation
Create Date: 2026-05-17
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "004_phase1_widget"
down_revision = "003_phase0_foundation"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Organization: widget capability columns
    op.add_column("organizations", sa.Column("widget_custom_js", sa.Text(), nullable=True))
    op.add_column("organizations", sa.Column("widget_greetings", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{\"items\": []}'::jsonb")))
    op.add_column("organizations", sa.Column("widget_eye_catcher", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{\"enabled\": false, \"image_url\": null, \"text\": null}'::jsonb")))
    op.add_column("organizations", sa.Column("widget_white_label", sa.Boolean(), nullable=False, server_default=sa.text("false")))
    op.add_column("organizations", sa.Column("widget_brand_text", sa.String(length=255), nullable=True, server_default="FlowLyra"))
    op.add_column("organizations", sa.Column("widget_brand_url", sa.Text(), nullable=True))
    op.add_column("organizations", sa.Column("widget_sound_enabled", sa.Boolean(), nullable=False, server_default=sa.text("true")))
    op.add_column("organizations", sa.Column("widget_lazy_load", sa.Boolean(), nullable=False, server_default=sa.text("false")))
    op.add_column("organizations", sa.Column("widget_allow_attachments", sa.Boolean(), nullable=False, server_default=sa.text("true")))
    op.add_column("organizations", sa.Column("widget_max_upload_mb", sa.Integer(), nullable=False, server_default="10"))
    op.add_column("organizations", sa.Column("widget_default_locale", sa.String(length=10), nullable=False, server_default="en"))
    op.add_column("organizations", sa.Column("widget_supported_locales", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{\"locales\": [\"en\"]}'::jsonb")))

    # Migrate operating_hours default to richer shape (kept JSONB; defaults are advisory)
    op.execute("UPDATE organizations SET operating_hours = '{\"enabled\": false, \"timezone\": \"UTC\", \"schedule\": {}}'::jsonb WHERE operating_hours IS NULL OR operating_hours::text = '{\"enabled\": false}'")

    # Sessions: identity & tracking
    op.add_column("sessions", sa.Column("locale", sa.String(length=10), nullable=True))
    op.add_column("sessions", sa.Column("custom_variables", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")))
    op.add_column("sessions", sa.Column("page_history", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{\"items\": []}'::jsonb")))
    op.add_column("sessions", sa.Column("is_banned", sa.Boolean(), nullable=False, server_default=sa.text("false")))

    # ChatWidget table
    op.create_table(
        "chat_widgets",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("slug", sa.String(length=100), nullable=False, unique=True),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("config", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("is_default", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )

    # Products table (for product cards in Phase 1.37 + Phase 14)
    op.create_table(
        "products",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("sku", sa.String(length=120), nullable=True),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("price", sa.Numeric(12, 2), nullable=True),
        sa.Column("currency", sa.String(length=8), nullable=False, server_default="USD"),
        sa.Column("image_url", sa.Text(), nullable=True),
        sa.Column("product_url", sa.Text(), nullable=True),
        sa.Column("meta", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )
    op.create_index("ix_products_org_sku", "products", ["organization_id", "sku"])


def downgrade() -> None:
    op.drop_index("ix_products_org_sku", table_name="products")
    op.drop_table("products")
    op.drop_table("chat_widgets")
    for col in ("is_banned", "page_history", "custom_variables", "locale"):
        op.drop_column("sessions", col)
    for col in (
        "widget_supported_locales", "widget_default_locale", "widget_max_upload_mb", "widget_allow_attachments",
        "widget_lazy_load", "widget_sound_enabled", "widget_brand_url", "widget_brand_text",
        "widget_white_label", "widget_eye_catcher", "widget_greetings", "widget_custom_js",
    ):
        op.drop_column("organizations", col)
