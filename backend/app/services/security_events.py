"""Security event recording + alerting (12.22).

Persists rows to security_events and, for severities >= warning, dispatches an
in-app notification to all org owners (best-effort — failures swallowed).
"""

from __future__ import annotations

import logging
import uuid
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.security import SecurityEvent
from app.models.user import User


logger = logging.getLogger(__name__)


SEVERITY_ORDER = {"info": 0, "warning": 1, "critical": 2}


async def record_event(
    db: AsyncSession,
    *,
    organization_id: uuid.UUID,
    event: str,
    severity: str = "info",
    user_id: uuid.UUID | None = None,
    ip_address: str | None = None,
    user_agent: str | None = None,
    country: str | None = None,
    details: dict[str, Any] | None = None,
    notify: bool | None = None,
) -> SecurityEvent:
    row = SecurityEvent(
        organization_id=organization_id,
        user_id=user_id,
        event=event,
        severity=severity,
        ip_address=ip_address,
        user_agent=user_agent,
        country=country,
        details=details or {},
    )
    db.add(row)
    await db.flush()

    should_notify = notify if notify is not None else SEVERITY_ORDER.get(severity, 0) >= 1
    if should_notify:
        try:
            from app.services.notification_service import notify as notify_user

            owners = (
                await db.execute(
                    select(User.id).where(
                        User.organization_id == organization_id,
                        User.role.in_(["owner", "admin"]),
                        User.is_active.is_(True),
                    )
                )
            ).scalars().all()
            for owner_id in owners:
                await notify_user(
                    organization_id=organization_id,
                    user_id=owner_id,
                    kind="security_event",
                    title=f"Security alert: {event}",
                    body=(details or {}).get("summary") or event,
                    priority="high" if severity == "critical" else "normal",
                    meta={"event": event, "severity": severity, "ip": ip_address},
                    db=db,
                )
        except Exception as exc:  # noqa: BLE001
            logger.warning("security_event notify dispatch failed: %s", exc)
        row.notified_at = datetime.now(UTC)

    return row
