"""Phase 3 ticketing depth models and columns.

Revision ID: 006_phase3_ticketing_depth
Revises: 005_phase1_widget_giphy_key
Create Date: 2026-05-18
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "006_phase3_ticketing_depth"
down_revision = "005_phase1_widget_giphy_key"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("tickets", sa.Column("custom_fields", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")))
    op.add_column("tickets", sa.Column("saved_view_key", sa.String(length=120), nullable=True))
    op.add_column("tickets", sa.Column("merged_into_ticket_id", postgresql.UUID(as_uuid=True), nullable=True))
    op.add_column("tickets", sa.Column("parent_ticket_id", postgresql.UUID(as_uuid=True), nullable=True))
    op.add_column("tickets", sa.Column("email_thread_id", sa.String(length=255), nullable=True))
    op.add_column("tickets", sa.Column("email_message_ids", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{\"items\": []}'::jsonb")))
    op.add_column("tickets", sa.Column("portal_enabled", sa.Boolean(), nullable=False, server_default=sa.text("false")))
    op.add_column("tickets", sa.Column("sla_first_response_due_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("tickets", sa.Column("sla_resolution_due_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("tickets", sa.Column("sla_policy_id", postgresql.UUID(as_uuid=True), nullable=True))
    op.add_column("tickets", sa.Column("first_response_breached", sa.Boolean(), nullable=False, server_default=sa.text("false")))
    op.add_column("tickets", sa.Column("resolution_breached", sa.Boolean(), nullable=False, server_default=sa.text("false")))
    op.create_foreign_key("fk_tickets_merged_into", "tickets", "tickets", ["merged_into_ticket_id"], ["id"])
    op.create_foreign_key("fk_tickets_parent_ticket", "tickets", "tickets", ["parent_ticket_id"], ["id"])

    op.add_column("ticket_comments", sa.Column("content_format", sa.String(length=20), nullable=False, server_default="plain"))
    op.add_column("ticket_comments", sa.Column("time_spent_minutes", sa.Integer(), nullable=True))

    op.create_table(
        "sla_policies",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("priority", sa.String(length=20), nullable=True),
        sa.Column("team_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("teams.id"), nullable=True),
        sa.Column("plan", sa.String(length=30), nullable=True),
        sa.Column("first_response_minutes", sa.Integer(), nullable=False, server_default="60"),
        sa.Column("resolution_minutes", sa.Integer(), nullable=False, server_default="1440"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )
    op.create_foreign_key("fk_tickets_sla_policy", "tickets", "sla_policies", ["sla_policy_id"], ["id"])

    op.create_table(
        "ticket_activities",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("ticket_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tickets.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("actor_user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("event_type", sa.String(length=80), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("body", sa.Text(), nullable=True),
        sa.Column("meta", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )

    op.create_table(
        "ticket_followers",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("ticket_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tickets.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.UniqueConstraint("ticket_id", "user_id", name="uq_ticket_follower_ticket_user"),
    )

    op.create_table(
        "ticket_saved_views",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("filters", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("is_shared", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )

    op.create_table(
        "ticket_workflows",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("trigger_type", sa.String(length=60), nullable=False, server_default="on_create"),
        sa.Column("conditions", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("actions", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )

    op.create_table(
        "ticket_time_entries",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("ticket_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tickets.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("minutes", sa.Integer(), nullable=False),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("billable_rate", sa.Numeric(10, 2), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )

    op.create_table(
        "ticket_custom_fields",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("label", sa.String(length=255), nullable=False),
        sa.Column("field_type", sa.String(length=30), nullable=False, server_default="text"),
        sa.Column("options", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("required", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )

    op.create_table(
        "ticket_custom_field_values",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("ticket_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tickets.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("field_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("ticket_custom_fields.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("value", sa.Text(), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.UniqueConstraint("ticket_id", "field_id", name="uq_ticket_custom_field_value"),
    )

    op.create_table(
        "ticket_relations",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("ticket_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tickets.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("related_ticket_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tickets.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("relation_type", sa.String(length=40), nullable=False, server_default="related"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.UniqueConstraint("ticket_id", "related_ticket_id", "relation_type", name="uq_ticket_relation"),
    )

    op.create_table(
        "ticket_portal_tokens",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("contact_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("contacts.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("token", sa.String(length=128), nullable=False, unique=True, index=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("consumed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )


def downgrade() -> None:
    op.drop_table("ticket_portal_tokens")
    op.drop_table("ticket_relations")
    op.drop_table("ticket_custom_field_values")
    op.drop_table("ticket_custom_fields")
    op.drop_table("ticket_time_entries")
    op.drop_table("ticket_workflows")
    op.drop_table("ticket_saved_views")
    op.drop_table("ticket_followers")
    op.drop_table("ticket_activities")
    op.drop_constraint("fk_tickets_sla_policy", "tickets", type_="foreignkey")
    op.drop_table("sla_policies")
    op.drop_constraint("fk_tickets_parent_ticket", "tickets", type_="foreignkey")
    op.drop_constraint("fk_tickets_merged_into", "tickets", type_="foreignkey")
    for col in (
        "resolution_breached",
        "first_response_breached",
        "sla_policy_id",
        "sla_resolution_due_at",
        "sla_first_response_due_at",
        "portal_enabled",
        "email_message_ids",
        "email_thread_id",
        "parent_ticket_id",
        "merged_into_ticket_id",
        "saved_view_key",
        "custom_fields",
    ):
        op.drop_column("tickets", col)
    for col in ("time_spent_minutes", "content_format"):
        op.drop_column("ticket_comments", col)
