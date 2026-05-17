"""Notification dispatcher.

Fan-out to: persistent in-app row, websocket push to user room, email (optional),
browser push (optional). Per-channel toggles read from NotificationPreference.
"""

from __future__ import annotations

import logging
import uuid
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import AsyncSessionLocal
from app.models.notification import Notification, NotificationPreference
from app.models.user import User
from app.services.email_service import send_email

logger = logging.getLogger(__name__)


async def _get_preference(db: AsyncSession, user_id: uuid.UUID) -> NotificationPreference | None:
    return (await db.execute(select(NotificationPreference).where(NotificationPreference.user_id == user_id))).scalar_one_or_none()


async def notify(
    *,
    organization_id: uuid.UUID,
    user_id: uuid.UUID,
    kind: str,
    title: str,
    body: str | None = None,
    link_url: str | None = None,
    icon: str | None = None,
    priority: str = "normal",
    meta: dict[str, Any] | None = None,
    via_email: bool = False,
    via_push: bool = False,
    db: AsyncSession | None = None,
) -> Notification:
    async def _do(session: AsyncSession) -> Notification:
        n = Notification(
            organization_id=organization_id,
            user_id=user_id,
            kind=kind,
            title=title,
            body=body,
            link_url=link_url,
            icon=icon,
            priority=priority,
            meta=meta or {},
        )
        session.add(n)
        await session.flush()
        pref = await _get_preference(session, user_id)
        send_email_flag = via_email and (pref is None or pref.email.get("digest") == "instant")
        if send_email_flag:
            user = (await session.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
            if user is not None:
                try:
                    await send_email(user.email, title, f"<p>{body or ''}</p>{f'<p><a href=\"{link_url}\">Open</a></p>' if link_url else ''}")
                except Exception:  # noqa: BLE001
                    logger.exception("notification email failed user=%s", user_id)
        # socket fan-out left to socket layer via redis pubsub; record event here.
        from app.db.redis import get_redis

        try:
            await get_redis().publish(
                f"notify:{organization_id}",
                str({
                    "id": str(n.id),
                    "user_id": str(user_id),
                    "kind": kind,
                    "title": title,
                    "body": body,
                    "link_url": link_url,
                    "priority": priority,
                }),
            )
        except Exception:  # noqa: BLE001
            logger.warning("redis publish failed for notification %s", n.id)
        return n

    if db is not None:
        return await _do(db)
    async with AsyncSessionLocal() as session:
        n = await _do(session)
        await session.commit()
        return n
