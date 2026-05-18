"""Channel outbound dispatcher."""
from __future__ import annotations

import asyncio
import uuid

from app.db.session import AsyncSessionLocal
from app.services import channel_service
from app.workers.celery_app import celery_app


@celery_app.task(name="app.workers.channel_worker.dispatch_pending_outbound")
def dispatch_pending_outbound(batch_size: int = 50) -> dict:
    async def _run() -> dict:
        async with AsyncSessionLocal() as db:
            ids = await channel_service.due_outbound_ids(db, batch_size=batch_size)
        processed = 0
        for oid in ids:
            async with AsyncSessionLocal() as db:
                await channel_service.dispatch_outbound(db, oid)
            processed += 1
        return {"processed": processed}

    return asyncio.run(_run())


@celery_app.task(name="app.workers.channel_worker.send_outbound_now")
def send_outbound_now(outbound_id: str) -> dict:
    async def _run() -> dict:
        async with AsyncSessionLocal() as db:
            return await channel_service.dispatch_outbound(db, uuid.UUID(outbound_id))

    return asyncio.run(_run())
