from types import SimpleNamespace
from unittest.mock import AsyncMock
import uuid

import pytest

from app.models.contact import Contact
from app.models.user import User
from app.services import ai_service
from app.services import routing_service
from app.api import widget as widget_api

pytestmark = pytest.mark.asyncio


async def test_copilot_no_provider(db, org, monkeypatch):
    monkeypatch.setattr(ai_service, "get_ai_provider", lambda: SimpleNamespace(configured=False))
    result = await ai_service.copilot_answer(db, None, org.id, "What should I say?")
    assert result == {"answer": "AI not configured.", "sources": []}


async def test_auto_tag_chat_with_provider(db, org, monkeypatch):
    monkeypatch.setattr(ai_service, "_conversation_context", AsyncMock(return_value=[SimpleNamespace(sender_type="customer", content="refund please")]))
    provider = SimpleNamespace(configured=True, chat_json=AsyncMock(return_value={"tags": ["Refund", "billing"]}))
    monkeypatch.setattr(ai_service, "get_ai_provider", lambda: provider)
    assert await ai_service.auto_tag_chat(db, uuid.uuid4(), org.id) == ["refund", "billing"]


async def test_format_messages_skips_empty_content():
    rows = [SimpleNamespace(sender_type="customer", content="Hi"), SimpleNamespace(sender_type="agent", content=None)]
    assert ai_service._format_messages(rows) == "customer: Hi"


async def test_has_required_skills_case_insensitive():
    user = SimpleNamespace(skills=["Billing", "Refunds"])
    assert routing_service._has_required_skills(user, ["billing"])


async def test_choose_agent_no_available_agents(db, org):
    assert await routing_service.choose_agent(db, org.id) is None


async def test_choose_agent_skill_based(db, org):
    billing = User(organization_id=org.id, email="billing@test.com", password_hash="x", full_name="Billing", role="agent", is_active=True, status="online", skills=["billing"])
    sales = User(organization_id=org.id, email="sales@test.com", password_hash="x", full_name="Sales", role="agent", is_active=True, status="online", skills=["sales"])
    db.add_all([billing, sales])
    await db.commit()
    picked = await routing_service.choose_agent(db, org.id, strategy="skill", required_skills=["billing"])
    assert picked.email == "billing@test.com"


async def test_choose_agent_vip_handler(db, org):
    vip = User(organization_id=org.id, email="vip@test.com", password_hash="x", full_name="VIP", role="agent", is_active=True, status="online", is_vip_handler=True)
    normal = User(organization_id=org.id, email="normal@test.com", password_hash="x", full_name="Normal", role="agent", is_active=True, status="online")
    db.add_all([vip, normal])
    await db.commit()
    picked = await routing_service.choose_agent(db, org.id, strategy="vip", vip=True)
    assert picked.email == "vip@test.com"


async def test_choose_agent_load_based_uses_lowest_load(db, org, monkeypatch):
    a = User(organization_id=org.id, email="a@test.com", password_hash="x", full_name="A", role="agent", is_active=True, status="online")
    b = User(organization_id=org.id, email="b@test.com", password_hash="x", full_name="B", role="agent", is_active=True, status="online")
    db.add_all([a, b])
    await db.commit()
    async def fake_load(_db, user_id):
        return 5 if user_id == a.id else 1
    monkeypatch.setattr(routing_service, "_agent_load", fake_load)
    picked = await routing_service.choose_agent(db, org.id, strategy="load")
    assert picked.email == "b@test.com"


async def test_choose_agent_overloaded_pool_falls_back(db, org, monkeypatch):
    a = User(organization_id=org.id, email="over@test.com", password_hash="x", full_name="Over", role="agent", is_active=True, status="online", max_concurrent_chats=1)
    db.add(a)
    await db.commit()
    monkeypatch.setattr(routing_service, "_agent_load", AsyncMock(return_value=2))
    picked = await routing_service.choose_agent(db, org.id)
    assert picked.email == "over@test.com"


async def test_widget_domain_allowed_exact_and_wildcard():
    assert widget_api._domain_allowed("app.example.com", {"domains": ["*.example.com"]})
    assert widget_api._domain_allowed("example.com", {"domains": ["example.com"]})


async def test_widget_domain_blocks_unknown():
    assert not widget_api._domain_allowed("evil.com", {"domains": ["example.com"]})


async def test_widget_hostname_normalizes_url():
    assert widget_api._hostname("https://APP.Example.com/path") == "app.example.com"


async def test_widget_resolve_locale_fallback(org):
    org.widget_supported_locales = {"locales": ["en", "fr"]}
    org.widget_default_locale = "en"
    assert widget_api._resolve_locale("es", org) == "en"


async def test_widget_pick_greeting_segments(org, monkeypatch):
    org.widget_greetings = {"segments": {"returning": ["Welcome back"]}}
    assert widget_api._pick_greeting(org, is_returning=True) == "Welcome back"
