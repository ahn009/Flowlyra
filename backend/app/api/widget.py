from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.organization import Organization
from app.models.user import User
from app.schemas.widget import WidgetInitRequest, WidgetInitResponse
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


@router.post("/init", response_model=WidgetInitResponse)
async def init_widget(payload: WidgetInitRequest, request: Request, db: AsyncSession = Depends(get_db)) -> WidgetInitResponse:
    org = (await db.execute(select(Organization).where(Organization.slug == payload.org_slug, Organization.is_active.is_(True)))).scalar_one_or_none()
    if org is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found")
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
            "custom_css": org.widget_custom_css,
        },
    )
