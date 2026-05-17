from celery import Celery

from app.config import get_settings

settings = get_settings()
celery_app = Celery("flowlyra", broker=settings.celery_broker_url, backend=settings.celery_result_backend)
celery_app.conf.task_routes = {"app.workers.ai_worker.*": {"queue": "ai"}}
celery_app.conf.imports = ("app.workers.ai_worker", "app.workers.system_tasks")
celery_app.conf.broker_connection_retry_on_startup = True
celery_app.conf.task_acks_late = True
celery_app.conf.worker_prefetch_multiplier = 1
celery_app.conf.beat_schedule = {
    "dispatch-webhook-deliveries": {
        "task": "app.workers.system_tasks.dispatch_webhook_deliveries",
        "schedule": 15.0,
    },
    "check-ticket-sla-breaches": {
        "task": "app.workers.system_tasks.check_ticket_sla_breaches",
        "schedule": 30.0,
    },
}
celery_app.autodiscover_tasks(["app.workers"])
