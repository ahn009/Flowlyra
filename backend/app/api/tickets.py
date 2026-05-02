from datetime import UTC, datetime
from typing import Annotated
import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.middleware.auth import TokenUser, current_user
from app.models.ticket import Ticket, TicketComment
from app.schemas.ticket import CommentCreate, CommentOut, TicketCreate, TicketOut, TicketUpdate
from app.services.ticket_service import add_comment, create_ticket, get_ticket

router = APIRouter(prefix="/tickets", tags=["tickets"])


@router.get("/", response_model=list[TicketOut])
async def list_tickets(
    user: Annotated[TokenUser, Depends(current_user)],
    db: AsyncSession = Depends(get_db),
    status: str | None = None,
    priority: str | None = None,
    assigned_user_id: uuid.UUID | None = None,
    q: str | None = None,
    limit: int = Query(50, le=100),
) -> list[Ticket]:
    statement = select(Ticket).where(Ticket.organization_id == user.organization_id)
    if status:
        statement = statement.where(Ticket.status == status)
    if priority:
        statement = statement.where(Ticket.priority == priority)
    if assigned_user_id:
        statement = statement.where(Ticket.assigned_user_id == assigned_user_id)
    if q:
        statement = statement.where(Ticket.subject.ilike(f"%{q}%"))
    return (await db.execute(statement.order_by(Ticket.updated_at.desc()).limit(limit))).scalars().all()


@router.post("/", response_model=TicketOut)
async def create(payload: TicketCreate, user: Annotated[TokenUser, Depends(current_user)], db: AsyncSession = Depends(get_db)) -> Ticket:
    ticket = await create_ticket(db, user.organization_id, payload.model_dump(), user.id)
    await db.commit()
    await db.refresh(ticket)
    return ticket


@router.get("/{ticket_id}")
async def detail(ticket_id: uuid.UUID, user: Annotated[TokenUser, Depends(current_user)], db: AsyncSession = Depends(get_db)) -> dict:
    ticket = await get_ticket(db, user.organization_id, ticket_id)
    comments = (await db.execute(select(TicketComment).where(TicketComment.ticket_id == ticket.id).order_by(TicketComment.created_at.asc()))).scalars().all()
    return {"ticket": TicketOut.model_validate(ticket), "comments": comments, "linked_chat_id": ticket.source_chat_id}


@router.patch("/{ticket_id}", response_model=TicketOut)
async def update(ticket_id: uuid.UUID, payload: TicketUpdate, user: Annotated[TokenUser, Depends(current_user)], db: AsyncSession = Depends(get_db)) -> Ticket:
    ticket = await get_ticket(db, user.organization_id, ticket_id)
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(ticket, key, value)
    await db.commit()
    await db.refresh(ticket)
    return ticket


@router.post("/{ticket_id}/resolve", response_model=TicketOut)
async def resolve(ticket_id: uuid.UUID, user: Annotated[TokenUser, Depends(current_user)], db: AsyncSession = Depends(get_db)) -> Ticket:
    ticket = await get_ticket(db, user.organization_id, ticket_id)
    ticket.status = "resolved"
    ticket.resolved_at = datetime.now(UTC)
    await db.commit()
    await db.refresh(ticket)
    return ticket


@router.get("/{ticket_id}/comments", response_model=list[CommentOut])
async def comments(ticket_id: uuid.UUID, user: Annotated[TokenUser, Depends(current_user)], db: AsyncSession = Depends(get_db)) -> list[TicketComment]:
    ticket = await get_ticket(db, user.organization_id, ticket_id)
    return (await db.execute(select(TicketComment).where(TicketComment.ticket_id == ticket.id).order_by(TicketComment.created_at.asc()))).scalars().all()


@router.post("/{ticket_id}/comments", response_model=CommentOut)
async def create_comment(ticket_id: uuid.UUID, payload: CommentCreate, user: Annotated[TokenUser, Depends(current_user)], db: AsyncSession = Depends(get_db)) -> TicketComment:
    ticket = await get_ticket(db, user.organization_id, ticket_id)
    comment = await add_comment(db, ticket, user.id, payload.content, payload.is_internal)
    await db.commit()
    await db.refresh(comment)
    return comment
