"""In-app notification API: list, mark read, preferences."""

from __future__ import annotations

from typing import Annotated
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import desc, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.middleware.auth import TokenUser, current_user
from app.models.notification import Notification, NotificationPreference

router = APIRouter(prefix="/notifications", tags=["notifications"])


class PreferencesIn(BaseModel):
    in_app: dict | None = None
    email: dict | None = None
    push: dict | None = None


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
                "created_at": r.created_at.isoformat() if r.created_at else None,
            }
            for r in rows
        ]
    }


@router.post("/read")
async def mark_read(
    user: Annotated[TokenUser, Depends(current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    ids: list[uuid.UUID] | None = None,
) -> dict:
    stmt = update(Notification).where(Notification.user_id == user.id)
    if ids:
        stmt = stmt.where(Notification.id.in_(ids))
    await db.execute(stmt.values(is_read=True))
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
