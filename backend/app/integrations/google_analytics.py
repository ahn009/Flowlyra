from typing import Any
import httpx
from app.integrations.base import IntegrationProvider

class GoogleAnalyticsProvider(IntegrationProvider):
    provider = "google_analytics"
    async def send_event(self, client_id: str, event_name: str, params: dict | None = None) -> dict:
        mid, secret = self.config.get("measurement_id"), self.config.get("api_secret")
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.post(f"https://www.google-analytics.com/mp/collect?measurement_id={mid}&api_secret={secret}", json={"client_id": client_id, "events": [{"name": event_name, "params": params or {}}]})
        return {"status_code": r.status_code}
    async def test_connection(self) -> bool:
        mid, secret = self.config.get("measurement_id"), self.config.get("api_secret")
        if not mid or not secret: return False
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.post(f"https://www.google-analytics.com/debug/mp/collect?measurement_id={mid}&api_secret={secret}", json={"client_id": "flowlyra_test", "events": [{"name": "flowlyra_test"}]})
        return r.status_code < 400
    async def sync(self, org_id, db) -> dict[str, Any]: return {"mode": "push_only"}
