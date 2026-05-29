import asyncio
from datetime import UTC, datetime, timedelta
from unittest.mock import AsyncMock

import pytest

from app.models.subscription import Subscription
from tests.conftest import TestSessionLocal

pytestmark = pytest.mark.asyncio


async def test_trial_ending_soon_sends_reminder(db, org, admin_user, monkeypatch):
    sub = Subscription(
        organization_id=org.id,
        stripe_customer_id="cus_trial",
        status="trialing",
        plan="team",
        trial_ends_at=datetime.now(UTC) + timedelta(days=2),
    )
    db.add(sub)
    await db.commit()

    mock_send = AsyncMock()
    mock_notify = AsyncMock()
    monkeypatch.setattr("app.workers.system_tasks.AsyncSessionLocal", TestSessionLocal)
    monkeypatch.setattr("app.workers.system_tasks.send_email", mock_send)
    monkeypatch.setattr("app.workers.system_tasks.notify", mock_notify)

    from app.workers.system_tasks import check_trial_expiry

    result = await asyncio.to_thread(check_trial_expiry)

    assert result["reminded"] == 1
    assert result["expired"] == 0
    mock_send.assert_called_once()


async def test_trial_expired_downgrades_to_starter(db, org, admin_user, monkeypatch):
    sub = Subscription(
        organization_id=org.id,
        stripe_customer_id="cus_expired",
        status="trialing",
        plan="business",
        trial_ends_at=datetime.now(UTC) - timedelta(days=1),
    )
    db.add(sub)
    org.plan = "business"
    await db.commit()

    monkeypatch.setattr("app.workers.system_tasks.AsyncSessionLocal", TestSessionLocal)
    monkeypatch.setattr("app.workers.system_tasks.send_email", AsyncMock())
    monkeypatch.setattr("app.workers.system_tasks.notify", AsyncMock())

    from app.workers.system_tasks import check_trial_expiry

    result = await asyncio.to_thread(check_trial_expiry)

    assert result["expired"] == 1
    await db.refresh(sub)
    assert sub.status == "expired"
    await db.refresh(org)
    assert org.plan == "starter"
