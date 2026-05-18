"""WhatsApp Cloud API adapter."""
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
class WhatsAppAdapter(ChannelAdapter):
    channel = "whatsapp"
    display_name = "WhatsApp"

    def verify_signature(self, body: bytes, headers: dict[str, str]) -> bool:
        secret = self.credentials.get("app_secret", "")
        sig = headers.get("x-hub-signature-256") or headers.get("X-Hub-Signature-256") or ""
        return hmac_verify(secret, body, sig, "sha256")

    async def parse_webhook(self, body: dict[str, Any]) -> list[InboundMessage]:
        out: list[InboundMessage] = []
        for entry in body.get("entry", []):
            for change in entry.get("changes", []):
                value = change.get("value") or {}
                contacts = {c.get("wa_id"): c for c in (value.get("contacts") or [])}
                for msg in value.get("messages") or []:
                    sender = msg.get("from", "")
                    mid = msg.get("id")
                    mtype = msg.get("type", "text")
                    contact = contacts.get(sender) or {}
                    profile = contact.get("profile") or {}
                    common = dict(
                        external_user_id=sender,
                        external_thread_id=sender,
                        external_message_id=mid,
                        sender_name=profile.get("name"),
                        sender_phone=sender,
                        raw=msg,
                    )
                    if mtype == "text":
                        out.append(InboundMessage(content=msg.get("text", {}).get("body", ""), **common))
                    elif mtype in ("image", "video", "audio", "document"):
                        media_id = msg.get(mtype, {}).get("id")
                        url = await self._fetch_media_url(media_id) if media_id else None
                        out.append(
                            InboundMessage(
                                content=url or f"[{mtype}]",
                                content_type="file" if mtype == "document" else mtype,
                                file_url=url,
                                file_name=msg.get(mtype, {}).get("filename"),
                                **common,
                            )
                        )
                    elif mtype == "button":
                        out.append(InboundMessage(content=msg.get("button", {}).get("text", ""), **common))
                    elif mtype == "interactive":
                        inter = msg.get("interactive") or {}
                        body_text = (inter.get("button_reply") or inter.get("list_reply") or {}).get("title", "")
                        out.append(InboundMessage(content=body_text, **common))
        return out

    async def _fetch_media_url(self, media_id: str) -> str | None:
        token = self.credentials.get("access_token", "")
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.get(f"{GRAPH}/{media_id}", headers={"Authorization": f"Bearer {token}"})
                if resp.status_code == 200:
                    return resp.json().get("url")
        except Exception as exc:  # noqa: BLE001
            logger.warning("wa media fetch failed: %s", exc)
        return None

    @property
    def _phone_id(self) -> str:
        return self.credentials.get("phone_number_id", "")

    @property
    def _token(self) -> str:
        return self.credentials.get("access_token", "")

    async def _post(self, payload: dict) -> OutboundResult:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(
                f"{GRAPH}/{self._phone_id}/messages",
                headers={"Authorization": f"Bearer {self._token}"},
                json=payload,
            )
        data = resp.json() if resp.content else {}
        mid = ((data.get("messages") or [{}])[0] or {}).get("id")
        return OutboundResult(external_message_id=mid, raw=data)

    async def send_text(self, recipient: str, text: str, thread_id: str | None = None) -> OutboundResult:
        return await self._post(
            {
                "messaging_product": "whatsapp",
                "to": recipient,
                "type": "text",
                "text": {"body": text[:4096]},
            }
        )

    async def send_attachment(self, recipient: str, url: str, kind: str, thread_id: str | None = None) -> OutboundResult:
        wa_type = {"image": "image", "video": "video", "audio": "audio"}.get(kind, "document")
        return await self._post(
            {
                "messaging_product": "whatsapp",
                "to": recipient,
                "type": wa_type,
                wa_type: {"link": url},
            }
        )

    async def send_template(
        self, recipient: str, template_name: str, language: str, variables: list[str] | None = None
    ) -> OutboundResult:
        components = []
        if variables:
            components = [
                {"type": "body", "parameters": [{"type": "text", "text": str(v)} for v in variables]}
            ]
        return await self._post(
            {
                "messaging_product": "whatsapp",
                "to": recipient,
                "type": "template",
                "template": {
                    "name": template_name,
                    "language": {"code": language},
                    "components": components,
                },
            }
        )

    async def send_quick_replies(
        self, recipient: str, text: str, options: list[str], thread_id: str | None = None
    ) -> OutboundResult:
        buttons = [
            {"type": "reply", "reply": {"id": opt[:256], "title": opt[:20]}} for opt in options[:3]
        ]
        return await self._post(
            {
                "messaging_product": "whatsapp",
                "to": recipient,
                "type": "interactive",
                "interactive": {
                    "type": "button",
                    "body": {"text": text[:1024]},
                    "action": {"buttons": buttons},
                },
            }
        )

    async def send_list(self, recipient: str, text: str, button: str, sections: list[dict]) -> OutboundResult:
        return await self._post(
            {
                "messaging_product": "whatsapp",
                "to": recipient,
                "type": "interactive",
                "interactive": {
                    "type": "list",
                    "body": {"text": text[:1024]},
                    "action": {"button": button[:20], "sections": sections},
                },
            }
        )
