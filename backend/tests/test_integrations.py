from unittest.mock import AsyncMock

import httpx
import pytest
from sqlalchemy import func, select

from app.integrations.base import IntegrationProvider
from app.integrations.shopify import ShopifyProvider
from app.models.ecommerce import Order, OrderItem
from app.models.integration import Integration
from app.services import integration_service

pytestmark = pytest.mark.asyncio


class HealthyProvider(IntegrationProvider):
    provider = "healthy"

    async def test_connection(self) -> bool:
        return True

    async def sync(self, org_id, db):
        return {"synced": 3}


class FailingProvider(IntegrationProvider):
    provider = "failing"

    async def test_connection(self) -> bool:
        return False

    async def sync(self, org_id, db):
        raise RuntimeError("boom")


async def test_run_health_check_uses_provider(db, org, monkeypatch):
    integration = Integration(organization_id=org.id, provider="healthy", display_name="Healthy", category="crm", config={})
    db.add(integration)
    await db.commit()
    monkeypatch.setitem(integration_service.PROVIDERS, "healthy", HealthyProvider)
    result = await integration_service.run_health_check(db, integration)
    assert result["ok"] is True
    assert integration.health_status == "healthy"
    assert integration.failure_streak == 0


async def test_run_health_check_marks_unhealthy(db, org, monkeypatch):
    integration = Integration(organization_id=org.id, provider="failing", display_name="Failing", category="crm", config={})
    db.add(integration)
    await db.commit()
    monkeypatch.setitem(integration_service.PROVIDERS, "failing", FailingProvider)
    result = await integration_service.run_health_check(db, integration)
    assert result["ok"] is False
    assert integration.health_status == "unhealthy"
    assert integration.failure_streak == 1


async def test_run_sync_updates_success_timestamp(db, org, monkeypatch):
    integration = Integration(organization_id=org.id, provider="healthy", display_name="Healthy", category="crm", config={})
    db.add(integration)
    await db.commit()
    monkeypatch.setitem(integration_service.PROVIDERS, "healthy", HealthyProvider)
    result = await integration_service.run_sync(db, integration)
    assert result["synced"] == 3
    assert result["ok"] is True
    assert integration.last_success_at is not None
    assert integration.last_error_message is None


async def test_shopify_sync_idempotent_no_duplicate_items(db, org, monkeypatch):
    fake_orders = {
        "orders": [
            {
                "id": 1001,
                "order_number": "1001",
                "name": "#1001",
                "email": "buyer@test.com",
                "financial_status": "paid",
                "currency": "USD",
                "subtotal_price": "10.00",
                "total_tax": "1.00",
                "total_price": "11.00",
                "created_at": "2026-01-01T00:00:00Z",
                "line_items": [{"sku": "SKU1", "name": "Widget", "quantity": 2, "price": "5.00"}],
            }
        ]
    }
    fake_customers = {"customers": []}

    class FakeResponse:
        status_code = 200

        def __init__(self, data):
            self._data = data

        def json(self):
            return self._data

        def raise_for_status(self):
            pass

    async def fake_get(self_client, url, **kw):
        return FakeResponse(fake_orders if "orders" in url else fake_customers)

    monkeypatch.setattr(httpx.AsyncClient, "get", fake_get)
    provider = ShopifyProvider({"shop": "test.myshopify.com", "access_token": "fake"})

    await provider.sync(org.id, db)
    await db.commit()
    await provider.sync(org.id, db)
    await db.commit()

    order = (
        await db.execute(select(Order).where(Order.organization_id == org.id, Order.order_number == "1001"))
    ).scalar_one()
    item_count = (
        await db.execute(select(func.count(OrderItem.id)).where(OrderItem.order_id == order.id))
    ).scalar_one()
    assert item_count == 1
