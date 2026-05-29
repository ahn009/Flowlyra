"""Plan enforcement: limits, feature gating, seat counting.

All gates accept the current Organization (or TokenUser via lookup) and raise
``HTTPException`` with descriptive errors when the limit is breached.
"""

from __future__ import annotations

from typing import Annotated, Awaitable, Callable

from fastapi import Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.middleware.auth import TokenUser, current_user
from app.models.organization import Organization
from app.models.plan_limit import PlanLimits, get_plan, is_plan_at_least
from app.models.subscription import Subscription
from app.models.user import User


async def get_org_plan(db: AsyncSession, organization_id) -> PlanLimits:
    row = (await db.execute(select(Organization.plan).where(Organization.id == organization_id))).scalar_one_or_none()
    subscription_status = (
        await db.execute(select(Subscription.status).where(Subscription.organization_id == organization_id))
    ).scalar_one_or_none()
    if subscription_status in {"past_due", "canceled", "unpaid", "expired", "incomplete_expired"}:
        return get_plan("starter")
    return get_plan(row or "starter")


def requires_plan(min_plan: str) -> Callable[..., Awaitable[TokenUser]]:
    async def _checker(
        user: Annotated[TokenUser, Depends(current_user)],
        db: Annotated[AsyncSession, Depends(get_db)],
    ) -> TokenUser:
        plan = await get_org_plan(db, user.organization_id)
        if not is_plan_at_least(plan.plan, min_plan):
            raise HTTPException(
                status_code=status.HTTP_402_PAYMENT_REQUIRED,
                detail=f"Plan upgrade required: {min_plan}",
                headers={"X-FlowLyra-Plan-Required": min_plan},
            )
        return user

    return _checker


def requires_feature(feature: str) -> Callable[..., Awaitable[TokenUser]]:
    async def _checker(
        user: Annotated[TokenUser, Depends(current_user)],
        db: Annotated[AsyncSession, Depends(get_db)],
    ) -> TokenUser:
        plan = await get_org_plan(db, user.organization_id)
        if feature not in plan.features:
            raise HTTPException(
                status_code=status.HTTP_402_PAYMENT_REQUIRED,
                detail=f"Feature '{feature}' not available on plan '{plan.plan}'",
                headers={"X-FlowLyra-Feature-Required": feature},
            )
        return user

    return _checker


async def assert_seat_available(db: AsyncSession, organization_id, *, extra: int = 1) -> None:
    plan = await get_org_plan(db, organization_id)
    if plan.seats >= 10_000_000_000:
        return
    used = (
        await db.execute(
            select(func.count(User.id)).where(User.organization_id == organization_id, User.is_active.is_(True))
        )
    ).scalar_one()
    if (used + extra) > plan.seats:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail=f"Seat limit reached for plan '{plan.plan}' ({plan.seats}); upgrade or remove inactive users",
            headers={"X-FlowLyra-Plan-Limit": "seats"},
        )


async def assert_under_limit(
    db: AsyncSession,
    organization_id,
    *,
    limit_name: str,
    current_count: int,
    extra: int = 1,
) -> None:
    plan = await get_org_plan(db, organization_id)
    limit_value = getattr(plan, limit_name, None)
    if limit_value is None or limit_value >= 10_000_000_000:
        return
    if (current_count + extra) > limit_value:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail=f"Plan '{plan.plan}' limit reached for {limit_name} ({limit_value})",
            headers={"X-FlowLyra-Plan-Limit": limit_name},
        )
