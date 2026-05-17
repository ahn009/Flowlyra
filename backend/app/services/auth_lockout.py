"""Login lockout: persistent counter on User + redis short-window IP counter."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.db.redis import get_redis, ns
from app.models.user import User


async def ensure_not_locked(user: User) -> None:
    if user.locked_until and user.locked_until > datetime.now(UTC):
        delta = int((user.locked_until - datetime.now(UTC)).total_seconds())
        raise HTTPException(
            status_code=status.HTTP_423_LOCKED,
            detail=f"Account is locked. Retry in {delta} seconds.",
            headers={"Retry-After": str(delta)},
        )


async def register_failure(db: AsyncSession, user: User | None, *, ip_address: str | None) -> None:
    settings = get_settings()
    # IP-based short window block for unknown emails to avoid user enumeration
    if ip_address:
        try:
            key = ns("loginfail", "ip", ip_address)
            count = await get_redis().incr(key)
            if count == 1:
                await get_redis().expire(key, 60 * settings.login_lockout_minutes)
            if count >= settings.login_lockout_threshold * 4:
                raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail="Too many login attempts")
        except HTTPException:
            raise
        except Exception:  # noqa: BLE001
            pass
    if user is None:
        return
    user.failed_login_count = (user.failed_login_count or 0) + 1
    if user.failed_login_count >= settings.login_lockout_threshold:
        user.locked_until = datetime.now(UTC) + timedelta(minutes=settings.login_lockout_minutes)
    await db.commit()


async def register_success(db: AsyncSession, user: User) -> None:
    user.failed_login_count = 0
    user.locked_until = None
    await db.commit()
