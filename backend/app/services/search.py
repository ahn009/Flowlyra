"""Common search utilities — sanitization + Postgres trigram/tsvector helpers."""

from __future__ import annotations

import re
from typing import Iterable

from sqlalchemy import ColumnElement, or_, func

_WHITESPACE = re.compile(r"\s+")


def normalize_query(value: str | None) -> str:
    if not value:
        return ""
    return _WHITESPACE.sub(" ", value.strip()).lower()


def ilike_clause(columns: Iterable[ColumnElement], query: str) -> ColumnElement | None:
    query_norm = normalize_query(query)
    if not query_norm:
        return None
    pattern = f"%{query_norm}%"
    return or_(*[func.lower(col).like(pattern) for col in columns])


def trigram_clause(column: ColumnElement, query: str, *, threshold: float = 0.3) -> ColumnElement | None:
    """Returns ``similarity(col, q) >= threshold`` for pg_trgm searches."""

    query_norm = normalize_query(query)
    if not query_norm:
        return None
    return func.similarity(column, query_norm) >= threshold
