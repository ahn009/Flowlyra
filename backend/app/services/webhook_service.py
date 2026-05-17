"""Webhook dispatcher with HMAC signing and retry support.

``dispatch_event`` enqueues a delivery row per active subscriber. ``deliver_now``
performs the HTTP POST and updates status. A Celery task (registered in
``system_tasks.py``) processes pending deliveries.
"""

from __future__ import annotations

import hashlib
import hmac
import json
import logging
import uuid
from datetime import UTC, datetime, timedelta
from typing import Any

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import AsyncSessionLocal
from app.models.webhook import Webhook, WebhookDelivery

logger = logging.getLogger(__name__)

MAX_ATTEMPTS = 8
BACKOFF_SECONDS = [30, 120, 300, 900, 1800, 3600, 7200, 14400]


def _is_subscribed(webhook: Webhook, event: str) -> bool:
    subscribed = (webhook.events or {}).get("subscribed", [])
    if not subscribed:
        return False
    if "*" in subscribed:
        return True
    if event in subscribed:
        return True
    prefix = event.split(".")[0] + ".*"
    return prefix in subscribed


def sign_payload(secret: str, body: bytes) -> str:
    digest = hmac.new(secret.encode("utf-8"), body, hashlib.sha256).hexdigest()
    return f"sha256={digest}"


async def dispatch_event(
    *,
    organization_id: uuid.UUID,
    event: str,
    payload: dict[str, Any],
    db: AsyncSession | None = None,
) -> None:
    async def _do(session: AsyncSession) -> None:
        webhooks = (
            await session.execute(
                select(Webhook).where(
                    Webhook.organization_id == organization_id,
                    Webhook.is_active.is_(True),
                )
            )
        ).scalars().all()
        for wh in webhooks:
            if not _is_subscribed(wh, event):
                continue
            session.add(
                WebhookDelivery(
                    webhook_id=wh.id,
                    organization_id=organization_id,
                    event=event,
                    payload={"event": event, "data": payload, "delivered_at": datetime.now(UTC).isoformat()},
                    status="pending",
                    next_retry_at=datetime.now(UTC),
                )
            )

    if db is not None:
        await _do(db)
        return
    async with AsyncSessionLocal() as session:
        await _do(session)
        await session.commit()


async def deliver_one(delivery_id: uuid.UUID) -> None:
    async with AsyncSessionLocal() as session:
        delivery = (await session.execute(select(WebhookDelivery).where(WebhookDelivery.id == delivery_id))).scalar_one_or_none()
        if delivery is None or delivery.status == "delivered":
            return
        webhook = (await session.execute(select(Webhook).where(Webhook.id == delivery.webhook_id))).scalar_one()
        body = json.dumps(delivery.payload, default=str).encode("utf-8")
        signature = sign_payload(webhook.secret, body)
        headers = {
            "Content-Type": "application/json",
            "User-Agent": "FlowLyra-Webhooks/1.0",
            "X-FlowLyra-Event": delivery.event,
            "X-FlowLyra-Delivery": str(delivery.id),
            "X-FlowLyra-Signature": signature,
            "X-FlowLyra-Timestamp": str(int(datetime.now(UTC).timestamp())),
        }
        delivery.attempt += 1
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                response = await client.post(webhook.url, content=body, headers=headers)
            delivery.status_code = response.status_code
            delivery.response_body = response.text[:2000]
            if 200 <= response.status_code < 300:
                delivery.status = "delivered"
                delivery.delivered_at = datetime.now(UTC)
                webhook.last_success_at = datetime.now(UTC)
                webhook.failure_streak = 0
            else:
                _schedule_retry(delivery, webhook)
        except Exception as exc:  # noqa: BLE001
            delivery.response_body = str(exc)[:2000]
            _schedule_retry(delivery, webhook)
        await session.commit()


def _schedule_retry(delivery: WebhookDelivery, webhook: Webhook) -> None:
    webhook.last_failure_at = datetime.now(UTC)
    webhook.failure_streak += 1
    if delivery.attempt >= MAX_ATTEMPTS:
        delivery.status = "failed"
        delivery.next_retry_at = None
        if webhook.failure_streak >= 20:
            webhook.is_active = False
        return
    backoff = BACKOFF_SECONDS[min(delivery.attempt - 1, len(BACKOFF_SECONDS) - 1)]
    delivery.status = "retry"
    delivery.next_retry_at = datetime.now(UTC) + timedelta(seconds=backoff)
