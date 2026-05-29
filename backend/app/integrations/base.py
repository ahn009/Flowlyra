from abc import ABC, abstractmethod
from typing import Any


class IntegrationProvider(ABC):
    provider: str

    def __init__(self, config: dict[str, Any], oauth_token: str | None = None):
        self.config = config or {}
        self.oauth_token = oauth_token

    @abstractmethod
    async def test_connection(self) -> bool: ...

    @abstractmethod
    async def sync(self, org_id, db) -> dict[str, Any]: ...

    async def handle_webhook(self, payload: dict, headers: dict) -> dict[str, Any]:
        return {}
