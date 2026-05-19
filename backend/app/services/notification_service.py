"""Notification dispatcher.

Fan-out to: persistent in-app row, websocket push to user room, email (optional),
browser/native push (optional). Per-channel toggles read from NotificationPreference.
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
import logging
import uuid
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import AsyncSessionLocal
from app.models.notification import Notification, NotificationPreference
from app.models.user import User
from app.services.email_service import send_email
from app.services.push_service import send_push_to_user

logger = logging.getLogger(__name__)


def _now() -> datetime:
    return datetime.now(UTC)


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

        send_email_flag = via_email and (pref is None or (pref.email or {}).get("digest") == "instant")
        if send_email_flag:
            user = (await session.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
            if user is not None:
                try:
                    link_html = f"<p><a href='{link_url}'>Open</a></p>" if link_url else ""
                    await send_email(user.email, title, f"<p>{body or ''}</p>{link_html}")
                except Exception:  # noqa: BLE001
                    logger.exception("notification email failed user=%s", user_id)

        if via_push:
            try:
                await send_push_to_user(
                    session,
                    organization_id=organization_id,
                    user_id=user_id,
                    kind=kind,
                    title=title,
                    body=body,
                    link_url=link_url,
                )
            except Exception:  # noqa: BLE001
                logger.exception("push fanout failed notification=%s", n.id)

        # Socket fan-out left to socket layer via redis pubsub; record event here.
        from app.db.redis import get_redis

        try:
            await get_redis().publish(
                f"notify:{organization_id}",
                str(
                    {
                        "id": str(n.id),
                        "user_id": str(user_id),
                        "kind": kind,
                        "title": title,
                        "body": body,
                        "link_url": link_url,
                        "priority": priority,
                    }
                ),
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

async def dispatch_due_email_digests(db: AsyncSession, cadence: str) -> int:
    """Send hourly/daily digest emails and mark notifications as sent."""
    if cadence not in {"hourly", "daily"}:
        return 0

    cutoff = _now() - (timedelta(hours=1) if cadence == "hourly" else timedelta(days=1))
    prefs = (
        await db.execute(select(NotificationPreference).where(NotificationPreference.email["digest"].astext == cadence))
    ).scalars().all()
    sent = 0

    for pref in prefs:
        user = (await db.execute(select(User).where(User.id == pref.user_id, User.is_active.is_(True)))).scalar_one_or_none()
        if user is None:
            continue
        rows = (
            await db.execute(
                select(Notification)
                .where(
                    Notification.user_id == pref.user_id,
                    Notification.created_at >= cutoff,
                    Notification.email_digest_sent_at.is_(None),
                )
                .order_by(Notification.created_at.desc())
                .limit(25)
            )
        ).scalars().all()
        if not rows:
            continue

        html_items = "".join(
            f"<li><b>{row.title}</b>{f': {row.body}' if row.body else ''}</li>" for row in rows
        )
        html = (
            f"<p>You have {len(rows)} unread updates in FlowLyra.</p>"
            f"<ul>{html_items}</ul>"
            "<p><a href=\"/inbox\">Open inbox</a></p>"
        )
        try:
            await send_email(user.email, f"FlowLyra {cadence} digest", html)
        except Exception:  # noqa: BLE001
            logger.exception("digest email failed user=%s", user.id)
            continue

        now = _now()
        for row in rows:
            row.email_digest_sent_at = now
        sent += 1

    await db.commit()
    return sent
