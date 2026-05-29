import uuid

import pytest
from sqlalchemy import select

from app.models.api_key import ApiKey
from app.models.chat import Chat
from app.models.canned_response import CannedResponse
from app.models.contact import Contact
from app.models.routing_rule import RoutingRule
from app.models.session import Session
from app.models.ticket import Ticket
from app.models.user import User
from app.models.webhook import Webhook
from tests.test_chats import _make_chat
from tests.test_tickets import _make_ticket

pytestmark = pytest.mark.asyncio


async def test_chats_are_list_filtered_and_cross_org_read_is_404(client, db, org, other_org, auth_headers, other_auth_headers):
    chat, _, _ = await _make_chat(db, org, subject="Org A chat")
    assert (await client.get("/api/v1/chats/", headers=other_auth_headers)).json() == []
    resp = await client.get(f"/api/v1/chats/{chat.id}", headers=other_auth_headers)
    assert resp.status_code == 404


async def test_tickets_are_list_filtered_and_cross_org_read_is_404(client, db, org, other_auth_headers):
    ticket = await _make_ticket(db, org, subject="Org A ticket")
    list_resp = await client.get("/api/v1/tickets/", headers=other_auth_headers)
    assert all(row["id"] != str(ticket.id) for row in list_resp.json())
    assert (await client.get(f"/api/v1/tickets/{ticket.id}", headers=other_auth_headers)).status_code == 404


async def test_contacts_are_list_filtered_and_cross_org_update_delete_do_not_apply(client, db, org, other_org, other_auth_headers):
    contact = Contact(organization_id=org.id, email="own@test.com", full_name="Own")
    db.add(contact)
    await db.commit()
    list_resp = await client.get("/api/v1/contacts/", headers=other_auth_headers)
    assert all(row["email"] != "own@test.com" for row in list_resp.json())
    assert (await client.patch(f"/api/v1/contacts/{contact.id}", json={"full_name": "Hack"}, headers=other_auth_headers)).status_code == 404
    assert (await client.delete(f"/api/v1/contacts/{contact.id}", headers=other_auth_headers)).status_code == 404


async def test_agents_are_tenant_filtered(client, admin_user: User, other_auth_headers):
    resp = await client.get("/api/v1/agents/", headers=other_auth_headers)
    assert resp.status_code == 200
    assert all(row["email"] != admin_user.email for row in resp.json())


async def test_canned_responses_cross_org_probe_returns_404(client, db, org, other_auth_headers):
    row = CannedResponse(organization_id=org.id, shortcut="org-a", title="Org A", content="secret", tags=[])
    db.add(row)
    await db.commit()
    assert (await client.patch(f"/api/v1/admin/canned-responses/{row.id}", json={"shortcut": "hack", "title": "Hack", "content": "x"}, headers=other_auth_headers)).status_code == 404
    assert (await client.delete(f"/api/v1/admin/canned-responses/{row.id}", headers=other_auth_headers)).status_code == 404
    await db.refresh(row)
    assert row.title == "Org A"


async def test_routing_rules_cross_org_probe_returns_404(client, db, org, other_auth_headers):
    row = RoutingRule(organization_id=org.id, name="Org A rule", conditions={}, action={})
    db.add(row)
    await db.commit()
    assert (await client.patch(f"/api/v1/admin/routing-rules/{row.id}", json={"name": "Hack", "conditions": {}, "action": {}}, headers=other_auth_headers)).status_code == 404


async def test_webhooks_and_api_keys_are_tenant_filtered(client, auth_headers, other_auth_headers):
    wh = await client.post("/api/v1/webhooks", json={"url": "https://example.com/hook", "events": ["chat.created"]}, headers=auth_headers)
    assert wh.status_code == 201
    hooks = await client.get("/api/v1/webhooks", headers=other_auth_headers)
    assert all(row["id"] != wh.json()["id"] for row in hooks.json())

    key = await client.post("/api/v1/api-keys", json={"name": "A", "scopes": ["chats.read"]}, headers=auth_headers)
    assert key.status_code == 201
    keys = await client.get("/api/v1/api-keys", headers=other_auth_headers)
    assert all(row["id"] != key.json()["id"] for row in keys.json())


async def test_random_cross_org_id_probes_return_404(client, auth_headers):
    assert (await client.get(f"/api/v1/tickets/{uuid.uuid4()}", headers=auth_headers)).status_code == 404
    assert (await client.get(f"/api/v1/chats/{uuid.uuid4()}", headers=auth_headers)).status_code == 404


async def test_chat_list_tenant_isolation(client, db, org, other_auth_headers):
    chat, _, _ = await _make_chat(db, org, subject="Tenant isolated chat")

    resp = await client.get("/api/v1/chats/", headers=other_auth_headers)

    assert resp.status_code == 200
    assert all(row["id"] != str(chat.id) for row in resp.json())


async def test_ticket_list_tenant_isolation(client, db, org, other_auth_headers):
    ticket = await _make_ticket(db, org, subject="Tenant isolated ticket")

    resp = await client.get("/api/v1/tickets/", headers=other_auth_headers)

    assert resp.status_code == 200
    assert all(row["id"] != str(ticket.id) for row in resp.json())


async def test_canned_response_tenant_isolation(client, db, org, other_auth_headers):
    canned = CannedResponse(organization_id=org.id, shortcut="/test", title="Test", content="Test", tags=[])
    db.add(canned)
    await db.commit()

    resp = await client.get("/api/v1/admin/canned-responses", headers=other_auth_headers)

    assert resp.status_code == 200
    assert all(row["id"] != str(canned.id) for row in resp.json())


async def test_agent_list_tenant_isolation(client, admin_user: User, other_auth_headers):
    resp = await client.get("/api/v1/agents/", headers=other_auth_headers)

    assert resp.status_code == 200
    assert all(row["id"] != str(admin_user.id) for row in resp.json())


async def test_webhook_tenant_isolation(client, db, org, other_auth_headers):
    webhook = Webhook(
        organization_id=org.id,
        url="https://example.com/hook",
        events={"subscribed": ["chat.created"]},
        secret="secret",
    )
    db.add(webhook)
    await db.commit()

    resp = await client.get("/api/v1/webhooks", headers=other_auth_headers)

    assert resp.status_code == 200
    assert all(row["id"] != str(webhook.id) for row in resp.json())


async def test_api_key_tenant_isolation(client, db, org, other_auth_headers):
    api_key = ApiKey(
        organization_id=org.id,
        name="Org A key",
        key_prefix="fl_test",
        key_hash="hash",
        scopes={"items": ["chats.read"]},
    )
    db.add(api_key)
    await db.commit()

    resp = await client.get("/api/v1/api-keys", headers=other_auth_headers)

    assert resp.status_code == 200
    assert all(row["id"] != str(api_key.id) for row in resp.json())


async def test_cross_org_chat_detail_returns_404_not_403(client, db, org, other_auth_headers):
    chat, _, _ = await _make_chat(db, org)

    resp = await client.get(f"/api/v1/chats/{chat.id}", headers=other_auth_headers)

    assert resp.status_code == 404


async def test_cross_org_ticket_detail_returns_404_not_403(client, db, org, other_auth_headers):
    ticket = await _make_ticket(db, org)

    resp = await client.get(f"/api/v1/tickets/{ticket.id}", headers=other_auth_headers)

    assert resp.status_code == 404


async def test_cross_org_chat_resolve_blocked(client, db, org, other_auth_headers):
    chat, _, _ = await _make_chat(db, org)

    resp = await client.post(f"/api/v1/chats/{chat.id}/resolve", headers=other_auth_headers)

    assert resp.status_code == 404


async def test_cross_org_ticket_update_blocked(client, db, org, other_auth_headers):
    ticket = await _make_ticket(db, org)

    resp = await client.patch(f"/api/v1/tickets/{ticket.id}", json={"priority": "low"}, headers=other_auth_headers)

    assert resp.status_code == 404
