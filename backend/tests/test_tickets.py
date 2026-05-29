import pytest

from app.services.ticket_service import create_ticket

pytestmark = pytest.mark.asyncio


async def _make_ticket(db, org, *, subject="Issue", priority="medium", status="open"):
    ticket = await create_ticket(
        db,
        org.id,
        {
            "subject": subject,
            "description": "Description",
            "priority": priority,
            "status": status,
            "tags": [],
            "custom_fields": {},
        },
    )
    await db.commit()
    await db.refresh(ticket)
    return ticket


async def test_create_ticket(client, auth_headers):
    resp = await client.post(
        "/api/v1/tickets/",
        json={"subject": "Need help", "priority": "high"},
        headers=auth_headers,
    )

    assert resp.status_code in {200, 201}
    body = resp.json()
    assert body["id"]
    assert body["ticket_number"]
    assert body["subject"] == "Need help"
    assert body["priority"] == "high"


async def test_list_tickets(client, db, org, auth_headers):
    await _make_ticket(db, org)

    resp = await client.get("/api/v1/tickets/", headers=auth_headers)

    assert resp.status_code == 200
    assert len(resp.json()) >= 1


async def test_list_tickets_tenant_isolation(client, db, org, other_auth_headers):
    ticket = await _make_ticket(db, org)

    resp = await client.get("/api/v1/tickets/", headers=other_auth_headers)

    assert resp.status_code == 200
    assert all(row["id"] != str(ticket.id) for row in resp.json())


async def test_get_ticket_detail(client, db, org, auth_headers):
    ticket = await _make_ticket(db, org)

    resp = await client.get(f"/api/v1/tickets/{ticket.id}", headers=auth_headers)

    assert resp.status_code == 200
    body = resp.json()
    assert body["ticket"]["id"] == str(ticket.id)
    assert "comments" in body
    assert "activity" in body


async def test_update_ticket(client, db, org, auth_headers):
    ticket = await _make_ticket(db, org)

    resp = await client.patch(f"/api/v1/tickets/{ticket.id}", json={"priority": "low"}, headers=auth_headers)

    assert resp.status_code == 200
    assert resp.json()["priority"] == "low"


async def test_resolve_ticket(client, db, org, auth_headers):
    ticket = await _make_ticket(db, org)

    resp = await client.post(f"/api/v1/tickets/{ticket.id}/resolve", headers=auth_headers)

    assert resp.status_code == 200
    assert resp.json()["status"] == "resolved"


async def test_add_comment(client, db, org, auth_headers):
    ticket = await _make_ticket(db, org)

    resp = await client.post(f"/api/v1/tickets/{ticket.id}/comments", json={"content": "Hello"}, headers=auth_headers)

    assert resp.status_code == 200
    assert resp.json()["content"] == "Hello"


async def test_add_internal_comment(client, db, org, auth_headers):
    ticket = await _make_ticket(db, org)

    resp = await client.post(
        f"/api/v1/tickets/{ticket.id}/comments",
        json={"content": "Secret", "is_internal": True},
        headers=auth_headers,
    )

    assert resp.status_code == 200
    assert resp.json()["is_internal"] is True


async def test_ticket_priority_filter(client, db, org, auth_headers):
    high = await _make_ticket(db, org, subject="High", priority="high")
    low = await _make_ticket(db, org, subject="Low", priority="low")

    resp = await client.get("/api/v1/tickets/", params={"priority": "high"}, headers=auth_headers)

    assert resp.status_code == 200
    ids = {row["id"] for row in resp.json()}
    assert str(high.id) in ids
    assert str(low.id) not in ids
    assert all(row["priority"] == "high" for row in resp.json())


async def test_cross_org_ticket_detail_returns_404(client, db, org, other_auth_headers):
    ticket = await _make_ticket(db, org)

    resp = await client.get(f"/api/v1/tickets/{ticket.id}", headers=other_auth_headers)

    assert resp.status_code == 404
