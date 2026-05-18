"""Channel service: ingest inbound, queue outbound, identity resolution."""
from __future__ import annotations

import logging
import uuid
from datetime import UTC, datetime, timedelta
from typing import Any

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.channels import InboundMessage, get_adapter_class
from app.models.channel import ChannelConnection, ChannelOutbound, ContactIdentity
from app.models.chat import Chat
from app.models.contact import Contact
from app.models.message import Message
from app.models.session import Session
from app.socket_manager import sio

logger = logging.getLogger(__name__)


async def get_connection(
    db: AsyncSession, org_id: uuid.UUID, connection_id: uuid.UUID
) -> ChannelConnection | None:
    return (
        await db.execute(
            select(ChannelConnection).where(
                ChannelConnection.id == connection_id,
                ChannelConnection.organization_id == org_id,
            )
        )
    ).scalar_one_or_none()


async def list_connections(db: AsyncSession, org_id: uuid.UUID) -> list[ChannelConnection]:
    rows = (
        await db.execute(
            select(ChannelConnection)
            .where(ChannelConnection.organization_id == org_id)
            .order_by(ChannelConnection.created_at.desc())
        )
    ).scalars().all()
    return list(rows)


def adapter_for(conn: ChannelConnection):
    cls = get_adapter_class(conn.channel)
    if not cls:
        raise ValueError(f"unknown channel: {conn.channel}")
    return cls(credentials=conn.credentials or {}, settings=conn.settings or {})


async def _resolve_or_create_contact(
    db: AsyncSession, org_id: uuid.UUID, channel: str, msg: InboundMessage
) -> Contact:
    # 1. Existing identity link
    existing = (
        await db.execute(
            select(ContactIdentity).where(
                ContactIdentity.channel == channel,
                ContactIdentity.external_id == msg.external_user_id,
            )
        )
    ).scalar_one_or_none()
    if existing:
        contact = (
            await db.execute(select(Contact).where(Contact.id == existing.contact_id))
        ).scalar_one_or_none()
        if contact:
            return contact

    # 2. Match by email/phone
    contact = None
    if msg.sender_email:
        contact = (
            await db.execute(
                select(Contact).where(
                    Contact.organization_id == org_id, Contact.email == msg.sender_email
                )
            )
        ).scalar_one_or_none()
    if not contact and msg.sender_phone:
        contact = (
            await db.execute(
                select(Contact).where(
                    Contact.organization_id == org_id, Contact.phone == msg.sender_phone
                )
            )
        ).scalar_one_or_none()
    if not contact:
        contact = Contact(
            organization_id=org_id,
            email=msg.sender_email,
            phone=msg.sender_phone,
            full_name=msg.sender_name,
        )
        db.add(contact)
        await db.flush()
    identity = ContactIdentity(
        organization_id=org_id,
        contact_id=contact.id,
        channel=channel,
        external_id=msg.external_user_id,
        meta={"name": msg.sender_name} if msg.sender_name else {},
    )
    db.add(identity)
    return contact


async def _find_or_create_chat(
    db: AsyncSession,
    org: ChannelConnection,
    contact: Contact,
    thread_id: str | None,
) -> Chat:
    if thread_id:
        existing = (
            await db.execute(
                select(Chat).where(
                    Chat.organization_id == org.organization_id,
                    Chat.external_thread_id == thread_id,
                    Chat.status.in_(["waiting", "active"]),
                )
            )
        ).scalar_one_or_none()
        if existing:
            return existing

    sess = Session(
        organization_id=org.organization_id,
        session_token=f"chan_{uuid.uuid4().hex[:24]}",
        is_banned=False,
    )
    db.add(sess)
    await db.flush()

    chat = Chat(
        organization_id=org.organization_id,
        session_id=sess.id,
        contact_id=contact.id,
        status="waiting",
        channel=org.channel,
        channel_connection_id=org.id,
        external_thread_id=thread_id,
    )
    db.add(chat)
    await db.flush()
    return chat


async def ingest_inbound(
    db: AsyncSession, conn: ChannelConnection, messages: list[InboundMessage]
) -> int:
    """Persist inbound messages: resolve contact + chat, append Message rows."""
    count = 0
    for msg in messages:
        contact = await _resolve_or_create_contact(db, conn.organization_id, conn.channel, msg)
        chat = await _find_or_create_chat(db, conn, contact, msg.external_thread_id)
        m = Message(
            chat_id=chat.id,
            sender_type="visitor",
            content=msg.content,
            content_type=msg.content_type,
            file_url=msg.file_url,
            file_name=msg.file_name,
            file_mime=msg.file_mime,
            external_message_id=msg.external_message_id,
        )
        db.add(m)
        await db.flush()
        try:
            await sio.emit(
                "chat:message:new",
                {
                    "chat_id": str(chat.id),
                    "message": {
                        "id": str(m.id),
                        "content": m.content,
                        "content_type": m.content_type,
                        "sender_type": "visitor",
                    },
                },
                room=f"org:{conn.organization_id}",
            )
        except Exception:  # noqa: BLE001
            pass
        count += 1
    conn.last_inbound_at = datetime.now(UTC)
    conn.status = "healthy"
    conn.last_error = None
    await db.flush()
    return count


async def queue_outbound(
    db: AsyncSession,
    *,
    conn: ChannelConnection,
    chat_id: uuid.UUID | None,
    message_id: uuid.UUID | None,
    recipient: str,
    payload: dict[str, Any],
) -> ChannelOutbound:
    out = ChannelOutbound(
        organization_id=conn.organization_id,
        connection_id=conn.id,
        chat_id=chat_id,
        message_id=message_id,
        recipient=recipient,
        payload=payload,
    )
    db.add(out)
    await db.flush()
    return out


async def dispatch_outbound(db: AsyncSession, out_id: uuid.UUID) -> dict[str, Any]:
    """Send one queued outbound message."""
    out = (
        await db.execute(select(ChannelOutbound).where(ChannelOutbound.id == out_id))
    ).scalar_one_or_none()
    if not out or out.status == "sent":
        return {"ok": False, "reason": "missing-or-sent"}
    conn = (
        await db.execute(select(ChannelConnection).where(ChannelConnection.id == out.connection_id))
    ).scalar_one_or_none()
    if not conn or not conn.is_active:
        out.status = "failed"
        out.last_error = "connection inactive"
        await db.commit()
        return {"ok": False, "reason": "connection-inactive"}
    try:
        adapter = adapter_for(conn)
        payload = out.payload or {}
        ptype = payload.get("type", "text")
        if ptype == "text":
            result = await adapter.send_text(out.recipient, payload.get("text", ""))
        elif ptype == "attachment":
            result = await adapter.send_attachment(
                out.recipient, payload["url"], payload.get("kind", "file")
            )
        elif ptype == "template":
            result = await adapter.send_template(
                out.recipient,
                payload["template_name"],
                payload.get("language", "en"),
                payload.get("variables") or [],
            )
        elif ptype == "quick_replies":
            result = await adapter.send_quick_replies(
                out.recipient, payload.get("text", ""), payload.get("options") or []
            )
        else:
            result = await adapter.send_text(out.recipient, str(payload))
        out.status = "sent"
        out.attempts += 1
        out.external_message_id = result.external_message_id
        out.last_error = None
        conn.last_outbound_at = datetime.now(UTC)
        conn.status = "healthy"
        if out.message_id:
            msg = (await db.execute(select(Message).where(Message.id == out.message_id))).scalar_one_or_none()
            if msg and result.external_message_id:
                msg.external_message_id = result.external_message_id
        if ptype in ("template",):
            out.cost_units = 1
    except Exception as exc:  # noqa: BLE001
        logger.exception("outbound dispatch failed id=%s", out_id)
        out.attempts += 1
        out.last_error = str(exc)[:500]
        if out.attempts >= 5:
            out.status = "failed"
            conn.status = "degraded"
            conn.last_error = str(exc)[:500]
        else:
            out.status = "retry"
            out.next_retry_at = datetime.now(UTC) + timedelta(seconds=30 * (2**out.attempts))
    await db.commit()
    return {"ok": out.status == "sent", "status": out.status}


async def send_message_to_chat(
    db: AsyncSession, chat: Chat, text: str, message_id: uuid.UUID | None = None
) -> ChannelOutbound | None:
    if not chat.channel_connection_id:
        return None
    conn = (
        await db.execute(
            select(ChannelConnection).where(ChannelConnection.id == chat.channel_connection_id)
        )
    ).scalar_one_or_none()
    if not conn:
        return None
    contact = None
    if chat.contact_id:
        contact = (
            await db.execute(select(Contact).where(Contact.id == chat.contact_id))
        ).scalar_one_or_none()
    if not contact:
        return None
    identity = (
        await db.execute(
            select(ContactIdentity).where(
                ContactIdentity.contact_id == contact.id, ContactIdentity.channel == conn.channel
            )
        )
    ).scalar_one_or_none()
    if not identity:
        return None
    return await queue_outbound(
        db,
        conn=conn,
        chat_id=chat.id,
        message_id=message_id,
        recipient=identity.external_id,
        payload={"type": "text", "text": text},
    )


async def due_outbound_ids(db: AsyncSession, batch_size: int = 50) -> list[uuid.UUID]:
    now = datetime.now(UTC)
    rows = (
        await db.execute(
            select(ChannelOutbound.id)
            .where(
                ChannelOutbound.status.in_(["pending", "retry"]),
                or_(ChannelOutbound.next_retry_at == None, ChannelOutbound.next_retry_at <= now),  # noqa: E711
            )
            .order_by(ChannelOutbound.created_at.asc())
            .limit(batch_size)
        )
    ).scalars().all()
    return [r for r in rows]
