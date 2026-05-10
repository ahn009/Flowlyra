from datetime import UTC, datetime
from typing import Annotated, Any
import uuid

from fastapi import APIRouter, Depends, Query
from fastapi.responses import PlainTextResponse
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.db.redis import get_redis
from app.middleware.auth import TokenUser, current_user, require_role
from app.models.chat import Chat
from app.models.contact import Contact
from app.models.message import Message
from app.models.session import Session
from app.schemas.chat import AssignRequest, ChatDetail, ChatOut, ChatUpdate, NoteRequest, TagRequest, TransferRequest
from app.services.chat_service import add_message, convert_to_ticket, get_chat, list_chats, search_chats

router = APIRouter(prefix="/chats", tags=["chats"])


@router.get("/")
async def list_all(
    user: Annotated[TokenUser, Depends(current_user)],
    db: AsyncSession = Depends(get_db),
    status: str | None = None,
    assigned_user_id: uuid.UUID | None = None,
    team_id: uuid.UUID | None = None,
    channel: str | None = None,
    tag: str | None = None,
    page: int = 1,
    limit: int = Query(50, le=100),
) -> list[dict]:
    chats = await list_chats(db, user.organization_id, locals(), page, limit)
    return await chats_with_contact_data(db, chats)


@router.get("/search")
async def search(q: str, user: Annotated[TokenUser, Depends(current_user)], db: AsyncSession = Depends(get_db)) -> list[dict]:
    return await chats_with_contact_data(db, await search_chats(db, user.organization_id, q))


@router.get("/{chat_id}", response_model=ChatDetail)
async def detail(chat_id: uuid.UUID, user: Annotated[TokenUser, Depends(current_user)], db: AsyncSession = Depends(get_db)) -> dict:
    chat = await get_chat(db, user.organization_id, chat_id)
    messages = (await db.execute(select(Message).where(Message.chat_id == chat.id).order_by(Message.created_at.desc()).limit(50))).scalars().all()
    session = (
        await db.execute(select(Session).where(Session.id == chat.session_id, Session.organization_id == user.organization_id))
    ).scalar_one_or_none()
    data = ChatOut.model_validate(chat).model_dump()
    contact = None
    if chat.contact_id:
        contact = (
            await db.execute(select(Contact).where(Contact.id == chat.contact_id, Contact.organization_id == user.organization_id))
        ).scalar_one_or_none()
    data["visitor_name"] = contact.full_name if contact else None
    data["visitor_email"] = contact.email if contact else None
    data["visitor_ip"] = str(session.ip_address) if session and session.ip_address else None
    data["visitor_current_url"] = session.current_url if session else None
    data["visitor_referrer"] = session.referrer if session else None
    data["visitor_page_views"] = session.page_views if session else None
    data["visitor_status"] = "online" if await get_redis().exists(f"presence:visitor:{chat.id}") else "offline"
    data["messages"] = list(reversed(messages))
    data["contact"] = {"id": str(chat.contact_id)} if chat.contact_id else None
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
        }
        if session
        else None
    )
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
                await db.execute(select(Session).where(Session.id.in_(session_ids), Session.organization_id == chats[0].organization_id))
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
async def messages(chat_id: uuid.UUID, user: Annotated[TokenUser, Depends(current_user)], db: AsyncSession = Depends(get_db), limit: int = Query(50, le=100)) -> list[Any]:
    chat = await get_chat(db, user.organization_id, chat_id)
    return (await db.execute(select(Message).where(Message.chat_id == chat.id).order_by(Message.created_at.desc()).limit(limit))).scalars().all()


@router.get("/{chat_id}/transcript.txt", response_class=PlainTextResponse)
async def transcript_txt(chat_id: uuid.UUID, user: Annotated[TokenUser, Depends(current_user)], db: AsyncSession = Depends(get_db)) -> PlainTextResponse:
    chat = await get_chat(db, user.organization_id, chat_id)
    messages = (await db.execute(select(Message).where(Message.chat_id == chat.id, Message.is_internal.is_(False)).order_by(Message.created_at.asc()))).scalars().all()
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
    session = (await db.execute(select(Session).where(Session.id == chat.session_id, Session.organization_id == user.organization_id))).scalar_one()
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


@router.post("/{chat_id}/ban")
async def ban(chat_id: uuid.UUID, user: Annotated[TokenUser, Depends(require_role("admin", "supervisor"))], db: AsyncSession = Depends(get_db)) -> dict:
    await get_chat(db, user.organization_id, chat_id)
    return {"ok": True}


@router.post("/{chat_id}/convert-ticket")
async def convert(chat_id: uuid.UUID, user: Annotated[TokenUser, Depends(current_user)], db: AsyncSession = Depends(get_db)) -> dict:
    chat = await get_chat(db, user.organization_id, chat_id)
    ticket = await convert_to_ticket(db, chat)
    await db.commit()
    return {"ticket_id": str(ticket.id)}
