from datetime import timedelta
import secrets

from fastapi import APIRouter, Depends, HTTPException, status
from jose import jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.db.redis import get_redis
from app.db.session import get_db
from app.middleware.auth import ALGORITHM, create_token, decode_token, hash_password, verify_password
from app.models.user import User
from app.schemas.auth import InviteAcceptRequest, LoginRequest, LogoutRequest, PasswordResetRequest, RefreshRequest, TokenResponse
from app.services.email_service import send_email

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
async def login(payload: LoginRequest, db: AsyncSession = Depends(get_db)) -> TokenResponse:
    user = (await db.execute(select(User).where(User.email == payload.email, User.is_active.is_(True)))).scalar_one_or_none()
    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    settings = get_settings()
    access_token = create_token(user, "access", timedelta(minutes=settings.access_token_expire_min))
    refresh_token = create_token(user, "refresh", timedelta(days=settings.refresh_token_expire_days))
    return TokenResponse(access_token=access_token, refresh_token=refresh_token, user=user)


@router.post("/refresh")
async def refresh(payload: RefreshRequest, db: AsyncSession = Depends(get_db)) -> dict:
    token = await decode_token(payload.refresh_token, expected_type="refresh")
    user = (await db.execute(select(User).where(User.id == token["sub"], User.is_active.is_(True)))).scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    access_token = create_token(user, "access", timedelta(minutes=get_settings().access_token_expire_min))
    return {"access_token": access_token, "token_type": "bearer"}


@router.post("/logout")
async def logout(payload: LogoutRequest) -> dict:
    decoded = jwt.decode(payload.token, get_settings().secret_key, algorithms=[ALGORITHM], options={"verify_exp": False})
    jti = decoded.get("jti")
    exp = int(decoded.get("exp", 0))
    if jti:
        ttl = max(exp - int(__import__("time").time()), 60)
        await get_redis().setex(f"blacklist:{jti}", ttl, "1")
    return {"ok": True}


@router.post("/invite/accept")
async def accept_invite(payload: InviteAcceptRequest, db: AsyncSession = Depends(get_db)) -> dict:
    user = (await db.execute(select(User).where(User.invite_token == payload.token))).scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invite not found")
    user.password_hash = hash_password(payload.password)
    user.full_name = payload.full_name or user.full_name
    user.invite_token = None
    user.is_active = True
    await db.commit()
    return {"ok": True}


@router.post("/password/reset")
async def password_reset(payload: PasswordResetRequest, db: AsyncSession = Depends(get_db)) -> dict:
    user = (await db.execute(select(User).where(User.email == payload.email))).scalar_one_or_none()
    if user:
        token = secrets.token_urlsafe(32)
        user.invite_token = token
        await db.commit()
        await send_email(user.email, "FlowLyra password reset", f"<p>Use this token to reset your password: <b>{token}</b></p>")
    return {"ok": True}
