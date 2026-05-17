"""Cursor + offset pagination helpers."""

from __future__ import annotations

import base64
import json
from typing import Any, Generic, TypeVar

from pydantic import BaseModel, Field
from sqlalchemy import Select, func
from sqlalchemy.ext.asyncio import AsyncSession

T = TypeVar("T")


class PageParams(BaseModel):
    limit: int = Field(default=25, ge=1, le=200)
    offset: int = Field(default=0, ge=0)
    cursor: str | None = None


class Page(BaseModel, Generic[T]):
    items: list[T]
    total: int | None = None
    next_cursor: str | None = None
    has_more: bool = False


def encode_cursor(payload: dict[str, Any]) -> str:
    raw = json.dumps(payload, separators=(",", ":"), default=str).encode("utf-8")
    return base64.urlsafe_b64encode(raw).decode("ascii").rstrip("=")


def decode_cursor(cursor: str | None) -> dict[str, Any]:
    if not cursor:
        return {}
    padding = "=" * (-len(cursor) % 4)
    raw = base64.urlsafe_b64decode(cursor + padding)
    return json.loads(raw)


async def paginate(
    db: AsyncSession,
    base_statement: Select,
    params: PageParams,
    *,
    count: bool = True,
) -> Page[Any]:
    statement = base_statement.limit(params.limit + 1).offset(params.offset)
    rows = (await db.execute(statement)).scalars().all()
    has_more = len(rows) > params.limit
    items = list(rows[: params.limit])
    total = None
    if count:
        count_stmt = base_statement.with_only_columns(func.count()).order_by(None)
        total = (await db.execute(count_stmt)).scalar_one()
    next_cursor = encode_cursor({"offset": params.offset + params.limit}) if has_more else None
    return Page(items=items, total=total, has_more=has_more, next_cursor=next_cursor)
