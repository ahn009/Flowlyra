from pydantic import BaseModel, Field


class WidgetInitRequest(BaseModel):
    org_slug: str
    session_token: str | None = None
    url: str | None = None
    referrer: str | None = None
    user_agent: str | None = None
    email: str | None = None
    full_name: str | None = None


class WidgetConfig(BaseModel):
    color: str
    greeting: str
    logo_url: str | None
    position: str
    theme: str = "auto"
    pre_chat_form: dict = Field(default_factory=lambda: {"enabled": True, "fields": ["name", "email", "subject", "message"]})
    post_chat_survey: dict = Field(default_factory=lambda: {"enabled": True, "type": "csat_5"})
    custom_css: str | None


class WidgetInitResponse(BaseModel):
    organization_id: str
    session_token: str
    existing_chat_id: str | None
    is_online: bool
    widget_config: WidgetConfig


class WidgetHistoryRequest(BaseModel):
    org_slug: str
    session_token: str
    chat_id: str


class WidgetHistoryResponse(BaseModel):
    messages: list[dict]
