from collections.abc import Awaitable, Callable
import hashlib

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

from app.db.redis import get_redis


class RateLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: Callable[[Request], Awaitable[Response]]) -> Response:
        # Never rate-limit health/docs so probes and diagnostics stay reliable.
        if request.url.path in {"/health", "/docs", "/openapi.json"}:
            return await call_next(request)

        redis = get_redis()
        auth = request.headers.get("authorization", "")
        if auth.startswith("Bearer "):
            token_fingerprint = hashlib.sha256(auth.removeprefix("Bearer ").encode()).hexdigest()[:24]
            principal = f"token:{token_fingerprint}"
        else:
            principal = request.client.host if request.client else "unknown"
        is_auth_path = request.url.path.startswith("/api/v1/auth")
        limit = 10 if is_auth_path else 120
        key = f"rate:{'auth' if is_auth_path else 'api'}:{principal}"
        count = await redis.incr(key)
        if count == 1:
            await redis.expire(key, 60)
        if count > limit:
            return Response(
                content='{"type":"about:blank","title":"Too Many Requests","status":429,"detail":"Rate limit exceeded"}',
                status_code=429,
                media_type="application/problem+json",
            )
        return await call_next(request)
