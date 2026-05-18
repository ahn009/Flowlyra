from functools import lru_cache
import json

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://cf_user:cf_pass@localhost:5432/chatflow"
    redis_url: str = "redis://localhost:6379/0"
    redis_namespace: str = "flowlyra"
    celery_broker_url: str = "redis://localhost:6379/1"
    celery_result_backend: str = "redis://localhost:6379/2"
    secret_key: str = "change-me-to-64-random-chars-in-production"
    access_token_expire_min: int = 60
    refresh_token_expire_days: int = 30
    environment: str = "development"
    log_level: str = "INFO"
    json_logs: bool = False
    cors_origins: str = "http://localhost:5173,http://localhost:5174"
    api_base_url: str = "http://localhost:8000"
    frontend_base_url: str = "http://localhost:5173"
    openai_api_key: str = ""
    openai_model: str = "gpt-4o-mini"
    anthropic_api_key: str = ""
    anthropic_model: str = "claude-haiku-4-5-20251001"
    ai_provider: str = "openai"
    ai_embedding_model: str = "text-embedding-3-small"
    ai_embedding_dimensions: int = 1536
    ai_request_timeout: int = 30
    ai_max_context_messages: int = 30
    rag_top_k: int = 5
    chatbot_session_ttl_seconds: int = 1800
    aws_access_key_id: str = ""
    aws_secret_access_key: str = ""
    aws_s3_bucket: str = "flowlyra-uploads"
    aws_region: str = "us-east-1"
    sendgrid_api_key: str = ""
    from_email: str = "hello@flowlyra.com"
    cloudflare_widget_url: str = "https://cdn.flowlyra.com/widget.js"
    sentry_dsn: str = ""
    db_pool_size: int = 10
    db_max_overflow: int = 20
    db_pool_recycle: int = 1800
    login_lockout_threshold: int = 5
    login_lockout_minutes: int = 15
    csp_override: str = ""
    use_cookie_auth: bool = False
    # Phase 12 — Enterprise Security
    encryption_key: str = ""  # 32-byte url-safe base64 Fernet key; auto-derived from secret_key if empty
    kms_provider: str = "none"  # none|aws|gcp
    kms_key_id: str = ""
    oauth_google_client_id: str = ""
    oauth_google_client_secret: str = ""
    oauth_microsoft_client_id: str = ""
    oauth_microsoft_client_secret: str = ""
    oauth_microsoft_tenant: str = "common"
    oauth_redirect_base_url: str = ""  # falls back to api_base_url when empty
    saml_sp_entity_id: str = "https://flowlyra.com/saml/metadata"
    saml_sp_acs_base_url: str = ""  # falls back to api_base_url
    hcaptcha_site_key: str = ""
    hcaptcha_secret: str = ""
    recaptcha_site_key: str = ""
    recaptcha_secret: str = ""
    twofa_issuer: str = "FlowLyra"
    twofa_backup_code_count: int = 10
    retention_default_chat_days: int = 365
    retention_default_ticket_days: int = 730
    retention_default_audit_days: int = 365
    retention_default_session_days: int = 90
    data_export_signed_url_ttl_seconds: int = 86400
    # Phase 13 — Web/mobile push
    push_vapid_public_key: str = ""
    push_vapid_private_key: str = ""
    push_vapid_subject: str = "mailto:hello@flowlyra.com"
    fcm_server_key: str = ""
    apns_team_id: str = ""
    apns_key_id: str = ""
    apns_private_key: str = ""
    apns_topic: str = ""

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    @model_validator(mode="after")
    def validate_security_settings(self) -> "Settings":
        if self.environment.lower() in {"production", "staging"}:
            if self.secret_key == "change-me-to-64-random-chars-in-production" or len(self.secret_key) < 32:
                raise ValueError("SECRET_KEY must be set to a strong value in production/staging environments")
        return self

    @property
    def cors_origin_list(self) -> list[str]:
        value = self.cors_origins.strip()
        if value.startswith("["):
            parsed = json.loads(value)
            return [str(origin).strip() for origin in parsed if str(origin).strip()]
        return [origin.strip() for origin in value.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
