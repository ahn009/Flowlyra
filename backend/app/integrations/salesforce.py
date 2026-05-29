from datetime import UTC, datetime, timedelta
from typing import Any
import httpx
from sqlalchemy import select
from app.integrations.base import IntegrationProvider
from app.models.contact import Contact

class SalesforceProvider(IntegrationProvider):
    provider = "salesforce"
    @property
    def token(self): return self.oauth_token or self.config.get("access_token")
    @property
    def instance_url(self): return self.config.get("instance_url", "")
    async def test_connection(self) -> bool:
        if not self.token or not self.instance_url: return False
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.get(f"{self.instance_url}/services/data/v59.0/", headers={"Authorization": f"Bearer {self.token}"})
        return 200 <= r.status_code < 300
    async def sync_contact(self, contact: Contact) -> dict:
        payload = {"Email": contact.email, "LastName": contact.full_name or contact.email or "Unknown", "Phone": contact.phone}
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.patch(f"{self.instance_url}/services/data/v59.0/sobjects/Contact/Email/{contact.email}", headers={"Authorization": f"Bearer {self.token}"}, json=payload)
        return {"status_code": r.status_code}
    async def sync_lead(self, contact: Contact) -> dict:
        payload = {"Email": contact.email, "LastName": contact.full_name or contact.email or "Unknown", "Company": (contact.custom_attrs or {}).get("company", "Unknown")}
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.post(f"{self.instance_url}/services/data/v59.0/sobjects/Lead", headers={"Authorization": f"Bearer {self.token}"}, json=payload)
        return {"status_code": r.status_code}
    async def sync(self, org_id, db) -> dict[str, Any]:
        cutoff = datetime.now(UTC) - timedelta(days=1)
        contacts = (await db.execute(select(Contact).where(Contact.organization_id == org_id, Contact.updated_at >= cutoff, Contact.email.is_not(None)).limit(100))).scalars().all()
        ok = 0
        for c in contacts:
            res = await self.sync_contact(c); ok += int(res["status_code"] < 400)
        return {"contacts": ok}
