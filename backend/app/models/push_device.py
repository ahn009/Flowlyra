from datetime import datetime
import uuid

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, String, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base
from app.models.base import UUIDPkMixin


class PushDevice(UUIDPkMixin, Base):
    __tablename__ = "push_devices"
    __table_args__ = (
        UniqueConstraint("user_id", "channel", "endpoint", name="uq_push_device_user_channel_endpoint"),
        UniqueConstraint("user_id", "channel", "native_token", name="uq_push_device_user_channel_token"),
        Index("ix_push_device_org_channel", "organization_id", "channel"),
        Index("ix_push_device_user_active", "user_id", "is_active"),
    )

    organization_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), index=True)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True)

    # web | ios | android | desktop
    channel: Mapped[str] = mapped_column(String(20), nullable=False)

    # Browser PushSubscription fields.
    endpoint: Mapped[str | None] = mapped_column(Text)
    p256dh: Mapped[str | None] = mapped_column(Text)
    auth: Mapped[str | None] = mapped_column(Text)

    # Native push token (FCM/APNs).
    native_token: Mapped[str | None] = mapped_column(Text)

    user_agent: Mapped[str | None] = mapped_column(Text)
    platform: Mapped[str | None] = mapped_column(String(40))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    last_seen_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    last_sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    last_error: Mapped[str | None] = mapped_column(Text)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
