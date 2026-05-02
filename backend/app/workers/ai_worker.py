import asyncio
import uuid
from typing import Any

from app.db.session import AsyncSessionLocal
from app.services.ai_service import assigned_agent_for_chat, generate_agent_suggestions
from app.socket_manager import emit_ai_suggestions
from app.workers.celery_app import celery_app


@celery_app.task(
    bind=True,
    name="app.workers.ai_worker.get_agent_suggestions",
    max_retries=3,
    default_retry_delay=5,
)
def get_agent_suggestions(self: Any, chat_id: str, message: str, org_id: str) -> list[str]:
    try:
        return asyncio.run(_run(chat_id, message, org_id))
    except Exception as exc:  # noqa: BLE001
        raise self.retry(exc=exc, countdown=5) from exc


async def _run(chat_id: str, message: str, org_id: str) -> list[str]:
    async with AsyncSessionLocal() as db:
        chat_uuid = uuid.UUID(chat_id)
        org_uuid = uuid.UUID(org_id)
        suggestions = await generate_agent_suggestions(db, chat_uuid, message, org_uuid)
        agent_id = await assigned_agent_for_chat(db, chat_uuid, org_uuid)
        if agent_id:
            await emit_ai_suggestions(str(agent_id), chat_id, suggestions)
        return suggestions
