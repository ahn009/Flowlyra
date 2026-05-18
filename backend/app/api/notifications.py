"""In-app notification API: list, read state, preferences, push subscriptions."""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Annotated
import uuid

from fastapi import APIRouter, Depends, Header, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import desc, func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.db.session import get_db
from app.middleware.auth import TokenUser, current_user
from app.models.notification import Notification, NotificationPreference
from app.services.push_service import (
    push_supported,
    register_native_token,
    register_web_subscription,
    unregister_native_token,
    unregister_web_subscription,
)

router = APIRouter(prefix="/notifications", tags=["notifications"])
settings = get_settings()


class PreferencesIn(BaseModel):
    in_app: dict | None = None
    email: dict | None = None
    push: dict | None = None


class NotificationReadIn(BaseModel):
    ids: list[uuid.UUID] | None = None


class WebPushKeysIn(BaseModel):
    p256dh: str
    auth: str


class WebPushSubscribeIn(BaseModel):
    endpoint: str = Field(min_length=8, max_length=5000)
    expirationTime: int | None = None
    keys: WebPushKeysIn
    platform: str | None = None


class WebPushUnsubscribeIn(BaseModel):
    endpoint: str = Field(min_length=8, max_length=5000)


class NativePushRegisterIn(BaseModel):
    platform: str = Field(pattern="^(ios|android)$")
    token: str = Field(min_length=16, max_length=4096)


@router.get("")
async def list_notifications(
    user: Annotated[TokenUser, Depends(current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    unread_only: bool = False,
    limit: int = 50,
) -> dict:
    stmt = select(Notification).where(
        Notification.user_id == user.id,
        Notification.organization_id == user.organization_id,
    )
    if unread_only:
        stmt = stmt.where(Notification.is_read.is_(False))

    rows = (await db.execute(stmt.order_by(desc(Notification.created_at)).limit(limit))).scalars().all()
    unread_count = await db.scalar(
        select(func.count(Notification.id)).where(
            Notification.user_id == user.id,
            Notification.organization_id == user.organization_id,
            Notification.is_read.is_(False),
        )
    )
    return {
        "items": [
            {
                "id": str(r.id),
                "kind": r.kind,
                "title": r.title,
                "body": r.body,
                "link_url": r.link_url,
                "icon": r.icon,
                "priority": r.priority,
                "meta": r.meta,
                "is_read": r.is_read,
                "read_at": r.read_at.isoformat() if r.read_at else None,
                "created_at": r.created_at.isoformat() if r.created_at else None,
            }
            for r in rows
        ],
        "unread": int(unread_count or 0),
    }


@router.post("/read")
async def mark_read(
    payload: NotificationReadIn,
    user: Annotated[TokenUser, Depends(current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict:
    stmt = update(Notification).where(Notification.user_id == user.id, Notification.organization_id == user.organization_id)
    if payload.ids:
        stmt = stmt.where(Notification.id.in_(payload.ids))
    await db.execute(stmt.values(is_read=True, read_at=datetime.now(UTC)))
    await db.commit()
    return {"ok": True}


@router.delete("/{notification_id}")
async def delete_notification(
    notification_id: uuid.UUID,
    user: Annotated[TokenUser, Depends(current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict:
    row = (
        await db.execute(
            select(Notification).where(
                Notification.id == notification_id,
                Notification.user_id == user.id,
                Notification.organization_id == user.organization_id,
            )
        )
    ).scalar_one_or_none()
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")
    await db.delete(row)
    await db.commit()
    return {"ok": True}


@router.delete("")
async def clear_notifications(
    user: Annotated[TokenUser, Depends(current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict:
    await db.execute(
        Notification.__table__.delete().where(
            Notification.user_id == user.id,
            Notification.organization_id == user.organization_id,
        )
    )
    await db.commit()
    return {"ok": True}


@router.get("/preferences")
async def get_preferences(
    user: Annotated[TokenUser, Depends(current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict:
    pref = (await db.execute(select(NotificationPreference).where(NotificationPreference.user_id == user.id))).scalar_one_or_none()
    if pref is None:
        pref = NotificationPreference(user_id=user.id)
        db.add(pref)
        await db.commit()
        await db.refresh(pref)
    return {"in_app": pref.in_app, "email": pref.email, "push": pref.push}


@router.put("/preferences")
async def update_preferences(
    payload: PreferencesIn,
    user: Annotated[TokenUser, Depends(current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict:
    pref = (await db.execute(select(NotificationPreference).where(NotificationPreference.user_id == user.id))).scalar_one_or_none()
    if pref is None:
        pref = NotificationPreference(user_id=user.id)
        db.add(pref)
    if payload.in_app is not None:
        pref.in_app = payload.in_app
    if payload.email is not None:
        pref.email = payload.email
    if payload.push is not None:
        pref.push = payload.push
    await db.commit()
    return {"ok": True}


@router.get("/push/public-key")
async def push_public_key(user: Annotated[TokenUser, Depends(current_user)]) -> dict:
    return {
        "public_key": settings.push_vapid_public_key,
        "supported": push_supported(),
    }


@router.post("/push/subscribe")
async def push_subscribe(
    payload: WebPushSubscribeIn,
    user: Annotated[TokenUser, Depends(current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    user_agent: Annotated[str | None, Header(alias="User-Agent")] = None,
) -> dict:
    row = await register_web_subscription(
        db,
        organization_id=user.organization_id,
        user_id=user.id,
        endpoint=payload.endpoint,
        p256dh=payload.keys.p256dh,
        auth=payload.keys.auth,
        user_agent=user_agent,
        platform=payload.platform,
    )
    await db.commit()
    return {"ok": True, "id": str(row.id)}


@router.post("/push/unsubscribe")
async def push_unsubscribe(
    payload: WebPushUnsubscribeIn,
    user: Annotated[TokenUser, Depends(current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict:
    changed = await unregister_web_subscription(db, user_id=user.id, endpoint=payload.endpoint)
    await db.commit()
    return {"ok": True, "deactivated": changed}


@router.post("/push/native/register")
async def register_native(
    payload: NativePushRegisterIn,
    user: Annotated[TokenUser, Depends(current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    user_agent: Annotated[str | None, Header(alias="User-Agent")] = None,
) -> dict:
    row = await register_native_token(
        db,
        organization_id=user.organization_id,
        user_id=user.id,
        platform=payload.platform,
        token=payload.token,
        user_agent=user_agent,
    )
    await db.commit()
    return {"ok": True, "id": str(row.id)}


@router.post("/push/native/unregister")
async def unregister_native(
    payload: NativePushRegisterIn,
    user: Annotated[TokenUser, Depends(current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict:
    changed = await unregister_native_token(
        db,
        user_id=user.id,
        platform=payload.platform,
        token=payload.token,
    )
    await db.commit()
    return {"ok": True, "deactivated": changed}
