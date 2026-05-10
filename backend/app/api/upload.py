from typing import Annotated
import uuid

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.middleware.auth import TokenUser, current_user
from app.models.chat import Chat
from app.models.organization import Organization
from app.models.session import Session
from app.services.upload_service import upload_file

router = APIRouter(prefix="/upload", tags=["upload"])


@router.post("/")
async def upload(file: Annotated[UploadFile, File()], user: Annotated[TokenUser, Depends(current_user)]) -> dict:
    return await upload_file(file, user.organization_id)


@router.post("/widget")
async def widget_upload(
    file: Annotated[UploadFile, File()],
    org_slug: Annotated[str, Form()],
    session_token: Annotated[str, Form()],
    chat_id: Annotated[str, Form()],
    db: AsyncSession = Depends(get_db),
) -> dict:
    org = (await db.execute(select(Organization).where(Organization.slug == org_slug, Organization.is_active.is_(True)))).scalar_one_or_none()
    if org is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found")
    session = (await db.execute(select(Session).where(Session.organization_id == org.id, Session.session_token == session_token))).scalar_one_or_none()
    if session is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    chat = (await db.execute(select(Chat).where(Chat.organization_id == org.id, Chat.session_id == session.id, Chat.id == uuid.UUID(chat_id)))).scalar_one_or_none()
    if chat is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chat not found")
    return await upload_file(file, org.id)
