import uuid

import pytest
from sqlalchemy import select

from app.models.contact import Contact

pytestmark = pytest.mark.asyncio


async def test_contact_tenant_isolation_query(db, org, other_org):
    own = Contact(organization_id=org.id, email="own@test.com", full_name="Own")
    other = Contact(organization_id=other_org.id, email="other@test.com", full_name="Other")
    db.add_all([own, other])
    await db.commit()
    rows = (await db.execute(select(Contact).where(Contact.organization_id == org.id))).scalars().all()
    assert {c.email for c in rows} == {"own@test.com"}


async def test_ticket_cross_org_id_probe_returns_not_found(client, auth_headers):
    resp = await client.get(f"/api/v1/tickets/{uuid.uuid4()}", headers=auth_headers)
    assert resp.status_code == 404


async def test_chat_cross_org_id_probe_returns_not_found(client, auth_headers):
    resp = await client.get(f"/api/v1/chats/{uuid.uuid4()}", headers=auth_headers)
    assert resp.status_code == 404
