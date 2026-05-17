"""Refresh-token bookkeeping: family, rotation, reuse detection."""

from __future__ import annotations

import hashlib
import uuid
from datetime import UTC, datetime, timedelta

from jose import jwt
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.middleware.auth import ALGORITHM
from app.models.refresh_token import RefreshToken
from app.models.user import User


def _hash(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def _decode_unsafe(token: str) -> dict:
    return jwt.decode(token, get_settings().secret_key, algorithms=[ALGORITHM], options={"verify_exp": False})


def _build_token(user: User, family_id: uuid.UUID, *, parent_jti: str | None = None) -> tuple[str, dict]:
    settings = get_settings()
    now = datetime.now(UTC)
    expires = now + timedelta(days=settings.refresh_token_expire_days)
    jti = str(uuid.uuid4())
    payload = {
        "sub": str(user.id),
        "org": str(user.organization_id),
        "email": user.email,
        "role": user.role,
        "type": "refresh",
        "fam": str(family_id),
        "pid": parent_jti,
        "iat": int(now.timestamp()),
        "exp": int(expires.timestamp()),
        "jti": jti,
    }
    return jwt.encode(payload, settings.secret_key, algorithm=ALGORITHM), {"jti": jti, "expires_at": expires}


async def issue(
    db: AsyncSession,
    user: User,
    *,
    user_agent: str | None,
    ip_address: str | None,
    family_id: uuid.UUID | None = None,
    parent_jti: str | None = None,
) -> str:
    fam = family_id or uuid.uuid4()
    token, meta = _build_token(user, fam, parent_jti=parent_jti)
    db.add(
        RefreshToken(
            user_id=user.id,
            organization_id=user.organization_id,
            family_id=fam,
            jti=meta["jti"],
            parent_jti=parent_jti,
            token_hash=_hash(token),
            user_agent=user_agent,
            ip_address=ip_address,
            expires_at=meta["expires_at"],
        )
    )
    return token


async def rotate(db: AsyncSession, presented_token: str, *, user_agent: str | None, ip_address: str | None) -> tuple[str, User]:
    """Rotate a refresh token. On reuse of a revoked token, revoke whole family."""

    from fastapi import HTTPException, status

    payload = _decode_unsafe(presented_token)
    jti = str(payload.get("jti"))
    fam_id = uuid.UUID(str(payload.get("fam"))) if payload.get("fam") else None
    if fam_id is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token family missing")
    if int(payload.get("exp", 0)) < int(datetime.now(UTC).timestamp()):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expired")

    record = (await db.execute(select(RefreshToken).where(RefreshToken.jti == jti))).scalar_one_or_none()
    if record is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unknown refresh token")
    if record.is_revoked:
        await db.execute(
            update(RefreshToken)
            .where(RefreshToken.family_id == record.family_id)
            .values(is_revoked=True, revoked_reason="reuse_detected")
        )
        await db.commit()
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token reuse detected")

    user = (await db.execute(select(User).where(User.id == record.user_id, User.is_active.is_(True)))).scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User inactive")

    record.is_revoked = True
    record.revoked_reason = "rotated"
    record.last_used_at = datetime.now(UTC)

    new_token = await issue(db, user, user_agent=user_agent, ip_address=ip_address, family_id=record.family_id, parent_jti=jti)
    return new_token, user


async def revoke_family_for_user(db: AsyncSession, user_id: uuid.UUID) -> None:
    await db.execute(
        update(RefreshToken).where(RefreshToken.user_id == user_id, RefreshToken.is_revoked.is_(False)).values(
            is_revoked=True, revoked_reason="user_logout"
        )
    )


async def revoke_one(db: AsyncSession, jti: str, *, reason: str = "logout") -> None:
    await db.execute(update(RefreshToken).where(RefreshToken.jti == jti).values(is_revoked=True, revoked_reason=reason))
