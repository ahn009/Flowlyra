from datetime import UTC, datetime, timedelta
from typing import Any
import httpx
from sqlalchemy import select
from app.integrations.base import IntegrationProvider
from app.models.contact import Contact
from app.models.ticket import Ticket

class HubSpotProvider(IntegrationProvider):
    provider = "hubspot"
    @property
    def token(self): return self.oauth_token or self.config.get("access_token")
    async def test_connection(self) -> bool:
        if not self.token: return False
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.get("https://api.hubapi.com/crm/v3/objects/contacts", params={"limit": 1}, headers={"Authorization": f"Bearer {self.token}"})
        return 200 <= r.status_code < 300
    async def sync_contact(self, contact: Contact) -> dict:
        name = (contact.full_name or "").split()
        props = {"email": contact.email, "firstname": name[0] if name else "", "lastname": " ".join(name[1:]), "phone": contact.phone or "", "company": (contact.custom_attrs or {}).get("company", "")}
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.post("https://api.hubapi.com/crm/v3/objects/contacts", headers={"Authorization": f"Bearer {self.token}"}, json={"properties": props})
        return {"status_code": r.status_code}
    async def sync_deal(self, ticket: Ticket) -> dict:
        props = {"dealname": ticket.subject, "pipeline": self.config.get("pipeline", "default"), "dealstage": self.config.get("dealstage", "appointmentscheduled")}
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.post("https://api.hubapi.com/crm/v3/objects/deals", headers={"Authorization": f"Bearer {self.token}"}, json={"properties": props})
        return {"status_code": r.status_code}
    async def sync(self, org_id, db) -> dict[str, Any]:
        cutoff = datetime.now(UTC) - timedelta(days=1)
        contacts = (await db.execute(select(Contact).where(Contact.organization_id == org_id, Contact.updated_at >= cutoff, Contact.email.is_not(None)).limit(100))).scalars().all()
        ok = 0
        for c in contacts:
            res = await self.sync_contact(c); ok += int(res["status_code"] < 400)
        return {"contacts": ok}
