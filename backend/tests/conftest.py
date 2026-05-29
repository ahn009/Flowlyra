import os
import uuid
from datetime import UTC, datetime, timedelta

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.dialects.postgresql import ARRAY, INET, JSONB, UUID as PG_UUID
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.ext.compiler import compiles

os.environ.setdefault("DATABASE_URL", "sqlite+aiosqlite:///./test.db")
os.environ.setdefault("REDIS_URL", "redis://localhost:6379/15")
os.environ.setdefault("ENVIRONMENT", "test")
os.environ.setdefault("SECRET_KEY", "test-secret-key")


@compiles(JSONB, "sqlite")
def _compile_jsonb_sqlite(type_, compiler, **kw):  # noqa: ANN001, ARG001
    return "JSON"


@compiles(ARRAY, "sqlite")
def _compile_array_sqlite(type_, compiler, **kw):  # noqa: ANN001, ARG001
    return "JSON"


@compiles(PG_UUID, "sqlite")
def _compile_uuid_sqlite(type_, compiler, **kw):  # noqa: ANN001, ARG001
    return "CHAR(36)"


@compiles(INET, "sqlite")
def _compile_inet_sqlite(type_, compiler, **kw):  # noqa: ANN001, ARG001
    return "TEXT"


from app.db.session import Base, get_db  # noqa: E402
from app.main import fastapi_app  # noqa: E402
from app.middleware.auth import create_token, hash_password  # noqa: E402
from app.models.organization import Organization  # noqa: E402
from app.models.user import User  # noqa: E402

TEST_DB_URL = "sqlite+aiosqlite:///./test.db"
engine = create_async_engine(TEST_DB_URL, echo=False)
TestSessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


@pytest_asyncio.fixture(scope="session", autouse=True)
async def setup_schema():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture(autouse=True)
async def clean_db(setup_schema):
    async with engine.begin() as conn:
        for table in reversed(Base.metadata.sorted_tables):
            await conn.execute(table.delete())
    yield
    async with engine.begin() as conn:
        for table in reversed(Base.metadata.sorted_tables):
            await conn.execute(table.delete())


@pytest_asyncio.fixture
async def db():
    async with TestSessionLocal() as session:
        yield session


@pytest_asyncio.fixture
async def org(db: AsyncSession):
    org = Organization(name="Test Org", slug="test-org", plan="business", seats=10)
    db.add(org)
    await db.commit()
    await db.refresh(org)
    return org


@pytest_asyncio.fixture
async def other_org(db: AsyncSession):
    org = Organization(name="Other Org", slug="other-org", plan="starter", seats=3)
    db.add(org)
    await db.commit()
    await db.refresh(org)
    return org


@pytest_asyncio.fixture
async def admin_user(db: AsyncSession, org: Organization):
    user = User(
        organization_id=org.id,
        email="admin@test.com",
        password_hash=hash_password("Test@12345"),
        full_name="Test Admin",
        role="admin",
        is_active=True,
        status="online",
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


@pytest_asyncio.fixture
async def agent_user(db: AsyncSession, org: Organization):
    user = User(
        organization_id=org.id,
        email="agent@test.com",
        password_hash=hash_password("Test@12345"),
        full_name="Test Agent",
        role="agent",
        is_active=True,
        status="online",
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


@pytest_asyncio.fixture
async def other_org_user(db: AsyncSession, other_org: Organization):
    user = User(
        organization_id=other_org.id,
        email="other@test.com",
        password_hash=hash_password("Test@12345"),
        full_name="Other Admin",
        role="admin",
        is_active=True,
        status="online",
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


async def get_test_db():
    async with TestSessionLocal() as session:
        yield session


@pytest_asyncio.fixture
async def client():
    fastapi_app.dependency_overrides[get_db] = get_test_db
    transport = ASGITransport(app=fastapi_app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c
    fastapi_app.dependency_overrides.clear()


def bearer_for(user: User) -> dict[str, str]:
    token = create_token(user, "access", timedelta(minutes=30))
    return {"Authorization": f"Bearer {token}"}


@pytest_asyncio.fixture
async def auth_headers(admin_user: User):
    return bearer_for(admin_user)


@pytest_asyncio.fixture
async def agent_headers(agent_user: User):
    return bearer_for(agent_user)


@pytest_asyncio.fixture
async def other_auth_headers(other_org_user: User):
    return bearer_for(other_org_user)
