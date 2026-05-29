from typing import Any
import httpx
from app.integrations.base import IntegrationProvider

class SlackProvider(IntegrationProvider):
    provider = "slack"
    @property
    def token(self): return self.oauth_token or self.config.get("bot_token") or self.config.get("access_token")
    async def test_connection(self) -> bool:
        if not self.token: return False
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.post("https://slack.com/api/auth.test", headers={"Authorization": f"Bearer {self.token}"})
        return bool(r.json().get("ok"))
    async def send_notification(self, channel: str, text: str, blocks: list | None = None) -> dict:
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.post("https://slack.com/api/chat.postMessage", headers={"Authorization": f"Bearer {self.token}"}, json={"channel": channel, "text": text, "blocks": blocks})
        return r.json()
    async def sync(self, org_id, db) -> dict[str, Any]: return {"mode": "event_driven"}
    def format_chat_notification(self, chat, message) -> dict:
        return {"text": f"New chat message: {getattr(message, 'content', '')}", "blocks": [{"type": "section", "text": {"type": "mrkdwn", "text": f"*New chat* <{self.config.get('app_url','')}/inbox/chat/{chat.id}|Open chat>\n{getattr(message, 'content', '')}"}}]}
