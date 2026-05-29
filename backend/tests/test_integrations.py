from unittest.mock import AsyncMock

import pytest

from app.integrations.base import IntegrationProvider
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
