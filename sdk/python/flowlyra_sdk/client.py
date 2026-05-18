from __future__ import annotations

from typing import Any

import requests


class FlowlyraClient:
    def __init__(self, api_key: str, base_url: str = "http://localhost:8000/api/v1") -> None:
        if not api_key:
            raise ValueError("api_key is required")
        self.api_key = api_key
        self.base_url = base_url.rstrip("/")

    def _request(self, method: str, path: str, **kwargs: Any) -> Any:
        headers = {"X-API-Key": self.api_key, "Content-Type": "application/json"}
        headers.update(kwargs.pop("headers", {}))
        response = requests.request(method, f"{self.base_url}{path}", headers=headers, timeout=30, **kwargs)
        if not response.ok:
            raise RuntimeError(f"FlowLyra API error {response.status_code}: {response.text}")
        return None if response.status_code == 204 else response.json()

    def list_chats(self, **params: str) -> Any:
        return self._request("GET", "/platform/chats", params=params)

    def list_messages(self, chat_id: str) -> Any:
        return self._request("GET", f"/platform/chats/{chat_id}/messages")

    def send_message(self, chat_id: str, content: str) -> Any:
        return self._request("POST", f"/platform/chats/{chat_id}/messages", json={"content": content})

    def list_contacts(self, **params: str) -> Any:
        return self._request("GET", "/platform/contacts", params=params)

    def create_ticket(self, payload: dict[str, Any]) -> Any:
        return self._request("POST", "/platform/tickets", json=payload)

    def api_status(self) -> Any:
        return self._request("GET", "/platform/status")
