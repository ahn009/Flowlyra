"""RAG: chunking, embedding, vector retrieval."""
from __future__ import annotations

import logging
import re
import uuid
from typing import Sequence

from sqlalchemy import bindparam, delete, select, text
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.models.kb import KBArticle
from app.models.knowledge import KnowledgeChunk, KnowledgeSource
from app.services.ai_provider import get_ai_provider

logger = logging.getLogger(__name__)

CHUNK_SIZE = 800
CHUNK_OVERLAP = 100


def _strip_html(html: str) -> str:
    text_only = re.sub(r"<script[\s\S]*?</script>", " ", html, flags=re.IGNORECASE)
    text_only = re.sub(r"<style[\s\S]*?</style>", " ", text_only, flags=re.IGNORECASE)
    text_only = re.sub(r"<[^>]+>", " ", text_only)
    return re.sub(r"\s+", " ", text_only).strip()


def chunk_text(content: str, size: int = CHUNK_SIZE, overlap: int = CHUNK_OVERLAP) -> list[str]:
    if not content:
        return []
    words = content.split()
    if not words:
        return []
    chunks: list[str] = []
    step = max(1, size - overlap)
    for i in range(0, len(words), step):
        piece = " ".join(words[i : i + size]).strip()
        if piece:
            chunks.append(piece)
        if i + size >= len(words):
            break
    return chunks


async def embed_and_store_chunks(
    db: AsyncSession,
    *,
    org_id: uuid.UUID,
    source_id: uuid.UUID | None,
    kb_article_id: uuid.UUID | None,
    content: str,
    meta: dict | None = None,
) -> int:
    chunks = chunk_text(content)
    if not chunks:
        return 0
    provider = get_ai_provider()
    embeddings = await provider.embed(chunks)
    if source_id:
        await db.execute(delete(KnowledgeChunk).where(KnowledgeChunk.source_id == source_id))
    if kb_article_id and source_id is None:
        await db.execute(delete(KnowledgeChunk).where(KnowledgeChunk.kb_article_id == kb_article_id))
    for idx, (piece, vec) in enumerate(zip(chunks, embeddings)):
        db.add(
            KnowledgeChunk(
                organization_id=org_id,
                source_id=source_id,
                kb_article_id=kb_article_id,
                position=idx,
                content=piece,
                token_count=len(piece.split()),
                meta=meta or {},
                embedding=vec,
            )
        )
    await db.flush()
    return len(chunks)


async def reindex_kb_article(db: AsyncSession, article: KBArticle) -> int:
    body = article.body or ""
    plain = _strip_html(body) if "<" in body else body
    text_blob = f"{article.title}\n\n{article.summary or ''}\n\n{plain}".strip()
    return await embed_and_store_chunks(
        db,
        org_id=article.organization_id,
        source_id=None,
        kb_article_id=article.id,
        content=text_blob,
        meta={"title": article.title, "slug": article.slug, "locale": article.locale},
    )


async def search(
    db: AsyncSession,
    org_id: uuid.UUID,
    query: str,
    *,
    top_k: int | None = None,
) -> list[dict]:
    settings = get_settings()
    k = top_k or settings.rag_top_k
    if not query.strip():
        return []
    provider = get_ai_provider()
    embeddings = await provider.embed([query])
    if not embeddings:
        return []
    vec = embeddings[0]
    sql = text(
        """
        SELECT id, source_id, kb_article_id, position, content, meta,
               1 - (embedding <=> CAST(:qvec AS vector)) AS score
        FROM knowledge_chunks
        WHERE organization_id = :org AND embedding IS NOT NULL
        ORDER BY embedding <=> CAST(:qvec AS vector)
        LIMIT :k
        """
    )
    try:
        rows = (
            await db.execute(
                sql,
                {"qvec": _vector_literal(vec), "org": str(org_id), "k": k},
            )
        ).mappings().all()
    except Exception as exc:  # noqa: BLE001
        logger.warning("vector search failed, fallback to none: %s", exc)
        return []
    return [dict(r) for r in rows]


def _vector_literal(vec: Sequence[float]) -> str:
    return "[" + ",".join(f"{x:.6f}" for x in vec) + "]"


async def list_sources(db: AsyncSession, org_id: uuid.UUID) -> list[KnowledgeSource]:
    rows = (
        await db.execute(
            select(KnowledgeSource)
            .where(KnowledgeSource.organization_id == org_id)
            .order_by(KnowledgeSource.created_at.desc())
        )
    ).scalars().all()
    return list(rows)


async def create_source(
    db: AsyncSession,
    *,
    org_id: uuid.UUID,
    name: str,
    source_type: str,
    url: str | None = None,
    content: str | None = None,
) -> KnowledgeSource:
    src = KnowledgeSource(
        organization_id=org_id,
        name=name,
        source_type=source_type,
        url=url,
        content=content,
        status="pending",
    )
    db.add(src)
    await db.flush()
    return src


async def delete_source(db: AsyncSession, org_id: uuid.UUID, source_id: uuid.UUID) -> bool:
    src = (
        await db.execute(
            select(KnowledgeSource).where(
                KnowledgeSource.id == source_id,
                KnowledgeSource.organization_id == org_id,
            )
        )
    ).scalar_one_or_none()
    if not src:
        return False
    await db.delete(src)
    await db.flush()
    return True


async def ingest_source(db: AsyncSession, source: KnowledgeSource) -> None:
    """Pull content for url/file source, chunk + embed."""
    source.status = "ingesting"
    source.error = None
    await db.flush()
    try:
        content = source.content or ""
        if source.source_type == "url" and source.url:
            content = await _fetch_url(source.url)
        if not content.strip():
            raise ValueError("empty content")
        count = await embed_and_store_chunks(
            db,
            org_id=source.organization_id,
            source_id=source.id,
            kb_article_id=None,
            content=content,
            meta={"name": source.name, "type": source.source_type, "url": source.url},
        )
        source.chunk_count = count
        source.status = "ready"
        from datetime import UTC, datetime

        source.last_ingested_at = datetime.now(UTC)
    except Exception as exc:  # noqa: BLE001
        logger.exception("source ingest failed src=%s", source.id)
        source.status = "failed"
        source.error = str(exc)[:500]
    await db.flush()


async def _fetch_url(url: str) -> str:
    import httpx

    async with httpx.AsyncClient(timeout=20, follow_redirects=True) as client:
        resp = await client.get(url, headers={"User-Agent": "FlowLyra-Ingest/1.0"})
        resp.raise_for_status()
        html = resp.text
    try:
        from bs4 import BeautifulSoup

        soup = BeautifulSoup(html, "html.parser")
        for tag in soup(["script", "style", "nav", "footer", "header"]):
            tag.decompose()
        return soup.get_text(separator=" ", strip=True)
    except ImportError:
        return _strip_html(html)
