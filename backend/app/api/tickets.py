from __future__ import annotations

from datetime import UTC, datetime
from io import StringIO
from typing import Annotated
import csv
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.redis import get_redis
from app.db.session import get_db
from app.middleware.auth import TokenUser, current_user
from app.models.ticket import (
    SlaPolicy,
    Ticket,
    TicketActivity,
    TicketComment,
    TicketCustomField,
    TicketFollower,
    TicketRelation,
    TicketSavedView,
    TicketTimeEntry,
    TicketWorkflow,
)
from app.schemas.ticket import (
    BulkTicketAction,
    CommentCreate,
    CommentOut,
    SlaPolicyCreate,
    SlaPolicyOut,
    TicketActivityOut,
    TicketCreate,
    TicketCustomFieldCreate,
    TicketCustomFieldOut,
    TicketDetailOut,
    TicketOut,
    TicketRelationOut,
    TicketSavedViewCreate,
    TicketSavedViewOut,
    TicketTimeEntryCreate,
    TicketTimeEntryOut,
    TicketUpdate,
    TicketWorkflowCreate,
    TicketWorkflowOut,
)
from app.services.ticket_service import (
    add_comment,
    create_ticket,
    get_ticket,
    log_ticket_activity,
    merge_tickets,
    split_ticket,
    summarize_ticket_text,
    update_ticket,
)

router = APIRouter(prefix="/tickets", tags=["tickets"])

VALID_STATUSES = {"open", "pending", "onhold", "solved", "resolved", "closed", "spam", "active"}
VALID_PRIORITIES = {"low", "normal", "high", "urgent", "medium"}


@router.get("/", response_model=list[TicketOut])
async def list_tickets(
    user: Annotated[TokenUser, Depends(current_user)],
    db: AsyncSession = Depends(get_db),
    status: str | None = None,
    priority: str | None = None,
    assigned_user_id: uuid.UUID | None = None,
    team_id: uuid.UUID | None = None,
    q: str | None = None,
    tags: str | None = None,
    saved_view_id: uuid.UUID | None = None,
    limit: int = Query(50, ge=1, le=500),
) -> list[Ticket]:
    statement = select(Ticket).where(Ticket.organization_id == user.organization_id)
    if saved_view_id:
        view = (
            await db.execute(
                select(TicketSavedView).where(
                    TicketSavedView.id == saved_view_id,
                    TicketSavedView.organization_id == user.organization_id,
                    (TicketSavedView.user_id == user.id) | (TicketSavedView.is_shared.is_(True)),
                )
            )
        ).scalar_one_or_none()
        if view:
            view_filters = view.filters or {}
            status = status or view_filters.get("status")
            priority = priority or view_filters.get("priority")
            q = q or view_filters.get("q")
    if status:
        statement = statement.where(Ticket.status == status)
    if priority:
        statement = statement.where(Ticket.priority == priority)
    if assigned_user_id:
        statement = statement.where(Ticket.assigned_user_id == assigned_user_id)
    if team_id:
        statement = statement.where(Ticket.team_id == team_id)
    if q:
        like = f"%{q}%"
        statement = statement.where((Ticket.subject.ilike(like)) | (Ticket.description.ilike(like)))
    if tags:
        for tag in [x.strip() for x in tags.split(",") if x.strip()]:
            statement = statement.where(Ticket.tags.contains([tag]))
    return (await db.execute(statement.order_by(Ticket.updated_at.desc()).limit(limit))).scalars().all()


@router.post("/", response_model=TicketOut)
async def create(
    payload: TicketCreate,
    user: Annotated[TokenUser, Depends(current_user)],
    db: AsyncSession = Depends(get_db),
) -> Ticket:
    if payload.status not in VALID_STATUSES:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid status")
    if payload.priority not in VALID_PRIORITIES:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid priority")
    ticket = await create_ticket(db, user.organization_id, payload.model_dump(), user.id)
    await db.commit()
    await db.refresh(ticket)
    return ticket


@router.post("/bulk")
async def bulk_action(
    payload: BulkTicketAction,
    user: Annotated[TokenUser, Depends(current_user)],
    db: AsyncSession = Depends(get_db),
) -> dict:
    rows = (
        await db.execute(
            select(Ticket).where(Ticket.organization_id == user.organization_id, Ticket.id.in_(payload.ticket_ids))
        )
    ).scalars().all()
    for row in rows:
        if payload.action == "assign" and payload.assigned_user_id:
            row.assigned_user_id = payload.assigned_user_id
        elif payload.action in {"close", "status"}:
            row.status = payload.status or ("closed" if payload.action == "close" else row.status)
            if row.status in {"resolved", "solved", "closed", "spam"}:
                row.resolved_at = datetime.now(UTC)
        elif payload.action == "priority" and payload.priority:
            row.priority = payload.priority
        elif payload.action == "tag":
            tag_set = set(row.tags or [])
            tag_set.update(payload.tags_add)
            tag_set.difference_update(payload.tags_remove)
            row.tags = sorted(tag_set)
        await log_ticket_activity(
            db,
            organization_id=user.organization_id,
            ticket_id=row.id,
            actor_user_id=user.id,
            event_type="ticket.bulk",
            title="Bulk action applied",
            meta={"action": payload.action},
        )
    await db.commit()
    return {"ok": True, "updated": len(rows)}


@router.get("/saved-views", response_model=list[TicketSavedViewOut])
async def list_saved_views(
    user: Annotated[TokenUser, Depends(current_user)],
    db: AsyncSession = Depends(get_db),
) -> list[TicketSavedView]:
    return (
        await db.execute(
            select(TicketSavedView).where(
                TicketSavedView.organization_id == user.organization_id,
                (TicketSavedView.user_id == user.id) | (TicketSavedView.is_shared.is_(True)),
            )
        )
    ).scalars().all()


@router.post("/saved-views", response_model=TicketSavedViewOut)
async def create_saved_view(
    payload: TicketSavedViewCreate,
    user: Annotated[TokenUser, Depends(current_user)],
    db: AsyncSession = Depends(get_db),
) -> TicketSavedView:
    row = TicketSavedView(organization_id=user.organization_id, user_id=user.id, **payload.model_dump())
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return row


@router.patch("/saved-views/{view_id}", response_model=TicketSavedViewOut)
async def update_saved_view(
    view_id: uuid.UUID,
    payload: TicketSavedViewCreate,
    user: Annotated[TokenUser, Depends(current_user)],
    db: AsyncSession = Depends(get_db),
) -> TicketSavedView:
    row = (
        await db.execute(
            select(TicketSavedView).where(
                TicketSavedView.id == view_id,
                TicketSavedView.organization_id == user.organization_id,
                TicketSavedView.user_id == user.id,
            )
        )
    ).scalar_one_or_none()
    if row is None:
        raise HTTPException(status_code=404, detail="Saved view not found")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(row, key, value)
    await db.commit()
    await db.refresh(row)
    return row


@router.delete("/saved-views/{view_id}")
async def delete_saved_view(
    view_id: uuid.UUID,
    user: Annotated[TokenUser, Depends(current_user)],
    db: AsyncSession = Depends(get_db),
) -> dict:
    await db.execute(
        delete(TicketSavedView).where(
            TicketSavedView.id == view_id,
            TicketSavedView.organization_id == user.organization_id,
            TicketSavedView.user_id == user.id,
        )
    )
    await db.commit()
    return {"ok": True}


@router.get("/sla-policies", response_model=list[SlaPolicyOut])
async def list_sla_policies(
    user: Annotated[TokenUser, Depends(current_user)], db: AsyncSession = Depends(get_db)
) -> list[SlaPolicy]:
    return (
        await db.execute(
            select(SlaPolicy).where(SlaPolicy.organization_id == user.organization_id).order_by(SlaPolicy.created_at.asc())
        )
    ).scalars().all()


@router.post("/sla-policies", response_model=SlaPolicyOut)
async def create_sla_policy(
    payload: SlaPolicyCreate,
    user: Annotated[TokenUser, Depends(current_user)],
    db: AsyncSession = Depends(get_db),
) -> SlaPolicy:
    row = SlaPolicy(organization_id=user.organization_id, **payload.model_dump())
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return row


@router.patch("/sla-policies/{policy_id}", response_model=SlaPolicyOut)
async def update_sla_policy(
    policy_id: uuid.UUID,
    payload: SlaPolicyCreate,
    user: Annotated[TokenUser, Depends(current_user)],
    db: AsyncSession = Depends(get_db),
) -> SlaPolicy:
    row = (
        await db.execute(
            select(SlaPolicy).where(
                SlaPolicy.id == policy_id,
                SlaPolicy.organization_id == user.organization_id,
            )
        )
    ).scalar_one_or_none()
    if row is None:
        raise HTTPException(status_code=404, detail="SLA policy not found")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(row, key, value)
    await db.commit()
    await db.refresh(row)
    return row


@router.delete("/sla-policies/{policy_id}")
async def delete_sla_policy(
    policy_id: uuid.UUID,
    user: Annotated[TokenUser, Depends(current_user)],
    db: AsyncSession = Depends(get_db),
) -> dict:
    await db.execute(
        delete(SlaPolicy).where(SlaPolicy.id == policy_id, SlaPolicy.organization_id == user.organization_id)
    )
    await db.commit()
    return {"ok": True}


@router.get("/sla-report")
async def sla_report(
    user: Annotated[TokenUser, Depends(current_user)],
    db: AsyncSession = Depends(get_db),
) -> dict:
    total = await db.scalar(select(func.count(Ticket.id)).where(Ticket.organization_id == user.organization_id))
    breached = await db.scalar(
        select(func.count(Ticket.id)).where(Ticket.organization_id == user.organization_id, Ticket.sla_breached.is_(True))
    )
    first_response_breached = await db.scalar(
        select(func.count(Ticket.id)).where(
            Ticket.organization_id == user.organization_id,
            Ticket.first_response_breached.is_(True),
        )
    )
    resolution_breached = await db.scalar(
        select(func.count(Ticket.id)).where(
            Ticket.organization_id == user.organization_id,
            Ticket.resolution_breached.is_(True),
        )
    )
    return {
        "total": int(total or 0),
        "breached": int(breached or 0),
        "first_response_breached": int(first_response_breached or 0),
        "resolution_breached": int(resolution_breached or 0),
    }


@router.get("/workflows", response_model=list[TicketWorkflowOut])
async def list_workflows(
    user: Annotated[TokenUser, Depends(current_user)],
    db: AsyncSession = Depends(get_db),
) -> list[TicketWorkflow]:
    return (
        await db.execute(
            select(TicketWorkflow)
            .where(TicketWorkflow.organization_id == user.organization_id)
            .order_by(TicketWorkflow.created_at.desc())
        )
    ).scalars().all()


@router.post("/workflows", response_model=TicketWorkflowOut)
async def create_workflow(
    payload: TicketWorkflowCreate,
    user: Annotated[TokenUser, Depends(current_user)],
    db: AsyncSession = Depends(get_db),
) -> TicketWorkflow:
    row = TicketWorkflow(organization_id=user.organization_id, **payload.model_dump())
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return row


@router.patch("/workflows/{workflow_id}", response_model=TicketWorkflowOut)
async def update_workflow(
    workflow_id: uuid.UUID,
    payload: TicketWorkflowCreate,
    user: Annotated[TokenUser, Depends(current_user)],
    db: AsyncSession = Depends(get_db),
) -> TicketWorkflow:
    row = (
        await db.execute(
            select(TicketWorkflow).where(
                TicketWorkflow.id == workflow_id,
                TicketWorkflow.organization_id == user.organization_id,
            )
        )
    ).scalar_one_or_none()
    if row is None:
        raise HTTPException(status_code=404, detail="Workflow not found")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(row, key, value)
    await db.commit()
    await db.refresh(row)
    return row


@router.delete("/workflows/{workflow_id}")
async def delete_workflow(
    workflow_id: uuid.UUID,
    user: Annotated[TokenUser, Depends(current_user)],
    db: AsyncSession = Depends(get_db),
) -> dict:
    await db.execute(
        delete(TicketWorkflow).where(
            TicketWorkflow.id == workflow_id,
            TicketWorkflow.organization_id == user.organization_id,
        )
    )
    await db.commit()
    return {"ok": True}


@router.get("/custom-fields", response_model=list[TicketCustomFieldOut])
async def list_custom_fields(
    user: Annotated[TokenUser, Depends(current_user)],
    db: AsyncSession = Depends(get_db),
) -> list[TicketCustomField]:
    return (
        await db.execute(
            select(TicketCustomField)
            .where(TicketCustomField.organization_id == user.organization_id)
            .order_by(TicketCustomField.created_at.asc())
        )
    ).scalars().all()


@router.post("/custom-fields", response_model=TicketCustomFieldOut)
async def create_custom_field(
    payload: TicketCustomFieldCreate,
    user: Annotated[TokenUser, Depends(current_user)],
    db: AsyncSession = Depends(get_db),
) -> TicketCustomField:
    row = TicketCustomField(organization_id=user.organization_id, **payload.model_dump())
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return row


@router.patch("/custom-fields/{field_id}", response_model=TicketCustomFieldOut)
async def update_custom_field(
    field_id: uuid.UUID,
    payload: TicketCustomFieldCreate,
    user: Annotated[TokenUser, Depends(current_user)],
    db: AsyncSession = Depends(get_db),
) -> TicketCustomField:
    row = (
        await db.execute(
            select(TicketCustomField).where(
                TicketCustomField.id == field_id,
                TicketCustomField.organization_id == user.organization_id,
            )
        )
    ).scalar_one_or_none()
    if row is None:
        raise HTTPException(status_code=404, detail="Custom field not found")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(row, key, value)
    await db.commit()
    await db.refresh(row)
    return row


@router.delete("/custom-fields/{field_id}")
async def delete_custom_field(
    field_id: uuid.UUID,
    user: Annotated[TokenUser, Depends(current_user)],
    db: AsyncSession = Depends(get_db),
) -> dict:
    await db.execute(
        delete(TicketCustomField).where(
            TicketCustomField.id == field_id,
            TicketCustomField.organization_id == user.organization_id,
        )
    )
    await db.commit()
    return {"ok": True}


@router.get("/export.csv")
async def export_csv(
    user: Annotated[TokenUser, Depends(current_user)],
    db: AsyncSession = Depends(get_db),
    status: str | None = None,
) -> Response:
    statement = select(Ticket).where(Ticket.organization_id == user.organization_id)
    if status:
        statement = statement.where(Ticket.status == status)
    rows = (await db.execute(statement.order_by(Ticket.updated_at.desc()).limit(5000))).scalars().all()
    output = StringIO()
    writer = csv.writer(output)
    writer.writerow(["ticket_number", "subject", "status", "priority", "assigned_user_id", "created_at", "updated_at", "tags"])
    for row in rows:
        writer.writerow(
            [
                row.ticket_number,
                row.subject,
                row.status,
                row.priority,
                str(row.assigned_user_id) if row.assigned_user_id else "",
                row.created_at.isoformat() if row.created_at else "",
                row.updated_at.isoformat() if row.updated_at else "",
                ",".join(row.tags or []),
            ]
        )
    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="tickets.csv"'},
    )


@router.get("/{ticket_id}", response_model=TicketDetailOut)
async def detail(
    ticket_id: uuid.UUID,
    user: Annotated[TokenUser, Depends(current_user)],
    db: AsyncSession = Depends(get_db),
) -> TicketDetailOut:
    ticket = await get_ticket(db, user.organization_id, ticket_id)
    comments = (
        await db.execute(
            select(TicketComment).where(TicketComment.ticket_id == ticket.id).order_by(TicketComment.created_at.asc())
        )
    ).scalars().all()
    activities = (
        await db.execute(
            select(TicketActivity)
            .where(TicketActivity.ticket_id == ticket.id)
            .order_by(TicketActivity.created_at.desc())
            .limit(100)
        )
    ).scalars().all()
    followers = (
        await db.execute(select(TicketFollower.user_id).where(TicketFollower.ticket_id == ticket.id))
    ).scalars().all()
    return TicketDetailOut(
        ticket=TicketOut.model_validate(ticket),
        comments=[CommentOut.model_validate(item) for item in comments],
        activity=[TicketActivityOut.model_validate(item) for item in activities],
        followers=[str(item) for item in followers],
        linked_chat_id=ticket.source_chat_id,
    )


@router.patch("/{ticket_id}", response_model=TicketOut)
async def update(
    ticket_id: uuid.UUID,
    payload: TicketUpdate,
    user: Annotated[TokenUser, Depends(current_user)],
    db: AsyncSession = Depends(get_db),
) -> Ticket:
    ticket = await get_ticket(db, user.organization_id, ticket_id)
    patch = payload.model_dump(exclude_unset=True)
    if patch.get("status") and patch["status"] not in VALID_STATUSES:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid status")
    if patch.get("priority") and patch["priority"] not in VALID_PRIORITIES:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid priority")
    ticket = await update_ticket(db, ticket=ticket, patch=patch, actor_user_id=user.id)
    await db.commit()
    await db.refresh(ticket)
    return ticket


@router.post("/{ticket_id}/resolve", response_model=TicketOut)
async def resolve(
    ticket_id: uuid.UUID,
    user: Annotated[TokenUser, Depends(current_user)],
    db: AsyncSession = Depends(get_db),
) -> Ticket:
    ticket = await get_ticket(db, user.organization_id, ticket_id)
    ticket.status = "resolved"
    ticket.resolved_at = datetime.now(UTC)
    await log_ticket_activity(
        db,
        organization_id=user.organization_id,
        ticket_id=ticket.id,
        actor_user_id=user.id,
        event_type="ticket.resolved",
        title="Ticket resolved",
    )
    await db.commit()
    await db.refresh(ticket)
    return ticket


@router.get("/{ticket_id}/comments", response_model=list[CommentOut])
async def comments(
    ticket_id: uuid.UUID,
    user: Annotated[TokenUser, Depends(current_user)],
    db: AsyncSession = Depends(get_db),
) -> list[TicketComment]:
    ticket = await get_ticket(db, user.organization_id, ticket_id)
    return (
        await db.execute(
            select(TicketComment).where(TicketComment.ticket_id == ticket.id).order_by(TicketComment.created_at.asc())
        )
    ).scalars().all()


@router.post("/{ticket_id}/comments", response_model=CommentOut)
async def create_comment(
    ticket_id: uuid.UUID,
    payload: CommentCreate,
    user: Annotated[TokenUser, Depends(current_user)],
    db: AsyncSession = Depends(get_db),
) -> TicketComment:
    ticket = await get_ticket(db, user.organization_id, ticket_id)
    comment = await add_comment(
        db,
        ticket,
        user.id,
        payload.content,
        payload.is_internal,
        content_format=payload.content_format,
        time_spent_minutes=payload.time_spent_minutes,
    )
    await db.commit()
    await db.refresh(comment)
    return comment


@router.get("/{ticket_id}/activity", response_model=list[TicketActivityOut])
async def ticket_activity(
    ticket_id: uuid.UUID,
    user: Annotated[TokenUser, Depends(current_user)],
    db: AsyncSession = Depends(get_db),
) -> list[TicketActivity]:
    await get_ticket(db, user.organization_id, ticket_id)
    return (
        await db.execute(
            select(TicketActivity)
            .where(TicketActivity.ticket_id == ticket_id)
            .order_by(TicketActivity.created_at.desc())
            .limit(500)
        )
    ).scalars().all()


@router.post("/{ticket_id}/merge")
async def merge_ticket(
    ticket_id: uuid.UUID,
    merge_ticket_ids: list[uuid.UUID],
    user: Annotated[TokenUser, Depends(current_user)],
    db: AsyncSession = Depends(get_db),
) -> dict:
    primary = await get_ticket(db, user.organization_id, ticket_id)
    await merge_tickets(
        db,
        organization_id=user.organization_id,
        primary_ticket=primary,
        merge_ticket_ids=merge_ticket_ids,
        actor_user_id=user.id,
    )
    await db.commit()
    return {"ok": True, "primary_ticket_id": str(primary.id)}


@router.post("/{ticket_id}/split", response_model=TicketOut)
async def split_ticket_endpoint(
    ticket_id: uuid.UUID,
    payload: dict,
    user: Annotated[TokenUser, Depends(current_user)],
    db: AsyncSession = Depends(get_db),
) -> Ticket:
    source = await get_ticket(db, user.organization_id, ticket_id)
    subject = str(payload.get("subject") or f"Split from #{source.ticket_number}")
    description = str(payload.get("description") or "")
    child = await split_ticket(db, source_ticket=source, actor_user_id=user.id, subject=subject, description=description)
    await db.commit()
    await db.refresh(child)
    return child


@router.post("/{ticket_id}/follow")
async def follow_ticket(
    ticket_id: uuid.UUID,
    user: Annotated[TokenUser, Depends(current_user)],
    db: AsyncSession = Depends(get_db),
) -> dict:
    await get_ticket(db, user.organization_id, ticket_id)
    existing = (
        await db.execute(select(TicketFollower).where(TicketFollower.ticket_id == ticket_id, TicketFollower.user_id == user.id))
    ).scalar_one_or_none()
    if existing is None:
        db.add(TicketFollower(ticket_id=ticket_id, user_id=user.id))
        await db.commit()
    return {"ok": True}


@router.delete("/{ticket_id}/follow")
async def unfollow_ticket(
    ticket_id: uuid.UUID,
    user: Annotated[TokenUser, Depends(current_user)],
    db: AsyncSession = Depends(get_db),
) -> dict:
    await db.execute(delete(TicketFollower).where(TicketFollower.ticket_id == ticket_id, TicketFollower.user_id == user.id))
    await db.commit()
    return {"ok": True}


@router.get("/{ticket_id}/time-entries", response_model=list[TicketTimeEntryOut])
async def list_time_entries(
    ticket_id: uuid.UUID,
    user: Annotated[TokenUser, Depends(current_user)],
    db: AsyncSession = Depends(get_db),
) -> list[TicketTimeEntry]:
    await get_ticket(db, user.organization_id, ticket_id)
    return (
        await db.execute(
            select(TicketTimeEntry)
            .where(TicketTimeEntry.ticket_id == ticket_id)
            .order_by(TicketTimeEntry.created_at.desc())
        )
    ).scalars().all()


@router.post("/{ticket_id}/time-entries", response_model=TicketTimeEntryOut)
async def add_time_entry(
    ticket_id: uuid.UUID,
    payload: TicketTimeEntryCreate,
    user: Annotated[TokenUser, Depends(current_user)],
    db: AsyncSession = Depends(get_db),
) -> TicketTimeEntry:
    ticket = await get_ticket(db, user.organization_id, ticket_id)
    row = TicketTimeEntry(
        organization_id=user.organization_id,
        ticket_id=ticket.id,
        user_id=user.id,
        minutes=payload.minutes,
        note=payload.note,
        billable_rate=payload.billable_rate,
    )
    db.add(row)
    await log_ticket_activity(
        db,
        organization_id=user.organization_id,
        ticket_id=ticket.id,
        actor_user_id=user.id,
        event_type="ticket.time_entry",
        title="Time logged",
        body=f"{payload.minutes} minutes",
        meta={"minutes": payload.minutes, "note": payload.note},
    )
    await db.commit()
    await db.refresh(row)
    return row


@router.post("/{ticket_id}/relations", response_model=TicketRelationOut)
async def add_relation(
    ticket_id: uuid.UUID,
    payload: dict,
    user: Annotated[TokenUser, Depends(current_user)],
    db: AsyncSession = Depends(get_db),
) -> TicketRelation:
    ticket = await get_ticket(db, user.organization_id, ticket_id)
    related_ticket_id = uuid.UUID(str(payload.get("related_ticket_id")))
    await get_ticket(db, user.organization_id, related_ticket_id)
    relation = TicketRelation(
        organization_id=user.organization_id,
        ticket_id=ticket.id,
        related_ticket_id=related_ticket_id,
        relation_type=str(payload.get("relation_type") or "related"),
    )
    db.add(relation)
    await db.commit()
    await db.refresh(relation)
    return relation


@router.get("/{ticket_id}/relations", response_model=list[TicketRelationOut])
async def list_relations(
    ticket_id: uuid.UUID,
    user: Annotated[TokenUser, Depends(current_user)],
    db: AsyncSession = Depends(get_db),
) -> list[TicketRelation]:
    await get_ticket(db, user.organization_id, ticket_id)
    return (
        await db.execute(
            select(TicketRelation)
            .where(TicketRelation.ticket_id == ticket_id)
            .order_by(TicketRelation.created_at.desc())
        )
    ).scalars().all()


@router.post("/{ticket_id}/ai/suggest")
async def ai_suggest(
    ticket_id: uuid.UUID,
    user: Annotated[TokenUser, Depends(current_user)],
    db: AsyncSession = Depends(get_db),
) -> dict:
    ticket = await get_ticket(db, user.organization_id, ticket_id)
    comments = (
        await db.execute(
            select(TicketComment).where(TicketComment.ticket_id == ticket.id).order_by(TicketComment.created_at.asc())
        )
    ).scalars().all()
    summary = summarize_ticket_text(ticket, comments)
    suggestions = [
        f"Thanks for the details on #{ticket.ticket_number}. I can help with this now.",
        f"Here is what I found: {summary[:180]}",
        "I will keep this ticket updated as we work toward resolution.",
    ]
    return {"suggestions": suggestions}


@router.post("/{ticket_id}/ai/summarize")
async def ai_summarize(
    ticket_id: uuid.UUID,
    user: Annotated[TokenUser, Depends(current_user)],
    db: AsyncSession = Depends(get_db),
) -> dict:
    ticket = await get_ticket(db, user.organization_id, ticket_id)
    comments = (
        await db.execute(
            select(TicketComment).where(TicketComment.ticket_id == ticket.id).order_by(TicketComment.created_at.asc())
        )
    ).scalars().all()
    return {"summary": summarize_ticket_text(ticket, comments)}


@router.post("/{ticket_id}/presence/start")
async def ticket_presence_start(ticket_id: uuid.UUID, user: Annotated[TokenUser, Depends(current_user)]) -> dict:
    key = f"ticket_presence:{ticket_id}:{user.id}"
    await get_redis().setex(key, 60, "1")
    return {"ok": True}


@router.post("/{ticket_id}/presence/stop")
async def ticket_presence_stop(ticket_id: uuid.UUID, user: Annotated[TokenUser, Depends(current_user)]) -> dict:
    key = f"ticket_presence:{ticket_id}:{user.id}"
    await get_redis().delete(key)
    return {"ok": True}


@router.get("/{ticket_id}/presence")
async def ticket_presence(ticket_id: uuid.UUID, user: Annotated[TokenUser, Depends(current_user)]) -> dict:
    pattern = f"ticket_presence:{ticket_id}:*"
    users: list[str] = []
    cursor = b"0"
    redis = get_redis()
    while True:
        cursor, keys = await redis.scan(cursor=cursor, match=pattern, count=200)
        for key in keys:
            users.append(key.decode().rsplit(":", 1)[-1])
        if cursor == 0 or cursor == b"0":
            break
    return {"ticket_id": str(ticket_id), "viewing_user_ids": users}
