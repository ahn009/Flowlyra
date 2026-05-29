"""Tests for OAuth token exchange service and integration config PATCH."""
from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

pytestmark = pytest.mark.asyncio


async def test_exchange_code_returns_mock_when_no_credentials():
    from app.services.oauth_exchange import exchange_code

    result = await exchange_code(
        "unknown_provider",
        "code123",
        "https://app.test/callback",
        "https://example.com/token",
    )
    assert result["_mock"] is True
    assert result["access_token"].startswith("dev_token_")
    assert result["refresh_token"].startswith("dev_refresh_")


async def test_exchange_code_calls_real_endpoint(monkeypatch):
    from app.services import oauth_exchange

    monkeypatch.setattr(
        oauth_exchange,
        "_CREDENTIALS",
        {"slack": ("client_id_123", "client_secret_456")},
    )

    fake_response = MagicMock()
    fake_response.raise_for_status = lambda: None
    fake_response.json.return_value = {
        "access_token": "xoxb-real-token",
        "refresh_token": "xoxr-refresh",
        "token_type": "Bearer",
        "expires_in": 43200,
    }

    with patch("app.services.oauth_exchange.httpx.AsyncClient") as mock_client:
        mock_instance = AsyncMock()
        mock_instance.post = AsyncMock(return_value=fake_response)
        mock_instance.__aenter__ = AsyncMock(return_value=mock_instance)
        mock_instance.__aexit__ = AsyncMock(return_value=False)
        mock_client.return_value = mock_instance

        result = await oauth_exchange.exchange_code(
            "slack",
            "auth_code_xyz",
            "https://app.test/callback",
            "https://slack.com/api/oauth.v2.access",
        )

    assert result["access_token"] == "xoxb-real-token"
    assert "_mock" not in result
    mock_instance.post.assert_called_once()


async def test_exchange_code_shopify_strips_domain(monkeypatch):
    from app.services import oauth_exchange

    monkeypatch.setattr(
        oauth_exchange,
        "_CREDENTIALS",
        {"shopify": ("shopify_client", "shopify_secret")},
    )

    fake_response = MagicMock()
    fake_response.raise_for_status = lambda: None
    fake_response.json.return_value = {"access_token": "shpat_abc", "scope": "read_orders"}

    with patch("app.services.oauth_exchange.httpx.AsyncClient") as mock_client:
        mock_instance = AsyncMock()
        mock_instance.post = AsyncMock(return_value=fake_response)
        mock_instance.__aenter__ = AsyncMock(return_value=mock_instance)
        mock_instance.__aexit__ = AsyncMock(return_value=False)
        mock_client.return_value = mock_instance

        result = await oauth_exchange.exchange_code(
            "shopify",
            "shop_code",
            "",
            "https://mystore.myshopify.com/admin/oauth/access_token",
        )

    call_kwargs = mock_instance.post.call_args
    body = call_kwargs[1].get("data") or call_kwargs[0][1]
    assert "grant_type" not in body
    assert body["client_id"] == "shopify_client"
    assert result["access_token"] == "shpat_abc"


async def test_integration_config_patch_merges(client, db, org, auth_headers):
    from app.models.integration import Integration

    row = Integration(
        organization_id=org.id,
        provider="ga4",
        display_name="GA4",
        category="analytics",
        config={"measurement_id": "G-OLD"},
    )
    db.add(row)
    await db.commit()

    resp = await client.patch(
        f"/api/v1/integrations/{row.id}",
        json={"config": {"measurement_id": "G-NEW", "api_secret": "secret"}},
        headers=auth_headers,
    )
    assert resp.status_code == 200

    await db.refresh(row)
    assert row.config["measurement_id"] == "G-NEW"
    assert row.config["api_secret"] == "secret"
