"""Phase 14 ecommerce foundation: products sync fields, carts, orders.

Revision ID: 017_phase14_ecommerce_foundation
Revises: 016_phase13_pwa_push_notifications
Create Date: 2026-05-18
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "017_phase14_ecommerce_foundation"
down_revision = "016_phase13_pwa_push_notifications"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("products", sa.Column("provider", sa.String(length=40), nullable=True))
    op.add_column("products", sa.Column("external_product_id", sa.String(length=120), nullable=True))
    op.add_column("products", sa.Column("variant_id", sa.String(length=120), nullable=True))
    op.add_column("products", sa.Column("inventory", sa.Integer(), nullable=False, server_default="0"))
    op.add_column("products", sa.Column("is_in_stock", sa.Boolean(), nullable=False, server_default=sa.text("true")))
    op.add_column("products", sa.Column("category", sa.String(length=120), nullable=True))
    op.add_column("products", sa.Column("brand", sa.String(length=120), nullable=True))
    op.create_index("ix_products_org_external", "products", ["organization_id", "provider", "external_product_id"])

    op.create_table(
        "carts",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False),
        sa.Column("session_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("sessions.id", ondelete="SET NULL"), nullable=True),
        sa.Column("contact_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("contacts.id", ondelete="SET NULL"), nullable=True),
        sa.Column("chat_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("chats.id", ondelete="SET NULL"), nullable=True),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="active"),
        sa.Column("currency", sa.String(length=8), nullable=False, server_default="USD"),
        sa.Column("subtotal", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column("discount_total", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column("total", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column("item_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("external_cart_id", sa.String(length=120), nullable=True),
        sa.Column("source", sa.String(length=40), nullable=True),
        sa.Column("meta", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("last_activity_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("converted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.UniqueConstraint("organization_id", "session_id", "status", name="uq_cart_org_session_status"),
    )
    op.create_index("ix_carts_org", "carts", ["organization_id"])
    op.create_index("ix_carts_session", "carts", ["session_id"])
    op.create_index("ix_carts_contact", "carts", ["contact_id"])
    op.create_index("ix_carts_chat", "carts", ["chat_id"])
    op.create_index("ix_carts_status", "carts", ["status"])
    op.create_index("ix_carts_last_activity", "carts", ["last_activity_at"])

    op.create_table(
        "cart_items",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("cart_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("carts.id", ondelete="CASCADE"), nullable=False),
        sa.Column("product_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("products.id", ondelete="SET NULL"), nullable=True),
        sa.Column("sku", sa.String(length=120), nullable=True),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("unit_price", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column("currency", sa.String(length=8), nullable=False, server_default="USD"),
        sa.Column("line_total", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column("image_url", sa.Text(), nullable=True),
        sa.Column("product_url", sa.Text(), nullable=True),
        sa.Column("meta", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.UniqueConstraint("cart_id", "product_id", "sku", name="uq_cart_item_identity"),
    )
    op.create_index("ix_cart_items_cart", "cart_items", ["cart_id"])
    op.create_index("ix_cart_items_product", "cart_items", ["product_id"])
    op.create_index("ix_cart_items_sku", "cart_items", ["sku"])

    op.create_table(
        "orders",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False),
        sa.Column("contact_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("contacts.id", ondelete="SET NULL"), nullable=True),
        sa.Column("cart_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("carts.id", ondelete="SET NULL"), nullable=True),
        sa.Column("chat_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("chats.id", ondelete="SET NULL"), nullable=True),
        sa.Column("order_number", sa.String(length=120), nullable=False),
        sa.Column("external_order_id", sa.String(length=120), nullable=True),
        sa.Column("email", sa.String(length=320), nullable=True),
        sa.Column("status", sa.String(length=40), nullable=False, server_default="placed"),
        sa.Column("currency", sa.String(length=8), nullable=False, server_default="USD"),
        sa.Column("subtotal", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column("tax_total", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column("shipping_total", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column("discount_total", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column("total", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column("source", sa.String(length=40), nullable=True),
        sa.Column("is_refunded", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("placed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("fulfilled_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("cancelled_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("meta", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.UniqueConstraint("organization_id", "order_number", name="uq_order_org_number"),
    )
    op.create_index("ix_orders_org", "orders", ["organization_id"])
    op.create_index("ix_orders_contact", "orders", ["contact_id"])
    op.create_index("ix_orders_cart", "orders", ["cart_id"])
    op.create_index("ix_orders_chat", "orders", ["chat_id"])
    op.create_index("ix_orders_number", "orders", ["order_number"])
    op.create_index("ix_orders_external", "orders", ["external_order_id"])
    op.create_index("ix_orders_email", "orders", ["email"])
    op.create_index("ix_orders_status", "orders", ["status"])
    op.create_index("ix_orders_placed_at", "orders", ["placed_at"])

    op.create_table(
        "order_items",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("order_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("orders.id", ondelete="CASCADE"), nullable=False),
        sa.Column("product_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("products.id", ondelete="SET NULL"), nullable=True),
        sa.Column("sku", sa.String(length=120), nullable=True),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("unit_price", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column("currency", sa.String(length=8), nullable=False, server_default="USD"),
        sa.Column("line_total", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column("image_url", sa.Text(), nullable=True),
        sa.Column("product_url", sa.Text(), nullable=True),
        sa.Column("meta", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )
    op.create_index("ix_order_items_order", "order_items", ["order_id"])
    op.create_index("ix_order_items_product", "order_items", ["product_id"])
    op.create_index("ix_order_items_sku", "order_items", ["sku"])


def downgrade() -> None:
    op.drop_index("ix_order_items_sku", table_name="order_items")
    op.drop_index("ix_order_items_product", table_name="order_items")
    op.drop_index("ix_order_items_order", table_name="order_items")
    op.drop_table("order_items")

    op.drop_index("ix_orders_placed_at", table_name="orders")
    op.drop_index("ix_orders_status", table_name="orders")
    op.drop_index("ix_orders_email", table_name="orders")
    op.drop_index("ix_orders_external", table_name="orders")
    op.drop_index("ix_orders_number", table_name="orders")
    op.drop_index("ix_orders_chat", table_name="orders")
    op.drop_index("ix_orders_cart", table_name="orders")
    op.drop_index("ix_orders_contact", table_name="orders")
    op.drop_index("ix_orders_org", table_name="orders")
    op.drop_table("orders")

    op.drop_index("ix_cart_items_sku", table_name="cart_items")
    op.drop_index("ix_cart_items_product", table_name="cart_items")
    op.drop_index("ix_cart_items_cart", table_name="cart_items")
    op.drop_table("cart_items")

    op.drop_index("ix_carts_last_activity", table_name="carts")
    op.drop_index("ix_carts_status", table_name="carts")
    op.drop_index("ix_carts_chat", table_name="carts")
    op.drop_index("ix_carts_contact", table_name="carts")
    op.drop_index("ix_carts_session", table_name="carts")
    op.drop_index("ix_carts_org", table_name="carts")
    op.drop_table("carts")

    op.drop_index("ix_products_org_external", table_name="products")
    op.drop_column("products", "brand")
    op.drop_column("products", "category")
    op.drop_column("products", "is_in_stock")
    op.drop_column("products", "inventory")
    op.drop_column("products", "variant_id")
    op.drop_column("products", "external_product_id")
    op.drop_column("products", "provider")
