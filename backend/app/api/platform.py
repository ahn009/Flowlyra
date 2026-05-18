"""External API platform surface for API-key based integrations."""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Annotated
import uuid

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.redis import get_redis
from app.db.session import get_db
from app.middleware.auth import TokenUser, current_user
from app.models.canned_response import CannedResponse
from app.models.chat import Chat
from app.models.contact import Contact
from app.models.engage import Goal
from app.models.kb import KBArticle, KBCategory
from app.models.message import Message
from app.models.organization import Organization
from app.models.proactive_trigger import ProactiveTrigger
from app.models.survey import Survey, SurveyResponse
from app.models.ticket import Ticket
from app.services import ai_service
from app.services.chat_service import add_message
from app.services.permissions import require_permission
from app.services.ticket_service import create_ticket, update_ticket
from app.services.upload_service import upload_file

router = APIRouter(prefix="/platform", tags=["platform"])


def _contact_row(row: Contact) -> dict:
    return {
        "id": str(row.id),
        "email": row.email,
        "full_name": row.full_name,
        "phone": row.phone,
        "country": row.country,
        "timezone": row.timezone,
        "custom_attrs": row.custom_attrs or {},
        "is_vip": row.is_vip,
        "total_chats": row.total_chats,
        "created_at": row.created_at.isoformat() if row.created_at else None,
        "updated_at": row.updated_at.isoformat() if row.updated_at else None,
    }


def _ticket_row(row: Ticket) -> dict:
    return {
        "id": str(row.id),
        "ticket_number": row.ticket_number,
        "subject": row.subject,
        "description": row.description,
        "status": row.status,
        "priority": row.priority,
        "contact_id": str(row.contact_id) if row.contact_id else None,
        "assigned_user_id": str(row.assigned_user_id) if row.assigned_user_id else None,
        "created_at": row.created_at.isoformat() if row.created_at else None,
        "updated_at": row.updated_at.isoformat() if row.updated_at else None,
    }


@router.get("/status")
async def api_status(
    _user: Annotated[TokenUser, Depends(current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict:
    checks = {"db": "ok", "redis": "ok"}
    try:
        await db.execute(select(1))
    except Exception as exc:  # noqa: BLE001
        checks["db"] = f"fail: {exc}"
    try:
        pong = await get_redis().ping()
        checks["redis"] = "ok" if pong else "fail"
    except Exception as exc:  # noqa: BLE001
        checks["redis"] = f"fail: {exc}"
    return {
        "ok": checks["db"] == "ok" and checks["redis"] == "ok",
        "service": "flowlyra-api",
        "checks": checks,
        "timestamp": datetime.now(UTC).isoformat(),
    }


@router.get("/changelog")
async def api_changelog(_user: Annotated[TokenUser, Depends(current_user)]) -> dict:
    return {
        "items": [
            {"version": "2026-05-18", "title": "Phase 9 launch", "changes": ["API keys", "webhooks", "platform REST", "SDKs"]},
            {"version": "2026-05-17", "title": "Phase 8 reporting", "changes": ["custom reports", "exports", "scheduled reports"]},
        ]
    }


@router.get("/chats")
async def list_chats(
    user: Annotated[TokenUser, Depends(require_permission("chats.read"))],
    db: Annotated[AsyncSession, Depends(get_db)],
    limit: int = Query(100, ge=1, le=200),
) -> list[dict]:
    rows = (
        await db.execute(
            select(Chat)
            .where(Chat.organization_id == user.organization_id)
            .order_by(Chat.updated_at.desc())
            .limit(limit)
        )
    ).scalars().all()
    return [
        {
            "id": str(row.id),
            "session_id": str(row.session_id),
            "contact_id": str(row.contact_id) if row.contact_id else None,
            "subject": row.subject,
            "status": row.status,
            "channel": row.channel,
            "assigned_user_id": str(row.assigned_user_id) if row.assigned_user_id else None,
            "created_at": row.created_at.isoformat() if row.created_at else None,
            "updated_at": row.updated_at.isoformat() if row.updated_at else None,
        }
        for row in rows
    ]


@router.patch("/chats/{chat_id}")
async def patch_chat(
    chat_id: uuid.UUID,
    payload: dict,
    user: Annotated[TokenUser, Depends(require_permission("chats.write"))],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict:
    row = (
        await db.execute(
            select(Chat).where(Chat.id == chat_id, Chat.organization_id == user.organization_id)
        )
    ).scalar_one_or_none()
    if row is None:
        raise HTTPException(status_code=404, detail="Chat not found")
    for key in ("subject", "status", "assigned_user_id", "team_id", "priority"):
        if key in payload:
            setattr(row, key, payload[key])
    row.updated_at = datetime.now(UTC)
    await db.commit()
    return {"ok": True, "chat_id": str(row.id)}


@router.get("/chats/{chat_id}/messages")
async def list_messages(
    chat_id: uuid.UUID,
    user: Annotated[TokenUser, Depends(require_permission("messages.read"))],
    db: Annotated[AsyncSession, Depends(get_db)],
    limit: int = Query(100, ge=1, le=200),
) -> list[dict]:
    chat = (
        await db.execute(select(Chat).where(Chat.id == chat_id, Chat.organization_id == user.organization_id))
    ).scalar_one_or_none()
    if chat is None:
        raise HTTPException(status_code=404, detail="Chat not found")
    rows = (
        await db.execute(select(Message).where(Message.chat_id == chat.id).order_by(Message.created_at.desc()).limit(limit))
    ).scalars().all()
    return [
        {
            "id": str(row.id),
            "sender_type": row.sender_type,
            "content": row.content,
            "content_type": row.content_type,
            "is_internal": row.is_internal,
            "created_at": row.created_at.isoformat() if row.created_at else None,
        }
        for row in reversed(rows)
    ]


@router.post("/chats/{chat_id}/messages", status_code=status.HTTP_201_CREATED)
async def create_message(
    chat_id: uuid.UUID,
    payload: dict,
    user: Annotated[TokenUser, Depends(require_permission("messages.write"))],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict:
    chat = (
        await db.execute(select(Chat).where(Chat.id == chat_id, Chat.organization_id == user.organization_id))
    ).scalar_one_or_none()
    if chat is None:
        raise HTTPException(status_code=404, detail="Chat not found")
    content = str(payload.get("content") or "").strip()
    if not content:
        raise HTTPException(status_code=422, detail="content is required")
    sender_type = str(payload.get("sender_type") or "agent")
    if sender_type not in {"agent", "customer", "system"}:
        sender_type = "agent"
    msg = await add_message(
        db,
        chat,
        sender_type,
        content,
        sender_id=user.id,
        is_internal=bool(payload.get("is_internal", False)),
    )
    await db.commit()
    return {"id": str(msg.id), "chat_id": str(msg.chat_id), "content": msg.content}


@router.get("/contacts")
async def list_contacts(
    user: Annotated[TokenUser, Depends(require_permission("contacts.read"))],
    db: Annotated[AsyncSession, Depends(get_db)],
    q: str | None = None,
    limit: int = Query(100, ge=1, le=200),
) -> list[dict]:
    stmt = select(Contact).where(Contact.organization_id == user.organization_id)
    if q:
        like = f"%{q.strip()}%"
        stmt = stmt.where(or_(Contact.email.ilike(like), Contact.full_name.ilike(like)))
    rows = (await db.execute(stmt.order_by(Contact.updated_at.desc()).limit(limit))).scalars().all()
    return [_contact_row(row) for row in rows]


@router.post("/contacts", status_code=status.HTTP_201_CREATED)
async def create_contact(
    payload: dict,
    user: Annotated[TokenUser, Depends(require_permission("contacts.write"))],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict:
    email = str(payload.get("email") or "").strip() or None
    name = str(payload.get("full_name") or "").strip() or None
    if not email and not name:
        raise HTTPException(status_code=422, detail="email or full_name is required")
    row = Contact(
        organization_id=user.organization_id,
        email=email,
        full_name=name,
        phone=str(payload.get("phone") or "").strip() or None,
        country=str(payload.get("country") or "").strip() or None,
        timezone=str(payload.get("timezone") or "").strip() or None,
        custom_attrs=dict(payload.get("custom_attrs") or {}),
        is_vip=bool(payload.get("is_vip", False)),
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return _contact_row(row)


@router.patch("/contacts/{contact_id}")
async def update_contact(
    contact_id: uuid.UUID,
    payload: dict,
    user: Annotated[TokenUser, Depends(require_permission("contacts.write"))],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict:
    row = (
        await db.execute(select(Contact).where(Contact.id == contact_id, Contact.organization_id == user.organization_id))
    ).scalar_one_or_none()
    if row is None:
        raise HTTPException(status_code=404, detail="Contact not found")
    for key in ("email", "full_name", "phone", "country", "timezone", "is_vip"):
        if key in payload:
            setattr(row, key, payload[key])
    if "custom_attrs" in payload and isinstance(payload["custom_attrs"], dict):
        row.custom_attrs = {**(row.custom_attrs or {}), **payload["custom_attrs"]}
    await db.commit()
    await db.refresh(row)
    return _contact_row(row)


@router.get("/tickets")
async def list_tickets(
    user: Annotated[TokenUser, Depends(require_permission("tickets.read"))],
    db: Annotated[AsyncSession, Depends(get_db)],
    limit: int = Query(100, ge=1, le=200),
) -> list[dict]:
    rows = (
        await db.execute(
            select(Ticket)
            .where(Ticket.organization_id == user.organization_id)
            .order_by(Ticket.updated_at.desc())
            .limit(limit)
        )
    ).scalars().all()
    return [_ticket_row(row) for row in rows]


@router.post("/tickets", status_code=status.HTTP_201_CREATED)
async def create_ticket_route(
    payload: dict,
    user: Annotated[TokenUser, Depends(require_permission("tickets.write"))],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict:
    subject = str(payload.get("subject") or "").strip()
    if not subject:
        raise HTTPException(status_code=422, detail="subject is required")
    ticket = await create_ticket(
        db,
        user.organization_id,
        {
            "subject": subject,
            "description": str(payload.get("description") or "").strip() or "",
            "status": str(payload.get("status") or "open"),
            "priority": str(payload.get("priority") or "normal"),
            "contact_id": uuid.UUID(str(payload["contact_id"])) if payload.get("contact_id") else None,
        },
        user.id,
    )
    await db.commit()
    await db.refresh(ticket)
    return _ticket_row(ticket)


@router.patch("/tickets/{ticket_id}")
async def patch_ticket(
    ticket_id: uuid.UUID,
    payload: dict,
    user: Annotated[TokenUser, Depends(require_permission("tickets.write"))],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict:
    ticket = (
        await db.execute(select(Ticket).where(Ticket.id == ticket_id, Ticket.organization_id == user.organization_id))
    ).scalar_one_or_none()
    if ticket is None:
        raise HTTPException(status_code=404, detail="Ticket not found")
    patch = {k: v for k, v in payload.items() if k in {"subject", "description", "status", "priority", "assigned_user_id", "team_id"}}
    ticket = await update_ticket(db, ticket=ticket, patch=patch, actor_user_id=user.id)
    await db.commit()
    await db.refresh(ticket)
    return _ticket_row(ticket)


@router.get("/kb/categories")
async def list_kb_categories(
    user: Annotated[TokenUser, Depends(require_permission("kb.read"))],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> list[dict]:
    rows = (
        await db.execute(
            select(KBCategory).where(KBCategory.organization_id == user.organization_id).order_by(KBCategory.position.asc(), KBCategory.created_at.asc())
        )
    ).scalars().all()
    return [{"id": str(r.id), "name": r.name, "slug": r.slug, "description": r.description} for r in rows]


@router.get("/kb/articles")
async def list_kb_articles(
    user: Annotated[TokenUser, Depends(require_permission("kb.read"))],
    db: Annotated[AsyncSession, Depends(get_db)],
    limit: int = Query(100, ge=1, le=200),
) -> list[dict]:
    rows = (
        await db.execute(
            select(KBArticle)
            .where(KBArticle.organization_id == user.organization_id)
            .order_by(KBArticle.updated_at.desc())
            .limit(limit)
        )
    ).scalars().all()
    return [
        {
            "id": str(r.id),
            "title": r.title,
            "slug": r.slug,
            "status": r.status,
            "locale": r.locale,
            "updated_at": r.updated_at.isoformat() if r.updated_at else None,
        }
        for r in rows
    ]


@router.get("/tags")
async def list_tags(
    user: Annotated[TokenUser, Depends(require_permission("tags.read"))],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> list[dict]:
    org = (await db.execute(select(Organization).where(Organization.id == user.organization_id))).scalar_one()
    defined = list(((org.feature_flags or {}).get("chat_tags") or []))
    usage_rows = (
        await db.execute(
            select(func.unnest(Chat.tags).label("tag"), func.count())
            .where(Chat.organization_id == user.organization_id)
            .group_by("tag")
        )
    ).all()
    usage = {str(row[0]): int(row[1]) for row in usage_rows}
    by_key = {str(item.get("key") or ""): item for item in defined if isinstance(item, dict)}
    for name, count in usage.items():
        key = name.strip().lower().replace(" ", "-")
        if key not in by_key:
            defined.append({"key": key, "label": name, "color": "#64748b"})
            by_key[key] = defined[-1]
        by_key[key]["usage_count"] = count
    for item in defined:
        item.setdefault("usage_count", 0)
    return defined


@router.get("/canned-responses")
async def list_canned(
    user: Annotated[TokenUser, Depends(require_permission("canned.read"))],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> list[dict]:
    rows = (
        await db.execute(
            select(CannedResponse)
            .where(CannedResponse.organization_id == user.organization_id)
            .order_by(CannedResponse.created_at.desc())
            .limit(200)
        )
    ).scalars().all()
    return [
        {
            "id": str(row.id),
            "shortcut": row.shortcut,
            "title": row.title,
            "content": row.content,
            "tags": row.tags,
            "use_count": row.use_count,
        }
        for row in rows
    ]


@router.get("/goals")
async def list_goals(
    user: Annotated[TokenUser, Depends(require_permission("goals.read"))],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> list[dict]:
    rows = (
        await db.execute(select(Goal).where(Goal.organization_id == user.organization_id).order_by(Goal.created_at.desc()))
    ).scalars().all()
    return [
        {
            "id": str(row.id),
            "name": row.name,
            "goal_type": row.goal_type,
            "event_name": row.event_name,
            "target_url": row.target_url,
            "default_value": float(row.default_value) if row.default_value is not None else None,
            "is_active": row.is_active,
        }
        for row in rows
    ]


@router.get("/campaigns")
async def list_campaigns(
    user: Annotated[TokenUser, Depends(require_permission("campaigns.read"))],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> list[dict]:
    rows = (
        await db.execute(
            select(ProactiveTrigger)
            .where(ProactiveTrigger.organization_id == user.organization_id)
            .order_by(ProactiveTrigger.created_at.desc())
        )
    ).scalars().all()
    return [
        {
            "id": str(row.id),
            "name": row.name,
            "trigger_type": row.trigger_type,
            "message": row.message,
            "is_active": row.is_active,
            "sent_count": row.sent_count,
        }
        for row in rows
    ]


@router.get("/reports/overview")
async def reports_overview(
    user: Annotated[TokenUser, Depends(require_permission("reports.read"))],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict:
    chat_count = await db.scalar(select(func.count()).select_from(Chat).where(Chat.organization_id == user.organization_id))
    ticket_count = await db.scalar(select(func.count()).select_from(Ticket).where(Ticket.organization_id == user.organization_id))
    contact_count = await db.scalar(select(func.count()).select_from(Contact).where(Contact.organization_id == user.organization_id))
    return {
        "chats": int(chat_count or 0),
        "tickets": int(ticket_count or 0),
        "contacts": int(contact_count or 0),
        "generated_at": datetime.now(UTC).isoformat(),
    }


@router.post("/surveys", status_code=status.HTTP_201_CREATED)
async def create_survey(
    payload: dict,
    user: Annotated[TokenUser, Depends(require_permission("goals.write"))],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict:
    name = str(payload.get("name") or "").strip()
    if not name:
        raise HTTPException(status_code=422, detail="name is required")
    row = Survey(
        organization_id=user.organization_id,
        name=name,
        trigger=str(payload.get("trigger") or "post_chat"),
        questions={"items": list(payload.get("questions") or [])},
        is_active=bool(payload.get("is_active", True)),
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return {
        "id": str(row.id),
        "name": row.name,
        "trigger": row.trigger,
        "questions": (row.questions or {}).get("items", []),
        "is_active": row.is_active,
    }


@router.get("/surveys")
async def list_surveys(
    user: Annotated[TokenUser, Depends(require_permission("goals.read"))],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> list[dict]:
    rows = (
        await db.execute(
            select(Survey).where(Survey.organization_id == user.organization_id).order_by(Survey.created_at.desc())
        )
    ).scalars().all()
    return [
        {
            "id": str(row.id),
            "name": row.name,
            "trigger": row.trigger,
            "questions": (row.questions or {}).get("items", []),
            "is_active": row.is_active,
            "created_at": row.created_at.isoformat() if row.created_at else None,
        }
        for row in rows
    ]


@router.post("/surveys/{survey_id}/responses", status_code=status.HTTP_201_CREATED)
async def create_survey_response(
    survey_id: uuid.UUID,
    payload: dict,
    user: Annotated[TokenUser, Depends(require_permission("goals.write"))],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict:
    survey = (
        await db.execute(select(Survey).where(Survey.id == survey_id, Survey.organization_id == user.organization_id))
    ).scalar_one_or_none()
    if survey is None:
        raise HTTPException(status_code=404, detail="Survey not found")
    row = SurveyResponse(
        organization_id=user.organization_id,
        survey_id=survey.id,
        chat_id=uuid.UUID(str(payload["chat_id"])) if payload.get("chat_id") else None,
        contact_id=uuid.UUID(str(payload["contact_id"])) if payload.get("contact_id") else None,
        score=int(payload["score"]) if payload.get("score") is not None else None,
        answers=dict(payload.get("answers") or {}),
        comment=str(payload.get("comment") or "").strip() or None,
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return {"id": str(row.id), "survey_id": str(row.survey_id)}


@router.get("/billing")
async def billing_info(
    user: Annotated[TokenUser, Depends(require_permission("billing.read"))],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict:
    org = (await db.execute(select(Organization).where(Organization.id == user.organization_id))).scalar_one()
    return {
        "organization_id": str(org.id),
        "plan": org.plan,
        "seats": org.seats,
        "trial_ends_at": org.trial_ends_at.isoformat() if org.trial_ends_at else None,
        "status": "active" if org.is_active and org.deleted_at is None else "inactive",
    }


@router.post("/ai/text")
async def ai_text(
    payload: dict,
    _user: Annotated[TokenUser, Depends(require_permission("ai.use"))],
) -> dict:
    operation = str(payload.get("operation") or "").strip()
    text = str(payload.get("text") or "")
    if not operation or not text:
        raise HTTPException(status_code=422, detail="operation and text are required")
    target_language = str(payload.get("target_language") or "").strip() or None
    result = await ai_service.transform_text(operation, text, target_language)
    return {"result": result}


@router.post("/files/upload")
async def upload_file_route(
    file: Annotated[UploadFile, File()],
    user: Annotated[TokenUser, Depends(require_permission("uploads.write"))],
) -> dict:
    return await upload_file(file, user.organization_id)
