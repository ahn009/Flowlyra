from urllib.parse import urlparse
import logging
import random
import uuid

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.db.session import get_db
from app.models.analytics_event import AnalyticsEvent
from app.models.chat import Chat
from app.models.chat_widget import ChatWidget
from app.models.contact import Contact
from app.models.message import Message
from app.models.organization import Organization
from app.models.product import Product
from app.models.session import Session
from app.models.user import User
from app.schemas.widget import (
    WidgetHistoryRequest,
    WidgetHistoryResponse,
    WidgetIdentifyRequest,
    WidgetInitRequest,
    WidgetInitResponse,
    WidgetLocaleRequest,
    WidgetLocaleResponse,
    WidgetMagicLinkConsumeRequest,
    WidgetMagicLinkRequest,
    WidgetKbSuggestRequest,
    WidgetOfflineRequest,
    WidgetProductSearchRequest,
    WidgetTrackEventRequest,
)
from app.services.chat_service import create_or_resume_session
from app.services.email_service import send_email
from app.services import magic_link
from app.services.offline_ticket import create_from_offline_form
from app.services.operating_hours import is_open, next_open_at
from app.services.widget_i18n import catalog as widget_catalog, normalize as normalize_locale

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/widget", tags=["widget"])
KB_SUGGESTIONS = [
    {"title": "Reset your password", "url": "/help/reset-password"},
    {"title": "Update billing details", "url": "/help/billing"},
    {"title": "Install the chat widget", "url": "/help/install-widget"},
    {"title": "Configure operating hours", "url": "/help/operating-hours"},
    {"title": "Transfer chats to another agent", "url": "/help/transfer-chat"},
    {"title": "Upload and share files", "url": "/help/attachments"},
    {"title": "Use pre-chat custom fields", "url": "/help/pre-chat-fields"},
]


def client_ip_from_request(request: Request) -> str | None:
    for header_name in ("cf-connecting-ip", "x-real-ip", "x-forwarded-for"):
        value = request.headers.get(header_name)
        if not value:
            continue
        ip = value.split(",", 1)[0].strip()
        if ip:
            return ip
    return request.client.host if request.client else None


def _hostname(value: str | None) -> str | None:
    if not value:
        return None
    parsed = urlparse(value if "://" in value else f"https://{value}")
    return parsed.hostname.lower() if parsed.hostname else None


def _domain_allowed(hostname: str | None, allowlist: dict | None) -> bool:
    domains = [str(item).lower().strip() for item in (allowlist or {}).get("domains", []) if str(item).strip()]
    if not domains:
        return True
    if not hostname:
        return False
    for domain in domains:
        if domain.startswith("*.") and hostname.endswith(domain[1:]):
            return True
        if hostname == domain:
            return True
    return False


def _pick_greeting(org: Organization, *, is_returning: bool = False) -> str:
    greetings = org.widget_greetings or {}
    segments = greetings.get("segments") or {}
    segment_items = segments.get("returning" if is_returning else "new") or []
    if segment_items:
        return str(random.choice(segment_items))
    items = greetings.get("items") or []
    if items:
        return str(random.choice(items))
    return org.widget_greeting


def _resolve_locale(requested: str | None, org: Organization) -> str:
    supported = (org.widget_supported_locales or {}).get("locales") or [org.widget_default_locale or "en"]
    code = normalize_locale(requested or org.widget_default_locale)
    if code in supported:
        return code
    base_default = normalize_locale(org.widget_default_locale)
    return base_default if base_default in supported else supported[0] if supported else "en"


def _widget_config(org: Organization, locale: str, *, is_returning: bool = False) -> dict:
    supported = (org.widget_supported_locales or {}).get("locales") or [org.widget_default_locale or "en"]
    greetings = list((org.widget_greetings or {}).get("items") or [])
    can_white_label = org.plan in {"business", "enterprise"}
    return {
        "color": org.widget_color,
        "greeting": _pick_greeting(org, is_returning=is_returning),
        "greetings": greetings,
        "logo_url": org.widget_logo_url,
        "position": org.widget_position,
        "theme": org.widget_theme,
        "pre_chat_form": org.widget_pre_chat_form,
        "post_chat_survey": org.widget_post_chat_survey,
        "custom_css": org.widget_custom_css,
        "custom_js": org.widget_custom_js,
        "eye_catcher": org.widget_eye_catcher or {},
        "white_label": bool(org.widget_white_label and can_white_label),
        "brand_text": org.widget_brand_text,
        "brand_url": org.widget_brand_url,
        "sound_enabled": org.widget_sound_enabled,
        "lazy_load": org.widget_lazy_load,
        "allow_attachments": org.widget_allow_attachments,
        "max_upload_mb": org.widget_max_upload_mb,
        "locale": locale,
        "supported_locales": supported,
        "giphy_api_key": org.widget_giphy_api_key,
    }


def _merge_widget_overrides(base: dict, overrides: dict | None) -> dict:
    if not overrides:
        return base
    merged = dict(base)
    for key, value in overrides.items():
        if value is None:
            continue
        merged[key] = value
    # Ensure greeting remains available even if only greetings array was overridden.
    if not merged.get("greeting"):
        greetings = merged.get("greetings") or []
        if greetings:
            merged["greeting"] = str(random.choice(greetings))
    return merged


def _message_payload(message: Message) -> dict:
    return {
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


async def _get_org(db: AsyncSession, slug: str) -> Organization:
    org = (await db.execute(select(Organization).where(Organization.slug == slug, Organization.is_active.is_(True)))).scalar_one_or_none()
    if org is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found")
    return org


async def _get_session_or_404(db: AsyncSession, org_id: uuid.UUID, token: str) -> Session:
    session = (await db.execute(select(Session).where(Session.organization_id == org_id, Session.session_token == token))).scalar_one_or_none()
    if session is None or session.is_banned:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    return session


@router.post("/init", response_model=WidgetInitResponse)
async def init_widget(payload: WidgetInitRequest, request: Request, db: AsyncSession = Depends(get_db)) -> WidgetInitResponse:
    org = await _get_org(db, payload.org_slug)
    widget_variant: ChatWidget | None = None
    if payload.widget_slug:
        widget_variant = (
            await db.execute(
                select(ChatWidget).where(
                    ChatWidget.organization_id == org.id,
                    ChatWidget.slug == payload.widget_slug,
                    ChatWidget.is_active.is_(True),
                )
            )
        ).scalar_one_or_none()
        if widget_variant is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Widget slug not found")
    hostname = _hostname(payload.url) or _hostname(request.headers.get("origin")) or _hostname(request.headers.get("referer"))
    if not _domain_allowed(hostname, org.widget_domain_allowlist):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Widget is not allowed on this domain")
    client_ip = client_ip_from_request(request)
    visitor = payload.visitor or {}
    session, existing_chat = await create_or_resume_session(
        db,
        org,
        payload.session_token,
        payload.url,
        payload.referrer,
        payload.email or visitor.get("email"),
        payload.full_name or visitor.get("name"),
        client_ip,
    )
    locale_pref = _resolve_locale(payload.locale or visitor.get("locale"), org)
    session.locale = locale_pref
    if visitor:
        new_vars = dict(session.custom_variables or {})
        new_vars.update({k: v for k, v in (visitor.get("custom_variables") or {}).items() if v is not None})
        session.custom_variables = new_vars
        if visitor.get("phone"):
            new_vars["phone"] = visitor["phone"]
    # page history append
    if payload.url:
        history = list((session.page_history or {}).get("items") or [])
        history.append({"url": payload.url, "title": payload.page_title, "ts": str(session.last_seen_at) if session.last_seen_at else None})
        session.page_history = {"items": history[-50:]}

    is_online = bool(await db.scalar(select(User.id).where(User.organization_id == org.id, User.is_online.is_(True)).limit(1)))
    within = is_open(org.operating_hours or {"enabled": False})
    next_open = next_open_at(org.operating_hours or {"enabled": False})
    await db.commit()

    visitor_info = None
    if session.contact_id:
        contact = (await db.execute(select(Contact).where(Contact.id == session.contact_id))).scalar_one_or_none()
        if contact is not None:
            visitor_info = {
                "id": str(contact.id),
                "name": contact.full_name,
                "email": contact.email,
                "phone": contact.phone,
                "custom_variables": session.custom_variables or {},
            }

    is_returning = bool(session.page_views and session.page_views > 1)
    return WidgetInitResponse(
        organization_id=str(org.id),
        widget_slug=widget_variant.slug if widget_variant else None,
        session_token=session.session_token,
        existing_chat_id=str(existing_chat.id) if existing_chat else None,
        is_online=is_online,
        is_within_hours=within,
        next_open_at=next_open.isoformat() if next_open else None,
        widget_config=_merge_widget_overrides(_widget_config(org, locale_pref, is_returning=is_returning), widget_variant.config if widget_variant else None),
        i18n=widget_catalog(locale_pref),
        visitor=visitor_info,
    )


@router.post("/history", response_model=WidgetHistoryResponse)
async def widget_history(payload: WidgetHistoryRequest, db: AsyncSession = Depends(get_db)) -> WidgetHistoryResponse:
    org = await _get_org(db, payload.org_slug)
    session = await _get_session_or_404(db, org.id, payload.session_token)
    chat = (
        await db.execute(select(Chat).where(Chat.id == uuid.UUID(payload.chat_id), Chat.organization_id == org.id, Chat.session_id == session.id))
    ).scalar_one_or_none()
    if chat is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chat not found")
    messages = (
        await db.execute(select(Message).where(Message.chat_id == chat.id, Message.is_internal.is_(False)).order_by(Message.created_at.asc()).limit(200))
    ).scalars().all()
    return WidgetHistoryResponse(messages=[_message_payload(message) for message in messages])


@router.post("/locale", response_model=WidgetLocaleResponse)
async def get_widget_locale(payload: WidgetLocaleRequest, db: AsyncSession = Depends(get_db)) -> WidgetLocaleResponse:
    org = await _get_org(db, payload.org_slug)
    resolved = _resolve_locale(payload.locale, org)
    return WidgetLocaleResponse(locale=resolved, catalog=widget_catalog(resolved))


@router.post("/identify")
async def identify(payload: WidgetIdentifyRequest, db: AsyncSession = Depends(get_db)) -> dict:
    org = await _get_org(db, payload.org_slug)
    session = await _get_session_or_404(db, org.id, payload.session_token)
    contact: Contact | None = None
    if session.contact_id:
        contact = (await db.execute(select(Contact).where(Contact.id == session.contact_id))).scalar_one_or_none()
    if contact is None and payload.email:
        contact = (await db.execute(select(Contact).where(Contact.organization_id == org.id, Contact.email == payload.email))).scalar_one_or_none()
    if contact is None and (payload.email or payload.name):
        contact = Contact(organization_id=org.id, email=payload.email, full_name=payload.name)
        db.add(contact)
        await db.flush()
    if contact is not None:
        if payload.name:
            contact.full_name = payload.name
        if payload.email:
            contact.email = payload.email
        if payload.phone:
            contact.phone = payload.phone
        session.contact_id = contact.id
    if payload.custom_variables:
        merged = dict(session.custom_variables or {})
        for key, value in payload.custom_variables.items():
            if value is None:
                merged.pop(key, None)
            else:
                merged[key] = value
        session.custom_variables = merged
    await db.commit()
    return {
        "ok": True,
        "contact": {
            "id": str(contact.id) if contact else None,
            "email": contact.email if contact else None,
            "name": contact.full_name if contact else None,
        },
        "custom_variables": session.custom_variables or {},
    }


@router.post("/track")
async def track_event(payload: WidgetTrackEventRequest, db: AsyncSession = Depends(get_db)) -> dict:
    org = await _get_org(db, payload.org_slug)
    session = await _get_session_or_404(db, org.id, payload.session_token)
    event = AnalyticsEvent(
        organization_id=org.id,
        event_type=payload.event,
        contact_id=session.contact_id,
        metadata_={
            "session_id": str(session.id),
            "value": payload.value,
            "properties": payload.properties or {},
            "url": session.current_url,
        },
    )
    db.add(event)
    await db.commit()
    return {"ok": True, "event_id": str(event.id)}


@router.post("/magic-link/request")
async def request_magic_link(payload: WidgetMagicLinkRequest, db: AsyncSession = Depends(get_db)) -> dict:
    org = await _get_org(db, payload.org_slug)
    contact = (await db.execute(select(Contact).where(Contact.organization_id == org.id, Contact.email == payload.email))).scalar_one_or_none()
    if contact is None:
        return {"ok": True}
    session = (await db.execute(select(Session).where(Session.organization_id == org.id, Session.contact_id == contact.id).order_by(Session.last_seen_at.desc()).limit(1))).scalar_one_or_none()
    if session is None:
        return {"ok": True}
    token = await magic_link.issue(session.id)
    settings = get_settings()
    link = f"{settings.frontend_base_url.rstrip('/')}/chat/{org.slug}?continue={token}"
    try:
        await send_email(
            payload.email,
            f"Continue your conversation with {org.name}",
            f"<p>Hi{(' ' + contact.full_name) if contact.full_name else ''},</p>"
            f"<p>Click below to pick up where you left off:</p>"
            f"<p><a href=\"{link}\">{link}</a></p>",
        )
    except Exception:  # noqa: BLE001
        logger.exception("magic link email failed")
    return {"ok": True}


@router.post("/magic-link/consume")
async def consume_magic_link(payload: WidgetMagicLinkConsumeRequest, db: AsyncSession = Depends(get_db)) -> dict:
    org = await _get_org(db, payload.org_slug)
    session_id = await magic_link.consume(payload.token)
    if session_id is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Magic link expired")
    session = (await db.execute(select(Session).where(Session.id == uuid.UUID(session_id), Session.organization_id == org.id))).scalar_one_or_none()
    if session is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    chat = (await db.execute(select(Chat).where(Chat.session_id == session.id, Chat.organization_id == org.id, Chat.status.in_(["waiting", "active", "resolved"])).order_by(Chat.created_at.desc()).limit(1))).scalar_one_or_none()
    return {
        "ok": True,
        "session_token": session.session_token,
        "chat_id": str(chat.id) if chat else None,
    }


@router.post("/offline")
async def offline_form(payload: WidgetOfflineRequest, db: AsyncSession = Depends(get_db)) -> dict:
    org = await _get_org(db, payload.org_slug)
    contact = (await db.execute(select(Contact).where(Contact.organization_id == org.id, Contact.email == payload.email))).scalar_one_or_none()
    if contact is None:
        contact = Contact(organization_id=org.id, email=payload.email, full_name=payload.name, phone=payload.phone)
        db.add(contact)
        await db.flush()
    elif payload.name and not contact.full_name:
        contact.full_name = payload.name
    ticket = await create_from_offline_form(
        db,
        org,
        email=payload.email,
        message=payload.message,
        name=payload.name or contact.full_name,
        phone=payload.phone or contact.phone,
        page_url=payload.page_url,
        contact_id=contact.id,
    )
    await db.commit()
    return {"ok": True, "ticket_id": str(ticket.id), "ticket_number": ticket.ticket_number}


@router.post("/products/search")
async def search_products(payload: WidgetProductSearchRequest, db: AsyncSession = Depends(get_db)) -> dict:
    org = await _get_org(db, payload.org_slug)
    await _get_session_or_404(db, org.id, payload.session_token)
    stmt = select(Product).where(Product.organization_id == org.id, Product.is_active.is_(True))
    if payload.sku:
        stmt = stmt.where(Product.sku == payload.sku)
    elif payload.query:
        like = f"%{payload.query.lower()}%"
        stmt = stmt.where(or_(Product.name.ilike(like), Product.description.ilike(like), Product.sku.ilike(like)))
    rows = (await db.execute(stmt.limit(payload.limit))).scalars().all()
    return {
        "items": [
            {
                "id": str(p.id),
                "sku": p.sku,
                "name": p.name,
                "description": p.description,
                "price": float(p.price) if p.price is not None else None,
                "currency": p.currency,
                "image_url": p.image_url,
                "product_url": p.product_url,
            }
            for p in rows
        ]
    }


@router.post("/kb/suggest")
async def suggest_kb(payload: WidgetKbSuggestRequest, db: AsyncSession = Depends(get_db)) -> dict:
    from app.services.kb_service import search_articles

    org = await _get_org(db, payload.org_slug)
    query = payload.query.strip()
    if not query:
        return {"items": []}

    hits = await search_articles(
        db,
        organization_id=org.id,
        query=query,
        locale=None,
        include_internal=False,
        limit=payload.limit,
    )
    if hits:
        return {
            "items": [
                {
                    "id": str(art.id),
                    "title": art.title,
                    "url": f"/kb/{payload.org_slug}/{art.slug}",
                    "summary": art.summary,
                    "snippet": snippet,
                }
                for art, _score, snippet in hits
            ]
        }

    q_lower = query.lower()
    ranked = []
    for item in KB_SUGGESTIONS:
        title = item["title"].lower()
        if q_lower in title:
            score = 0
        else:
            words = q_lower.split()
            score = sum(0 if word in title else 1 for word in words)
        ranked.append((score, item))
    ranked.sort(key=lambda row: row[0])
    return {"items": [item for _score, item in ranked[: payload.limit]]}
