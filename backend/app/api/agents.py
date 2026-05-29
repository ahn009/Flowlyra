from datetime import UTC, datetime
from typing import Annotated
import secrets
import uuid

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.middleware.auth import TokenUser, current_user, hash_password, require_role
from app.models.chat import Chat
from app.models.user import User
from app.models.workspace_membership import WorkspaceMembership
from app.schemas.agent import AgentCreate, AgentOut, AgentUpdate, StatusRequest
from app.services.email_service import send_invite
from app.services.plan_service import assert_seat_available
from app.services import billing_service

router = APIRouter(prefix="/agents", tags=["agents"])


@router.get("/", response_model=list[AgentOut])
async def list_agents(user: Annotated[TokenUser, Depends(current_user)], db: AsyncSession = Depends(get_db)) -> list[User]:
    return (await db.execute(select(User).where(User.organization_id == user.organization_id).order_by(User.full_name.asc()))).scalars().all()


@router.post("/", response_model=AgentOut)
async def create_agent(payload: AgentCreate, user: Annotated[TokenUser, Depends(require_role("admin", "supervisor", "owner"))], db: AsyncSession = Depends(get_db)) -> User:
    await assert_seat_available(db, user.organization_id, extra=1)
    token = secrets.token_urlsafe(32)
    agent = User(
        organization_id=user.organization_id,
        email=payload.email,
        full_name=payload.full_name,
        role=payload.role,
        max_chats=payload.max_chats,
        password_hash=hash_password(secrets.token_urlsafe(16)),
        invite_token=token,
        is_active=True,
    )
    db.add(agent)
    await db.flush()
    db.add(
        WorkspaceMembership(
            user_id=agent.id,
            organization_id=user.organization_id,
            role=payload.role,
            invited_by=user.id,
            is_primary=True,
        )
    )
    await db.commit()
    await db.refresh(agent)
    active_count = await db.scalar(select(func.count()).select_from(User).where(User.organization_id == user.organization_id, User.is_active.is_(True)))
    try:
        await billing_service.update_seat_quantity(db, user.organization_id, int(active_count or 1))
    except RuntimeError:
        pass
    await send_invite(agent.email, token)
    return agent


@router.get("/me", response_model=AgentOut)
async def me(user: Annotated[TokenUser, Depends(current_user)], db: AsyncSession = Depends(get_db)) -> User:
    return (await db.execute(select(User).where(User.id == user.id, User.organization_id == user.organization_id))).scalar_one()


@router.patch("/me", response_model=AgentOut)
async def update_me(payload: AgentUpdate, user: Annotated[TokenUser, Depends(current_user)], db: AsyncSession = Depends(get_db)) -> User:
    agent = (await db.execute(select(User).where(User.id == user.id, User.organization_id == user.organization_id))).scalar_one()
    for key, value in payload.model_dump(exclude_unset=True, exclude={"role", "max_chats"}).items():
        setattr(agent, key, value)
    await db.commit()
    await db.refresh(agent)
    return agent


@router.post("/me/status")
async def status(payload: StatusRequest, user: Annotated[TokenUser, Depends(current_user)], db: AsyncSession = Depends(get_db)) -> dict:
    agent = (await db.execute(select(User).where(User.id == user.id, User.organization_id == user.organization_id))).scalar_one()
    agent.status = payload.status
    agent.is_online = payload.status in {"online", "busy", "away"}
    agent.last_seen_at = datetime.now(UTC)
    await db.commit()
    return {"ok": True}


@router.get("/{agent_id}")
async def get_agent(agent_id: uuid.UUID, user: Annotated[TokenUser, Depends(current_user)], db: AsyncSession = Depends(get_db)) -> dict:
    agent = (await db.execute(select(User).where(User.id == agent_id, User.organization_id == user.organization_id))).scalar_one()
    handled = await db.scalar(select(func.count()).select_from(Chat).where(Chat.assigned_user_id == agent.id, Chat.organization_id == user.organization_id))
    return {"agent": AgentOut.model_validate(agent), "stats": {"chats_handled": handled or 0}}


@router.patch("/{agent_id}", response_model=AgentOut)
async def update_agent(agent_id: uuid.UUID, payload: AgentUpdate, user: Annotated[TokenUser, Depends(require_role("admin", "supervisor"))], db: AsyncSession = Depends(get_db)) -> User:
    agent = (await db.execute(select(User).where(User.id == agent_id, User.organization_id == user.organization_id))).scalar_one()
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(agent, key, value)
    await db.commit()
    await db.refresh(agent)
    return agent


@router.post("/{agent_id}/suspend")
async def suspend(agent_id: uuid.UUID, user: Annotated[TokenUser, Depends(require_role("admin", "supervisor"))], db: AsyncSession = Depends(get_db)) -> dict:
    agent = (await db.execute(select(User).where(User.id == agent_id, User.organization_id == user.organization_id))).scalar_one()
    agent.is_active = False
    chats = (await db.execute(select(Chat).where(Chat.organization_id == user.organization_id, Chat.assigned_user_id == agent_id, Chat.status.in_(["waiting", "active"])))).scalars().all()
    for chat in chats:
        chat.assigned_user_id = None
        chat.status = "waiting"
    await db.commit()
    active_count = await db.scalar(select(func.count()).select_from(User).where(User.organization_id == user.organization_id, User.is_active.is_(True)))
    try:
        await billing_service.update_seat_quantity(db, user.organization_id, max(1, int(active_count or 1)))
    except RuntimeError:
        pass
    return {"ok": True, "reassigned": len(chats)}
