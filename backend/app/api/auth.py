from datetime import UTC, datetime, timedelta
from typing import Annotated
import re
import secrets

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from jose import jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.db.redis import get_redis, ns
from app.db.session import get_db
from app.middleware.auth import (
    ALGORITHM,
    TokenUser,
    create_token,
    current_user,
    hash_password,
    verify_password,
)
from app.models.organization import Organization
from app.models.user import User
from app.models.workspace_membership import WorkspaceMembership
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
from app.services.audit_service import record as audit_record
from app.services.auth_lockout import ensure_not_locked, register_failure, register_success
from app.services.email_service import send_email
from app.services.email_templates import render as render_template
from app.services.password_policy import validate as validate_password
from app.services.permissions import resolve_permissions
from app.services.refresh_token_service import issue as issue_refresh, rotate as rotate_refresh, revoke_family_for_user

router = APIRouter(prefix="/auth", tags=["auth"])


def _set_auth_cookies(response: Response, *, access_token: str, refresh_token: str, secure: bool) -> None:
    settings = get_settings()
    response.set_cookie(
        "flowlyra_access",
        access_token,
        httponly=True,
        samesite="lax",
        secure=secure,
        max_age=settings.access_token_expire_min * 60,
        path="/",
    )
    response.set_cookie(
        "flowlyra_refresh",
        refresh_token,
        httponly=True,
        samesite="lax",
        secure=secure,
        max_age=settings.refresh_token_expire_days * 86400,
        path="/api/v1/auth",
    )


def _clear_auth_cookies(response: Response) -> None:
    response.delete_cookie("flowlyra_access", path="/")
    response.delete_cookie("flowlyra_refresh", path="/api/v1/auth")


@router.post("/login", response_model=TokenResponse)
async def login(payload: LoginRequest, request: Request, response: Response, db: AsyncSession = Depends(get_db)) -> TokenResponse:
    ip = request.client.host if request.client else None
    user = (await db.execute(select(User).where(User.email == payload.email))).scalar_one_or_none()
    if user is None or not user.is_active or user.deleted_at is not None:
        await register_failure(db, None, ip_address=ip)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    await ensure_not_locked(user)
    if not verify_password(payload.password, user.password_hash):
        await register_failure(db, user, ip_address=ip)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    await register_success(db, user)
    settings = get_settings()
    access_token = create_token(user, "access", timedelta(minutes=settings.access_token_expire_min))
    refresh_token = await issue_refresh(db, user, user_agent=request.headers.get("user-agent"), ip_address=ip)
    await db.commit()
    await audit_record(
        organization_id=user.organization_id,
        actor_user_id=user.id,
        actor_email=user.email,
        event="auth.login",
        ip_address=ip,
        user_agent=request.headers.get("user-agent"),
    )
    if settings.use_cookie_auth:
        _set_auth_cookies(response, access_token=access_token, refresh_token=refresh_token, secure=request.url.scheme == "https")
    return TokenResponse(access_token=access_token, refresh_token=refresh_token, user=user)


@router.post("/signup", response_model=TokenResponse)
async def signup(payload: SignupRequest, request: Request, response: Response, db: AsyncSession = Depends(get_db)) -> TokenResponse:
    validate_password(payload.password)
    existing_user = (await db.execute(select(User).where(User.email == payload.email))).scalar_one_or_none()
    if existing_user is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email is already in use")

    slug = _slugify(payload.organization_slug or payload.organization_name)
    if len(slug) < 2:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Organization slug is invalid")
    slug = await _next_available_slug(db, slug)

    organization = Organization(
        name=payload.organization_name.strip(),
        slug=slug,
        plan="starter",
        seats=3,
        trial_ends_at=datetime.now(UTC) + timedelta(days=14),
    )
    db.add(organization)
    await db.flush()

    user = User(
        organization_id=organization.id,
        email=payload.email.lower().strip(),
        full_name=payload.full_name.strip(),
        role="owner",
        password_hash=hash_password(payload.password),
        password_changed_at=datetime.now(UTC),
        is_active=True,
    )
    db.add(user)
    await db.flush()
    db.add(
        WorkspaceMembership(
            user_id=user.id,
            organization_id=organization.id,
            role="owner",
            is_primary=True,
        )
    )
    settings = get_settings()
    access_token = create_token(user, "access", timedelta(minutes=settings.access_token_expire_min))
    refresh_token = await issue_refresh(
        db,
        user,
        user_agent=request.headers.get("user-agent"),
        ip_address=request.client.host if request.client else None,
    )
    await audit_record(
        organization_id=organization.id,
        actor_user_id=user.id,
        actor_email=user.email,
        event="auth.signup",
        ip_address=request.client.host if request.client else None,
        db=db,
    )
    await db.commit()
    await db.refresh(user)
    if settings.use_cookie_auth:
        _set_auth_cookies(response, access_token=access_token, refresh_token=refresh_token, secure=request.url.scheme == "https")
    return TokenResponse(access_token=access_token, refresh_token=refresh_token, user=user)


@router.post("/refresh")
async def refresh(payload: RefreshRequest | None, request: Request, response: Response, db: AsyncSession = Depends(get_db)) -> dict:
    refresh_token = (payload.refresh_token if payload else None) or request.cookies.get("flowlyra_refresh")
    if not refresh_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token missing")
    new_refresh, user = await rotate_refresh(
        db,
        refresh_token,
        user_agent=request.headers.get("user-agent"),
        ip_address=request.client.host if request.client else None,
    )
    settings = get_settings()
    access_token = create_token(user, "access", timedelta(minutes=settings.access_token_expire_min))
    await db.commit()
    if settings.use_cookie_auth:
        _set_auth_cookies(response, access_token=access_token, refresh_token=new_refresh, secure=request.url.scheme == "https")
    return {"access_token": access_token, "refresh_token": new_refresh, "token_type": "bearer"}


@router.post("/logout")
async def logout(payload: LogoutRequest | None, request: Request, response: Response, db: AsyncSession = Depends(get_db)) -> dict:
    settings = get_settings()
    target_token = (payload.token if payload else None) or request.cookies.get("flowlyra_access")
    if target_token:
        decoded = jwt.decode(target_token, settings.secret_key, algorithms=[ALGORITHM], options={"verify_exp": False})
        jti = decoded.get("jti")
        exp = int(decoded.get("exp", 0))
        if jti:
            ttl = max(exp - int(__import__("time").time()), 60)
            await get_redis().setex(ns("blacklist", str(jti)), ttl, "1")
        if decoded.get("sub"):
            try:
                import uuid

                await revoke_family_for_user(db, uuid.UUID(decoded["sub"]))
                await db.commit()
            except Exception:  # noqa: BLE001
                pass
    _clear_auth_cookies(response)
    return {"ok": True}


@router.get("/me")
async def me(user: Annotated[TokenUser, Depends(current_user)], db: AsyncSession = Depends(get_db)) -> dict:
    db_user = (await db.execute(select(User).where(User.id == user.id))).scalar_one()
    org = (await db.execute(select(Organization).where(Organization.id == user.organization_id))).scalar_one()
    permissions = sorted(resolve_permissions(user.role, user.granted_permissions, user.denied_permissions))
    return {
        "user": {
            "id": str(db_user.id),
            "email": db_user.email,
            "full_name": db_user.full_name,
            "avatar_url": db_user.avatar_url,
            "role": user.role,
            "status": db_user.status,
            "is_online": db_user.is_online,
            "two_factor_enabled": db_user.two_factor_enabled,
            "last_seen_at": db_user.last_seen_at.isoformat() if db_user.last_seen_at else None,
        },
        "organization": {
            "id": str(org.id),
            "name": org.name,
            "slug": org.slug,
            "plan": org.plan,
            "trial_ends_at": org.trial_ends_at.isoformat() if org.trial_ends_at else None,
            "locale_default": org.locale_default,
            "timezone": org.timezone,
            "enforce_two_factor": org.enforce_two_factor,
        },
        "permissions": permissions,
    }


@router.post("/invite/accept")
async def accept_invite(payload: InviteAcceptRequest, db: AsyncSession = Depends(get_db)) -> dict:
    validate_password(payload.password)
    user = (await db.execute(select(User).where(User.invite_token == payload.token))).scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invite not found")
    if user.invite_expires_at and user.invite_expires_at < datetime.now(UTC):
        raise HTTPException(status_code=status.HTTP_410_GONE, detail="Invite expired")
    user.password_hash = hash_password(payload.password)
    user.password_changed_at = datetime.now(UTC)
    user.full_name = payload.full_name or user.full_name
    user.invite_token = None
    user.invite_expires_at = None
    user.is_active = True
    existing = (
        await db.execute(
            select(WorkspaceMembership).where(
                WorkspaceMembership.user_id == user.id,
                WorkspaceMembership.organization_id == user.organization_id,
            )
        )
    ).scalar_one_or_none()
    if existing is None:
        db.add(WorkspaceMembership(user_id=user.id, organization_id=user.organization_id, role=user.role, is_primary=True))
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
        subject, html = render_template("password_reset", {"reset_url": reset_link})
        await send_email(user.email, subject, html)
    return {"ok": True}


@router.post("/password/reset/confirm")
async def password_reset_confirm(payload: PasswordResetConfirmRequest, db: AsyncSession = Depends(get_db)) -> dict:
    validate_password(payload.password)
    user = (await db.execute(select(User).where(User.invite_token == payload.token))).scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reset token not found")
    if user.invite_expires_at and user.invite_expires_at < datetime.now(UTC):
        raise HTTPException(status_code=status.HTTP_410_GONE, detail="Reset token expired")
    user.password_hash = hash_password(payload.password)
    user.password_changed_at = datetime.now(UTC)
    user.invite_token = None
    user.invite_expires_at = None
    user.is_active = True
    user.failed_login_count = 0
    user.locked_until = None
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
