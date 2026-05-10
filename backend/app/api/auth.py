from datetime import UTC, datetime, timedelta
import re
import secrets

from fastapi import APIRouter, Depends, HTTPException, status
from jose import jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.db.redis import get_redis
from app.db.session import get_db
from app.middleware.auth import ALGORITHM, create_token, decode_token, hash_password, verify_password
from app.models.organization import Organization
from app.models.user import User
from app.schemas.auth import (
    InviteAcceptRequest,
    LoginRequest,
    LogoutRequest,
    PasswordResetConfirmRequest,
    PasswordResetRequest,
    RefreshRequest,
    SignupRequest,
    TokenResponse,
)
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


@router.post("/signup", response_model=TokenResponse)
async def signup(payload: SignupRequest, db: AsyncSession = Depends(get_db)) -> TokenResponse:
    existing_user = (await db.execute(select(User).where(User.email == payload.email))).scalar_one_or_none()
    if existing_user is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email is already in use")

    slug = _slugify(payload.organization_slug or payload.organization_name)
    if len(slug) < 2:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Organization slug is invalid")
    slug = await _next_available_slug(db, slug)

    organization = Organization(name=payload.organization_name.strip(), slug=slug, plan="starter", seats=1)
    db.add(organization)
    await db.flush()

    user = User(
        organization_id=organization.id,
        email=payload.email.lower().strip(),
        full_name=payload.full_name.strip(),
        role="admin",
        password_hash=hash_password(payload.password),
        is_active=True,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

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
    if user.invite_expires_at and user.invite_expires_at < datetime.now(UTC):
        raise HTTPException(status_code=status.HTTP_410_GONE, detail="Invite expired")
    user.password_hash = hash_password(payload.password)
    user.full_name = payload.full_name or user.full_name
    user.invite_token = None
    user.invite_expires_at = None
    user.is_active = True
    await db.commit()
    return {"ok": True}


@router.post("/password/reset")
async def password_reset(payload: PasswordResetRequest, db: AsyncSession = Depends(get_db)) -> dict:
    user = (await db.execute(select(User).where(User.email == payload.email))).scalar_one_or_none()
    if user:
        token = secrets.token_urlsafe(32)
        user.invite_token = token
        user.invite_expires_at = datetime.now(UTC) + timedelta(hours=2)
        await db.commit()
        settings = get_settings()
        reset_link = f"{settings.frontend_base_url.rstrip('/')}/reset-password?token={token}"
        await send_email(
            user.email,
            "FlowLyra password reset",
            f"<p>Use this link to reset your password:</p><p><a href=\"{reset_link}\">{reset_link}</a></p><p>Or use token: <b>{token}</b></p>",
        )
    return {"ok": True}


@router.post("/password/reset/confirm")
async def password_reset_confirm(payload: PasswordResetConfirmRequest, db: AsyncSession = Depends(get_db)) -> dict:
    user = (await db.execute(select(User).where(User.invite_token == payload.token))).scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reset token not found")
    if user.invite_expires_at and user.invite_expires_at < datetime.now(UTC):
        raise HTTPException(status_code=status.HTTP_410_GONE, detail="Reset token expired")
    user.password_hash = hash_password(payload.password)
    user.invite_token = None
    user.invite_expires_at = None
    user.is_active = True
    await db.commit()
    return {"ok": True}


def _slugify(value: str) -> str:
    normalized = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return normalized[:100]


async def _next_available_slug(db: AsyncSession, base_slug: str) -> str:
    exists = (await db.execute(select(Organization.slug).where(Organization.slug == base_slug))).scalar_one_or_none()
    if exists is None:
        return base_slug
    counter = 2
    while True:
        candidate = f"{base_slug}-{counter}"[:100]
        found = (await db.execute(select(Organization.slug).where(Organization.slug == candidate))).scalar_one_or_none()
        if found is None:
            return candidate
        counter += 1
