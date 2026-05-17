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
