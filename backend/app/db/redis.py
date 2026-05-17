from redis.asyncio import Redis

from app.config import get_settings

_redis: Redis | None = None


def get_redis() -> Redis:
    """Singleton Redis client."""

    global _redis
    if _redis is None:
        _redis = Redis.from_url(get_settings().redis_url, decode_responses=True)
    return _redis


def ns(*parts: str) -> str:
    """Compose a namespaced Redis key prefix using ``settings.redis_namespace``."""

    settings = get_settings()
    return ":".join([settings.redis_namespace, *parts])
