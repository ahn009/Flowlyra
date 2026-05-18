"""Twilio SMS adapter."""
from __future__ import annotations

import base64
import hashlib
import hmac
import logging
from typing import Any

import httpx

from app.channels.base import ChannelAdapter, InboundMessage, OutboundResult, register

logger = logging.getLogger(__name__)


@register
class TwilioSmsAdapter(ChannelAdapter):
    channel = "sms"
    display_name = "SMS (Twilio)"

    def verify_signature(self, body: bytes, headers: dict[str, str]) -> bool:
        # Twilio uses X-Twilio-Signature: base64(HMAC-SHA1(auth_token, full_url + sorted_params))
        auth_token = self.credentials.get("auth_token", "")
        signature = headers.get("x-twilio-signature") or headers.get("X-Twilio-Signature") or ""
        url = headers.get("x-twilio-webhook-url", "")
        if not auth_token or not signature:
            return False
        # Body is form-urlencoded. For simplicity verify against raw body hash mode.
        params = headers.get("x-twilio-sorted-params", "")
        signed_string = url + params
        digest = hmac.new(auth_token.encode(), signed_string.encode(), hashlib.sha1).digest()
        expected = base64.b64encode(digest).decode()
        return hmac.compare_digest(expected, signature)

    async def parse_webhook(self, body: dict[str, Any]) -> list[InboundMessage]:
        sender = body.get("From", "")
        text = body.get("Body", "")
        mid = body.get("MessageSid")
        if not sender:
            return []
        msgs = []
        if text:
            msgs.append(
                InboundMessage(
                    external_user_id=sender,
                    external_thread_id=sender,
                    content=text,
                    external_message_id=mid,
                    sender_phone=sender,
                    raw=body,
                )
            )
        num_media = int(body.get("NumMedia", "0") or 0)
        for i in range(num_media):
            url = body.get(f"MediaUrl{i}")
            mime = body.get(f"MediaContentType{i}", "")
            if not url:
                continue
            kind = "image" if mime.startswith("image/") else "file"
            msgs.append(
                InboundMessage(
                    external_user_id=sender,
                    external_thread_id=sender,
                    content=url,
                    content_type=kind,
                    file_url=url,
                    file_mime=mime,
                    external_message_id=mid,
                    sender_phone=sender,
                    raw=body,
                )
            )
        return msgs

    async def send_text(self, recipient: str, text: str, thread_id: str | None = None) -> OutboundResult:
        sid = self.credentials.get("account_sid", "")
        token = self.credentials.get("auth_token", "")
        from_number = self.credentials.get("from_number", "")
        if not sid or not token or not from_number:
            raise RuntimeError("Twilio creds incomplete")
        async with httpx.AsyncClient(timeout=15, auth=(sid, token)) as client:
            resp = await client.post(
                f"https://api.twilio.com/2010-04-01/Accounts/{sid}/Messages.json",
                data={"From": from_number, "To": recipient, "Body": text[:1600]},
            )
        data = resp.json() if resp.content else {}
        return OutboundResult(external_message_id=data.get("sid"), raw=data)

    async def send_attachment(self, recipient: str, url: str, kind: str, thread_id: str | None = None) -> OutboundResult:
        sid = self.credentials.get("account_sid", "")
        token = self.credentials.get("auth_token", "")
        from_number = self.credentials.get("from_number", "")
        async with httpx.AsyncClient(timeout=15, auth=(sid, token)) as client:
            resp = await client.post(
                f"https://api.twilio.com/2010-04-01/Accounts/{sid}/Messages.json",
                data={"From": from_number, "To": recipient, "MediaUrl": url},
            )
        data = resp.json() if resp.content else {}
        return OutboundResult(external_message_id=data.get("sid"), raw=data)
