"""Webhook subscription management for outbound integrations."""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Annotated
import secrets
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, HttpUrl
from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.middleware.auth import TokenUser
from app.models.webhook import Webhook, WebhookDelivery
from app.services.permissions import require_permission
from app.services.plan_service import assert_under_limit
from app.services.webhook_events import ALL_EVENTS
from app.services.webhook_service import deliver_one, dispatch_event

router = APIRouter(prefix="/webhooks", tags=["webhooks"])


class WebhookIn(BaseModel):
    url: HttpUrl
    events: list[str] = ["*"]
    description: str | None = None


class WebhookUpdate(BaseModel):
    url: HttpUrl | None = None
    events: list[str] | None = None
    description: str | None = None
    is_active: bool | None = None


def _serialize(wh: Webhook, *, include_secret: bool = False) -> dict:
    data = {
        "id": str(wh.id),
        "url": wh.url,
        "events": wh.events.get("subscribed", []) if wh.events else [],
        "description": wh.description,
        "is_active": wh.is_active,
        "last_success_at": wh.last_success_at.isoformat() if wh.last_success_at else None,
        "last_failure_at": wh.last_failure_at.isoformat() if wh.last_failure_at else None,
        "failure_streak": wh.failure_streak,
        "created_at": wh.created_at.isoformat() if wh.created_at else None,
    }
    if include_secret:
        data["secret"] = wh.secret
    return data


@router.get("/events/catalog")
async def event_catalog(user: Annotated[TokenUser, Depends(require_permission("webhooks.write"))]) -> dict:
    return {"events": ALL_EVENTS}


@router.get("")
async def list_webhooks(
    user: Annotated[TokenUser, Depends(require_permission("webhooks.write"))],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> list[dict]:
    rows = (
        await db.execute(
            select(Webhook)
            .where(Webhook.organization_id == user.organization_id)
            .order_by(Webhook.created_at.desc())
        )
    ).scalars().all()
    return [_serialize(r) for r in rows]


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_webhook(
    payload: WebhookIn,
    user: Annotated[TokenUser, Depends(require_permission("webhooks.write"))],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict:
    current = (
        await db.execute(select(func.count(Webhook.id)).where(Webhook.organization_id == user.organization_id))
    ).scalar_one()
    await assert_under_limit(db, user.organization_id, limit_name="webhooks", current_count=current)
    wh = Webhook(
        organization_id=user.organization_id,
        url=str(payload.url),
        events={"subscribed": payload.events or ["*"]},
        secret=secrets.token_urlsafe(48),
        description=payload.description,
    )
    db.add(wh)
    await db.commit()
    await db.refresh(wh)
    return _serialize(wh, include_secret=True)


@router.patch("/{webhook_id}")
async def update_webhook(
    webhook_id: uuid.UUID,
    payload: WebhookUpdate,
    user: Annotated[TokenUser, Depends(require_permission("webhooks.write"))],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict:
    wh = (await db.execute(select(Webhook).where(Webhook.id == webhook_id, Webhook.organization_id == user.organization_id))).scalar_one_or_none()
    if wh is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Webhook not found")
    if payload.url is not None:
        wh.url = str(payload.url)
    if payload.events is not None:
        wh.events = {"subscribed": payload.events}
    if payload.description is not None:
        wh.description = payload.description
    if payload.is_active is not None:
        wh.is_active = payload.is_active
    await db.commit()
    await db.refresh(wh)
    return _serialize(wh)


@router.delete("/{webhook_id}")
async def delete_webhook(
    webhook_id: uuid.UUID,
    user: Annotated[TokenUser, Depends(require_permission("webhooks.write"))],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict:
    wh = (await db.execute(select(Webhook).where(Webhook.id == webhook_id, Webhook.organization_id == user.organization_id))).scalar_one_or_none()
    if wh is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Webhook not found")
    await db.delete(wh)
    await db.commit()
    return {"ok": True}


@router.get("/{webhook_id}/deliveries")
async def list_deliveries(
    webhook_id: uuid.UUID,
    user: Annotated[TokenUser, Depends(require_permission("webhooks.write"))],
    db: Annotated[AsyncSession, Depends(get_db)],
    limit: int = 50,
) -> dict:
    rows = (
        await db.execute(
            select(WebhookDelivery)
            .where(
                WebhookDelivery.webhook_id == webhook_id,
                WebhookDelivery.organization_id == user.organization_id,
            )
            .order_by(desc(WebhookDelivery.created_at))
            .limit(limit)
        )
    ).scalars().all()
    return {
        "items": [
            {
                "id": str(r.id),
                "event": r.event,
                "status": r.status,
                "status_code": r.status_code,
                "response_body": r.response_body,
                "attempt": r.attempt,
                "next_retry_at": r.next_retry_at.isoformat() if r.next_retry_at else None,
                "delivered_at": r.delivered_at.isoformat() if r.delivered_at else None,
                "created_at": r.created_at.isoformat() if r.created_at else None,
            }
            for r in rows
        ]
    }


@router.post("/{webhook_id}/test")
async def test_webhook(
    webhook_id: uuid.UUID,
    user: Annotated[TokenUser, Depends(require_permission("webhooks.write"))],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict:
    wh = (
        await db.execute(select(Webhook).where(Webhook.id == webhook_id, Webhook.organization_id == user.organization_id))
    ).scalar_one_or_none()
    if wh is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Webhook not found")
    await dispatch_event(
        organization_id=user.organization_id,
        event="webhook.test",
        payload={"webhook_id": str(wh.id), "sent_by": str(user.id)},
        db=db,
    )
    await db.commit()
    delivery = (
        await db.execute(
            select(WebhookDelivery)
            .where(WebhookDelivery.webhook_id == wh.id, WebhookDelivery.organization_id == user.organization_id)
            .order_by(desc(WebhookDelivery.created_at))
            .limit(1)
        )
    ).scalar_one_or_none()
    if delivery is not None:
        await deliver_one(delivery.id)
    return {"ok": True, "delivery_id": str(delivery.id) if delivery else None}


@router.post("/deliveries/{delivery_id}/replay")
async def replay_delivery(
    delivery_id: uuid.UUID,
    user: Annotated[TokenUser, Depends(require_permission("webhooks.write"))],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict:
    original = (
        await db.execute(
            select(WebhookDelivery).where(
                WebhookDelivery.id == delivery_id,
                WebhookDelivery.organization_id == user.organization_id,
            )
        )
    ).scalar_one_or_none()
    if original is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Delivery not found")
    replay = WebhookDelivery(
        webhook_id=original.webhook_id,
        organization_id=original.organization_id,
        event=original.event,
        payload=original.payload,
        status="pending",
        attempt=0,
        next_retry_at=datetime.now(UTC),
    )
    db.add(replay)
    await db.commit()
    await db.refresh(replay)
    await deliver_one(replay.id)
    return {"ok": True, "delivery_id": str(replay.id)}
