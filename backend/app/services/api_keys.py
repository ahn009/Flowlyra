from __future__ import annotations

import hashlib
import secrets
from datetime import UTC, datetime

from fastapi import HTTPException, status

API_KEY_PREFIX = "flk"

API_KEY_SCOPES: list[str] = [
    "chats.read",
    "chats.write",
    "messages.read",
    "messages.write",
    "contacts.read",
    "contacts.write",
    "tickets.read",
    "tickets.write",
    "kb.read",
    "kb.write",
    "tags.read",
    "tags.write",
    "canned.read",
    "canned.write",
    "goals.read",
    "goals.write",
    "campaigns.read",
    "campaigns.write",
    "reports.read",
    "integrations.read",
    "integrations.write",
    "ai.use",
    "uploads.write",
    "billing.read",
    "webhooks.write",
]


def hash_key(raw_key: str) -> str:
    return hashlib.sha256(raw_key.encode("utf-8")).hexdigest()


def create_api_key_secret() -> tuple[str, str]:
    token = secrets.token_urlsafe(36).replace("-", "").replace("_", "")[:40]
    prefix = token[:8].lower()
    raw = f"{API_KEY_PREFIX}_{prefix}_{token}"
    return raw, prefix


def parse_prefix(raw_key: str) -> str:
    parts = raw_key.strip().split("_")
    if len(parts) < 3 or parts[0] != API_KEY_PREFIX:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid API key")
    return parts[1].strip().lower()


def normalize_scopes(scopes: list[str] | None) -> list[str]:
    if not scopes:
        return []
    allowed = set(API_KEY_SCOPES)
    cleaned = sorted({scope.strip() for scope in scopes if scope and scope.strip() in allowed})
    return cleaned


def format_key_hint(prefix: str) -> str:
    return f"{API_KEY_PREFIX}_{prefix}_********"


def now_utc() -> datetime:
    return datetime.now(UTC)
