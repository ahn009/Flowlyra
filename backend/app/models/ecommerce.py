from __future__ import annotations

from datetime import datetime
import uuid

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, Numeric, String, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base
from app.models.base import JsonDict, UUIDPkMixin


class Cart(UUIDPkMixin, Base):
    __tablename__ = "carts"
    __table_args__ = (
        UniqueConstraint("organization_id", "session_id", "status", name="uq_cart_org_session_status"),
    )

    organization_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), index=True)
    session_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("sessions.id", ondelete="SET NULL"), index=True)
    contact_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("contacts.id", ondelete="SET NULL"), index=True)
    chat_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("chats.id", ondelete="SET NULL"), index=True)

    status: Mapped[str] = mapped_column(String(20), default="active", index=True)  # active|abandoned|recovered|converted
    currency: Mapped[str] = mapped_column(String(8), default="USD")
    subtotal: Mapped[float] = mapped_column(Numeric(12, 2), default=0)
    discount_total: Mapped[float] = mapped_column(Numeric(12, 2), default=0)
    total: Mapped[float] = mapped_column(Numeric(12, 2), default=0)
    item_count: Mapped[int] = mapped_column(Integer, default=0)

    external_cart_id: Mapped[str | None] = mapped_column(String(120), index=True)
    source: Mapped[str | None] = mapped_column(String(40))
    meta: Mapped[JsonDict] = mapped_column(JSONB, default=dict)

    last_activity_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)
    converted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class CartItem(UUIDPkMixin, Base):
    __tablename__ = "cart_items"
    __table_args__ = (
        UniqueConstraint("cart_id", "product_id", "sku", name="uq_cart_item_identity"),
    )

    cart_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("carts.id", ondelete="CASCADE"), index=True)
    product_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("products.id", ondelete="SET NULL"), index=True)
    sku: Mapped[str | None] = mapped_column(String(120), index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, default=1)
    unit_price: Mapped[float] = mapped_column(Numeric(12, 2), default=0)
    currency: Mapped[str] = mapped_column(String(8), default="USD")
    line_total: Mapped[float] = mapped_column(Numeric(12, 2), default=0)
    image_url: Mapped[str | None] = mapped_column(Text)
    product_url: Mapped[str | None] = mapped_column(Text)
    meta: Mapped[JsonDict] = mapped_column(JSONB, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class Order(UUIDPkMixin, Base):
    __tablename__ = "orders"
    __table_args__ = (
        UniqueConstraint("organization_id", "order_number", name="uq_order_org_number"),
    )

    organization_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), index=True)
    contact_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("contacts.id", ondelete="SET NULL"), index=True)
    cart_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("carts.id", ondelete="SET NULL"), index=True)
    chat_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("chats.id", ondelete="SET NULL"), index=True)

    order_number: Mapped[str] = mapped_column(String(120), nullable=False, index=True)
    external_order_id: Mapped[str | None] = mapped_column(String(120), index=True)
    email: Mapped[str | None] = mapped_column(String(320), index=True)
    status: Mapped[str] = mapped_column(String(40), default="placed", index=True)

    currency: Mapped[str] = mapped_column(String(8), default="USD")
    subtotal: Mapped[float] = mapped_column(Numeric(12, 2), default=0)
    tax_total: Mapped[float] = mapped_column(Numeric(12, 2), default=0)
    shipping_total: Mapped[float] = mapped_column(Numeric(12, 2), default=0)
    discount_total: Mapped[float] = mapped_column(Numeric(12, 2), default=0)
    total: Mapped[float] = mapped_column(Numeric(12, 2), default=0)

    source: Mapped[str | None] = mapped_column(String(40))
    is_refunded: Mapped[bool] = mapped_column(Boolean, default=False)
    placed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), index=True)
    fulfilled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    cancelled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    meta: Mapped[JsonDict] = mapped_column(JSONB, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class OrderItem(UUIDPkMixin, Base):
    __tablename__ = "order_items"

    order_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("orders.id", ondelete="CASCADE"), index=True)
    product_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("products.id", ondelete="SET NULL"), index=True)
    sku: Mapped[str | None] = mapped_column(String(120), index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, default=1)
    unit_price: Mapped[float] = mapped_column(Numeric(12, 2), default=0)
    currency: Mapped[str] = mapped_column(String(8), default="USD")
    line_total: Mapped[float] = mapped_column(Numeric(12, 2), default=0)
    image_url: Mapped[str | None] = mapped_column(Text)
    product_url: Mapped[str | None] = mapped_column(Text)
    meta: Mapped[JsonDict] = mapped_column(JSONB, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
