from datetime import UTC, datetime, timedelta
from typing import Annotated
import re
import secrets

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response, status
from fastapi.responses import RedirectResponse
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
from app.models.security import OAuthIdentity, SsoConfig
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
    TwoFactorBackupCodesResponse,
    TwoFactorChallengeRequest,
    TwoFactorChallengeRequiredResponse,
    TwoFactorDisableRequest,
    TwoFactorSetupResponse,
    TwoFactorVerifyRequest,
)
from app.services.audit_service import record as audit_record
from app.services.auth_lockout import ensure_not_locked, register_failure, register_success
from app.services.email_service import send_email
from app.services.email_templates import render as render_template
from app.services.ip_allowlist import enforce_ip_allowlist
from app.services.password_policy import validate as validate_password
from app.services.permissions import resolve_permissions
from app.services.refresh_token_service import issue as issue_refresh, rotate as rotate_refresh, revoke_family_for_user
from app.services.security_events import record_event as record_security_event
from app.services import oauth_service, saml_service, twofa_service
from app.services.twofa_challenge import consume_challenge, issue_challenge

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


def _client_ip(request: Request) -> str | None:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    if request.client:
        return request.client.host
    return None


async def _finalize_login(
    db: AsyncSession,
    response: Response,
    request: Request,
    user: User,
    *,
    method: str = "password",
) -> dict:
    settings = get_settings()
    ip = _client_ip(request)
    user_agent = request.headers.get("user-agent")
    await register_success(db, user)
    access_token = create_token(user, "access", timedelta(minutes=settings.access_token_expire_min))
    refresh_token = await issue_refresh(db, user, user_agent=user_agent, ip_address=ip)
    await db.commit()
    await audit_record(
        organization_id=user.organization_id,
        actor_user_id=user.id,
        actor_email=user.email,
        event=f"auth.login.{method}",
        ip_address=ip,
        user_agent=user_agent,
    )
    if settings.use_cookie_auth:
        _set_auth_cookies(response, access_token=access_token, refresh_token=refresh_token, secure=request.url.scheme == "https")
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "organization_id": user.organization_id,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role,
            "status": user.status,
        },
    }


@router.post("/login")
async def login(payload: LoginRequest, request: Request, response: Response, db: AsyncSession = Depends(get_db)) -> dict:
    ip = _client_ip(request)
    user_agent = request.headers.get("user-agent")
    user = (await db.execute(select(User).where(User.email == payload.email))).scalar_one_or_none()
    if user is None or not user.is_active or user.deleted_at is not None:
        await register_failure(db, None, ip_address=ip)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    await ensure_not_locked(user)
    if not verify_password(payload.password, user.password_hash):
        await register_failure(db, user, ip_address=ip)
        await record_security_event(
            db,
            organization_id=user.organization_id,
            user_id=user.id,
            event="auth.password_failure",
            severity="info",
            ip_address=ip,
            user_agent=user_agent,
        )
        await db.commit()
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    # Enforce IP allowlist
    from app.services.ip_allowlist import assert_ip_allowed

    try:
        await assert_ip_allowed(db, user.organization_id, ip)
    except HTTPException:
        await record_security_event(
            db,
            organization_id=user.organization_id,
            user_id=user.id,
            event="auth.ip_blocked",
            severity="warning",
            ip_address=ip,
            user_agent=user_agent,
        )
        await db.commit()
        raise

    org = (await db.execute(select(Organization).where(Organization.id == user.organization_id))).scalar_one()

    # 2FA enforcement: if org requires 2FA but user not enrolled, force setup-only login path
    requires_2fa = user.two_factor_enabled or org.enforce_two_factor

    if user.two_factor_enabled:
        # If inline TOTP/backup provided, verify and finalize; else issue challenge token.
        if payload.totp_code and twofa_service.verify_totp(user.two_factor_secret or "", payload.totp_code):
            return await _finalize_login(db, response, request, user, method="password+totp")
        if payload.backup_code and await twofa_service.consume_backup_code(db, user.id, payload.backup_code):
            await db.commit()
            return await _finalize_login(db, response, request, user, method="password+backup")
        challenge_token = await issue_challenge(user.id, ip=ip, user_agent=user_agent)
        await db.commit()
        return {
            "challenge_token": challenge_token,
            "methods": ["totp", "backup_code"],
            "token_type": "challenge",
        }

    if requires_2fa and not user.two_factor_enabled:
        # Org policy demands 2FA; allow login but mark response so client routes to /2fa/setup.
        result = await _finalize_login(db, response, request, user, method="password")
        result["must_enroll_2fa"] = True
        return result

    return await _finalize_login(db, response, request, user, method="password")


@router.post("/2fa/challenge")
async def two_factor_challenge(
    payload: TwoFactorChallengeRequest,
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
) -> dict:
    if not payload.code and not payload.backup_code:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="code or backup_code required")
    challenge = await consume_challenge(payload.challenge_token)
    if not challenge:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Challenge expired or invalid")
    import uuid as _uuid

    user = (await db.execute(select(User).where(User.id == _uuid.UUID(challenge["user_id"])))).scalar_one_or_none()
    if user is None or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid user")
    ok = False
    method = "password"
    if payload.code and twofa_service.verify_totp(user.two_factor_secret or "", payload.code):
        ok = True
        method = "password+totp"
    elif payload.backup_code and await twofa_service.consume_backup_code(db, user.id, payload.backup_code):
        ok = True
        method = "password+backup"
    if not ok:
        await record_security_event(
            db,
            organization_id=user.organization_id,
            user_id=user.id,
            event="auth.2fa_failure",
            severity="warning",
            ip_address=_client_ip(request),
        )
        await db.commit()
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid 2FA code")
    return await _finalize_login(db, response, request, user, method=method)


@router.post("/2fa/setup", response_model=TwoFactorSetupResponse)
async def two_factor_setup(
    user_token: Annotated[TokenUser, Depends(current_user)],
    db: AsyncSession = Depends(get_db),
) -> TwoFactorSetupResponse:
    user = (await db.execute(select(User).where(User.id == user_token.id))).scalar_one()
    if user.two_factor_enabled:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="2FA already enabled")
    secret = twofa_service.generate_secret()
    user.two_factor_secret = secret
    await db.commit()
    uri = twofa_service.provisioning_uri(secret, user.email)
    return TwoFactorSetupResponse(secret=secret, otpauth_uri=uri, qr_data_uri=twofa_service.qr_data_uri(uri))


@router.post("/2fa/verify", response_model=TwoFactorBackupCodesResponse)
async def two_factor_verify(
    payload: TwoFactorVerifyRequest,
    user_token: Annotated[TokenUser, Depends(current_user)],
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> TwoFactorBackupCodesResponse:
    user = (await db.execute(select(User).where(User.id == user_token.id))).scalar_one()
    if not user.two_factor_secret:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Run /2fa/setup first")
    if not twofa_service.verify_totp(user.two_factor_secret, payload.code):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid code")
    twofa_service.stamp_user_enrolled(user)
    codes = twofa_service.generate_backup_codes()
    await twofa_service.persist_backup_codes(db, user.id, codes)
    await record_security_event(
        db,
        organization_id=user.organization_id,
        user_id=user.id,
        event="auth.2fa_enabled",
        severity="info",
        ip_address=_client_ip(request),
    )
    await db.commit()
    return TwoFactorBackupCodesResponse(codes=codes)


@router.post("/2fa/regenerate-backup-codes", response_model=TwoFactorBackupCodesResponse)
async def two_factor_regenerate(
    user_token: Annotated[TokenUser, Depends(current_user)],
    db: AsyncSession = Depends(get_db),
) -> TwoFactorBackupCodesResponse:
    user = (await db.execute(select(User).where(User.id == user_token.id))).scalar_one()
    if not user.two_factor_enabled:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="2FA not enabled")
    codes = twofa_service.generate_backup_codes()
    await twofa_service.persist_backup_codes(db, user.id, codes)
    user.backup_codes_generated_at = datetime.now(UTC)
    await db.commit()
    return TwoFactorBackupCodesResponse(codes=codes)


@router.post("/2fa/disable")
async def two_factor_disable(
    payload: TwoFactorDisableRequest,
    user_token: Annotated[TokenUser, Depends(current_user)],
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> dict:
    user = (await db.execute(select(User).where(User.id == user_token.id))).scalar_one()
    org = (await db.execute(select(Organization).where(Organization.id == user.organization_id))).scalar_one()
    if org.enforce_two_factor:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Organization policy requires 2FA")
    if not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid password")
    if user.two_factor_enabled and payload.code:
        if not twofa_service.verify_totp(user.two_factor_secret or "", payload.code):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid 2FA code")
    twofa_service.stamp_user_disabled(user)
    from sqlalchemy import delete as sa_delete
    from app.models.security import UserBackupCode

    await db.execute(sa_delete(UserBackupCode).where(UserBackupCode.user_id == user.id))
    await record_security_event(
        db,
        organization_id=user.organization_id,
        user_id=user.id,
        event="auth.2fa_disabled",
        severity="warning",
        ip_address=_client_ip(request),
    )
    await db.commit()
    return {"ok": True}


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


@router.get("/oauth/providers")
async def list_oauth_providers() -> dict:
    return {
        "providers": [
            {"name": "google", "enabled": oauth_service.is_provider_configured("google")},
            {"name": "microsoft", "enabled": oauth_service.is_provider_configured("microsoft")},
        ]
    }


@router.get("/oauth/{provider}/start")
async def oauth_start(provider: str, return_to: str | None = Query(default=None)) -> dict:
    if provider not in {"google", "microsoft"}:
        raise HTTPException(status_code=404, detail="Unknown provider")
    try:
        url = await oauth_service.build_authorize_url(provider, return_to=return_to)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc))
    return {"authorize_url": url}


@router.get("/oauth/{provider}/callback")
async def oauth_callback(
    provider: str,
    request: Request,
    response: Response,
    code: str = Query(...),
    state: str = Query(...),
    db: AsyncSession = Depends(get_db),
):
    if provider not in {"google", "microsoft"}:
        raise HTTPException(status_code=404, detail="Unknown provider")
    payload = await oauth_service.consume_state(state)
    if not payload or payload.get("provider") != provider:
        raise HTTPException(status_code=400, detail="Invalid OAuth state")
    try:
        profile = await oauth_service.exchange_code_for_profile(provider, code)
    except (httpx.HTTPError, RuntimeError) as exc:  # type: ignore[name-defined]
        raise HTTPException(status_code=502, detail=f"OAuth exchange failed: {exc}")
    email = (profile.get("email") or profile.get("preferred_username") or "").lower().strip()
    subject = str(profile.get("sub") or profile.get("id") or "")
    if not email or not subject:
        raise HTTPException(status_code=502, detail="OAuth profile missing email/subject")

    identity = (
        await db.execute(
            select(OAuthIdentity).where(OAuthIdentity.provider == provider, OAuthIdentity.subject == subject)
        )
    ).scalar_one_or_none()

    user: User | None = None
    if identity is not None:
        user = (await db.execute(select(User).where(User.id == identity.user_id))).scalar_one_or_none()
    if user is None:
        user = (await db.execute(select(User).where(User.email == email))).scalar_one_or_none()

    if user is None:
        # Auto-provision new org for first-time OAuth user (mirrors signup path).
        full_name = profile.get("name") or profile.get("given_name") or email.split("@")[0]
        org_name = f"{full_name}'s workspace"
        slug = await _next_available_slug(db, _slugify(org_name) or "workspace")
        org = Organization(name=org_name, slug=slug, plan="starter", seats=3, trial_ends_at=datetime.now(UTC) + timedelta(days=14))
        db.add(org)
        await db.flush()
        user = User(
            organization_id=org.id,
            email=email,
            full_name=full_name,
            role="owner",
            password_hash=hash_password(secrets.token_urlsafe(24)),
            password_changed_at=datetime.now(UTC),
            is_active=True,
        )
        db.add(user)
        await db.flush()
        db.add(WorkspaceMembership(user_id=user.id, organization_id=org.id, role="owner", is_primary=True))

    if identity is None:
        identity = OAuthIdentity(
            user_id=user.id,
            organization_id=user.organization_id,
            provider=provider,
            subject=subject,
            email=email,
            raw_profile=profile,
        )
        db.add(identity)
    identity.last_login_at = datetime.now(UTC)
    identity.raw_profile = profile

    await db.flush()
    result = await _finalize_login(db, response, request, user, method=f"oauth.{provider}")
    settings = get_settings()
    return_to = payload.get("return_to") or f"{settings.frontend_base_url.rstrip('/')}/auth/callback"
    sep = "&" if "?" in return_to else "?"
    redirect_url = (
        f"{return_to}{sep}access_token={result['access_token']}&refresh_token={result['refresh_token']}"
    )
    return RedirectResponse(redirect_url, status_code=302)


async def _org_by_slug(db: AsyncSession, slug: str) -> Organization:
    org = (await db.execute(select(Organization).where(Organization.slug == slug))).scalar_one_or_none()
    if org is None:
        raise HTTPException(status_code=404, detail="Organization not found")
    return org


async def _saml_config_for(db: AsyncSession, organization_id) -> SsoConfig:
    sso = (
        await db.execute(
            select(SsoConfig).where(
                SsoConfig.organization_id == organization_id, SsoConfig.provider == "saml"
            )
        )
    ).scalar_one_or_none()
    if sso is None or not sso.is_active:
        raise HTTPException(status_code=404, detail="SAML SSO not configured for this organization")
    return sso


@router.get("/saml/{org_slug}/metadata")
async def saml_metadata(org_slug: str, db: AsyncSession = Depends(get_db)) -> Response:
    await _org_by_slug(db, org_slug)
    xml = saml_service.metadata_xml(org_slug)
    return Response(content=xml, media_type="application/xml")


@router.get("/saml/{org_slug}/login")
async def saml_login(org_slug: str, request: Request, db: AsyncSession = Depends(get_db)):
    org = await _org_by_slug(db, org_slug)
    sso = await _saml_config_for(db, org.id)
    if not sso.idp_sso_url:
        raise HTTPException(status_code=400, detail="IdP SSO URL not configured")
    url = saml_service.build_authn_request_redirect(sso, org_slug, relay_state=request.query_params.get("return_to"))
    return RedirectResponse(url, status_code=302)


@router.post("/saml/{org_slug}/acs")
async def saml_acs(org_slug: str, request: Request, response: Response, db: AsyncSession = Depends(get_db)):
    form = await request.form()
    saml_response = form.get("SAMLResponse")
    relay_state = form.get("RelayState")
    if not saml_response:
        raise HTTPException(status_code=400, detail="SAMLResponse missing")
    org = await _org_by_slug(db, org_slug)
    sso = await _saml_config_for(db, org.id)
    try:
        parsed = saml_service.parse_acs_response(str(saml_response), sso, verify=bool(sso.idp_cert))
    except ValueError as exc:
        await record_security_event(
            db,
            organization_id=org.id,
            event="auth.saml_failure",
            severity="warning",
            ip_address=_client_ip(request),
            details={"reason": str(exc)},
        )
        await db.commit()
        raise HTTPException(status_code=400, detail=f"SAML parse error: {exc}")
    fields = saml_service.extract_user_fields(parsed, sso.attribute_map or {})
    email = fields["email"]
    if not email:
        raise HTTPException(status_code=400, detail="SAML response missing email")
    user = (
        await db.execute(select(User).where(User.email == email, User.organization_id == org.id))
    ).scalar_one_or_none()
    if user is None:
        if not sso.auto_provision:
            raise HTTPException(status_code=403, detail="User not provisioned and auto-provision disabled")
        user = User(
            organization_id=org.id,
            email=email,
            full_name=fields["full_name"] or email.split("@")[0],
            role=sso.default_role or "agent",
            password_hash=hash_password(secrets.token_urlsafe(24)),
            password_changed_at=datetime.now(UTC),
            is_active=True,
        )
        db.add(user)
        await db.flush()
        db.add(WorkspaceMembership(user_id=user.id, organization_id=org.id, role=user.role, is_primary=True))
    result = await _finalize_login(db, response, request, user, method="saml")
    settings = get_settings()
    return_to = (relay_state or f"{settings.frontend_base_url.rstrip('/')}/auth/callback").strip()
    sep = "&" if "?" in return_to else "?"
    return RedirectResponse(
        f"{return_to}{sep}access_token={result['access_token']}&refresh_token={result['refresh_token']}",
        status_code=302,
    )


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
