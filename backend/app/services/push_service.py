"""Browser/native push registration + delivery helpers."""

from __future__ import annotations

from datetime import UTC, datetime
import json
import logging
import uuid

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.models.notification import NotificationPreference
from app.models.push_device import PushDevice

logger = logging.getLogger(__name__)
settings = get_settings()


def _now() -> datetime:
    return datetime.now(UTC)


def push_supported() -> bool:
    return bool(settings.push_vapid_public_key and settings.push_vapid_private_key)


def _push_pref_allows(pref: NotificationPreference | None, kind: str) -> bool:
    if pref is None:
        return True
    push = pref.push or {}
    if push.get("all") is False:
        return False
    normalized = kind.lower()
    if normalized.endswith("mention"):
        return bool(push.get("mention", True))
    if normalized in {"chat.new", "chat.started"}:
        return bool(push.get("new_chat", True))
    if normalized in {"chat.new_message", "chat.message"}:
        return bool(push.get("new_message", True))
    return True


async def register_web_subscription(
    db: AsyncSession,
    *,
    organization_id: uuid.UUID,
    user_id: uuid.UUID,
    endpoint: str,
    p256dh: str,
    auth: str,
    user_agent: str | None,
    platform: str | None,
) -> PushDevice:
    row = (
        await db.execute(
            select(PushDevice).where(
                PushDevice.user_id == user_id,
                PushDevice.channel == "web",
                PushDevice.endpoint == endpoint,
            )
        )
    ).scalar_one_or_none()
    if row is None:
        row = PushDevice(
            organization_id=organization_id,
            user_id=user_id,
            channel="web",
            endpoint=endpoint,
            p256dh=p256dh,
            auth=auth,
            user_agent=user_agent,
            platform=platform,
            is_active=True,
            last_seen_at=_now(),
        )
        db.add(row)
    else:
        row.organization_id = organization_id
        row.p256dh = p256dh
        row.auth = auth
        row.user_agent = user_agent
        row.platform = platform
        row.is_active = True
        row.last_seen_at = _now()
    await db.flush()
    return row


async def unregister_web_subscription(db: AsyncSession, *, user_id: uuid.UUID, endpoint: str) -> int:
    rows = (
        await db.execute(
            select(PushDevice).where(
                PushDevice.user_id == user_id,
                PushDevice.channel == "web",
                PushDevice.endpoint == endpoint,
                PushDevice.is_active.is_(True),
            )
        )
    ).scalars().all()
    for row in rows:
        row.is_active = False
        row.last_seen_at = _now()
    await db.flush()
    return len(rows)


async def register_native_token(
    db: AsyncSession,
    *,
    organization_id: uuid.UUID,
    user_id: uuid.UUID,
    platform: str,
    token: str,
    user_agent: str | None,
) -> PushDevice:
    channel = "ios" if platform == "ios" else "android"
    row = (
        await db.execute(
            select(PushDevice).where(
                PushDevice.user_id == user_id,
                PushDevice.channel == channel,
                PushDevice.native_token == token,
            )
        )
    ).scalar_one_or_none()
    if row is None:
        row = PushDevice(
            organization_id=organization_id,
            user_id=user_id,
            channel=channel,
            native_token=token,
            user_agent=user_agent,
            platform=platform,
            is_active=True,
            last_seen_at=_now(),
        )
        db.add(row)
    else:
        row.organization_id = organization_id
        row.platform = platform
        row.user_agent = user_agent
        row.is_active = True
        row.last_seen_at = _now()
    await db.flush()
    return row


async def unregister_native_token(db: AsyncSession, *, user_id: uuid.UUID, platform: str, token: str) -> int:
    channel = "ios" if platform == "ios" else "android"
    rows = (
        await db.execute(
            select(PushDevice).where(
                PushDevice.user_id == user_id,
                PushDevice.channel == channel,
                PushDevice.native_token == token,
                PushDevice.is_active.is_(True),
            )
        )
    ).scalars().all()
    for row in rows:
        row.is_active = False
        row.last_seen_at = _now()
    await db.flush()
    return len(rows)


async def send_push_to_user(
    db: AsyncSession,
    *,
    organization_id: uuid.UUID,
    user_id: uuid.UUID,
    kind: str,
    title: str,
    body: str | None,
    link_url: str | None,
) -> None:
    pref = (
        await db.execute(select(NotificationPreference).where(NotificationPreference.user_id == user_id))
    ).scalar_one_or_none()
    if not _push_pref_allows(pref, kind):
        return

    devices = (
        await db.execute(
            select(PushDevice).where(
                PushDevice.organization_id == organization_id,
                PushDevice.user_id == user_id,
                PushDevice.is_active.is_(True),
            )
        )
    ).scalars().all()

    for device in devices:
        try:
            if device.channel == "web":
                await _send_browser_push(device, title=title, body=body, link_url=link_url)
            elif device.channel in {"ios", "android"}:
                await _send_native_push(device, title=title, body=body, link_url=link_url)
            device.last_sent_at = _now()
            device.last_error = None
        except Exception as exc:  # noqa: BLE001
            device.last_error = str(exc)[:500]
            logger.warning("push send failed user=%s channel=%s error=%s", user_id, device.channel, exc)
    await db.flush()


async def _send_browser_push(device: PushDevice, *, title: str, body: str | None, link_url: str | None) -> None:
    if not push_supported() or not device.endpoint or not device.p256dh or not device.auth:
        return
    try:
        from pywebpush import WebPushException, webpush  # type: ignore
    except Exception as exc:  # noqa: BLE001
        logger.warning("pywebpush not installed; browser push disabled: %s", exc)
        return

    payload = json.dumps({
        "title": title,
        "body": body or "",
        "url": link_url or "/inbox",
    })
    try:
        webpush(
            subscription_info={
                "endpoint": device.endpoint,
                "keys": {"p256dh": device.p256dh, "auth": device.auth},
            },
            data=payload,
            vapid_private_key=settings.push_vapid_private_key,
            vapid_claims={"sub": settings.push_vapid_subject},
            ttl=120,
        )
    except WebPushException as exc:
        status_code = getattr(getattr(exc, "response", None), "status_code", None)
        if status_code in {404, 410}:
            device.is_active = False
        raise


async def _send_native_push(device: PushDevice, *, title: str, body: str | None, link_url: str | None) -> None:
    # Optional native shell support: if FCM key is configured, use the legacy HTTP
    # notification API for both iOS/Android FCM tokens.
    if not settings.fcm_server_key or not device.native_token:
        return
    payload = {
        "to": device.native_token,
        "priority": "high",
        "notification": {
            "title": title,
            "body": body or "",
            "click_action": link_url or "/inbox",
        },
        "data": {
            "url": link_url or "/inbox",
            "channel": device.channel,
        },
    }
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.post(
            "https://fcm.googleapis.com/fcm/send",
            headers={"Authorization": f"key={settings.fcm_server_key}", "Content-Type": "application/json"},
            json=payload,
        )
        if resp.status_code >= 300:
            raise RuntimeError(f"FCM push failed status={resp.status_code}")
