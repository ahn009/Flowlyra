from __future__ import annotations

from datetime import UTC, datetime
import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.polish import OnboardingDripEvent
from app.models.user import User
from app.services.email_service import send_email


async def run_onboarding_drip_for_org(db: AsyncSession, *, organization_id: uuid.UUID) -> int:
    now = datetime.now(UTC)
    users = (
        await db.execute(
            select(User).where(
                User.organization_id == organization_id,
                User.is_active.is_(True),
                User.role.in_(["admin", "supervisor", "agent"]),
            )
        )
    ).scalars().all()

    steps = [("welcome", 0), ("best-practices", 2), ("advanced-automation", 7)]
    sent = 0
    for row in users:
        created = row.created_at or now
        age_days = max(0, (now - created).days)
        for step_key, min_days in steps:
            if age_days < min_days:
                continue
            exists = (
                await db.execute(
                    select(OnboardingDripEvent).where(
                        OnboardingDripEvent.organization_id == organization_id,
                        OnboardingDripEvent.user_id == row.id,
                        OnboardingDripEvent.step_key == step_key,
                    )
                )
            ).scalar_one_or_none()
            if exists is not None:
                continue
            subject = {
                "welcome": "Welcome to FlowLyra",
                "best-practices": "FlowLyra setup best practices",
                "advanced-automation": "Unlock advanced automation in FlowLyra",
            }[step_key]
            body = {
                "welcome": "<p>Welcome! Start with Inbox triage, widget install, and team assignments.</p>",
                "best-practices": "<p>Tip: configure routing rules, canned responses, and CSAT workflows.</p>",
                "advanced-automation": "<p>Try proactive triggers, goals tracking, and sales attribution dashboards.</p>",
            }[step_key]
            await send_email(row.email, subject, body)
            db.add(
                OnboardingDripEvent(
                    organization_id=organization_id,
                    user_id=row.id,
                    step_key=step_key,
                    email_to=row.email,
                    status="sent",
                    sent_at=now,
                    metadata_={"age_days": age_days},
                )
            )
            sent += 1
    return sent
