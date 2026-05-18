import csv
import io
import json
import math
import secrets
import zipfile
from datetime import UTC, datetime, timedelta
from typing import Annotated, Any
import uuid
from xml.sax.saxutils import escape

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import PlainTextResponse, Response
from sqlalchemy import Float, case, cast, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.db.redis import get_redis, ns
from app.db.session import get_db
from app.middleware.auth import TokenUser, current_user
from app.models.analytics_event import AnalyticsEvent
from app.models.chat import Chat
from app.models.chatbot import ChatbotFlow, ChatbotSession
from app.models.engage import Goal, GoalAchievement
from app.models.kb import KBArticle, KBArticleView
from app.models.message import Message
from app.models.report_schedule import ReportSchedule
from app.models.session import Session
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
    return [{"bucket": str(row[0]), "count": int(row[1] or 0)} for row in rows]


@router.get("/chat-duration")
async def chat_duration(user: Annotated[TokenUser, Depends(current_user)], db: AsyncSession = Depends(get_db)) -> dict:
    seconds = func.extract("epoch", Chat.resolved_at - Chat.created_at)
    row = (
        await db.execute(
            select(
                func.avg(seconds),
                func.percentile_cont(0.5).within_group(seconds),
                func.percentile_cont(0.9).within_group(seconds),
            ).where(Chat.organization_id == user.organization_id, Chat.resolved_at.is_not(None))
        )
    ).one()
    series_bucket = func.date_trunc("day", Chat.resolved_at).label("bucket")
    series = (
        await db.execute(
            select(series_bucket, func.avg(seconds))
            .where(Chat.organization_id == user.organization_id, Chat.resolved_at.is_not(None))
            .group_by(series_bucket)
            .order_by(series_bucket)
        )
    ).all()
    return {
        "avg_seconds": float(row[0] or 0),
        "p50_seconds": float(row[1] or 0),
        "p90_seconds": float(row[2] or 0),
        "series": [{"bucket": str(item[0]), "avg_seconds": float(item[1] or 0)} for item in series],
    }


@router.get("/chat-initiation")
async def chat_initiation_breakdown(user: Annotated[TokenUser, Depends(current_user)], db: AsyncSession = Depends(get_db)) -> dict:
    first_msg = (
        select(
            Message.chat_id.label("chat_id"),
            Message.sender_type.label("sender_type"),
            func.row_number().over(partition_by=Message.chat_id, order_by=Message.created_at.asc()).label("rn"),
        )
        .where(Message.is_internal.is_(False))
        .subquery()
    )
    rows = (
        await db.execute(
            select(first_msg.c.sender_type, func.count())
            .join(Chat, Chat.id == first_msg.c.chat_id)
            .where(
                Chat.organization_id == user.organization_id,
                first_msg.c.rn == 1,
            )
            .group_by(first_msg.c.sender_type)
        )
    ).all()
    out = {"visitor": 0, "agent": 0, "bot": 0, "other": 0}
    for sender_type, count in rows:
        if sender_type == "customer":
            out["visitor"] += int(count or 0)
        elif sender_type == "agent":
            out["agent"] += int(count or 0)
        elif sender_type == "bot":
            out["bot"] += int(count or 0)
        else:
            out["other"] += int(count or 0)
    out["total"] = sum(out.values())
    return out


@router.get("/response-time")
async def response_time(user: Annotated[TokenUser, Depends(current_user)], db: AsyncSession = Depends(get_db)) -> dict:
    seconds = func.extract("epoch", Chat.first_response_at - Chat.created_at)
    rows = (await db.execute(select(func.percentile_cont(0.5).within_group(seconds), func.percentile_cont(0.9).within_group(seconds), func.percentile_cont(0.99).within_group(seconds)).where(Chat.organization_id == user.organization_id, Chat.first_response_at.is_not(None)))).one()
    return {"p50": float(rows[0] or 0), "p90": float(rows[1] or 0), "p99": float(rows[2] or 0)}


@router.get("/frt")
async def frt_report(user: Annotated[TokenUser, Depends(current_user)], db: AsyncSession = Depends(get_db)) -> dict:
    data = await response_time(user, db)
    return {"first_response_time_seconds": data}


@router.get("/csat")
async def csat(user: Annotated[TokenUser, Depends(current_user)], db: AsyncSession = Depends(get_db)) -> list[dict]:
    bucket = func.date_trunc("day", Chat.updated_at).label("bucket")
    rows = (await db.execute(select(bucket, func.avg(Chat.csat_score)).where(Chat.organization_id == user.organization_id, Chat.csat_score.is_not(None)).group_by(bucket).order_by(bucket))).all()
    return [{"bucket": str(row[0]), "score": float(row[1])} for row in rows]


@router.get("/agent-stats")
async def agent_stats(user: Annotated[TokenUser, Depends(current_user)], db: AsyncSession = Depends(get_db)) -> list[dict]:
    rows = (await db.execute(select(User.id, User.full_name, func.count(Chat.id), func.avg(Chat.csat_score)).outerjoin(Chat, Chat.assigned_user_id == User.id).where(User.organization_id == user.organization_id).group_by(User.id))).all()
    return [{"agent_id": str(r[0]), "name": r[1], "chats": int(r[2] or 0), "csat": float(r[3]) if r[3] is not None else None} for r in rows]


@router.get("/agent-activity")
async def agent_activity(user: Annotated[TokenUser, Depends(current_user)], db: AsyncSession = Depends(get_db)) -> list[dict]:
    now = datetime.now(UTC)
    window_start = now - timedelta(days=7)
    online_expr = cast(func.count(case((User.status == "online", 1))), Float)
    busy_expr = cast(func.count(case((User.status == "busy", 1))), Float)
    away_expr = cast(func.count(case((User.status == "away", 1))), Float)
    rows = (
        await db.execute(
            select(User.id, User.full_name, User.status, online_expr, busy_expr, away_expr)
            .where(User.organization_id == user.organization_id, User.updated_at >= window_start)
            .group_by(User.id)
        )
    ).all()
    return [
        {
            "agent_id": str(r[0]),
            "name": r[1],
            "status": r[2],
            "online_ticks": int(r[3] or 0),
            "busy_ticks": int(r[4] or 0),
            "away_ticks": int(r[5] or 0),
        }
        for r in rows
    ]


@router.get("/leaderboard")
async def leaderboard(user: Annotated[TokenUser, Depends(current_user)], db: AsyncSession = Depends(get_db)) -> list[dict]:
    rows = await agent_stats(user, db)
    ranked = sorted(rows, key=lambda item: (item["chats"], item["csat"] or 0), reverse=True)
    return [{"rank": idx + 1, **item} for idx, item in enumerate(ranked)]


@router.get("/missed-chats")
async def missed(user: Annotated[TokenUser, Depends(current_user)], db: AsyncSession = Depends(get_db)) -> list[Any]:
    return (await db.execute(select(Chat).where(Chat.organization_id == user.organization_id, Chat.is_missed.is_(True)).order_by(Chat.updated_at.desc()))).scalars().all()


@router.get("/queue-abandonment")
async def queue_abandonment(user: Annotated[TokenUser, Depends(current_user)], db: AsyncSession = Depends(get_db)) -> dict:
    total = await db.scalar(select(func.count()).select_from(Chat).where(Chat.organization_id == user.organization_id))
    abandoned = await db.scalar(select(func.count()).select_from(Chat).where(Chat.organization_id == user.organization_id, Chat.is_missed.is_(True)))
    total_v = int(total or 0)
    abandoned_v = int(abandoned or 0)
    return {
        "total": total_v,
        "abandoned": abandoned_v,
        "rate": (abandoned_v / total_v) if total_v else 0,
    }


@router.get("/queue-wait-distribution")
async def queue_wait_distribution(user: Annotated[TokenUser, Depends(current_user)], db: AsyncSession = Depends(get_db)) -> dict:
    seconds = func.extract("epoch", Chat.first_response_at - Chat.created_at)
    row = (
        await db.execute(
            select(
                func.percentile_cont(0.5).within_group(seconds),
                func.percentile_cont(0.75).within_group(seconds),
                func.percentile_cont(0.9).within_group(seconds),
                func.percentile_cont(0.99).within_group(seconds),
            ).where(Chat.organization_id == user.organization_id, Chat.first_response_at.is_not(None))
        )
    ).one()
    return {"p50": float(row[0] or 0), "p75": float(row[1] or 0), "p90": float(row[2] or 0), "p99": float(row[3] or 0)}


@router.get("/avg-resolution-time")
async def avg_resolution_time(user: Annotated[TokenUser, Depends(current_user)], db: AsyncSession = Depends(get_db)) -> dict:
    seconds = func.extract("epoch", Chat.resolved_at - Chat.created_at)
    avg = await db.scalar(select(func.avg(seconds)).where(Chat.organization_id == user.organization_id, Chat.resolved_at.is_not(None)))
    return {"avg_seconds": float(avg or 0)}


@router.get("/repeat-customer-rate")
async def repeat_customer_rate(user: Annotated[TokenUser, Depends(current_user)], db: AsyncSession = Depends(get_db)) -> dict:
    per_contact = (
        select(Chat.contact_id.label("contact_id"), func.count(Chat.id).label("chat_count"))
        .where(Chat.organization_id == user.organization_id, Chat.contact_id.is_not(None))
        .group_by(Chat.contact_id)
        .subquery()
    )
    total_contacts = await db.scalar(select(func.count()).select_from(per_contact))
    repeat_contacts = await db.scalar(select(func.count()).select_from(per_contact).where(per_contact.c.chat_count > 1))
    total_v = int(total_contacts or 0)
    repeat_v = int(repeat_contacts or 0)
    return {"total_contacts": total_v, "repeat_contacts": repeat_v, "rate": (repeat_v / total_v) if total_v else 0}


@router.get("/tags")
async def tags(user: Annotated[TokenUser, Depends(current_user)], db: AsyncSession = Depends(get_db)) -> list[dict]:
    rows = (await db.execute(select(func.unnest(Chat.tags).label("tag"), func.count()).where(Chat.organization_id == user.organization_id).group_by("tag"))).all()
    return [{"tag": row[0], "count": int(row[1] or 0)} for row in rows]


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


@router.get("/goals-achieved")
async def goals_achieved(user: Annotated[TokenUser, Depends(current_user)], db: AsyncSession = Depends(get_db)) -> dict:
    rows = (
        await db.execute(
            select(Goal.name, func.count(GoalAchievement.id), func.sum(GoalAchievement.value))
            .join(GoalAchievement, GoalAchievement.goal_id == Goal.id)
            .where(GoalAchievement.organization_id == user.organization_id)
            .group_by(Goal.name)
            .order_by(func.count(GoalAchievement.id).desc())
        )
    ).all()
    total = sum(int(row[1] or 0) for row in rows)
    return {
        "total": total,
        "items": [
            {"goal": row[0], "achieved": int(row[1] or 0), "value": float(row[2]) if row[2] is not None else 0.0}
            for row in rows
        ],
    }


@router.get("/revenue")
async def revenue_report(user: Annotated[TokenUser, Depends(current_user)], db: AsyncSession = Depends(get_db)) -> dict:
    rows = (
        await db.execute(
            select(func.date_trunc("day", GoalAchievement.achieved_at).label("bucket"), func.sum(GoalAchievement.value))
            .join(Goal, Goal.id == GoalAchievement.goal_id)
            .where(
                GoalAchievement.organization_id == user.organization_id,
                Goal.goal_type == "revenue",
            )
            .group_by("bucket")
            .order_by("bucket")
        )
    ).all()
    total = sum(float(row[1] or 0) for row in rows)
    return {
        "total": total,
        "series": [{"bucket": str(row[0]), "revenue": float(row[1] or 0)} for row in rows],
    }


@router.get("/campaign-conversion")
async def campaign_conversion(user: Annotated[TokenUser, Depends(current_user)], db: AsyncSession = Depends(get_db)) -> dict:
    rows = (
        await db.execute(
            select(AnalyticsEvent.event_type, AnalyticsEvent.metadata_)
            .where(
                AnalyticsEvent.organization_id == user.organization_id,
                AnalyticsEvent.event_type.in_(["campaign.sent", "campaign.converted"]),
            )
        )
    ).all()
    by_campaign: dict[str, dict[str, float]] = {}
    for event_type, metadata in rows:
        campaign_id = str((metadata or {}).get("campaign_id") or "unknown")
        bucket = by_campaign.setdefault(campaign_id, {"sent": 0.0, "converted": 0.0})
        if event_type == "campaign.sent":
            bucket["sent"] += 1
        elif event_type == "campaign.converted":
            bucket["converted"] += 1
    items = []
    for campaign_id, values in by_campaign.items():
        sent = float(values["sent"])
        converted = float(values["converted"])
        items.append({
            "campaign_id": campaign_id,
            "sent": int(sent),
            "converted": int(converted),
            "conversion_rate": (converted / sent) if sent else 0,
        })
    items.sort(key=lambda item: item["sent"], reverse=True)
    return {"items": items}


@router.get("/sla-compliance")
async def sla_compliance(user: Annotated[TokenUser, Depends(current_user)], db: AsyncSession = Depends(get_db)) -> dict:
    total = await db.scalar(select(func.count()).select_from(Ticket).where(Ticket.organization_id == user.organization_id))
    first_breached = await db.scalar(select(func.count()).select_from(Ticket).where(Ticket.organization_id == user.organization_id, Ticket.first_response_breached.is_(True)))
    resolution_breached = await db.scalar(select(func.count()).select_from(Ticket).where(Ticket.organization_id == user.organization_id, Ticket.resolution_breached.is_(True)))
    total_v = int(total or 0)
    first_v = int(first_breached or 0)
    resolution_v = int(resolution_breached or 0)
    return {
        "total_tickets": total_v,
        "first_response_breaches": first_v,
        "resolution_breaches": resolution_v,
        "first_response_compliance": (1 - (first_v / total_v)) if total_v else 1,
        "resolution_compliance": (1 - (resolution_v / total_v)) if total_v else 1,
    }


@router.get("/kb")
async def kb_analytics_report(user: Annotated[TokenUser, Depends(current_user)], db: AsyncSession = Depends(get_db)) -> dict:
    views_total = await db.scalar(select(func.count()).select_from(KBArticleView).where(KBArticleView.organization_id == user.organization_id))
    top = (
        await db.execute(
            select(KBArticle.title, func.count(KBArticleView.id).label("views"))
            .join(KBArticleView, KBArticleView.article_id == KBArticle.id)
            .where(KBArticleView.organization_id == user.organization_id)
            .group_by(KBArticle.title)
            .order_by(func.count(KBArticleView.id).desc())
            .limit(10)
        )
    ).all()
    return {
        "total_views": int(views_total or 0),
        "top_articles": [{"title": row[0], "views": int(row[1] or 0)} for row in top],
    }


@router.get("/compare-period")
async def compare_period(
    user: Annotated[TokenUser, Depends(current_user)],
    db: AsyncSession = Depends(get_db),
    days: int = Query(7, ge=1, le=90),
) -> dict:
    now = datetime.now(UTC)
    current_start = now - timedelta(days=days)
    previous_start = current_start - timedelta(days=days)
    current_count = await db.scalar(select(func.count()).select_from(Chat).where(Chat.organization_id == user.organization_id, Chat.created_at >= current_start, Chat.created_at <= now))
    previous_count = await db.scalar(select(func.count()).select_from(Chat).where(Chat.organization_id == user.organization_id, Chat.created_at >= previous_start, Chat.created_at < current_start))
    current_v = int(current_count or 0)
    previous_v = int(previous_count or 0)
    delta = current_v - previous_v
    ratio = (delta / previous_v) if previous_v else (1 if current_v else 0)
    return {"days": days, "current": current_v, "previous": previous_v, "delta": delta, "delta_ratio": ratio}


@router.get("/staffing-prediction")
async def staffing_prediction(
    user: Annotated[TokenUser, Depends(current_user)],
    db: AsyncSession = Depends(get_db),
    lookback_days: int = Query(14, ge=7, le=90),
) -> dict:
    start = datetime.now(UTC) - timedelta(days=lookback_days)
    rows = (
        await db.execute(
            select(func.extract("hour", Chat.created_at).label("hour"), func.count(Chat.id))
            .where(Chat.organization_id == user.organization_id, Chat.created_at >= start)
            .group_by("hour")
            .order_by("hour")
        )
    ).all()
    duration = await chat_duration(user, db)
    avg_handle_minutes = max(1.0, float(duration.get("avg_seconds", 0)) / 60.0)
    by_hour = {int(row[0]): int(row[1] or 0) for row in rows}
    series = []
    for hour in range(24):
        volume = by_hour.get(hour, 0) / float(lookback_days)
        required = math.ceil((volume * avg_handle_minutes / 60.0) * 1.2)
        series.append({"hour": hour, "avg_chats_per_hour": round(volume, 2), "recommended_agents": max(1, int(required))})
    peak = max(series, key=lambda item: item["recommended_agents"]) if series else {"hour": 0, "recommended_agents": 1}
    return {
        "lookback_days": lookback_days,
        "avg_handle_minutes": round(avg_handle_minutes, 2),
        "peak_hour": peak["hour"],
        "peak_agents": peak["recommended_agents"],
        "series": series,
    }


@router.post("/custom-report")
async def custom_report_builder(
    payload: dict[str, Any],
    user: Annotated[TokenUser, Depends(current_user)],
    db: AsyncSession = Depends(get_db),
) -> dict:
    source = str(payload.get("source") or "chats").strip().lower()
    dimensions = [str(item).strip().lower() for item in (payload.get("dimensions") or []) if str(item).strip()]
    metric = str(payload.get("metric") or "count").strip().lower()
    limit = max(1, min(int(payload.get("limit") or 100), 1000))
    if source not in {"chats", "tickets", "goals"}:
        raise HTTPException(status_code=400, detail="source must be chats, tickets, or goals")

    rows: list[dict] = []
    if source == "chats":
        query_rows = (
            await db.execute(
                select(
                    Chat.channel,
                    Chat.status,
                    Chat.assigned_user_id,
                    Chat.tags,
                    Chat.created_at,
                    func.extract("epoch", Chat.resolved_at - Chat.created_at).label("resolution_seconds"),
                    func.extract("epoch", Chat.first_response_at - Chat.created_at).label("frt_seconds"),
                ).where(Chat.organization_id == user.organization_id)
            )
        ).all()
        buckets: dict[tuple, dict[str, float]] = {}
        for row in query_rows:
            points = [dict(channel=row[0], status=row[1], agent_id=str(row[2]) if row[2] else None, tags=row[3] or [], created_at=row[4], resolution_seconds=float(row[5] or 0), frt_seconds=float(row[6] or 0))]
            if "tag" in dimensions:
                expanded = []
                for point in points:
                    tag_list = point["tags"] if point["tags"] else [None]
                    for tag in tag_list:
                        next_point = dict(point)
                        next_point["tag"] = tag
                        expanded.append(next_point)
                points = expanded
            for point in points:
                key_parts = []
                for dim in dimensions:
                    if dim == "day":
                        key_parts.append(point["created_at"].date().isoformat() if point["created_at"] else None)
                    elif dim == "week":
                        key_parts.append(point["created_at"].strftime("%Y-W%W") if point["created_at"] else None)
                    elif dim == "month":
                        key_parts.append(point["created_at"].strftime("%Y-%m") if point["created_at"] else None)
                    elif dim in {"channel", "status", "agent_id", "tag"}:
                        key_parts.append(point.get(dim))
                    else:
                        key_parts.append(None)
                key = tuple(key_parts) if key_parts else ("all",)
                bucket = buckets.setdefault(key, {"count": 0.0, "resolution_sum": 0.0, "frt_sum": 0.0})
                bucket["count"] += 1
                bucket["resolution_sum"] += float(point.get("resolution_seconds") or 0)
                bucket["frt_sum"] += float(point.get("frt_seconds") or 0)
        for key, agg in buckets.items():
            row_out = {dimensions[idx] if dimensions else "group": value for idx, value in enumerate(key)}
            if not dimensions:
                row_out = {"group": "all"}
            if metric == "avg_resolution":
                row_out["value"] = (agg["resolution_sum"] / agg["count"]) if agg["count"] else 0
            elif metric == "avg_frt":
                row_out["value"] = (agg["frt_sum"] / agg["count"]) if agg["count"] else 0
            else:
                row_out["value"] = agg["count"]
            rows.append(row_out)
    elif source == "tickets":
        grouped = (
            await db.execute(
                select(Ticket.status, Ticket.priority, Ticket.team_id, func.count(Ticket.id))
                .where(Ticket.organization_id == user.organization_id)
                .group_by(Ticket.status, Ticket.priority, Ticket.team_id)
            )
        ).all()
        for status_value, priority_value, team_id, count_value in grouped:
            base = {"status": status_value, "priority": priority_value, "team_id": str(team_id) if team_id else None, "value": int(count_value or 0)}
            if dimensions:
                rows.append({dim: base.get(dim) for dim in dimensions} | {"value": base["value"]})
            else:
                rows.append({"group": "all", "value": base["value"]})
    else:
        grouped = (
            await db.execute(
                select(Goal.name, Goal.goal_type, func.count(GoalAchievement.id), func.sum(GoalAchievement.value))
                .join(GoalAchievement, GoalAchievement.goal_id == Goal.id)
                .where(GoalAchievement.organization_id == user.organization_id)
                .group_by(Goal.name, Goal.goal_type)
            )
        ).all()
        for goal_name, goal_type, count_value, sum_value in grouped:
            value = float(sum_value or 0) if metric == "sum_value" else int(count_value or 0)
            base = {"goal": goal_name, "goal_type": goal_type, "value": value}
            if dimensions:
                rows.append({dim: base.get(dim) for dim in dimensions} | {"value": value})
            else:
                rows.append({"group": "all", "value": value})
    rows = rows[:limit]
    return {"source": source, "dimensions": dimensions, "metric": metric, "rows": rows}


@router.get("/cohorts")
async def cohort_analysis(
    user: Annotated[TokenUser, Depends(current_user)],
    db: AsyncSession = Depends(get_db),
    months: int = Query(6, ge=3, le=18),
) -> dict:
    sessions = (
        await db.execute(
            select(Session.contact_id, Session.first_seen_at, Session.last_seen_at)
            .where(Session.organization_id == user.organization_id, Session.contact_id.is_not(None))
        )
    ).all()
    if not sessions:
        return {"months": months, "cohorts": []}
    first_month_by_contact: dict[str, str] = {}
    active_months_by_contact: dict[str, set[str]] = {}
    for contact_id, first_seen, last_seen in sessions:
        if not contact_id or not first_seen:
            continue
        cid = str(contact_id)
        cohort_month = first_seen.strftime("%Y-%m")
        if cid not in first_month_by_contact or cohort_month < first_month_by_contact[cid]:
            first_month_by_contact[cid] = cohort_month
        active = active_months_by_contact.setdefault(cid, set())
        active.add(first_seen.strftime("%Y-%m"))
        if last_seen:
            active.add(last_seen.strftime("%Y-%m"))
    cohorts: dict[str, list[str]] = {}
    for cid, cohort in first_month_by_contact.items():
        cohorts.setdefault(cohort, []).append(cid)
    cohort_rows = []
    for cohort_month in sorted(cohorts.keys()):
        contacts = cohorts[cohort_month]
        size = len(contacts)
        base_date = datetime.strptime(f"{cohort_month}-01", "%Y-%m-%d")
        row: dict[str, Any] = {"cohort": cohort_month, "size": size}
        for idx in range(months):
            step_date = (base_date + timedelta(days=idx * 31)).strftime("%Y-%m")
            retained = sum(1 for cid in contacts if step_date in active_months_by_contact.get(cid, set()))
            row[f"m{idx}"] = (retained / size) if size else 0
        cohort_rows.append(row)
    return {"months": months, "cohorts": cohort_rows}


@router.get("/bot-performance")
async def bot_performance_report(user: Annotated[TokenUser, Depends(current_user)], db: AsyncSession = Depends(get_db)) -> dict:
    rows = (
        await db.execute(
            select(
                ChatbotFlow.id,
                ChatbotFlow.name,
                func.count(ChatbotSession.id),
                func.sum(case((ChatbotSession.completed.is_(True), 1), else_=0)),
                func.sum(case((ChatbotSession.handed_off.is_(True), 1), else_=0)),
            )
            .outerjoin(ChatbotSession, ChatbotSession.flow_id == ChatbotFlow.id)
            .where(ChatbotFlow.organization_id == user.organization_id)
            .group_by(ChatbotFlow.id, ChatbotFlow.name)
            .order_by(func.count(ChatbotSession.id).desc())
        )
    ).all()
    items = []
    for flow_id, flow_name, total, completed, handed_off in rows:
        total_v = int(total or 0)
        completed_v = int(completed or 0)
        handed_off_v = int(handed_off or 0)
        items.append({
            "flow_id": str(flow_id),
            "flow_name": flow_name,
            "total_sessions": total_v,
            "completed": completed_v,
            "handed_off": handed_off_v,
            "completion_rate": (completed_v / total_v) if total_v else 0,
            "handoff_rate": (handed_off_v / total_v) if total_v else 0,
        })
    return {"items": items}


@router.post("/share-link")
async def create_report_share_link(
    payload: dict[str, Any],
    user: Annotated[TokenUser, Depends(current_user)],
) -> dict:
    report = str(payload.get("report") or "channels").strip().lower()
    filters = dict(payload.get("filters") or {})
    ttl_hours = max(1, min(int(payload.get("ttl_hours") or 72), 168))
    token = secrets.token_urlsafe(24)
    redis_key = ns("report_share", token)
    value = json.dumps(
        {
            "organization_id": str(user.organization_id),
            "report": report,
            "filters": filters,
            "created_by": str(user.id),
            "created_at": datetime.now(UTC).isoformat(),
        }
    )
    await get_redis().setex(redis_key, ttl_hours * 3600, value)
    settings = get_settings()
    url = f"{settings.frontend_base_url.rstrip('/')}/api/v1/public/reports/share/{token}"
    return {"token": token, "url": url, "expires_in_hours": ttl_hours}


@router.get("/report-schedules")
async def report_schedules(user: Annotated[TokenUser, Depends(current_user)], db: AsyncSession = Depends(get_db)) -> list[dict]:
    rows = (
        await db.execute(
            select(ReportSchedule)
            .where(ReportSchedule.organization_id == user.organization_id)
            .order_by(ReportSchedule.created_at.desc())
        )
    ).scalars().all()
    return [_schedule_dict(row) for row in rows]


@router.post("/report-schedules")
async def create_report_schedule(payload: dict[str, Any], user: Annotated[TokenUser, Depends(current_user)], db: AsyncSession = Depends(get_db)) -> dict:
    name = str(payload.get("name") or "").strip()
    report_type = str(payload.get("report_type") or "").strip()
    if not name or not report_type:
        raise HTTPException(status_code=400, detail="name and report_type are required")

    schedule = ReportSchedule(
        organization_id=user.organization_id,
        user_id=user.id,
        name=name,
        report_type=report_type,
        frequency=str(payload.get("frequency") or "weekly"),
        day_of_week=payload.get("day_of_week"),
        day_of_month=payload.get("day_of_month"),
        hour_utc=int(payload.get("hour_utc") or 9),
        timezone=str(payload.get("timezone") or "UTC"),
        report_format=str(payload.get("report_format") or "csv"),
        recipients=dict(payload.get("recipients") or {"emails": [user.email]}),
        filters=dict(payload.get("filters") or {}),
        is_active=bool(payload.get("is_active", True)),
        next_run_at=datetime.now(UTC) + timedelta(days=1),
    )
    db.add(schedule)
    await db.commit()
    await db.refresh(schedule)
    return _schedule_dict(schedule)


@router.patch("/report-schedules/{schedule_id}")
async def update_report_schedule(
    schedule_id: uuid.UUID,
    payload: dict[str, Any],
    user: Annotated[TokenUser, Depends(current_user)],
    db: AsyncSession = Depends(get_db),
) -> dict:
    schedule = (
        await db.execute(
            select(ReportSchedule).where(ReportSchedule.id == schedule_id, ReportSchedule.organization_id == user.organization_id)
        )
    ).scalar_one_or_none()
    if schedule is None:
        raise HTTPException(status_code=404, detail="Schedule not found")

    for key in ["name", "report_type", "frequency", "day_of_week", "day_of_month", "hour_utc", "timezone", "report_format", "is_active"]:
        if key in payload:
            setattr(schedule, key, payload[key])
    if "recipients" in payload:
        schedule.recipients = dict(payload.get("recipients") or {})
    if "filters" in payload:
        schedule.filters = dict(payload.get("filters") or {})

    await db.commit()
    await db.refresh(schedule)
    return _schedule_dict(schedule)


@router.delete("/report-schedules/{schedule_id}")
async def delete_report_schedule(schedule_id: uuid.UUID, user: Annotated[TokenUser, Depends(current_user)], db: AsyncSession = Depends(get_db)) -> dict:
    schedule = (
        await db.execute(
            select(ReportSchedule).where(ReportSchedule.id == schedule_id, ReportSchedule.organization_id == user.organization_id)
        )
    ).scalar_one_or_none()
    if schedule is None:
        raise HTTPException(status_code=404, detail="Schedule not found")
    await db.delete(schedule)
    await db.commit()
    return {"ok": True}


@router.get("/export.csv")
async def export_csv(
    user: Annotated[TokenUser, Depends(current_user)],
    db: AsyncSession = Depends(get_db),
    report: str = Query("channels"),
) -> PlainTextResponse:
    rows = await _report_rows_for_org(report, user.organization_id, db)
    if not rows:
        rows = [{"message": "No data"}]

    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=list(rows[0].keys()))
    writer.writeheader()
    writer.writerows(rows)
    body = output.getvalue()
    filename = f"analytics_{report}_{datetime.now(UTC).strftime('%Y%m%d')}.csv"
    return PlainTextResponse(
        content=body,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/export.pdf")
async def export_pdf(
    user: Annotated[TokenUser, Depends(current_user)],
    db: AsyncSession = Depends(get_db),
    report: str = Query("channels"),
) -> Response:
    rows = await _report_rows_for_org(report, user.organization_id, db)
    if not rows:
        rows = [{"message": "No data"}]
    pdf_data = _render_simple_pdf(f"FlowLyra Report: {report}", rows)
    filename = f"analytics_{report}_{datetime.now(UTC).strftime('%Y%m%d')}.pdf"
    return Response(
        content=pdf_data,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/export.xlsx")
async def export_xlsx(
    user: Annotated[TokenUser, Depends(current_user)],
    db: AsyncSession = Depends(get_db),
    report: str = Query("channels"),
) -> Response:
    rows = await _report_rows_for_org(report, user.organization_id, db)
    if not rows:
        rows = [{"message": "No data"}]
    xlsx_data = _render_simple_xlsx("Report", rows)
    filename = f"analytics_{report}_{datetime.now(UTC).strftime('%Y%m%d')}.xlsx"
    return Response(
        content=xlsx_data,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


async def _report_rows(report: str, user: TokenUser, db: AsyncSession) -> list[dict]:
    return await _report_rows_for_org(report, user.organization_id, db)


async def _report_rows_for_org(report: str, organization_id: uuid.UUID, db: AsyncSession) -> list[dict]:
    user = TokenUser(id=uuid.uuid4(), organization_id=organization_id, email="", role="admin")
    key = report.strip().lower()
    if key == "channels":
        return await channels_breakdown(user, db)
    if key in {"tags", "tag_usage"}:
        return await tags(user, db)
    if key in {"agent", "leaderboard", "agents"}:
        return await leaderboard(user, db)
    if key in {"csat", "satisfaction"}:
        return await csat(user, db)
    if key in {"chat_volume", "volume"}:
        return await chat_volume(user, db)
    if key in {"goals", "goals_achieved"}:
        payload = await goals_achieved(user, db)
        return payload.get("items", [])
    if key in {"revenue", "sales"}:
        payload = await revenue_report(user, db)
        return payload.get("series", [])
    if key in {"campaign", "campaign_conversion"}:
        payload = await campaign_conversion(user, db)
        return payload.get("items", [])
    if key in {"sla", "sla_compliance"}:
        payload = await sla_compliance(user, db)
        return [payload]
    if key in {"kb", "knowledge_base"}:
        payload = await kb_analytics_report(user, db)
        return payload.get("top_articles", [])
    if key in {"bot", "bot_performance"}:
        payload = await bot_performance_report(user, db)
        return payload.get("items", [])
    raise HTTPException(status_code=400, detail=f"Unsupported report '{report}'")


def _render_simple_pdf(title: str, rows: list[dict]) -> bytes:
    headers = list(rows[0].keys()) if rows else ["message"]
    lines = [title, "", " | ".join(headers)]
    for row in rows[:120]:
        values = [str(row.get(key, "")) for key in headers]
        lines.append(" | ".join(values))
    safe_lines = [line.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")[:180] for line in lines]
    text_stream = ["BT", "/F1 10 Tf", "40 800 Td", "14 TL"]
    for line in safe_lines:
        text_stream.append(f"({line}) Tj")
        text_stream.append("T*")
    text_stream.append("ET")
    content = "\n".join(text_stream).encode("latin-1", errors="replace")

    objects: list[bytes] = []
    objects.append(b"<< /Type /Catalog /Pages 2 0 R >>")
    objects.append(b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>")
    objects.append(b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>")
    objects.append(b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>")
    objects.append(f"<< /Length {len(content)} >>\nstream\n".encode("latin-1") + content + b"\nendstream")

    pdf = io.BytesIO()
    pdf.write(b"%PDF-1.4\n")
    offsets = [0]
    for index, obj in enumerate(objects, start=1):
        offsets.append(pdf.tell())
        pdf.write(f"{index} 0 obj\n".encode("latin-1"))
        pdf.write(obj)
        pdf.write(b"\nendobj\n")
    xref_pos = pdf.tell()
    pdf.write(f"xref\n0 {len(offsets)}\n".encode("latin-1"))
    pdf.write(b"0000000000 65535 f \n")
    for offset in offsets[1:]:
        pdf.write(f"{offset:010d} 00000 n \n".encode("latin-1"))
    pdf.write(
        f"trailer\n<< /Size {len(offsets)} /Root 1 0 R >>\nstartxref\n{xref_pos}\n%%EOF".encode("latin-1")
    )
    return pdf.getvalue()


def _render_simple_xlsx(sheet_name: str, rows: list[dict]) -> bytes:
    headers = list(rows[0].keys()) if rows else ["message"]

    def col_name(index: int) -> str:
        name = ""
        value = index + 1
        while value:
            value, rem = divmod(value - 1, 26)
            name = chr(65 + rem) + name
        return name

    sheet_rows: list[str] = []
    all_rows = [dict(zip(headers, headers, strict=False))]
    all_rows.extend(rows)
    for r_index, row in enumerate(all_rows, start=1):
        cells: list[str] = []
        for c_index, key in enumerate(headers):
            cell_ref = f"{col_name(c_index)}{r_index}"
            value = row.get(key, "")
            if isinstance(value, (int, float)) and not isinstance(value, bool):
                cells.append(f'<c r="{cell_ref}"><v>{value}</v></c>')
            else:
                cells.append(f'<c r="{cell_ref}" t="inlineStr"><is><t>{escape(str(value))}</t></is></c>')
        sheet_rows.append(f'<row r="{r_index}">{"".join(cells)}</row>')

    sheet_xml = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
        f'<sheetData>{"".join(sheet_rows)}</sheetData>'
        "</worksheet>"
    )
    workbook_xml = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" '
        'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
        f'<sheets><sheet name="{escape(sheet_name)}" sheetId="1" r:id="rId1"/></sheets>'
        "</workbook>"
    )
    workbook_rels = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" '
        'Target="worksheets/sheet1.xml"/>'
        "</Relationships>"
    )
    root_rels = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" '
        'Target="xl/workbook.xml"/>'
        "</Relationships>"
    )
    content_types = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
        '<Default Extension="xml" ContentType="application/xml"/>'
        '<Override PartName="/xl/workbook.xml" '
        'ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
        '<Override PartName="/xl/worksheets/sheet1.xml" '
        'ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'
        "</Types>"
    )

    output = io.BytesIO()
    with zipfile.ZipFile(output, mode="w", compression=zipfile.ZIP_DEFLATED) as archive:
        archive.writestr("[Content_Types].xml", content_types)
        archive.writestr("_rels/.rels", root_rels)
        archive.writestr("xl/workbook.xml", workbook_xml)
        archive.writestr("xl/_rels/workbook.xml.rels", workbook_rels)
        archive.writestr("xl/worksheets/sheet1.xml", sheet_xml)
    return output.getvalue()


def _schedule_dict(item: ReportSchedule) -> dict:
    return {
        "id": str(item.id),
        "organization_id": str(item.organization_id),
        "user_id": str(item.user_id) if item.user_id else None,
        "name": item.name,
        "report_type": item.report_type,
        "frequency": item.frequency,
        "day_of_week": item.day_of_week,
        "day_of_month": item.day_of_month,
        "hour_utc": item.hour_utc,
        "timezone": item.timezone,
        "report_format": item.report_format,
        "recipients": item.recipients or {"emails": []},
        "filters": item.filters or {},
        "is_active": item.is_active,
        "last_sent_at": item.last_sent_at.isoformat() if item.last_sent_at else None,
        "next_run_at": item.next_run_at.isoformat() if item.next_run_at else None,
        "created_at": item.created_at.isoformat() if item.created_at else None,
        "updated_at": item.updated_at.isoformat() if item.updated_at else None,
    }
