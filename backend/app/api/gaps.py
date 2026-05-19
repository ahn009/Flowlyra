"""LiveChat parity gap APIs: Moments, agent priority, availability report, greetings conversion, benchmark."""
import uuid
from datetime import UTC, datetime, timedelta
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import and_, func, select, text, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.middleware.auth import TokenUser, current_user
from app.models.analytics_event import AnalyticsEvent
from app.models.chat import Chat
from app.models.gaps import AgentAvailabilityLog, ChatMoment
from app.models.team import Team, team_members
from app.models.user import User

router = APIRouter(prefix="/gaps", tags=["gaps"])

# ---------------------------------------------------------------------------
# 1. Moments
# ---------------------------------------------------------------------------

@router.post("/moments", status_code=201)
async def create_moment(
    payload: dict,
    user: Annotated[TokenUser, Depends(current_user)],
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Send a Moment (temporary in-chat app overlay) to a visitor."""
    chat_id = uuid.UUID(str(payload["chat_id"]))
    chat = (await db.execute(
        select(Chat).where(Chat.id == chat_id, Chat.organization_id == uuid.UUID(user.organization_id))
    )).scalar_one_or_none()
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")

    moment = ChatMoment(
        organization_id=uuid.UUID(user.organization_id),
        chat_id=chat_id,
        created_by_user_id=uuid.UUID(user.user_id),
        title=str(payload["title"]),
        url=str(payload["url"]),
        moment_type=str(payload.get("type", "custom")),
        config=payload.get("config") or {},
        expires_at=datetime.now(UTC) + timedelta(minutes=int(payload.get("expires_minutes", 30))),
    )
    db.add(moment)
    await db.commit()
    await db.refresh(moment)
    return _moment_payload(moment)


@router.get("/moments/{moment_id}")
async def get_moment(
    moment_id: uuid.UUID,
    user: Annotated[TokenUser, Depends(current_user)],
    db: AsyncSession = Depends(get_db),
) -> dict:
    moment = await _get_moment_or_404(db, moment_id, uuid.UUID(user.organization_id))
    return _moment_payload(moment)


@router.patch("/moments/{moment_id}/complete")
async def complete_moment(
    moment_id: uuid.UUID,
    user: Annotated[TokenUser, Depends(current_user)],
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Mark moment as completed by visitor (called via widget)."""
    moment = await _get_moment_or_404(db, moment_id, uuid.UUID(user.organization_id))
    moment.visitor_completed = True
    moment.visitor_completed_at = datetime.now(UTC)
    moment.status = "completed"
    await db.commit()
    await db.refresh(moment)
    return _moment_payload(moment)


@router.get("/moments")
async def list_moments(
    user: Annotated[TokenUser, Depends(current_user)],
    db: AsyncSession = Depends(get_db),
    chat_id: str | None = None,
) -> list[dict]:
    q = select(ChatMoment).where(ChatMoment.organization_id == uuid.UUID(user.organization_id))
    if chat_id:
        q = q.where(ChatMoment.chat_id == uuid.UUID(chat_id))
    q = q.order_by(ChatMoment.created_at.desc()).limit(100)
    rows = (await db.execute(q)).scalars().all()
    return [_moment_payload(m) for m in rows]


async def _get_moment_or_404(db: AsyncSession, moment_id: uuid.UUID, org_id: uuid.UUID) -> ChatMoment:
    m = (await db.execute(
        select(ChatMoment).where(ChatMoment.id == moment_id, ChatMoment.organization_id == org_id)
    )).scalar_one_or_none()
    if not m:
        raise HTTPException(status_code=404, detail="Moment not found")
    return m


def _moment_payload(m: ChatMoment) -> dict:
    return {
        "id": str(m.id),
        "chat_id": str(m.chat_id),
        "title": m.title,
        "url": m.url,
        "type": m.moment_type,
        "config": m.config,
        "status": m.status,
        "visitor_completed": m.visitor_completed,
        "visitor_completed_at": m.visitor_completed_at.isoformat() if m.visitor_completed_at else None,
        "expires_at": m.expires_at.isoformat() if m.expires_at else None,
        "created_at": m.created_at.isoformat(),
    }


# ---------------------------------------------------------------------------
# 2. Agent Priority in Groups
# ---------------------------------------------------------------------------

@router.patch("/teams/{team_id}/members/{user_id}/priority")
async def set_member_priority(
    team_id: uuid.UUID,
    user_id: uuid.UUID,
    payload: dict,
    agent: Annotated[TokenUser, Depends(current_user)],
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Set agent priority within a team: 0 = primary, 1 = secondary."""
    team = (await db.execute(
        select(Team).where(Team.id == team_id, Team.organization_id == uuid.UUID(agent.organization_id))
    )).scalar_one_or_none()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    priority = int(payload.get("priority", 0))
    if priority not in (0, 1):
        raise HTTPException(status_code=422, detail="priority must be 0 (primary) or 1 (secondary)")

    await db.execute(
        update(team_members)
        .where(
            and_(
                team_members.c.team_id == team_id,
                team_members.c.user_id == user_id,
            )
        )
        .values(priority=priority)
    )
    await db.commit()
    return {"team_id": str(team_id), "user_id": str(user_id), "priority": priority}


@router.get("/teams/{team_id}/members")
async def list_team_members_with_priority(
    team_id: uuid.UUID,
    agent: Annotated[TokenUser, Depends(current_user)],
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    """List team members with their priority levels."""
    team = (await db.execute(
        select(Team).where(Team.id == team_id, Team.organization_id == uuid.UUID(agent.organization_id))
    )).scalar_one_or_none()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    rows = (await db.execute(
        select(
            User.id,
            User.name,
            User.email,
            User.status,
            team_members.c.priority,
        )
        .join(team_members, User.id == team_members.c.user_id)
        .where(team_members.c.team_id == team_id)
        .order_by(team_members.c.priority, User.name)
    )).all()

    return [
        {
            "user_id": str(r.id),
            "name": r.name,
            "email": r.email,
            "status": r.status,
            "priority": r.priority,
            "priority_label": "primary" if r.priority == 0 else "secondary",
        }
        for r in rows
    ]


# ---------------------------------------------------------------------------
# 3. Chat Availability Report
# ---------------------------------------------------------------------------

@router.get("/reports/chat-availability")
async def chat_availability_report(
    user: Annotated[TokenUser, Depends(current_user)],
    db: AsyncSession = Depends(get_db),
    days: int = 7,
) -> dict:
    """Agent online/offline time per day over the last N days."""
    since = datetime.now(UTC) - timedelta(days=days)
    org_id = uuid.UUID(user.organization_id)

    rows = (await db.execute(
        select(
            AgentAvailabilityLog.user_id,
            User.name,
            func.date_trunc("day", AgentAvailabilityLog.occurred_at).label("day"),
            AgentAvailabilityLog.status,
            func.count().label("transitions"),
        )
        .join(User, User.id == AgentAvailabilityLog.user_id)
        .where(
            AgentAvailabilityLog.organization_id == org_id,
            AgentAvailabilityLog.occurred_at >= since,
        )
        .group_by(AgentAvailabilityLog.user_id, User.name, text("day"), AgentAvailabilityLog.status)
        .order_by(text("day"), User.name)
    )).all()

    # Pivot: agent → day → {online, offline, away}
    agents: dict[str, dict] = {}
    for r in rows:
        key = str(r.user_id)
        if key not in agents:
            agents[key] = {"user_id": key, "name": r.name, "days": {}}
        day_str = r.day.strftime("%Y-%m-%d") if hasattr(r.day, "strftime") else str(r.day)[:10]
        if day_str not in agents[key]["days"]:
            agents[key]["days"][day_str] = {"online": 0, "offline": 0, "away": 0}
        agents[key]["days"][day_str][r.status] = r.transitions

    return {"days": days, "agents": list(agents.values())}


# ---------------------------------------------------------------------------
# 4. Greetings Conversion Report
# ---------------------------------------------------------------------------

@router.get("/reports/greetings-conversion")
async def greetings_conversion_report(
    user: Annotated[TokenUser, Depends(current_user)],
    db: AsyncSession = Depends(get_db),
    days: int = 30,
) -> dict:
    """Tracks how many targeted greetings triggered a chat start."""
    since = datetime.now(UTC) - timedelta(days=days)
    org_id = uuid.UUID(user.organization_id)

    seen_row = (await db.execute(
        select(func.count()).where(
            AnalyticsEvent.organization_id == org_id,
            AnalyticsEvent.event_type == "greeting.seen",
            AnalyticsEvent.occurred_at >= since,
        )
    )).scalar_one()

    converted_row = (await db.execute(
        select(func.count()).where(
            AnalyticsEvent.organization_id == org_id,
            AnalyticsEvent.event_type == "greeting.converted",
            AnalyticsEvent.occurred_at >= since,
        )
    )).scalar_one()

    # Per-greeting breakdown
    per_greeting = (await db.execute(
        select(
            AnalyticsEvent.metadata_["greeting_id"].astext.label("greeting_id"),
            AnalyticsEvent.metadata_["greeting_text"].astext.label("greeting_text"),
            func.count().label("count"),
        )
        .where(
            AnalyticsEvent.organization_id == org_id,
            AnalyticsEvent.event_type == "greeting.seen",
            AnalyticsEvent.occurred_at >= since,
        )
        .group_by(
            AnalyticsEvent.metadata_["greeting_id"].astext,
            AnalyticsEvent.metadata_["greeting_text"].astext,
        )
        .order_by(func.count().desc())
        .limit(50)
    )).all()

    per_converted = (await db.execute(
        select(
            AnalyticsEvent.metadata_["greeting_id"].astext.label("greeting_id"),
            func.count().label("count"),
        )
        .where(
            AnalyticsEvent.organization_id == org_id,
            AnalyticsEvent.event_type == "greeting.converted",
            AnalyticsEvent.occurred_at >= since,
        )
        .group_by(AnalyticsEvent.metadata_["greeting_id"].astext)
    )).all()

    conv_map = {r.greeting_id: r.count for r in per_converted}
    items = [
        {
            "greeting_id": r.greeting_id,
            "greeting_text": r.greeting_text,
            "impressions": r.count,
            "conversions": conv_map.get(r.greeting_id, 0),
            "conversion_rate": round(conv_map.get(r.greeting_id, 0) / r.count, 4) if r.count else 0,
        }
        for r in per_greeting
    ]

    total_seen = int(seen_row or 0)
    total_converted = int(converted_row or 0)
    return {
        "days": days,
        "total_impressions": total_seen,
        "total_conversions": total_converted,
        "overall_conversion_rate": round(total_converted / total_seen, 4) if total_seen else 0,
        "items": items,
    }


# ---------------------------------------------------------------------------
# 5. Local Benchmark / Industry Comparison
# ---------------------------------------------------------------------------

_INDUSTRY_BENCHMARKS = {
    "avg_response_seconds": 60,
    "csat_score": 4.2,
    "resolution_rate": 0.87,
    "first_contact_resolution": 0.72,
    "avg_handle_minutes": 8.5,
    "missed_chat_rate": 0.08,
    "queue_abandonment_rate": 0.12,
}


@router.get("/reports/benchmark")
async def benchmark_report(
    user: Annotated[TokenUser, Depends(current_user)],
    db: AsyncSession = Depends(get_db),
    days: int = 30,
) -> dict:
    """Compare org metrics against industry averages."""
    since = datetime.now(UTC) - timedelta(days=days)
    org_id = uuid.UUID(user.organization_id)

    total_chats = (await db.execute(
        select(func.count()).where(Chat.organization_id == org_id, Chat.created_at >= since)
    )).scalar_one() or 0

    avg_resp = (await db.execute(
        select(func.avg(
            func.extract("epoch", Chat.first_response_at - Chat.created_at)
        )).where(
            Chat.organization_id == org_id,
            Chat.created_at >= since,
            Chat.first_response_at.isnot(None),
        )
    )).scalar_one()

    avg_csat = (await db.execute(
        select(func.avg(Chat.csat_score)).where(
            Chat.organization_id == org_id,
            Chat.created_at >= since,
            Chat.csat_score.isnot(None),
        )
    )).scalar_one()

    resolved = (await db.execute(
        select(func.count()).where(
            Chat.organization_id == org_id,
            Chat.created_at >= since,
            Chat.status == "resolved",
        )
    )).scalar_one() or 0

    your_metrics = {
        "avg_response_seconds": round(float(avg_resp), 1) if avg_resp else None,
        "csat_score": round(float(avg_csat), 2) if avg_csat else None,
        "resolution_rate": round(resolved / total_chats, 4) if total_chats else None,
    }

    comparison = {}
    for key, industry_val in _INDUSTRY_BENCHMARKS.items():
        your_val = your_metrics.get(key)
        if your_val is None:
            comparison[key] = {"your": None, "industry": industry_val, "delta": None, "status": "no_data"}
            continue
        if key in {"avg_response_seconds", "missed_chat_rate", "queue_abandonment_rate"}:
            # lower = better
            delta = industry_val - your_val
            status = "better" if your_val < industry_val else ("worse" if your_val > industry_val * 1.1 else "on_par")
        else:
            delta = your_val - industry_val
            status = "better" if your_val > industry_val * 1.05 else ("worse" if your_val < industry_val * 0.9 else "on_par")
        comparison[key] = {"your": your_val, "industry": industry_val, "delta": round(delta, 4), "status": status}

    return {"days": days, "total_chats": total_chats, "comparison": comparison}


# ---------------------------------------------------------------------------
# 6. Record greeting events (called from widget API / public endpoint)
# ---------------------------------------------------------------------------

@router.post("/widget/greeting-event", status_code=204)
async def record_greeting_event(
    payload: dict,
    db: AsyncSession = Depends(get_db),
) -> None:
    """Record greeting.seen or greeting.converted analytics event."""
    event_type = str(payload.get("event_type", ""))
    if event_type not in {"greeting.seen", "greeting.converted"}:
        raise HTTPException(status_code=422, detail="Invalid event_type")

    org_id_str = str(payload.get("org_id", ""))
    if not org_id_str:
        raise HTTPException(status_code=422, detail="org_id required")

    event = AnalyticsEvent(
        organization_id=uuid.UUID(org_id_str),
        event_type=event_type,
        metadata_={
            "greeting_id": str(payload.get("greeting_id", "")),
            "greeting_text": str(payload.get("greeting_text", "")),
        },
    )
    db.add(event)
    await db.commit()


# ---------------------------------------------------------------------------
# 7. Log agent availability status changes
# ---------------------------------------------------------------------------

async def log_agent_availability(
    db: AsyncSession,
    organization_id: uuid.UUID,
    user_id: uuid.UUID,
    status: str,
) -> None:
    """Called by socket_manager when agent status changes."""
    log = AgentAvailabilityLog(
        organization_id=organization_id,
        user_id=user_id,
        status=status,
    )
    db.add(log)
    await db.commit()
