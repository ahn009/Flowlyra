from typing import Annotated, Any
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import delete, select
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
async def list_contacts(user: Annotated[TokenUser, Depends(current_user)], db: AsyncSession = Depends(get_db)) -> list[Any]:
    return (await db.execute(select(Contact).where(Contact.organization_id == user.organization_id).order_by(Contact.updated_at.desc()).limit(100))).scalars().all()


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
