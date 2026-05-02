from typing import Annotated

from fastapi import APIRouter, Depends, File, UploadFile

from app.middleware.auth import TokenUser, current_user
from app.services.upload_service import upload_file

router = APIRouter(prefix="/upload", tags=["upload"])


@router.post("/")
async def upload(file: Annotated[UploadFile, File()], user: Annotated[TokenUser, Depends(current_user)]) -> dict:
    return await upload_file(file, user.organization_id)
