from datetime import UTC, datetime
import uuid

from sqlalchemy import Float, case, cast, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.analytics_event import AnalyticsEvent
from app.models.chat import Chat
from app.models.user import User


async def log_event(
    db: AsyncSession,
    organization_id: uuid.UUID,
    event_type: str,
    *,
    chat_id: uuid.UUID | None = None,
    user_id: uuid.UUID | None = None,
    contact_id: uuid.UUID | None = None,
    metadata: dict | None = None,
) -> AnalyticsEvent:
    event = AnalyticsEvent(
        organization_id=organization_id,
        event_type=event_type,
        chat_id=chat_id,
        user_id=user_id,
        contact_id=contact_id,
        metadata_=metadata or {},
    )
    db.add(event)
    await db.flush()
    return event


async def overview(db: AsyncSession, organization_id: uuid.UUID) -> dict:
    today = datetime.now(UTC).date()
    active_chats = await db.scalar(select(func.count()).select_from(Chat).where(Chat.organization_id == organization_id, Chat.status == "active"))
    queue_length = await db.scalar(select(func.count()).select_from(Chat).where(Chat.organization_id == organization_id, Chat.status == "waiting"))
    agents_online = await db.scalar(select(func.count()).select_from(User).where(User.organization_id == organization_id, User.is_online.is_(True)))
    resolved = await db.scalar(
        select(func.count()).select_from(Chat).where(Chat.organization_id == organization_id, Chat.status == "resolved", func.date(Chat.resolved_at) == today)
    )
    csat = await db.scalar(
        select(func.avg(cast(Chat.csat_score, Float))).where(Chat.organization_id == organization_id, Chat.csat_score.is_not(None))
    )
    wait_avg = await db.scalar(
        select(
            func.avg(
                case(
                    (Chat.first_response_at.is_not(None), func.extract("epoch", Chat.first_response_at - Chat.created_at)),
                    else_=0,
                )
            )
        ).where(Chat.organization_id == organization_id)
    )
    return {
        "active_chats": active_chats or 0,
        "queue_length": queue_length or 0,
        "agents_online": agents_online or 0,
        "avg_wait_seconds": float(wait_avg or 0),
        "todays_resolved": resolved or 0,
        "todays_csat": float(csat) if csat is not None else None,
    }
