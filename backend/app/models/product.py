from datetime import datetime
import uuid

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, Numeric, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base
from app.models.base import JsonDict, UUIDPkMixin


class Product(UUIDPkMixin, Base):
    __tablename__ = "products"

    organization_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), index=True)
    provider: Mapped[str | None] = mapped_column(String(40), index=True)
    external_product_id: Mapped[str | None] = mapped_column(String(120), index=True)
    variant_id: Mapped[str | None] = mapped_column(String(120), index=True)
    sku: Mapped[str | None] = mapped_column(String(120), index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    price: Mapped[float | None] = mapped_column(Numeric(12, 2))
    currency: Mapped[str] = mapped_column(String(8), default="USD")
    inventory: Mapped[int] = mapped_column(Integer, default=0)
    is_in_stock: Mapped[bool] = mapped_column(Boolean, default=True)
    category: Mapped[str | None] = mapped_column(String(120))
    brand: Mapped[str | None] = mapped_column(String(120))
    image_url: Mapped[str | None] = mapped_column(Text)
    product_url: Mapped[str | None] = mapped_column(Text)
    meta: Mapped[JsonDict] = mapped_column(JSONB, default=dict)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
