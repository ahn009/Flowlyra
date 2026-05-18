import asyncio
import io
import json
import logging
import uuid
import zipfile
from datetime import UTC, datetime, timedelta

from sqlalchemy import delete, or_, select

from app.db.session import AsyncSessionLocal
from app.models.ticket import Ticket, TicketFollower
from app.models.user import User
from app.models.webhook import WebhookDelivery
from app.models.report_schedule import ReportSchedule
from app.models.ecommerce import Cart
from app.models.organization import Organization
from app.services.email_service import send_email
from app.services.notification_service import dispatch_due_email_digests, notify
from app.services.onboarding_drip_service import run_onboarding_drip_for_org
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


@celery_app.task(name="app.workers.system_tasks.dispatch_notification_digests")
def dispatch_notification_digests() -> dict[str, int]:
    async def _run() -> dict[str, int]:
        async with AsyncSessionLocal() as db:
            hourly = await dispatch_due_email_digests(db, "hourly")
            daily = await dispatch_due_email_digests(db, "daily")
            return {"hourly": hourly, "daily": daily}

    return asyncio.run(_run())


@celery_app.task(name="app.workers.system_tasks.run_onboarding_drip")
def run_onboarding_drip() -> dict[str, int]:
    async def _run() -> dict[str, int]:
        async with AsyncSessionLocal() as db:
            org_ids = (await db.execute(select(Organization.id).where(Organization.is_active.is_(True)))).scalars().all()
            sent = 0
            for org_id in org_ids:
                sent += await run_onboarding_drip_for_org(db, organization_id=org_id)
            await db.commit()
            return {"organizations": len(org_ids), "sent": sent}

    return asyncio.run(_run())


@celery_app.task(name="app.workers.system_tasks.run_cart_recovery_campaigns")
def run_cart_recovery_campaigns(inactive_minutes: int = 60) -> dict[str, int]:
    async def _run() -> dict[str, int]:
        cutoff = datetime.now(UTC) - timedelta(minutes=max(5, inactive_minutes))
        async with AsyncSessionLocal() as db:
            rows = (
                await db.execute(
                    select(Cart).where(
                        Cart.status == "active",
                        Cart.last_activity_at <= cutoff,
                        Cart.total > 0,
                    )
                )
            ).scalars().all()
            changed = 0
            for row in rows:
                row.status = "abandoned"
                changed += 1
            await db.commit()
            return {"abandoned": changed}

    return asyncio.run(_run())


@celery_app.task(name="app.workers.system_tasks.dispatch_scheduled_reports")
def dispatch_scheduled_reports(batch_size: int = 100) -> dict[str, int]:
    async def _run() -> dict[str, int]:
        now = datetime.now(UTC)
        sent = 0
        async with AsyncSessionLocal() as db:
            schedules = (
                await db.execute(
                    select(ReportSchedule)
                    .where(
                        ReportSchedule.is_active.is_(True),
                        ReportSchedule.next_run_at.is_not(None),
                        ReportSchedule.next_run_at <= now,
                    )
                    .order_by(ReportSchedule.next_run_at.asc())
                    .limit(batch_size)
                )
            ).scalars().all()
            for schedule in schedules:
                recipients = list((schedule.recipients or {}).get("emails") or [])
                if not recipients:
                    continue
                # Keep payload compact; downloadable CSV remains available via API endpoint.
                report_url = f"/api/v1/analytics/export.csv?report={schedule.report_type}"
                html = (
                    f"<p>Your scheduled report <b>{schedule.name}</b> is ready.</p>"
                    f"<p>Report type: <code>{schedule.report_type}</code></p>"
                    f"<p>Download: <code>{report_url}</code></p>"
                )
                for email in recipients:
                    await send_email(email, f"FlowLyra report: {schedule.name}", html)
                schedule.last_sent_at = now
                if schedule.frequency == "monthly":
                    schedule.next_run_at = now + timedelta(days=30)
                else:
                    schedule.next_run_at = now + timedelta(days=7)
                sent += 1
            await db.commit()
        return {"processed": len(schedules), "sent": sent}

    return asyncio.run(_run())


def _serialize_row(row) -> dict:
    out = {}
    for col in row.__table__.columns:
        val = getattr(row, col.name)
        if isinstance(val, uuid.UUID):
            out[col.name] = str(val)
        elif isinstance(val, datetime):
            out[col.name] = val.isoformat()
        else:
            out[col.name] = val
    return out


@celery_app.task(name="app.workers.system_tasks.run_data_export", bind=True, max_retries=3)
def run_data_export(self, job_id: str) -> dict:
    """Bundle org or contact data into a zip and upload to S3 (GDPR 12.14)."""

    from app.models.chat import Chat
    from app.models.contact import Contact
    from app.models.message import Message
    from app.models.security import DataExportJob
    from app.models.ticket import Ticket
    from app.services.upload_service import upload_bytes

    async def _run() -> dict:
        async with AsyncSessionLocal() as db:
            job = (
                await db.execute(select(DataExportJob).where(DataExportJob.id == uuid.UUID(job_id)))
            ).scalar_one_or_none()
            if job is None:
                return {"status": "missing"}
            job.status = "running"
            await db.commit()
            try:
                org_id = job.organization_id
                buf = io.BytesIO()
                with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
                    if job.scope == "contact" and job.target_id:
                        contact = (
                            await db.execute(
                                select(Contact).where(Contact.id == job.target_id, Contact.organization_id == org_id)
                            )
                        ).scalar_one_or_none()
                        if contact is not None:
                            zf.writestr("contact.json", json.dumps(_serialize_row(contact), indent=2))
                            chats = (await db.execute(select(Chat).where(Chat.contact_id == contact.id))).scalars().all()
                            zf.writestr("chats.json", json.dumps([_serialize_row(c) for c in chats], indent=2))
                            messages = (
                                await db.execute(select(Message).where(Message.contact_id == contact.id))
                            ).scalars().all()
                            zf.writestr("messages.json", json.dumps([_serialize_row(m) for m in messages], indent=2))
                            tickets = (
                                await db.execute(select(Ticket).where(Ticket.contact_id == contact.id))
                            ).scalars().all()
                            zf.writestr("tickets.json", json.dumps([_serialize_row(t) for t in tickets], indent=2))
                    else:
                        contacts = (
                            await db.execute(select(Contact).where(Contact.organization_id == org_id).limit(50_000))
                        ).scalars().all()
                        zf.writestr("contacts.json", json.dumps([_serialize_row(c) for c in contacts], indent=2))
                        chats = (
                            await db.execute(select(Chat).where(Chat.organization_id == org_id).limit(100_000))
                        ).scalars().all()
                        zf.writestr("chats.json", json.dumps([_serialize_row(c) for c in chats], indent=2))
                        tickets = (
                            await db.execute(select(Ticket).where(Ticket.organization_id == org_id).limit(100_000))
                        ).scalars().all()
                        zf.writestr("tickets.json", json.dumps([_serialize_row(t) for t in tickets], indent=2))
                payload = buf.getvalue()
                key = f"data-exports/{org_id}/{job.id}.zip"
                url = await upload_bytes(key, payload, content_type="application/zip", organization_id=org_id)
                job.file_url = url
                job.size_bytes = len(payload)
                job.status = "completed"
                job.completed_at = datetime.now(UTC)
            except Exception as exc:  # noqa: BLE001
                job.status = "failed"
                job.error_message = str(exc)[:1000]
                logger.exception("data export failed job=%s", job_id)
            await db.commit()
            return {"status": job.status}

    return asyncio.run(_run())


@celery_app.task(name="app.workers.system_tasks.sweep_retention")
def sweep_retention() -> dict:
    """Soft-delete/anonymize rows past their per-org retention window (12.16)."""

    from app.models.audit_log import AuditLog
    from app.models.chat import Chat
    from app.models.message import Message
    from app.models.security import RetentionPolicy
    from app.models.session import Session as VisitorSession
    from app.models.ticket import Ticket

    async def _run() -> dict:
        now = datetime.now(UTC)
        async with AsyncSessionLocal() as db:
            policies = (await db.execute(select(RetentionPolicy).where(RetentionPolicy.enabled.is_(True)))).scalars().all()
            totals = {"chats": 0, "tickets": 0, "audit": 0, "sessions": 0}
            for policy in policies:
                org_id = policy.organization_id
                if policy.chat_days and policy.chat_days > 0:
                    cutoff = now - timedelta(days=policy.chat_days)
                    chats = (await db.execute(select(Chat.id).where(Chat.organization_id == org_id, Chat.created_at < cutoff))).scalars().all()
                    if chats:
                        await db.execute(delete(Message).where(Message.chat_id.in_(chats)))
                        await db.execute(delete(Chat).where(Chat.id.in_(chats)))
                        totals["chats"] += len(chats)
                if policy.ticket_days and policy.ticket_days > 0:
                    cutoff = now - timedelta(days=policy.ticket_days)
                    res = await db.execute(delete(Ticket).where(Ticket.organization_id == org_id, Ticket.created_at < cutoff))
                    totals["tickets"] += res.rowcount or 0
                if policy.audit_days and policy.audit_days > 0:
                    cutoff = now - timedelta(days=policy.audit_days)
                    res = await db.execute(delete(AuditLog).where(AuditLog.organization_id == org_id, AuditLog.created_at < cutoff))
                    totals["audit"] += res.rowcount or 0
                if policy.session_days and policy.session_days > 0:
                    cutoff = now - timedelta(days=policy.session_days)
                    res = await db.execute(delete(VisitorSession).where(VisitorSession.organization_id == org_id, VisitorSession.last_seen_at < cutoff))
                    totals["sessions"] += res.rowcount or 0
            await db.commit()
            return totals

    return asyncio.run(_run())
