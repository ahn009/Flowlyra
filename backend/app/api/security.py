"""Phase 12 security admin endpoints: SSO, SCIM tokens, IP allowlist, sessions,
visitor bans, data exports, retention, security events.
"""

import csv
import hashlib
import io
import ipaddress
import secrets
import uuid
from datetime import UTC, datetime, timedelta
from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy import delete, desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.db.session import get_db
from app.middleware.auth import TokenUser, current_user
from app.models.audit_log import AuditLog
from app.models.organization import Organization
from app.models.refresh_token import RefreshToken
from app.models.security import (
    DataExportJob,
    RetentionPolicy,
    ScimToken,
    SecurityEvent,
    SsoConfig,
    VisitorBan,
)
from app.models.session import Session as VisitorSession
from app.models.user import User
from app.services.audit_service import record as audit_record
from app.services.permissions import require_permission
from app.services.security_events import record_event as record_security_event


router = APIRouter(prefix="/security", tags=["security"])

OwnerUser = Annotated[TokenUser, Depends(require_permission("security.manage"))]


def _client_ip(request: Request) -> str | None:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    if request.client:
        return request.client.host
    return None


def _row_to_dict(row: Any) -> dict[str, Any]:
    data: dict[str, Any] = {}
    for col in row.__table__.columns:
        val = getattr(row, col.name)
        if isinstance(val, uuid.UUID):
            data[col.name] = str(val)
        elif isinstance(val, datetime):
            data[col.name] = val.isoformat()
        else:
            data[col.name] = val
    return data


# ---------- SSO config ----------
@router.get("/sso")
async def get_sso(user: OwnerUser, db: AsyncSession = Depends(get_db)) -> dict:
    sso = (
        await db.execute(
            select(SsoConfig).where(SsoConfig.organization_id == user.organization_id, SsoConfig.provider == "saml")
        )
    ).scalar_one_or_none()
    if sso is None:
        return {"configured": False}
    out = _row_to_dict(sso)
    out["configured"] = True
    return out


@router.put("/sso")
async def upsert_sso(payload: dict, user: OwnerUser, db: AsyncSession = Depends(get_db)) -> dict:
    sso = (
        await db.execute(
            select(SsoConfig).where(SsoConfig.organization_id == user.organization_id, SsoConfig.provider == "saml")
        )
    ).scalar_one_or_none()
    fields = {k: payload.get(k) for k in (
        "idp_entity_id", "idp_sso_url", "idp_slo_url", "idp_cert",
        "attribute_map", "default_role", "auto_provision", "require_sso", "is_active",
    ) if k in payload}
    if sso is None:
        sso = SsoConfig(organization_id=user.organization_id, provider="saml", **{k: v for k, v in fields.items() if v is not None})
        db.add(sso)
    else:
        for k, v in fields.items():
            setattr(sso, k, v)
    await db.commit()
    await db.refresh(sso)
    await audit_record(
        organization_id=user.organization_id,
        actor_user_id=user.id,
        actor_email=user.email,
        event="sso.updated",
        target_type="sso_config",
        target_id=str(sso.id),
    )
    return _row_to_dict(sso)


@router.delete("/sso")
async def delete_sso(user: OwnerUser, db: AsyncSession = Depends(get_db)) -> dict:
    await db.execute(
        delete(SsoConfig).where(SsoConfig.organization_id == user.organization_id, SsoConfig.provider == "saml")
    )
    await db.commit()
    return {"ok": True}


# ---------- SCIM tokens ----------
def _hash_scim_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


@router.get("/scim/tokens")
async def list_scim_tokens(user: OwnerUser, db: AsyncSession = Depends(get_db)) -> dict:
    rows = (
        await db.execute(
            select(ScimToken).where(ScimToken.organization_id == user.organization_id).order_by(desc(ScimToken.created_at))
        )
    ).scalars().all()
    return {"items": [{**_row_to_dict(r), "token_hash": None} for r in rows]}


@router.post("/scim/tokens")
async def create_scim_token(payload: dict, user: OwnerUser, db: AsyncSession = Depends(get_db)) -> dict:
    label = (payload.get("label") or "default").strip()[:120]
    raw_token = f"scim_{secrets.token_urlsafe(32)}"
    row = ScimToken(
        organization_id=user.organization_id,
        label=label,
        token_hash=_hash_scim_token(raw_token),
        token_prefix=raw_token[:12],
        created_by=user.id,
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return {**_row_to_dict(row), "token": raw_token}  # one-time reveal


@router.delete("/scim/tokens/{token_id}")
async def revoke_scim_token(token_id: uuid.UUID, user: OwnerUser, db: AsyncSession = Depends(get_db)) -> dict:
    row = (
        await db.execute(
            select(ScimToken).where(ScimToken.id == token_id, ScimToken.organization_id == user.organization_id)
        )
    ).scalar_one_or_none()
    if row is None:
        raise HTTPException(status_code=404, detail="Token not found")
    row.revoked_at = datetime.now(UTC)
    await db.commit()
    return {"ok": True}


# ---------- IP allowlist ----------
@router.get("/ip-allowlist")
async def get_ip_allowlist(user: OwnerUser, db: AsyncSession = Depends(get_db)) -> dict:
    org = (await db.execute(select(Organization).where(Organization.id == user.organization_id))).scalar_one()
    return org.ip_allowlist or {"enabled": False, "cidrs": []}


@router.put("/ip-allowlist")
async def update_ip_allowlist(payload: dict, user: OwnerUser, db: AsyncSession = Depends(get_db)) -> dict:
    cidrs = payload.get("cidrs") or []
    for cidr in cidrs:
        try:
            ipaddress.ip_network(str(cidr), strict=False)
        except ValueError as exc:
            raise HTTPException(status_code=422, detail=f"Invalid CIDR: {cidr}") from exc
    org = (await db.execute(select(Organization).where(Organization.id == user.organization_id))).scalar_one()
    org.ip_allowlist = {"enabled": bool(payload.get("enabled")), "cidrs": list(cidrs)}
    await db.commit()
    await audit_record(
        organization_id=user.organization_id,
        actor_user_id=user.id,
        actor_email=user.email,
        event="security.ip_allowlist_updated",
    )
    return org.ip_allowlist


# ---------- Sessions list/revoke ----------
def _parse_user_agent(ua: str | None) -> dict[str, str | None]:
    if not ua:
        return {"browser": None, "os": None, "device": None}
    ua_low = ua.lower()
    browser = next((b for b in ("edge", "chrome", "safari", "firefox", "opera") if b in ua_low), None)
    osys = next((o for o in ("windows", "mac os", "macintosh", "linux", "android", "iphone", "ipad") if o in ua_low), None)
    device = "mobile" if any(x in ua_low for x in ("android", "iphone", "ipad", "mobile")) else "desktop"
    return {"browser": browser, "os": osys, "device": device}


@router.get("/sessions")
async def list_sessions(
    request: Request,
    user: Annotated[TokenUser, Depends(current_user)],
    db: AsyncSession = Depends(get_db),
) -> dict:
    rows = (
        await db.execute(
            select(RefreshToken)
            .where(
                RefreshToken.user_id == user.id,
                RefreshToken.is_revoked.is_(False),
                RefreshToken.expires_at > datetime.now(UTC),
            )
            .order_by(desc(RefreshToken.created_at))
        )
    ).scalars().all()
    current_jti = None
    auth_header = request.headers.get("authorization") or ""
    if auth_header.lower().startswith("bearer "):
        try:
            from jose import jwt

            decoded = jwt.decode(auth_header[7:], get_settings().secret_key, algorithms=["HS256"], options={"verify_exp": False})
            current_jti = decoded.get("jti")
        except Exception:  # noqa: BLE001
            current_jti = None
    items = []
    for r in rows:
        meta = _parse_user_agent(r.user_agent)
        items.append({
            "id": str(r.id),
            "ip_address": r.ip_address,
            "user_agent": r.user_agent,
            "browser": meta["browser"],
            "os": meta["os"],
            "device": meta["device"],
            "created_at": r.created_at.isoformat() if r.created_at else None,
            "last_used_at": r.last_used_at.isoformat() if r.last_used_at else None,
            "is_current": r.jti == current_jti,
        })
    return {"items": items}


@router.post("/sessions/{session_id}/revoke")
async def revoke_session(
    session_id: uuid.UUID,
    user: Annotated[TokenUser, Depends(current_user)],
    db: AsyncSession = Depends(get_db),
) -> dict:
    row = (
        await db.execute(
            select(RefreshToken).where(RefreshToken.id == session_id, RefreshToken.user_id == user.id)
        )
    ).scalar_one_or_none()
    if row is None:
        raise HTTPException(status_code=404, detail="Session not found")
    row.is_revoked = True
    row.revoked_reason = "user_revoked"
    await db.commit()
    return {"ok": True}


@router.post("/sessions/revoke-others")
async def revoke_other_sessions(
    request: Request,
    user: Annotated[TokenUser, Depends(current_user)],
    db: AsyncSession = Depends(get_db),
) -> dict:
    current_jti = None
    auth_header = request.headers.get("authorization") or ""
    if auth_header.lower().startswith("bearer "):
        try:
            from jose import jwt

            decoded = jwt.decode(auth_header[7:], get_settings().secret_key, algorithms=["HS256"], options={"verify_exp": False})
            current_jti = decoded.get("jti")
        except Exception:  # noqa: BLE001
            current_jti = None
    stmt = select(RefreshToken).where(
        RefreshToken.user_id == user.id, RefreshToken.is_revoked.is_(False)
    )
    if current_jti:
        stmt = stmt.where(RefreshToken.jti != current_jti)
    rows = (await db.execute(stmt)).scalars().all()
    for r in rows:
        r.is_revoked = True
        r.revoked_reason = "user_revoked_others"
    await db.commit()
    return {"ok": True, "revoked": len(rows)}


# ---------- Visitor bans ----------
@router.get("/bans")
async def list_bans(user: OwnerUser, db: AsyncSession = Depends(get_db)) -> dict:
    rows = (
        await db.execute(
            select(VisitorBan)
            .where(VisitorBan.organization_id == user.organization_id)
            .order_by(desc(VisitorBan.created_at))
        )
    ).scalars().all()
    return {"items": [_row_to_dict(r) for r in rows]}


@router.post("/bans")
async def create_ban(payload: dict, user: OwnerUser, db: AsyncSession = Depends(get_db)) -> dict:
    ban_type = (payload.get("ban_type") or "ip").strip()
    value = (payload.get("value") or "").strip()
    if not value:
        raise HTTPException(status_code=422, detail="value required")
    if ban_type == "cidr":
        try:
            ipaddress.ip_network(value, strict=False)
        except ValueError as exc:
            raise HTTPException(status_code=422, detail=f"Invalid CIDR: {value}") from exc
    row = VisitorBan(
        organization_id=user.organization_id,
        ban_type=ban_type,
        value=value,
        reason=payload.get("reason"),
        created_by=user.id,
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return _row_to_dict(row)


@router.delete("/bans/{ban_id}")
async def delete_ban(ban_id: uuid.UUID, user: OwnerUser, db: AsyncSession = Depends(get_db)) -> dict:
    await db.execute(
        delete(VisitorBan).where(VisitorBan.id == ban_id, VisitorBan.organization_id == user.organization_id)
    )
    await db.commit()
    return {"ok": True}


# ---------- Retention policy ----------
@router.get("/retention")
async def get_retention(user: OwnerUser, db: AsyncSession = Depends(get_db)) -> dict:
    row = (
        await db.execute(
            select(RetentionPolicy).where(RetentionPolicy.organization_id == user.organization_id)
        )
    ).scalar_one_or_none()
    if row is None:
        settings = get_settings()
        return {
            "configured": False,
            "chat_days": settings.retention_default_chat_days,
            "ticket_days": settings.retention_default_ticket_days,
            "audit_days": settings.retention_default_audit_days,
            "session_days": settings.retention_default_session_days,
            "enabled": False,
        }
    return {**_row_to_dict(row), "configured": True}


@router.put("/retention")
async def upsert_retention(payload: dict, user: OwnerUser, db: AsyncSession = Depends(get_db)) -> dict:
    row = (
        await db.execute(
            select(RetentionPolicy).where(RetentionPolicy.organization_id == user.organization_id)
        )
    ).scalar_one_or_none()
    fields = {
        k: int(payload[k])
        for k in ("chat_days", "ticket_days", "audit_days", "session_days")
        if k in payload and payload[k] is not None
    }
    enabled = bool(payload.get("enabled", False))
    if row is None:
        row = RetentionPolicy(organization_id=user.organization_id, enabled=enabled, **fields)
        db.add(row)
    else:
        for k, v in fields.items():
            setattr(row, k, v)
        row.enabled = enabled
    await db.commit()
    await db.refresh(row)
    return _row_to_dict(row)


# ---------- Data export jobs ----------
@router.get("/data-exports")
async def list_exports(user: OwnerUser, db: AsyncSession = Depends(get_db)) -> dict:
    rows = (
        await db.execute(
            select(DataExportJob)
            .where(DataExportJob.organization_id == user.organization_id)
            .order_by(desc(DataExportJob.created_at))
            .limit(50)
        )
    ).scalars().all()
    return {"items": [_row_to_dict(r) for r in rows]}


@router.post("/data-exports")
async def create_export(payload: dict, user: OwnerUser, db: AsyncSession = Depends(get_db)) -> dict:
    from app.workers.system_tasks import run_data_export

    scope = (payload.get("scope") or "org").strip()
    target_id = payload.get("target_id")
    row = DataExportJob(
        organization_id=user.organization_id,
        requested_by=user.id,
        scope=scope,
        target_id=uuid.UUID(target_id) if target_id else None,
        status="pending",
        expires_at=datetime.now(UTC) + timedelta(seconds=get_settings().data_export_signed_url_ttl_seconds),
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    try:
        run_data_export.delay(str(row.id))
    except Exception:  # noqa: BLE001
        # Celery unavailable in dev; queue stays pending until worker boots.
        pass
    return _row_to_dict(row)


# ---------- Security events feed ----------
@router.get("/events")
async def list_security_events(
    user: OwnerUser,
    db: AsyncSession = Depends(get_db),
    limit: int = 100,
) -> dict:
    rows = (
        await db.execute(
            select(SecurityEvent)
            .where(SecurityEvent.organization_id == user.organization_id)
            .order_by(desc(SecurityEvent.created_at))
            .limit(min(limit, 500))
        )
    ).scalars().all()
    return {"items": [_row_to_dict(r) for r in rows]}


# ---------- GDPR erasure ----------
@router.post("/contacts/{contact_id}/erase")
async def erase_contact(
    contact_id: uuid.UUID,
    payload: dict,
    user: OwnerUser,
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> dict:
    from app.models.contact import Contact
    from app.models.chat import Chat
    from app.models.message import Message
    from app.models.ticket import Ticket

    contact = (
        await db.execute(
            select(Contact).where(Contact.id == contact_id, Contact.organization_id == user.organization_id)
        )
    ).scalar_one_or_none()
    if contact is None:
        raise HTTPException(status_code=404, detail="Contact not found")
    mode = (payload.get("mode") or "anonymize").strip()
    if mode == "delete":
        await db.execute(delete(Message).where(Message.organization_id == user.organization_id, Message.contact_id == contact_id))
        await db.execute(delete(Chat).where(Chat.organization_id == user.organization_id, Chat.contact_id == contact_id))
        await db.execute(delete(Ticket).where(Ticket.organization_id == user.organization_id, Ticket.contact_id == contact_id))
        await db.execute(delete(VisitorSession).where(VisitorSession.organization_id == user.organization_id, VisitorSession.contact_id == contact_id))
        await db.delete(contact)
    else:
        digest = hashlib.sha256(f"{contact.id}".encode()).hexdigest()[:16]
        contact.email = f"erased-{digest}@example.invalid"
        contact.full_name = "Erased Contact"
        contact.phone = None
        contact.attributes = {}
        contact.deleted_at = datetime.now(UTC)
    await record_security_event(
        db,
        organization_id=user.organization_id,
        user_id=user.id,
        event="gdpr.contact_erased",
        severity="warning",
        ip_address=_client_ip(request),
        details={"contact_id": str(contact_id), "mode": mode},
    )
    await audit_record(
        organization_id=user.organization_id,
        actor_user_id=user.id,
        actor_email=user.email,
        event="gdpr.contact_erased",
        target_type="contact",
        target_id=str(contact_id),
        details={"mode": mode},
    )
    await db.commit()
    return {"ok": True, "mode": mode}
