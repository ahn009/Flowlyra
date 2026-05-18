"""Google + Microsoft OAuth 2.0 login.

Lightweight implementation without Authlib runtime dependency: uses httpx to
perform the authorization_code exchange and userinfo fetch. State is stored in
Redis to survive the redirect roundtrip.
"""

from __future__ import annotations

import json
import secrets
import urllib.parse
from dataclasses import dataclass

import httpx

from app.config import get_settings
from app.db.redis import get_redis, ns


STATE_TTL_SECONDS = 600


@dataclass(frozen=True)
class ProviderSpec:
    name: str
    auth_url: str
    token_url: str
    userinfo_url: str
    scopes: str
    client_id_attr: str
    client_secret_attr: str


def _ms_tenant() -> str:
    settings = get_settings()
    return settings.oauth_microsoft_tenant or "common"


def _provider(name: str) -> ProviderSpec:
    if name == "google":
        return ProviderSpec(
            name="google",
            auth_url="https://accounts.google.com/o/oauth2/v2/auth",
            token_url="https://oauth2.googleapis.com/token",
            userinfo_url="https://openidconnect.googleapis.com/v1/userinfo",
            scopes="openid email profile",
            client_id_attr="oauth_google_client_id",
            client_secret_attr="oauth_google_client_secret",
        )
    if name == "microsoft":
        tenant = _ms_tenant()
        return ProviderSpec(
            name="microsoft",
            auth_url=f"https://login.microsoftonline.com/{tenant}/oauth2/v2.0/authorize",
            token_url=f"https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token",
            userinfo_url="https://graph.microsoft.com/oidc/userinfo",
            scopes="openid email profile User.Read",
            client_id_attr="oauth_microsoft_client_id",
            client_secret_attr="oauth_microsoft_client_secret",
        )
    raise ValueError(f"unknown OAuth provider: {name}")


def _redirect_uri(provider_name: str) -> str:
    settings = get_settings()
    base = (settings.oauth_redirect_base_url or settings.api_base_url).rstrip("/")
    return f"{base}/api/v1/auth/oauth/{provider_name}/callback"


def _credentials(provider: ProviderSpec) -> tuple[str, str]:
    settings = get_settings()
    return (
        getattr(settings, provider.client_id_attr) or "",
        getattr(settings, provider.client_secret_attr) or "",
    )


def is_provider_configured(name: str) -> bool:
    try:
        client_id, client_secret = _credentials(_provider(name))
    except ValueError:
        return False
    return bool(client_id and client_secret)


async def build_authorize_url(name: str, *, return_to: str | None = None) -> str:
    provider = _provider(name)
    client_id, _ = _credentials(provider)
    if not client_id:
        raise RuntimeError(f"OAuth provider not configured: {name}")
    state = secrets.token_urlsafe(24)
    payload = {"provider": name, "return_to": return_to}
    await get_redis().setex(ns("oauth-state", state), STATE_TTL_SECONDS, json.dumps(payload))
    params = {
        "client_id": client_id,
        "redirect_uri": _redirect_uri(name),
        "response_type": "code",
        "scope": provider.scopes,
        "state": state,
        "access_type": "offline",
        "prompt": "select_account",
    }
    return f"{provider.auth_url}?{urllib.parse.urlencode(params)}"


async def consume_state(state: str) -> dict | None:
    raw = await get_redis().get(ns("oauth-state", state))
    if not raw:
        return None
    await get_redis().delete(ns("oauth-state", state))
    try:
        return json.loads(raw)
    except (ValueError, TypeError):
        return None


async def exchange_code_for_profile(name: str, code: str) -> dict:
    provider = _provider(name)
    client_id, client_secret = _credentials(provider)
    if not client_id or not client_secret:
        raise RuntimeError(f"OAuth provider not configured: {name}")
    async with httpx.AsyncClient(timeout=15.0) as client:
        token_resp = await client.post(
            provider.token_url,
            data={
                "grant_type": "authorization_code",
                "code": code,
                "redirect_uri": _redirect_uri(name),
                "client_id": client_id,
                "client_secret": client_secret,
            },
            headers={"Accept": "application/json"},
        )
        token_resp.raise_for_status()
        tokens = token_resp.json()
        access_token = tokens.get("access_token")
        if not access_token:
            raise RuntimeError("Token exchange failed")
        info_resp = await client.get(
            provider.userinfo_url,
            headers={"Authorization": f"Bearer {access_token}"},
        )
        info_resp.raise_for_status()
        return info_resp.json()
