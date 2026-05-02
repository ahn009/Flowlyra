from datetime import UTC, datetime, timedelta
import uuid

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.ticket import Ticket, TicketComment
from app.services.analytics_service import log_event


async def get_ticket(db: AsyncSession, organization_id: uuid.UUID, ticket_id: uuid.UUID) -> Ticket:
    ticket = (await db.execute(select(Ticket).where(Ticket.id == ticket_id, Ticket.organization_id == organization_id))).scalar_one_or_none()
    if ticket is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")
    return ticket


def calculate_sla_due(priority: str) -> datetime:
    hours = {"urgent": 2, "high": 8, "medium": 24, "low": 72}.get(priority, 24)
    return datetime.now(UTC) + timedelta(hours=hours)


async def create_ticket(db: AsyncSession, organization_id: uuid.UUID, payload: dict, user_id: uuid.UUID | None = None) -> Ticket:
    ticket = Ticket(organization_id=organization_id, sla_due_at=calculate_sla_due(payload.get("priority", "medium")), **payload)
    db.add(ticket)
    await log_event(db, organization_id, "ticket_created", user_id=user_id)
    await db.flush()
    return ticket


async def add_comment(db: AsyncSession, ticket: Ticket, user_id: uuid.UUID, content: str, is_internal: bool) -> TicketComment:
    comment = TicketComment(ticket_id=ticket.id, user_id=user_id, content=content, is_internal=is_internal)
    db.add(comment)
    if ticket.first_response_at is None and not is_internal:
        ticket.first_response_at = datetime.now(UTC)
    ticket.updated_at = datetime.now(UTC)
    await db.flush()
    return comment
