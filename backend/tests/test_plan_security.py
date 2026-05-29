from datetime import UTC, datetime, timedelta

import pytest
from fastapi import HTTPException

from app.middleware.auth import create_token
from app.models.subscription import Subscription
from app.models.user import User
from app.services.plan_service import get_org_plan, assert_seat_available, assert_under_limit

pytestmark = pytest.mark.asyncio


async def test_lapsed_subscription_downgrades_plan_limits(db, org):
    org.plan = "business"
    db.add(Subscription(organization_id=org.id, stripe_customer_id="cus_lapsed", status="past_due", plan="business"))
    await db.commit()
    plan = await get_org_plan(db, org.id)
    assert plan.plan == "starter"


async def test_active_subscription_keeps_org_plan(db, org):
    org.plan = "business"
    db.add(Subscription(organization_id=org.id, stripe_customer_id="cus_active", status="active", plan="business"))
    await db.commit()
    plan = await get_org_plan(db, org.id)
    assert plan.plan == "business"


async def test_assert_under_limit_raises_payment_required(db, org):
    org.plan = "starter"
    await db.commit()
    with pytest.raises(HTTPException) as exc:
        await assert_under_limit(db, org.id, limit_name="monthly_chats", current_count=10_000_000, extra=1)
    assert exc.value.status_code == 402


async def test_assert_seat_available_raises_when_over_limit(db, org):
    org.plan = "starter"
    org.seats = 1
    db.add_all([
        User(organization_id=org.id, email=f"active{i}@test.com", password_hash="x", full_name=f"Active {i}", role="agent", is_active=True)
        for i in range(3)
    ])
    await db.commit()
    with pytest.raises(HTTPException) as exc:
        await assert_seat_available(db, org.id, extra=1)
    assert exc.value.status_code == 402


async def test_expired_token_rejected(client, admin_user):
    token = create_token(admin_user, "access", timedelta(seconds=-1))
    resp = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 401


async def test_role_guard_agent_cannot_create_agent(client, agent_headers):
    resp = await client.post("/api/v1/agents/", headers=agent_headers, json={"email": "new@test.com", "full_name": "New Agent", "role": "agent"})
    assert resp.status_code == 403
