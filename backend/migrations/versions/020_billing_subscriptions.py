"""Billing subscriptions and Stripe customer IDs.

Revision ID: 020_billing_subscriptions
Revises: 019_parity_gaps
Create Date: 2026-05-29
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "020_billing_subscriptions"
down_revision = "019_parity_gaps"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("organizations", sa.Column("stripe_customer_id", sa.String(length=255), nullable=True))
    op.create_index("ix_organizations_stripe_customer_id", "organizations", ["stripe_customer_id"])

    op.create_table(
        "subscriptions",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("stripe_customer_id", sa.String(length=255), nullable=False),
        sa.Column("stripe_subscription_id", sa.String(length=255), nullable=True),
        sa.Column("stripe_price_id", sa.String(length=255), nullable=True),
        sa.Column("plan", sa.String(length=30), nullable=False, server_default="starter"),
        sa.Column("status", sa.String(length=30), nullable=False, server_default="trialing"),
        sa.Column("billing_interval", sa.String(length=20), nullable=False, server_default="month"),
        sa.Column("seat_quantity", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("trial_ends_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("current_period_start", sa.DateTime(timezone=True), nullable=True),
        sa.Column("current_period_end", sa.DateTime(timezone=True), nullable=True),
        sa.Column("cancel_at_period_end", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("canceled_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("ended_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("payment_method_brand", sa.String(length=30), nullable=True),
        sa.Column("payment_method_last4", sa.String(length=4), nullable=True),
        sa.Column("latest_invoice_status", sa.String(length=30), nullable=True),
        sa.Column("dunning_attempts", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("metadata", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("organization_id"),
    )
    op.create_index("ix_subscriptions_organization_id", "subscriptions", ["organization_id"])
    op.create_index("ix_subscriptions_stripe_customer_id", "subscriptions", ["stripe_customer_id"], unique=True)
    op.create_index("ix_subscriptions_stripe_subscription_id", "subscriptions", ["stripe_subscription_id"], unique=True)


def downgrade() -> None:
    op.drop_index("ix_subscriptions_stripe_subscription_id", table_name="subscriptions")
    op.drop_index("ix_subscriptions_stripe_customer_id", table_name="subscriptions")
    op.drop_index("ix_subscriptions_organization_id", table_name="subscriptions")
    op.drop_table("subscriptions")
    op.drop_index("ix_organizations_stripe_customer_id", table_name="organizations")
    op.drop_column("organizations", "stripe_customer_id")
