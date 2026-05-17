"""Audit log API + admin viewer endpoint."""

from __future__ import annotations

from typing import Annotated
import csv
import io
import uuid

from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.middleware.auth import TokenUser
from app.models.audit_log import AuditLog
from app.services.permissions import require_permission

router = APIRouter(prefix="/audit", tags=["audit"])


@router.get("")
async def list_logs(
    user: Annotated[TokenUser, Depends(require_permission("audit.read"))],
    db: Annotated[AsyncSession, Depends(get_db)],
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    event: str | None = None,
    actor: uuid.UUID | None = None,
) -> dict:
    stmt = select(AuditLog).where(AuditLog.organization_id == user.organization_id).order_by(desc(AuditLog.created_at))
    if event:
        stmt = stmt.where(AuditLog.event == event)
    if actor:
        stmt = stmt.where(AuditLog.actor_user_id == actor)
    rows = (await db.execute(stmt.limit(limit).offset(offset))).scalars().all()
    items = [
        {
            "id": str(r.id),
            "event": r.event,
            "actor_user_id": str(r.actor_user_id) if r.actor_user_id else None,
            "actor_email": r.actor_email,
            "target_type": r.target_type,
            "target_id": r.target_id,
            "ip_address": r.ip_address,
            "method": r.method,
            "path": r.path,
            "status_code": r.status_code,
            "request_id": r.request_id,
            "details": r.details,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r in rows
    ]
    return {"items": items, "limit": limit, "offset": offset, "has_more": len(items) == limit}


@router.get("/export.csv")
async def export_csv(
    user: Annotated[TokenUser, Depends(require_permission("audit.export"))],
    db: Annotated[AsyncSession, Depends(get_db)],
    limit: int = Query(default=5000, ge=1, le=50000),
) -> Response:
    stmt = (
        select(AuditLog)
        .where(AuditLog.organization_id == user.organization_id)
        .order_by(desc(AuditLog.created_at))
        .limit(limit)
    )
    rows = (await db.execute(stmt)).scalars().all()
    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(["created_at", "event", "actor_email", "ip_address", "method", "path", "status_code", "target_type", "target_id"])
    for r in rows:
        writer.writerow([
            r.created_at.isoformat() if r.created_at else "",
            r.event,
            r.actor_email or "",
            r.ip_address or "",
            r.method or "",
            r.path or "",
            r.status_code or "",
            r.target_type or "",
            r.target_id or "",
        ])
    return Response(
        content=buf.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=flowlyra-audit.csv"},
    )
