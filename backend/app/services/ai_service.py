import asyncio
import hashlib
import json
import logging
import uuid

from openai import AsyncOpenAI
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.db.redis import get_redis
from app.models.chat import Chat
from app.models.message import Message

logger = logging.getLogger(__name__)


async def generate_agent_suggestions(db: AsyncSession, chat_id: uuid.UUID, message: str, org_id: uuid.UUID) -> list[str]:
    settings = get_settings()
    cache_key = f"ai:cache:{hashlib.sha256(message.encode()).hexdigest()}"
    redis = get_redis()
    cached = await redis.get(cache_key)
    if cached:
        return json.loads(cached)
    messages = (
        await db.execute(
            select(Message)
            .join(Chat, Chat.id == Message.chat_id)
            .where(Message.chat_id == chat_id, Chat.organization_id == org_id)
            .order_by(Message.created_at.desc())
            .limit(6)
        )
    ).scalars().all()
    context = "\n".join(f"{m.sender_type}: {m.content}" for m in reversed(messages) if m.content)
    if not settings.openai_api_key:
        suggestions = [
            "Thanks for reaching out. I can help with that.",
            "Could you share a little more detail so I can check this accurately?",
            "I’m looking into this now and will update you shortly.",
        ]
    else:
        client = AsyncOpenAI(api_key=settings.openai_api_key)
        try:
            response = await client.chat.completions.create(
                model=settings.openai_model,
                response_format={"type": "json_object"},
                messages=[
                    {"role": "system", "content": 'Generate exactly 3 short professional reply options as JSON: {"suggestions":["...","...","..."]}'},
                    {"role": "user", "content": f"Conversation:\n{context}\nLatest customer message:\n{message}"},
                ],
                temperature=0.4,
                timeout=15,
            )
            raw = response.choices[0].message.content or "{}"
            parsed = json.loads(raw)
            suggestions = [str(item) for item in parsed.get("suggestions", [])][:3]
        except asyncio.TimeoutError:
            logger.warning("OpenAI suggestion request timed out chat_id=%s", chat_id)
            suggestions = []
        except (json.JSONDecodeError, KeyError, TypeError, ValueError) as exc:
            logger.warning("OpenAI suggestion response parse failed chat_id=%s err=%s", chat_id, exc)
            suggestions = []
        except Exception as exc:  # noqa: BLE001
            logger.exception("OpenAI suggestion request failed chat_id=%s err=%s", chat_id, exc)
            suggestions = []
    while len(suggestions) < 3:
        suggestions.append("I’ll check this and get back to you with the next step.")
    await redis.setex(cache_key, 3600, json.dumps(suggestions[:3]))
    return suggestions[:3]


async def assigned_agent_for_chat(db: AsyncSession, chat_id: uuid.UUID, org_id: uuid.UUID) -> uuid.UUID | None:
    chat = (await db.execute(select(Chat).where(Chat.id == chat_id, Chat.organization_id == org_id))).scalar_one_or_none()
    return chat.assigned_user_id if chat else None
