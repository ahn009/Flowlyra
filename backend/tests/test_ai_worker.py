from unittest.mock import AsyncMock
import uuid

import pytest

from app.workers import ai_worker
from tests.conftest import TestSessionLocal

pytestmark = pytest.mark.asyncio


async def test_run_suggestions_emits_to_assigned_agent(monkeypatch):
    chat_id = uuid.uuid4()
    org_id = uuid.uuid4()
    agent_id = uuid.uuid4()
    suggestions = ["Ask for the order number", "Offer a refund timeline"]

    monkeypatch.setattr(ai_worker, "AsyncSessionLocal", TestSessionLocal)
    monkeypatch.setattr(ai_worker.ai_service, "generate_agent_suggestions", AsyncMock(return_value=suggestions))
    monkeypatch.setattr(ai_worker.ai_service, "assigned_agent_for_chat", AsyncMock(return_value=agent_id))
    emit = AsyncMock()
    monkeypatch.setattr(ai_worker, "emit_ai_suggestions", emit)

    result = await ai_worker._run_suggestions(str(chat_id), "refund request", str(org_id))

    assert result == suggestions
    ai_worker.ai_service.generate_agent_suggestions.assert_awaited_once()
    ai_worker.ai_service.assigned_agent_for_chat.assert_awaited_once()
    emit.assert_awaited_once_with(str(agent_id), str(chat_id), suggestions)
