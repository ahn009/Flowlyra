"""Static cross-tenant isolation audit.

Walks every API router and asserts that mutating/read endpoints either:
  - depend on ``current_user``/``require_role``/``require_permission`` (so the
    handler can scope by ``organization_id``), OR
  - sit under public/widget prefixes that are intentionally unauthenticated.

This is a regression guard against accidentally exposing a tenant-scoped path
without authentication; it does not exercise the DB.
"""

import inspect

import pytest

from app.main import fastapi_app
from app.middleware.auth import current_user
from app.services.permissions import require_permission, require_role_min

PUBLIC_PREFIXES = (
    "/api/v1/auth",
    "/api/v1/public",
    "/api/v1/widget",
    "/api/v1/upload/widget",  # visitor-facing upload uses session token validation
    "/health",
    "/healthz",
    "/docs",
    "/redoc",
    "/openapi.json",
)


def _route_uses_auth(endpoint) -> bool:
    sig = inspect.signature(endpoint)
    for param in sig.parameters.values():
        annotation = str(param.annotation)
        default = param.default
        if "TokenUser" in annotation:
            return True
        if hasattr(default, "dependency"):
            dep = default.dependency
            if dep is current_user:
                return True
            if getattr(dep, "__qualname__", "").startswith(("require_role", "require_permission", "checker", "_checker")):
                return True
            if dep is require_permission or dep is require_role_min:
                return True
    return False


@pytest.mark.parametrize("route", [r for r in fastapi_app.routes if hasattr(r, "endpoint")])
def test_authenticated_routes_have_dependency(route) -> None:
    path = getattr(route, "path", "")
    if any(path.startswith(prefix) for prefix in PUBLIC_PREFIXES):
        return
    if path in {"/", "/health"}:
        return
    if not getattr(route, "methods", None) or route.methods.issubset({"OPTIONS", "HEAD"}):
        return
    assert _route_uses_auth(route.endpoint), f"Route {path} {sorted(route.methods)} lacks auth dependency"
