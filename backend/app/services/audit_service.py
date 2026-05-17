"""Audit logging helper.

Use ``record`` from any route or service to persist an audit event. The
``AuditMiddleware`` automatically logs authenticated mutating HTTP requests.
"""

from __future__ import annotations

import logging
import uuid
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import AsyncSessionLocal
from app.models.audit_log import AuditLog

logger = logging.getLogger(__name__)


async def record(
    *,
    organization_id: uuid.UUID | None,
    actor_user_id: uuid.UUID | None,
    actor_email: str | None,
    event: str,
    target_type: str | None = None,
    target_id: str | None = None,
    ip_address: str | None = None,
    user_agent: str | None = None,
    request_id: str | None = None,
    method: str | None = None,
    path: str | None = None,
    status_code: int | None = None,
    details: dict[str, Any] | None = None,
    db: AsyncSession | None = None,
) -> None:
    entry = AuditLog(
        organization_id=organization_id,
        actor_user_id=actor_user_id,
        actor_email=actor_email,
        event=event,
        target_type=target_type,
        target_id=target_id,
        ip_address=ip_address,
        user_agent=user_agent,
        request_id=request_id,
        method=method,
        path=path,
        status_code=status_code,
        details=details or {},
    )
    if db is not None:
        db.add(entry)
        return
    try:
        async with AsyncSessionLocal() as session:
            session.add(entry)
            await session.commit()
    except Exception:  # noqa: BLE001
        logger.exception("audit log write failed event=%s", event)
