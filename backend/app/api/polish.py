from __future__ import annotations

from datetime import UTC, datetime
from typing import Annotated, Any
import secrets
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.middleware.auth import TokenUser, current_user, require_role
from app.models.organization import Organization
from app.models.polish import MarketingPost, StatusIncident
from app.services.onboarding_drip_service import run_onboarding_drip_for_org

router = APIRouter(prefix="/polish", tags=["polish"])


class IncidentIn(BaseModel):
    title: str = Field(min_length=3, max_length=255)
    body: str = ""
    status: str = "investigating"
    impact: str = "minor"
    is_public: bool = True
    components: list[str] = Field(default_factory=list)
    resolved_at: datetime | None = None


class PostIn(BaseModel):
    slug: str = Field(min_length=2, max_length=160)
    title: str = Field(min_length=3, max_length=255)
    excerpt: str = ""
    content_markdown: str = ""
    cover_image_url: str | None = None
    tags: list[str] = Field(default_factory=list)
    is_published: bool = False


class DomainConfigIn(BaseModel):
    domain: str = Field(min_length=3, max_length=255)


class DomainVerifyIn(BaseModel):
    token: str = Field(min_length=6, max_length=255)


class SenderDomainVerifyIn(BaseModel):
    dkim_selector: str | None = None
    dkim_value: str | None = None
    spf_include: str | None = None


def _incident_out(row: StatusIncident) -> dict[str, Any]:
    return {
        "id": str(row.id),
        "organization_id": str(row.organization_id),
        "title": row.title,
        "body": row.body,
        "status": row.status,
        "impact": row.impact,
        "is_public": row.is_public,
        "components": list((row.components or {}).get("items") or []),
        "started_at": row.started_at.isoformat() if row.started_at else None,
        "resolved_at": row.resolved_at.isoformat() if row.resolved_at else None,
        "created_at": row.created_at.isoformat() if row.created_at else None,
        "updated_at": row.updated_at.isoformat() if row.updated_at else None,
    }


def _post_out(row: MarketingPost) -> dict[str, Any]:
    return {
        "id": str(row.id),
        "organization_id": str(row.organization_id),
        "slug": row.slug,
        "title": row.title,
        "excerpt": row.excerpt,
        "content_markdown": row.content_markdown,
        "cover_image_url": row.cover_image_url,
        "tags": list((row.tags or {}).get("items") or []),
        "is_published": row.is_published,
        "published_at": row.published_at.isoformat() if row.published_at else None,
        "created_at": row.created_at.isoformat() if row.created_at else None,
        "updated_at": row.updated_at.isoformat() if row.updated_at else None,
    }


def _domain_dns_records(domain: str, token: str) -> dict[str, str]:
    return {
        "cname_host": f"chat.{domain}",
        "cname_target": "dashboard.flowlyra.com",
        "txt_host": f"_flowlyra-verify.{domain}",
        "txt_value": token,
    }


def _sender_dns_records(domain: str, token: str) -> dict[str, str]:
    selector = f"flowlyra-{token[:8]}"
    dkim_host = f"{selector}._domainkey.{domain}"
    dkim_value = f"v=DKIM1; k=rsa; p={secrets.token_urlsafe(48)}"
    spf_value = "v=spf1 include:spf.flowlyra.com ~all"
    return {
        "selector": selector,
        "dkim_host": dkim_host,
        "dkim_value": dkim_value,
        "spf_host": domain,
        "spf_value": spf_value,
    }


@router.get("/status/incidents")
async def list_incidents(
    user: TokenUser = Depends(require_role("admin", "supervisor")),
    db: AsyncSession = Depends(get_db),
    limit: int = Query(50, ge=1, le=200),
) -> dict:
    rows = (
        await db.execute(
            select(StatusIncident)
            .where(StatusIncident.organization_id == user.organization_id)
            .order_by(StatusIncident.started_at.desc(), StatusIncident.created_at.desc())
            .limit(limit)
        )
    ).scalars().all()
    return {"items": [_incident_out(row) for row in rows]}


@router.post("/status/incidents")
async def create_incident(
    payload: IncidentIn,
    user: TokenUser = Depends(require_role("admin", "supervisor")),
    db: AsyncSession = Depends(get_db),
) -> dict:
    row = StatusIncident(
        organization_id=user.organization_id,
        created_by_user_id=user.id,
        title=payload.title.strip(),
        body=payload.body,
        status=payload.status,
        impact=payload.impact,
        is_public=payload.is_public,
        components={"items": [item.strip() for item in payload.components if item.strip()]},
        resolved_at=payload.resolved_at,
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return {"ok": True, "item": _incident_out(row)}


@router.patch("/status/incidents/{incident_id}")
async def update_incident(
    incident_id: uuid.UUID,
    payload: IncidentIn,
    user: TokenUser = Depends(require_role("admin", "supervisor")),
    db: AsyncSession = Depends(get_db),
) -> dict:
    row = (
        await db.execute(
            select(StatusIncident).where(
                StatusIncident.id == incident_id,
                StatusIncident.organization_id == user.organization_id,
            )
        )
    ).scalar_one_or_none()
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Incident not found")
    row.title = payload.title.strip()
    row.body = payload.body
    row.status = payload.status
    row.impact = payload.impact
    row.is_public = payload.is_public
    row.components = {"items": [item.strip() for item in payload.components if item.strip()]}
    row.resolved_at = payload.resolved_at
    await db.commit()
    await db.refresh(row)
    return {"ok": True, "item": _incident_out(row)}


@router.get("/blog/posts")
async def list_blog_posts(
    user: TokenUser = Depends(require_role("admin", "supervisor")),
    db: AsyncSession = Depends(get_db),
    include_drafts: bool = True,
    limit: int = Query(100, ge=1, le=300),
) -> dict:
    stmt = select(MarketingPost).where(MarketingPost.organization_id == user.organization_id)
    if not include_drafts:
        stmt = stmt.where(MarketingPost.is_published.is_(True))
    rows = (
        await db.execute(
            stmt.order_by(MarketingPost.published_at.desc().nullslast(), MarketingPost.created_at.desc()).limit(limit)
        )
    ).scalars().all()
    return {"items": [_post_out(row) for row in rows]}


@router.post("/blog/posts")
async def upsert_blog_post(
    payload: PostIn,
    user: TokenUser = Depends(require_role("admin", "supervisor")),
    db: AsyncSession = Depends(get_db),
) -> dict:
    row = (
        await db.execute(
            select(MarketingPost).where(
                MarketingPost.organization_id == user.organization_id,
                MarketingPost.slug == payload.slug,
            )
        )
    ).scalar_one_or_none()
    if row is None:
        row = MarketingPost(
            organization_id=user.organization_id,
            author_user_id=user.id,
            slug=payload.slug,
        )
        db.add(row)

    row.title = payload.title
    row.excerpt = payload.excerpt
    row.content_markdown = payload.content_markdown
    row.cover_image_url = payload.cover_image_url
    row.tags = {"items": [item.strip() for item in payload.tags if item.strip()]}
    row.is_published = payload.is_published
    row.published_at = datetime.now(UTC) if payload.is_published else None
    await db.commit()
    await db.refresh(row)
    return {"ok": True, "item": _post_out(row)}


@router.delete("/blog/posts/{post_id}")
async def delete_blog_post(
    post_id: uuid.UUID,
    user: TokenUser = Depends(require_role("admin", "supervisor")),
    db: AsyncSession = Depends(get_db),
) -> dict:
    row = (
        await db.execute(
            select(MarketingPost).where(
                MarketingPost.id == post_id,
                MarketingPost.organization_id == user.organization_id,
            )
        )
    ).scalar_one_or_none()
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")
    await db.delete(row)
    await db.commit()
    return {"ok": True}


@router.get("/domains/dashboard")
async def get_dashboard_domain_settings(
    user: TokenUser = Depends(require_role("admin", "supervisor")),
    db: AsyncSession = Depends(get_db),
) -> dict:
    org = (await db.execute(select(Organization).where(Organization.id == user.organization_id))).scalar_one()
    return {
        "domain": org.dashboard_custom_domain,
        "verification": org.dashboard_domain_verification or {},
        "logo_url": org.dashboard_logo_url,
        "primary_color": org.dashboard_primary_color,
    }


@router.post("/domains/dashboard")
async def configure_dashboard_domain(
    payload: DomainConfigIn,
    user: TokenUser = Depends(require_role("admin", "supervisor")),
    db: AsyncSession = Depends(get_db),
) -> dict:
    org = (await db.execute(select(Organization).where(Organization.id == user.organization_id))).scalar_one()
    token = secrets.token_urlsafe(18)
    org.dashboard_custom_domain = payload.domain.strip().lower()
    org.dashboard_domain_verification = {
        "status": "pending_dns",
        "token": token,
        "dns": _domain_dns_records(payload.domain.strip().lower(), token),
        "last_checked_at": None,
    }
    await db.commit()
    return {"ok": True, "verification": org.dashboard_domain_verification}


@router.post("/domains/dashboard/verify")
async def verify_dashboard_domain(
    payload: DomainVerifyIn,
    user: TokenUser = Depends(require_role("admin", "supervisor")),
    db: AsyncSession = Depends(get_db),
) -> dict:
    org = (await db.execute(select(Organization).where(Organization.id == user.organization_id))).scalar_one()
    current = dict(org.dashboard_domain_verification or {})
    if not current or not current.get("token"):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Domain not configured")
    ok = secrets.compare_digest(str(current.get("token")), payload.token.strip())
    current["status"] = "verified" if ok else "failed"
    current["last_checked_at"] = datetime.now(UTC).isoformat()
    org.dashboard_domain_verification = current
    await db.commit()
    return {"ok": ok, "verification": current}


@router.get("/domains/email-sender")
async def get_sender_domain_settings(
    user: TokenUser = Depends(require_role("admin", "supervisor")),
    db: AsyncSession = Depends(get_db),
) -> dict:
    org = (await db.execute(select(Organization).where(Organization.id == user.organization_id))).scalar_one()
    return {"domain": org.email_sender_domain, "verification": org.email_sender_verification or {}}


@router.post("/domains/email-sender")
async def configure_sender_domain(
    payload: DomainConfigIn,
    user: TokenUser = Depends(require_role("admin", "supervisor")),
    db: AsyncSession = Depends(get_db),
) -> dict:
    org = (await db.execute(select(Organization).where(Organization.id == user.organization_id))).scalar_one()
    token = secrets.token_urlsafe(16)
    domain = payload.domain.strip().lower()
    dns = _sender_dns_records(domain, token)
    org.email_sender_domain = domain
    org.email_sender_verification = {
        "status": "pending_dns",
        "token": token,
        "dns": dns,
        "dkim": {"verified": False, "selector": dns["selector"]},
        "spf": {"verified": False},
        "last_checked_at": None,
    }
    await db.commit()
    return {"ok": True, "verification": org.email_sender_verification}


@router.post("/domains/email-sender/verify")
async def verify_sender_domain(
    payload: SenderDomainVerifyIn,
    user: TokenUser = Depends(require_role("admin", "supervisor")),
    db: AsyncSession = Depends(get_db),
) -> dict:
    org = (await db.execute(select(Organization).where(Organization.id == user.organization_id))).scalar_one()
    current = dict(org.email_sender_verification or {})
    if not current or not current.get("dns"):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Sender domain not configured")
    dkim_expected = str(current.get("dns", {}).get("dkim_value") or "")
    spf_expected = str(current.get("dns", {}).get("spf_value") or "")
    dkim_ok = bool(payload.dkim_value and payload.dkim_value.strip() == dkim_expected)
    spf_ok = bool(payload.spf_include and payload.spf_include.strip() == spf_expected)
    current["dkim"] = {"verified": dkim_ok, "selector": current.get("dns", {}).get("selector")}
    current["spf"] = {"verified": spf_ok}
    current["status"] = "verified" if (dkim_ok and spf_ok) else "failed"
    current["last_checked_at"] = datetime.now(UTC).isoformat()
    org.email_sender_verification = current
    await db.commit()
    return {"ok": dkim_ok and spf_ok, "verification": current}


@router.post("/onboarding-drip/run")
async def run_onboarding_drip_now(
    user: Annotated[TokenUser, Depends(current_user)],
    db: AsyncSession = Depends(get_db),
) -> dict:
    org = (await db.execute(select(Organization).where(Organization.id == user.organization_id))).scalar_one_or_none()
    if org is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found")
    if user.role not in {"admin", "supervisor"}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
    processed = await run_onboarding_drip_for_org(db, organization_id=org.id)
    await db.commit()
    return {"ok": True, "processed": processed}
