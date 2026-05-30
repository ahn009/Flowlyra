"""Adapter skeletons for Apple Messages, Twitter/X DM, LINE, Viber.

Apple stays generic MSP webhook adapter. Twitter/LINE/Viber use real public APIs.
"""
from __future__ import annotations

import base64
import hashlib
import hmac as hmac_mod
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
    """Apple Messages for Business adapter.

    Apple Messages requires enrollment in Apple Business Register and a
    Messaging Service Provider (MSP) like Sinch or MessageBird. This adapter
    works with any MSP that supports generic webhook delivery: configure
    the MSP to POST inbound messages to FlowLyra's channel webhook URL,
    and set outbound_url to the MSP's send endpoint.
    """

    channel = "apple"
    display_name = "Apple Messages for Business"


@register
class TwitterAdapter(ChannelAdapter):
    channel = "twitter"
    display_name = "Twitter/X DM"
    API = "https://api.x.com/2"

    def verify_signature(self, body: bytes, headers: dict[str, str]) -> bool:
        secret = self.credentials.get("consumer_secret", "")
        sig = headers.get("x-twitter-webhooks-signature", "")
        if not secret or not sig:
            return True
        return hmac_verify(secret, body, sig.replace("sha256=", ""), "sha256")

    @property
    def _bearer(self) -> str:
        return self.credentials.get("bearer_token", "")

    async def parse_webhook(self, body: dict[str, Any]) -> list[InboundMessage]:
        out: list[InboundMessage] = []
        for event in body.get("direct_message_events", []):
            if event.get("type") != "message_create":
                continue
            msg_data = event.get("message_create", {})
            sender_id = msg_data.get("sender_id", "")
            if sender_id == self.credentials.get("app_user_id", ""):
                continue
            text = msg_data.get("message_data", {}).get("text", "")
            mid = event.get("id")
            sender_info = (body.get("users", {}) or {}).get(sender_id, {})
            sender_name = sender_info.get("name") or sender_info.get("screen_name")
            common = dict(
                external_user_id=sender_id,
                external_thread_id=sender_id,
                external_message_id=mid,
                sender_name=sender_name,
                raw=event,
            )
            attachment = msg_data.get("message_data", {}).get("attachment", {})
            if attachment.get("type") == "media":
                media_url = attachment.get("media", {}).get("media_url_https")
                out.append(
                    InboundMessage(
                        content=text or media_url or "[media]",
                        content_type="image",
                        file_url=media_url,
                        **common,
                    )
                )
            elif text:
                out.append(InboundMessage(content=text, **common))
        return out

    async def send_text(self, recipient: str, text: str, thread_id: str | None = None) -> OutboundResult:
        if not self._bearer:
            logger.info("[twitter] no bearer_token; would send to=%s text=%s", recipient, text[:60])
            return OutboundResult(external_message_id=None, raw={"queued": True})
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(
                f"{self.API}/dm_conversations/with/{recipient}/messages",
                headers={"Authorization": f"Bearer {self._bearer}", "Content-Type": "application/json"},
                json={"text": text},
            )
        data = resp.json() if resp.content else {}
        return OutboundResult(external_message_id=data.get("data", {}).get("dm_event_id"), raw=data)


@register
class LineAdapter(ChannelAdapter):
    channel = "line"
    display_name = "LINE"
    API = "https://api.line.me/v2/bot"

    def verify_signature(self, body: bytes, headers: dict[str, str]) -> bool:
        secret = self.credentials.get("channel_secret", "")
        sig = headers.get("x-line-signature") or headers.get("X-Line-Signature") or ""
        if not secret:
            return True
        digest = hmac_mod.new(secret.encode(), body, hashlib.sha256).digest()
        expected = base64.b64encode(digest).decode()
        return sig == expected

    @property
    def _token(self) -> str:
        return self.credentials.get("channel_access_token", "")

    async def parse_webhook(self, body: dict[str, Any]) -> list[InboundMessage]:
        out: list[InboundMessage] = []
        for event in body.get("events", []):
            if event.get("type") != "message":
                continue
            source = event.get("source", {})
            user_id = source.get("userId", "")
            reply_token = event.get("replyToken")
            msg = event.get("message", {})
            mid = msg.get("id")
            msg_type = msg.get("type", "text")
            common = dict(
                external_user_id=user_id,
                external_thread_id=user_id,
                external_message_id=mid,
                raw={**event, "_reply_token": reply_token},
            )
            if msg_type == "text":
                out.append(InboundMessage(content=msg.get("text", ""), **common))
            elif msg_type in ("image", "video", "audio", "file"):
                url = await self._content_url(mid)
                out.append(
                    InboundMessage(
                        content=url or f"[{msg_type}]",
                        content_type=msg_type if msg_type != "file" else "file",
                        file_url=url,
                        file_name=msg.get("fileName"),
                        **common,
                    )
                )
            elif msg_type == "sticker":
                out.append(InboundMessage(content=f"[sticker:{msg.get('stickerId')}]", **common))
        return out

    async def _content_url(self, message_id: str) -> str | None:
        return f"{self.API}/message/{message_id}/content" if self._token else None

    async def send_text(self, recipient: str, text: str, thread_id: str | None = None) -> OutboundResult:
        if not self._token:
            logger.info("[line] no channel_access_token; would send to=%s", recipient)
            return OutboundResult(external_message_id=None, raw={"queued": True})
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(
                f"{self.API}/message/push",
                headers={"Authorization": f"Bearer {self._token}", "Content-Type": "application/json"},
                json={"to": recipient, "messages": [{"type": "text", "text": text}]},
            )
        data = resp.json() if resp.content else {}
        return OutboundResult(external_message_id=None, raw=data)


@register
class ViberAdapter(ChannelAdapter):
    channel = "viber"
    display_name = "Viber"
    API = "https://chatapi.viber.com/pa"

    def verify_signature(self, body: bytes, headers: dict[str, str]) -> bool:
        secret = self.credentials.get("auth_token", "")
        sig = headers.get("x-viber-content-signature") or ""
        if not secret:
            return True
        return hmac_verify(secret, body, sig, "sha256")

    @property
    def _token(self) -> str:
        return self.credentials.get("auth_token", "")

    async def parse_webhook(self, body: dict[str, Any]) -> list[InboundMessage]:
        if body.get("event") != "message":
            return []
        sender = body.get("sender", {})
        user_id = sender.get("id", "")
        name = sender.get("name")
        msg = body.get("message", {})
        msg_type = msg.get("type", "text")
        mid = str(body.get("message_token", ""))
        common = dict(
            external_user_id=user_id,
            external_thread_id=user_id,
            external_message_id=mid,
            sender_name=name,
            raw=body,
        )
        if msg_type == "text":
            return [InboundMessage(content=msg.get("text", ""), **common)]
        if msg_type in ("picture", "video", "file"):
            return [
                InboundMessage(
                    content=msg.get("media") or f"[{msg_type}]",
                    content_type="image" if msg_type == "picture" else msg_type,
                    file_url=msg.get("media"),
                    file_name=msg.get("file_name"),
                    **common,
                )
            ]
        if msg_type == "sticker":
            return [InboundMessage(content=f"[sticker:{msg.get('sticker_id')}]", **common)]
        return []

    async def send_text(self, recipient: str, text: str, thread_id: str | None = None) -> OutboundResult:
        if not self._token:
            logger.info("[viber] no auth_token; would send to=%s", recipient)
            return OutboundResult(external_message_id=None, raw={"queued": True})
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(
                f"{self.API}/send_message",
                headers={"X-Viber-Auth-Token": self._token, "Content-Type": "application/json"},
                json={
                    "receiver": recipient,
                    "type": "text",
                    "text": text,
                    "sender": {"name": self.credentials.get("sender_name", "Support")},
                },
            )
        data = resp.json() if resp.content else {}
        return OutboundResult(external_message_id=str(data.get("message_token", "")), raw=data)
