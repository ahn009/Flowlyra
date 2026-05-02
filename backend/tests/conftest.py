import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

from app.main import fastapi_app


@pytest_asyncio.fixture
async def client() -> AsyncClient:
    transport = ASGITransport(app=fastapi_app)
    async with AsyncClient(transport=transport, base_url="http://test") as test_client:
        yield test_client
