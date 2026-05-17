"""Plan-aware rate limiting middleware.

Buckets: ``auth`` (login/signup/reset/refresh) vs ``api`` (everything else).
When the caller is authenticated, the limit comes from their org plan;
unauthenticated callers fall back to conservative defaults. Standard
``X-RateLimit-*`` and ``Retry-After`` headers are emitted on every response.
"""

from __future__ import annotations

import hashlib
import logging
import time
import uuid
from collections.abc import Awaitable, Callable

from fastapi import Request, Response
from sqlalchemy import select
from starlette.middleware.base import BaseHTTPMiddleware

from app.db.redis import get_redis
from app.db.session import AsyncSessionLocal
from app.models.organization import Organization
from app.models.plan_limit import get_plan

logger = logging.getLogger(__name__)

SKIP_PATHS = {"/health", "/healthz", "/docs", "/redoc", "/openapi.json", "/metrics"}
AUTH_PATH_PREFIX = "/api/v1/auth"
DEFAULT_API_LIMIT = 120
DEFAULT_AUTH_LIMIT = 10
WINDOW_SECONDS = 60


async def _plan_limits_for_token(authorization_header: str | None) -> tuple[int, int, str] | None:
    if not authorization_header or not authorization_header.startswith("Bearer "):
        return None
    try:
        from jose import jwt

        from app.config import get_settings

        payload = jwt.decode(
            authorization_header.removeprefix("Bearer ").strip(),
            get_settings().secret_key,
            algorithms=["HS256"],
            options={"verify_exp": False},
        )
        org_id = uuid.UUID(str(payload.get("org")))
    except Exception:  # noqa: BLE001
        return None
    try:
        async with AsyncSessionLocal() as session:
            plan_name = (await session.execute(select(Organization.plan).where(Organization.id == org_id))).scalar_one_or_none()
    except Exception:  # noqa: BLE001
        return None
    if plan_name is None:
        return None
    plan = get_plan(plan_name)
    return plan.api_requests_per_min, plan.auth_requests_per_min, str(org_id)


class RateLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: Callable[[Request], Awaitable[Response]]) -> Response:
        if request.url.path in SKIP_PATHS:
            return await call_next(request)

        limit = DEFAULT_API_LIMIT
        remaining = limit
        reset = int(time.time()) + WINDOW_SECONDS
        try:
            redis = get_redis()
            auth = request.headers.get("authorization", "")
            plan_limits = await _plan_limits_for_token(auth)
            is_auth_path = request.url.path.startswith(AUTH_PATH_PREFIX)
            if plan_limits is not None:
                api_limit, auth_limit, principal_id = plan_limits
                principal = f"org:{principal_id}"
            else:
                api_limit, auth_limit = DEFAULT_API_LIMIT, DEFAULT_AUTH_LIMIT
                if auth.startswith("Bearer "):
                    fingerprint = hashlib.sha256(auth.removeprefix("Bearer ").encode()).hexdigest()[:24]
                    principal = f"token:{fingerprint}"
                else:
                    principal = request.client.host if request.client else "unknown"
            limit = auth_limit if is_auth_path else api_limit
            bucket = "auth" if is_auth_path else "api"
            now = int(time.time())
            window = now // WINDOW_SECONDS
            key = f"rate:{bucket}:{principal}:{window}"
            count = await redis.incr(key)
            if count == 1:
                await redis.expire(key, WINDOW_SECONDS + 5)
            reset = (window + 1) * WINDOW_SECONDS
            remaining = max(0, limit - count)
            if count > limit:
                headers = {
                    "X-RateLimit-Limit": str(limit),
                    "X-RateLimit-Remaining": "0",
                    "X-RateLimit-Reset": str(reset),
                    "Retry-After": str(max(1, reset - now)),
                }
                return Response(
                    content='{"type":"about:blank","title":"Too Many Requests","status":429,"detail":"Rate limit exceeded"}',
                    status_code=429,
                    media_type="application/problem+json",
                    headers=headers,
                )
        except Exception:  # noqa: BLE001
            # Fail open if Redis is unavailable to preserve API availability.
            return await call_next(request)
        response = await call_next(request)
        try:
            response.headers["X-RateLimit-Limit"] = str(limit)
            response.headers["X-RateLimit-Remaining"] = str(remaining)
            response.headers["X-RateLimit-Reset"] = str(reset)
        except Exception:  # noqa: BLE001
            pass
        return response
