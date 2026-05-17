"""Browser security headers (HSTS, X-Frame-Options, X-Content-Type-Options, etc.)."""

from __future__ import annotations

from collections.abc import Awaitable, Callable

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware


_DEFAULT_CSP = (
    "default-src 'self'; "
    "script-src 'self' 'unsafe-inline' https://cdn.flowlyra.com https://js.stripe.com; "
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
    "font-src 'self' https://fonts.gstatic.com data:; "
    "img-src 'self' data: blob: https:; "
    "media-src 'self' blob: https:; "
    "connect-src 'self' https: wss:; "
    "frame-ancestors 'none'; "
    "object-src 'none'; "
    "base-uri 'self'"
)


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, *, content_security_policy: str | None = None, environment: str = "development") -> None:
        super().__init__(app)
        self.csp = content_security_policy or _DEFAULT_CSP
        self.environment = environment

    async def dispatch(self, request: Request, call_next: Callable[[Request], Awaitable[Response]]) -> Response:
        response = await call_next(request)
        response.headers.setdefault("X-Frame-Options", "DENY")
        response.headers.setdefault("X-Content-Type-Options", "nosniff")
        response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
        response.headers.setdefault("Permissions-Policy", "geolocation=(), microphone=(), camera=()")
        response.headers.setdefault("Cross-Origin-Opener-Policy", "same-origin")
        response.headers.setdefault("Cross-Origin-Resource-Policy", "same-site")
        # Don't apply restrictive CSP to embeddable widget endpoints
        if not request.url.path.startswith("/api/v1/widget") and not request.url.path.startswith("/api/v1/public"):
            response.headers.setdefault("Content-Security-Policy", self.csp)
        if self.environment.lower() in {"production", "staging"}:
            response.headers.setdefault("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
        return response
