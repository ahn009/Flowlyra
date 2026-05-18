"""Unified AI provider abstraction. Routes to OpenAI or Anthropic."""
from __future__ import annotations

import json
import logging
from typing import Any, Sequence

from app.config import get_settings

logger = logging.getLogger(__name__)


class AIProviderError(Exception):
    pass


class AIProvider:
    """Provider-agnostic chat + embedding interface."""

    def __init__(self, provider: str | None = None) -> None:
        settings = get_settings()
        self.settings = settings
        self.provider = (provider or settings.ai_provider).lower()
        if self.provider not in ("openai", "anthropic"):
            self.provider = "openai"

    @property
    def configured(self) -> bool:
        if self.provider == "openai":
            return bool(self.settings.openai_api_key)
        if self.provider == "anthropic":
            return bool(self.settings.anthropic_api_key)
        return False

    async def chat(
        self,
        system: str,
        messages: Sequence[dict[str, str]],
        *,
        temperature: float = 0.4,
        max_tokens: int = 1024,
        json_mode: bool = False,
    ) -> str:
        """Return assistant text. messages: list of {role, content}."""
        if not self.configured:
            raise AIProviderError(f"{self.provider} not configured")
        if self.provider == "anthropic":
            return await self._anthropic_chat(system, messages, temperature, max_tokens, json_mode)
        return await self._openai_chat(system, messages, temperature, max_tokens, json_mode)

    async def chat_json(
        self,
        system: str,
        messages: Sequence[dict[str, str]],
        *,
        temperature: float = 0.2,
        max_tokens: int = 1024,
    ) -> dict[str, Any]:
        raw = await self.chat(system, messages, temperature=temperature, max_tokens=max_tokens, json_mode=True)
        try:
            return json.loads(raw)
        except (json.JSONDecodeError, TypeError) as exc:
            logger.warning("ai chat_json parse failed provider=%s err=%s raw=%s", self.provider, exc, raw[:200])
            return {}

    async def embed(self, texts: Sequence[str]) -> list[list[float]]:
        if not texts:
            return []
        if not self.settings.openai_api_key:
            return [[0.0] * self.settings.ai_embedding_dimensions for _ in texts]
        from openai import AsyncOpenAI

        client = AsyncOpenAI(api_key=self.settings.openai_api_key)
        resp = await client.embeddings.create(
            model=self.settings.ai_embedding_model,
            input=list(texts),
            timeout=self.settings.ai_request_timeout,
        )
        return [item.embedding for item in resp.data]

    async def _openai_chat(
        self,
        system: str,
        messages: Sequence[dict[str, str]],
        temperature: float,
        max_tokens: int,
        json_mode: bool,
    ) -> str:
        from openai import AsyncOpenAI

        client = AsyncOpenAI(api_key=self.settings.openai_api_key)
        kwargs: dict[str, Any] = {
            "model": self.settings.openai_model,
            "messages": [{"role": "system", "content": system}, *messages],
            "temperature": temperature,
            "max_tokens": max_tokens,
            "timeout": self.settings.ai_request_timeout,
        }
        if json_mode:
            kwargs["response_format"] = {"type": "json_object"}
        try:
            resp = await client.chat.completions.create(**kwargs)
        except Exception as exc:  # noqa: BLE001
            logger.exception("openai chat failed err=%s", exc)
            raise AIProviderError(str(exc)) from exc
        return resp.choices[0].message.content or ""

    async def _anthropic_chat(
        self,
        system: str,
        messages: Sequence[dict[str, str]],
        temperature: float,
        max_tokens: int,
        json_mode: bool,
    ) -> str:
        try:
            from anthropic import AsyncAnthropic
        except ImportError as exc:
            raise AIProviderError("anthropic SDK not installed") from exc

        client = AsyncAnthropic(api_key=self.settings.anthropic_api_key)
        instr = system
        if json_mode:
            instr = system + "\n\nRespond ONLY with valid JSON, no prose, no code fences."
        try:
            resp = await client.messages.create(
                model=self.settings.anthropic_model,
                system=instr,
                messages=[{"role": m["role"], "content": m["content"]} for m in messages],
                temperature=temperature,
                max_tokens=max_tokens,
                timeout=self.settings.ai_request_timeout,
            )
        except Exception as exc:  # noqa: BLE001
            logger.exception("anthropic chat failed err=%s", exc)
            raise AIProviderError(str(exc)) from exc
        parts = [b.text for b in resp.content if getattr(b, "type", "") == "text"]
        return "\n".join(parts).strip()


def get_ai_provider() -> AIProvider:
    return AIProvider()
