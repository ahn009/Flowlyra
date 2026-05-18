"""Phase 12 security unit tests — pure logic, no DB required."""

from __future__ import annotations

import base64
from datetime import UTC, datetime

import pytest

from app.services import twofa_service
from app.services.crypto import decrypt_str, encrypt_str
from app.services.ip_allowlist import ip_in_allowlist
from app.services.saml_service import _normalize_cert, extract_user_fields


def test_crypto_roundtrip():
    secret = "supersecretvalue"
    enc = encrypt_str(secret)
    assert enc.startswith("enc::")
    assert decrypt_str(enc) == secret


def test_crypto_handles_none_and_empty():
    assert encrypt_str(None) is None
    assert encrypt_str("") == ""
    assert decrypt_str(None) is None
    assert decrypt_str("plain-legacy") == "plain-legacy"


def test_ip_in_allowlist_cidr():
    assert ip_in_allowlist("10.1.2.3", ["10.0.0.0/8"]) is True
    assert ip_in_allowlist("203.0.113.1", ["198.51.100.0/24"]) is False
    assert ip_in_allowlist("203.0.113.1", ["203.0.113.1"]) is True


def test_ip_in_allowlist_handles_garbage():
    assert ip_in_allowlist("not-an-ip", ["10.0.0.0/8"]) is False
    assert ip_in_allowlist("10.0.0.1", ["junk", "10.0.0.0/8"]) is True


def test_twofa_totp_verify_with_current_code():
    secret = twofa_service.generate_secret()
    import pyotp

    code = pyotp.TOTP(secret).now()
    assert twofa_service.verify_totp(secret, code) is True
    assert twofa_service.verify_totp(secret, "000000") is False


def test_twofa_backup_codes_format():
    codes = twofa_service.generate_backup_codes(count=5)
    assert len(codes) == 5
    for c in codes:
        assert "-" in c
        assert len(c.replace("-", "")) == 10


def test_saml_normalize_cert_wraps_raw_b64():
    raw = base64.b64encode(b"hello").decode()
    pem = _normalize_cert(raw).decode()
    assert pem.startswith("-----BEGIN CERTIFICATE-----")
    assert pem.endswith("-----END CERTIFICATE-----")


def test_saml_extract_user_fields_uses_attribute_map():
    parsed = {
        "name_id": "user@example.com",
        "attributes": {"email": "from-attr@example.com", "displayName": "Real Name"},
    }
    out = extract_user_fields(parsed, {"email": "email", "full_name": "displayName"})
    assert out["email"] == "from-attr@example.com"
    assert out["full_name"] == "Real Name"


def test_saml_extract_user_fields_falls_back_to_name_id():
    parsed = {"name_id": "fallback@example.com", "attributes": {}}
    out = extract_user_fields(parsed, {"email": "email"})
    assert out["email"] == "fallback@example.com"
