from datetime import datetime

from sqlalchemy import Boolean, DateTime, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base
from app.models.base import JsonDict, UUIDPkMixin


class Organization(UUIDPkMixin, Base):
    __tablename__ = "organizations"

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    plan: Mapped[str] = mapped_column(String(30), default="starter")
    seats: Mapped[int] = mapped_column(Integer, default=1)
    widget_color: Mapped[str] = mapped_column(String(7), default="#1E40AF")
    widget_logo_url: Mapped[str | None] = mapped_column(Text)
    widget_greeting: Mapped[str] = mapped_column(Text, default="Hi! How can we help you today?")
    widget_position: Mapped[str] = mapped_column(String(20), default="bottom-right")
    widget_theme: Mapped[str] = mapped_column(String(20), default="auto")
    widget_domain_allowlist: Mapped[JsonDict] = mapped_column(JSONB, default=lambda: {"domains": []})
    widget_pre_chat_form: Mapped[JsonDict] = mapped_column(JSONB, default=lambda: {"enabled": True, "fields": ["name", "email", "subject", "message"]})
    widget_post_chat_survey: Mapped[JsonDict] = mapped_column(JSONB, default=lambda: {"enabled": True, "type": "csat_5"})
    widget_custom_css: Mapped[str | None] = mapped_column(Text)
    operating_hours: Mapped[JsonDict] = mapped_column(JSONB, default=lambda: {"enabled": False})
    sla_config: Mapped[JsonDict] = mapped_column(JSONB, default=lambda: {"enabled": False})
    timezone: Mapped[str] = mapped_column(String(100), default="UTC")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    trial_ends_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    users = relationship("User", back_populates="organization", cascade="all, delete-orphan")
