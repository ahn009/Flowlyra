import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.chat import Chat
from app.models.routing_rule import RoutingRule
from app.models.team import Team, team_members
from app.models.user import User


async def choose_agent(db: AsyncSession, organization_id: uuid.UUID, team_id: uuid.UUID | None = None) -> User | None:
    statement = select(User).where(
        User.organization_id == organization_id,
        User.is_active.is_(True),
        User.status.in_(["online", "away"]),
    )
    if team_id:
        statement = statement.join(team_members, team_members.c.user_id == User.id).where(team_members.c.team_id == team_id)
    candidates = (await db.execute(statement)).scalars().all()
    best: tuple[int, User] | None = None
    for user in candidates:
        load = await db.scalar(select(func.count()).select_from(Chat).where(Chat.assigned_user_id == user.id, Chat.status.in_(["waiting", "active"])))
        if best is None or int(load or 0) < best[0]:
            best = (int(load or 0), user)
    return best[1] if best else None


async def route_chat(db: AsyncSession, chat: Chat) -> Chat:
    rule = (
        await db.execute(
            select(RoutingRule)
            .where(RoutingRule.organization_id == chat.organization_id, RoutingRule.is_active.is_(True))
            .order_by(RoutingRule.priority.desc())
        )
    ).scalars().first()
    team_id = None
    if rule:
        action = rule.action or {}
        team_id = action.get("team_id")
    if team_id:
        chat.team_id = uuid.UUID(str(team_id))
    elif not chat.team_id:
        team = (await db.execute(select(Team).where(Team.organization_id == chat.organization_id).order_by(Team.created_at.asc()))).scalars().first()
        chat.team_id = team.id if team else None
    agent = await choose_agent(db, chat.organization_id, chat.team_id)
    if agent:
        chat.assigned_user_id = agent.id
        chat.status = "active"
    return chat
