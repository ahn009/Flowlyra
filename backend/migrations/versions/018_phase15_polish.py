"""Phase 15 polish foundations.

Revision ID: 018_phase15_polish
Revises: 017_phase14_ecommerce_foundation
Create Date: 2026-05-18
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "018_phase15_polish"
down_revision = "017_phase14_ecommerce_foundation"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("organizations", sa.Column("dashboard_logo_url", sa.Text(), nullable=True))
    op.add_column("organizations", sa.Column("dashboard_primary_color", sa.String(length=7), nullable=False, server_default="#0F172A"))
    op.add_column("organizations", sa.Column("dashboard_custom_domain", sa.String(length=255), nullable=True))
    op.add_column(
        "organizations",
        sa.Column(
            "dashboard_domain_verification",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
    )
    op.add_column("organizations", sa.Column("email_sender_domain", sa.String(length=255), nullable=True))
    op.add_column(
        "organizations",
        sa.Column(
            "email_sender_verification",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
    )
    op.add_column("organizations", sa.Column("status_page_public", sa.Boolean(), nullable=False, server_default=sa.text("true")))
    op.add_column("organizations", sa.Column("help_widget_enabled", sa.Boolean(), nullable=False, server_default=sa.text("true")))
    op.create_index("ix_organizations_dashboard_custom_domain", "organizations", ["dashboard_custom_domain"], unique=False)

    op.create_table(
        "status_incidents",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_by_user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("status", sa.String(length=30), nullable=False),
        sa.Column("impact", sa.String(length=20), nullable=False),
        sa.Column("is_public", sa.Boolean(), nullable=False),
        sa.Column("components", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["created_by_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_status_incidents_org", "status_incidents", ["organization_id"], unique=False)
    op.create_index("ix_status_incidents_status", "status_incidents", ["status"], unique=False)
    op.create_index("ix_status_incidents_public", "status_incidents", ["is_public"], unique=False)
    op.create_index("ix_status_incidents_started_at", "status_incidents", ["started_at"], unique=False)

    op.create_table(
        "marketing_posts",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("author_user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("slug", sa.String(length=160), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("excerpt", sa.Text(), nullable=False),
        sa.Column("content_markdown", sa.Text(), nullable=False),
        sa.Column("cover_image_url", sa.Text(), nullable=True),
        sa.Column("tags", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("is_published", sa.Boolean(), nullable=False),
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["author_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("organization_id", "slug", name="uq_marketing_posts_org_slug"),
    )
    op.create_index("ix_marketing_posts_org", "marketing_posts", ["organization_id"], unique=False)
    op.create_index("ix_marketing_posts_published", "marketing_posts", ["is_published"], unique=False)
    op.create_index("ix_marketing_posts_published_at", "marketing_posts", ["published_at"], unique=False)

    op.create_table(
        "onboarding_drip_events",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("step_key", sa.String(length=60), nullable=False),
        sa.Column("email_to", sa.String(length=255), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("metadata", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("sent_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("organization_id", "user_id", "step_key", name="uq_onboarding_drip_step"),
    )
    op.create_index("ix_onboarding_drip_org", "onboarding_drip_events", ["organization_id"], unique=False)
    op.create_index("ix_onboarding_drip_user", "onboarding_drip_events", ["user_id"], unique=False)
    op.create_index("ix_onboarding_drip_status", "onboarding_drip_events", ["status"], unique=False)
    op.create_index("ix_onboarding_drip_sent_at", "onboarding_drip_events", ["sent_at"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_onboarding_drip_sent_at", table_name="onboarding_drip_events")
    op.drop_index("ix_onboarding_drip_status", table_name="onboarding_drip_events")
    op.drop_index("ix_onboarding_drip_user", table_name="onboarding_drip_events")
    op.drop_index("ix_onboarding_drip_org", table_name="onboarding_drip_events")
    op.drop_table("onboarding_drip_events")

    op.drop_index("ix_marketing_posts_published_at", table_name="marketing_posts")
    op.drop_index("ix_marketing_posts_published", table_name="marketing_posts")
    op.drop_index("ix_marketing_posts_org", table_name="marketing_posts")
    op.drop_table("marketing_posts")

    op.drop_index("ix_status_incidents_started_at", table_name="status_incidents")
    op.drop_index("ix_status_incidents_public", table_name="status_incidents")
    op.drop_index("ix_status_incidents_status", table_name="status_incidents")
    op.drop_index("ix_status_incidents_org", table_name="status_incidents")
    op.drop_table("status_incidents")

    op.drop_index("ix_organizations_dashboard_custom_domain", table_name="organizations")
    op.drop_column("organizations", "help_widget_enabled")
    op.drop_column("organizations", "status_page_public")
    op.drop_column("organizations", "email_sender_verification")
    op.drop_column("organizations", "email_sender_domain")
    op.drop_column("organizations", "dashboard_domain_verification")
    op.drop_column("organizations", "dashboard_custom_domain")
    op.drop_column("organizations", "dashboard_primary_color")
    op.drop_column("organizations", "dashboard_logo_url")
