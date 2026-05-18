from __future__ import annotations

from datetime import UTC, datetime, timedelta
import re
import uuid

from fastapi import HTTPException, status
from sqlalchemy import and_, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.ticket import (
    SlaPolicy,
    Ticket,
    TicketActivity,
    TicketComment,
    TicketFollower,
    TicketSavedView,
    TicketWorkflow,
)
from app.models.user import User
from app.services.analytics_service import log_event
from app.services.notification_service import notify
from app.services.webhook_events import TICKET_CREATED, TICKET_RESOLVED, TICKET_UPDATED
from app.services.webhook_service import dispatch_event

MENTION_RE = re.compile(r"@([a-zA-Z0-9_.+-]+)")


async def get_ticket(db: AsyncSession, organization_id: uuid.UUID, ticket_id: uuid.UUID) -> Ticket:
    ticket = (
        await db.execute(
            select(Ticket).where(
                Ticket.id == ticket_id,
                Ticket.organization_id == organization_id,
            )
        )
    ).scalar_one_or_none()
    if ticket is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")
    return ticket


def _now() -> datetime:
    return datetime.now(UTC)


def _status_is_closed(status_value: str) -> bool:
    return status_value in {"resolved", "solved", "closed", "spam"}


async def log_ticket_activity(
    db: AsyncSession,
    *,
    organization_id: uuid.UUID,
    ticket_id: uuid.UUID,
    actor_user_id: uuid.UUID | None,
    event_type: str,
    title: str,
    body: str | None = None,
    meta: dict | None = None,
) -> TicketActivity:
    row = TicketActivity(
        organization_id=organization_id,
        ticket_id=ticket_id,
        actor_user_id=actor_user_id,
        event_type=event_type,
        title=title,
        body=body,
        meta=meta or {},
    )
    db.add(row)
    await db.flush()
    return row


async def _best_sla_policy(db: AsyncSession, ticket: Ticket) -> SlaPolicy | None:
    rows = (
        await db.execute(
            select(SlaPolicy)
            .where(
                SlaPolicy.organization_id == ticket.organization_id,
                SlaPolicy.is_active.is_(True),
                or_(SlaPolicy.priority.is_(None), SlaPolicy.priority == ticket.priority),
                or_(SlaPolicy.team_id.is_(None), SlaPolicy.team_id == ticket.team_id),
            )
            .order_by(SlaPolicy.priority.is_(None), SlaPolicy.team_id.is_(None), SlaPolicy.created_at.asc())
        )
    ).scalars().all()
    return rows[0] if rows else None


async def apply_sla(db: AsyncSession, ticket: Ticket) -> None:
    policy = await _best_sla_policy(db, ticket)
    now = _now()
    if policy is None:
        hours = {"urgent": 2, "high": 8, "normal": 24, "medium": 24, "low": 72}.get(ticket.priority, 24)
        ticket.sla_due_at = now + timedelta(hours=hours)
        ticket.sla_first_response_due_at = now + timedelta(hours=max(1, hours // 3))
        ticket.sla_resolution_due_at = ticket.sla_due_at
        ticket.sla_policy_id = None
        return
    ticket.sla_policy_id = policy.id
    ticket.sla_first_response_due_at = now + timedelta(minutes=policy.first_response_minutes)
    ticket.sla_resolution_due_at = now + timedelta(minutes=policy.resolution_minutes)
    ticket.sla_due_at = ticket.sla_resolution_due_at


async def auto_assign_ticket(db: AsyncSession, ticket: Ticket) -> None:
    if ticket.assigned_user_id is not None:
        return
    candidate = (
        await db.execute(
            select(
                User.id,
                func.count(Ticket.id).label("open_count"),
            )
            .outerjoin(
                Ticket,
                and_(
                    Ticket.assigned_user_id == User.id,
                    Ticket.organization_id == ticket.organization_id,
                    Ticket.status.in_(["open", "pending", "onhold", "active"]),
                ),
            )
            .where(
                User.organization_id == ticket.organization_id,
                User.is_active.is_(True),
                User.role.in_(["agent", "supervisor", "admin", "owner"]),
            )
            .group_by(User.id)
            .order_by(func.count(Ticket.id).asc(), User.id.asc())
            .limit(1)
        )
    ).first()
    if candidate:
        ticket.assigned_user_id = candidate[0]


async def _match_user_mentions(db: AsyncSession, organization_id: uuid.UUID, text: str) -> list[User]:
    handles = {m.group(1).lower() for m in MENTION_RE.finditer(text or "")}
    if not handles:
        return []
    users = (
        await db.execute(select(User).where(User.organization_id == organization_id, User.is_active.is_(True)))
    ).scalars().all()
    found: list[User] = []
    for user in users:
        email_local = user.email.split("@", 1)[0].lower()
        full_name_parts = {part.lower() for part in user.full_name.split() if part}
        if email_local in handles or full_name_parts.intersection(handles):
            found.append(user)
    return found


async def _notify_followers(
    db: AsyncSession,
    *,
    ticket: Ticket,
    actor_user_id: uuid.UUID | None,
    title: str,
    body: str,
) -> None:
    followers = (
        await db.execute(select(TicketFollower.user_id).where(TicketFollower.ticket_id == ticket.id))
    ).scalars().all()
    for user_id in followers:
        if actor_user_id and user_id == actor_user_id:
            continue
        await notify(
            organization_id=ticket.organization_id,
            user_id=user_id,
            kind="ticket.follow",
            title=title,
            body=body,
            link_url=f"/ticket/{ticket.id}",
            db=db,
        )


async def run_ticket_workflows(
    db: AsyncSession,
    *,
    trigger_type: str,
    ticket: Ticket,
) -> list[str]:
    rows = (
        await db.execute(
            select(TicketWorkflow).where(
                TicketWorkflow.organization_id == ticket.organization_id,
                TicketWorkflow.is_active.is_(True),
                TicketWorkflow.trigger_type == trigger_type,
            )
        )
    ).scalars().all()
    executed: list[str] = []
    for wf in rows:
        cond = wf.conditions or {}
        if cond.get("status") and cond.get("status") != ticket.status:
            continue
        if cond.get("priority") and cond.get("priority") != ticket.priority:
            continue
        actions = wf.actions or {}
        if actions.get("set_status"):
            ticket.status = str(actions["set_status"])
        if actions.get("set_priority"):
            ticket.priority = str(actions["set_priority"])
        if actions.get("assign_user_id"):
            try:
                ticket.assigned_user_id = uuid.UUID(str(actions["assign_user_id"]))
            except ValueError:
                pass
        if isinstance(actions.get("add_tags"), list):
            next_tags = set(ticket.tags or [])
            next_tags.update(str(tag) for tag in actions["add_tags"])
            ticket.tags = sorted(next_tags)
        executed.append(wf.name)
    return executed


async def create_ticket(
    db: AsyncSession,
    organization_id: uuid.UUID,
    payload: dict,
    user_id: uuid.UUID | None = None,
) -> Ticket:
    ticket = Ticket(organization_id=organization_id, **payload)
    db.add(ticket)
    await db.flush()
    await auto_assign_ticket(db, ticket)
    await apply_sla(db, ticket)
    executed = await run_ticket_workflows(db, trigger_type="on_create", ticket=ticket)
    await log_event(db, organization_id, "ticket_created", user_id=user_id)
    await log_ticket_activity(
        db,
        organization_id=organization_id,
        ticket_id=ticket.id,
        actor_user_id=user_id,
        event_type="ticket.created",
        title="Ticket created",
        body=ticket.subject,
        meta={"workflow_executed": executed},
    )
    await dispatch_event(
        organization_id=organization_id,
        event=TICKET_CREATED,
        payload={
            "ticket_id": str(ticket.id),
            "ticket_number": ticket.ticket_number,
            "subject": ticket.subject,
            "status": ticket.status,
            "priority": ticket.priority,
        },
        db=db,
    )
    return ticket


async def update_ticket(
    db: AsyncSession,
    *,
    ticket: Ticket,
    patch: dict,
    actor_user_id: uuid.UUID | None,
) -> Ticket:
    old_status = ticket.status
    old_priority = ticket.priority
    old_assignee = ticket.assigned_user_id
    for key, value in patch.items():
        setattr(ticket, key, value)
    if "priority" in patch or "team_id" in patch:
        await apply_sla(db, ticket)
    executed = await run_ticket_workflows(db, trigger_type="on_update", ticket=ticket)
    await log_ticket_activity(
        db,
        organization_id=ticket.organization_id,
        ticket_id=ticket.id,
        actor_user_id=actor_user_id,
        event_type="ticket.updated",
        title="Ticket updated",
        meta={
            "old_status": old_status,
            "new_status": ticket.status,
            "old_priority": old_priority,
            "new_priority": ticket.priority,
            "old_assigned_user_id": str(old_assignee) if old_assignee else None,
            "new_assigned_user_id": str(ticket.assigned_user_id) if ticket.assigned_user_id else None,
            "workflow_executed": executed,
        },
    )
    await _notify_followers(
        db,
        ticket=ticket,
        actor_user_id=actor_user_id,
        title=f"Ticket #{ticket.ticket_number} updated",
        body=ticket.subject,
    )
    event_name = TICKET_RESOLVED if _status_is_closed(ticket.status) and not _status_is_closed(old_status) else TICKET_UPDATED
    await dispatch_event(
        organization_id=ticket.organization_id,
        event=event_name,
        payload={
            "ticket_id": str(ticket.id),
            "ticket_number": ticket.ticket_number,
            "subject": ticket.subject,
            "old_status": old_status,
            "status": ticket.status,
            "priority": ticket.priority,
            "assigned_user_id": str(ticket.assigned_user_id) if ticket.assigned_user_id else None,
        },
        db=db,
    )
    return ticket


async def add_comment(
    db: AsyncSession,
    ticket: Ticket,
    user_id: uuid.UUID,
    content: str,
    is_internal: bool,
    *,
    content_format: str = "plain",
    time_spent_minutes: int | None = None,
) -> TicketComment:
    comment = TicketComment(
        ticket_id=ticket.id,
        user_id=user_id,
        content=content,
        is_internal=is_internal,
        content_format=content_format,
        time_spent_minutes=time_spent_minutes,
    )
    db.add(comment)
    now = _now()
    if ticket.first_response_at is None and not is_internal:
        ticket.first_response_at = now
        ticket.first_response_breached = bool(ticket.sla_first_response_due_at and now > ticket.sla_first_response_due_at)
    ticket.updated_at = now
    if not is_internal and _status_is_closed(ticket.status):
        ticket.status = "pending"
        ticket.resolved_at = None

    await db.flush()

    await log_ticket_activity(
        db,
        organization_id=ticket.organization_id,
        ticket_id=ticket.id,
        actor_user_id=user_id,
        event_type="ticket.comment",
        title="Comment added" if not is_internal else "Internal note added",
        body=content[:240],
        meta={"is_internal": is_internal, "format": content_format, "time_spent_minutes": time_spent_minutes},
    )

    mentioned_users = await _match_user_mentions(db, ticket.organization_id, content)
    for mentioned_user in mentioned_users:
        if mentioned_user.id == user_id:
            continue
        await notify(
            organization_id=ticket.organization_id,
            user_id=mentioned_user.id,
            kind="ticket.mention",
            title=f"You were mentioned on ticket #{ticket.ticket_number}",
            body=content[:240],
            link_url=f"/ticket/{ticket.id}",
            db=db,
        )

    await _notify_followers(
        db,
        ticket=ticket,
        actor_user_id=user_id,
        title=f"New update on ticket #{ticket.ticket_number}",
        body=content[:180],
    )

    return comment


async def merge_tickets(
    db: AsyncSession,
    *,
    organization_id: uuid.UUID,
    primary_ticket: Ticket,
    merge_ticket_ids: list[uuid.UUID],
    actor_user_id: uuid.UUID,
) -> Ticket:
    if not merge_ticket_ids:
        return primary_ticket
    rows = (
        await db.execute(
            select(Ticket).where(
                Ticket.organization_id == organization_id,
                Ticket.id.in_(merge_ticket_ids),
                Ticket.id != primary_ticket.id,
            )
        )
    ).scalars().all()
    merged_subjects = []
    for row in rows:
        row.merged_into_ticket_id = primary_ticket.id
        row.status = "closed"
        row.resolved_at = _now()
        merged_subjects.append(row.subject)
    if merged_subjects:
        await log_ticket_activity(
            db,
            organization_id=organization_id,
            ticket_id=primary_ticket.id,
            actor_user_id=actor_user_id,
            event_type="ticket.merge",
            title="Tickets merged",
            body=", ".join(merged_subjects)[:500],
            meta={"merged_ids": [str(x.id) for x in rows]},
        )
    return primary_ticket


async def split_ticket(
    db: AsyncSession,
    *,
    source_ticket: Ticket,
    actor_user_id: uuid.UUID,
    subject: str,
    description: str,
) -> Ticket:
    child = Ticket(
        organization_id=source_ticket.organization_id,
        contact_id=source_ticket.contact_id,
        assigned_user_id=source_ticket.assigned_user_id,
        team_id=source_ticket.team_id,
        source_chat_id=source_ticket.source_chat_id,
        subject=subject,
        description=description,
        status="open",
        priority=source_ticket.priority,
        tags=list(source_ticket.tags or []),
        parent_ticket_id=source_ticket.id,
        custom_fields=dict(source_ticket.custom_fields or {}),
    )
    db.add(child)
    await db.flush()
    await apply_sla(db, child)
    await log_ticket_activity(
        db,
        organization_id=source_ticket.organization_id,
        ticket_id=source_ticket.id,
        actor_user_id=actor_user_id,
        event_type="ticket.split",
        title="Ticket split",
        body=f"Created ticket #{child.ticket_number}",
        meta={"child_ticket_id": str(child.id)},
    )
    await log_ticket_activity(
        db,
        organization_id=source_ticket.organization_id,
        ticket_id=child.id,
        actor_user_id=actor_user_id,
        event_type="ticket.created_from_split",
        title="Created from split",
        body=f"From ticket #{source_ticket.ticket_number}",
        meta={"source_ticket_id": str(source_ticket.id)},
    )
    return child


def summarize_ticket_text(ticket: Ticket, comments: list[TicketComment]) -> str:
    snippets = [ticket.subject, ticket.description or ""]
    snippets.extend(c.content for c in comments[-8:])
    joined = "\n".join(x for x in snippets if x).strip()
    if not joined:
        return "No content yet."
    cleaned = re.sub(r"\s+", " ", joined)
    return cleaned[:600]
