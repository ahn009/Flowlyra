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
