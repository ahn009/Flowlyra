from datetime import UTC, datetime, timedelta
from typing import Annotated
import uuid

from fastapi import Depends, Header, HTTPException, Request, status
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.db.redis import get_redis
from app.db.session import get_db
from app.models.user import User

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto", bcrypt__rounds=12)
ALGORITHM = "HS256"


class TokenUser(BaseModel):
    id: uuid.UUID
    organization_id: uuid.UUID
    email: str
    role: str


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    return pwd_context.verify(password, password_hash)


def create_token(user: User, token_type: str, expires_delta: timedelta) -> str:
    now = datetime.now(UTC)
    payload = {
        "sub": str(user.id),
        "org": str(user.organization_id),
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


async def current_user(
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db)],
    authorization: Annotated[str | None, Header()] = None,
) -> TokenUser:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing bearer token")
    payload = await decode_token(authorization.removeprefix("Bearer ").strip())
    user_id = uuid.UUID(str(payload["sub"]))
    org_id = uuid.UUID(str(payload["org"]))
    result = await db.execute(select(User).where(User.id == user_id, User.organization_id == org_id, User.is_active.is_(True)))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    request.state.organization_id = org_id
    return TokenUser(id=user.id, organization_id=user.organization_id, email=user.email, role=user.role)


def require_role(*roles: str):
    async def checker(user: Annotated[TokenUser, Depends(current_user)]) -> TokenUser:
        if user.role not in roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
        return user

    return checker


async def verify_socket_token(token: str) -> TokenUser:
    payload = await decode_token(token)
    return TokenUser(
        id=uuid.UUID(str(payload["sub"])),
        organization_id=uuid.UUID(str(payload["org"])),
        email=str(payload["email"]),
        role=str(payload["role"]),
    )
