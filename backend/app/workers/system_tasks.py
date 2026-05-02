from datetime import UTC, datetime

from app.workers.celery_app import celery_app


@celery_app.task(name="app.workers.system_tasks.ping")
def ping(echo: str = "ping") -> dict[str, str]:
    return {"status": "ok", "echo": echo, "timestamp": datetime.now(UTC).isoformat()}
