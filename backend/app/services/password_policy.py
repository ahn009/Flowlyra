"""Password strength policy."""

from __future__ import annotations

import re

from fastapi import HTTPException, status


MIN_LENGTH = 12
COMMON_PASSWORDS = {
    "password", "passw0rd", "letmein", "12345678", "123456789", "qwerty",
    "qwerty12", "iloveyou", "admin", "welcome", "abc123", "111111", "monkey",
}


def validate(password: str) -> None:
    if len(password) < MIN_LENGTH:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=f"Password must be at least {MIN_LENGTH} characters")
    if password.lower() in COMMON_PASSWORDS:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Password is too common")
    if not re.search(r"[A-Z]", password):
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Password must include an uppercase letter")
    if not re.search(r"[a-z]", password):
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Password must include a lowercase letter")
    if not re.search(r"\d", password):
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Password must include a digit")
    if not re.search(r"[^A-Za-z0-9]", password):
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Password must include a symbol")


def is_valid(password: str) -> bool:
    try:
        validate(password)
    except HTTPException:
        return False
    return True
