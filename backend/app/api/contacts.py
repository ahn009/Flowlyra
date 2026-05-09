from typing import Annotated, Any
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import delete, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.middleware.auth import TokenUser, current_user, require_role
from app.models.chat import Chat
from app.models.contact import Contact
from app.models.message import Message
from app.models.session import Session
from app.models.ticket import Ticket

router = APIRouter(prefix="/contacts", tags=["contacts"])


@router.get("/")
async def list_contacts(
    user: Annotated[TokenUser, Depends(current_user)],
    db: AsyncSession = Depends(get_db),
    q: str | None = None,
) -> list[dict[str, Any]]:
    statement = select(Contact).where(Contact.organization_id == user.organization_id)
    if q:
        like = f"%{q.strip()}%"
        statement = statement.where(or_(Contact.email.ilike(like), Contact.full_name.ilike(like)))
    contacts = (await db.execute(statement.order_by(Contact.updated_at.desc()).limit(100))).scalars().all()
    if not contacts:
        return []

    contact_ids = [contact.id for contact in contacts]
    sessions = (
        await db.execute(
            select(Session)
            .where(Session.organization_id == user.organization_id, Session.contact_id.in_(contact_ids))
            .order_by(Session.last_seen_at.desc())
        )
    ).scalars().all()
    sessions_by_contact: dict[uuid.UUID, Session] = {}
    for session in sessions:
        if session.contact_id and session.contact_id not in sessions_by_contact:
            sessions_by_contact[session.contact_id] = session

    return [
        {
            "id": str(contact.id),
            "email": contact.email,
            "full_name": contact.full_name,
            "phone": contact.phone,
            "country": contact.country,
            "timezone": contact.timezone,
            "chat_count": contact.total_chats or 0,
            "last_seen_at": sessions_by_contact[contact.id].last_seen_at if contact.id in sessions_by_contact else None,
            "ip_address": str(sessions_by_contact[contact.id].ip_address) if contact.id in sessions_by_contact and sessions_by_contact[contact.id].ip_address else None,
            "created_at": contact.created_at,
            "updated_at": contact.updated_at,
        }
        for contact in contacts
    ]


@router.delete("/{contact_id}")
async def delete_contact(contact_id: uuid.UUID, user: Annotated[TokenUser, Depends(require_role("admin", "supervisor"))], db: AsyncSession = Depends(get_db)) -> dict:
    contact = (await db.execute(select(Contact).where(Contact.id == contact_id, Contact.organization_id == user.organization_id))).scalar_one_or_none()
    if contact is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contact not found")
    chats = (await db.execute(select(Chat.id).where(Chat.organization_id == user.organization_id, Chat.contact_id == contact_id))).scalars().all()
    for chat_id in chats:
        await db.execute(delete(Message).where(Message.chat_id == chat_id))
    await db.execute(delete(Chat).where(Chat.organization_id == user.organization_id, Chat.contact_id == contact_id))
    await db.execute(delete(Ticket).where(Ticket.organization_id == user.organization_id, Ticket.contact_id == contact_id))
    await db.execute(delete(Session).where(Session.organization_id == user.organization_id, Session.contact_id == contact_id))
    await db.execute(delete(Contact).where(Contact.id == contact_id, Contact.organization_id == user.organization_id))
    await db.commit()
    return {"ok": True}
