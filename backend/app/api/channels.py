"""Channel connections, webhooks, templates, broadcasts."""
from __future__ import annotations

import json
import logging
import uuid
from datetime import datetime
from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.channels import all_channels, get_adapter_class
from app.db.session import get_db
from app.middleware.auth import TokenUser, current_user
from app.models.channel import (
    ChannelConnection,
    ChannelOutbound,
    ChannelTemplate,
    ContactIdentity,
)
from app.models.contact import Contact
from app.services import channel_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/channels", tags=["channels"])


class ConnectionIn(BaseModel):
    channel: str
    name: str = Field(min_length=1, max_length=200)
    external_id: str = Field(min_length=1, max_length=200)
    credentials: dict[str, Any] = Field(default_factory=dict)
    settings: dict[str, Any] = Field(default_factory=dict)
    is_active: bool = True


class ConnectionOut(BaseModel):
    id: uuid.UUID
    channel: str
    name: str
    external_id: str
    settings: dict
    is_active: bool
    status: str
    last_inbound_at: datetime | None
    last_outbound_at: datetime | None
    last_error: str | None
    created_at: datetime


def _to_out(c: ChannelConnection) -> ConnectionOut:
    return ConnectionOut(
        id=c.id,
        channel=c.channel,
        name=c.name,
        external_id=c.external_id,
        settings=c.settings or {},
        is_active=c.is_active,
        status=c.status,
        last_inbound_at=c.last_inbound_at,
        last_outbound_at=c.last_outbound_at,
        last_error=c.last_error,
        created_at=c.created_at,
    )


@router.get("/available")
async def available_channels(_user: Annotated[TokenUser, Depends(current_user)]) -> dict[str, list]:
    items = []
    for ch in all_channels():
        cls = get_adapter_class(ch)
        items.append(
            {"channel": ch, "display_name": getattr(cls, "display_name", ch)}
        )
    return {"items": items}


@router.get("/connections", response_model=list[ConnectionOut])
async def list_connections(
    user: Annotated[TokenUser, Depends(current_user)],
    db: AsyncSession = Depends(get_db),
) -> list[ConnectionOut]:
    rows = await channel_service.list_connections(db, user.organization_id)
    return [_to_out(r) for r in rows]


@router.post("/connections", response_model=ConnectionOut)
async def create_connection(
    body: ConnectionIn,
    user: Annotated[TokenUser, Depends(current_user)],
    db: AsyncSession = Depends(get_db),
) -> ConnectionOut:
    if get_adapter_class(body.channel) is None:
        raise HTTPException(400, "unknown channel")
    conn = ChannelConnection(
        organization_id=user.organization_id,
        channel=body.channel,
        name=body.name,
        external_id=body.external_id,
        credentials=body.credentials,
        settings=body.settings,
        is_active=body.is_active,
    )
    db.add(conn)
    await db.commit()
    await db.refresh(conn)
    return _to_out(conn)


@router.put("/connections/{conn_id}", response_model=ConnectionOut)
async def update_connection(
    conn_id: uuid.UUID,
    body: ConnectionIn,
    user: Annotated[TokenUser, Depends(current_user)],
    db: AsyncSession = Depends(get_db),
) -> ConnectionOut:
    conn = await channel_service.get_connection(db, user.organization_id, conn_id)
    if not conn:
        raise HTTPException(404, "not found")
    conn.name = body.name
    conn.external_id = body.external_id
    if body.credentials:
        conn.credentials = body.credentials
    conn.settings = body.settings
    conn.is_active = body.is_active
    await db.commit()
    await db.refresh(conn)
    return _to_out(conn)


@router.delete("/connections/{conn_id}")
async def delete_connection(
    conn_id: uuid.UUID,
    user: Annotated[TokenUser, Depends(current_user)],
    db: AsyncSession = Depends(get_db),
) -> dict[str, bool]:
    conn = await channel_service.get_connection(db, user.organization_id, conn_id)
    if not conn:
        raise HTTPException(404, "not found")
    await db.delete(conn)
    await db.commit()
    return {"deleted": True}


class TestSendRequest(BaseModel):
    recipient: str
    text: str = "Test message from FlowLyra."


@router.post("/connections/{conn_id}/test")
async def test_send(
    conn_id: uuid.UUID,
    body: TestSendRequest,
    user: Annotated[TokenUser, Depends(current_user)],
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    conn = await channel_service.get_connection(db, user.organization_id, conn_id)
    if not conn:
        raise HTTPException(404, "not found")
    out = await channel_service.queue_outbound(
        db,
        conn=conn,
        chat_id=None,
        message_id=None,
        recipient=body.recipient,
        payload={"type": "text", "text": body.text},
    )
    await db.commit()
    from app.workers.channel_worker import send_outbound_now

    send_outbound_now.delay(str(out.id))
    return {"queued": True, "outbound_id": str(out.id)}


# === Webhooks (public, no auth) ===
webhook_router = APIRouter(prefix="/channels/webhook", tags=["channel-webhook"])


@webhook_router.get("/{channel}/{conn_id}")
async def verify_webhook(channel: str, conn_id: uuid.UUID, request: Request, db: AsyncSession = Depends(get_db)) -> Response:
    """Verification endpoint (Meta uses GET with hub.challenge)."""
    conn = (
        await db.execute(select(ChannelConnection).where(ChannelConnection.id == conn_id))
    ).scalar_one_or_none()
    if not conn or conn.channel != channel:
        raise HTTPException(404, "not found")
    verify_token = (conn.credentials or {}).get("verify_token")
    qp = dict(request.query_params)
    if qp.get("hub.mode") == "subscribe" and qp.get("hub.verify_token") == verify_token:
        return Response(content=qp.get("hub.challenge", ""), media_type="text/plain")
    raise HTTPException(403, "verify failed")


@webhook_router.post("/{channel}/{conn_id}")
async def receive_webhook(
    channel: str,
    conn_id: uuid.UUID,
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    conn = (
        await db.execute(select(ChannelConnection).where(ChannelConnection.id == conn_id))
    ).scalar_one_or_none()
    if not conn or conn.channel != channel:
        raise HTTPException(404, "not found")
    if not conn.is_active:
        return {"ok": False, "reason": "inactive"}
    raw = await request.body()
    headers = {k.lower(): v for k, v in request.headers.items()}
    adapter = channel_service.adapter_for(conn)
    if not adapter.verify_signature(raw, headers):
        logger.warning("webhook signature failed channel=%s conn=%s", channel, conn_id)
        raise HTTPException(401, "bad signature")
    content_type = headers.get("content-type", "")
    if "application/json" in content_type:
        body = json.loads(raw.decode() or "{}")
    else:
        form = await request.form()
        body = {k: form.get(k) for k in form.keys()}
    try:
        messages = await adapter.parse_webhook(body)
    except Exception as exc:  # noqa: BLE001
        logger.exception("webhook parse failed channel=%s", channel)
        conn.status = "degraded"
        conn.last_error = str(exc)[:500]
        await db.commit()
        raise HTTPException(400, "parse failed")
    count = await channel_service.ingest_inbound(db, conn, messages)
    await db.commit()
    return {"ok": True, "received": count}


# === Templates ===

class TemplateIn(BaseModel):
    channel: str
    name: str
    language: str = "en"
    category: str | None = None
    body: str
    components: dict[str, Any] = Field(default_factory=dict)
    connection_id: uuid.UUID | None = None
    external_id: str | None = None
    status: str = "draft"


class TemplateOut(BaseModel):
    id: uuid.UUID
    channel: str
    name: str
    language: str
    category: str | None
    body: str
    components: dict
    external_id: str | None
    status: str
    connection_id: uuid.UUID | None


@router.get("/templates", response_model=list[TemplateOut])
async def list_templates(
    user: Annotated[TokenUser, Depends(current_user)],
    db: AsyncSession = Depends(get_db),
) -> list[TemplateOut]:
    rows = (
        await db.execute(
            select(ChannelTemplate)
            .where(ChannelTemplate.organization_id == user.organization_id)
            .order_by(ChannelTemplate.created_at.desc())
        )
    ).scalars().all()
    return [
        TemplateOut(
            id=t.id,
            channel=t.channel,
            name=t.name,
            language=t.language,
            category=t.category,
            body=t.body,
            components=t.components or {},
            external_id=t.external_id,
            status=t.status,
            connection_id=t.connection_id,
        )
        for t in rows
    ]


@router.post("/templates", response_model=TemplateOut)
async def create_template(
    body: TemplateIn,
    user: Annotated[TokenUser, Depends(current_user)],
    db: AsyncSession = Depends(get_db),
) -> TemplateOut:
    t = ChannelTemplate(
        organization_id=user.organization_id,
        connection_id=body.connection_id,
        channel=body.channel,
        name=body.name,
        language=body.language,
        category=body.category,
        body=body.body,
        components=body.components,
        external_id=body.external_id,
        status=body.status,
    )
    db.add(t)
    await db.commit()
    await db.refresh(t)
    return TemplateOut(
        id=t.id, channel=t.channel, name=t.name, language=t.language, category=t.category,
        body=t.body, components=t.components or {}, external_id=t.external_id,
        status=t.status, connection_id=t.connection_id,
    )


@router.delete("/templates/{template_id}")
async def delete_template(
    template_id: uuid.UUID,
    user: Annotated[TokenUser, Depends(current_user)],
    db: AsyncSession = Depends(get_db),
) -> dict[str, bool]:
    t = (
        await db.execute(
            select(ChannelTemplate).where(
                ChannelTemplate.id == template_id,
                ChannelTemplate.organization_id == user.organization_id,
            )
        )
    ).scalar_one_or_none()
    if not t:
        raise HTTPException(404, "not found")
    await db.delete(t)
    await db.commit()
    return {"deleted": True}


# === Broadcast (bulk WA template) ===

class BroadcastRequest(BaseModel):
    connection_id: uuid.UUID
    template_name: str
    language: str = "en"
    recipients: list[str]
    variables: list[str] | None = None


@router.post("/broadcast")
async def broadcast(
    body: BroadcastRequest,
    user: Annotated[TokenUser, Depends(current_user)],
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    conn = await channel_service.get_connection(db, user.organization_id, body.connection_id)
    if not conn:
        raise HTTPException(404, "connection not found")
    queued = 0
    for recipient in body.recipients:
        out = await channel_service.queue_outbound(
            db,
            conn=conn,
            chat_id=None,
            message_id=None,
            recipient=recipient,
            payload={
                "type": "template",
                "template_name": body.template_name,
                "language": body.language,
                "variables": body.variables or [],
            },
        )
        queued += 1
    await db.commit()
    return {"queued": queued}


# === Cost meter (per-connection usage) ===

@router.get("/connections/{conn_id}/usage")
async def connection_usage(
    conn_id: uuid.UUID,
    user: Annotated[TokenUser, Depends(current_user)],
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    conn = await channel_service.get_connection(db, user.organization_id, conn_id)
    if not conn:
        raise HTTPException(404, "not found")
    from sqlalchemy import func

    total_sent = await db.scalar(
        select(func.count(ChannelOutbound.id)).where(
            ChannelOutbound.connection_id == conn_id, ChannelOutbound.status == "sent"
        )
    ) or 0
    total_failed = await db.scalar(
        select(func.count(ChannelOutbound.id)).where(
            ChannelOutbound.connection_id == conn_id, ChannelOutbound.status == "failed"
        )
    ) or 0
    cost = await db.scalar(
        select(func.coalesce(func.sum(ChannelOutbound.cost_units), 0)).where(
            ChannelOutbound.connection_id == conn_id
        )
    ) or 0
    return {"sent": int(total_sent), "failed": int(total_failed), "cost_units": int(cost)}
