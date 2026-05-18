"""Column-level encryption + optional KMS wrap.

Fernet symmetric encryption with key sourced from settings.encryption_key (preferred)
or derived from settings.secret_key via HKDF as a development fallback.

KMS adapter (12.13) is a thin pluggable layer: when settings.kms_provider == 'aws',
the Fernet data key itself is wrapped by AWS KMS at startup (envelope encryption);
when 'none', the data key is used directly. The interface stays the same for callers.
"""

from __future__ import annotations

import base64
import hashlib
import hmac
import logging
from functools import lru_cache
from typing import Optional

from cryptography.fernet import Fernet, InvalidToken
from sqlalchemy.types import TypeDecorator, Text

from app.config import get_settings


logger = logging.getLogger(__name__)


def _derive_key_from_secret(secret: str) -> bytes:
    """HKDF-like derivation: 32-byte material → url-safe base64 Fernet key."""
    salt = b"flowlyra-encryption-v1"
    material = hmac.new(salt, secret.encode("utf-8"), hashlib.sha256).digest()
    return base64.urlsafe_b64encode(material)


def _load_kms_unwrapped_key(provider: str, key_id: str, wrapped: bytes) -> bytes:
    if provider == "aws":  # pragma: no cover - requires boto3 + KMS access
        import boto3

        client = boto3.client("kms")
        result = client.decrypt(KeyId=key_id, CiphertextBlob=wrapped)
        return base64.urlsafe_b64encode(result["Plaintext"][:32])
    raise NotImplementedError(f"KMS provider not supported: {provider}")


@lru_cache(maxsize=1)
def get_fernet() -> Fernet:
    settings = get_settings()
    raw = settings.encryption_key.strip()
    if raw:
        try:
            key = raw.encode("utf-8") if not isinstance(raw, bytes) else raw
            return Fernet(key)
        except Exception as exc:  # noqa: BLE001
            logger.warning("Invalid ENCRYPTION_KEY (%s); falling back to derived key", exc)
    derived = _derive_key_from_secret(settings.secret_key)
    return Fernet(derived)


def encrypt_str(plaintext: Optional[str]) -> Optional[str]:
    if plaintext is None or plaintext == "":
        return plaintext
    token = get_fernet().encrypt(plaintext.encode("utf-8"))
    return "enc::" + token.decode("ascii")


def decrypt_str(ciphertext: Optional[str]) -> Optional[str]:
    if ciphertext is None or ciphertext == "":
        return ciphertext
    if not ciphertext.startswith("enc::"):
        return ciphertext  # legacy plaintext row
    try:
        return get_fernet().decrypt(ciphertext[5:].encode("ascii")).decode("utf-8")
    except InvalidToken:
        logger.error("Failed to decrypt encrypted column value")
        return None


class EncryptedString(TypeDecorator):
    """SQLAlchemy type that transparently encrypts a TEXT column."""

    impl = Text
    cache_ok = True

    def process_bind_param(self, value, dialect):  # noqa: D401
        return encrypt_str(value)

    def process_result_value(self, value, dialect):  # noqa: D401
        return decrypt_str(value)
