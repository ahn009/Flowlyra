from datetime import UTC, datetime
from urllib.parse import urlparse
import logging
import random
import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.db.session import get_db
from app.models.analytics_event import AnalyticsEvent
from app.models.chat import Chat
from app.models.chat_widget import ChatWidget
from app.models.contact import Contact
from app.models.engage import Goal, GoalAchievement
from app.models.message import Message
from app.models.organization import Organization
from app.models.ecommerce import Order
from app.models.proactive_trigger import ProactiveTrigger
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
    WidgetCatalogRequest,
    WidgetCheckoutAssistRequest,
    WidgetOfflineRequest,
    WidgetOrderLookupRequest,
    WidgetPageViewRequest,
    WidgetPriceFormatRequest,
    WidgetProductSearchRequest,
    WidgetTrackEventRequest,
)
from app.services.chat_service import create_or_resume_session
from app.services.email_service import send_email
from app.services import magic_link
from app.services.offline_ticket import create_from_offline_form
from app.services.operating_hours import is_open, next_open_at
from app.services.sales_service import contact_scores
from app.services.webhook_events import CONTACT_CREATED, CONTACT_UPDATED, GOAL_ACHIEVED, VISITOR_IDENTIFIED
from app.services.webhook_service import dispatch_event
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


def _ice_servers_config() -> list[dict[str, Any]]:
    settings = get_settings()
    servers: list[dict[str, Any]] = []
    for url in settings.webrtc_stun_urls.split(","):
        u = url.strip()
        if u:
            servers.append({"urls": u})
    if settings.webrtc_turn_url:
        turn: dict[str, Any] = {"urls": settings.webrtc_turn_url}
        if settings.webrtc_turn_username:
            turn["username"] = settings.webrtc_turn_username
        if settings.webrtc_turn_credential:
            turn["credential"] = settings.webrtc_turn_credential
        servers.append(turn)
    if not servers:
        servers = [{"urls": "stun:stun.l.google.com:19302"}]
    return servers


@router.get("/ice-servers")
async def ice_servers() -> dict:
    """Return WebRTC ICE server configuration for voice/video/screen-sharing."""
    return {"ice_servers": _ice_servers_config()}


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
        "captcha": {
            "enabled": bool(org.captcha_enabled),
            "provider": org.captcha_provider or "hcaptcha",
            "site_key": (
                get_settings().hcaptcha_site_key
                if (org.captcha_provider or "hcaptcha") == "hcaptcha"
                else get_settings().recaptcha_site_key
            ),
        },
        "cookie_consent": org.cookie_consent or {"enabled": False, "text": None},
        "inactivity_message": org.widget_inactivity_message or {"enabled": False, "delay_seconds": 60, "text": "Still there?"},
        "voice_video_enabled": bool(org.widget_voice_video_enabled),
        "ice_servers": _ice_servers_config(),
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
    from app.services.visitor_bans import is_visitor_banned
    from app.services.captcha import verify_captcha_token

    if await is_visitor_banned(db, org.id, ip=client_ip, session_token=payload.session_token):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    if org.captcha_enabled:
        captcha_token = (payload.visitor or {}).get("captcha_token") if payload.visitor else None
        if not captcha_token or not await verify_captcha_token(org, captcha_token, remote_ip=client_ip):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Captcha verification required")
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
        ice_servers=_ice_servers_config(),
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
    created = False
    if contact is None and (payload.email or payload.name):
        contact = Contact(organization_id=org.id, email=payload.email, full_name=payload.name)
        db.add(contact)
        await db.flush()
        created = True
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
    await dispatch_event(
        organization_id=org.id,
        event=VISITOR_IDENTIFIED,
        payload={
            "session_id": str(session.id),
            "contact_id": str(contact.id) if contact else None,
            "email": contact.email if contact else None,
            "name": contact.full_name if contact else None,
        },
        db=db,
    )
    if contact is not None:
        await dispatch_event(
            organization_id=org.id,
            event=CONTACT_CREATED if created else CONTACT_UPDATED,
            payload={
                "contact_id": str(contact.id),
                "email": contact.email,
                "full_name": contact.full_name,
                "phone": contact.phone,
            },
            db=db,
        )
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
    properties = dict(payload.properties or {})
    campaign_id_raw = properties.get("campaign_id")
    campaign_id: uuid.UUID | None = None
    if campaign_id_raw:
        try:
            campaign_id = uuid.UUID(str(campaign_id_raw))
        except ValueError:
            campaign_id = None
    event = AnalyticsEvent(
        organization_id=org.id,
        event_type=payload.event,
        contact_id=session.contact_id,
        metadata_={
            "session_id": str(session.id),
            "value": payload.value,
            "properties": properties,
            "campaign_id": str(campaign_id) if campaign_id else None,
            "url": session.current_url,
        },
    )
    db.add(event)
    if payload.event == "campaign.sent" and campaign_id:
        trigger = (
            await db.execute(
                select(ProactiveTrigger).where(ProactiveTrigger.id == campaign_id, ProactiveTrigger.organization_id == org.id)
            )
        ).scalar_one_or_none()
        if trigger is not None:
            trigger.sent_count = (trigger.sent_count or 0) + 1

    goal_name = None
    if payload.event.startswith("goal:"):
        goal_name = payload.event.split(":", 1)[1].strip()
    elif payload.event.startswith("event:"):
        goal_name = payload.event.split(":", 1)[1].strip()
    elif payload.event == "goal.achieved":
        goal_name = str(properties.get("goal_name") or properties.get("goal") or "").strip() or None
    if goal_name:
        goal = (
            await db.execute(
                select(Goal).where(
                    Goal.organization_id == org.id,
                    Goal.is_active.is_(True),
                    or_(Goal.name.ilike(goal_name), Goal.event_name.ilike(goal_name)),
                )
            )
        ).scalars().first()
        if goal is not None:
            chat_id: uuid.UUID | None = None
            chat_id_raw = properties.get("chat_id")
            if chat_id_raw:
                try:
                    chat_id = uuid.UUID(str(chat_id_raw))
                except ValueError:
                    chat_id = None
            db.add(
                GoalAchievement(
                    organization_id=org.id,
                    goal_id=goal.id,
                    session_id=session.id,
                    chat_id=chat_id,
                    campaign_id=campaign_id,
                    value=payload.value if payload.value is not None else goal.default_value,
                    metadata_={"event": payload.event, "properties": properties},
                )
            )
            await dispatch_event(
                organization_id=org.id,
                event=GOAL_ACHIEVED,
                payload={
                    "goal_id": str(goal.id),
                    "goal_name": goal.name,
                    "session_id": str(session.id),
                    "chat_id": str(chat_id) if chat_id else None,
                    "campaign_id": str(campaign_id) if campaign_id else None,
                    "value": payload.value if payload.value is not None else float(goal.default_value or 0),
                },
                db=db,
            )
    await db.commit()
    return {"ok": True, "event_id": str(event.id)}


@router.post("/pageview")
async def pageview(payload: WidgetPageViewRequest, db: AsyncSession = Depends(get_db)) -> dict:
    org = await _get_org(db, payload.org_slug)
    session = await _get_session_or_404(db, org.id, payload.session_token)
    session.current_url = payload.url
    session.page_views = int(session.page_views or 0) + 1
    history = list((session.page_history or {}).get("items") or [])
    history.append({"url": payload.url, "title": payload.title, "ts": datetime.now(UTC).isoformat()})
    session.page_history = {"items": history[-100:]}
    db.add(
        AnalyticsEvent(
            organization_id=org.id,
            event_type="page.view",
            contact_id=session.contact_id,
            metadata_={"session_id": str(session.id), "url": payload.url, "title": payload.title},
        )
    )
    await db.commit()
    return {"ok": True}


@router.post("/triggers")
async def widget_triggers(payload: dict, db: AsyncSession = Depends(get_db)) -> dict:
    org_slug = str(payload.get("org_slug") or "")
    session_token = str(payload.get("session_token") or "")
    org = await _get_org(db, org_slug)
    session = await _get_session_or_404(db, org.id, session_token)
    rows = (
        await db.execute(
            select(ProactiveTrigger)
            .where(ProactiveTrigger.organization_id == org.id, ProactiveTrigger.is_active.is_(True))
            .order_by(ProactiveTrigger.created_at.asc())
        )
    ).scalars().all()
    return {
        "items": [
            {
                "id": str(row.id),
                "name": row.name,
                "trigger_type": row.trigger_type,
                "conditions": row.conditions or {},
                "message": row.message,
                "sent_count": row.sent_count,
                "is_returning": bool((session.page_views or 0) > 1),
            }
            for row in rows
        ]
    }


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


@router.post("/catalog")
async def browse_catalog(payload: WidgetCatalogRequest, db: AsyncSession = Depends(get_db)) -> dict:
    org = await _get_org(db, payload.org_slug)
    session = await _get_session_or_404(db, org.id, payload.session_token)
    stmt = select(Product).where(Product.organization_id == org.id, Product.is_active.is_(True))
    if payload.query:
        like = f"%{payload.query.lower()}%"
        stmt = stmt.where(or_(Product.name.ilike(like), Product.description.ilike(like), Product.sku.ilike(like), Product.category.ilike(like)))
    if payload.category:
        stmt = stmt.where(Product.category.ilike(payload.category.strip()))
    if payload.cursor:
        try:
            cursor_dt = datetime.fromisoformat(payload.cursor)
            stmt = stmt.where(Product.updated_at < cursor_dt)
        except ValueError:
            pass
    rows = (await db.execute(stmt.order_by(Product.updated_at.desc()).limit(payload.limit))).scalars().all()
    next_cursor = rows[-1].updated_at.isoformat() if rows and rows[-1].updated_at else None
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
                "category": p.category,
                "brand": p.brand,
                "inventory": p.inventory,
                "is_in_stock": p.is_in_stock,
            }
            for p in rows
        ],
        "next_cursor": next_cursor,
        "session_id": str(session.id),
    }


@router.post("/orders/lookup")
async def widget_order_lookup(payload: WidgetOrderLookupRequest, db: AsyncSession = Depends(get_db)) -> dict:
    org = await _get_org(db, payload.org_slug)
    session = await _get_session_or_404(db, org.id, payload.session_token)

    lookup_email = payload.email
    if lookup_email is None and session.contact_id:
        contact = (await db.execute(select(Contact).where(Contact.id == session.contact_id, Contact.organization_id == org.id))).scalar_one_or_none()
        if contact and contact.email:
            lookup_email = contact.email

    stmt = select(Order).where(Order.organization_id == org.id)
    if payload.order_number:
        stmt = stmt.where(Order.order_number == payload.order_number)
    elif lookup_email:
        stmt = stmt.where(Order.email == lookup_email)
    else:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="order_number or email required")

    rows = (await db.execute(stmt.order_by(Order.placed_at.desc().nullslast(), Order.created_at.desc()).limit(payload.limit))).scalars().all()
    return {
        "items": [
            {
                "order_number": row.order_number,
                "status": row.status,
                "currency": row.currency,
                "total": float(row.total or 0),
                "placed_at": row.placed_at.isoformat() if row.placed_at else None,
                "fulfilled_at": row.fulfilled_at.isoformat() if row.fulfilled_at else None,
                "cancelled_at": row.cancelled_at.isoformat() if row.cancelled_at else None,
            }
            for row in rows
        ],
        "email": lookup_email,
    }


@router.post("/checkout-assist")
async def widget_checkout_assist(payload: WidgetCheckoutAssistRequest, db: AsyncSession = Depends(get_db)) -> dict:
    org = await _get_org(db, payload.org_slug)
    session = await _get_session_or_404(db, org.id, payload.session_token)
    score_payload = {"lead_score": 0.0, "churn_risk": 0.0, "reasons": []}
    if session.contact_id:
        score_payload = await contact_scores(db, organization_id=org.id, contact_id=session.contact_id)
    return {
        "ok": True,
        "message": "Checkout assist is available. Ask about shipping, payment methods, returns, or coupons.",
        "quick_replies": [
            {"label": "Shipping options", "payload": "What shipping options do you have?"},
            {"label": "Payment methods", "payload": "Which payment methods do you accept?"},
            {"label": "Apply coupon", "payload": "How can I apply my coupon code?"},
            {"label": "Track my order", "payload": "Track order"},
        ],
        "lead_score": score_payload.get("lead_score"),
    }


@router.post("/currency/format")
async def widget_currency_format(payload: WidgetPriceFormatRequest, db: AsyncSession = Depends(get_db)) -> dict:
    org = await _get_org(db, payload.org_slug)
    session = await _get_session_or_404(db, org.id, payload.session_token)
    locale = payload.locale or session.locale or org.widget_default_locale or "en"
    return {
        "formatted": f"{payload.currency.upper()} {payload.amount:,.2f}",
        "currency": payload.currency.upper(),
        "amount": payload.amount,
        "locale": locale,
    }


@router.post("/chatbot/start")
async def chatbot_start(
    request: Request,
    payload: dict,
    db: AsyncSession = Depends(get_db),
) -> dict:
    from app.services import chatbot_service
    from app.models.chatbot import ChatbotSession

    org_slug = payload.get("org_slug")
    session_token = payload.get("session_token")
    page_url = payload.get("page_url")
    widget_id_raw = payload.get("widget_id")
    if not org_slug or not session_token:
        raise HTTPException(400, "org_slug and session_token required")
    org = await _get_org(db, org_slug)
    sess = await _get_session_or_404(db, org.id, session_token)
    widget_uuid = uuid.UUID(widget_id_raw) if widget_id_raw else None
    chat = (
        await db.execute(
            select(Chat).where(Chat.session_id == sess.id, Chat.organization_id == org.id)
            .order_by(Chat.created_at.desc())
        )
    ).scalars().first()
    if not chat:
        chat = Chat(organization_id=org.id, session_id=sess.id, status="waiting", channel="web")
        db.add(chat)
        await db.flush()
    flow = await chatbot_service.find_active_flow(db, org.id, widget_id=widget_uuid, url=page_url)
    if not flow:
        await db.commit()
        return {"active": False, "chat_id": str(chat.id)}
    bot_session = await chatbot_service.start_session(db, flow=flow, chat=chat)
    outputs = await chatbot_service.advance(db, bot_session, None)
    await db.commit()
    return {
        "active": True,
        "chat_id": str(chat.id),
        "session_id": str(bot_session.id),
        "flow_id": str(flow.id),
        "messages": outputs,
        "completed": bot_session.completed,
        "handed_off": bot_session.handed_off,
    }


@router.post("/chatbot/message")
async def chatbot_message(
    payload: dict,
    db: AsyncSession = Depends(get_db),
) -> dict:
    from app.services import chatbot_service
    from app.models.chatbot import ChatbotSession

    session_id = payload.get("session_id")
    text = (payload.get("text") or "").strip()
    if not session_id:
        raise HTTPException(400, "session_id required")
    bot_session = (
        await db.execute(select(ChatbotSession).where(ChatbotSession.id == uuid.UUID(session_id)))
    ).scalar_one_or_none()
    if not bot_session:
        raise HTTPException(404, "session not found")
    if bot_session.status != "active":
        return {"completed": bot_session.completed, "handed_off": bot_session.handed_off, "messages": []}
    outputs = await chatbot_service.advance(db, bot_session, text)
    await db.commit()
    return {
        "messages": outputs,
        "completed": bot_session.completed,
        "handed_off": bot_session.handed_off,
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
