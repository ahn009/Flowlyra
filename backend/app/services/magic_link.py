"""Magic-link continuation for visitor chats.

A visitor who left their email can resume a prior chat by clicking a link sent
to that address. The token is a short-lived Redis key mapping to a session id.
"""

from __future__ import annotations

import secrets
import uuid

from app.db.redis import get_redis, ns

DEFAULT_TTL_SECONDS = 60 * 60 * 24 * 7  # one week


async def issue(session_id: uuid.UUID, *, ttl_seconds: int = DEFAULT_TTL_SECONDS) -> str:
    token = secrets.token_urlsafe(32)
    await get_redis().setex(ns("magic", token), ttl_seconds, str(session_id))
    return token


async def resolve(token: str) -> str | None:
    return await get_redis().get(ns("magic", token))


async def consume(token: str) -> str | None:
    value = await get_redis().get(ns("magic", token))
    if value is not None:
        await get_redis().delete(ns("magic", token))
    return value
