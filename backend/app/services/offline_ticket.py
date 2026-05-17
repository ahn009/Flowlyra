"""Create a support Ticket from an offline-form submission and notify the team."""

from __future__ import annotations

import logging
import uuid
from datetime import UTC, datetime

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.organization import Organization
from app.models.ticket import Ticket
from app.services.email_service import send_email
from app.services.email_templates import render as render_template
from app.services.webhook_events import TICKET_CREATED
from app.services.webhook_service import dispatch_event

logger = logging.getLogger(__name__)


async def create_from_offline_form(
    db: AsyncSession,
    organization: Organization,
    *,
    email: str,
    message: str,
    name: str | None = None,
    phone: str | None = None,
    page_url: str | None = None,
    contact_id: uuid.UUID | None = None,
) -> Ticket:
    description_parts: list[str] = [message.strip() or "(no message body)"]
    description_parts.append("")
    description_parts.append(f"Email: {email}")
    if name:
        description_parts.append(f"Name: {name}")
    if phone:
        description_parts.append(f"Phone: {phone}")
    if page_url:
        description_parts.append(f"Page: {page_url}")
    description_parts.append(f"Received: {datetime.now(UTC).isoformat()}")
    description_parts.append("Source: widget_offline")

    ticket = Ticket(
        organization_id=organization.id,
        contact_id=contact_id,
        subject=f"Offline message from {name or email}",
        description="\n".join(description_parts),
        priority="medium",
        status="open",
        tags=["offline", "widget"],
    )
    db.add(ticket)
    await db.flush()

    # Acknowledge to visitor
    try:
        ack_subject = f"We received your message — {organization.name}"
        await send_email(
            email,
            ack_subject,
            f"<p>Hi{(' ' + name) if name else ''},</p>"
            f"<p>Thanks for reaching out. We received your message and will reply soon.</p>"
            f"<blockquote>{message}</blockquote>",
        )
    except Exception:  # noqa: BLE001
        logger.exception("offline form ack email failed contact=%s", email)

    # Dispatch webhook
    try:
        await dispatch_event(
            organization_id=organization.id,
            event=TICKET_CREATED,
            payload={
                "ticket_id": str(ticket.id),
                "subject": ticket.subject,
                "source": "widget_offline",
                "email": email,
            },
            db=db,
        )
    except Exception:  # noqa: BLE001
        logger.exception("offline form webhook dispatch failed")

    return ticket
