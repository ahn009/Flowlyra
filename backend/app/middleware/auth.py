from datetime import UTC, datetime, timedelta
from typing import Annotated
import uuid

from fastapi import Depends, Header, HTTPException, Request, status
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.db.redis import get_redis
from app.db.session import AsyncSessionLocal, get_db
from app.models.api_key import ApiKey
from app.models.user import User
from app.models.workspace_membership import WorkspaceMembership
from app.services.api_keys import hash_key, parse_prefix

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto", bcrypt__rounds=12)
ALGORITHM = "HS256"


class TokenUser(BaseModel):
    id: uuid.UUID
    organization_id: uuid.UUID
    email: str
    role: str
    full_name: str | None = None
    avatar_url: str | None = None
    granted_permissions: list[str] = Field(default_factory=list)
    denied_permissions: list[str] = Field(default_factory=list)
    membership_id: uuid.UUID | None = None


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    return pwd_context.verify(password, password_hash)


def create_token(user: User, token_type: str, expires_delta: timedelta, *, organization_id: uuid.UUID | None = None) -> str:
    now = datetime.now(UTC)
    payload = {
        "sub": str(user.id),
        "org": str(organization_id or user.organization_id),
        "email": user.email,
        "role": user.role,
        "type": token_type,
        "iat": int(now.timestamp()),
        "exp": int((now + expires_delta).timestamp()),
        "jti": str(uuid.uuid4()),
    }
    return jwt.encode(payload, get_settings().secret_key, algorithm=ALGORITHM)


async def decode_token(token: str, expected_type: str = "access") -> dict[str, str]:
    try:
        payload = jwt.decode(token, get_settings().secret_key, algorithms=[ALGORITHM])
    except JWTError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token") from exc
    if payload.get("type") != expected_type:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token type")
    jti = payload.get("jti")
    if jti and await get_redis().exists(f"blacklist:{jti}"):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token revoked")
    return payload


async def _load_membership(db: AsyncSession, user_id: uuid.UUID, organization_id: uuid.UUID) -> WorkspaceMembership | None:
    result = await db.execute(
        select(WorkspaceMembership).where(
            WorkspaceMembership.user_id == user_id,
            WorkspaceMembership.organization_id == organization_id,
            WorkspaceMembership.is_active.is_(True),
        )
    )
    return result.scalar_one_or_none()


async def current_user(
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db)],
    authorization: Annotated[str | None, Header()] = None,
    x_api_key: Annotated[str | None, Header()] = None,
) -> TokenUser:
    async def _from_api_key(raw_key: str) -> TokenUser:
        prefix = parse_prefix(raw_key)
        key = (
            await db.execute(
                select(ApiKey).where(
                    ApiKey.key_prefix == prefix,
                    ApiKey.is_active.is_(True),
                )
            )
        ).scalar_one_or_none()
        if key is None or key.revoked_at is not None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid API key")
        if key.expires_at and key.expires_at <= datetime.now(UTC):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="API key expired")
        if key.key_hash != hash_key(raw_key):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid API key")

        key.usage_count = int(key.usage_count or 0) + 1
        key.last_used_at = datetime.now(UTC)
        key.last_used_ip = request.client.host if request.client else None
        await db.commit()

        scopes = list((key.scopes or {}).get("items") or [])
        request.state.organization_id = key.organization_id
        request.state.user_id = key.created_by_user_id or key.id
        request.state.user_email = f"api-key:{key.name}"
        request.state.user_role = "api_key"
        request.state.api_key_id = key.id
        return TokenUser(
            id=key.created_by_user_id or key.id,
            organization_id=key.organization_id,
            email=f"api-key:{key.name}",
            role="api_key",
            full_name=key.name,
            granted_permissions=scopes,
            denied_permissions=[],
            membership_id=None,
        )

    bearer = authorization.removeprefix("Bearer ").strip() if authorization and authorization.startswith("Bearer ") else None
    if x_api_key:
        return await _from_api_key(x_api_key.strip())

    if bearer:
        try:
            payload = await decode_token(bearer)
        except HTTPException:
            return await _from_api_key(bearer)
    else:
        cookie_token = request.cookies.get("flowlyra_access")
        if not cookie_token:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing bearer token")
        payload = await decode_token(cookie_token)

    user_id = uuid.UUID(str(payload["sub"]))
    org_id = uuid.UUID(str(payload["org"]))
    result = await db.execute(
        select(User).where(
            User.id == user_id,
            User.organization_id == org_id,
            User.is_active.is_(True),
            User.deleted_at.is_(None),
        )
    )
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    role = user.role
    granted: list[str] = []
    denied: list[str] = []
    membership_id: uuid.UUID | None = None
    membership = await _load_membership(db, user.id, org_id)
    if membership is not None:
        role = membership.role or role
        perms = membership.permissions or {}
        granted = list(perms.get("granted", []) or [])
        denied = list(perms.get("denied", []) or [])
        membership_id = membership.id

    request.state.organization_id = org_id
    request.state.user_id = user.id
    request.state.user_email = user.email
    request.state.user_role = role
    return TokenUser(
        id=user.id,
        organization_id=org_id,
        email=user.email,
        role=role,
        full_name=user.full_name,
        avatar_url=user.avatar_url,
        granted_permissions=granted,
        denied_permissions=denied,
        membership_id=membership_id,
    )


def require_role(*roles: str):
    async def checker(user: Annotated[TokenUser, Depends(current_user)]) -> TokenUser:
        if user.role not in roles:
            # owner inherits admin everywhere
            if user.role == "owner" and "admin" in roles:
                return user
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
        return user

    return checker


async def verify_socket_token(token: str) -> TokenUser:
    payload = await decode_token(token)
    user_id = uuid.UUID(str(payload["sub"]))
    org_id = uuid.UUID(str(payload["org"]))
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(User).where(
                User.id == user_id,
                User.organization_id == org_id,
                User.is_active.is_(True),
                User.deleted_at.is_(None),
            )
        )
        user = result.scalar_one_or_none()
        if user is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
        return TokenUser(
            id=user.id,
            organization_id=org_id,
            email=user.email,
            role=user.role,
            full_name=user.full_name,
            avatar_url=user.avatar_url,
        )
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
