from __future__ import annotations

from datetime import UTC, datetime, timedelta
import json
import secrets
import uuid

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.redis import get_redis, ns
from app.models.integration import Integration, IntegrationLog, OAuthConnection
from app.services.integration_registry import get_definition


async def log_integration(
    db: AsyncSession,
    *,
    integration_id: uuid.UUID,
    organization_id: uuid.UUID,
    event: str,
    message: str,
    level: str = "info",
    payload: dict | None = None,
    status_code: int | None = None,
) -> IntegrationLog:
    row = IntegrationLog(
        integration_id=integration_id,
        organization_id=organization_id,
        level=level,
        event=event,
        message=message,
        payload=payload or {},
        status_code=status_code,
    )
    db.add(row)
    await db.flush()
    return row


async def install_integration(
    db: AsyncSession,
    *,
    organization_id: uuid.UUID,
    provider: str,
    config: dict | None,
) -> Integration:
    definition = get_definition(provider)
    display_name = definition["name"] if definition else provider.replace("_", " ").title()
    category = definition["category"] if definition else "other"
    install_type = definition["install_type"] if definition else "api_key"
    capabilities = definition.get("capabilities", []) if definition else []

    row = (
        await db.execute(select(Integration).where(Integration.organization_id == organization_id, Integration.provider == provider))
    ).scalar_one_or_none()
    if row is None:
        row = Integration(
            organization_id=organization_id,
            provider=provider,
            display_name=display_name,
            category=category,
            install_type=install_type,
            capabilities={"items": capabilities},
            config=config or {},
            status="installed",
            is_active=True,
            health_status="unknown",
        )
        db.add(row)
        await db.flush()
    else:
        row.display_name = display_name
        row.category = category
        row.install_type = install_type
        row.capabilities = {"items": capabilities}
        row.config = config or row.config or {}
        row.status = "installed"
        row.is_active = True
        row.updated_at = datetime.now(UTC)

    await log_integration(
        db,
        integration_id=row.id,
        organization_id=organization_id,
        event="integration.installed",
        message=f"{display_name} integration installed",
        payload={"provider": provider},
    )
    return row


async def uninstall_integration(db: AsyncSession, row: Integration) -> None:
    row.status = "uninstalled"
    row.is_active = False
    row.updated_at = datetime.now(UTC)
    await log_integration(
        db,
        integration_id=row.id,
        organization_id=row.organization_id,
        event="integration.uninstalled",
        message=f"{row.display_name} integration uninstalled",
        payload={"provider": row.provider},
    )


async def run_health_check(db: AsyncSession, row: Integration) -> dict:
    test_url = str((row.config or {}).get("test_url") or "").strip()
    if not test_url:
        row.health_status = "healthy"
        row.last_success_at = datetime.now(UTC)
        row.failure_streak = 0
        await log_integration(
            db,
            integration_id=row.id,
            organization_id=row.organization_id,
            event="integration.health",
            message="Health check passed (local config check)",
        )
        return {"ok": True, "mode": "local"}

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(test_url)
        if 200 <= resp.status_code < 400:
            row.health_status = "healthy"
            row.last_success_at = datetime.now(UTC)
            row.failure_streak = 0
            await log_integration(
                db,
                integration_id=row.id,
                organization_id=row.organization_id,
                event="integration.health",
                message="Remote health check succeeded",
                status_code=resp.status_code,
            )
            return {"ok": True, "mode": "http", "status_code": resp.status_code}
        row.health_status = "degraded"
        row.failure_streak = int(row.failure_streak or 0) + 1
        row.last_error_at = datetime.now(UTC)
        row.last_error_message = f"Unexpected status {resp.status_code}"
        await log_integration(
            db,
            integration_id=row.id,
            organization_id=row.organization_id,
            event="integration.health",
            message="Remote health check failed",
            level="warn",
            status_code=resp.status_code,
        )
        return {"ok": False, "mode": "http", "status_code": resp.status_code}
    except Exception as exc:  # noqa: BLE001
        row.health_status = "error"
        row.failure_streak = int(row.failure_streak or 0) + 1
        row.last_error_at = datetime.now(UTC)
        row.last_error_message = str(exc)[:1000]
        await log_integration(
            db,
            integration_id=row.id,
            organization_id=row.organization_id,
            event="integration.health",
            message=f"Remote health check error: {exc}",
            level="error",
        )
        return {"ok": False, "mode": "http", "error": str(exc)}


async def mark_sync(db: AsyncSession, row: Integration, *, ok: bool, message: str, payload: dict | None = None) -> None:
    now = datetime.now(UTC)
    row.last_sync_at = now
    if ok:
        row.last_success_at = now
        row.health_status = "healthy"
        row.failure_streak = 0
    else:
        row.last_error_at = now
        row.health_status = "error"
        row.failure_streak = int(row.failure_streak or 0) + 1
        row.last_error_message = message[:1000]
    await log_integration(
        db,
        integration_id=row.id,
        organization_id=row.organization_id,
        event="integration.sync",
        message=message,
        level="info" if ok else "error",
        payload=payload or {},
    )


async def create_oauth_state(
    *,
    organization_id: uuid.UUID,
    provider: str,
    integration_id: uuid.UUID | None,
    redirect_uri: str,
    scopes: list[str],
) -> str:
    state = secrets.token_urlsafe(32)
    data = {
        "organization_id": str(organization_id),
        "provider": provider,
        "integration_id": str(integration_id) if integration_id else None,
        "redirect_uri": redirect_uri,
        "scopes": scopes,
        "created_at": datetime.now(UTC).isoformat(),
    }
    await get_redis().setex(ns("oauth_state", state), 900, json.dumps(data))
    return state


async def consume_oauth_state(state: str) -> dict | None:
    raw = await get_redis().get(ns("oauth_state", state))
    if not raw:
        return None
    await get_redis().delete(ns("oauth_state", state))
    text = raw.decode() if isinstance(raw, bytes) else str(raw)
    return json.loads(text)


def token_expiry(seconds: int | None) -> datetime | None:
    if not seconds:
        return None
    return datetime.now(UTC) + timedelta(seconds=int(seconds))


async def upsert_oauth_connection(
    db: AsyncSession,
    *,
    organization_id: uuid.UUID,
    provider: str,
    integration_id: uuid.UUID | None,
    access_token: str | None,
    refresh_token: str | None,
    token_type: str | None,
    scopes: list[str],
    expires_in: int | None,
    metadata: dict | None,
) -> OAuthConnection:
    row = (
        await db.execute(
            select(OAuthConnection).where(
                OAuthConnection.organization_id == organization_id,
                OAuthConnection.provider == provider,
                OAuthConnection.integration_id == integration_id,
            )
        )
    ).scalar_one_or_none()
    if row is None:
        row = OAuthConnection(
            organization_id=organization_id,
            integration_id=integration_id,
            provider=provider,
        )
        db.add(row)
        await db.flush()

    row.access_token = access_token
    row.refresh_token = refresh_token
    row.token_type = token_type
    row.scopes = {"items": scopes}
    row.expires_at = token_expiry(expires_in)
    row.metadata_ = metadata or {}
    row.updated_at = datetime.now(UTC)
    return row
