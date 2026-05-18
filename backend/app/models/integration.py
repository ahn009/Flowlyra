from datetime import datetime
import uuid

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, Integer, String, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base
from app.models.base import JsonDict, UUIDPkMixin


class Integration(UUIDPkMixin, Base):
    __tablename__ = "integrations"
    __table_args__ = (
        UniqueConstraint("organization_id", "provider", name="uq_integrations_org_provider"),
        Index("ix_integrations_org_status", "organization_id", "status"),
    )

    organization_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), index=True)
    provider: Mapped[str] = mapped_column(String(80), nullable=False, index=True)
    display_name: Mapped[str] = mapped_column(String(160), nullable=False)
    category: Mapped[str] = mapped_column(String(40), nullable=False, default="other")
    install_type: Mapped[str] = mapped_column(String(30), nullable=False, default="api_key")
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="installed")
    config: Mapped[JsonDict] = mapped_column(JSONB, default=dict)
    credentials: Mapped[JsonDict] = mapped_column(JSONB, default=dict)
    capabilities: Mapped[JsonDict] = mapped_column(JSONB, default=lambda: {"items": []})
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    health_status: Mapped[str] = mapped_column(String(20), default="unknown")
    failure_streak: Mapped[int] = mapped_column(Integer, default=0)
    last_sync_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    last_success_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    last_error_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    last_error_message: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class OAuthConnection(UUIDPkMixin, Base):
    __tablename__ = "oauth_connections"
    __table_args__ = (Index("ix_oauth_org_provider", "organization_id", "provider"),)

    organization_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), index=True)
    integration_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("integrations.id", ondelete="SET NULL"), index=True)
    provider: Mapped[str] = mapped_column(String(80), nullable=False)
    account_id: Mapped[str | None] = mapped_column(String(255))
    account_label: Mapped[str | None] = mapped_column(String(255))
    access_token: Mapped[str | None] = mapped_column(Text)
    refresh_token: Mapped[str | None] = mapped_column(Text)
    token_type: Mapped[str | None] = mapped_column(String(40))
    scopes: Mapped[JsonDict] = mapped_column(JSONB, default=lambda: {"items": []})
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    metadata_: Mapped[JsonDict] = mapped_column("metadata", JSONB, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class IntegrationLog(UUIDPkMixin, Base):
    __tablename__ = "integration_logs"
    __table_args__ = (Index("ix_integration_logs_integration_created", "integration_id", "created_at"),)

    integration_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("integrations.id", ondelete="CASCADE"), index=True)
    organization_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), index=True)
    level: Mapped[str] = mapped_column(String(10), default="info")
    event: Mapped[str] = mapped_column(String(80), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    payload: Mapped[JsonDict] = mapped_column(JSONB, default=dict)
    status_code: Mapped[int | None] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
