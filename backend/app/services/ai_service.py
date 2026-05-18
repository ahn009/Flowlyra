"""High-level AI helpers built on top of ai_provider."""
from __future__ import annotations

import hashlib
import json
import logging
import uuid
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.redis import get_redis
from app.models.chat import Chat
from app.models.message import Message
from app.services.ai_provider import AIProviderError, get_ai_provider

logger = logging.getLogger(__name__)

FALLBACK_SUGGESTIONS = [
    "Thanks for reaching out. I can help with that.",
    "Could you share a little more detail so I can check this accurately?",
    "I'm looking into this now and will update you shortly.",
]


async def _conversation_context(
    db: AsyncSession, chat_id: uuid.UUID, org_id: uuid.UUID, limit: int = 30
) -> list[Message]:
    rows = (
        await db.execute(
            select(Message)
            .join(Chat, Chat.id == Message.chat_id)
            .where(Message.chat_id == chat_id, Chat.organization_id == org_id)
            .order_by(Message.created_at.desc())
            .limit(limit)
        )
    ).scalars().all()
    return list(reversed(rows))


def _format_messages(messages: list[Message]) -> str:
    return "\n".join(f"{m.sender_type}: {m.content}" for m in messages if m.content)


async def generate_agent_suggestions(
    db: AsyncSession, chat_id: uuid.UUID, message: str, org_id: uuid.UUID
) -> list[str]:
    cache_key = f"ai:cache:sugg:{hashlib.sha256(message.encode()).hexdigest()}"
    redis = get_redis()
    cached = await redis.get(cache_key)
    if cached:
        return json.loads(cached)
    msgs = await _conversation_context(db, chat_id, org_id, limit=6)
    context = _format_messages(msgs)
    provider = get_ai_provider()
    if not provider.configured:
        suggestions = FALLBACK_SUGGESTIONS[:]
    else:
        try:
            data = await provider.chat_json(
                system='Generate exactly 3 short professional reply options as JSON: {"suggestions":["...","...","..."]}',
                messages=[
                    {"role": "user", "content": f"Conversation:\n{context}\nLatest customer message:\n{message}"}
                ],
                temperature=0.4,
            )
            suggestions = [str(x) for x in data.get("suggestions", [])][:3]
        except AIProviderError:
            suggestions = []
    while len(suggestions) < 3:
        suggestions.append(FALLBACK_SUGGESTIONS[len(suggestions) % len(FALLBACK_SUGGESTIONS)])
    await redis.setex(cache_key, 3600, json.dumps(suggestions[:3]))
    return suggestions[:3]


async def assigned_agent_for_chat(
    db: AsyncSession, chat_id: uuid.UUID, org_id: uuid.UUID
) -> uuid.UUID | None:
    chat = (
        await db.execute(select(Chat).where(Chat.id == chat_id, Chat.organization_id == org_id))
    ).scalar_one_or_none()
    return chat.assigned_user_id if chat else None


# === Text tools (5.7-5.12) ===

_TEXT_TOOL_PROMPTS: dict[str, str] = {
    "expand": "Rewrite the text below in a longer, more detailed form while keeping the meaning. Return ONLY the rewritten text.",
    "rephrase": "Rephrase the text below with different wording but same meaning. Return ONLY the rewritten text.",
    "summarize": "Summarize the text below in 1-2 short sentences. Return ONLY the summary.",
    "grammar": "Fix grammar, spelling, and punctuation in the text below. Preserve meaning and tone. Return ONLY the corrected text.",
    "friendly": "Rewrite the text below in a friendly, warm support tone. Return ONLY the rewritten text.",
    "formal": "Rewrite the text below in a formal, professional tone. Return ONLY the rewritten text.",
    "casual": "Rewrite the text below in a casual, conversational tone. Return ONLY the rewritten text.",
}


async def transform_text(operation: str, text: str, target_language: str | None = None) -> str:
    text = (text or "").strip()
    if not text:
        return ""
    provider = get_ai_provider()
    if not provider.configured:
        return text
    if operation == "translate":
        lang = target_language or "English"
        system = f"Translate the text below into {lang}. Return ONLY the translation, no explanation."
    elif operation in _TEXT_TOOL_PROMPTS:
        system = _TEXT_TOOL_PROMPTS[operation]
    else:
        raise ValueError(f"unknown text op: {operation}")
    try:
        out = await provider.chat(
            system=system,
            messages=[{"role": "user", "content": text}],
            temperature=0.3,
            max_tokens=800,
        )
    except AIProviderError:
        return text
    return out.strip()


async def summarize_chat(db: AsyncSession, chat_id: uuid.UUID, org_id: uuid.UUID) -> str:
    msgs = await _conversation_context(db, chat_id, org_id, limit=80)
    if not msgs:
        return ""
    transcript = _format_messages(msgs)
    provider = get_ai_provider()
    if not provider.configured:
        return ""
    try:
        return (
            await provider.chat(
                system="Summarize this customer support conversation in 2-4 sentences. State the problem, what was tried, and resolution status.",
                messages=[{"role": "user", "content": transcript[:8000]}],
                temperature=0.2,
                max_tokens=500,
            )
        ).strip()
    except AIProviderError:
        return ""


async def classify_sentiment(text: str) -> tuple[str, float]:
    text = (text or "").strip()
    if not text:
        return "neutral", 0.0
    provider = get_ai_provider()
    if not provider.configured:
        return "neutral", 0.0
    try:
        data = await provider.chat_json(
            system=(
                "Classify the sentiment of the text. Respond ONLY as JSON: "
                '{"label":"positive|neutral|negative","score":-1.0..1.0}'
            ),
            messages=[{"role": "user", "content": text[:1500]}],
            temperature=0.0,
            max_tokens=80,
        )
    except AIProviderError:
        return "neutral", 0.0
    label = str(data.get("label", "neutral")).lower()
    if label not in {"positive", "neutral", "negative"}:
        label = "neutral"
    try:
        score = float(data.get("score", 0.0))
    except (TypeError, ValueError):
        score = 0.0
    return label, max(-1.0, min(1.0, score))


async def auto_tag_chat(db: AsyncSession, chat_id: uuid.UUID, org_id: uuid.UUID) -> list[str]:
    msgs = await _conversation_context(db, chat_id, org_id, limit=60)
    if not msgs:
        return []
    provider = get_ai_provider()
    if not provider.configured:
        return []
    try:
        data = await provider.chat_json(
            system=(
                "Pick 1-4 short topic tags (lowercase, kebab-case, max 30 chars each) for this conversation. "
                'Respond ONLY as JSON: {"tags":["billing","refund"]}'
            ),
            messages=[{"role": "user", "content": _format_messages(msgs)[:6000]}],
            temperature=0.2,
            max_tokens=120,
        )
    except AIProviderError:
        return []
    return [str(t).strip().lower() for t in data.get("tags", []) if str(t).strip()][:4]


async def categorize_ticket(subject: str, description: str | None) -> str:
    provider = get_ai_provider()
    if not provider.configured:
        return ""
    body = f"{subject}\n\n{description or ''}".strip()
    try:
        data = await provider.chat_json(
            system=(
                "Categorize the ticket into ONE category from this list: billing, technical, account, feature_request, "
                'bug, sales, shipping, returns, other. Respond ONLY as JSON: {"category":"billing"}'
            ),
            messages=[{"role": "user", "content": body[:3000]}],
            temperature=0.0,
            max_tokens=40,
        )
    except AIProviderError:
        return ""
    return str(data.get("category", "")).strip().lower()[:80]


async def qa_score_chat(db: AsyncSession, chat_id: uuid.UUID, org_id: uuid.UUID) -> tuple[float, str]:
    msgs = await _conversation_context(db, chat_id, org_id, limit=80)
    if not msgs:
        return 0.0, ""
    provider = get_ai_provider()
    if not provider.configured:
        return 0.0, ""
    try:
        data = await provider.chat_json(
            system=(
                "Score the AGENT's performance in this support chat from 0-100 on tone, accuracy, empathy, "
                'and resolution. Respond ONLY as JSON: {"score":0..100,"notes":"short rationale"}'
            ),
            messages=[{"role": "user", "content": _format_messages(msgs)[:8000]}],
            temperature=0.1,
            max_tokens=300,
        )
    except AIProviderError:
        return 0.0, ""
    try:
        score = float(data.get("score", 0))
    except (TypeError, ValueError):
        score = 0.0
    return max(0.0, min(100.0, score)), str(data.get("notes", "")).strip()[:1000]


async def weekly_insights(stats: dict[str, Any]) -> str:
    provider = get_ai_provider()
    if not provider.configured:
        return ""
    try:
        return (
            await provider.chat(
                system="You write concise weekly support performance insights (3-6 bullets). No emojis. Plain text.",
                messages=[{"role": "user", "content": json.dumps(stats)[:4000]}],
                temperature=0.3,
                max_tokens=600,
            )
        ).strip()
    except AIProviderError:
        return ""


async def copilot_answer(
    db: AsyncSession,
    chat_id: uuid.UUID | None,
    org_id: uuid.UUID,
    question: str,
    *,
    include_kb: bool = True,
    include_history: bool = True,
) -> dict[str, Any]:
    provider = get_ai_provider()
    if not provider.configured:
        return {"answer": "AI not configured.", "sources": []}

    chat_context = ""
    if chat_id and include_history:
        msgs = await _conversation_context(db, chat_id, org_id, limit=20)
        chat_context = _format_messages(msgs)[:4000]

    sources: list[dict] = []
    kb_context = ""
    if include_kb:
        from app.services import rag_service

        hits = await rag_service.search(db, org_id, question, top_k=4)
        kb_context = "\n\n---\n\n".join(
            f"[{(h.get('meta') or {}).get('title') or (h.get('meta') or {}).get('name') or 'source'}]\n{h.get('content', '')[:600]}"
            for h in hits
        )
        sources = [
            {
                "title": (h.get("meta") or {}).get("title") or (h.get("meta") or {}).get("name"),
                "kb_article_id": str(h["kb_article_id"]) if h.get("kb_article_id") else None,
                "source_id": str(h["source_id"]) if h.get("source_id") else None,
                "score": float(h.get("score", 0.0)),
            }
            for h in hits
        ]

    sys = (
        "You are FlowLyra Copilot, helping a support agent. Use the provided knowledge and current chat "
        "context to answer concisely. If the knowledge is irrelevant, say so. Cite source titles when used."
    )
    parts: list[str] = []
    if chat_context:
        parts.append(f"CURRENT CHAT:\n{chat_context}")
    if kb_context:
        parts.append(f"KNOWLEDGE:\n{kb_context}")
    parts.append(f"AGENT QUESTION:\n{question}")
    try:
        answer = await provider.chat(
            system=sys,
            messages=[{"role": "user", "content": "\n\n".join(parts)[:12000]}],
            temperature=0.3,
            max_tokens=900,
        )
    except AIProviderError as exc:
        return {"answer": f"AI error: {exc}", "sources": sources}
    return {"answer": answer.strip(), "sources": sources}


async def ghost_complete(prefix: str, chat_context: str) -> str:
    prefix = (prefix or "").strip()
    if len(prefix) < 3:
        return ""
    provider = get_ai_provider()
    if not provider.configured:
        return ""
    try:
        out = await provider.chat(
            system=(
                "You are an autocomplete engine for a support agent. Given the conversation and the agent's "
                "partial reply, return ONLY the suggested continuation (no quotes, no preamble). 1-2 short clauses max."
            ),
            messages=[
                {
                    "role": "user",
                    "content": f"CONVERSATION:\n{chat_context[:3000]}\n\nAGENT PARTIAL:\n{prefix}",
                }
            ],
            temperature=0.4,
            max_tokens=60,
        )
    except AIProviderError:
        return ""
    suggestion = out.strip().strip('"').strip("'")
    if suggestion.lower().startswith(prefix.lower()):
        suggestion = suggestion[len(prefix):].lstrip()
    return suggestion[:160]


async def classify_offline_message(text: str) -> dict[str, Any]:
    provider = get_ai_provider()
    if not provider.configured:
        return {"category": "general", "urgency": "normal", "is_spam": False}
    try:
        data = await provider.chat_json(
            system=(
                "Classify the offline support message. Respond ONLY as JSON: "
                '{"category":"sales|support|billing|spam|other","urgency":"low|normal|high","is_spam":bool}'
            ),
            messages=[{"role": "user", "content": text[:2000]}],
            temperature=0.0,
            max_tokens=120,
        )
    except AIProviderError:
        return {"category": "general", "urgency": "normal", "is_spam": False}
    return {
        "category": str(data.get("category", "general")).lower()[:40],
        "urgency": str(data.get("urgency", "normal")).lower()[:20],
        "is_spam": bool(data.get("is_spam", False)),
    }
