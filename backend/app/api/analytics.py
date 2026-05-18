from datetime import datetime
from typing import Annotated, Any

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.middleware.auth import TokenUser, current_user
from app.models.chat import Chat
from app.models.message import Message
from app.models.ticket import Ticket
from app.models.user import User
from app.schemas.analytics import OverviewResponse
from app.services.analytics_service import overview

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/overview", response_model=OverviewResponse)
async def overview_endpoint(user: Annotated[TokenUser, Depends(current_user)], db: AsyncSession = Depends(get_db)) -> dict:
    return await overview(db, user.organization_id)


@router.get("/chat-volume")
async def chat_volume(user: Annotated[TokenUser, Depends(current_user)], db: AsyncSession = Depends(get_db), group_by: str = "day") -> list[dict]:
    bucket = func.date_trunc(group_by if group_by in {"hour", "day", "week"} else "day", Chat.created_at).label("bucket")
    rows = (await db.execute(select(bucket, func.count()).where(Chat.organization_id == user.organization_id).group_by(bucket).order_by(bucket))).all()
    return [{"bucket": str(row[0]), "count": row[1]} for row in rows]


@router.get("/response-time")
async def response_time(user: Annotated[TokenUser, Depends(current_user)], db: AsyncSession = Depends(get_db)) -> dict:
    seconds = func.extract("epoch", Chat.first_response_at - Chat.created_at)
    rows = (await db.execute(select(func.percentile_cont(0.5).within_group(seconds), func.percentile_cont(0.9).within_group(seconds), func.percentile_cont(0.99).within_group(seconds)).where(Chat.organization_id == user.organization_id, Chat.first_response_at.is_not(None)))).one()
    return {"p50": float(rows[0] or 0), "p90": float(rows[1] or 0), "p99": float(rows[2] or 0)}


@router.get("/csat")
async def csat(user: Annotated[TokenUser, Depends(current_user)], db: AsyncSession = Depends(get_db)) -> list[dict]:
    bucket = func.date_trunc("day", Chat.updated_at).label("bucket")
    rows = (await db.execute(select(bucket, func.avg(Chat.csat_score)).where(Chat.organization_id == user.organization_id, Chat.csat_score.is_not(None)).group_by(bucket).order_by(bucket))).all()
    return [{"bucket": str(row[0]), "score": float(row[1])} for row in rows]


@router.get("/agent-stats")
async def agent_stats(user: Annotated[TokenUser, Depends(current_user)], db: AsyncSession = Depends(get_db)) -> list[dict]:
    rows = (await db.execute(select(User.id, User.full_name, func.count(Chat.id), func.avg(Chat.csat_score)).outerjoin(Chat, Chat.assigned_user_id == User.id).where(User.organization_id == user.organization_id).group_by(User.id))).all()
    return [{"agent_id": str(r[0]), "name": r[1], "chats": r[2], "csat": float(r[3]) if r[3] is not None else None} for r in rows]


@router.get("/missed-chats")
async def missed(user: Annotated[TokenUser, Depends(current_user)], db: AsyncSession = Depends(get_db)) -> list[Any]:
    return (await db.execute(select(Chat).where(Chat.organization_id == user.organization_id, Chat.is_missed.is_(True)).order_by(Chat.updated_at.desc()))).scalars().all()


@router.get("/tags")
async def tags(user: Annotated[TokenUser, Depends(current_user)], db: AsyncSession = Depends(get_db)) -> list[dict]:
    rows = (await db.execute(select(func.unnest(Chat.tags).label("tag"), func.count()).where(Chat.organization_id == user.organization_id).group_by("tag"))).all()
    return [{"tag": row[0], "count": row[1]} for row in rows]


@router.get("/channels")
async def channels_breakdown(user: Annotated[TokenUser, Depends(current_user)], db: AsyncSession = Depends(get_db)) -> list[dict]:
    rows = (
        await db.execute(
            select(Chat.channel, func.count(Chat.id), func.avg(Chat.csat_score))
            .where(Chat.organization_id == user.organization_id)
            .group_by(Chat.channel)
        )
    ).all()
    return [
        {"channel": r[0], "chats": int(r[1] or 0), "csat": float(r[2]) if r[2] is not None else None}
        for r in rows
    ]
