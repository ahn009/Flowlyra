"""Adapter skeletons for Apple Messages, Twitter/X DM, LINE, Viber.

These implement the framework contract with minimal generic webhook + HTTP-POST send.
Full provider-specific verification can be tightened when activating.
"""
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


class _GenericHttpAdapter(ChannelAdapter):
    """Adapter that POSTs to a configured outbound URL with a JSON envelope."""

    def verify_signature(self, body: bytes, headers: dict[str, str]) -> bool:
        secret = self.credentials.get("webhook_secret", "")
        sig = headers.get("x-signature") or headers.get("X-Signature") or ""
        if not secret:
            return True
        return hmac_verify(secret, body, sig)

    async def parse_webhook(self, body: dict[str, Any]) -> list[InboundMessage]:
        sender = body.get("user_id") or body.get("sender") or body.get("from") or ""
        text = body.get("text") or body.get("body") or ""
        mid = body.get("message_id") or body.get("id")
        if not sender or not text:
            return []
        return [
            InboundMessage(
                external_user_id=str(sender),
                external_thread_id=str(sender),
                content=str(text),
                external_message_id=mid,
                sender_name=body.get("name"),
                raw=body,
            )
        ]

    async def send_text(self, recipient: str, text: str, thread_id: str | None = None) -> OutboundResult:
        url = self.credentials.get("outbound_url")
        token = self.credentials.get("access_token", "")
        if not url:
            logger.info("[%s] no outbound_url configured; would send to=%s text=%s", self.channel, recipient, text[:60])
            return OutboundResult(external_message_id=None, raw={"queued": True})
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(
                url,
                headers={"Authorization": f"Bearer {token}"} if token else {},
                json={"channel": self.channel, "to": recipient, "text": text, "thread_id": thread_id},
            )
        data = resp.json() if resp.content else {}
        return OutboundResult(external_message_id=data.get("id"), raw=data)


@register
class AppleAdapter(_GenericHttpAdapter):
    channel = "apple"
    display_name = "Apple Messages for Business"


@register
class TwitterAdapter(_GenericHttpAdapter):
    channel = "twitter"
    display_name = "Twitter/X DM"


@register
class LineAdapter(_GenericHttpAdapter):
    channel = "line"
    display_name = "LINE"


@register
class ViberAdapter(_GenericHttpAdapter):
    channel = "viber"
    display_name = "Viber"
