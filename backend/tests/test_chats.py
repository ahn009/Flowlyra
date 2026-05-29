import uuid

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.chat import Chat
from app.models.contact import Contact
from app.models.message import Message
from app.models.session import Session

pytestmark = pytest.mark.asyncio


async def _make_chat(db: AsyncSession, org, *, status="waiting", assigned_user_id=None, subject="Test chat"):
    contact = Contact(
        organization_id=org.id,
        email=f"visitor-{uuid.uuid4().hex[:8]}@test.com",
        full_name="Test Visitor",
    )
    db.add(contact)
    await db.flush()
    session = Session(
        organization_id=org.id,
        contact_id=contact.id,
        session_token=f"tok-{uuid.uuid4().hex}",
    )
    db.add(session)
    await db.flush()
    chat = Chat(
        organization_id=org.id,
        session_id=session.id,
        contact_id=contact.id,
        status=status,
        channel="web",
        assigned_user_id=assigned_user_id,
        subject=subject,
        tags=[],
    )
    db.add(chat)
    await db.commit()
    await db.refresh(chat)
    return chat, contact, session


async def test_list_chats(client, db, org, auth_headers):
    chat, _, _ = await _make_chat(db, org)

    resp = await client.get("/api/v1/chats/", headers=auth_headers)

    assert resp.status_code == 200
    assert any(row["id"] == str(chat.id) for row in resp.json())


async def test_list_chats_tenant_isolation(client, db, org, other_auth_headers):
    chat, _, _ = await _make_chat(db, org)

    resp = await client.get("/api/v1/chats/", headers=other_auth_headers)

    assert resp.status_code == 200
    assert all(row["id"] != str(chat.id) for row in resp.json())


async def test_get_chat_detail(client, db, org, auth_headers):
    chat, _, _ = await _make_chat(db, org, status="active")

    resp = await client.get(f"/api/v1/chats/{chat.id}", headers=auth_headers)

    assert resp.status_code == 200
    body = resp.json()
    assert body["id"] == str(chat.id)
    assert body["status"] == "active"
    assert "messages" in body


async def test_get_chat_wrong_org(client, db, org, other_auth_headers):
    chat, _, _ = await _make_chat(db, org)

    resp = await client.get(f"/api/v1/chats/{chat.id}", headers=other_auth_headers)

    assert resp.status_code == 404


async def test_resolve_chat(client, db, org, admin_user, auth_headers):
    chat, _, _ = await _make_chat(db, org, status="waiting", assigned_user_id=admin_user.id)

    resp = await client.post(f"/api/v1/chats/{chat.id}/resolve", headers=auth_headers)

    assert resp.status_code == 200
    assert resp.json()["status"] == "resolved"


async def test_add_note(client, db, org, auth_headers):
    chat, _, _ = await _make_chat(db, org)

    resp = await client.post(f"/api/v1/chats/{chat.id}/note", json={"content": "Internal note"}, headers=auth_headers)

    assert resp.status_code == 200
    body = resp.json()
    assert body["content"] == "Internal note"
    assert body["is_internal"] is True


async def test_add_tag(client, db, org, auth_headers):
    chat, _, _ = await _make_chat(db, org)

    resp = await client.post(f"/api/v1/chats/{chat.id}/tag", json={"tag": "billing"}, headers=auth_headers)

    assert resp.status_code == 200
    assert "billing" in resp.json()["tags"]


async def test_remove_tag(client, db, org, auth_headers):
    chat, _, _ = await _make_chat(db, org)
    add_resp = await client.post(f"/api/v1/chats/{chat.id}/tag", json={"tag": "billing"}, headers=auth_headers)
    assert add_resp.status_code == 200

    resp = await client.delete(f"/api/v1/chats/{chat.id}/tag/billing", headers=auth_headers)

    assert resp.status_code == 200
    assert "billing" not in resp.json()["tags"]


async def test_search_chats(client, db, org, auth_headers):
    chat, _, _ = await _make_chat(db, org)
    db.add(Message(chat_id=chat.id, sender_type="customer", content="known-keyword"))
    await db.commit()

    resp = await client.get("/api/v1/chats/search", params={"q": "known-keyword"}, headers=auth_headers)

    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


async def test_convert_chat_to_ticket(client, db, org, auth_headers):
    chat, _, _ = await _make_chat(db, org)

    resp = await client.post(f"/api/v1/chats/{chat.id}/convert-ticket", headers=auth_headers)

    assert resp.status_code == 200
    assert resp.json()["ticket_id"]
