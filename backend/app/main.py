import logging
from datetime import UTC, datetime

import socketio
from fastapi import Depends, FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api import (
    admin,
    agents,
    ai,
    analytics,
    api_keys,
    audit,
    auth,
    billing,
    chatbot,
    channels as channels_api,
    chats,
    contacts,
    ecommerce,
    engage,
    gaps,
    integrations,
    kb,
    notifications,
    platform,
    polish,
    public,
    scim,
    security,
    tickets,
    upload,
    webhooks,
    widget,
)
from app.config import get_settings
from app.logging_setup import configure as configure_logging
from app.db.redis import get_redis
from app.db.session import get_db
from app.middleware.audit_middleware import AuditMiddleware
from app.middleware.cors_dynamic import DynamicCorsMiddleware
from app.middleware.csrf import CsrfMiddleware
from app.middleware.rate_limit import RateLimitMiddleware
from app.middleware.request_context import RequestContextMiddleware
from app.middleware.security_headers import SecurityHeadersMiddleware
from app.socket_manager import sio

settings = get_settings()
configure_logging(level=settings.log_level, json_logs=settings.json_logs)

if settings.sentry_dsn:
    try:  # pragma: no cover
        import sentry_sdk
        from sentry_sdk.integrations.fastapi import FastApiIntegration
        from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration

        sentry_sdk.init(
            dsn=settings.sentry_dsn,
            environment=settings.sentry_environment,
            traces_sample_rate=settings.sentry_traces_sample_rate,
            integrations=[FastApiIntegration(), SqlalchemyIntegration()],
            send_default_pii=False,
        )
    except Exception:  # noqa: BLE001
        logging.getLogger(__name__).warning("Sentry SDK not installed; skipping init")


def create_fastapi_app() -> FastAPI:
    app = FastAPI(
        title="FlowLyra API",
        version="1.0.0",
        openapi_tags=[
            {"name": "api-keys", "description": "Create and manage scoped API keys."},
            {"name": "platform", "description": "Public REST platform endpoints for external clients."},
            {"name": "webhooks", "description": "Outbound webhook subscriptions and deliveries."},
            {"name": "integrations", "description": "Integration marketplace, OAuth helpers, health checks, and logs."},
            {"name": "chats", "description": "Chat inbox, messages, and live conversation controls."},
            {"name": "tickets", "description": "Ticketing lifecycle, comments, SLA, and workflow APIs."},
            {"name": "contacts", "description": "Contact directory and customer profile management."},
            {"name": "analytics", "description": "Reporting, exports, and analytics APIs."},
            {"name": "ai", "description": "AI assistants, summarization, sentiment, and knowledge search."},
        ],
    )

    # Middlewares run in reverse insertion order; insert outer-most last.
    app.add_middleware(RateLimitMiddleware)
    app.add_middleware(AuditMiddleware)
    app.add_middleware(CsrfMiddleware)
    app.add_middleware(DynamicCorsMiddleware)
    app.add_middleware(
        SecurityHeadersMiddleware,
        content_security_policy=settings.csp_override or None,
        environment=settings.environment,
    )
    app.add_middleware(RequestContextMiddleware)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials="*" not in settings.cors_origin_list,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["x-request-id", "x-ratelimit-limit", "x-ratelimit-remaining", "x-ratelimit-reset"],
    )

    @app.exception_handler(Exception)
    async def problem_details(request: Request, exc: Exception) -> JSONResponse:
        logging.exception("unhandled error path=%s", request.url.path)
        detail = str(exc)
        if settings.environment.lower() in {"production", "staging"}:
            detail = "An unexpected error occurred. Please contact support."
        return JSONResponse(
            status_code=500,
            media_type="application/problem+json",
            content={
                "type": "about:blank",
                "title": "Internal Server Error",
                "status": 500,
                "detail": detail,
                "request_id": getattr(request.state, "request_id", None),
            },
        )

    @app.get("/health")
    async def health(db=Depends(get_db)) -> dict:
        from sqlalchemy import text

        checks: dict[str, str] = {"status": "ok", "timestamp": datetime.now(UTC).isoformat()}
        try:
            await db.execute(text("SELECT 1"))
            checks["database"] = "ok"
        except Exception:  # noqa: BLE001
            checks["database"] = "error"
            checks["status"] = "degraded"
        try:
            redis = get_redis()
            await redis.ping()
            checks["redis"] = "ok"
        except Exception:  # noqa: BLE001
            checks["redis"] = "error"
            checks["status"] = "degraded"
        return checks

    @app.get("/healthz")
    async def healthz() -> dict:
        from sqlalchemy import text

        from app.db.redis import get_redis
        from app.db.session import AsyncSessionLocal

        checks: dict[str, str] = {}
        try:
            async with AsyncSessionLocal() as session:
                await session.execute(text("SELECT 1"))
            checks["db"] = "ok"
        except Exception as exc:  # noqa: BLE001
            checks["db"] = f"fail: {exc}"
        try:
            pong = await get_redis().ping()
            checks["redis"] = "ok" if pong else "fail"
        except Exception as exc:  # noqa: BLE001
            checks["redis"] = f"fail: {exc}"
        try:
            from app.workers.system_tasks import ping as celery_ping

            result = celery_ping.apply_async(args=["hc"], expires=5)
            checks["celery"] = "ok" if result.get(timeout=2) else "fail"
        except Exception:  # noqa: BLE001
            checks["celery"] = "unavailable"
        ok = all(v == "ok" or v == "unavailable" for v in checks.values())
        return {"ok": ok, "checks": checks, "version": app.version, "environment": settings.environment}

    for router in (
        auth.router,
        public.router,
        widget.router,
        chats.router,
        tickets.router,
        contacts.router,
        ecommerce.router,
        agents.router,
        admin.router,
        analytics.router,
        engage.router,
        integrations.router,
        upload.router,
        audit.router,
        billing.router,
        notifications.router,
        api_keys.router,
        webhooks.router,
        platform.router,
        polish.router,
        kb.admin_router,
        kb.public_router,
        ai.router,
        chatbot.router,
        channels_api.router,
        channels_api.webhook_router,
        security.router,
        scim.router,
        gaps.router,
    ):
        app.include_router(router, prefix="/api/v1")
    return app


fastapi_app = create_fastapi_app()
app = socketio.ASGIApp(sio, other_asgi_app=fastapi_app, socketio_path="socket.io")
