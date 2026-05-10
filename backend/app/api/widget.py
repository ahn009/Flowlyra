from urllib.parse import urlparse
import uuid

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.chat import Chat
from app.models.message import Message
from app.models.organization import Organization
from app.models.session import Session
from app.models.user import User
from app.schemas.widget import WidgetHistoryRequest, WidgetHistoryResponse, WidgetInitRequest, WidgetInitResponse
from app.services.chat_service import create_or_resume_session

router = APIRouter(prefix="/widget", tags=["widget"])


def client_ip_from_request(request: Request) -> str | None:
    """Return the real visitor IP, including when behind a proxy/CDN.

    In production the API is normally behind nginx, Railway, Cloudflare,
    Fly, etc.  ``request.client.host`` is then the proxy IP, not the
    website visitor.  Prefer standard forwarding headers and fall back to
    the socket peer address.
    """
    for header_name in ("cf-connecting-ip", "x-real-ip", "x-forwarded-for"):
        value = request.headers.get(header_name)
        if not value:
            continue
        # X-Forwarded-For is a comma-separated chain. The left-most IP is
        # the original client according to the de-facto standard.
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


def _message_payload(message: Message) -> dict:
    return {
        "id": str(message.id),
        "chat_id": str(message.chat_id),
        "sender_type": message.sender_type,
        "content": message.content,
        "content_type": message.content_type,
        "file_url": message.file_url,
        "file_name": message.file_name,
        "is_internal": message.is_internal,
        "created_at": message.created_at.isoformat(),
    }


@router.post("/init", response_model=WidgetInitResponse)
async def init_widget(payload: WidgetInitRequest, request: Request, db: AsyncSession = Depends(get_db)) -> WidgetInitResponse:
    org = (await db.execute(select(Organization).where(Organization.slug == payload.org_slug, Organization.is_active.is_(True)))).scalar_one_or_none()
    if org is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found")
    if not _domain_allowed(_hostname(payload.url) or _hostname(request.headers.get("origin")) or _hostname(request.headers.get("referer")), org.widget_domain_allowlist):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Widget is not allowed on this domain")
    client_ip = client_ip_from_request(request)
    session, existing_chat = await create_or_resume_session(
        db,
        org,
        payload.session_token,
        payload.url,
        payload.referrer,
        payload.email,
        payload.full_name,
        client_ip,
    )
    is_online = bool(await db.scalar(select(User.id).where(User.organization_id == org.id, User.is_online.is_(True)).limit(1)))
    await db.commit()
    return WidgetInitResponse(
        organization_id=str(org.id),
        session_token=session.session_token,
        existing_chat_id=str(existing_chat.id) if existing_chat else None,
        is_online=is_online,
        widget_config={
            "color": org.widget_color,
            "greeting": org.widget_greeting,
            "logo_url": org.widget_logo_url,
            "position": org.widget_position,
            "theme": org.widget_theme,
            "pre_chat_form": org.widget_pre_chat_form,
            "post_chat_survey": org.widget_post_chat_survey,
            "custom_css": org.widget_custom_css,
        },
    )


@router.post("/history", response_model=WidgetHistoryResponse)
async def widget_history(payload: WidgetHistoryRequest, db: AsyncSession = Depends(get_db)) -> WidgetHistoryResponse:
    org = (await db.execute(select(Organization).where(Organization.slug == payload.org_slug, Organization.is_active.is_(True)))).scalar_one_or_none()
    if org is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found")
    session = (await db.execute(select(Session).where(Session.organization_id == org.id, Session.session_token == payload.session_token))).scalar_one_or_none()
    if session is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    chat = (
        await db.execute(select(Chat).where(Chat.id == uuid.UUID(payload.chat_id), Chat.organization_id == org.id, Chat.session_id == session.id))
    ).scalar_one_or_none()
    if chat is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chat not found")
    messages = (
        await db.execute(select(Message).where(Message.chat_id == chat.id, Message.is_internal.is_(False)).order_by(Message.created_at.asc()).limit(200))
    ).scalars().all()
    return WidgetHistoryResponse(messages=[_message_payload(message) for message in messages])
