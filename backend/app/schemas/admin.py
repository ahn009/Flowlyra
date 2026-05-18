from uuid import UUID

from pydantic import BaseModel, Field


class OrgUpdate(BaseModel):
    name: str | None = None
    plan: str | None = None
    widget_color: str | None = Field(default=None, pattern=r"^#[0-9A-Fa-f]{6}$")
    widget_logo_url: str | None = None
    widget_greeting: str | None = None
    widget_position: str | None = None
    widget_theme: str | None = None
    widget_domain_allowlist: dict | None = None
    widget_pre_chat_form: dict | None = None
    widget_post_chat_survey: dict | None = None
    widget_custom_css: str | None = None
    widget_custom_js: str | None = None
    widget_greetings: dict | None = None
    widget_eye_catcher: dict | None = None
    widget_white_label: bool | None = None
    widget_brand_text: str | None = None
    widget_brand_url: str | None = None
    widget_sound_enabled: bool | None = None
    widget_lazy_load: bool | None = None
    widget_allow_attachments: bool | None = None
    widget_max_upload_mb: int | None = Field(default=None, ge=1, le=100)
    widget_default_locale: str | None = None
    widget_supported_locales: dict | None = None
    widget_giphy_api_key: str | None = None
    dashboard_logo_url: str | None = None
    dashboard_primary_color: str | None = Field(default=None, pattern=r"^#[0-9A-Fa-f]{6}$")
    dashboard_custom_domain: str | None = None
    dashboard_domain_verification: dict | None = None
    email_sender_domain: str | None = None
    email_sender_verification: dict | None = None
    status_page_public: bool | None = None
    help_widget_enabled: bool | None = None
    operating_hours: dict | None = None
    sla_config: dict | None = None
    timezone: str | None = None
    feature_flags: dict | None = None


class TeamCreate(BaseModel):
    name: str
    description: str | None = None
    routing_mode: str = "round_robin"


class CannedCreate(BaseModel):
    shortcut: str
    title: str
    content: str
    tags: list[str] = []


class RuleCreate(BaseModel):
    name: str
    priority: int = 0
    conditions: dict
    action: dict
    is_active: bool = True


class TriggerCreate(BaseModel):
    name: str
    trigger_type: str
    conditions: dict
    message: str
    assigned_team_id: UUID | None = None
    is_active: bool = True


class MemberRequest(BaseModel):
    user_id: UUID


class ChatWidgetCreate(BaseModel):
    slug: str = Field(min_length=2, max_length=100, pattern=r"^[a-z0-9][a-z0-9-]*$")
    name: str = Field(min_length=2, max_length=255)
    description: str | None = None
    config: dict = Field(default_factory=dict)
    is_default: bool = False
    is_active: bool = True


class ChatWidgetUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=255)
    description: str | None = None
    config: dict | None = None
    is_default: bool | None = None
    is_active: bool | None = None
