from typing import Any
import stripe
from app.integrations.base import IntegrationProvider

class StripeIntegrationProvider(IntegrationProvider):
    provider = "stripe"
    async def test_connection(self) -> bool:
        key = self.oauth_token or self.config.get("secret_key")
        if not key: return False
        old = stripe.api_key; stripe.api_key = key
        try:
            stripe.Account.retrieve(); return True
        finally:
            stripe.api_key = old
    async def sync(self, org_id, db) -> dict[str, Any]: return {"mode": "billing_events"}
