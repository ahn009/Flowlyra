from datetime import UTC, datetime
import secrets
import uuid
import re

from fastapi import HTTPException, status
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.chat import Chat
from app.models.contact import Contact
from app.models.message import Message
from app.models.organization import Organization
from app.models.session import Session
from app.models.ticket import Ticket
from app.services.analytics_service import log_event
from app.services.routing_service import route_chat
from app.services.webhook_events import CHAT_MESSAGE_NEW, CHAT_STARTED, CONTACT_CREATED, CONTACT_UPDATED
from app.services.webhook_service import dispatch_event

CARD_RE = re.compile(r"(?<!\d)(?:\d[ -]?){13,19}(?!\d)")


def mask_sensitive_message(content: str | None) -> str | None:
    if not content:
        return content

    def mask(match: re.Match[str]) -> str:
        digits = re.sub(r"\D", "", match.group(0))
        if len(digits) < 13 or len(digits) > 19:
            return match.group(0)
        return f"[masked card ending {digits[-4:]}]"

    return CARD_RE.sub(mask, content)


async def get_chat(db: AsyncSession, organization_id: uuid.UUID, chat_id: uuid.UUID) -> Chat:
    chat = (await db.execute(select(Chat).where(Chat.id == chat_id, Chat.organization_id == organization_id))).scalar_one_or_none()
    if chat is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chat not found")
    return chat


async def create_or_resume_session(
    db: AsyncSession,
    org: Organization,
    session_token: str | None,
    current_url: str | None,
    referrer: str | None,
    email: str | None = None,
    full_name: str | None = None,
    ip_address: str | None = None,
) -> tuple[Session, Chat | None]:
    session = None
    if session_token:
        session = (
            await db.execute(select(Session).where(Session.session_token == session_token, Session.organization_id == org.id))
        ).scalar_one_or_none()
    contact = None
    if email:
        contact = (await db.execute(select(Contact).where(Contact.organization_id == org.id, Contact.email == email))).scalar_one_or_none()
        if contact is None:
            contact = Contact(organization_id=org.id, email=email, full_name=full_name)
            db.add(contact)
            await db.flush()
    if session is None:
        session = Session(
            organization_id=org.id,
            contact_id=contact.id if contact else None,
            session_token=secrets.token_urlsafe(48),
            current_url=current_url,
            referrer=referrer,
            ip_address=ip_address,
        )
        db.add(session)
    else:
        session.current_url = current_url
        session.referrer = referrer
        if ip_address:
            session.ip_address = ip_address
        session.page_views += 1
        session.last_seen_at = datetime.now(UTC)
        if contact:
            session.contact_id = contact.id
    await db.flush()
    existing_chat = (
        await db.execute(select(Chat).where(Chat.organization_id == org.id, Chat.session_id == session.id, Chat.status.in_(["waiting", "active"])))
    ).scalar_one_or_none()
    return session, existing_chat


async def start_chat(
    db: AsyncSession,
    organization_id: uuid.UUID,
    session_token: str,
    subject: str | None,
    content: str | None,
    name: str | None = None,
    email: str | None = None,
    phone: str | None = None,
    custom_attrs: dict | None = None,
) -> tuple[Chat, Message | None]:
    session = (await db.execute(select(Session).where(Session.organization_id == organization_id, Session.session_token == session_token))).scalar_one_or_none()
    if session is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    contact = None
    contact_created = False
    if email:
        contact = (await db.execute(select(Contact).where(Contact.organization_id == organization_id, Contact.email == email))).scalar_one_or_none()
        if contact is None:
            contact = Contact(organization_id=organization_id, email=email, full_name=name, phone=phone)
            db.add(contact)
            await db.flush()
            contact_created = True
        else:
            contact.full_name = name or contact.full_name
            contact.phone = phone or contact.phone
        if custom_attrs:
            contact.custom_attrs = {**(contact.custom_attrs or {}), **custom_attrs}
        contact.total_chats = (contact.total_chats or 0) + 1
        session.contact_id = contact.id
    elif name and session.contact_id:
        contact = (await db.execute(select(Contact).where(Contact.organization_id == organization_id, Contact.id == session.contact_id))).scalar_one_or_none()
        if contact:
            contact.full_name = name
            contact.phone = phone or contact.phone
            if custom_attrs:
                contact.custom_attrs = {**(contact.custom_attrs or {}), **custom_attrs}
    chat = Chat(organization_id=organization_id, session_id=session.id, contact_id=session.contact_id, subject=subject)
    db.add(chat)
    await db.flush()
    await route_chat(db, chat)
    message = None
    if content:
        message = Message(chat_id=chat.id, sender_type="customer", sender_id=session.contact_id, content=mask_sensitive_message(content))
        db.add(message)
        await log_event(db, organization_id, "message_created", chat_id=chat.id, contact_id=session.contact_id)
    await log_event(db, organization_id, "chat_started", chat_id=chat.id, contact_id=session.contact_id)
    await dispatch_event(
        organization_id=organization_id,
        event=CHAT_STARTED,
        payload={
            "chat_id": str(chat.id),
            "session_id": str(session.id),
            "contact_id": str(chat.contact_id) if chat.contact_id else None,
            "subject": chat.subject,
        },
        db=db,
    )
    if contact is not None:
        await dispatch_event(
            organization_id=organization_id,
            event=CONTACT_CREATED if contact_created else CONTACT_UPDATED,
            payload={
                "contact_id": str(contact.id),
                "email": contact.email,
                "full_name": contact.full_name,
                "phone": contact.phone,
            },
            db=db,
        )
    if message is not None and not message.is_internal:
        await dispatch_event(
            organization_id=organization_id,
            event=CHAT_MESSAGE_NEW,
            payload={
                "chat_id": str(chat.id),
                "message_id": str(message.id),
                "sender_type": message.sender_type,
                "content": message.content,
            },
            db=db,
        )
    await db.commit()
    await db.refresh(chat)
    return chat, message


async def add_message(
    db: AsyncSession,
    chat: Chat,
    sender_type: str,
    content: str | None,
    sender_id: uuid.UUID | None = None,
    is_internal: bool = False,
    content_type: str = "text",
    file_url: str | None = None,
    file_name: str | None = None,
    file_size: int | None = None,
    file_mime: str | None = None,
) -> Message:
    if sender_type == "agent" and chat.first_response_at is None and not is_internal:
        chat.first_response_at = datetime.now(UTC)
    if not is_internal:
        if sender_type == "agent":
            chat.status = "active"
        elif sender_type == "customer":
            chat.resolved_at = None
            chat.status = "active" if chat.assigned_user_id else "waiting"
    message = Message(
        chat_id=chat.id,
        sender_type=sender_type,
        sender_id=sender_id,
        content=mask_sensitive_message(content),
        content_type=content_type,
        file_url=file_url,
        file_name=file_name,
        file_size=file_size,
        file_mime=file_mime,
        is_internal=is_internal,
    )
    db.add(message)
    chat.updated_at = datetime.now(UTC)
    await log_event(db, chat.organization_id, "message_created", chat_id=chat.id, user_id=sender_id if sender_type == "agent" else None)
    await db.flush()
    if not is_internal:
        await dispatch_event(
            organization_id=chat.organization_id,
            event=CHAT_MESSAGE_NEW,
            payload={
                "chat_id": str(chat.id),
                "message_id": str(message.id),
                "sender_type": sender_type,
                "content": message.content,
            },
            db=db,
        )
    if (
        sender_type == "agent"
        and not is_internal
        and chat.channel_connection_id
        and content
    ):
        try:
            from app.services import channel_service

            out = await channel_service.send_message_to_chat(db, chat, content, message.id)
            if out:
                from app.workers.channel_worker import send_outbound_now

                send_outbound_now.delay(str(out.id))
        except Exception:  # noqa: BLE001
            import logging

            logging.getLogger(__name__).exception("channel outbound queue failed chat=%s", chat.id)
    return message


async def list_chats(db: AsyncSession, organization_id: uuid.UUID, filters: dict, page: int, limit: int) -> list[Chat]:
    statement = select(Chat).where(Chat.organization_id == organization_id)
    for name in ("status", "assigned_user_id", "team_id", "channel"):
        value = filters.get(name)
        if value:
            statement = statement.where(getattr(Chat, name) == value)
    if filters.get("tag"):
        statement = statement.where(Chat.tags.any(filters["tag"]))
    return (await db.execute(statement.order_by(Chat.updated_at.desc()).offset((page - 1) * limit).limit(limit))).scalars().all()


async def search_chats(db: AsyncSession, organization_id: uuid.UUID, query: str) -> list[Chat]:
    statement = select(Chat).join(Message, Message.chat_id == Chat.id).where(Chat.organization_id == organization_id, Message.content.ilike(f"%{query}%"))
    return (await db.execute(statement.order_by(Chat.updated_at.desc()).limit(50))).scalars().unique().all()


async def convert_to_ticket(db: AsyncSession, chat: Chat) -> Ticket:
    ticket = Ticket(
        organization_id=chat.organization_id,
        ticket_number=uuid.uuid4().int % 1_000_000_000,
        contact_id=chat.contact_id,
        assigned_user_id=chat.assigned_user_id,
        team_id=chat.team_id,
        source_chat_id=chat.id,
        subject=chat.subject or "Chat follow-up",
        description="Created from live chat.",
    )
    db.add(ticket)
    await log_event(db, chat.organization_id, "ticket_created", chat_id=chat.id, user_id=chat.assigned_user_id)
    await db.flush()
    return ticket
