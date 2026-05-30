import pytest
from app.channels.other_channels import TwitterAdapter, LineAdapter, ViberAdapter

pytestmark = pytest.mark.asyncio


async def test_twitter_parse_dm_event():
    adapter = TwitterAdapter(credentials={"consumer_secret": "", "app_user_id": "bot_123"})
    payload = {
        "direct_message_events": [{
            "type": "message_create",
            "id": "msg_1",
            "message_create": {
                "sender_id": "user_456",
                "message_data": {"text": "Hello from Twitter"},
            },
        }],
        "users": {"user_456": {"name": "Test User", "screen_name": "testuser"}},
    }
    messages = await adapter.parse_webhook(payload)
    assert len(messages) == 1
    assert messages[0].content == "Hello from Twitter"
    assert messages[0].external_user_id == "user_456"
    assert messages[0].sender_name == "Test User"


async def test_twitter_skips_own_messages():
    adapter = TwitterAdapter(credentials={"app_user_id": "bot_123"})
    payload = {
        "direct_message_events": [{
            "type": "message_create",
            "id": "msg_2",
            "message_create": {"sender_id": "bot_123", "message_data": {"text": "My own message"}},
        }],
        "users": {},
    }
    messages = await adapter.parse_webhook(payload)
    assert len(messages) == 0


async def test_line_parse_text_message():
    adapter = LineAdapter(credentials={"channel_secret": ""})
    payload = {
        "events": [{
            "type": "message",
            "source": {"userId": "Uabc123"},
            "replyToken": "tok",
            "message": {"id": "mid_1", "type": "text", "text": "Hello from LINE"},
        }],
    }
    messages = await adapter.parse_webhook(payload)
    assert len(messages) == 1
    assert messages[0].content == "Hello from LINE"
    assert messages[0].external_user_id == "Uabc123"


async def test_line_parse_sticker():
    adapter = LineAdapter(credentials={})
    payload = {
        "events": [{
            "type": "message",
            "source": {"userId": "U1"},
            "replyToken": "tok",
            "message": {"id": "mid_2", "type": "sticker", "stickerId": "1234"},
        }],
    }
    messages = await adapter.parse_webhook(payload)
    assert len(messages) == 1
    assert "sticker:1234" in messages[0].content


async def test_viber_parse_text():
    adapter = ViberAdapter(credentials={"auth_token": ""})
    payload = {
        "event": "message",
        "sender": {"id": "vib_user_1", "name": "Viber User"},
        "message_token": 12345,
        "message": {"type": "text", "text": "Hello from Viber"},
    }
    messages = await adapter.parse_webhook(payload)
    assert len(messages) == 1
    assert messages[0].content == "Hello from Viber"
    assert messages[0].sender_name == "Viber User"


async def test_viber_ignores_non_message_events():
    adapter = ViberAdapter(credentials={})
    payload = {"event": "delivered", "message_token": 99}
    messages = await adapter.parse_webhook(payload)
    assert len(messages) == 0
