"""Email channel adapter (outbound via SendGrid, inbound via SendGrid Inbound Parse / IMAP)."""
from __future__ import annotations

import logging
from typing import Any

from app.channels.base import ChannelAdapter, InboundMessage, OutboundResult, register
from app.services.email_service import send_email

logger = logging.getLogger(__name__)


@register
class EmailAdapter(ChannelAdapter):
    channel = "email"
    display_name = "Email"
    requires_webhook = True

    def verify_signature(self, body: bytes, headers: dict[str, str]) -> bool:
        # SendGrid signed webhooks supported; bypass if no secret configured.
        secret = self.credentials.get("inbound_secret", "")
        if not secret:
            return True
        from app.channels.base import hmac_verify
        sig = headers.get("x-signature") or ""
        return hmac_verify(secret, body, sig)

    async def parse_webhook(self, body: dict[str, Any]) -> list[InboundMessage]:
        # SendGrid Inbound Parse: form fields from, to, subject, text, html, etc.
        from_addr = body.get("from", "")
        text = body.get("text") or body.get("html") or ""
        subject = body.get("subject", "")
        message_id = body.get("Message-Id") or body.get("message_id")
        thread_id = body.get("In-Reply-To") or message_id
        sender_email = _extract_email(from_addr)
        sender_name = _extract_name(from_addr)
        content = f"Subject: {subject}\n\n{text}" if subject else text
        return [
            InboundMessage(
                external_user_id=sender_email or from_addr,
                external_thread_id=thread_id or sender_email,
                content=content,
                sender_email=sender_email,
                sender_name=sender_name,
                external_message_id=message_id,
                raw=body,
            )
        ]

    async def send_text(self, recipient: str, text: str, thread_id: str | None = None) -> OutboundResult:
        subject = self.settings.get("default_subject", "Re: Support reply")
        headers = {}
        if thread_id:
            headers["In-Reply-To"] = thread_id
            headers["References"] = thread_id
        success = await send_email(recipient, subject, text, headers=headers if headers else None)
        return OutboundResult(external_message_id=None, raw={"sent": success})
