import pytest

from app.models.team import Team, team_members
from app.models.user import User
from app.services.routing_service import choose_agent

pytestmark = pytest.mark.asyncio


async def test_choose_agent_filters_by_team_membership(db, org):
    support = Team(organization_id=org.id, name="Support")
    sales = Team(organization_id=org.id, name="Sales")
    support_agent = User(
        organization_id=org.id,
        email="support-routing@test.com",
        password_hash="x",
        full_name="Support Agent",
        role="agent",
        is_active=True,
        status="online",
    )
    sales_agent = User(
        organization_id=org.id,
        email="sales-routing@test.com",
        password_hash="x",
        full_name="Sales Agent",
        role="agent",
        is_active=True,
        status="online",
    )
    db.add_all([support, sales, support_agent, sales_agent])
    await db.flush()
    await db.execute(team_members.insert().values(team_id=support.id, user_id=support_agent.id))
    await db.execute(team_members.insert().values(team_id=sales.id, user_id=sales_agent.id))
    await db.commit()

    picked = await choose_agent(db, org.id, team_id=support.id)

    assert picked is not None
    assert picked.email == "support-routing@test.com"
