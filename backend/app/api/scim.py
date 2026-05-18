"""SCIM 2.0 (RFC 7644) — minimal provisioning endpoints for User resource.

Auth: Bearer SCIM token (ScimToken). The token's organization scopes all reads
and writes to that org. Implements:
  GET    /scim/v2/ServiceProviderConfig
  GET    /scim/v2/ResourceTypes
  GET    /scim/v2/Schemas
  GET    /scim/v2/Users         (filter, startIndex, count)
  POST   /scim/v2/Users         (create)
  GET    /scim/v2/Users/{id}
  PUT    /scim/v2/Users/{id}    (replace)
  PATCH  /scim/v2/Users/{id}    (Operations: add|replace|remove)
  DELETE /scim/v2/Users/{id}    (soft delete via is_active=false)
"""

from __future__ import annotations

import hashlib
import uuid
from datetime import UTC, datetime
from typing import Any, Annotated

from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request, Response, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.middleware.auth import hash_password
from app.models.security import ScimToken
from app.models.user import User
from app.models.workspace_membership import WorkspaceMembership

router = APIRouter(prefix="/scim/v2", tags=["scim"])


def _hash_scim_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


async def authorize_scim(
    db: Annotated[AsyncSession, Depends(get_db)],
    authorization: str | None = Header(default=None),
) -> ScimToken:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Bearer token required", headers={"WWW-Authenticate": "Bearer"})
    raw = authorization[7:].strip()
    digest = _hash_scim_token(raw)
    token = (
        await db.execute(
            select(ScimToken).where(ScimToken.token_hash == digest, ScimToken.revoked_at.is_(None))
        )
    ).scalar_one_or_none()
    if token is None:
        raise HTTPException(status_code=401, detail="Invalid SCIM token")
    token.last_used_at = datetime.now(UTC)
    await db.flush()
    return token


def _user_to_scim(user: User) -> dict[str, Any]:
    return {
        "schemas": ["urn:ietf:params:scim:schemas:core:2.0:User"],
        "id": str(user.id),
        "userName": user.email,
        "name": {"formatted": user.full_name},
        "displayName": user.full_name,
        "active": user.is_active and user.deleted_at is None,
        "emails": [{"value": user.email, "primary": True}],
        "meta": {
            "resourceType": "User",
            "created": user.created_at.isoformat() if user.created_at else None,
            "lastModified": (user.created_at.isoformat() if user.created_at else None),
            "location": f"/scim/v2/Users/{user.id}",
        },
    }


def _extract_email(payload: dict[str, Any]) -> str | None:
    email = payload.get("userName")
    if email:
        return str(email).lower().strip()
    emails = payload.get("emails") or []
    if emails:
        for entry in emails:
            if entry.get("primary"):
                return str(entry.get("value", "")).lower().strip()
        return str(emails[0].get("value", "")).lower().strip() or None
    return None


def _extract_name(payload: dict[str, Any], fallback: str) -> str:
    name = payload.get("name") or {}
    formatted = name.get("formatted")
    if formatted:
        return str(formatted)
    parts = [name.get("givenName"), name.get("familyName")]
    joined = " ".join(p for p in parts if p)
    return joined or payload.get("displayName") or fallback


@router.get("/ServiceProviderConfig")
async def service_provider_config(_: Request) -> dict:
    return {
        "schemas": ["urn:ietf:params:scim:schemas:core:2.0:ServiceProviderConfig"],
        "documentationUri": "https://docs.flowlyra.com/scim",
        "patch": {"supported": True},
        "bulk": {"supported": False, "maxOperations": 0, "maxPayloadSize": 0},
        "filter": {"supported": True, "maxResults": 200},
        "changePassword": {"supported": False},
        "sort": {"supported": False},
        "etag": {"supported": False},
        "authenticationSchemes": [
            {"name": "OAuth Bearer Token", "type": "oauthbearertoken", "primary": True}
        ],
    }


@router.get("/ResourceTypes")
async def resource_types() -> dict:
    return {
        "schemas": ["urn:ietf:params:scim:api:messages:2.0:ListResponse"],
        "totalResults": 1,
        "Resources": [
            {
                "schemas": ["urn:ietf:params:scim:schemas:core:2.0:ResourceType"],
                "id": "User",
                "name": "User",
                "endpoint": "/Users",
                "schema": "urn:ietf:params:scim:schemas:core:2.0:User",
            }
        ],
    }


@router.get("/Schemas")
async def schemas() -> dict:
    return {
        "schemas": ["urn:ietf:params:scim:api:messages:2.0:ListResponse"],
        "totalResults": 1,
        "Resources": [
            {
                "id": "urn:ietf:params:scim:schemas:core:2.0:User",
                "name": "User",
                "description": "SCIM core User",
            }
        ],
    }


@router.get("/Users")
async def list_users(
    token: Annotated[ScimToken, Depends(authorize_scim)],
    db: Annotated[AsyncSession, Depends(get_db)],
    filter_: str | None = Query(default=None, alias="filter"),
    startIndex: int = Query(default=1, ge=1),
    count: int = Query(default=20, ge=1, le=200),
) -> dict:
    stmt = select(User).where(User.organization_id == token.organization_id)
    if filter_:
        # Support: userName eq "value"
        if "userName" in filter_ and "eq" in filter_:
            try:
                value = filter_.split("eq", 1)[1].strip().strip('"')
                stmt = stmt.where(User.email == value.lower())
            except IndexError:
                pass
    rows = (
        await db.execute(stmt.offset(max(startIndex - 1, 0)).limit(count))
    ).scalars().all()
    return {
        "schemas": ["urn:ietf:params:scim:api:messages:2.0:ListResponse"],
        "totalResults": len(rows),
        "startIndex": startIndex,
        "itemsPerPage": len(rows),
        "Resources": [_user_to_scim(u) for u in rows],
    }


@router.post("/Users", status_code=status.HTTP_201_CREATED)
async def create_user(
    payload: dict,
    token: Annotated[ScimToken, Depends(authorize_scim)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict:
    import secrets

    email = _extract_email(payload)
    if not email:
        raise HTTPException(status_code=400, detail="userName or emails[primary].value required")
    existing = (await db.execute(select(User).where(User.email == email))).scalar_one_or_none()
    if existing is not None:
        if existing.organization_id != token.organization_id:
            raise HTTPException(status_code=409, detail="User exists in another organization")
        # idempotent: return existing
        return _user_to_scim(existing)
    full_name = _extract_name(payload, email.split("@")[0])
    user = User(
        organization_id=token.organization_id,
        email=email,
        full_name=full_name,
        role="agent",
        password_hash=hash_password(secrets.token_urlsafe(24)),
        password_changed_at=datetime.now(UTC),
        is_active=bool(payload.get("active", True)),
    )
    db.add(user)
    await db.flush()
    db.add(WorkspaceMembership(user_id=user.id, organization_id=token.organization_id, role="agent", is_primary=True))
    await db.commit()
    await db.refresh(user)
    return _user_to_scim(user)


@router.get("/Users/{user_id}")
async def get_user(
    user_id: uuid.UUID,
    token: Annotated[ScimToken, Depends(authorize_scim)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict:
    user = (
        await db.execute(select(User).where(User.id == user_id, User.organization_id == token.organization_id))
    ).scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return _user_to_scim(user)


@router.put("/Users/{user_id}")
async def replace_user(
    user_id: uuid.UUID,
    payload: dict,
    token: Annotated[ScimToken, Depends(authorize_scim)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict:
    user = (
        await db.execute(select(User).where(User.id == user_id, User.organization_id == token.organization_id))
    ).scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    email = _extract_email(payload) or user.email
    user.email = email
    user.full_name = _extract_name(payload, user.full_name)
    if "active" in payload:
        user.is_active = bool(payload["active"])
    await db.commit()
    await db.refresh(user)
    return _user_to_scim(user)


@router.patch("/Users/{user_id}")
async def patch_user(
    user_id: uuid.UUID,
    payload: dict,
    token: Annotated[ScimToken, Depends(authorize_scim)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict:
    user = (
        await db.execute(select(User).where(User.id == user_id, User.organization_id == token.organization_id))
    ).scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    ops = payload.get("Operations") or []
    for op in ops:
        op_type = (op.get("op") or "").lower()
        path = op.get("path") or ""
        value = op.get("value")
        if path == "active" or (isinstance(value, dict) and "active" in value):
            new_active = value if path == "active" else value.get("active")
            if op_type in {"replace", "add"}:
                user.is_active = bool(new_active)
        if path == "userName" and op_type in {"replace", "add"}:
            user.email = str(value).lower()
        if path in {"displayName", "name.formatted"} and op_type in {"replace", "add"}:
            user.full_name = str(value)
    await db.commit()
    await db.refresh(user)
    return _user_to_scim(user)


@router.delete("/Users/{user_id}", status_code=status.HTTP_204_NO_CONTENT, response_class=Response)
async def delete_user(
    user_id: uuid.UUID,
    token: Annotated[ScimToken, Depends(authorize_scim)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Response:
    user = (
        await db.execute(select(User).where(User.id == user_id, User.organization_id == token.organization_id))
    ).scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_active = False
    user.deleted_at = datetime.now(UTC)
    await db.commit()
    return Response(status_code=204)
