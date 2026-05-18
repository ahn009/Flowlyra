from datetime import UTC, datetime, timedelta
import json
import secrets
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.db.redis import get_redis, ns
from app.db.session import get_db
from app.models.analytics_event import AnalyticsEvent
from app.models.contact import Contact
from app.models.organization import Organization
from app.models.polish import MarketingPost, StatusIncident
from app.models.ticket import Ticket, TicketComment, TicketPortalToken
from app.schemas.public import ContactRequest
from app.schemas.ticket import InboundEmailPayload, PortalTicketCreate, PortalTicketReply, TicketOut
from app.services.email_service import send_email
from app.services.ticket_service import create_ticket, log_ticket_activity

router = APIRouter(prefix="/public", tags=["public"])
PIXEL_GIF = (
    b"GIF89a"
    b"\x01\x00\x01\x00"
    b"\x80\x00\x00"
    b"\x00\x00\x00\xff\xff\xff"
    b"!\xf9\x04\x01\x00\x00\x00\x00"
    b",\x00\x00\x00\x00\x01\x00\x01\x00\x00"
    b"\x02\x02D\x01\x00;"
)


def _incident_out(row: StatusIncident) -> dict:
    return {
        "id": str(row.id),
        "title": row.title,
        "body": row.body,
        "status": row.status,
        "impact": row.impact,
        "components": list((row.components or {}).get("items") or []),
        "started_at": row.started_at.isoformat() if row.started_at else None,
        "resolved_at": row.resolved_at.isoformat() if row.resolved_at else None,
        "updated_at": row.updated_at.isoformat() if row.updated_at else None,
    }


def _post_out(row: MarketingPost) -> dict:
    return {
        "id": str(row.id),
        "slug": row.slug,
        "title": row.title,
        "excerpt": row.excerpt,
        "content_markdown": row.content_markdown,
        "cover_image_url": row.cover_image_url,
        "tags": list((row.tags or {}).get("items") or []),
        "published_at": row.published_at.isoformat() if row.published_at else None,
        "updated_at": row.updated_at.isoformat() if row.updated_at else None,
    }


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


@router.get("/status/incidents")
async def public_status_incidents(
    db: AsyncSession = Depends(get_db),
    org_slug: str | None = None,
    limit: int = Query(30, ge=1, le=200),
) -> dict:
    org_id: uuid.UUID | None = None
    if org_slug:
        org = (
            await db.execute(select(Organization).where(Organization.slug == org_slug, Organization.is_active.is_(True)))
        ).scalar_one_or_none()
        if org is not None:
            org_id = org.id
    stmt = select(StatusIncident).where(StatusIncident.is_public.is_(True))
    if org_id is not None:
        stmt = stmt.where(StatusIncident.organization_id == org_id)
    rows = (
        await db.execute(stmt.order_by(StatusIncident.started_at.desc(), StatusIncident.created_at.desc()).limit(limit))
    ).scalars().all()
    return {"items": [_incident_out(row) for row in rows]}


@router.get("/blog/posts")
async def public_blog_posts(
    db: AsyncSession = Depends(get_db),
    org_slug: str | None = None,
    q: str | None = None,
    limit: int = Query(30, ge=1, le=200),
) -> dict:
    org_id: uuid.UUID | None = None
    if org_slug:
        org = (
            await db.execute(select(Organization).where(Organization.slug == org_slug, Organization.is_active.is_(True)))
        ).scalar_one_or_none()
        if org is not None:
            org_id = org.id
    stmt = select(MarketingPost).where(MarketingPost.is_published.is_(True))
    if org_id is not None:
        stmt = stmt.where(MarketingPost.organization_id == org_id)
    if q:
        like = f"%{q.strip()}%"
        stmt = stmt.where(
            or_(
                MarketingPost.title.ilike(like),
                MarketingPost.excerpt.ilike(like),
                MarketingPost.content_markdown.ilike(like),
            )
        )
    rows = (
        await db.execute(
            stmt.order_by(MarketingPost.published_at.desc().nullslast(), MarketingPost.created_at.desc()).limit(limit)
        )
    ).scalars().all()
    return {"items": [_post_out(row) for row in rows]}


@router.get("/blog/posts/{slug}")
async def public_blog_post(slug: str, db: AsyncSession = Depends(get_db), org_slug: str | None = None) -> dict:
    org_id: uuid.UUID | None = None
    if org_slug:
        org = (
            await db.execute(select(Organization).where(Organization.slug == org_slug, Organization.is_active.is_(True)))
        ).scalar_one_or_none()
        if org is not None:
            org_id = org.id
    stmt = select(MarketingPost).where(MarketingPost.slug == slug, MarketingPost.is_published.is_(True))
    if org_id is not None:
        stmt = stmt.where(MarketingPost.organization_id == org_id)
    row = (await db.execute(stmt.order_by(MarketingPost.created_at.desc()))).scalars().first()
    if row is None:
        raise HTTPException(status_code=404, detail="Post not found")
    return {"item": _post_out(row)}


@router.get("/pixel.gif")
async def conversion_pixel(
    request: Request,
    db: AsyncSession = Depends(get_db),
    org_slug: str | None = None,
    event: str = "conversion.pixel",
    value: float | None = None,
    chat_id: str | None = None,
    campaign_id: str | None = None,
) -> Response:
    if org_slug:
        org = (
            await db.execute(select(Organization).where(Organization.slug == org_slug, Organization.is_active.is_(True)))
        ).scalar_one_or_none()
        if org is not None:
            metadata = {
                "value": value,
                "chat_id": chat_id,
                "campaign_id": campaign_id,
                "url": str(request.url),
                "referer": request.headers.get("referer"),
                "user_agent": request.headers.get("user-agent"),
                "ip": request.client.host if request.client else None,
            }
            db.add(AnalyticsEvent(organization_id=org.id, event_type=event, metadata_=metadata))
            await db.commit()
    return Response(content=PIXEL_GIF, media_type="image/gif", headers={"Cache-Control": "no-store"})


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


@router.get("/reports/share/{token}")
async def shared_report(token: str, db: AsyncSession = Depends(get_db)) -> dict:
    raw = await get_redis().get(ns("report_share", token))
    if not raw:
        raise HTTPException(status_code=404, detail="Shared report not found or expired")
    payload = json.loads(raw)
    report = str(payload.get("report") or "channels")
    org_id_raw = str(payload.get("organization_id") or "")
    if not org_id_raw:
        raise HTTPException(status_code=404, detail="Shared report is invalid")
    from app.api.analytics import _report_rows_for_org  # local import to avoid circular dependency at module load

    rows = await _report_rows_for_org(report, uuid.UUID(org_id_raw), db)
    return {
        "report": report,
        "rows": rows,
        "filters": payload.get("filters") or {},
        "created_at": payload.get("created_at"),
    }
