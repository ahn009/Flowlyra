"""Role-based and permission-based access control.

Roles: owner > admin > supervisor > agent.
Permissions are dotted strings like ``chats.write``. A role grants a default
set of permissions; per-user overrides live in ``WorkspaceMembership.permissions``.
"""

from __future__ import annotations

from typing import Annotated, Iterable

from fastapi import Depends, HTTPException, status

from app.middleware.auth import TokenUser, current_user


ROLE_HIERARCHY = ["agent", "supervisor", "admin", "owner"]

# Default permission grants per role. Higher roles inherit lower roles' grants.
_BASE_AGENT = {
    "chats.read", "chats.write", "chats.assign_self", "chats.transfer", "chats.resolve",
    "chats.tag", "chats.note", "chats.export_transcript",
    "messages.read", "messages.write",
    "contacts.read", "contacts.write",
    "tickets.read", "tickets.write", "tickets.comment", "tickets.resolve",
    "canned.read", "canned.use",
    "tags.read",
    "kb.read",
    "uploads.write",
    "notifications.read",
    "me.read",
    "ai.use",
}
_BASE_SUPERVISOR = _BASE_AGENT | {
    "chats.assign_other", "chats.supervise", "chats.whisper", "chats.ban_visitor",
    "tickets.assign", "tickets.bulk",
    "reports.read",
    "agents.read", "agents.status_set",
    "teams.read",
    "audit.read",
    "integrations.read",
}
_BASE_ADMIN = _BASE_SUPERVISOR | {
    "settings.read", "settings.write",
    "widget.write",
    "agents.invite", "agents.update", "agents.remove",
    "teams.write",
    "canned.write",
    "tags.write",
    "routing.write",
    "triggers.write",
    "integrations.write",
    "api_keys.write",
    "webhooks.write",
    "kb.write",
    "automation.write",
    "channels.write",
    "billing.read",
    "notifications.preferences",
    "goals.read", "goals.write",
    "campaigns.read", "campaigns.write",
}
_BASE_OWNER = _BASE_ADMIN | {
    "billing.write",
    "organization.delete",
    "members.transfer_ownership",
    "security.write",
    "security.manage",
    "audit.export",
    "data.export",
}

ROLE_PERMISSIONS: dict[str, frozenset[str]] = {
    "agent": frozenset(_BASE_AGENT),
    "supervisor": frozenset(_BASE_SUPERVISOR),
    "admin": frozenset(_BASE_ADMIN),
    "owner": frozenset(_BASE_OWNER),
}


def role_at_least(actual: str, required: str) -> bool:
    if actual not in ROLE_HIERARCHY or required not in ROLE_HIERARCHY:
        return False
    return ROLE_HIERARCHY.index(actual) >= ROLE_HIERARCHY.index(required)


def resolve_permissions(role: str, granted_overrides: Iterable[str] = (), denied_overrides: Iterable[str] = ()) -> set[str]:
    base = set(ROLE_PERMISSIONS.get(role, frozenset()))
    base.update(granted_overrides)
    base.difference_update(denied_overrides)
    return base


def has_permission(user: TokenUser, permission: str) -> bool:
    perms = resolve_permissions(user.role, user.granted_permissions, user.denied_permissions)
    return permission in perms


def require_permission(*permissions: str):
    """Dependency: caller must hold all listed permissions."""

    async def _checker(user: Annotated[TokenUser, Depends(current_user)]) -> TokenUser:
        perms = resolve_permissions(user.role, user.granted_permissions, user.denied_permissions)
        missing = [p for p in permissions if p not in perms]
        if missing:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=f"Missing permission: {missing[0]}")
        return user

    return _checker


def require_role_min(min_role: str):
    """Dependency: caller must hold ``min_role`` or higher in current org."""

    async def _checker(user: Annotated[TokenUser, Depends(current_user)]) -> TokenUser:
        if not role_at_least(user.role, min_role):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient role")
        return user

    return _checker
