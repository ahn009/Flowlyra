import uuid
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest

from app.services import ai_service

pytestmark = pytest.mark.asyncio


class FakeRedis:
    async def get(self, key):
        return None

    async def setex(self, key, ttl, value):
        return True


async def test_generate_suggestions_fallback(db, org, monkeypatch):
    monkeypatch.setattr(ai_service, "get_redis", lambda: FakeRedis())
    monkeypatch.setattr(ai_service, "get_ai_provider", lambda: SimpleNamespace(configured=False))
    suggestions = await ai_service.generate_agent_suggestions(db, uuid.uuid4(), "help", org.id)
    assert suggestions == ai_service.FALLBACK_SUGGESTIONS


async def test_transform_text_no_provider(monkeypatch):
    monkeypatch.setattr(ai_service, "get_ai_provider", lambda: SimpleNamespace(configured=False))
    assert await ai_service.transform_text("friendly", "hello") == "hello"


async def test_classify_sentiment_fallback(monkeypatch):
    monkeypatch.setattr(ai_service, "get_ai_provider", lambda: SimpleNamespace(configured=False))
    assert await ai_service.classify_sentiment("I am happy") == ("neutral", 0.0)


async def test_summarize_empty_chat(db, org):
    assert await ai_service.summarize_chat(db, uuid.uuid4(), org.id) == ""


async def test_generate_suggestions_with_provider(db, org, monkeypatch):
    monkeypatch.setattr(ai_service, "get_redis", lambda: FakeRedis())
    provider = SimpleNamespace(configured=True, chat_json=AsyncMock(return_value={"suggestions": ["A", "B", "C"]}))
    monkeypatch.setattr(ai_service, "get_ai_provider", lambda: provider)
    assert await ai_service.generate_agent_suggestions(db, uuid.uuid4(), "help", org.id) == ["A", "B", "C"]


async def test_sentiment_positive(monkeypatch):
    provider = SimpleNamespace(configured=True, chat_json=AsyncMock(return_value={"label": "positive", "score": 0.9}))
    monkeypatch.setattr(ai_service, "get_ai_provider", lambda: provider)
    assert await ai_service.classify_sentiment("great") == ("positive", 0.9)
