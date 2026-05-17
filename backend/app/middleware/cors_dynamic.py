"""Dynamic CORS — augments the static allowlist with per-org allowed origins.

Falls back to passing through; the standard ``CORSMiddleware`` handles the
static set, and this middleware grants extras for widget-origin requests that
match an Organization's ``cors_origin_allowlist``.
"""

from __future__ import annotations

import logging
from collections.abc import Awaitable, Callable

from fastapi import Request, Response
from sqlalchemy import select
from starlette.middleware.base import BaseHTTPMiddleware

from app.db.session import AsyncSessionLocal
from app.models.organization import Organization

logger = logging.getLogger(__name__)


class DynamicCorsMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: Callable[[Request], Awaitable[Response]]) -> Response:
        response = await call_next(request)
        origin = request.headers.get("origin")
        if not origin or response.headers.get("access-control-allow-origin"):
            return response
        try:
            slug = request.headers.get("x-flowlyra-org")
            if slug:
                async with AsyncSessionLocal() as session:
                    row = (
                        await session.execute(select(Organization.cors_origin_allowlist).where(Organization.slug == slug))
                    ).scalar_one_or_none()
                if row and origin in (row.get("origins") or []):
                    response.headers["access-control-allow-origin"] = origin
                    response.headers["vary"] = "origin"
        except Exception:  # noqa: BLE001
            logger.exception("dynamic CORS lookup failed")
        return response
