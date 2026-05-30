from pydantic import BaseModel, EmailStr, Field


class WidgetInitRequest(BaseModel):
    org_slug: str
    widget_slug: str | None = None
    session_token: str | None = None
    url: str | None = None
    referrer: str | None = None
    user_agent: str | None = None
    locale: str | None = None
    email: str | None = None
    full_name: str | None = None
    visitor: dict | None = None  # name, email, phone, custom_variables
    page_title: str | None = None


class WidgetConfig(BaseModel):
    color: str
    greeting: str
    greetings: list[str] = Field(default_factory=list)
    logo_url: str | None = None
    position: str
    theme: str = "auto"
    pre_chat_form: dict = Field(default_factory=lambda: {"enabled": True, "fields": ["name", "email", "subject", "message"]})
    post_chat_survey: dict = Field(default_factory=lambda: {"enabled": True, "type": "csat_5"})
    custom_css: str | None = None
    custom_js: str | None = None
    eye_catcher: dict = Field(default_factory=dict)
    white_label: bool = False
    brand_text: str | None = "FlowLyra"
    brand_url: str | None = None
    sound_enabled: bool = True
    lazy_load: bool = False
    allow_attachments: bool = True
    max_upload_mb: int = 10
    locale: str = "en"
    supported_locales: list[str] = Field(default_factory=lambda: ["en"])
    giphy_api_key: str | None = None
    ice_servers: list[dict] = Field(default_factory=list)


class WidgetInitResponse(BaseModel):
    organization_id: str
    widget_slug: str | None = None
    session_token: str
    existing_chat_id: str | None
    is_online: bool
    is_within_hours: bool = True
    next_open_at: str | None = None
    widget_config: WidgetConfig
    i18n: dict[str, str] = Field(default_factory=dict)
    visitor: dict | None = None
    ice_servers: list[dict] = Field(default_factory=list)


class WidgetHistoryRequest(BaseModel):
    org_slug: str
    session_token: str
    chat_id: str


class WidgetHistoryResponse(BaseModel):
    messages: list[dict]


class WidgetLocaleRequest(BaseModel):
    org_slug: str
    locale: str


class WidgetLocaleResponse(BaseModel):
    locale: str
    catalog: dict[str, str]


class WidgetIdentifyRequest(BaseModel):
    org_slug: str
    session_token: str
    name: str | None = None
    email: EmailStr | None = None
    phone: str | None = None
    custom_variables: dict[str, str | int | float | bool | None] | None = None


class WidgetTrackEventRequest(BaseModel):
    org_slug: str
    session_token: str
    event: str
    value: float | None = None
    properties: dict = Field(default_factory=dict)


class WidgetPageViewRequest(BaseModel):
    org_slug: str
    session_token: str
    url: str
    title: str | None = None


class WidgetMagicLinkRequest(BaseModel):
    org_slug: str
    email: EmailStr


class WidgetMagicLinkConsumeRequest(BaseModel):
    org_slug: str
    token: str


class WidgetOfflineRequest(BaseModel):
    org_slug: str
    session_token: str | None = None
    email: EmailStr
    name: str | None = None
    phone: str | None = None
    message: str = Field(min_length=1)
    page_url: str | None = None


class WidgetProductSearchRequest(BaseModel):
    org_slug: str
    session_token: str
    query: str | None = None
    sku: str | None = None
    limit: int = Field(default=12, ge=1, le=50)


class WidgetCatalogRequest(BaseModel):
    org_slug: str
    session_token: str
    query: str | None = None
    category: str | None = None
    cursor: str | None = None
    limit: int = Field(default=12, ge=1, le=50)


class WidgetOrderLookupRequest(BaseModel):
    org_slug: str
    session_token: str
    order_number: str | None = None
    email: EmailStr | None = None
    limit: int = Field(default=5, ge=1, le=20)


class WidgetPriceFormatRequest(BaseModel):
    org_slug: str
    session_token: str
    amount: float
    currency: str = "USD"
    locale: str | None = None


class WidgetCheckoutAssistRequest(BaseModel):
    org_slug: str
    session_token: str


class WidgetKbSuggestRequest(BaseModel):
    org_slug: str
    query: str = Field(min_length=1, max_length=120)
    limit: int = Field(default=5, ge=1, le=10)
