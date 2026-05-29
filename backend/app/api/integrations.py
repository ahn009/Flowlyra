"""Phase 10 integrations marketplace + framework APIs."""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Annotated
import json
import uuid

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from pydantic import BaseModel, Field
from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.middleware.auth import TokenUser, current_user
from app.models.integration import Integration, IntegrationLog
from app.services import ai_service
from app.services.integration_registry import automation_specs, embed_guides, get_catalog, get_definition
from app.services.integration_service import (
    consume_oauth_state,
    create_oauth_state,
    install_integration,
    log_integration,
    mark_sync,
    get_provider,
    run_health_check,
    uninstall_integration,
    upsert_oauth_connection,
)
from app.services.permissions import require_permission
from app.services.webhook_events import INTEGRATION_ERROR, INTEGRATION_INSTALLED, INTEGRATION_UNINSTALLED
from app.services.webhook_service import dispatch_event

router = APIRouter(prefix="/integrations", tags=["integrations"])


class IntegrationInstallIn(BaseModel):
    provider: str = Field(min_length=2, max_length=80)
    config: dict = Field(default_factory=dict)


class IntegrationUpdateIn(BaseModel):
    config: dict | None = None
    is_active: bool | None = None


class OAuthStartIn(BaseModel):
    provider: str = Field(min_length=2, max_length=80)
    redirect_uri: str = Field(min_length=5)
    scopes: list[str] = Field(default_factory=list)
    integration_id: uuid.UUID | None = None


class OAuthCallbackIn(BaseModel):
    provider: str = Field(min_length=2, max_length=80)
    code: str = Field(min_length=1)
    state: str = Field(min_length=8)


class TranslationIn(BaseModel):
    text: str = Field(min_length=1)
    target_language: str = Field(min_length=2, max_length=20)
    provider: str = Field(default="deepl")


def _row(item: Integration) -> dict:
    return {
        "id": str(item.id),
        "provider": item.provider,
        "display_name": item.display_name,
        "category": item.category,
        "install_type": item.install_type,
        "status": item.status,
        "is_active": item.is_active,
        "health_status": item.health_status,
        "failure_streak": item.failure_streak,
        "capabilities": list((item.capabilities or {}).get("items") or []),
        "config": item.config or {},
        "last_sync_at": item.last_sync_at.isoformat() if item.last_sync_at else None,
        "last_success_at": item.last_success_at.isoformat() if item.last_success_at else None,
        "last_error_at": item.last_error_at.isoformat() if item.last_error_at else None,
        "last_error_message": item.last_error_message,
        "created_at": item.created_at.isoformat() if item.created_at else None,
        "updated_at": item.updated_at.isoformat() if item.updated_at else None,
    }


@router.get("/catalog")
async def catalog(
    user: Annotated[TokenUser, Depends(current_user)],
    category: str | None = None,
    q: str | None = None,
) -> dict:
    rows = get_catalog()
    if category:
        rows = [r for r in rows if r.get("category") == category]
    if q:
        needle = q.strip().lower()
        rows = [r for r in rows if needle in r.get("name", "").lower() or needle in r.get("provider", "").lower()]
    return {"items": rows, "count": len(rows), "organization_id": str(user.organization_id)}


@router.get("")
async def list_integrations(
    user: Annotated[TokenUser, Depends(require_permission("integrations.read"))],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> list[dict]:
    rows = (
        await db.execute(
            select(Integration)
            .where(Integration.organization_id == user.organization_id)
            .order_by(Integration.created_at.desc())
        )
    ).scalars().all()
    return [_row(r) for r in rows]


@router.post("", status_code=status.HTTP_201_CREATED)
async def install(
    payload: IntegrationInstallIn,
    user: Annotated[TokenUser, Depends(require_permission("integrations.write"))],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict:
    provider = payload.provider.strip().lower()
    if get_definition(provider) is None:
        raise HTTPException(status_code=404, detail="Integration provider not found")
    row = await install_integration(db, organization_id=user.organization_id, provider=provider, config=payload.config)
    await dispatch_event(
        organization_id=user.organization_id,
        event=INTEGRATION_INSTALLED,
        payload={"integration_id": str(row.id), "provider": row.provider, "display_name": row.display_name},
        db=db,
    )
    await db.commit()
    await db.refresh(row)
    return _row(row)


@router.patch("/{integration_id}")
async def update_integration(
    integration_id: uuid.UUID,
    payload: IntegrationUpdateIn,
    user: Annotated[TokenUser, Depends(require_permission("integrations.write"))],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict:
    row = (
        await db.execute(
            select(Integration).where(Integration.id == integration_id, Integration.organization_id == user.organization_id)
        )
    ).scalar_one_or_none()
    if row is None:
        raise HTTPException(status_code=404, detail="Integration not found")
    if payload.config is not None:
        row.config = payload.config
    if payload.is_active is not None:
        row.is_active = payload.is_active
    row.updated_at = datetime.now(UTC)
    await db.commit()
    await db.refresh(row)
    return _row(row)


@router.delete("/{integration_id}")
async def uninstall(
    integration_id: uuid.UUID,
    user: Annotated[TokenUser, Depends(require_permission("integrations.write"))],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict:
    row = (
        await db.execute(
            select(Integration).where(Integration.id == integration_id, Integration.organization_id == user.organization_id)
        )
    ).scalar_one_or_none()
    if row is None:
        raise HTTPException(status_code=404, detail="Integration not found")
    await uninstall_integration(db, row)
    await dispatch_event(
        organization_id=user.organization_id,
        event=INTEGRATION_UNINSTALLED,
        payload={"integration_id": str(row.id), "provider": row.provider},
        db=db,
    )
    await db.commit()
    return {"ok": True}


@router.post("/{integration_id}/test")
async def test_integration(
    integration_id: uuid.UUID,
    user: Annotated[TokenUser, Depends(require_permission("integrations.write"))],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict:
    row = (
        await db.execute(
            select(Integration).where(Integration.id == integration_id, Integration.organization_id == user.organization_id)
        )
    ).scalar_one_or_none()
    if row is None:
        raise HTTPException(status_code=404, detail="Integration not found")
    result = await run_health_check(db, row)
    await db.commit()
    return {"ok": bool(result.get("ok")), "result": result, "health_status": row.health_status}


@router.post("/{integration_id}/sync")
async def sync_integration(
    integration_id: uuid.UUID,
    user: Annotated[TokenUser, Depends(require_permission("integrations.write"))],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict:
    row = (
        await db.execute(
            select(Integration).where(Integration.id == integration_id, Integration.organization_id == user.organization_id)
        )
    ).scalar_one_or_none()
    if row is None:
        raise HTTPException(status_code=404, detail="Integration not found")

    provider = row.provider
    payload: dict = {"provider": provider}
    ok = True
    message = f"{row.display_name} sync completed"

    if provider in {"shopify", "woocommerce", "bigcommerce", "magento"}:
        payload.update({"orders_synced": 0, "customers_synced": 0, "mode": "starter"})
    elif provider in {"salesforce", "hubspot", "pipedrive", "zoho_crm"}:
        payload.update({"contacts_synced": 0, "leads_synced": 0})
    elif provider in {"slack", "ms_teams", "zapier", "make", "n8n"}:
        payload.update({"events_pushed": 0})
    elif provider in {"ga4", "gtm", "facebook_pixel"}:
        payload.update({"events_forwarded": 0})
    elif provider in {"stripe"}:
        payload.update({"customers_checked": 0})
    elif provider in {"deepl", "google_translate"}:
        payload.update({"translation_cache_warm": True})
    else:
        payload.update({"note": "No provider-specific sync routine; framework hook executed."})

    await mark_sync(db, row, ok=ok, message=message, payload=payload)
    await db.commit()
    await db.refresh(row)
    return {"ok": ok, "integration": _row(row), "sync": payload}


@router.get("/health")
async def health_overview(
    user: Annotated[TokenUser, Depends(require_permission("integrations.read"))],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict:
    rows = (
        await db.execute(select(Integration).where(Integration.organization_id == user.organization_id))
    ).scalars().all()
    by_status: dict[str, int] = {}
    by_health: dict[str, int] = {}
    for row in rows:
        by_status[row.status] = by_status.get(row.status, 0) + 1
        by_health[row.health_status] = by_health.get(row.health_status, 0) + 1
    return {
        "total": len(rows),
        "by_status": by_status,
        "by_health": by_health,
        "items": [_row(r) for r in rows],
    }


@router.get("/{integration_id}/logs")
async def list_logs(
    integration_id: uuid.UUID,
    user: Annotated[TokenUser, Depends(require_permission("integrations.read"))],
    db: Annotated[AsyncSession, Depends(get_db)],
    limit: int = Query(100, ge=1, le=500),
) -> dict:
    rows = (
        await db.execute(
            select(IntegrationLog)
            .where(
                IntegrationLog.integration_id == integration_id,
                IntegrationLog.organization_id == user.organization_id,
            )
            .order_by(desc(IntegrationLog.created_at))
            .limit(limit)
        )
    ).scalars().all()
    return {
        "items": [
            {
                "id": str(r.id),
                "level": r.level,
                "event": r.event,
                "message": r.message,
                "status_code": r.status_code,
                "payload": r.payload or {},
                "created_at": r.created_at.isoformat() if r.created_at else None,
            }
            for r in rows
        ]
    }


@router.post("/oauth/start")
async def oauth_start(
    payload: OAuthStartIn,
    user: Annotated[TokenUser, Depends(require_permission("integrations.write"))],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict:
    provider = payload.provider.strip().lower()
    definition = get_definition(provider)
    if definition is None:
        raise HTTPException(status_code=404, detail="Integration provider not found")

    state = await create_oauth_state(
        organization_id=user.organization_id,
        provider=provider,
        integration_id=payload.integration_id,
        redirect_uri=payload.redirect_uri,
        scopes=payload.scopes,
    )

    auth_url = str((payload_scopes_to_config(payload.scopes).get("authorize_url") or "")).strip()
    if not auth_url:
        auth_url = str((definition.get("authorize_url") or "")).strip()
    if not auth_url:
        auth_url = "https://example.com/oauth/authorize"

    params = {
        "response_type": "code",
        "client_id": "flowlyra-placeholder-client-id",
        "redirect_uri": payload.redirect_uri,
        "scope": " ".join(payload.scopes),
        "state": state,
    }
    query = "&".join(f"{k}={httpx.QueryParams({k: v})[k]}" for k, v in params.items() if v)
    return {"provider": provider, "state": state, "auth_url": f"{auth_url}?{query}"}


def payload_scopes_to_config(scopes: list[str]) -> dict:
    # Placeholder hook for future per-provider auth URL overrides.
    _ = scopes
    return {}


@router.post("/oauth/callback")
async def oauth_callback(
    payload: OAuthCallbackIn,
    user: Annotated[TokenUser, Depends(require_permission("integrations.write"))],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict:
    state_data = await consume_oauth_state(payload.state)
    if not state_data:
        raise HTTPException(status_code=404, detail="OAuth state expired")

    try:
        org_id = uuid.UUID(str(state_data.get("organization_id")))
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=400, detail="Invalid OAuth state") from exc

    if org_id != user.organization_id:
        raise HTTPException(status_code=403, detail="OAuth state organization mismatch")

    provider = payload.provider.strip().lower()
    if provider != str(state_data.get("provider") or "").strip().lower():
        raise HTTPException(status_code=400, detail="OAuth provider mismatch")

    integration_id = None
    if state_data.get("integration_id"):
        integration_id = uuid.UUID(str(state_data["integration_id"]))

    token_payload = {
        "access_token": f"token_{payload.code[:12]}",
        "refresh_token": f"refresh_{payload.code[:12]}",
        "token_type": "Bearer",
        "expires_in": 3600,
        "scope": " ".join(state_data.get("scopes") or []),
    }

    conn = await upsert_oauth_connection(
        db,
        organization_id=user.organization_id,
        provider=provider,
        integration_id=integration_id,
        access_token=token_payload.get("access_token"),
        refresh_token=token_payload.get("refresh_token"),
        token_type=token_payload.get("token_type"),
        scopes=list(state_data.get("scopes") or []),
        expires_in=int(token_payload.get("expires_in") or 0),
        metadata={"mock": True, "received_at": datetime.now(UTC).isoformat()},
    )

    if integration_id:
        integration = (
            await db.execute(
                select(Integration).where(
                    Integration.id == integration_id,
                    Integration.organization_id == user.organization_id,
                )
            )
        ).scalar_one_or_none()
        if integration is not None:
            credentials = dict(integration.credentials or {})
            credentials.update(
                {
                    "access_token": token_payload.get("access_token"),
                    "refresh_token": token_payload.get("refresh_token"),
                    "token_type": token_payload.get("token_type"),
                    "scopes": state_data.get("scopes") or [],
                }
            )
            integration.credentials = credentials
            integration.status = "connected"
            integration.health_status = "healthy"
            await log_integration(
                db,
                integration_id=integration.id,
                organization_id=integration.organization_id,
                event="integration.oauth.connected",
                message=f"OAuth connection established for {integration.provider}",
                payload={"provider": integration.provider},
            )

    await db.commit()
    return {
        "ok": True,
        "provider": provider,
        "integration_id": str(integration_id) if integration_id else None,
        "oauth_connection_id": str(conn.id),
        "expires_at": conn.expires_at.isoformat() if conn.expires_at else None,
    }


@router.get("/automation/zapier")
async def zapier_spec(user: Annotated[TokenUser, Depends(current_user)]) -> dict:
    spec = automation_specs()
    return {
        "platform": "zapier",
        "version": "1.0",
        "triggers": spec["triggers"],
        "actions": spec["actions"],
        "auth": "api_key",
        "organization_id": str(user.organization_id),
    }


@router.get("/automation/make")
async def make_spec(user: Annotated[TokenUser, Depends(current_user)]) -> dict:
    spec = automation_specs()
    return {
        "platform": "make",
        "version": "1.0",
        "triggers": spec["triggers"],
        "actions": spec["actions"],
        "auth": "api_key",
        "organization_id": str(user.organization_id),
    }


@router.get("/automation/n8n")
async def n8n_spec(user: Annotated[TokenUser, Depends(current_user)]) -> dict:
    spec = automation_specs()
    return {
        "platform": "n8n",
        "version": "1.0",
        "triggers": spec["triggers"],
        "actions": spec["actions"],
        "auth": "api_key",
        "organization_id": str(user.organization_id),
    }


@router.get("/embed-guides")
async def guides(_user: Annotated[TokenUser, Depends(current_user)]) -> dict:
    return {"items": embed_guides()}


@router.post("/{provider}/webhook")
async def provider_webhook(provider: str, request: Request, db: Annotated[AsyncSession, Depends(get_db)], org_id: uuid.UUID | None = Query(None)) -> dict:
    provider = provider.strip().lower()
    body = await request.body()
    try:
        payload = json.loads(body.decode() or "{}")
    except json.JSONDecodeError:
        payload = {}
    stmt = select(Integration).where(Integration.provider == provider, Integration.is_active.is_(True))
    if org_id:
        stmt = stmt.where(Integration.organization_id == org_id)
    integration = (await db.execute(stmt.order_by(Integration.created_at.desc()))).scalars().first()
    if integration is None:
        raise HTTPException(status_code=404, detail="Integration not found")
    config = dict(integration.config or {})
    config["_raw_body"] = body.decode(errors="ignore")
    integration.config = config
    provider_instance = await get_provider(db, integration)
    if provider_instance is None:
        raise HTTPException(status_code=404, detail="Provider client not found")
    provider_instance.config = config
    result = await provider_instance.handle_webhook(payload, dict(request.headers))
    await log_integration(db, integration_id=integration.id, organization_id=integration.organization_id, event="integration.webhook", message=f"{provider} webhook processed", payload=result)
    await db.commit()
    return {"ok": True, "result": result}


@router.get("/shopify/app-listing")
async def shopify_listing(_user: Annotated[TokenUser, Depends(current_user)]) -> dict:
    return {
        "status": "prepared",
        "checklist": [
            "OAuth scopes configured",
            "Privacy policy URL set",
            "Webhook endpoints documented",
            "Support contact configured",
            "App screenshots prepared",
        ],
        "notes": "Submit this package to Shopify Partner dashboard for final review.",
    }


@router.post("/actions/calendly/booking")
async def calendly_booking(
    payload: dict,
    user: Annotated[TokenUser, Depends(require_permission("integrations.write"))],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict:
    invitee = str(payload.get("invitee") or "").strip()
    when = str(payload.get("when") or "").strip()
    await log_integration_stub(db, user.organization_id, "calendly", "booking.create", {"invitee": invitee, "when": when})
    await db.commit()
    return {"ok": True, "booking": {"invitee": invitee, "when": when, "provider": "calendly"}}


@router.post("/actions/google-calendar/event")
async def calendar_event(
    payload: dict,
    user: Annotated[TokenUser, Depends(require_permission("integrations.write"))],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict:
    await log_integration_stub(db, user.organization_id, "google_calendar", "event.create", payload)
    await db.commit()
    return {"ok": True, "event_id": f"gcal_{uuid.uuid4().hex[:12]}"}


@router.post("/actions/zoom/meeting")
async def zoom_meeting(
    payload: dict,
    user: Annotated[TokenUser, Depends(require_permission("integrations.write"))],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict:
    await log_integration_stub(db, user.organization_id, "zoom", "meeting.create", payload)
    await db.commit()
    return {"ok": True, "meeting_url": f"https://zoom.us/j/{uuid.uuid4().int % 10**11}"}


@router.post("/actions/storage/pick")
async def storage_pick(
    payload: dict,
    user: Annotated[TokenUser, Depends(require_permission("integrations.write"))],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict:
    provider = str(payload.get("provider") or "google_drive").strip().lower()
    await log_integration_stub(db, user.organization_id, provider, "storage.pick", payload)
    await db.commit()
    return {
        "ok": True,
        "provider": provider,
        "files": [
            {"id": f"{provider}_{uuid.uuid4().hex[:8]}", "name": "example.txt", "mime": "text/plain", "size": 1024},
        ],
    }


@router.post("/translate")
async def translate(
    payload: TranslationIn,
    user: Annotated[TokenUser, Depends(require_permission("integrations.write"))],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict:
    provider = payload.provider.strip().lower()
    if provider not in {"deepl", "google_translate"}:
        raise HTTPException(status_code=400, detail="Unsupported provider")
    translated = await ai_service.transform_text("translate", payload.text, payload.target_language)
    await log_integration_stub(
        db,
        user.organization_id,
        provider,
        "translation.request",
        {"target_language": payload.target_language},
    )
    await db.commit()
    return {"ok": True, "provider": provider, "translated_text": translated, "target_language": payload.target_language}


async def log_integration_stub(
    db: AsyncSession,
    organization_id: uuid.UUID,
    provider: str,
    event: str,
    payload: dict,
) -> None:
    row = (
        await db.execute(
            select(Integration).where(Integration.organization_id == organization_id, Integration.provider == provider)
        )
    ).scalar_one_or_none()
    if row is None:
        row = await install_integration(db, organization_id=organization_id, provider=provider, config={})
    await log_integration(
        db,
        integration_id=row.id,
        organization_id=organization_id,
        event=event,
        message=f"{provider} action executed",
        payload=payload,
    )


@router.post("/{integration_id}/simulate-error")
async def integration_error(
    integration_id: uuid.UUID,
    payload: dict,
    user: Annotated[TokenUser, Depends(require_permission("integrations.write"))],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict:
    row = (
        await db.execute(
            select(Integration).where(Integration.id == integration_id, Integration.organization_id == user.organization_id)
        )
    ).scalar_one_or_none()
    if row is None:
        raise HTTPException(status_code=404, detail="Integration not found")

    message = str(payload.get("message") or "Simulated integration error")
    row.health_status = "error"
    row.last_error_message = message
    row.last_error_at = datetime.now(UTC)
    row.failure_streak = int(row.failure_streak or 0) + 1
    await log_integration(
        db,
        integration_id=row.id,
        organization_id=row.organization_id,
        event="integration.error",
        message=message,
        level="error",
    )
    await dispatch_event(
        organization_id=row.organization_id,
        event=INTEGRATION_ERROR,
        payload={"integration_id": str(row.id), "provider": row.provider, "message": message},
        db=db,
    )
    await db.commit()
    return {"ok": True}
