from datetime import UTC, datetime, timedelta
import secrets

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.db.session import get_db
from app.models.contact import Contact
from app.models.organization import Organization
from app.models.ticket import Ticket, TicketComment, TicketPortalToken
from app.schemas.public import ContactRequest
from app.schemas.ticket import InboundEmailPayload, PortalTicketCreate, PortalTicketReply, TicketOut
from app.services.email_service import send_email
from app.services.ticket_service import create_ticket, log_ticket_activity

router = APIRouter(prefix="/public", tags=["public"])


@router.post("/contact")
async def contact(payload: ContactRequest) -> dict:
    settings = get_settings()
    subject = "FlowLyra Contact Request"
    company_line = f"<p><b>Company:</b> {payload.company}</p>" if payload.company else ""
    html = (
        "<h3>New contact request</h3>"
        f"<p><b>Name:</b> {payload.full_name}</p>"
        f"<p><b>Email:</b> {payload.email}</p>"
        f"{company_line}"
        f"<p><b>Message:</b><br/>{payload.message}</p>"
    )
    await send_email(settings.from_email, subject, html)
    return {"ok": True}


@router.get("/client-ip")
async def client_ip(request: Request) -> dict:
    return {"ip": request.client.host if request.client else None}


@router.post("/tickets/inbound-email")
async def inbound_email(payload: InboundEmailPayload, db: AsyncSession = Depends(get_db)) -> dict:
    org = (
        await db.execute(
            select(Organization).where(
                Organization.slug == payload.org_slug,
                Organization.is_active.is_(True),
            )
        )
    ).scalar_one_or_none()
    if org is None:
        return {"ok": True, "created": False}

    contact = (
        await db.execute(
            select(Contact).where(
                Contact.organization_id == org.id,
                Contact.email == payload.from_email,
            )
        )
    ).scalar_one_or_none()
    if contact is None:
        contact = Contact(
            organization_id=org.id,
            email=payload.from_email,
            full_name=payload.from_name,
        )
        db.add(contact)
        await db.flush()

    ticket: Ticket | None = None
    if payload.in_reply_to:
        ticket = (
            await db.execute(
                select(Ticket).where(
                    Ticket.organization_id == org.id,
                    Ticket.email_thread_id == payload.in_reply_to,
                )
            )
        ).scalar_one_or_none()
    if ticket is None:
        ticket = Ticket(
            organization_id=org.id,
            contact_id=contact.id,
            subject=payload.subject or "Email ticket",
            description=payload.body_text,
            status="open",
            priority="normal",
            email_thread_id=payload.message_id or payload.in_reply_to,
            email_message_ids={"items": [x for x in [payload.message_id] if x]},
            portal_enabled=True,
        )
        db.add(ticket)
        await db.flush()
        await log_ticket_activity(
            db,
            organization_id=org.id,
            ticket_id=ticket.id,
            actor_user_id=None,
            event_type="ticket.email_inbound",
            title="Inbound email created ticket",
            body=payload.subject,
            meta={"from": payload.from_email},
        )
        created = True
    else:
        db.add(
            TicketComment(
                ticket_id=ticket.id,
                user_id=None,
                content=payload.body_text,
                is_internal=False,
                content_format="plain",
            )
        )
        ids = list((ticket.email_message_ids or {}).get("items") or [])
        if payload.message_id:
            ids.append(payload.message_id)
            ticket.email_message_ids = {"items": ids[-50:]}
        ticket.updated_at = datetime.now(UTC)
        await log_ticket_activity(
            db,
            organization_id=org.id,
            ticket_id=ticket.id,
            actor_user_id=None,
            event_type="ticket.email_reply",
            title="Inbound email reply appended",
            body=payload.subject,
            meta={"from": payload.from_email},
        )
        created = False

    await db.commit()
    return {"ok": True, "created": created, "ticket_id": str(ticket.id)}


@router.post("/tickets/portal/request")
async def portal_request(payload: dict, db: AsyncSession = Depends(get_db)) -> dict:
    org_slug = str(payload.get("org_slug") or "")
    email = str(payload.get("email") or "")
    org = (
        await db.execute(
            select(Organization).where(
                Organization.slug == org_slug,
                Organization.is_active.is_(True),
            )
        )
    ).scalar_one_or_none()
    if org is None:
        return {"ok": True}
    contact = (
        await db.execute(
            select(Contact).where(
                Contact.organization_id == org.id,
                Contact.email == email,
            )
        )
    ).scalar_one_or_none()
    if contact is None:
        return {"ok": True}
    token = secrets.token_urlsafe(36)
    expires_at = datetime.now(UTC) + timedelta(hours=24)
    db.add(
        TicketPortalToken(
            organization_id=org.id,
            contact_id=contact.id,
            token=token,
            expires_at=expires_at,
        )
    )
    await db.commit()
    return {"ok": True, "token": token, "expires_at": expires_at.isoformat()}


@router.post("/tickets/portal/consume")
async def portal_consume(payload: dict, db: AsyncSession = Depends(get_db)) -> dict:
    token_value = str(payload.get("token") or "")
    token = (
        await db.execute(select(TicketPortalToken).where(TicketPortalToken.token == token_value))
    ).scalar_one_or_none()
    if token is None or token.consumed_at is not None or token.expires_at < datetime.now(UTC):
        raise HTTPException(status_code=404, detail="Token not found or expired")
    token.consumed_at = datetime.now(UTC)
    tickets = (
        await db.execute(
            select(Ticket)
            .where(Ticket.organization_id == token.organization_id, Ticket.contact_id == token.contact_id)
            .order_by(Ticket.updated_at.desc())
            .limit(100)
        )
    ).scalars().all()
    await db.commit()
    return {"ok": True, "contact_id": str(token.contact_id), "tickets": [TicketOut.model_validate(t).model_dump() for t in tickets]}


@router.post("/tickets/portal/create", response_model=TicketOut)
async def portal_create(payload: PortalTicketCreate, db: AsyncSession = Depends(get_db)) -> Ticket:
    token = (
        await db.execute(select(TicketPortalToken).where(TicketPortalToken.token == payload.token))
    ).scalar_one_or_none()
    if token is None or token.expires_at < datetime.now(UTC):
        raise HTTPException(status_code=404, detail="Portal token expired")
    ticket = await create_ticket(
        db,
        token.organization_id,
        {
            "subject": payload.subject,
            "description": payload.description,
            "contact_id": token.contact_id,
            "priority": payload.priority,
            "status": "open",
            "portal_enabled": True,
        },
        None,
    )
    await db.commit()
    await db.refresh(ticket)
    return ticket


@router.post("/tickets/portal/reply")
async def portal_reply(payload: PortalTicketReply, db: AsyncSession = Depends(get_db)) -> dict:
    token = (
        await db.execute(select(TicketPortalToken).where(TicketPortalToken.token == payload.token))
    ).scalar_one_or_none()
    if token is None or token.expires_at < datetime.now(UTC):
        raise HTTPException(status_code=404, detail="Portal token expired")
    ticket = (
        await db.execute(
            select(Ticket)
            .where(Ticket.organization_id == token.organization_id, Ticket.contact_id == token.contact_id)
            .order_by(Ticket.updated_at.desc())
            .limit(1)
        )
    ).scalar_one_or_none()
    if ticket is None:
        raise HTTPException(status_code=404, detail="No ticket found")
    comment = TicketComment(ticket_id=ticket.id, user_id=None, content=payload.content, is_internal=False, content_format="plain")
    db.add(comment)
    ticket.updated_at = datetime.now(UTC)
    await log_ticket_activity(
        db,
        organization_id=ticket.organization_id,
        ticket_id=ticket.id,
        actor_user_id=None,
        event_type="ticket.portal_reply",
        title="Portal reply received",
        body=payload.content[:240],
    )
    await db.commit()
    return {"ok": True, "ticket_id": str(ticket.id)}
