import asyncio
import logging
from datetime import UTC, datetime

from sqlalchemy import or_, select

from app.db.session import AsyncSessionLocal
from app.models.ticket import Ticket, TicketFollower
from app.models.user import User
from app.models.webhook import WebhookDelivery
from app.services.notification_service import notify
from app.workers.celery_app import celery_app

logger = logging.getLogger(__name__)


@celery_app.task(name="app.workers.system_tasks.ping")
def ping(echo: str = "ping") -> dict[str, str]:
    return {"status": "ok", "echo": echo, "timestamp": datetime.now(UTC).isoformat()}


@celery_app.task(name="app.workers.system_tasks.dispatch_webhook_deliveries", bind=True, autoretry_for=(Exception,), retry_backoff=True, retry_backoff_max=60, max_retries=3)
def dispatch_webhook_deliveries(self, batch_size: int = 50) -> dict[str, int]:
    """Pick up pending/retry webhook deliveries due now and POST them."""

    from app.services.webhook_service import deliver_one

    async def _run() -> int:
        async with AsyncSessionLocal() as session:
            now = datetime.now(UTC)
            rows = (
                await session.execute(
                    select(WebhookDelivery.id)
                    .where(WebhookDelivery.status.in_(["pending", "retry"]))
                    .where((WebhookDelivery.next_retry_at == None) | (WebhookDelivery.next_retry_at <= now))  # noqa: E711
                    .order_by(WebhookDelivery.created_at)
                    .limit(batch_size)
                )
            ).scalars().all()
        processed = 0
        for delivery_id in rows:
            try:
                await deliver_one(delivery_id)
                processed += 1
            except Exception:  # noqa: BLE001
                logger.exception("delivery %s failed", delivery_id)
        return processed

    processed = asyncio.run(_run())
    return {"processed": processed}


@celery_app.task(name="app.workers.system_tasks.check_ticket_sla_breaches")
def check_ticket_sla_breaches(batch_size: int = 200) -> dict[str, int]:
    async def _run() -> dict[str, int]:
        async with AsyncSessionLocal() as db:
            now = datetime.now(UTC)
            rows = (
                await db.execute(
                    select(Ticket)
                    .where(
                        Ticket.status.in_(["open", "pending", "onhold", "active"]),
                        or_(
                            Ticket.sla_first_response_due_at <= now,
                            Ticket.sla_resolution_due_at <= now,
                        ),
                    )
                    .order_by(Ticket.updated_at.asc())
                    .limit(batch_size)
                )
            ).scalars().all()
            first_breaches = 0
            resolution_breaches = 0
            for ticket in rows:
                changed = False
                if ticket.first_response_at is None and ticket.sla_first_response_due_at and ticket.sla_first_response_due_at <= now and not ticket.first_response_breached:
                    ticket.first_response_breached = True
                    changed = True
                    first_breaches += 1
                if ticket.sla_resolution_due_at and ticket.sla_resolution_due_at <= now and not ticket.resolution_breached:
                    ticket.resolution_breached = True
                    ticket.sla_breached = True
                    changed = True
                    resolution_breaches += 1
                if not changed:
                    continue
                recipients: set = set()
                if ticket.assigned_user_id:
                    recipients.add(ticket.assigned_user_id)
                followers = (
                    await db.execute(select(TicketFollower.user_id).where(TicketFollower.ticket_id == ticket.id))
                ).scalars().all()
                recipients.update(uid for uid in followers)
                if not recipients:
                    admins = (
                        await db.execute(
                            select(User.id).where(
                                User.organization_id == ticket.organization_id,
                                User.role.in_(["admin", "owner", "supervisor"]),
                                User.is_active.is_(True),
                            )
                        )
                    ).scalars().all()
                    recipients.update(uid for uid in admins)
                for recipient_id in recipients:
                    await notify(
                        organization_id=ticket.organization_id,
                        user_id=recipient_id,
                        kind="ticket.sla_breach",
                        title=f"SLA breach on ticket #{ticket.ticket_number}",
                        body=ticket.subject,
                        link_url=f"/ticket/{ticket.id}",
                        db=db,
                    )
            await db.commit()
            return {"checked": len(rows), "first_response_breaches": first_breaches, "resolution_breaches": resolution_breaches}

    return asyncio.run(_run())


@celery_app.task(name="app.workers.system_tasks.publish_scheduled_kb_articles")
def publish_scheduled_kb_articles() -> dict[str, int]:
    from app.services.kb_service import publish_scheduled_articles

    async def _run() -> int:
        async with AsyncSessionLocal() as db:
            return await publish_scheduled_articles(db)

    promoted = asyncio.run(_run())
    return {"promoted": promoted}
