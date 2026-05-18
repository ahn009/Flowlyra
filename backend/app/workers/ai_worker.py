import asyncio
import logging
import uuid
from typing import Any

from sqlalchemy import select

from app.db.session import AsyncSessionLocal
from app.models.chat import Chat
from app.models.knowledge import KnowledgeSource
from app.models.message import Message
from app.services import ai_service, rag_service
from app.socket_manager import emit_ai_suggestions
from app.workers.celery_app import celery_app

logger = logging.getLogger(__name__)


@celery_app.task(
    bind=True,
    name="app.workers.ai_worker.get_agent_suggestions",
    max_retries=3,
    default_retry_delay=5,
)
def get_agent_suggestions(self: Any, chat_id: str, message: str, org_id: str) -> list[str]:
    try:
        return asyncio.run(_run_suggestions(chat_id, message, org_id))
    except Exception as exc:  # noqa: BLE001
        raise self.retry(exc=exc, countdown=5) from exc


async def _run_suggestions(chat_id: str, message: str, org_id: str) -> list[str]:
    async with AsyncSessionLocal() as db:
        chat_uuid = uuid.UUID(chat_id)
        org_uuid = uuid.UUID(org_id)
        suggestions = await ai_service.generate_agent_suggestions(db, chat_uuid, message, org_uuid)
        agent_id = await ai_service.assigned_agent_for_chat(db, chat_uuid, org_uuid)
        if agent_id:
            await emit_ai_suggestions(str(agent_id), chat_id, suggestions)
        return suggestions


@celery_app.task(name="app.workers.ai_worker.ingest_knowledge_source")
def ingest_knowledge_source(source_id: str) -> dict:
    async def _run() -> dict:
        async with AsyncSessionLocal() as db:
            src = (
                await db.execute(
                    select(KnowledgeSource).where(KnowledgeSource.id == uuid.UUID(source_id))
                )
            ).scalar_one_or_none()
            if not src:
                return {"ok": False, "reason": "missing"}
            await rag_service.ingest_source(db, src)
            await db.commit()
            return {"ok": True, "chunks": src.chunk_count, "status": src.status}

    return asyncio.run(_run())


@celery_app.task(name="app.workers.ai_worker.reindex_kb_article")
def reindex_kb_article(article_id: str) -> dict:
    from app.models.kb import KBArticle

    async def _run() -> dict:
        async with AsyncSessionLocal() as db:
            art = (
                await db.execute(select(KBArticle).where(KBArticle.id == uuid.UUID(article_id)))
            ).scalar_one_or_none()
            if not art:
                return {"ok": False}
            count = await rag_service.reindex_kb_article(db, art)
            await db.commit()
            return {"ok": True, "chunks": count}

    return asyncio.run(_run())


@celery_app.task(name="app.workers.ai_worker.score_message_sentiment")
def score_message_sentiment(message_id: str) -> dict:
    async def _run() -> dict:
        async with AsyncSessionLocal() as db:
            msg = (
                await db.execute(select(Message).where(Message.id == uuid.UUID(message_id)))
            ).scalar_one_or_none()
            if not msg or not msg.content:
                return {"ok": False}
            label, score = await ai_service.classify_sentiment(msg.content)
            msg.sentiment = label
            msg.sentiment_score = score
            await db.commit()
            return {"ok": True, "label": label, "score": score}

    return asyncio.run(_run())


@celery_app.task(name="app.workers.ai_worker.finalize_resolved_chat")
def finalize_resolved_chat(chat_id: str) -> dict:
    """Run summary + tagging + sentiment + QA after chat resolution."""

    async def _run() -> dict:
        async with AsyncSessionLocal() as db:
            chat = (
                await db.execute(select(Chat).where(Chat.id == uuid.UUID(chat_id)))
            ).scalar_one_or_none()
            if not chat:
                return {"ok": False}
            summary = await ai_service.summarize_chat(db, chat.id, chat.organization_id)
            tags = await ai_service.auto_tag_chat(db, chat.id, chat.organization_id)
            score, notes = await ai_service.qa_score_chat(db, chat.id, chat.organization_id)
            # Aggregate sentiment from visitor messages
            visitor_msgs = (
                await db.execute(
                    select(Message)
                    .where(Message.chat_id == chat.id, Message.sender_type == "visitor")
                    .order_by(Message.created_at.desc())
                    .limit(5)
                )
            ).scalars().all()
            joined = "\n".join(m.content for m in visitor_msgs if m.content)
            label, _ = await ai_service.classify_sentiment(joined) if joined else ("neutral", 0.0)
            chat.ai_summary = summary or chat.ai_summary
            if tags:
                chat.ai_tags = tags
            chat.ai_sentiment = label
            chat.ai_qa_score = score
            chat.ai_qa_notes = notes
            await db.commit()
            return {"ok": True, "summary": bool(summary), "tags": len(tags), "qa": score}

    return asyncio.run(_run())
