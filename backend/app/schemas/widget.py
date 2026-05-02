from pydantic import BaseModel


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
    custom_css: str | None


class WidgetInitResponse(BaseModel):
    organization_id: str
    session_token: str
    existing_chat_id: str | None
    is_online: bool
    widget_config: WidgetConfig
