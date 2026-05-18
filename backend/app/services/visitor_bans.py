"""Visitor ban enforcement (12.23).

Checks both VisitorBan rows (ip/cidr/session/email) and the per-row Session.is_banned
flag retained from earlier phases.
"""

from __future__ import annotations

import ipaddress
import uuid
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.security import VisitorBan
from app.models.session import Session as VisitorSession


async def is_visitor_banned(
    db: AsyncSession,
    organization_id: uuid.UUID,
    *,
    ip: str | None = None,
    session_token: str | None = None,
    email: str | None = None,
) -> bool:
    rows = (
        await db.execute(
            select(VisitorBan).where(VisitorBan.organization_id == organization_id)
        )
    ).scalars().all()
    now = datetime.now(UTC)
    for ban in rows:
        if ban.expires_at and ban.expires_at < now:
            continue
        if ban.ban_type == "ip" and ip and ban.value == ip:
            return True
        if ban.ban_type == "cidr" and ip:
            try:
                if ipaddress.ip_address(ip) in ipaddress.ip_network(ban.value, strict=False):
                    return True
            except ValueError:
                continue
        if ban.ban_type == "session" and session_token and ban.value == session_token:
            return True
        if ban.ban_type == "email" and email and ban.value.lower() == email.lower():
            return True
    if session_token:
        existing = (
            await db.execute(
                select(VisitorSession.is_banned).where(
                    VisitorSession.organization_id == organization_id,
                    VisitorSession.session_token == session_token,
                )
            )
        ).scalar_one_or_none()
        if existing:
            return True
    return False
