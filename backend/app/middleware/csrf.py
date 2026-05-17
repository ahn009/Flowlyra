"""CSRF protection (double-submit cookie pattern) for cookie-auth callers.

Bearer-token callers (mobile, SDKs) bypass the check because there is no
cookie-based auth — the token in ``Authorization`` is opaque to CSRF.
"""

from __future__ import annotations

import hmac
import secrets
from collections.abc import Awaitable, Callable

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

UNSAFE_METHODS = {"POST", "PUT", "PATCH", "DELETE"}
COOKIE_NAME = "flowlyra_csrf"
HEADER_NAME = "x-csrf-token"
SKIP_PREFIXES = (
    "/api/v1/widget",
    "/api/v1/public",
    "/api/v1/auth/login",
    "/api/v1/auth/signup",
    "/api/v1/auth/refresh",
    "/api/v1/auth/password",
    "/api/v1/auth/invite",
    "/socket.io",
)


class CsrfMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: Callable[[Request], Awaitable[Response]]) -> Response:
        if request.method in UNSAFE_METHODS and not any(request.url.path.startswith(p) for p in SKIP_PREFIXES):
            auth = request.headers.get("authorization", "")
            uses_cookie_auth = (not auth or not auth.startswith("Bearer ")) and request.cookies.get("flowlyra_access")
            if uses_cookie_auth:
                cookie_token = request.cookies.get(COOKIE_NAME) or ""
                header_token = request.headers.get(HEADER_NAME) or ""
                if not cookie_token or not header_token or not hmac.compare_digest(cookie_token, header_token):
                    return Response(
                        content='{"type":"about:blank","title":"CSRF check failed","status":403,"detail":"Missing or invalid CSRF token"}',
                        status_code=403,
                        media_type="application/problem+json",
                    )
        response = await call_next(request)
        if request.cookies.get(COOKIE_NAME) is None:
            token = secrets.token_urlsafe(32)
            response.set_cookie(
                COOKIE_NAME,
                token,
                httponly=False,
                samesite="lax",
                secure=request.url.scheme == "https",
                max_age=60 * 60 * 24 * 7,
            )
        return response
