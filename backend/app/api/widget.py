from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.organization import Organization
from app.models.user import User
from app.schemas.widget import WidgetInitRequest, WidgetInitResponse
from app.services.chat_service import create_or_resume_session

router = APIRouter(prefix="/widget", tags=["widget"])


@router.post("/init", response_model=WidgetInitResponse)
async def init_widget(payload: WidgetInitRequest, db: AsyncSession = Depends(get_db)) -> WidgetInitResponse:
    org = (await db.execute(select(Organization).where(Organization.slug == payload.org_slug, Organization.is_active.is_(True)))).scalar_one_or_none()
    if org is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found")
    session, existing_chat = await create_or_resume_session(db, org, payload.session_token, payload.url, payload.referrer, payload.email, payload.full_name)
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
