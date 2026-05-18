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
    widget_custom_js: Mapped[str | None] = mapped_column(Text)
    widget_greetings: Mapped[JsonDict] = mapped_column(JSONB, default=lambda: {"items": []})
    widget_eye_catcher: Mapped[JsonDict] = mapped_column(JSONB, default=lambda: {"enabled": False, "image_url": None, "text": None})
    widget_white_label: Mapped[bool] = mapped_column(Boolean, default=False)
    widget_brand_text: Mapped[str | None] = mapped_column(String(255), default="FlowLyra")
    widget_brand_url: Mapped[str | None] = mapped_column(Text)
    widget_sound_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    widget_lazy_load: Mapped[bool] = mapped_column(Boolean, default=False)
    widget_allow_attachments: Mapped[bool] = mapped_column(Boolean, default=True)
    widget_max_upload_mb: Mapped[int] = mapped_column(Integer, default=10)
    widget_default_locale: Mapped[str] = mapped_column(String(10), default="en")
    widget_supported_locales: Mapped[JsonDict] = mapped_column(JSONB, default=lambda: {"locales": ["en"]})
    widget_giphy_api_key: Mapped[str | None] = mapped_column(String(255))
    dashboard_logo_url: Mapped[str | None] = mapped_column(Text)
    dashboard_primary_color: Mapped[str] = mapped_column(String(7), default="#0F172A")
    dashboard_custom_domain: Mapped[str | None] = mapped_column(String(255), index=True)
    dashboard_domain_verification: Mapped[JsonDict] = mapped_column(JSONB, default=lambda: {"status": "unconfigured", "token": None, "last_checked_at": None})
    email_sender_domain: Mapped[str | None] = mapped_column(String(255))
    email_sender_verification: Mapped[JsonDict] = mapped_column(JSONB, default=lambda: {"status": "unconfigured", "dkim": {}, "spf": {}, "last_checked_at": None})
    status_page_public: Mapped[bool] = mapped_column(Boolean, default=True)
    help_widget_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    operating_hours: Mapped[JsonDict] = mapped_column(JSONB, default=lambda: {"enabled": False, "timezone": "UTC", "schedule": {}})
    sla_config: Mapped[JsonDict] = mapped_column(JSONB, default=lambda: {"enabled": False})
    cors_origin_allowlist: Mapped[JsonDict] = mapped_column(JSONB, default=lambda: {"origins": []})
    ip_allowlist: Mapped[JsonDict] = mapped_column(JSONB, default=lambda: {"enabled": False, "cidrs": []})
    enforce_two_factor: Mapped[bool] = mapped_column(Boolean, default=False)
    captcha_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    captcha_provider: Mapped[str] = mapped_column(String(30), default="hcaptcha")
    cookie_consent: Mapped[JsonDict] = mapped_column(JSONB, default=lambda: {"enabled": False, "text": None})
    feature_flags: Mapped[JsonDict] = mapped_column(JSONB, default=dict)
    locale_default: Mapped[str] = mapped_column(String(10), default="en")
    timezone: Mapped[str] = mapped_column(String(100), default="UTC")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    trial_ends_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    users = relationship("User", back_populates="organization", cascade="all, delete-orphan")
    memberships = relationship("WorkspaceMembership", back_populates="organization", cascade="all, delete-orphan")
