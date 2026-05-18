"""Short-lived 2FA challenge tokens stored in Redis.

Issued after primary password auth when TOTP is required; consumed by the
/auth/2fa/challenge endpoint to mint the real access/refresh tokens.
"""

from __future__ import annotations

import json
import secrets
import uuid

from app.db.redis import get_redis, ns

CHALLENGE_TTL_SECONDS = 300


def _key(token: str) -> str:
    return ns("twofa-challenge", token)


async def issue_challenge(user_id: uuid.UUID, *, ip: str | None = None, user_agent: str | None = None) -> str:
    token = secrets.token_urlsafe(32)
    payload = {"user_id": str(user_id), "ip": ip, "user_agent": user_agent}
    await get_redis().setex(_key(token), CHALLENGE_TTL_SECONDS, json.dumps(payload))
    return token


async def consume_challenge(token: str) -> dict | None:
    raw = await get_redis().get(_key(token))
    if not raw:
        return None
    await get_redis().delete(_key(token))
    try:
        return json.loads(raw)
    except (ValueError, TypeError):
        return None
