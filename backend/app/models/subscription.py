"""Subscription model — tracks Stripe subscription state per organization."""
from datetime import datetime
import uuid

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base
from app.models.base import UUIDPkMixin


class Subscription(UUIDPkMixin, Base):
    __tablename__ = "subscriptions"

    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), unique=True, index=True
    )
    stripe_customer_id: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    stripe_subscription_id: Mapped[str | None] = mapped_column(String(255), unique=True, index=True)
    stripe_price_id: Mapped[str | None] = mapped_column(String(255))
    plan: Mapped[str] = mapped_column(String(30), default="starter")
    status: Mapped[str] = mapped_column(String(30), default="trialing")
    billing_interval: Mapped[str] = mapped_column(String(20), default="month")
    seat_quantity: Mapped[int] = mapped_column(Integer, default=1)
    trial_ends_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    current_period_start: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    current_period_end: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    cancel_at_period_end: Mapped[bool] = mapped_column(Boolean, default=False)
    canceled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    ended_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    payment_method_brand: Mapped[str | None] = mapped_column(String(30))
    payment_method_last4: Mapped[str | None] = mapped_column(String(4))
    latest_invoice_status: Mapped[str | None] = mapped_column(String(30))
    dunning_attempts: Mapped[int] = mapped_column(Integer, default=0)
    metadata_: Mapped[dict] = mapped_column("metadata", JSONB, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
