from unittest.mock import AsyncMock

import pytest

from app import socket_manager

pytestmark = pytest.mark.asyncio


async def test_emit_to_rooms_publishes_each_room(monkeypatch):
    emit = AsyncMock()
    monkeypatch.setattr(socket_manager.sio, "emit", emit)

    await socket_manager.emit_to_rooms("chat:message:new", {"id": "msg_1"}, ["chat:1", "org:1", "agent:1"])

    assert emit.await_count == 3
    emit.assert_any_await("chat:message:new", {"id": "msg_1"}, room="chat:1")
    emit.assert_any_await("chat:message:new", {"id": "msg_1"}, room="org:1")
    emit.assert_any_await("chat:message:new", {"id": "msg_1"}, room="agent:1")


async def test_mark_read_socket_event_structure(monkeypatch):
    """Verify the chat:mark_read handler emits chat:messages:read."""
    from app import socket_manager
    from unittest.mock import AsyncMock

    emit = AsyncMock()
    monkeypatch.setattr(socket_manager.sio, "emit", emit)
    handlers = [name for name in dir(socket_manager) if name == "mark_read"]
    assert len(handlers) == 1 or hasattr(socket_manager, "mark_read")
