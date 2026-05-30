"""Exchange OAuth authorization codes for access tokens with real providers."""
from __future__ import annotations

from typing import Any

import httpx

from app.config import get_settings


def _get_credentials() -> dict[str, tuple[str, str]]:
    """Build credentials dict lazily from current settings."""
    s = get_settings()
    return {
        "shopify": (s.oauth_shopify_client_id, s.oauth_shopify_client_secret),
        "slack": (s.oauth_slack_client_id, s.oauth_slack_client_secret),
        "salesforce": (s.oauth_salesforce_client_id, s.oauth_salesforce_client_secret),
        "hubspot": (s.oauth_hubspot_client_id, s.oauth_hubspot_client_secret),
        "github_issues": (s.oauth_github_client_id, s.oauth_github_client_secret),
    }


async def exchange_code(
    provider: str,
    code: str,
    redirect_uri: str,
    token_url: str,
    *,
    extra_params: dict[str, str] | None = None,
) -> dict[str, Any]:
    credentials = _get_credentials()
    client_id, client_secret = credentials.get(provider, ("", ""))

    if not client_id or not client_secret:
        return {
            "access_token": f"dev_token_{code[:12]}",
            "refresh_token": f"dev_refresh_{code[:12]}",
            "token_type": "Bearer",
            "expires_in": 3600,
            "scope": "",
            "_mock": True,
        }

    body: dict[str, str] = {
        "grant_type": "authorization_code",
        "code": code,
        "redirect_uri": redirect_uri,
        "client_id": client_id,
        "client_secret": client_secret,
    }
    if extra_params:
        body.update(extra_params)

    if provider == "shopify":
        body = {"client_id": client_id, "client_secret": client_secret, "code": code}

    headers = {"Accept": "application/json"}

    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.post(token_url, data=body, headers=headers)
        resp.raise_for_status()
        return resp.json()
