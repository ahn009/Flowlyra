"""Facebook Messenger adapter (Graph API)."""
from __future__ import annotations

import logging
from typing import Any

import httpx

from app.channels.base import (
    ChannelAdapter,
    InboundMessage,
    OutboundResult,
    hmac_verify,
    register,
)

logger = logging.getLogger(__name__)
GRAPH = "https://graph.facebook.com/v18.0"


@register
class MessengerAdapter(ChannelAdapter):
    channel = "messenger"
    display_name = "Facebook Messenger"

    def verify_signature(self, body: bytes, headers: dict[str, str]) -> bool:
        secret = self.credentials.get("app_secret", "")
        sig = headers.get("x-hub-signature-256") or headers.get("X-Hub-Signature-256") or ""
        return hmac_verify(secret, body, sig, "sha256")

    async def parse_webhook(self, body: dict[str, Any]) -> list[InboundMessage]:
        out: list[InboundMessage] = []
        for entry in body.get("entry", []):
            for event in entry.get("messaging", []):
                sender = (event.get("sender") or {}).get("id")
                if not sender:
                    continue
                msg = event.get("message") or {}
                if msg.get("is_echo"):
                    continue
                text = msg.get("text", "")
                mid = msg.get("mid")
                attachments = msg.get("attachments") or []
                if text:
                    out.append(
                        InboundMessage(
                            external_user_id=sender,
                            external_thread_id=sender,
                            content=text,
                            external_message_id=mid,
                            raw=event,
                        )
                    )
                for att in attachments:
                    a_type = att.get("type", "file")
                    payload = att.get("payload") or {}
                    url = payload.get("url")
                    if not url:
                        continue
                    out.append(
                        InboundMessage(
                            external_user_id=sender,
                            external_thread_id=sender,
                            content=url,
                            content_type=a_type if a_type in ("image", "video", "audio") else "file",
                            file_url=url,
                            external_message_id=mid,
                            raw=event,
                        )
                    )
        return out

    async def send_text(self, recipient: str, text: str, thread_id: str | None = None) -> OutboundResult:
        token = self.credentials.get("page_access_token", "")
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(
                f"{GRAPH}/me/messages",
                params={"access_token": token},
                json={
                    "recipient": {"id": recipient},
                    "messaging_type": "RESPONSE",
                    "message": {"text": text[:2000]},
                },
            )
        data = resp.json() if resp.content else {}
        return OutboundResult(external_message_id=data.get("message_id"), raw=data)

    async def send_attachment(self, recipient: str, url: str, kind: str, thread_id: str | None = None) -> OutboundResult:
        token = self.credentials.get("page_access_token", "")
        fb_type = {"image": "image", "video": "video", "audio": "audio"}.get(kind, "file")
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(
                f"{GRAPH}/me/messages",
                params={"access_token": token},
                json={
                    "recipient": {"id": recipient},
                    "message": {"attachment": {"type": fb_type, "payload": {"url": url, "is_reusable": True}}},
                },
            )
        data = resp.json() if resp.content else {}
        return OutboundResult(external_message_id=data.get("message_id"), raw=data)

    async def send_quick_replies(self, recipient: str, text: str, options: list[str], thread_id: str | None = None) -> OutboundResult:
        token = self.credentials.get("page_access_token", "")
        replies = [{"content_type": "text", "title": opt[:20], "payload": opt} for opt in options[:13]]
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(
                f"{GRAPH}/me/messages",
                params={"access_token": token},
                json={
                    "recipient": {"id": recipient},
                    "message": {"text": text[:640], "quick_replies": replies},
                },
            )
        data = resp.json() if resp.content else {}
        return OutboundResult(external_message_id=data.get("message_id"), raw=data)


@register
class InstagramAdapter(MessengerAdapter):
    channel = "instagram"
    display_name = "Instagram DM"
