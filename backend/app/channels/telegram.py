"""Telegram Bot API adapter."""
from __future__ import annotations

import logging
from typing import Any

import httpx

from app.channels.base import ChannelAdapter, InboundMessage, OutboundResult, register

logger = logging.getLogger(__name__)


@register
class TelegramAdapter(ChannelAdapter):
    channel = "telegram"
    display_name = "Telegram"

    def verify_signature(self, body: bytes, headers: dict[str, str]) -> bool:
        secret = self.credentials.get("webhook_secret", "")
        token = headers.get("x-telegram-bot-api-secret-token") or headers.get("X-Telegram-Bot-Api-Secret-Token") or ""
        if not secret:
            return True
        return token == secret

    @property
    def _bot_token(self) -> str:
        return self.credentials.get("bot_token", "")

    async def parse_webhook(self, body: dict[str, Any]) -> list[InboundMessage]:
        msg = body.get("message") or body.get("channel_post") or {}
        if not msg:
            return []
        chat = msg.get("chat") or {}
        from_user = msg.get("from") or {}
        chat_id = str(chat.get("id"))
        text = msg.get("text") or msg.get("caption") or ""
        mid = str(msg.get("message_id"))
        name = " ".join(filter(None, [from_user.get("first_name"), from_user.get("last_name")])) or from_user.get("username")
        out: list[InboundMessage] = []
        common = dict(
            external_user_id=chat_id,
            external_thread_id=chat_id,
            external_message_id=mid,
            sender_name=name,
            raw=msg,
        )
        if text:
            out.append(InboundMessage(content=text, **common))
        for photo in (msg.get("photo") or [])[-1:]:
            url = await self._file_url(photo.get("file_id"))
            if url:
                out.append(InboundMessage(content=url, content_type="image", file_url=url, **common))
        for doc_key in ("document", "video", "audio", "voice"):
            doc = msg.get(doc_key)
            if not doc:
                continue
            url = await self._file_url(doc.get("file_id"))
            if url:
                kind = {"video": "video", "audio": "audio", "voice": "audio"}.get(doc_key, "file")
                out.append(InboundMessage(content=url, content_type=kind, file_url=url, file_name=doc.get("file_name"), **common))
        return out

    async def _file_url(self, file_id: str | None) -> str | None:
        if not file_id:
            return None
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.get(f"https://api.telegram.org/bot{self._bot_token}/getFile", params={"file_id": file_id})
                if resp.status_code == 200:
                    path = resp.json().get("result", {}).get("file_path")
                    if path:
                        return f"https://api.telegram.org/file/bot{self._bot_token}/{path}"
        except Exception as exc:  # noqa: BLE001
            logger.warning("tg file url failed: %s", exc)
        return None

    async def send_text(self, recipient: str, text: str, thread_id: str | None = None) -> OutboundResult:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(
                f"https://api.telegram.org/bot{self._bot_token}/sendMessage",
                json={"chat_id": recipient, "text": text[:4096]},
            )
        data = resp.json() if resp.content else {}
        mid = ((data.get("result") or {}).get("message_id"))
        return OutboundResult(external_message_id=str(mid) if mid else None, raw=data)

    async def send_attachment(self, recipient: str, url: str, kind: str, thread_id: str | None = None) -> OutboundResult:
        method = {"image": "sendPhoto", "video": "sendVideo", "audio": "sendAudio"}.get(kind, "sendDocument")
        param = {"image": "photo", "video": "video", "audio": "audio"}.get(kind, "document")
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(
                f"https://api.telegram.org/bot{self._bot_token}/{method}",
                json={"chat_id": recipient, param: url},
            )
        data = resp.json() if resp.content else {}
        mid = ((data.get("result") or {}).get("message_id"))
        return OutboundResult(external_message_id=str(mid) if mid else None, raw=data)
