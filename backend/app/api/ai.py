"""AI endpoints: text tools, copilot, summary, sentiment, knowledge sources."""
from __future__ import annotations

import uuid
from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.middleware.auth import TokenUser, current_user
from app.models.chat import Chat
from app.models.knowledge import KnowledgeSource
from app.models.message import Message
from app.models.ticket import Ticket
from app.services.permissions import require_permission
from app.services import ai_service, rag_service

router = APIRouter(prefix="/ai", tags=["ai"], dependencies=[Depends(require_permission("ai.use"))])


# ---- Text tools ----

class TextOpRequest(BaseModel):
    operation: str  # expand|rephrase|summarize|grammar|friendly|formal|casual|translate
    text: str
    target_language: str | None = None


class TextOpResponse(BaseModel):
    result: str


@router.post("/text", response_model=TextOpResponse)
async def text_tool(
    body: TextOpRequest,
    _user: Annotated[TokenUser, Depends(current_user)],
) -> TextOpResponse:
    try:
        out = await ai_service.transform_text(body.operation, body.text, body.target_language)
    except ValueError as exc:
        raise HTTPException(400, str(exc))
    return TextOpResponse(result=out)


# ---- Chat summary / tag / sentiment / QA ----

class ChatSummaryResponse(BaseModel):
    summary: str
    tags: list[str] = []
    sentiment: str = "neutral"


@router.post("/chats/{chat_id}/summarize", response_model=ChatSummaryResponse)
async def chat_summarize(
    chat_id: uuid.UUID,
    user: Annotated[TokenUser, Depends(current_user)],
    db: AsyncSession = Depends(get_db),
) -> ChatSummaryResponse:
    chat = (
        await db.execute(
            select(Chat).where(Chat.id == chat_id, Chat.organization_id == user.organization_id)
        )
    ).scalar_one_or_none()
    if not chat:
        raise HTTPException(404, "chat not found")
    summary = await ai_service.summarize_chat(db, chat_id, user.organization_id)
    tags = await ai_service.auto_tag_chat(db, chat_id, user.organization_id)
    sentiment = chat.ai_sentiment or "neutral"
    chat.ai_summary = summary or chat.ai_summary
    if tags:
        chat.ai_tags = tags
    await db.commit()
    return ChatSummaryResponse(summary=summary, tags=tags, sentiment=sentiment)


class SentimentRequest(BaseModel):
    text: str


class SentimentResponse(BaseModel):
    label: str
    score: float


@router.post("/sentiment", response_model=SentimentResponse)
async def sentiment(
    body: SentimentRequest,
    _user: Annotated[TokenUser, Depends(current_user)],
) -> SentimentResponse:
    label, score = await ai_service.classify_sentiment(body.text)
    return SentimentResponse(label=label, score=score)


@router.post("/chats/{chat_id}/qa", response_model=dict)
async def qa_score(
    chat_id: uuid.UUID,
    user: Annotated[TokenUser, Depends(current_user)],
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    chat = (
        await db.execute(
            select(Chat).where(Chat.id == chat_id, Chat.organization_id == user.organization_id)
        )
    ).scalar_one_or_none()
    if not chat:
        raise HTTPException(404, "chat not found")
    score, notes = await ai_service.qa_score_chat(db, chat_id, user.organization_id)
    chat.ai_qa_score = score
    chat.ai_qa_notes = notes
    await db.commit()
    return {"score": score, "notes": notes}


# ---- Ticket categorize ----

class TicketCategorizeRequest(BaseModel):
    ticket_id: uuid.UUID | None = None
    subject: str | None = None
    description: str | None = None


@router.post("/tickets/categorize")
async def categorize_ticket(
    body: TicketCategorizeRequest,
    user: Annotated[TokenUser, Depends(current_user)],
    db: AsyncSession = Depends(get_db),
) -> dict[str, str]:
    if body.ticket_id:
        ticket = (
            await db.execute(
                select(Ticket).where(
                    Ticket.id == body.ticket_id, Ticket.organization_id == user.organization_id
                )
            )
        ).scalar_one_or_none()
        if not ticket:
            raise HTTPException(404, "ticket not found")
        category = await ai_service.categorize_ticket(ticket.subject, ticket.description)
        ticket.ai_category = category or None
        await db.commit()
        return {"category": category}
    if not body.subject:
        raise HTTPException(400, "ticket_id or subject required")
    category = await ai_service.categorize_ticket(body.subject, body.description)
    return {"category": category}


# ---- Copilot ----

class CopilotRequest(BaseModel):
    question: str
    chat_id: uuid.UUID | None = None
    include_kb: bool = True
    include_history: bool = True


@router.post("/copilot")
async def copilot(
    body: CopilotRequest,
    user: Annotated[TokenUser, Depends(current_user)],
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    return await ai_service.copilot_answer(
        db,
        body.chat_id,
        user.organization_id,
        body.question,
        include_kb=body.include_kb,
        include_history=body.include_history,
    )


class GhostRequest(BaseModel):
    chat_id: uuid.UUID
    prefix: str


@router.post("/ghost")
async def ghost(
    body: GhostRequest,
    user: Annotated[TokenUser, Depends(current_user)],
    db: AsyncSession = Depends(get_db),
) -> dict[str, str]:
    msgs = (
        await db.execute(
            select(Message)
            .join(Chat, Chat.id == Message.chat_id)
            .where(Message.chat_id == body.chat_id, Chat.organization_id == user.organization_id)
            .order_by(Message.created_at.desc())
            .limit(10)
        )
    ).scalars().all()
    context = "\n".join(f"{m.sender_type}: {m.content}" for m in reversed(msgs) if m.content)
    suggestion = await ai_service.ghost_complete(body.prefix, context)
    return {"suggestion": suggestion}


# ---- Knowledge sources (5.20, 5.21, 5.24) ----

class KnowledgeSourceIn(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    source_type: str  # url | file | text
    url: str | None = None
    content: str | None = None


class KnowledgeSourceOut(BaseModel):
    id: uuid.UUID
    name: str
    source_type: str
    url: str | None
    status: str
    chunk_count: int
    error: str | None
    last_ingested_at: Any | None
    created_at: Any


@router.get("/knowledge/sources", response_model=list[KnowledgeSourceOut])
async def list_knowledge_sources(
    user: Annotated[TokenUser, Depends(current_user)],
    db: AsyncSession = Depends(get_db),
) -> list[KnowledgeSourceOut]:
    rows = await rag_service.list_sources(db, user.organization_id)
    return [
        KnowledgeSourceOut(
            id=r.id,
            name=r.name,
            source_type=r.source_type,
            url=r.url,
            status=r.status,
            chunk_count=r.chunk_count,
            error=r.error,
            last_ingested_at=r.last_ingested_at,
            created_at=r.created_at,
        )
        for r in rows
    ]


@router.post("/knowledge/sources", response_model=KnowledgeSourceOut)
async def create_knowledge_source(
    body: KnowledgeSourceIn,
    user: Annotated[TokenUser, Depends(current_user)],
    db: AsyncSession = Depends(get_db),
) -> KnowledgeSourceOut:
    if body.source_type not in ("url", "text", "file"):
        raise HTTPException(400, "invalid source_type")
    src = await rag_service.create_source(
        db,
        org_id=user.organization_id,
        name=body.name,
        source_type=body.source_type,
        url=body.url,
        content=body.content,
    )
    await db.commit()
    from app.workers.ai_worker import ingest_knowledge_source

    ingest_knowledge_source.delay(str(src.id))
    return KnowledgeSourceOut(
        id=src.id,
        name=src.name,
        source_type=src.source_type,
        url=src.url,
        status=src.status,
        chunk_count=src.chunk_count,
        error=src.error,
        last_ingested_at=src.last_ingested_at,
        created_at=src.created_at,
    )


@router.post("/knowledge/sources/{source_id}/reingest")
async def reingest_source(
    source_id: uuid.UUID,
    user: Annotated[TokenUser, Depends(current_user)],
    db: AsyncSession = Depends(get_db),
) -> dict[str, str]:
    src = (
        await db.execute(
            select(KnowledgeSource).where(
                KnowledgeSource.id == source_id,
                KnowledgeSource.organization_id == user.organization_id,
            )
        )
    ).scalar_one_or_none()
    if not src:
        raise HTTPException(404, "source not found")
    from app.workers.ai_worker import ingest_knowledge_source

    ingest_knowledge_source.delay(str(source_id))
    return {"status": "queued"}


@router.delete("/knowledge/sources/{source_id}")
async def delete_knowledge_source(
    source_id: uuid.UUID,
    user: Annotated[TokenUser, Depends(current_user)],
    db: AsyncSession = Depends(get_db),
) -> dict[str, bool]:
    ok = await rag_service.delete_source(db, user.organization_id, source_id)
    if not ok:
        raise HTTPException(404, "source not found")
    await db.commit()
    return {"deleted": True}


class KnowledgeSearchRequest(BaseModel):
    query: str
    top_k: int = 5


@router.post("/knowledge/search")
async def knowledge_search(
    body: KnowledgeSearchRequest,
    user: Annotated[TokenUser, Depends(current_user)],
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    results = await rag_service.search(db, user.organization_id, body.query, top_k=body.top_k)
    cleaned = [
        {
            "content": r["content"][:600],
            "score": float(r.get("score", 0.0)),
            "kb_article_id": str(r["kb_article_id"]) if r.get("kb_article_id") else None,
            "source_id": str(r["source_id"]) if r.get("source_id") else None,
            "meta": r.get("meta") or {},
        }
        for r in results
    ]
    return {"results": cleaned}


# ---- Insights ----

class InsightsRequest(BaseModel):
    stats: dict[str, Any]


@router.post("/insights")
async def insights(
    body: InsightsRequest,
    _user: Annotated[TokenUser, Depends(current_user)],
) -> dict[str, str]:
    text = await ai_service.weekly_insights(body.stats)
    return {"insights": text}
