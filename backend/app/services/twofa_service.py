"""TOTP-based two-factor authentication.

Uses pyotp for HOTP/TOTP generation + qrcode for the provisioning QR data URI.
Backup codes are short uppercase alnum, hashed with sha256 before persistence.
"""

from __future__ import annotations

import base64
import hashlib
import io
import secrets
from datetime import UTC, datetime

import pyotp
import qrcode
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.models.security import UserBackupCode
from app.models.user import User


def generate_secret() -> str:
    return pyotp.random_base32()


def provisioning_uri(secret: str, account_email: str) -> str:
    settings = get_settings()
    return pyotp.TOTP(secret).provisioning_uri(name=account_email, issuer_name=settings.twofa_issuer)


def qr_data_uri(provisioning_url: str) -> str:
    img = qrcode.make(provisioning_url)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode("ascii")


def verify_totp(secret: str, code: str, *, valid_window: int = 1) -> bool:
    if not secret or not code:
        return False
    try:
        return pyotp.TOTP(secret).verify(code.strip().replace(" ", ""), valid_window=valid_window)
    except Exception:  # noqa: BLE001
        return False


def _hash_backup_code(code: str) -> str:
    return hashlib.sha256(code.strip().upper().encode("utf-8")).hexdigest()


def generate_backup_codes(count: int | None = None) -> list[str]:
    settings = get_settings()
    n = count or settings.twofa_backup_code_count
    codes: list[str] = []
    for _ in range(n):
        raw = secrets.token_hex(5).upper()  # 10 hex chars
        codes.append(f"{raw[:5]}-{raw[5:]}")
    return codes


async def persist_backup_codes(db: AsyncSession, user_id, codes: list[str]) -> None:
    await db.execute(delete(UserBackupCode).where(UserBackupCode.user_id == user_id))
    for code in codes:
        db.add(UserBackupCode(user_id=user_id, code_hash=_hash_backup_code(code)))


async def consume_backup_code(db: AsyncSession, user_id, code: str) -> bool:
    digest = _hash_backup_code(code)
    row = (
        await db.execute(
            select(UserBackupCode).where(
                UserBackupCode.user_id == user_id,
                UserBackupCode.code_hash == digest,
                UserBackupCode.used_at.is_(None),
            )
        )
    ).scalar_one_or_none()
    if row is None:
        return False
    row.used_at = datetime.now(UTC)
    return True


def stamp_user_enrolled(user: User) -> None:
    user.two_factor_enabled = True
    user.two_factor_enrolled_at = datetime.now(UTC)
    user.backup_codes_generated_at = datetime.now(UTC)


def stamp_user_disabled(user: User) -> None:
    user.two_factor_enabled = False
    user.two_factor_secret = None
    user.two_factor_enrolled_at = None
    user.backup_codes_generated_at = None
