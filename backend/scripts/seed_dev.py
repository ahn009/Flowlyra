import asyncio
from pathlib import Path
import sys

BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import AsyncSessionLocal
from app.middleware.auth import hash_password
from app.models.canned_response import CannedResponse
from app.models.chat import Chat
from app.models.contact import Contact
from app.models.message import Message
from app.models.organization import Organization
from app.models.session import Session
from app.models.team import Team, team_members
from app.models.user import User


async def seed() -> None:
    async with AsyncSessionLocal() as db:
        org = (await db.execute(select(Organization).where(Organization.slug == "test-org"))).scalar_one_or_none()
        if org is None:
            org = Organization(name="Test Organization", slug="test-org", seats=10)
            db.add(org)
            await db.flush()
        else:
            org.name = "Test Organization"
            org.seats = max(org.seats, 10)

        admin = await ensure_user(
            db,
            org,
            email="admin@flowlyra.dev",
            full_name="Admin User",
            password="Dev@12345",
            role="admin",
            status="online",
            is_online=True,
        )
        await ensure_user(
            db,
            org,
            email="admin@example.com",
            full_name="Admin Example",
            password="admin123",
            role="admin",
            status="online",
            is_online=True,
        )
        agent1 = await ensure_user(
            db,
            org,
            email="agent1@flowlyra.dev",
            full_name="Ava Agent",
            password="Dev@12345",
            role="agent",
            status="online",
            is_online=True,
        )
        agent2 = await ensure_user(
            db,
            org,
            email="agent2@flowlyra.dev",
            full_name="Noah Agent",
            password="Dev@12345",
            role="agent",
            status="away",
            is_online=True,
        )
        await db.flush()

        team = (await db.execute(select(Team).where(Team.organization_id == org.id, Team.name == "Support"))).scalar_one_or_none()
        if team is None:
            team = Team(organization_id=org.id, name="Support", description="Default support team")
            db.add(team)
        await db.flush()
        await db.execute(
            insert(team_members)
            .values([{"team_id": team.id, "user_id": agent1.id}, {"team_id": team.id, "user_id": agent2.id}])
            .on_conflict_do_nothing()
        )
        canned = [
            ("hello", "Greeting", "Hi, thanks for reaching out. How can I help?"),
            ("wait", "Checking", "I’m checking that for you now."),
            ("more", "More details", "Could you share a little more detail?"),
            ("fixed", "Resolved", "This should be resolved now. Can you confirm?"),
            ("bye", "Close", "Thanks for contacting us. Have a good day."),
        ]
        for shortcut, title, content in canned:
            existing_canned = (
                await db.execute(
                    select(CannedResponse).where(CannedResponse.organization_id == org.id, CannedResponse.shortcut == shortcut)
                )
            ).scalar_one_or_none()
            if existing_canned is None:
                db.add(CannedResponse(organization_id=org.id, user_id=admin.id, shortcut=shortcut, title=title, content=content))
        for i in range(3):
            email = f"visitor{i+1}@example.com"
            contact = (await db.execute(select(Contact).where(Contact.organization_id == org.id, Contact.email == email))).scalar_one_or_none()
            if contact is None:
                contact = Contact(organization_id=org.id, email=email, full_name=f"Visitor {i+1}", total_chats=1)
                db.add(contact)
            await db.flush()
            session_token = f"dev-session-{i+1}"
            session = (await db.execute(select(Session).where(Session.organization_id == org.id, Session.session_token == session_token))).scalar_one_or_none()
            if session is None:
                session = Session(organization_id=org.id, contact_id=contact.id, session_token=session_token, current_url="https://example.com/pricing")
                db.add(session)
            await db.flush()
            chat = (await db.execute(select(Chat).where(Chat.organization_id == org.id, Chat.session_id == session.id))).scalar_one_or_none()
            if chat is None:
                chat = Chat(organization_id=org.id, session_id=session.id, contact_id=contact.id, assigned_user_id=agent1.id, team_id=team.id, status="active", subject="Sample chat")
                db.add(chat)
                await db.flush()
                db.add_all(
                    [
                        Message(chat_id=chat.id, sender_type="customer", sender_id=contact.id, content="Hi, I need help with billing."),
                        Message(chat_id=chat.id, sender_type="agent", sender_id=agent1.id, content="I can help with that. What happened?"),
                    ]
                )
        await db.commit()


async def ensure_user(
    db: AsyncSession,
    org: Organization,
    *,
    email: str,
    full_name: str,
    password: str,
    role: str,
    status: str,
    is_online: bool,
) -> User:
    user = (await db.execute(select(User).where(User.organization_id == org.id, User.email == email))).scalar_one_or_none()
    if user is None:
        user = User(
            organization_id=org.id,
            email=email,
            password_hash=hash_password(password),
            full_name=full_name,
            role=role,
            status=status,
            is_online=is_online,
            is_active=True,
        )
        db.add(user)
    else:
        user.password_hash = hash_password(password)
        user.full_name = full_name
        user.role = role
        user.status = status
        user.is_online = is_online
        user.is_active = True
    return user


if __name__ == "__main__":
    asyncio.run(seed())
