"""Audit middleware: persists an AuditLog row for authenticated mutating requests."""

from __future__ import annotations

import logging
from collections.abc import Awaitable, Callable

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

from app.services.audit_service import record

logger = logging.getLogger(__name__)

MUTATING_METHODS = {"POST", "PUT", "PATCH", "DELETE"}
SKIP_PATH_PREFIXES = (
    "/api/v1/widget",
    "/api/v1/public",
    "/api/v1/auth/refresh",
    "/api/v1/auth/logout",
    "/health",
    "/healthz",
    "/openapi.json",
    "/docs",
    "/redoc",
    "/socket.io",
    "/metrics",
)


class AuditMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: Callable[[Request], Awaitable[Response]]) -> Response:
        response = await call_next(request)
        if request.method not in MUTATING_METHODS:
            return response
        path = request.url.path
        if any(path.startswith(prefix) for prefix in SKIP_PATH_PREFIXES):
            return response
        organization_id = getattr(request.state, "organization_id", None)
        actor_user_id = getattr(request.state, "user_id", None)
        actor_email = getattr(request.state, "user_email", None)
        if organization_id is None and actor_user_id is None:
            return response
        try:
            event = f"http.{request.method.lower()}"
            await record(
                organization_id=organization_id,
                actor_user_id=actor_user_id,
                actor_email=actor_email,
                event=event,
                ip_address=request.client.host if request.client else None,
                user_agent=request.headers.get("user-agent"),
                request_id=getattr(request.state, "request_id", None),
                method=request.method,
                path=path,
                status_code=response.status_code,
            )
        except Exception:  # noqa: BLE001
            logger.exception("audit middleware persist failed path=%s", path)
        return response
