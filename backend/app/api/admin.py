from typing import Annotated, Any
from datetime import datetime
import uuid
import re

from celery.exceptions import TimeoutError as CeleryTimeoutError
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import delete, func, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.middleware.auth import TokenUser, require_role
from app.models.chat import Chat
from app.models.canned_response import CannedResponse
from app.models.chat_widget import ChatWidget
from app.models.organization import Organization
from app.models.proactive_trigger import ProactiveTrigger
from app.models.routing_rule import RoutingRule
from app.models.team import Team, team_members
from app.models.user import User
from app.schemas.admin import (
    CannedCreate,
    ChatWidgetCreate,
    ChatWidgetUpdate,
    MemberRequest,
    OrgUpdate,
    RuleCreate,
    TeamCreate,
    TriggerCreate,
)
from app.workers.system_tasks import ping

router = APIRouter(prefix="/admin", tags=["admin"])
AdminUser = Annotated[TokenUser, Depends(require_role("admin", "supervisor"))]


@router.get("/org")
async def org(user: AdminUser, db: AsyncSession = Depends(get_db)) -> Any:
    return model_dict((await db.execute(select(Organization).where(Organization.id == user.organization_id))).scalar_one())


@router.patch("/org")
async def update_org(payload: OrgUpdate, user: AdminUser, db: AsyncSession = Depends(get_db)) -> Any:
    org_obj = (await db.execute(select(Organization).where(Organization.id == user.organization_id))).scalar_one()
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(org_obj, key, value)
    await db.commit()
    await db.refresh(org_obj)
    return model_dict(org_obj)


@router.get("/widgets")
async def list_widgets(user: AdminUser, db: AsyncSession = Depends(get_db)) -> list[Any]:
    rows = (
        await db.execute(
            select(ChatWidget).where(ChatWidget.organization_id == user.organization_id).order_by(ChatWidget.created_at.desc())
        )
    ).scalars().all()
    return [model_dict(row) for row in rows]


@router.post("/widgets")
async def create_widget(payload: ChatWidgetCreate, user: AdminUser, db: AsyncSession = Depends(get_db)) -> Any:
    existing = (
        await db.execute(select(ChatWidget).where(ChatWidget.slug == payload.slug))
    ).scalar_one_or_none()
    if existing is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Widget slug already exists")
    if payload.is_default:
        await db.execute(
            ChatWidget.__table__.update().where(ChatWidget.organization_id == user.organization_id).values(is_default=False)
        )
    widget = ChatWidget(organization_id=user.organization_id, **payload.model_dump())
    db.add(widget)
    await db.commit()
    await db.refresh(widget)
    return model_dict(widget)


@router.patch("/widgets/{widget_id}")
async def update_widget(widget_id: uuid.UUID, payload: ChatWidgetUpdate, user: AdminUser, db: AsyncSession = Depends(get_db)) -> Any:
    widget = (
        await db.execute(select(ChatWidget).where(ChatWidget.id == widget_id, ChatWidget.organization_id == user.organization_id))
    ).scalar_one_or_none()
    if widget is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Widget not found")
    changes = payload.model_dump(exclude_unset=True)
    if changes.get("is_default") is True:
        await db.execute(
            ChatWidget.__table__.update().where(ChatWidget.organization_id == user.organization_id).values(is_default=False)
        )
    for key, value in changes.items():
        setattr(widget, key, value)
    await db.commit()
    await db.refresh(widget)
    return model_dict(widget)


@router.delete("/widgets/{widget_id}")
async def delete_widget(widget_id: uuid.UUID, user: AdminUser, db: AsyncSession = Depends(get_db)) -> dict:
    widget = (
        await db.execute(select(ChatWidget).where(ChatWidget.id == widget_id, ChatWidget.organization_id == user.organization_id))
    ).scalar_one_or_none()
    if widget is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Widget not found")
    await db.delete(widget)
    await db.commit()
    return {"ok": True}


@router.get("/teams")
async def teams(user: AdminUser, db: AsyncSession = Depends(get_db)) -> list[Any]:
    return [model_dict(team) for team in (await db.execute(select(Team).where(Team.organization_id == user.organization_id).order_by(Team.name))).scalars().all()]


@router.post("/teams")
async def create_team(payload: TeamCreate, user: AdminUser, db: AsyncSession = Depends(get_db)) -> Any:
    team = Team(organization_id=user.organization_id, **payload.model_dump())
    db.add(team)
    await db.commit()
    await db.refresh(team)
    return model_dict(team)


@router.patch("/teams/{team_id}")
async def update_team(team_id: uuid.UUID, payload: TeamCreate, user: AdminUser, db: AsyncSession = Depends(get_db)) -> Any:
    team = (await db.execute(select(Team).where(Team.id == team_id, Team.organization_id == user.organization_id))).scalar_one()
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(team, key, value)
    await db.commit()
    await db.refresh(team)
    return model_dict(team)


@router.delete("/teams/{team_id}")
async def delete_team(team_id: uuid.UUID, user: AdminUser, db: AsyncSession = Depends(get_db)) -> dict:
    await db.execute(delete(Team).where(Team.id == team_id, Team.organization_id == user.organization_id))
    await db.commit()
    return {"ok": True}


@router.post("/teams/{team_id}/members")
async def add_member(team_id: uuid.UUID, payload: MemberRequest, user: AdminUser, db: AsyncSession = Depends(get_db)) -> dict:
    team = (await db.execute(select(Team).where(Team.id == team_id, Team.organization_id == user.organization_id))).scalar_one_or_none()
    if team is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team not found")
    member = (await db.execute(select(User).where(User.id == payload.user_id, User.organization_id == user.organization_id))).scalar_one_or_none()
    if member is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Agent not found")
    statement = insert(team_members).values(team_id=team_id, user_id=payload.user_id).on_conflict_do_nothing()
    await db.execute(statement)
    await db.commit()
    return {"ok": True}


@router.delete("/teams/{team_id}/members/{uid}")
async def remove_member(team_id: uuid.UUID, uid: uuid.UUID, user: AdminUser, db: AsyncSession = Depends(get_db)) -> dict:
    team = (await db.execute(select(Team).where(Team.id == team_id, Team.organization_id == user.organization_id))).scalar_one_or_none()
    if team is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team not found")
    await db.execute(team_members.delete().where(team_members.c.team_id == team_id, team_members.c.user_id == uid))
    await db.commit()
    return {"ok": True}


async def _crud_list(db: AsyncSession, model: type, org_id: uuid.UUID) -> list[Any]:
    return [model_dict(item) for item in (await db.execute(select(model).where(model.organization_id == org_id).order_by(model.created_at.desc()))).scalars().all()]


@router.get("/canned-responses")
async def canned(user: AdminUser, db: AsyncSession = Depends(get_db)) -> list[Any]:
    return await _crud_list(db, CannedResponse, user.organization_id)


@router.post("/canned-responses")
async def create_canned(payload: CannedCreate, user: AdminUser, db: AsyncSession = Depends(get_db)) -> Any:
    item = CannedResponse(organization_id=user.organization_id, user_id=user.id, **payload.model_dump())
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return model_dict(item)


@router.patch("/canned-responses/{item_id}")
async def update_canned(item_id: uuid.UUID, payload: CannedCreate, user: AdminUser, db: AsyncSession = Depends(get_db)) -> Any:
    item = (await db.execute(select(CannedResponse).where(CannedResponse.id == item_id, CannedResponse.organization_id == user.organization_id))).scalar_one()
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(item, key, value)
    await db.commit()
    await db.refresh(item)
    return model_dict(item)


@router.delete("/canned-responses/{item_id}")
async def delete_canned(item_id: uuid.UUID, user: AdminUser, db: AsyncSession = Depends(get_db)) -> dict:
    await db.execute(delete(CannedResponse).where(CannedResponse.id == item_id, CannedResponse.organization_id == user.organization_id))
    await db.commit()
    return {"ok": True}


@router.post("/canned-responses/{item_id}/use")
async def use_canned(item_id: uuid.UUID, user: AdminUser, db: AsyncSession = Depends(get_db)) -> dict:
    item = (
        await db.execute(
            select(CannedResponse).where(
                CannedResponse.id == item_id,
                CannedResponse.organization_id == user.organization_id,
            )
        )
    ).scalar_one_or_none()
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Canned response not found")
    item.use_count = int(item.use_count or 0) + 1
    await db.commit()
    return {"ok": True, "use_count": item.use_count}


@router.get("/canned-responses/stats")
async def canned_stats(user: AdminUser, db: AsyncSession = Depends(get_db)) -> list[dict]:
    rows = (
        await db.execute(
            select(CannedResponse)
            .where(CannedResponse.organization_id == user.organization_id)
            .order_by(CannedResponse.use_count.desc(), CannedResponse.created_at.desc())
            .limit(50)
        )
    ).scalars().all()
    return [
        {
            "id": str(row.id),
            "shortcut": row.shortcut,
            "title": row.title,
            "use_count": int(row.use_count or 0),
        }
        for row in rows
    ]


def _slugify_tag(value: str) -> str:
    text = re.sub(r"[^a-zA-Z0-9_-]+", "-", value.strip().lower()).strip("-")
    return text[:64] or "tag"


@router.get("/tags")
async def list_tags(user: AdminUser, db: AsyncSession = Depends(get_db)) -> list[dict]:
    org = (
        await db.execute(select(Organization).where(Organization.id == user.organization_id))
    ).scalar_one()
    defined = list(((org.feature_flags or {}).get("chat_tags") or []))
    usage_rows = (
        await db.execute(
            select(func.unnest(Chat.tags).label("tag"), func.count())
            .where(Chat.organization_id == user.organization_id)
            .group_by("tag")
        )
    ).all()
    usage = {str(row[0]): int(row[1]) for row in usage_rows}
    defined_by_key = {str(item.get("key") or ""): item for item in defined if isinstance(item, dict)}
    for tag_name, count in usage.items():
        key = _slugify_tag(tag_name)
        if key not in defined_by_key:
            defined.append({"key": key, "label": tag_name, "color": "#64748b"})
            defined_by_key[key] = defined[-1]
        defined_by_key[key]["usage_count"] = count
    for item in defined:
        item.setdefault("usage_count", 0)
    return defined


@router.post("/tags")
async def create_or_update_tag(payload: dict, user: AdminUser, db: AsyncSession = Depends(get_db)) -> dict:
    label = str(payload.get("label") or "").strip()
    if not label:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Tag label is required")
    color = str(payload.get("color") or "#64748b")
    key = _slugify_tag(str(payload.get("key") or label))
    org = (
        await db.execute(select(Organization).where(Organization.id == user.organization_id))
    ).scalar_one()
    tags = list(((org.feature_flags or {}).get("chat_tags") or []))
    updated = False
    for tag in tags:
        if isinstance(tag, dict) and str(tag.get("key")) == key:
            tag["label"] = label
            tag["color"] = color
            updated = True
            break
    if not updated:
        tags.append({"key": key, "label": label, "color": color})
    flags = dict(org.feature_flags or {})
    flags["chat_tags"] = tags
    org.feature_flags = flags
    await db.commit()
    return {"ok": True, "tag": {"key": key, "label": label, "color": color}}


@router.delete("/tags/{tag_key}")
async def delete_tag(tag_key: str, user: AdminUser, db: AsyncSession = Depends(get_db)) -> dict:
    org = (
        await db.execute(select(Organization).where(Organization.id == user.organization_id))
    ).scalar_one()
    key = _slugify_tag(tag_key)
    tags = list(((org.feature_flags or {}).get("chat_tags") or []))
    tags = [item for item in tags if not (isinstance(item, dict) and str(item.get("key")) == key)]
    flags = dict(org.feature_flags or {})
    flags["chat_tags"] = tags
    org.feature_flags = flags
    await db.commit()
    return {"ok": True}


def register_rule_routes(path: str, model: type, schema: type):
    @router.get(path)
    async def list_items(user: AdminUser, db: AsyncSession = Depends(get_db)) -> list[Any]:
        return (await db.execute(select(model).where(model.organization_id == user.organization_id).order_by(model.priority.desc() if hasattr(model, "priority") else model.created_at.desc()))).scalars().all()

    @router.post(path)
    async def create_item(payload: schema, user: AdminUser, db: AsyncSession = Depends(get_db)):  # type: ignore[valid-type]
        item = model(organization_id=user.organization_id, **payload.model_dump())
        db.add(item)
        await db.commit()
        await db.refresh(item)
        return item


@router.get("/routing-rules")
async def routing_rules(user: AdminUser, db: AsyncSession = Depends(get_db)) -> list[Any]:
    return [model_dict(item) for item in (await db.execute(select(RoutingRule).where(RoutingRule.organization_id == user.organization_id).order_by(RoutingRule.priority.desc()))).scalars().all()]


@router.post("/routing-rules")
async def create_rule(payload: RuleCreate, user: AdminUser, db: AsyncSession = Depends(get_db)) -> Any:
    item = RoutingRule(organization_id=user.organization_id, **payload.model_dump())
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return model_dict(item)


@router.patch("/routing-rules/{item_id}")
async def update_rule(item_id: uuid.UUID, payload: RuleCreate, user: AdminUser, db: AsyncSession = Depends(get_db)) -> Any:
    item = (await db.execute(select(RoutingRule).where(RoutingRule.id == item_id, RoutingRule.organization_id == user.organization_id))).scalar_one()
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(item, key, value)
    await db.commit()
    await db.refresh(item)
    return model_dict(item)


@router.delete("/routing-rules/{item_id}")
async def delete_rule(item_id: uuid.UUID, user: AdminUser, db: AsyncSession = Depends(get_db)) -> dict:
    await db.execute(delete(RoutingRule).where(RoutingRule.id == item_id, RoutingRule.organization_id == user.organization_id))
    await db.commit()
    return {"ok": True}


@router.get("/proactive-triggers")
async def triggers(user: AdminUser, db: AsyncSession = Depends(get_db)) -> list[Any]:
    return await _crud_list(db, ProactiveTrigger, user.organization_id)


@router.post("/proactive-triggers")
async def create_trigger(payload: TriggerCreate, user: AdminUser, db: AsyncSession = Depends(get_db)) -> Any:
    item = ProactiveTrigger(organization_id=user.organization_id, **payload.model_dump())
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return model_dict(item)


@router.patch("/proactive-triggers/{item_id}")
async def update_trigger(item_id: uuid.UUID, payload: TriggerCreate, user: AdminUser, db: AsyncSession = Depends(get_db)) -> Any:
    item = (await db.execute(select(ProactiveTrigger).where(ProactiveTrigger.id == item_id, ProactiveTrigger.organization_id == user.organization_id))).scalar_one()
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(item, key, value)
    await db.commit()
    await db.refresh(item)
    return model_dict(item)


@router.delete("/proactive-triggers/{item_id}")
async def delete_trigger(item_id: uuid.UUID, user: AdminUser, db: AsyncSession = Depends(get_db)) -> dict:
    await db.execute(delete(ProactiveTrigger).where(ProactiveTrigger.id == item_id, ProactiveTrigger.organization_id == user.organization_id))
    await db.commit()
    return {"ok": True}


@router.post("/tasks/ping")
async def ping_worker(user: AdminUser, payload: dict[str, str] | None = None) -> dict[str, Any]:
    echo = (payload or {}).get("echo", "ping")
    result = ping.delay(echo)
    try:
        task_result = result.get(timeout=10)
    except CeleryTimeoutError as exc:
        raise HTTPException(status_code=status.HTTP_504_GATEWAY_TIMEOUT, detail="Celery task timed out") from exc
    return {"task_id": result.id, "result": task_result}


def model_dict(model: Any) -> dict[str, Any]:
    data: dict[str, Any] = {}
    for column in model.__table__.columns:
        value = getattr(model, column.name)
        if isinstance(value, uuid.UUID):
            data[column.name] = str(value)
        elif isinstance(value, datetime):
            data[column.name] = value.isoformat()
        else:
            data[column.name] = value
    return data
