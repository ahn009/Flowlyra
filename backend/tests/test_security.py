from datetime import timedelta

import pytest

from app.middleware.auth import create_token, hash_password, verify_password
from tests.test_chats import _make_chat

pytestmark = pytest.mark.asyncio


async def test_password_hashing_roundtrip():
    hashed = hash_password("Test@12345")

    assert verify_password("Test@12345", hashed) is True
    assert verify_password("Wrong", hashed) is False


async def test_expired_token_rejected(client, admin_user):
    token = create_token(admin_user, "access", timedelta(seconds=-1))

    resp = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})

    assert resp.status_code == 401


async def test_role_guard_agent_cannot_access_admin_agents(client, agent_headers):
    resp = await client.post(
        "/api/v1/agents/",
        json={"email": "x@test.com", "full_name": "X", "role": "agent"},
        headers=agent_headers,
    )

    assert resp.status_code == 403


async def test_sql_injection_in_search(client, auth_headers):
    resp = await client.get(
        "/api/v1/chats/search",
        params={"q": "'; DROP TABLE users; --"},
        headers=auth_headers,
    )

    assert resp.status_code in {200, 422}


async def test_xss_stored_in_message(client, db, org, auth_headers):
    chat, _, _ = await _make_chat(db, org)
    content = "<script>alert('xss')</script>"

    resp = await client.post(f"/api/v1/chats/{chat.id}/note", json={"content": content}, headers=auth_headers)

    assert resp.status_code == 200
    assert resp.json()["content"] == content


async def test_no_auth_on_protected_routes(client):
    routes = [
        "/api/v1/chats/",
        "/api/v1/tickets/",
        "/api/v1/agents/",
        "/api/v1/analytics/overview",
    ]

    for route in routes:
        resp = await client.get(route)
        assert resp.status_code == 401
