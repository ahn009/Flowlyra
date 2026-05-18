from datetime import UTC, datetime, timedelta
from typing import Annotated, Any
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import PlainTextResponse
from sqlalchemy import and_, desc, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.redis import get_redis
from app.db.session import get_db
from app.middleware.auth import TokenUser, current_user, require_role
from app.models.audit_log import AuditLog
from app.models.chat import Chat
from app.models.contact import Contact
from app.models.message import Message
from app.models.session import Session
from app.models.ticket import Ticket
from app.schemas.chat import (
    AssignRequest,
    ChatDetail,
    ChatOut,
    ChatUpdate,
    MessageUpdateRequest,
    NoteRequest,
    ReactionRequest,
    SnoozeRequest,
    TagRequest,
    TransferRequest,
)
from app.services.chat_service import add_message, convert_to_ticket, get_chat, search_chats
from app.services.sales_service import chat_revenue_summary, contact_ltv, contact_scores
from app.services.webhook_events import CHAT_RESOLVED
from app.services.webhook_service import dispatch_event

router = APIRouter(prefix="/chats", tags=["chats"])


@router.get("/dashboard")
async def dashboard(
    user: Annotated[TokenUser, Depends(current_user)],
    db: AsyncSession = Depends(get_db),
) -> dict:
    now = datetime.now(UTC)
    one_day_ago = now - timedelta(days=1)
    active = await db.scalar(
        select(func.count(Chat.id)).where(
            Chat.organization_id == user.organization_id,
            Chat.status.in_(["waiting", "active"]),
            Chat.is_spam.is_(False),
        )
    )
    online_visitors = await db.scalar(
        select(func.count(Chat.id)).where(
            Chat.organization_id == user.organization_id,
            Chat.updated_at >= one_day_ago,
            Chat.status.in_(["waiting", "active"]),
        )
    )
    agents_online = await db.scalar(
        select(func.count()).select_from(
            select(func.distinct(AuditLog.actor_user_id)).where(
                AuditLog.organization_id == user.organization_id,
                AuditLog.created_at >= now - timedelta(minutes=15),
                AuditLog.actor_user_id.is_not(None),
            ).subquery()
        )
    )
    recent_activity_rows = (
        await db.execute(
            select(AuditLog)
            .where(AuditLog.organization_id == user.organization_id)
            .order_by(desc(AuditLog.created_at))
            .limit(20)
        )
    ).scalars().all()
    activity = [
        {
            "id": str(row.id),
            "event": row.event,
            "actor_email": row.actor_email,
            "path": row.path,
            "status_code": row.status_code,
            "created_at": row.created_at.isoformat() if row.created_at else None,
        }
        for row in recent_activity_rows
    ]
    return {
        "active_chats": int(active or 0),
        "agents_online": int(agents_online or 0),
        "online_visitors": int(online_visitors or 0),
        "activity": activity,
    }


@router.get("/")
async def list_all(
    user: Annotated[TokenUser, Depends(current_user)],
    db: AsyncSession = Depends(get_db),
    status: str | None = None,
    assigned_user_id: uuid.UUID | None = None,
    team_id: uuid.UUID | None = None,
    channel: str | None = None,
    tag: str | None = None,
    view: str | None = None,
    q: str | None = None,
    page: int = 1,
    limit: int = Query(50, ge=1, le=200),
) -> list[dict]:
    statement = select(Chat).where(Chat.organization_id == user.organization_id)

    if view == "my":
        statement = statement.where(Chat.assigned_user_id == user.id)
    elif view == "queued":
        statement = statement.where(Chat.assigned_user_id.is_(None), Chat.status == "waiting", Chat.is_spam.is_(False))
    elif view == "supervised":
        if user.role not in {"admin", "supervisor", "owner"}:
            statement = statement.where(Chat.assigned_user_id == user.id)
        else:
            statement = statement.where(Chat.assigned_user_id.is_not(None))
    elif view == "pinned":
        statement = statement.where(Chat.is_pinned.is_(True))
    elif view == "archived":
        statement = statement.where(Chat.status.in_(["resolved", "closed"]))

    if status:
        statement = statement.where(Chat.status == status)
    if assigned_user_id:
        statement = statement.where(Chat.assigned_user_id == assigned_user_id)
    if team_id:
        statement = statement.where(Chat.team_id == team_id)
    if channel:
        statement = statement.where(Chat.channel == channel)
    if tag:
        statement = statement.where(Chat.tags.any(tag))
    if q:
        like = f"%{q.strip()}%"
        statement = statement.where(or_(Chat.subject.ilike(like), Chat.tags.any(q.strip())))

    rows = (
        await db.execute(
            statement.order_by(Chat.is_pinned.desc(), Chat.updated_at.desc())
            .offset((page - 1) * limit)
            .limit(limit)
        )
    ).scalars().all()
    return await chats_with_contact_data(db, rows)


@router.get("/search")
async def search(q: str, user: Annotated[TokenUser, Depends(current_user)], db: AsyncSession = Depends(get_db)) -> list[dict]:
    return await chats_with_contact_data(db, await search_chats(db, user.organization_id, q))


@router.get("/{chat_id}", response_model=ChatDetail)
async def detail(chat_id: uuid.UUID, user: Annotated[TokenUser, Depends(current_user)], db: AsyncSession = Depends(get_db)) -> dict:
    chat = await get_chat(db, user.organization_id, chat_id)
    messages = (
        await db.execute(select(Message).where(Message.chat_id == chat.id).order_by(Message.created_at.desc()).limit(200))
    ).scalars().all()
    session = (
        await db.execute(select(Session).where(Session.id == chat.session_id, Session.organization_id == user.organization_id))
    ).scalar_one_or_none()
    contact = None
    if chat.contact_id:
        contact = (
            await db.execute(select(Contact).where(Contact.id == chat.contact_id, Contact.organization_id == user.organization_id))
        ).scalar_one_or_none()

    past_chats: list[dict] = []
    tickets: list[dict] = []
    if chat.contact_id:
        past_chat_rows = (
            await db.execute(
                select(Chat)
                .where(
                    Chat.organization_id == user.organization_id,
                    Chat.contact_id == chat.contact_id,
                    Chat.id != chat.id,
                )
                .order_by(Chat.updated_at.desc())
                .limit(10)
            )
        ).scalars().all()
        past_chats = [
            {
                "id": str(item.id),
                "subject": item.subject,
                "status": item.status,
                "updated_at": item.updated_at.isoformat() if item.updated_at else None,
            }
            for item in past_chat_rows
        ]
        ticket_rows = (
            await db.execute(
                select(Ticket)
                .where(Ticket.organization_id == user.organization_id, Ticket.contact_id == chat.contact_id)
                .order_by(Ticket.updated_at.desc())
                .limit(10)
            )
        ).scalars().all()
        tickets = [
            {
                "id": str(item.id),
                "ticket_number": item.ticket_number,
                "subject": item.subject,
                "status": item.status,
                "priority": item.priority,
                "updated_at": item.updated_at.isoformat() if item.updated_at else None,
            }
            for item in ticket_rows
        ]

    data = ChatOut.model_validate(chat).model_dump()
    data["visitor_name"] = contact.full_name if contact else None
    data["visitor_email"] = contact.email if contact else None
    data["visitor_ip"] = str(session.ip_address) if session and session.ip_address else None
    data["visitor_current_url"] = session.current_url if session else None
    data["visitor_referrer"] = session.referrer if session else None
    data["visitor_page_views"] = session.page_views if session else None
    data["visitor_status"] = "online" if await get_redis().exists(f"presence:visitor:{chat.id}") else "offline"
    data["messages"] = list(reversed(messages))
    data["contact"] = {"id": str(chat.contact_id), "custom_attrs": contact.custom_attrs if contact else {}} if chat.contact_id else None
    data["visitor_session"] = (
        {
            "id": str(session.id),
            "ip_address": str(session.ip_address) if session.ip_address else None,
            "country": session.country,
            "city": session.city,
            "current_url": session.current_url,
            "referrer": session.referrer,
            "page_views": session.page_views,
            "first_seen_at": session.first_seen_at.isoformat() if session.first_seen_at else None,
            "last_seen_at": session.last_seen_at.isoformat() if session.last_seen_at else None,
            "browser": session.browser,
            "browser_version": session.browser_version,
            "os": session.os,
            "device_type": session.device_type,
            "custom_variables": session.custom_variables or {},
            "page_history": (session.page_history or {}).get("items", []),
        }
        if session
        else None
    )
    data["past_chats"] = past_chats
    data["tickets"] = tickets
    revenue_summary = await chat_revenue_summary(db, organization_id=user.organization_id, chat_id=chat.id)
    if contact:
        ltv_payload = await contact_ltv(db, organization_id=user.organization_id, contact_id=contact.id)
        score_payload = await contact_scores(db, organization_id=user.organization_id, contact_id=contact.id)
        data["ecommerce"] = {
            **ltv_payload,
            **score_payload,
            **revenue_summary,
        }
    else:
        data["ecommerce"] = revenue_summary
    return data


async def chats_with_contact_data(db: AsyncSession, chats: list[Chat]) -> list[dict]:
    if not chats:
        return []

    contact_ids = [chat.contact_id for chat in chats if chat.contact_id]
    contacts = {}
    if contact_ids:
        organization_id = chats[0].organization_id
        contacts = {
            contact.id: contact
            for contact in (
                await db.execute(
                    select(Contact).where(Contact.id.in_(contact_ids), Contact.organization_id == organization_id)
                )
            ).scalars().all()
        }

    chat_ids = [chat.id for chat in chats]
    session_ids = [chat.session_id for chat in chats]
    sessions_by_id = {}
    if session_ids:
        sessions_by_id = {
            session.id: session
            for session in (
                await db.execute(
                    select(Session).where(Session.id.in_(session_ids), Session.organization_id == chats[0].organization_id)
                )
            ).scalars().all()
        }
    latest_message_subquery = (
        select(
            Message.chat_id.label("chat_id"),
            Message.content.label("content"),
            Message.sender_type.label("sender_type"),
            Message.created_at.label("created_at"),
            func.row_number().over(partition_by=Message.chat_id, order_by=Message.created_at.desc()).label("rn"),
        )
        .where(Message.chat_id.in_(chat_ids), Message.is_internal.is_(False))
        .subquery()
    )
    latest_message_rows = await db.execute(
        select(
            latest_message_subquery.c.chat_id,
            latest_message_subquery.c.content,
            latest_message_subquery.c.sender_type,
            latest_message_subquery.c.created_at,
        ).where(latest_message_subquery.c.rn == 1)
    )
    latest_messages = {row.chat_id: row for row in latest_message_rows}

    rows = []
    redis = get_redis()
    visitor_presence = {}
    presence_pipe = redis.pipeline()
    for chat in chats:
        presence_pipe.exists(f"presence:visitor:{chat.id}")
    presence_results = await presence_pipe.execute()
    for index, chat in enumerate(chats):
        visitor_presence[chat.id] = "online" if bool(presence_results[index]) else "offline"

    for chat in chats:
        contact = contacts.get(chat.contact_id)
        latest_message = latest_messages.get(chat.id)
        data = ChatOut.model_validate(chat).model_dump()
        data["visitor_name"] = contact.full_name if contact else None
        data["visitor_email"] = contact.email if contact else None
        session = sessions_by_id.get(chat.session_id)
        data["visitor_ip"] = str(session.ip_address) if session and session.ip_address else None
        data["visitor_current_url"] = session.current_url if session else None
        data["visitor_referrer"] = session.referrer if session else None
        data["visitor_page_views"] = session.page_views if session else None
        data["visitor_status"] = visitor_presence[chat.id]
        data["last_message"] = {
            "content": latest_message.content,
            "sender_type": latest_message.sender_type,
            "created_at": latest_message.created_at,
        } if latest_message else None
        rows.append(data)
    return rows


@router.get("/{chat_id}/messages")
async def messages(
    chat_id: uuid.UUID,
    user: Annotated[TokenUser, Depends(current_user)],
    db: AsyncSession = Depends(get_db),
    limit: int = Query(50, ge=1, le=200),
) -> list[Any]:
    chat = await get_chat(db, user.organization_id, chat_id)
    return (
        await db.execute(
            select(Message).where(Message.chat_id == chat.id).order_by(Message.created_at.desc()).limit(limit)
        )
    ).scalars().all()


@router.post("/{chat_id}/messages/{message_id}/react")
async def react_to_message(
    chat_id: uuid.UUID,
    message_id: uuid.UUID,
    payload: ReactionRequest,
    user: Annotated[TokenUser, Depends(current_user)],
    db: AsyncSession = Depends(get_db),
) -> dict:
    await get_chat(db, user.organization_id, chat_id)
    message = (
        await db.execute(
            select(Message).where(Message.id == message_id, Message.chat_id == chat_id)
        )
    ).scalar_one_or_none()
    if message is None:
        raise HTTPException(status_code=404, detail="Message not found")
    reactions = dict(message.reactions or {})
    emoji = payload.emoji.strip()
    users = set(reactions.get(emoji, []))
    uid = str(user.id)
    if uid in users:
        users.remove(uid)
    else:
        users.add(uid)
    if users:
        reactions[emoji] = sorted(users)
    elif emoji in reactions:
        del reactions[emoji]
    message.reactions = reactions
    await db.commit()
    return {"ok": True, "reactions": reactions}


@router.patch("/{chat_id}/messages/{message_id}")
async def edit_message(
    chat_id: uuid.UUID,
    message_id: uuid.UUID,
    payload: MessageUpdateRequest,
    user: Annotated[TokenUser, Depends(current_user)],
    db: AsyncSession = Depends(get_db),
) -> dict:
    await get_chat(db, user.organization_id, chat_id)
    message = (
        await db.execute(select(Message).where(Message.id == message_id, Message.chat_id == chat_id))
    ).scalar_one_or_none()
    if message is None:
        raise HTTPException(status_code=404, detail="Message not found")
    if message.sender_type != "agent" or message.sender_id != user.id:
        raise HTTPException(status_code=403, detail="Only the original author can edit this message")
    if datetime.now(UTC) - message.created_at > timedelta(minutes=30):
        raise HTTPException(status_code=400, detail="Edit window expired")
    message.content = payload.content
    message.edited_at = datetime.now(UTC)
    await db.commit()
    return {"ok": True}


@router.delete("/{chat_id}/messages/{message_id}")
async def delete_message(
    chat_id: uuid.UUID,
    message_id: uuid.UUID,
    user: Annotated[TokenUser, Depends(current_user)],
    db: AsyncSession = Depends(get_db),
) -> dict:
    await get_chat(db, user.organization_id, chat_id)
    message = (
        await db.execute(select(Message).where(Message.id == message_id, Message.chat_id == chat_id))
    ).scalar_one_or_none()
    if message is None:
        raise HTTPException(status_code=404, detail="Message not found")
    if message.sender_type != "agent" or message.sender_id != user.id:
        raise HTTPException(status_code=403, detail="Only the original author can delete this message")
    if datetime.now(UTC) - message.created_at > timedelta(minutes=30):
        raise HTTPException(status_code=400, detail="Delete window expired")
    message.deleted_at = datetime.now(UTC)
    message.content = "[deleted]"
    message.content_type = "deleted"
    await db.commit()
    return {"ok": True}


@router.get("/{chat_id}/transcript.txt", response_class=PlainTextResponse)
async def transcript_txt(chat_id: uuid.UUID, user: Annotated[TokenUser, Depends(current_user)], db: AsyncSession = Depends(get_db)) -> PlainTextResponse:
    chat = await get_chat(db, user.organization_id, chat_id)
    messages = (
        await db.execute(
            select(Message)
            .where(Message.chat_id == chat.id, Message.is_internal.is_(False))
            .order_by(Message.created_at.asc())
        )
    ).scalars().all()
    lines = [f"FlowLyra transcript", f"Chat: {chat.id}", f"Status: {chat.status}", f"Subject: {chat.subject or 'Live chat'}", ""]
    for message in messages:
        sender = {"customer": "Visitor", "agent": "Agent", "system": "System"}.get(message.sender_type, message.sender_type.title())
        body = message.file_name or message.content or ""
        if message.file_url:
            body = f"{body} ({message.file_url})"
        lines.append(f"[{message.created_at.isoformat()}] {sender}: {body}")
    filename = f"flowlyra-chat-{chat.id}.txt"
    return PlainTextResponse("\n".join(lines), headers={"Content-Disposition": f'attachment; filename="{filename}"'})


@router.get("/{chat_id}/visitor")
async def visitor(chat_id: uuid.UUID, user: Annotated[TokenUser, Depends(current_user)], db: AsyncSession = Depends(get_db)) -> dict:
    chat = await get_chat(db, user.organization_id, chat_id)
    session = (
        await db.execute(select(Session).where(Session.id == chat.session_id, Session.organization_id == user.organization_id))
    ).scalar_one()
    return {"session": {k: str(v) if isinstance(v, uuid.UUID) else v for k, v in session.__dict__.items() if not k.startswith("_")}}


@router.patch("/{chat_id}", response_model=ChatOut)
async def update(chat_id: uuid.UUID, payload: ChatUpdate, user: Annotated[TokenUser, Depends(current_user)], db: AsyncSession = Depends(get_db)) -> Chat:
    chat = await get_chat(db, user.organization_id, chat_id)
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(chat, key, value)
    await db.commit()
    await db.refresh(chat)
    return chat


@router.post("/{chat_id}/assign", response_model=ChatOut)
async def assign(chat_id: uuid.UUID, payload: AssignRequest, user: Annotated[TokenUser, Depends(require_role("admin", "supervisor"))], db: AsyncSession = Depends(get_db)) -> Chat:
    chat = await get_chat(db, user.organization_id, chat_id)
    chat.assigned_user_id = payload.assigned_user_id
    chat.team_id = payload.team_id or chat.team_id
    chat.status = "active"
    await db.commit()
    await db.refresh(chat)
    return chat


@router.post("/{chat_id}/transfer", response_model=ChatOut)
async def transfer(chat_id: uuid.UUID, payload: TransferRequest, user: Annotated[TokenUser, Depends(current_user)], db: AsyncSession = Depends(get_db)) -> Chat:
    chat = await get_chat(db, user.organization_id, chat_id)
    chat.assigned_user_id = payload.assigned_user_id
    chat.team_id = payload.team_id or chat.team_id
    if payload.note:
        await add_message(db, chat, "system", f"Transfer note: {payload.note}", user.id, True)
    await db.commit()
    await db.refresh(chat)
    return chat


@router.post("/{chat_id}/resolve", response_model=ChatOut)
async def resolve(chat_id: uuid.UUID, user: Annotated[TokenUser, Depends(current_user)], db: AsyncSession = Depends(get_db)) -> Chat:
    chat = await get_chat(db, user.organization_id, chat_id)
    chat.status = "resolved"
    chat.resolved_at = datetime.now(UTC)
    await dispatch_event(
        organization_id=user.organization_id,
        event=CHAT_RESOLVED,
        payload={
            "chat_id": str(chat.id),
            "resolved_by_user_id": str(user.id),
            "resolved_at": chat.resolved_at.isoformat() if chat.resolved_at else None,
        },
        db=db,
    )
    await db.commit()
    await db.refresh(chat)
    return chat


@router.post("/{chat_id}/close", response_model=ChatOut)
async def close(chat_id: uuid.UUID, user: Annotated[TokenUser, Depends(current_user)], db: AsyncSession = Depends(get_db)) -> Chat:
    chat = await get_chat(db, user.organization_id, chat_id)
    chat.status = "closed"
    await db.commit()
    await db.refresh(chat)
    return chat


@router.post("/{chat_id}/snooze", response_model=ChatOut)
async def snooze(chat_id: uuid.UUID, payload: SnoozeRequest, user: Annotated[TokenUser, Depends(current_user)], db: AsyncSession = Depends(get_db)) -> Chat:
    chat = await get_chat(db, user.organization_id, chat_id)
    chat.snoozed_until = datetime.now(UTC) + timedelta(minutes=payload.minutes)
    chat.status = "pending"
    await db.commit()
    await db.refresh(chat)
    return chat


@router.post("/{chat_id}/pin", response_model=ChatOut)
async def pin(chat_id: uuid.UUID, user: Annotated[TokenUser, Depends(current_user)], db: AsyncSession = Depends(get_db)) -> Chat:
    chat = await get_chat(db, user.organization_id, chat_id)
    chat.is_pinned = True
    chat.pinned_by_user_id = user.id
    await db.commit()
    await db.refresh(chat)
    return chat


@router.post("/{chat_id}/unpin", response_model=ChatOut)
async def unpin(chat_id: uuid.UUID, user: Annotated[TokenUser, Depends(current_user)], db: AsyncSession = Depends(get_db)) -> Chat:
    chat = await get_chat(db, user.organization_id, chat_id)
    chat.is_pinned = False
    chat.pinned_by_user_id = None
    await db.commit()
    await db.refresh(chat)
    return chat


@router.post("/{chat_id}/spam", response_model=ChatOut)
async def mark_spam(chat_id: uuid.UUID, user: Annotated[TokenUser, Depends(current_user)], db: AsyncSession = Depends(get_db)) -> Chat:
    chat = await get_chat(db, user.organization_id, chat_id)
    chat.is_spam = True
    chat.status = "closed"
    await db.commit()
    await db.refresh(chat)
    return chat


@router.post("/{chat_id}/unspam", response_model=ChatOut)
async def unmark_spam(chat_id: uuid.UUID, user: Annotated[TokenUser, Depends(current_user)], db: AsyncSession = Depends(get_db)) -> Chat:
    chat = await get_chat(db, user.organization_id, chat_id)
    chat.is_spam = False
    chat.status = "waiting" if chat.assigned_user_id is None else "active"
    await db.commit()
    await db.refresh(chat)
    return chat


@router.post("/{chat_id}/note")
async def note(chat_id: uuid.UUID, payload: NoteRequest, user: Annotated[TokenUser, Depends(current_user)], db: AsyncSession = Depends(get_db)) -> Any:
    chat = await get_chat(db, user.organization_id, chat_id)
    message = await add_message(db, chat, "agent", payload.content, user.id, True)
    await db.commit()
    await db.refresh(message)
    return message


@router.post("/{chat_id}/tag", response_model=ChatOut)
async def tag(chat_id: uuid.UUID, payload: TagRequest, user: Annotated[TokenUser, Depends(current_user)], db: AsyncSession = Depends(get_db)) -> Chat:
    chat = await get_chat(db, user.organization_id, chat_id)
    if payload.tag not in chat.tags:
        chat.tags = [*chat.tags, payload.tag]
    await db.commit()
    await db.refresh(chat)
    return chat


@router.delete("/{chat_id}/tag/{tag}", response_model=ChatOut)
async def untag(chat_id: uuid.UUID, tag: str, user: Annotated[TokenUser, Depends(current_user)], db: AsyncSession = Depends(get_db)) -> Chat:
    chat = await get_chat(db, user.organization_id, chat_id)
    chat.tags = [item for item in chat.tags if item != tag]
    await db.commit()
    await db.refresh(chat)
    return chat


@router.post("/{chat_id}/ban")
async def ban(chat_id: uuid.UUID, user: Annotated[TokenUser, Depends(require_role("admin", "supervisor"))], db: AsyncSession = Depends(get_db)) -> dict:
    chat = await get_chat(db, user.organization_id, chat_id)
    session = (
        await db.execute(select(Session).where(Session.id == chat.session_id, Session.organization_id == user.organization_id))
    ).scalar_one_or_none()
    if session is not None:
        session.is_banned = True
    await db.commit()
    return {"ok": True}


@router.post("/{chat_id}/convert-ticket")
async def convert(chat_id: uuid.UUID, user: Annotated[TokenUser, Depends(current_user)], db: AsyncSession = Depends(get_db)) -> dict:
    chat = await get_chat(db, user.organization_id, chat_id)
    ticket = await convert_to_ticket(db, chat)
    await db.commit()
    return {"ticket_id": str(ticket.id), "ticket_number": ticket.ticket_number, "ticket_url": f"/ticket/{ticket.id}"}
