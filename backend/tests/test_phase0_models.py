"""Phase 0 smoke tests: new models import + plan limits + permissions + signatures."""

import pytest

from app.models import (
    AuditLog,
    Cart,
    CartItem,
    Notification,
    NotificationPreference,
    Order,
    OrderItem,
    PushDevice,
    RefreshToken,
    Webhook,
    WebhookDelivery,
    WorkspaceMembership,
)
from app.models.plan_limit import PLAN_ORDER, get_plan, is_plan_at_least
from app.services.permissions import (
    ROLE_PERMISSIONS,
    has_permission,
    resolve_permissions,
    role_at_least,
)
from app.services.webhook_service import sign_payload
from app.services.password_policy import is_valid


def test_models_have_tablename():
    assert WorkspaceMembership.__tablename__ == "workspace_memberships"
    assert AuditLog.__tablename__ == "audit_logs"
    assert Notification.__tablename__ == "notifications"
    assert NotificationPreference.__tablename__ == "notification_preferences"
    assert PushDevice.__tablename__ == "push_devices"
    assert Cart.__tablename__ == "carts"
    assert CartItem.__tablename__ == "cart_items"
    assert Order.__tablename__ == "orders"
    assert OrderItem.__tablename__ == "order_items"
    assert Webhook.__tablename__ == "webhooks"
    assert WebhookDelivery.__tablename__ == "webhook_deliveries"
    assert RefreshToken.__tablename__ == "refresh_tokens"


def test_plan_order():
    assert PLAN_ORDER == ["starter", "team", "business", "enterprise"]
    assert is_plan_at_least("business", "team")
    assert not is_plan_at_least("starter", "team")
    starter = get_plan("starter")
    enterprise = get_plan("enterprise")
    assert starter.seats < enterprise.seats


def test_role_hierarchy():
    assert role_at_least("owner", "agent")
    assert role_at_least("admin", "supervisor")
    assert not role_at_least("agent", "admin")
    perms_owner = ROLE_PERMISSIONS["owner"]
    perms_agent = ROLE_PERMISSIONS["agent"]
    assert "billing.write" in perms_owner
    assert "billing.write" not in perms_agent
    assert "chats.write" in perms_agent


def test_resolve_permissions_overrides():
    base = resolve_permissions("agent", granted_overrides=["custom.thing"], denied_overrides=["chats.note"])
    assert "custom.thing" in base
    assert "chats.note" not in base
    assert "chats.write" in base


def test_webhook_signature_stable():
    sig = sign_payload("secret-xyz", b'{"event":"chat.started"}')
    assert sig.startswith("sha256=")
    assert sign_payload("secret-xyz", b'{"event":"chat.started"}') == sig


def test_password_policy_basic():
    assert not is_valid("short")
    assert not is_valid("alllowercaseand1234")
    assert not is_valid("PASSWORDLONG1234!")  # no lowercase letters? wait: has letters; missing digits? has them. Actually missing lowercase letters; should fail
    assert is_valid("CorrectHorse$Battery9")
