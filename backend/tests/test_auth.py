import pytest
from jose import jwt

from app.config import get_settings
from app.middleware.auth import ALGORITHM, create_token
from app.models.organization import Organization
from app.models.user import User


pytestmark = pytest.mark.asyncio


async def test_login_success(client, admin_user):
    resp = await client.post("/api/v1/auth/login", json={"email": "admin@test.com", "password": "Test@12345"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["access_token"]
    assert data["refresh_token"]
    assert data["user"]["email"] == "admin@test.com"


async def test_login_wrong_password(client, admin_user):
    resp = await client.post("/api/v1/auth/login", json={"email": "admin@test.com", "password": "Wrong@12345"})
    assert resp.status_code == 401


async def test_login_nonexistent_email(client):
    resp = await client.post("/api/v1/auth/login", json={"email": "missing@test.com", "password": "Test@12345"})
    assert resp.status_code == 401


async def test_refresh_token(client, admin_user):
    login = await client.post("/api/v1/auth/login", json={"email": "admin@test.com", "password": "Test@12345"})
    assert login.status_code == 200
    refresh = await client.post("/api/v1/auth/refresh", json={"refresh_token": login.json()["refresh_token"]})
    assert refresh.status_code == 200
    assert refresh.json()["access_token"]


async def test_logout(client, admin_user):
    login = await client.post("/api/v1/auth/login", json={"email": "admin@test.com", "password": "Test@12345"})
    token = login.json()["access_token"]
    refresh_token = login.json()["refresh_token"]
    logout = await client.post("/api/v1/auth/logout", json={"token": refresh_token}, headers={"Authorization": f"Bearer {token}"})
    assert logout.status_code == 200


async def test_signup_creates_org(client):
    payload = {
        "full_name": "New Owner",
        "email": "new-owner@test.com",
        "password": "Strong@12345",
        "organization_name": "New Org",
        "organization_slug": "new-org",
    }
    resp = await client.post("/api/v1/auth/signup", json=payload)
    assert resp.status_code == 200
    assert resp.json()["user"]["email"] == payload["email"]


async def test_signup_duplicate_email(client, admin_user):
    payload = {
        "full_name": "Duplicate",
        "email": "admin@test.com",
        "password": "Strong@12345",
        "organization_name": "Duplicate Org",
    }
    resp = await client.post("/api/v1/auth/signup", json=payload)
    assert resp.status_code in {400, 409}


async def test_password_policy_rejection(client):
    resp = await client.post(
        "/api/v1/auth/signup",
        json={"full_name": "Weak User", "email": "weak@test.com", "password": "123", "organization_name": "Weak Org"},
    )
    assert resp.status_code in {400, 422}


async def test_account_lockout(client, admin_user):
    for _ in range(5):
        await client.post("/api/v1/auth/login", json={"email": "admin@test.com", "password": "Wrong@12345"})
    resp = await client.post("/api/v1/auth/login", json={"email": "admin@test.com", "password": "Test@12345"})
    assert resp.status_code in {403, 429}


async def test_protected_route_no_token(client):
    resp = await client.get("/api/v1/agents/me")
    assert resp.status_code == 401
