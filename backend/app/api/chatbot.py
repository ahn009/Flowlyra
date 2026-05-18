"""Chatbot CRUD + analytics + runtime."""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.middleware.auth import TokenUser, current_user
from app.models.chatbot import ChatbotFlow, ChatbotSession
from app.services import chatbot_service

router = APIRouter(prefix="/chatbot", tags=["chatbot"])


class FlowIn(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    description: str | None = None
    status: str = "draft"
    widget_id: uuid.UUID | None = None
    trigger: dict[str, Any] = Field(default_factory=dict)
    nodes: list[dict[str, Any]] = Field(default_factory=list)
    edges: list[dict[str, Any]] = Field(default_factory=list)
    variables: dict[str, Any] = Field(default_factory=dict)
    ab_variant_of: uuid.UUID | None = None
    ab_weight: int = 50


class FlowOut(BaseModel):
    id: uuid.UUID
    name: str
    description: str | None
    status: str
    widget_id: uuid.UUID | None
    trigger: dict
    nodes: list
    edges: list
    variables: dict
    ab_variant_of: uuid.UUID | None
    ab_weight: int
    created_at: datetime
    updated_at: datetime


def _to_out(flow: ChatbotFlow) -> FlowOut:
    return FlowOut(
        id=flow.id,
        name=flow.name,
        description=flow.description,
        status=flow.status,
        widget_id=flow.widget_id,
        trigger=flow.trigger or {},
        nodes=flow.nodes or [],
        edges=flow.edges or [],
        variables=flow.variables or {},
        ab_variant_of=flow.ab_variant_of,
        ab_weight=flow.ab_weight,
        created_at=flow.created_at,
        updated_at=flow.updated_at,
    )


@router.get("/flows", response_model=list[FlowOut])
async def list_flows(
    user: Annotated[TokenUser, Depends(current_user)],
    db: AsyncSession = Depends(get_db),
) -> list[FlowOut]:
    flows = await chatbot_service.list_flows(db, user.organization_id)
    return [_to_out(f) for f in flows]


@router.post("/flows", response_model=FlowOut)
async def create_flow(
    body: FlowIn,
    user: Annotated[TokenUser, Depends(current_user)],
    db: AsyncSession = Depends(get_db),
) -> FlowOut:
    flow = ChatbotFlow(
        organization_id=user.organization_id,
        name=body.name,
        description=body.description,
        status=body.status,
        widget_id=body.widget_id,
        trigger=body.trigger,
        nodes=body.nodes,
        edges=body.edges,
        variables=body.variables,
        ab_variant_of=body.ab_variant_of,
        ab_weight=body.ab_weight,
    )
    db.add(flow)
    await db.commit()
    await db.refresh(flow)
    return _to_out(flow)


@router.get("/flows/{flow_id}", response_model=FlowOut)
async def get_flow(
    flow_id: uuid.UUID,
    user: Annotated[TokenUser, Depends(current_user)],
    db: AsyncSession = Depends(get_db),
) -> FlowOut:
    flow = await chatbot_service.get_flow(db, user.organization_id, flow_id)
    if not flow:
        raise HTTPException(404, "flow not found")
    return _to_out(flow)


@router.put("/flows/{flow_id}", response_model=FlowOut)
async def update_flow(
    flow_id: uuid.UUID,
    body: FlowIn,
    user: Annotated[TokenUser, Depends(current_user)],
    db: AsyncSession = Depends(get_db),
) -> FlowOut:
    flow = await chatbot_service.get_flow(db, user.organization_id, flow_id)
    if not flow:
        raise HTTPException(404, "flow not found")
    flow.name = body.name
    flow.description = body.description
    flow.status = body.status
    flow.widget_id = body.widget_id
    flow.trigger = body.trigger
    flow.nodes = body.nodes
    flow.edges = body.edges
    flow.variables = body.variables
    flow.ab_variant_of = body.ab_variant_of
    flow.ab_weight = body.ab_weight
    await db.commit()
    await db.refresh(flow)
    return _to_out(flow)


@router.delete("/flows/{flow_id}")
async def delete_flow(
    flow_id: uuid.UUID,
    user: Annotated[TokenUser, Depends(current_user)],
    db: AsyncSession = Depends(get_db),
) -> dict[str, bool]:
    flow = await chatbot_service.get_flow(db, user.organization_id, flow_id)
    if not flow:
        raise HTTPException(404, "flow not found")
    await db.delete(flow)
    await db.commit()
    return {"deleted": True}


@router.get("/flows/{flow_id}/analytics")
async def flow_analytics(
    flow_id: uuid.UUID,
    user: Annotated[TokenUser, Depends(current_user)],
    db: AsyncSession = Depends(get_db),
) -> dict[str, int]:
    flow = await chatbot_service.get_flow(db, user.organization_id, flow_id)
    if not flow:
        raise HTTPException(404, "flow not found")
    total = await db.scalar(
        select(func.count(ChatbotSession.id)).where(ChatbotSession.flow_id == flow_id)
    ) or 0
    completed = await db.scalar(
        select(func.count(ChatbotSession.id)).where(
            ChatbotSession.flow_id == flow_id, ChatbotSession.completed.is_(True)
        )
    ) or 0
    handed_off = await db.scalar(
        select(func.count(ChatbotSession.id)).where(
            ChatbotSession.flow_id == flow_id, ChatbotSession.handed_off.is_(True)
        )
    ) or 0
    return {
        "total_sessions": int(total),
        "completed": int(completed),
        "handed_off": int(handed_off),
        "completion_rate": round((completed / total) * 100, 1) if total else 0.0,
    }
