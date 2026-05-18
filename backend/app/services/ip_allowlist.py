"""IP allowlist enforcement for admin endpoints."""

from __future__ import annotations

import ipaddress
import uuid
from typing import Annotated, Iterable

from fastapi import Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.middleware.auth import TokenUser, current_user
from app.models.organization import Organization


def _client_ip(request: Request) -> str | None:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    if request.client:
        return request.client.host
    return None


def ip_in_allowlist(ip: str, cidrs: Iterable[str]) -> bool:
    try:
        client = ipaddress.ip_address(ip)
    except ValueError:
        return False
    for raw in cidrs:
        candidate = (raw or "").strip()
        if not candidate:
            continue
        try:
            network = ipaddress.ip_network(candidate, strict=False)
        except ValueError:
            continue
        if client in network:
            return True
    return False


async def assert_ip_allowed(db: AsyncSession, organization_id: uuid.UUID, ip: str | None) -> None:
    org_allowlist = (
        await db.execute(select(Organization.ip_allowlist).where(Organization.id == organization_id))
    ).scalar_one_or_none()
    if not org_allowlist or not org_allowlist.get("enabled"):
        return
    cidrs = org_allowlist.get("cidrs") or []
    if not ip or not ip_in_allowlist(ip, cidrs):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied for this network. Contact your administrator.",
        )


async def enforce_ip_allowlist(
    request: Request,
    user: Annotated[TokenUser, Depends(current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> TokenUser:
    await assert_ip_allowed(db, user.organization_id, _client_ip(request))
    return user
