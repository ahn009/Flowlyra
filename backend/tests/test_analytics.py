import pytest

pytestmark = pytest.mark.asyncio


async def test_overview(client, auth_headers):
    resp = await client.get("/api/v1/analytics/overview", headers=auth_headers)

    assert resp.status_code == 200
    body = resp.json()
    assert "active_chats" in body
    assert "queue_length" in body
    assert "agents_online" in body


async def test_chat_volume(client, auth_headers):
    resp = await client.get("/api/v1/analytics/chat-volume", headers=auth_headers)

    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


async def test_response_time(client, auth_headers):
    resp = await client.get("/api/v1/analytics/response-time", headers=auth_headers)

    assert resp.status_code == 200
    assert isinstance(resp.json(), dict)


async def test_csat_report(client, auth_headers):
    resp = await client.get("/api/v1/analytics/csat", headers=auth_headers)

    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


async def test_agent_stats(client, auth_headers):
    resp = await client.get("/api/v1/analytics/agent-stats", headers=auth_headers)

    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


async def test_missed_chats(client, auth_headers):
    resp = await client.get("/api/v1/analytics/missed-chats", headers=auth_headers)

    assert resp.status_code == 200


async def test_tags_report(client, auth_headers):
    resp = await client.get("/api/v1/analytics/tags", headers=auth_headers)

    assert resp.status_code == 200


async def test_leaderboard(client, auth_headers):
    resp = await client.get("/api/v1/analytics/leaderboard", headers=auth_headers)

    assert resp.status_code == 200


async def test_analytics_requires_auth(client):
    resp = await client.get("/api/v1/analytics/overview")

    assert resp.status_code == 401
