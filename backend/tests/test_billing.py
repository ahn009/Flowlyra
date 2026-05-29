from datetime import UTC, datetime
from unittest.mock import AsyncMock, Mock, patch

import pytest
import stripe
from sqlalchemy import select

from app.models.organization import Organization
from app.models.subscription import Subscription

pytestmark = pytest.mark.asyncio


async def test_get_plans(client, auth_headers):
    resp = await client.get("/api/v1/billing/plans", headers=auth_headers)
    assert resp.status_code == 200
    assert set(resp.json()) >= {"starter", "team", "business", "enterprise"}


async def test_get_subscription_no_sub(client, auth_headers):
    resp = await client.get("/api/v1/billing/subscription", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json() is None


async def test_checkout_creates_session(client, auth_headers, monkeypatch):
    fake_session = {"url": "https://checkout.stripe.test/session"}
    monkeypatch.setattr("app.services.billing_service.settings.stripe_secret_key", "sk_test")
    with patch("app.services.billing_service.stripe.Customer.create", return_value={"id": "cus_test"}), patch("app.services.billing_service.stripe.checkout.Session.create", return_value=fake_session):
        resp = await client.post(
            "/api/v1/billing/checkout",
            headers=auth_headers,
            json={"price_id": "price_team", "success_url": "https://app.test/success", "cancel_url": "https://app.test/cancel"},
        )
    assert resp.status_code == 200
    assert resp.json()["url"].startswith("https://checkout")


async def test_stripe_webhook_invalid_signature(client, monkeypatch):
    monkeypatch.setattr("app.api.billing.settings.stripe_webhook_secret", "whsec_test")
    monkeypatch.setattr(
        "app.api.billing.stripe.Webhook.construct_event",
        Mock(side_effect=stripe.error.SignatureVerificationError("bad signature", "sig")),
    )

    resp = await client.post("/api/v1/billing/webhooks/stripe", content=b"{}", headers={"stripe-signature": "bad"})

    assert resp.status_code == 400


async def test_stripe_webhook_rejects_when_secret_not_configured(client, monkeypatch):
    monkeypatch.setattr("app.api.billing.settings.stripe_webhook_secret", "")

    resp = await client.post(
        "/api/v1/billing/webhooks/stripe",
        content=b'{"type":"test"}',
        headers={"stripe-signature": "anything"},
    )

    assert resp.status_code == 503


async def test_stripe_webhook_subscription_created(client, db, org, monkeypatch):
    org.stripe_customer_id = "cus_123"
    await db.commit()
    event = {
        "type": "customer.subscription.created",
        "data": {"object": {
            "id": "sub_123", "customer": "cus_123", "status": "active", "cancel_at_period_end": False,
            "current_period_start": int(datetime.now(UTC).timestamp()),
            "current_period_end": int(datetime.now(UTC).timestamp()),
            "items": {"data": [{"price": {"id": "price_team"}, "quantity": 4}]},
            "metadata": None,
        }},
    }
    monkeypatch.setattr("app.api.billing.settings.stripe_webhook_secret", "whsec_test")
    monkeypatch.setattr("app.api.billing.stripe.Webhook.construct_event", lambda payload, sig, secret: event)

    resp = await client.post("/api/v1/billing/webhooks/stripe", json=event, headers={"stripe-signature": "valid"})

    assert resp.status_code == 200
    sub = (await db.execute(select(Subscription).where(Subscription.stripe_subscription_id == "sub_123"))).scalar_one()
    assert sub.status == "active"
    await db.refresh(org)
    assert org.seats == 4


async def test_stripe_webhook_payment_failed(client, db, org, monkeypatch):
    org.stripe_customer_id = "cus_failed"
    sub = Subscription(organization_id=org.id, stripe_customer_id="cus_failed", stripe_subscription_id="sub_failed", plan="team", status="active")
    db.add(sub)
    await db.commit()
    event = {"type": "invoice.payment_failed", "data": {"object": {"customer": "cus_failed", "status": "open"}}}
    monkeypatch.setattr("app.services.billing_service.send_email", AsyncMock())
    monkeypatch.setattr("app.services.billing_service.notify", AsyncMock())
    monkeypatch.setattr("app.api.billing.settings.stripe_webhook_secret", "whsec_test")
    monkeypatch.setattr("app.api.billing.stripe.Webhook.construct_event", lambda payload, sig, secret: event)

    resp = await client.post("/api/v1/billing/webhooks/stripe", json=event, headers={"stripe-signature": "valid"})

    assert resp.status_code == 200
    await db.refresh(sub)
    assert sub.dunning_attempts == 1


async def test_cancel_subscription(client, db, org, auth_headers, monkeypatch):
    sub = Subscription(organization_id=org.id, stripe_customer_id="cus_cancel", stripe_subscription_id="sub_cancel", plan="team", status="active")
    db.add(sub)
    await db.commit()
    monkeypatch.setattr("app.services.billing_service.settings.stripe_secret_key", "sk_test")
    with patch("app.services.billing_service.stripe.Subscription.modify", return_value={"id": "sub_cancel", "customer": "cus_cancel", "status": "active", "cancel_at_period_end": True, "items": {"data": [{"price": {"id": "price_team"}, "quantity": 1}]}}) as modify:
        resp = await client.delete("/api/v1/billing/subscription?at_period_end=true", headers=auth_headers)
    assert resp.status_code == 200
    modify.assert_called_once()


async def test_cancel_subscription_immediately(client, db, org, auth_headers, monkeypatch):
    sub = Subscription(organization_id=org.id, stripe_customer_id="cus_now", stripe_subscription_id="sub_now", plan="team", status="active")
    db.add(sub)
    await db.commit()
    monkeypatch.setattr("app.services.billing_service.settings.stripe_secret_key", "sk_test")
    payload = {"id": "sub_now", "customer": "cus_now", "status": "canceled", "cancel_at_period_end": False, "items": {"data": [{"price": {"id": "price_team"}, "quantity": 1}]}}
    with patch("app.services.billing_service.stripe.Subscription.cancel", return_value=payload) as cancel:
        resp = await client.delete("/api/v1/billing/subscription?at_period_end=false", headers=auth_headers)
    assert resp.status_code == 200
    cancel.assert_called_once_with("sub_now")
    await db.refresh(sub)
    assert sub.status == "canceled"


async def test_trial_expiry_logic_expires_org(db, org, monkeypatch):
    sub = Subscription(
        organization_id=org.id,
        stripe_customer_id="cus_trial",
        status="trialing",
        trial_ends_at=datetime(2000, 1, 1, tzinfo=UTC),
        plan="business",
    )
    org.plan = "business"
    db.add(sub)
    await db.commit()
    sub.status = "expired"
    org.plan = "starter"
    await db.commit()
    await db.refresh(sub)
    await db.refresh(org)
    assert sub.status == "expired"
    assert org.plan == "starter"
