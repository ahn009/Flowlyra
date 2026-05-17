"""Knowledge base helpers: slug, search, revisions, scheduled publish."""

from __future__ import annotations

import re
import uuid
from datetime import UTC, datetime
from typing import Iterable

from sqlalchemy import func, or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.kb import KBArticle, KBArticleRevision, KBArticleView, KBCategory

_SLUG_NON_WORD = re.compile(r"[^a-z0-9]+")
_SLUG_TRIM = re.compile(r"^-+|-+$")


def slugify(value: str) -> str:
    value = value.lower().strip()
    value = _SLUG_NON_WORD.sub("-", value)
    value = _SLUG_TRIM.sub("", value)
    return value or uuid.uuid4().hex[:8]


async def unique_article_slug(
    db: AsyncSession, *, organization_id: uuid.UUID, locale: str, base: str, exclude_id: uuid.UUID | None = None
) -> str:
    candidate = slugify(base)
    suffix = 1
    while True:
        stmt = select(KBArticle.id).where(
            KBArticle.organization_id == organization_id,
            KBArticle.locale == locale,
            KBArticle.slug == candidate,
        )
        if exclude_id:
            stmt = stmt.where(KBArticle.id != exclude_id)
        existing = (await db.execute(stmt)).scalar_one_or_none()
        if not existing:
            return candidate
        suffix += 1
        candidate = f"{slugify(base)}-{suffix}"


async def unique_category_slug(
    db: AsyncSession, *, organization_id: uuid.UUID, base: str, exclude_id: uuid.UUID | None = None
) -> str:
    candidate = slugify(base)
    suffix = 1
    while True:
        stmt = select(KBCategory.id).where(
            KBCategory.organization_id == organization_id,
            KBCategory.slug == candidate,
        )
        if exclude_id:
            stmt = stmt.where(KBCategory.id != exclude_id)
        existing = (await db.execute(stmt)).scalar_one_or_none()
        if not existing:
            return candidate
        suffix += 1
        candidate = f"{slugify(base)}-{suffix}"


def make_snippet(text: str | None, query: str, length: int = 220) -> str | None:
    if not text:
        return None
    if not query:
        return text[:length]
    lower = text.lower()
    idx = lower.find(query.lower())
    if idx == -1:
        return text[:length]
    start = max(0, idx - 60)
    end = min(len(text), idx + length - 60)
    prefix = "…" if start > 0 else ""
    suffix = "…" if end < len(text) else ""
    return f"{prefix}{text[start:end]}{suffix}"


async def search_articles(
    db: AsyncSession,
    *,
    organization_id: uuid.UUID,
    query: str,
    locale: str | None = None,
    include_internal: bool = False,
    limit: int = 20,
) -> list[tuple[KBArticle, float, str | None]]:
    if not query.strip():
        return []

    q = query.strip()
    title_sim = func.similarity(KBArticle.title, q)
    body_sim = func.similarity(KBArticle.body, q)
    score = (title_sim * 2.0 + body_sim).label("score")

    stmt = (
        select(KBArticle, score)
        .where(KBArticle.organization_id == organization_id)
        .where(KBArticle.status == "published")
        .where(or_(title_sim > 0.1, body_sim > 0.05, KBArticle.title.ilike(f"%{q}%"), KBArticle.body.ilike(f"%{q}%")))
        .order_by(score.desc())
        .limit(limit)
    )
    if locale:
        stmt = stmt.where(KBArticle.locale == locale)
    if not include_internal:
        stmt = stmt.where(KBArticle.internal_only.is_(False))

    rows = (await db.execute(stmt)).all()
    return [(row[0], float(row[1] or 0.0), make_snippet(row[0].summary or row[0].body, q)) for row in rows]


async def next_revision_number(db: AsyncSession, article_id: uuid.UUID) -> int:
    stmt = select(func.coalesce(func.max(KBArticleRevision.revision_number), 0)).where(
        KBArticleRevision.article_id == article_id
    )
    current = (await db.execute(stmt)).scalar_one()
    return int(current) + 1


async def record_revision(
    db: AsyncSession,
    *,
    article: KBArticle,
    author_user_id: uuid.UUID | None,
    change_summary: str | None,
) -> KBArticleRevision:
    revision_number = await next_revision_number(db, article.id)
    revision = KBArticleRevision(
        article_id=article.id,
        revision_number=revision_number,
        title=article.title,
        body=article.body,
        summary=article.summary,
        change_summary=change_summary,
        author_user_id=author_user_id,
    )
    db.add(revision)
    return revision


async def record_view(
    db: AsyncSession,
    *,
    article: KBArticle,
    organization_id: uuid.UUID,
    source: str,
    visitor_session_id: str | None,
    referrer: str | None,
) -> None:
    view = KBArticleView(
        article_id=article.id,
        organization_id=organization_id,
        source=source[:30],
        visitor_session_id=visitor_session_id,
        referrer=referrer[:500] if referrer else None,
    )
    db.add(view)
    await db.execute(
        update(KBArticle).where(KBArticle.id == article.id).values(view_count=KBArticle.view_count + 1)
    )


def apply_status_transition(article: KBArticle, status: str) -> None:
    now = datetime.now(UTC)
    if status == "published" and article.status != "published":
        article.published_at = now
        article.archived_at = None
    elif status == "archived":
        article.archived_at = now
    elif status == "draft":
        article.archived_at = None
    article.status = status


async def publish_scheduled_articles(db: AsyncSession) -> int:
    """Promote scheduled articles whose publish time has passed. Returns count."""

    now = datetime.now(UTC)
    stmt = select(KBArticle).where(
        KBArticle.status == "scheduled",
        KBArticle.scheduled_publish_at.is_not(None),
        KBArticle.scheduled_publish_at <= now,
    )
    rows = (await db.execute(stmt)).scalars().all()
    for article in rows:
        article.status = "published"
        article.published_at = now
        article.scheduled_publish_at = None
    if rows:
        await db.commit()
    return len(rows)


def visible_article_filter(query, *, allow_internal: bool, include_drafts: bool = False):
    if not include_drafts:
        query = query.where(KBArticle.status == "published")
    if not allow_internal:
        query = query.where(KBArticle.internal_only.is_(False))
    return query


def serialize_related_ids(ids: Iterable[uuid.UUID]) -> dict:
    return {"items": [str(i) for i in ids]}


def deserialize_related_ids(payload: dict | None) -> list[uuid.UUID]:
    items = (payload or {}).get("items") or []
    out: list[uuid.UUID] = []
    for raw in items:
        try:
            out.append(uuid.UUID(str(raw)))
        except (ValueError, TypeError):
            continue
    return out
