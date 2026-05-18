"""API key management endpoints for external API access."""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Annotated
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.middleware.auth import TokenUser
from app.models.api_key import ApiKey
from app.services.api_keys import API_KEY_SCOPES, create_api_key_secret, format_key_hint, hash_key, normalize_scopes
from app.services.permissions import require_permission
from app.services.plan_service import assert_under_limit

router = APIRouter(prefix="/api-keys", tags=["api-keys"])


class ApiKeyCreateIn(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    scopes: list[str] = Field(default_factory=list)
    rate_limit_per_min: int | None = Field(default=None, ge=10, le=10000)
    expires_at: datetime | None = None


class ApiKeyUpdateIn(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    scopes: list[str] | None = None
    rate_limit_per_min: int | None = Field(default=None, ge=10, le=10000)
    is_active: bool | None = None
    expires_at: datetime | None = None


def _row(row: ApiKey, *, include_secret: str | None = None) -> dict:
    data = {
        "id": str(row.id),
        "name": row.name,
        "key_hint": format_key_hint(row.key_prefix),
        "scopes": list((row.scopes or {}).get("items") or []),
        "rate_limit_per_min": row.rate_limit_per_min,
        "usage_count": row.usage_count,
        "last_used_at": row.last_used_at.isoformat() if row.last_used_at else None,
        "last_used_ip": row.last_used_ip,
        "is_active": row.is_active,
        "expires_at": row.expires_at.isoformat() if row.expires_at else None,
        "revoked_at": row.revoked_at.isoformat() if row.revoked_at else None,
        "created_at": row.created_at.isoformat() if row.created_at else None,
    }
    if include_secret:
        data["secret"] = include_secret
    return data


@router.get("/scopes")
async def scopes_catalog(user: Annotated[TokenUser, Depends(require_permission("api_keys.write"))]) -> dict:
    return {"items": API_KEY_SCOPES}


@router.get("")
async def list_keys(
    user: Annotated[TokenUser, Depends(require_permission("api_keys.write"))],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> list[dict]:
    rows = (
        await db.execute(
            select(ApiKey)
            .where(ApiKey.organization_id == user.organization_id)
            .order_by(ApiKey.created_at.desc())
        )
    ).scalars().all()
    return [_row(item) for item in rows]


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_key(
    payload: ApiKeyCreateIn,
    user: Annotated[TokenUser, Depends(require_permission("api_keys.write"))],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict:
    current = (
        await db.execute(select(func.count(ApiKey.id)).where(ApiKey.organization_id == user.organization_id, ApiKey.revoked_at.is_(None)))
    ).scalar_one()
    await assert_under_limit(db, user.organization_id, limit_name="api_keys", current_count=current)

    raw_secret, key_prefix = create_api_key_secret()
    scopes = normalize_scopes(payload.scopes)
    if not scopes:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="At least one valid scope is required")

    row = ApiKey(
        organization_id=user.organization_id,
        created_by_user_id=user.id,
        name=payload.name.strip(),
        key_prefix=key_prefix,
        key_hash=hash_key(raw_secret),
        scopes={"items": scopes},
        rate_limit_per_min=payload.rate_limit_per_min,
        expires_at=payload.expires_at,
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return _row(row, include_secret=raw_secret)


@router.patch("/{api_key_id}")
async def update_key(
    api_key_id: uuid.UUID,
    payload: ApiKeyUpdateIn,
    user: Annotated[TokenUser, Depends(require_permission("api_keys.write"))],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict:
    row = (
        await db.execute(
            select(ApiKey).where(ApiKey.id == api_key_id, ApiKey.organization_id == user.organization_id)
        )
    ).scalar_one_or_none()
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="API key not found")

    if payload.name is not None:
        row.name = payload.name.strip()
    if payload.scopes is not None:
        scopes = normalize_scopes(payload.scopes)
        if not scopes:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="At least one valid scope is required")
        row.scopes = {"items": scopes}
    if payload.rate_limit_per_min is not None:
        row.rate_limit_per_min = payload.rate_limit_per_min
    if payload.expires_at is not None:
        row.expires_at = payload.expires_at
    if payload.is_active is not None:
        row.is_active = payload.is_active
        if payload.is_active is False and row.revoked_at is None:
            row.revoked_at = datetime.now(UTC)
        if payload.is_active is True:
            row.revoked_at = None
    row.updated_at = datetime.now(UTC)
    await db.commit()
    await db.refresh(row)
    return _row(row)


@router.delete("/{api_key_id}")
async def revoke_key(
    api_key_id: uuid.UUID,
    user: Annotated[TokenUser, Depends(require_permission("api_keys.write"))],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict:
    row = (
        await db.execute(
            select(ApiKey).where(ApiKey.id == api_key_id, ApiKey.organization_id == user.organization_id)
        )
    ).scalar_one_or_none()
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="API key not found")
    row.is_active = False
    row.revoked_at = datetime.now(UTC)
    row.updated_at = datetime.now(UTC)
    await db.commit()
    return {"ok": True}


@router.get("/usage/summary")
async def usage_summary(
    user: Annotated[TokenUser, Depends(require_permission("api_keys.write"))],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict:
    rows = (
        await db.execute(select(ApiKey).where(ApiKey.organization_id == user.organization_id, ApiKey.revoked_at.is_(None)))
    ).scalars().all()
    total = sum(int(r.usage_count or 0) for r in rows)
    active = sum(1 for r in rows if r.is_active)
    last_used_at = max((r.last_used_at for r in rows if r.last_used_at), default=None)
    return {
        "total_keys": len(rows),
        "active_keys": active,
        "total_requests": total,
        "last_used_at": last_used_at.isoformat() if last_used_at else None,
    }
