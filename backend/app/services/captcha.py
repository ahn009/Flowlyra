"""CAPTCHA token verification (hCaptcha + reCAPTCHA v2/v3) — 12.19."""

from __future__ import annotations

import logging

import httpx

from app.config import get_settings
from app.models.organization import Organization


logger = logging.getLogger(__name__)


HCAPTCHA_VERIFY_URL = "https://hcaptcha.com/siteverify"
RECAPTCHA_VERIFY_URL = "https://www.google.com/recaptcha/api/siteverify"


async def verify_captcha_token(org: Organization, token: str, *, remote_ip: str | None = None) -> bool:
    if not token:
        return False
    settings = get_settings()
    provider = (org.captcha_provider or "hcaptcha").lower()
    if provider == "hcaptcha":
        secret = settings.hcaptcha_secret
        url = HCAPTCHA_VERIFY_URL
    elif provider == "recaptcha":
        secret = settings.recaptcha_secret
        url = RECAPTCHA_VERIFY_URL
    else:
        logger.warning("Unknown captcha provider: %s", provider)
        return False
    if not secret:
        # No secret configured → fail-open in dev, fail-closed in prod-ish env.
        if settings.environment.lower() in {"production", "staging"}:
            return False
        return True
    data = {"secret": secret, "response": token}
    if remote_ip:
        data["remoteip"] = remote_ip
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(url, data=data)
            resp.raise_for_status()
            payload = resp.json()
            return bool(payload.get("success"))
    except httpx.HTTPError as exc:
        logger.warning("captcha verify HTTP error: %s", exc)
        return False
