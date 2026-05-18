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
from app.services.permissions import require_permission
from app.services.webhook_events import CONTACT_CREATED, CONTACT_UPDATED
from app.services.webhook_service import dispatch_event

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


@router.post("/")
async def create_contact(
    payload: dict[str, Any],
    user: Annotated[TokenUser, Depends(require_permission("contacts.write"))],
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    email = str(payload.get("email") or "").strip() or None
    full_name = str(payload.get("full_name") or "").strip() or None
    if not email and not full_name:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="email or full_name is required")
    row = Contact(
        organization_id=user.organization_id,
        email=email,
        full_name=full_name,
        phone=str(payload.get("phone") or "").strip() or None,
        country=str(payload.get("country") or "").strip() or None,
        timezone=str(payload.get("timezone") or "").strip() or None,
        custom_attrs=dict(payload.get("custom_attrs") or {}),
        is_vip=bool(payload.get("is_vip", False)),
    )
    db.add(row)
    await db.flush()
    await dispatch_event(
        organization_id=user.organization_id,
        event=CONTACT_CREATED,
        payload={"contact_id": str(row.id), "email": row.email, "full_name": row.full_name, "phone": row.phone},
        db=db,
    )
    await db.commit()
    return {"id": str(row.id)}


@router.patch("/{contact_id}")
async def update_contact(
    contact_id: uuid.UUID,
    payload: dict[str, Any],
    user: Annotated[TokenUser, Depends(require_permission("contacts.write"))],
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    row = (await db.execute(select(Contact).where(Contact.id == contact_id, Contact.organization_id == user.organization_id))).scalar_one_or_none()
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contact not found")
    for key in ("email", "full_name", "phone", "country", "timezone", "is_vip"):
        if key in payload:
            setattr(row, key, payload[key])
    if "custom_attrs" in payload and isinstance(payload["custom_attrs"], dict):
        row.custom_attrs = {**(row.custom_attrs or {}), **payload["custom_attrs"]}
    await dispatch_event(
        organization_id=user.organization_id,
        event=CONTACT_UPDATED,
        payload={"contact_id": str(row.id), "email": row.email, "full_name": row.full_name, "phone": row.phone},
        db=db,
    )
    await db.commit()
    return {"ok": True}


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
