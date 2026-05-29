from typing import Any
import httpx
from app.integrations.base import IntegrationProvider

class ZapierProvider(IntegrationProvider):
    provider = "zapier"
    def urls(self) -> list[str]: return [u for u in ([self.config.get("webhook_url")] + list(self.config.get("webhook_urls", []) or [])) if u]
    async def trigger(self, event_name: str, payload: dict) -> list[int]:
        async with httpx.AsyncClient(timeout=10) as client:
            responses = [await client.post(url, json={"event": event_name, "payload": payload}) for url in self.urls()]
        return [r.status_code for r in responses]
    async def test_connection(self) -> bool:
        codes = await self.trigger("flowlyra.test", {"ok": True})
        return bool(codes) and all(200 <= c < 300 for c in codes)
    async def sync(self, org_id, db) -> dict[str, Any]: return {"mode": "webhook_forwarder"}
