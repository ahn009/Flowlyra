from datetime import UTC, datetime, timedelta
from typing import Annotated, Any
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import and_, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.redis import get_redis
from app.db.session import get_db
from app.middleware.auth import TokenUser, current_user
from app.models.analytics_event import AnalyticsEvent
from app.models.chat import Chat
from app.models.contact import Contact
from app.models.engage import Goal, GoalAchievement, VisitorWatch
from app.models.message import Message
from app.models.proactive_trigger import ProactiveTrigger
from app.models.session import Session
from app.services.chat_service import add_message
from app.socket_manager import sio

router = APIRouter(prefix="/engage", tags=["engage"])


@router.get("/traffic")
async def traffic(
    user: Annotated[TokenUser, Depends(current_user)],
    db: AsyncSession = Depends(get_db),
    country: str | None = None,
    page: str | None = None,
    source: str | None = None,
    limit: int = Query(100, ge=1, le=500),
) -> dict:
    recent_cutoff = datetime.now(UTC) - timedelta(hours=24)
    stmt = select(Session).where(Session.organization_id == user.organization_id, Session.last_seen_at >= recent_cutoff)
    if country:
        stmt = stmt.where(func.lower(Session.country) == country.lower())
    if page:
        like = f"%{page}%"
        stmt = stmt.where(Session.current_url.ilike(like))
    if source:
        like = f"%{source}%"
        stmt = stmt.where(or_(Session.utm_source.ilike(like), Session.referrer.ilike(like), Session.utm_campaign.ilike(like)))

    sessions = (await db.execute(stmt.order_by(Session.last_seen_at.desc()).limit(limit))).scalars().all()
    if not sessions:
        return {"items": []}

    session_ids = [s.id for s in sessions]
    contacts = {
        c.id: c
        for c in (
            await db.execute(
                select(Contact).where(Contact.organization_id == user.organization_id, Contact.id.in_([s.contact_id for s in sessions if s.contact_id]))
            )
        ).scalars().all()
    }
    chats = (
        await db.execute(
            select(Chat)
            .where(Chat.organization_id == user.organization_id, Chat.session_id.in_(session_ids))
            .order_by(Chat.updated_at.desc())
        )
    ).scalars().all()
    latest_chat_by_session: dict[uuid.UUID, Chat] = {}
    for chat in chats:
        latest_chat_by_session.setdefault(chat.session_id, chat)

    watched_ids = set(
        (
            await db.execute(
                select(VisitorWatch.session_id).where(
                    VisitorWatch.organization_id == user.organization_id,
                    VisitorWatch.user_id == user.id,
                    VisitorWatch.session_id.in_(session_ids),
                )
            )
        ).scalars().all()
    )

    redis = get_redis()
    pipe = redis.pipeline()
    for sess in sessions:
        chat = latest_chat_by_session.get(sess.id)
        if chat:
            pipe.exists(f"presence:visitor:{chat.id}")
        else:
            pipe.exists("presence:visitor:none")
    online_flags = await pipe.execute()

    items = []
    for idx, sess in enumerate(sessions):
        chat = latest_chat_by_session.get(sess.id)
        contact = contacts.get(sess.contact_id)
        items.append(
            {
                "session_id": str(sess.id),
                "contact_id": str(sess.contact_id) if sess.contact_id else None,
                "name": contact.full_name if contact else None,
                "email": contact.email if contact else None,
                "country": sess.country,
                "city": sess.city,
                "ip_address": str(sess.ip_address) if sess.ip_address else None,
                "current_url": sess.current_url,
                "referrer": sess.referrer,
                "utm_source": sess.utm_source,
                "utm_campaign": sess.utm_campaign,
                "page_views": sess.page_views,
                "timeline": (sess.page_history or {}).get("items", []),
                "custom_variables": sess.custom_variables or {},
                "is_returning": bool((sess.page_views or 0) > 1),
                "is_online": bool(online_flags[idx]),
                "chat_id": str(chat.id) if chat else None,
                "chat_status": chat.status if chat else None,
                "is_watched": sess.id in watched_ids,
                "last_seen_at": sess.last_seen_at.isoformat() if sess.last_seen_at else None,
                "first_seen_at": sess.first_seen_at.isoformat() if sess.first_seen_at else None,
            }
        )
    return {"items": items}


@router.post("/traffic/{session_id}/message")
async def traffic_send_message(
    session_id: uuid.UUID,
    payload: dict[str, str],
    user: Annotated[TokenUser, Depends(current_user)],
    db: AsyncSession = Depends(get_db),
) -> dict:
    text = (payload.get("message") or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="message is required")

    session = (
        await db.execute(
            select(Session).where(Session.id == session_id, Session.organization_id == user.organization_id)
        )
    ).scalar_one_or_none()
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")

    chat = (
        await db.execute(
            select(Chat)
            .where(
                Chat.organization_id == user.organization_id,
                Chat.session_id == session.id,
                Chat.status.in_(["waiting", "active"]),
            )
            .order_by(Chat.created_at.desc())
            .limit(1)
        )
    ).scalar_one_or_none()

    created_chat = False
    if chat is None:
        chat = Chat(
            organization_id=user.organization_id,
            session_id=session.id,
            contact_id=session.contact_id,
            assigned_user_id=user.id,
            status="active",
            channel="web",
            subject="Proactive outreach",
        )
        db.add(chat)
        await db.flush()
        created_chat = True

    message = await add_message(db, chat, "agent", text, sender_id=user.id)
    await db.commit()

    msg_payload = {
        "id": str(message.id),
        "chat_id": str(message.chat_id),
        "sender_type": message.sender_type,
        "content": message.content,
        "content_type": message.content_type,
        "file_url": message.file_url,
        "file_name": message.file_name,
        "file_size": message.file_size,
        "file_mime": message.file_mime,
        "is_internal": message.is_internal,
        "is_read": message.is_read,
        "created_at": message.created_at.isoformat(),
    }
    await sio.emit("chat:message:new", msg_payload, room=f"chat:{chat.id}")
    await sio.emit("chat:message:new", msg_payload, room=f"org:{chat.organization_id}")
    if chat.assigned_user_id:
        await sio.emit("chat:message:new", msg_payload, room=f"agent:{chat.assigned_user_id}")

    if created_chat:
        await sio.emit(
            "chat:new",
            {
                "chat": {
                    "id": str(chat.id),
                    "organization_id": str(chat.organization_id),
                    "session_id": str(chat.session_id),
                    "contact_id": str(chat.contact_id) if chat.contact_id else None,
                    "assigned_user_id": str(chat.assigned_user_id) if chat.assigned_user_id else None,
                    "status": chat.status,
                    "channel": chat.channel,
                    "subject": chat.subject,
                    "tags": chat.tags,
                    "created_at": chat.created_at.isoformat() if chat.created_at else None,
                    "updated_at": chat.updated_at.isoformat() if chat.updated_at else None,
                },
                "message": msg_payload,
            },
            room=f"org:{chat.organization_id}",
        )

    return {"ok": True, "chat_id": str(chat.id), "message_id": str(message.id), "created_chat": created_chat}


@router.post("/traffic/{session_id}/watch")
async def traffic_watch(
    session_id: uuid.UUID,
    payload: dict[str, Any],
    user: Annotated[TokenUser, Depends(current_user)],
    db: AsyncSession = Depends(get_db),
) -> dict:
    should_watch = bool(payload.get("watch", True))
    note = str(payload.get("note") or "").strip() or None

    session = (
        await db.execute(select(Session).where(Session.id == session_id, Session.organization_id == user.organization_id))
    ).scalar_one_or_none()
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")

    existing = (
        await db.execute(
            select(VisitorWatch).where(
                VisitorWatch.organization_id == user.organization_id,
                VisitorWatch.user_id == user.id,
                VisitorWatch.session_id == session.id,
            )
        )
    ).scalar_one_or_none()

    if should_watch:
        if existing is None:
            db.add(VisitorWatch(organization_id=user.organization_id, user_id=user.id, session_id=session.id, note=note))
        else:
            existing.note = note
    elif existing is not None:
        await db.delete(existing)

    await db.commit()
    return {"ok": True, "watching": should_watch}


@router.get("/campaigns")
async def list_campaigns(user: Annotated[TokenUser, Depends(current_user)], db: AsyncSession = Depends(get_db)) -> list[dict]:
    rows = (
        await db.execute(
            select(ProactiveTrigger)
            .where(ProactiveTrigger.organization_id == user.organization_id)
            .order_by(ProactiveTrigger.created_at.desc())
        )
    ).scalars().all()
    return [
        {
            "id": str(item.id),
            "name": item.name,
            "campaign_type": str((item.conditions or {}).get("campaign_type") or "announcement"),
            "trigger_type": item.trigger_type,
            "conditions": item.conditions or {},
            "message": item.message,
            "is_active": item.is_active,
            "sent_count": item.sent_count,
            "created_at": item.created_at.isoformat() if item.created_at else None,
        }
        for item in rows
    ]


@router.post("/campaigns")
async def create_campaign(
    payload: dict[str, Any],
    user: Annotated[TokenUser, Depends(current_user)],
    db: AsyncSession = Depends(get_db),
) -> dict:
    name = str(payload.get("name") or "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="name is required")

    variants = payload.get("variants") or []
    if not isinstance(variants, list):
        variants = []
    message = str(payload.get("message") or "").strip()
    if not message and variants:
        first = variants[0] if isinstance(variants[0], dict) else {}
        message = str(first.get("message") or "").strip()
    if not message:
        raise HTTPException(status_code=400, detail="message is required")

    conditions = dict(payload.get("conditions") or {})
    conditions["campaign_type"] = str(payload.get("campaign_type") or conditions.get("campaign_type") or "announcement")
    conditions["variants"] = variants
    if payload.get("frequency_cap") is not None:
        conditions["frequency_cap"] = payload.get("frequency_cap")
    if payload.get("schedule") is not None:
        conditions["schedule"] = payload.get("schedule")
    if payload.get("targeting") is not None:
        conditions["targeting"] = payload.get("targeting")

    item = ProactiveTrigger(
        organization_id=user.organization_id,
        name=name,
        trigger_type=str(payload.get("trigger_type") or "time_on_site"),
        conditions=conditions,
        message=message,
        assigned_team_id=uuid.UUID(str(payload["assigned_team_id"])) if payload.get("assigned_team_id") else None,
        is_active=bool(payload.get("is_active", True)),
    )
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return {
        "id": str(item.id),
        "name": item.name,
        "campaign_type": str((item.conditions or {}).get("campaign_type") or "announcement"),
        "trigger_type": item.trigger_type,
        "conditions": item.conditions or {},
        "message": item.message,
        "is_active": item.is_active,
        "sent_count": item.sent_count,
    }


@router.patch("/campaigns/{campaign_id}")
async def update_campaign(
    campaign_id: uuid.UUID,
    payload: dict[str, Any],
    user: Annotated[TokenUser, Depends(current_user)],
    db: AsyncSession = Depends(get_db),
) -> dict:
    item = (
        await db.execute(
            select(ProactiveTrigger).where(
                ProactiveTrigger.id == campaign_id,
                ProactiveTrigger.organization_id == user.organization_id,
            )
        )
    ).scalar_one_or_none()
    if item is None:
        raise HTTPException(status_code=404, detail="Campaign not found")

    if payload.get("name") is not None:
        item.name = str(payload.get("name") or item.name)
    if payload.get("trigger_type") is not None:
        item.trigger_type = str(payload.get("trigger_type") or item.trigger_type)
    if payload.get("message") is not None:
        item.message = str(payload.get("message") or item.message)
    if payload.get("is_active") is not None:
        item.is_active = bool(payload.get("is_active"))

    next_conditions = dict(item.conditions or {})
    if payload.get("conditions") is not None:
        next_conditions.update(dict(payload.get("conditions") or {}))
    if payload.get("campaign_type") is not None:
        next_conditions["campaign_type"] = str(payload.get("campaign_type"))
    if payload.get("variants") is not None:
        next_conditions["variants"] = payload.get("variants")
    if payload.get("frequency_cap") is not None:
        next_conditions["frequency_cap"] = payload.get("frequency_cap")
    if payload.get("schedule") is not None:
        next_conditions["schedule"] = payload.get("schedule")
    if payload.get("targeting") is not None:
        next_conditions["targeting"] = payload.get("targeting")
    item.conditions = next_conditions

    await db.commit()
    await db.refresh(item)
    return {
        "id": str(item.id),
        "name": item.name,
        "campaign_type": str((item.conditions or {}).get("campaign_type") or "announcement"),
        "trigger_type": item.trigger_type,
        "conditions": item.conditions or {},
        "message": item.message,
        "is_active": item.is_active,
        "sent_count": item.sent_count,
    }


@router.get("/campaigns/{campaign_id}/analytics")
async def campaign_analytics(
    campaign_id: uuid.UUID,
    user: Annotated[TokenUser, Depends(current_user)],
    db: AsyncSession = Depends(get_db),
) -> dict:
    exists = (
        await db.execute(
            select(ProactiveTrigger.id).where(
                ProactiveTrigger.id == campaign_id,
                ProactiveTrigger.organization_id == user.organization_id,
            )
        )
    ).scalar_one_or_none()
    if exists is None:
        raise HTTPException(status_code=404, detail="Campaign not found")

    rows = (
        await db.execute(
            select(AnalyticsEvent).where(
                AnalyticsEvent.organization_id == user.organization_id,
                AnalyticsEvent.event_type.in_(["campaign.sent", "campaign.seen", "campaign.clicked", "campaign.converted"]),
            )
        )
    ).scalars().all()

    counts = {"sent": 0, "seen": 0, "clicked": 0, "converted": 0}
    for row in rows:
        meta = row.metadata_ or {}
        if str(meta.get("campaign_id") or "") != str(campaign_id):
            continue
        if row.event_type == "campaign.sent":
            counts["sent"] += 1
        elif row.event_type == "campaign.seen":
            counts["seen"] += 1
        elif row.event_type == "campaign.clicked":
            counts["clicked"] += 1
        elif row.event_type == "campaign.converted":
            counts["converted"] += 1

    sent = counts["sent"]
    return {
        "campaign_id": str(campaign_id),
        "sent": sent,
        "seen": counts["seen"],
        "clicked": counts["clicked"],
        "converted": counts["converted"],
        "ctr": (counts["clicked"] / sent) if sent else 0,
        "conversion_rate": (counts["converted"] / sent) if sent else 0,
    }


@router.get("/goals")
async def list_goals(user: Annotated[TokenUser, Depends(current_user)], db: AsyncSession = Depends(get_db)) -> list[dict]:
    goals = (
        await db.execute(select(Goal).where(Goal.organization_id == user.organization_id).order_by(Goal.created_at.desc()))
    ).scalars().all()
    return [
        {
            "id": str(goal.id),
            "name": goal.name,
            "goal_type": goal.goal_type,
            "event_name": goal.event_name,
            "target_url": goal.target_url,
            "default_value": float(goal.default_value) if goal.default_value is not None else None,
            "is_active": goal.is_active,
            "created_at": goal.created_at.isoformat() if goal.created_at else None,
        }
        for goal in goals
    ]


@router.post("/goals")
async def create_goal(
    payload: dict[str, Any],
    user: Annotated[TokenUser, Depends(current_user)],
    db: AsyncSession = Depends(get_db),
) -> dict:
    name = str(payload.get("name") or "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="name is required")

    goal = Goal(
        organization_id=user.organization_id,
        name=name,
        goal_type=str(payload.get("goal_type") or "event"),
        event_name=str(payload.get("event_name") or "").strip() or None,
        target_url=str(payload.get("target_url") or "").strip() or None,
        default_value=payload.get("default_value"),
        is_active=bool(payload.get("is_active", True)),
    )
    db.add(goal)
    await db.commit()
    await db.refresh(goal)
    return {
        "id": str(goal.id),
        "name": goal.name,
        "goal_type": goal.goal_type,
        "event_name": goal.event_name,
        "target_url": goal.target_url,
        "default_value": float(goal.default_value) if goal.default_value is not None else None,
        "is_active": goal.is_active,
    }


@router.patch("/goals/{goal_id}")
async def update_goal(
    goal_id: uuid.UUID,
    payload: dict[str, Any],
    user: Annotated[TokenUser, Depends(current_user)],
    db: AsyncSession = Depends(get_db),
) -> dict:
    goal = (
        await db.execute(select(Goal).where(Goal.id == goal_id, Goal.organization_id == user.organization_id))
    ).scalar_one_or_none()
    if goal is None:
        raise HTTPException(status_code=404, detail="Goal not found")

    if payload.get("name") is not None:
        goal.name = str(payload.get("name") or goal.name)
    if payload.get("goal_type") is not None:
        goal.goal_type = str(payload.get("goal_type") or goal.goal_type)
    if payload.get("event_name") is not None:
        goal.event_name = str(payload.get("event_name") or "").strip() or None
    if payload.get("target_url") is not None:
        goal.target_url = str(payload.get("target_url") or "").strip() or None
    if payload.get("default_value") is not None:
        goal.default_value = payload.get("default_value")
    if payload.get("is_active") is not None:
        goal.is_active = bool(payload.get("is_active"))

    await db.commit()
    await db.refresh(goal)
    return {
        "id": str(goal.id),
        "name": goal.name,
        "goal_type": goal.goal_type,
        "event_name": goal.event_name,
        "target_url": goal.target_url,
        "default_value": float(goal.default_value) if goal.default_value is not None else None,
        "is_active": goal.is_active,
    }


@router.get("/goals/dashboard")
async def goals_dashboard(
    user: Annotated[TokenUser, Depends(current_user)],
    db: AsyncSession = Depends(get_db),
    days: int = Query(30, ge=1, le=365),
) -> dict:
    start = datetime.now(UTC) - timedelta(days=days)

    total_goals = await db.scalar(select(func.count()).select_from(Goal).where(Goal.organization_id == user.organization_id, Goal.is_active.is_(True)))
    achievements = (
        await db.execute(
            select(GoalAchievement).where(
                GoalAchievement.organization_id == user.organization_id,
                GoalAchievement.achieved_at >= start,
            )
        )
    ).scalars().all()
    achieved_count = len(achievements)
    revenue = sum(float(item.value or 0) for item in achievements)

    visitors = await db.scalar(
        select(func.count()).select_from(Session).where(Session.organization_id == user.organization_id, Session.first_seen_at >= start)
    )
    engaged_sessions = set()
    engaged_rows = (
        await db.execute(
            select(AnalyticsEvent).where(
                AnalyticsEvent.organization_id == user.organization_id,
                AnalyticsEvent.occurred_at >= start,
                AnalyticsEvent.event_type.in_(["campaign.sent", "campaign.seen", "campaign.clicked"]),
            )
        )
    ).scalars().all()
    for row in engaged_rows:
        sid = str((row.metadata_ or {}).get("session_id") or "")
        if sid:
            engaged_sessions.add(sid)

    chats_count = await db.scalar(
        select(func.count()).select_from(Chat).where(Chat.organization_id == user.organization_id, Chat.created_at >= start)
    )

    return {
        "days": days,
        "total_goals": int(total_goals or 0),
        "achieved": achieved_count,
        "revenue": revenue,
        "funnel": {
            "visitors": int(visitors or 0),
            "engaged": len(engaged_sessions),
            "chats": int(chats_count or 0),
            "conversions": achieved_count,
        },
    }


@router.get("/goals/achievements")
async def goals_achievements(
    user: Annotated[TokenUser, Depends(current_user)],
    db: AsyncSession = Depends(get_db),
    limit: int = Query(200, ge=1, le=1000),
) -> list[dict]:
    rows = (
        await db.execute(
            select(GoalAchievement, Goal)
            .join(Goal, Goal.id == GoalAchievement.goal_id)
            .where(GoalAchievement.organization_id == user.organization_id)
            .order_by(GoalAchievement.achieved_at.desc())
            .limit(limit)
        )
    ).all()
    return [
        {
            "id": str(ga.id),
            "goal_id": str(ga.goal_id),
            "goal_name": goal.name,
            "session_id": str(ga.session_id) if ga.session_id else None,
            "chat_id": str(ga.chat_id) if ga.chat_id else None,
            "campaign_id": str(ga.campaign_id) if ga.campaign_id else None,
            "value": float(ga.value) if ga.value is not None else None,
            "metadata": ga.metadata_ or {},
            "achieved_at": ga.achieved_at.isoformat() if ga.achieved_at else None,
        }
        for ga, goal in rows
    ]
