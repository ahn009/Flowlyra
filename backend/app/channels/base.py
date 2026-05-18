"""Channel adapter base class + registry.

Each adapter handles inbound webhook verification + parsing and outbound message
sending for a specific channel (FB Messenger, WhatsApp, SMS, Telegram, etc.).
"""
from __future__ import annotations

import hashlib
import hmac
from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any, ClassVar


@dataclass
class InboundMessage:
    """Normalized inbound message from any channel."""
    external_user_id: str
    external_thread_id: str | None
    content: str
    content_type: str = "text"  # text|image|video|audio|file|sticker|location
    file_url: str | None = None
    file_name: str | None = None
    file_mime: str | None = None
    external_message_id: str | None = None
    sender_name: str | None = None
    sender_email: str | None = None
    sender_phone: str | None = None
    raw: dict[str, Any] | None = None


@dataclass
class OutboundResult:
    external_message_id: str | None
    raw: dict[str, Any] | None = None


class ChannelAdapter(ABC):
    channel: ClassVar[str]
    display_name: ClassVar[str]
    requires_webhook: ClassVar[bool] = True

    def __init__(self, credentials: dict[str, Any], settings: dict[str, Any] | None = None) -> None:
        self.credentials = credentials or {}
        self.settings = settings or {}

    @abstractmethod
    def verify_signature(self, body: bytes, headers: dict[str, str]) -> bool:
        ...

    @abstractmethod
    async def parse_webhook(self, body: dict[str, Any]) -> list[InboundMessage]:
        ...

    @abstractmethod
    async def send_text(self, recipient: str, text: str, thread_id: str | None = None) -> OutboundResult:
        ...

    async def send_attachment(
        self,
        recipient: str,
        url: str,
        kind: str,
        thread_id: str | None = None,
    ) -> OutboundResult:
        return await self.send_text(recipient, url, thread_id=thread_id)

    async def send_template(
        self,
        recipient: str,
        template_name: str,
        language: str,
        variables: list[str] | None = None,
    ) -> OutboundResult:
        raise NotImplementedError(f"{self.channel} does not support templates")

    async def send_quick_replies(
        self,
        recipient: str,
        text: str,
        options: list[str],
        thread_id: str | None = None,
    ) -> OutboundResult:
        joined = text + "\n" + "\n".join(f"- {opt}" for opt in options)
        return await self.send_text(recipient, joined, thread_id=thread_id)


_REGISTRY: dict[str, type[ChannelAdapter]] = {}


def register(cls: type[ChannelAdapter]) -> type[ChannelAdapter]:
    _REGISTRY[cls.channel] = cls
    return cls


def get_adapter_class(channel: str) -> type[ChannelAdapter] | None:
    return _REGISTRY.get(channel)


def all_channels() -> list[str]:
    return sorted(_REGISTRY.keys())


def hmac_verify(secret: str, body: bytes, signature: str, algo: str = "sha256") -> bool:
    if not secret or not signature:
        return False
    sig = signature.split("=", 1)[-1].strip()
    digestmod = hashlib.sha256 if algo == "sha256" else hashlib.sha1
    expected = hmac.new(secret.encode(), body, digestmod).hexdigest()
    return hmac.compare_digest(expected, sig)
