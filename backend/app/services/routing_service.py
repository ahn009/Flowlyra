"""Chat routing: load-based, round-robin, skill-based, VIP priority."""
from __future__ import annotations

import uuid
from typing import Iterable

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.redis import get_redis
from app.models.chat import Chat
from app.models.contact import Contact
from app.models.routing_rule import RoutingRule
from app.models.team import Team, team_members
from app.models.user import User


async def _agent_load(db: AsyncSession, user_id: uuid.UUID) -> int:
    return int(
        await db.scalar(
            select(func.count()).select_from(Chat).where(
                Chat.assigned_user_id == user_id, Chat.status.in_(["waiting", "active"])
            )
        )
        or 0
    )


def _has_required_skills(user: User, required: Iterable[str]) -> bool:
    have = {str(s).lower() for s in (user.skills or [])}
    return all(str(r).lower() in have for r in required)


async def _candidates(
    db: AsyncSession,
    organization_id: uuid.UUID,
    *,
    team_id: uuid.UUID | None,
    required_skills: list[str] | None,
    vip_only: bool,
) -> list[User]:
    stmt = select(User).where(
        User.organization_id == organization_id,
        User.is_active.is_(True),
        User.status.in_(["online", "away"]),
    )
    if team_id:
        stmt = stmt.join(team_members, team_members.c.user_id == User.id).where(
            team_members.c.team_id == team_id
        )
    if vip_only:
        stmt = stmt.where(User.is_vip_handler.is_(True))
    rows = (await db.execute(stmt)).scalars().all()
    if required_skills:
        rows = [u for u in rows if _has_required_skills(u, required_skills)]
    return list(rows)


async def _round_robin_pick(organization_id: uuid.UUID, users: list[User]) -> User:
    redis = get_redis()
    key = f"routing:rr:{organization_id}"
    raw = await redis.incr(key)
    return users[int(raw) % len(users)]


async def choose_agent(
    db: AsyncSession,
    organization_id: uuid.UUID,
    *,
    team_id: uuid.UUID | None = None,
    strategy: str = "load",
    required_skills: list[str] | None = None,
    vip: bool = False,
) -> User | None:
    """strategy: load | round_robin | skill (load among skilled) | vip (vip handlers first)."""
    candidates = await _candidates(
        db,
        organization_id,
        team_id=team_id,
        required_skills=required_skills if strategy == "skill" or required_skills else None,
        vip_only=vip and strategy == "vip",
    )
    if not candidates and vip:
        candidates = await _candidates(
            db, organization_id, team_id=team_id, required_skills=required_skills, vip_only=False
        )
    if not candidates:
        return None
    # filter overloaded
    open_slots: list[User] = []
    for u in candidates:
        load = await _agent_load(db, u.id)
        cap = u.max_concurrent_chats or u.max_chats or 5
        if load < cap:
            open_slots.append(u)
    pool = open_slots or candidates

    if strategy == "round_robin":
        return await _round_robin_pick(organization_id, pool)
    # load-based default
    best: tuple[int, User] | None = None
    for u in pool:
        load = await _agent_load(db, u.id)
        if best is None or load < best[0]:
            best = (load, u)
    return best[1] if best else None


async def route_chat(db: AsyncSession, chat: Chat) -> Chat:
    rule = (
        await db.execute(
            select(RoutingRule)
            .where(RoutingRule.organization_id == chat.organization_id, RoutingRule.is_active.is_(True))
            .order_by(RoutingRule.priority.desc())
        )
    ).scalars().first()

    action = (rule.action if rule else None) or {}
    team_id_raw = action.get("team_id")
    strategy = (action.get("strategy") or "load").lower()
    required_skills = action.get("required_skills") or []

    if team_id_raw:
        chat.team_id = uuid.UUID(str(team_id_raw))
    elif not chat.team_id:
        team = (
            await db.execute(
                select(Team)
                .where(Team.organization_id == chat.organization_id)
                .order_by(Team.created_at.asc())
            )
        ).scalars().first()
        chat.team_id = team.id if team else None

    is_vip = False
    if chat.contact_id:
        contact = (
            await db.execute(select(Contact).where(Contact.id == chat.contact_id))
        ).scalar_one_or_none()
        is_vip = bool(contact and contact.is_vip)

    effective_strategy = "vip" if is_vip else strategy
    agent = await choose_agent(
        db,
        chat.organization_id,
        team_id=chat.team_id,
        strategy=effective_strategy,
        required_skills=required_skills,
        vip=is_vip,
    )
    if agent:
        chat.assigned_user_id = agent.id
        chat.status = "active"
    return chat
