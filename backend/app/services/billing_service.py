"""Stripe billing helpers for subscriptions, checkout, portal, invoices, and webhooks."""
from __future__ import annotations

from datetime import UTC, datetime
from typing import Any
import uuid

import stripe
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.models.organization import Organization
from app.models.subscription import Subscription
from app.models.user import User
from app.services.audit_service import record as audit_record
from app.services.email_service import send_email
from app.services.notification_service import notify
from app.services.webhook_events import PAYMENT_FAILED, SUBSCRIPTION_CANCELED, SUBSCRIPTION_CREATED, SUBSCRIPTION_UPDATED
from app.services.webhook_service import dispatch_event

settings = get_settings()
stripe.api_key = settings.stripe_secret_key or None


def _ts(value: Any) -> datetime | None:
    return datetime.fromtimestamp(int(value), tz=UTC) if value else None


def _obj_get(obj: Any, key: str, default: Any = None) -> Any:
    if isinstance(obj, dict):
        return obj.get(key, default)
    return getattr(obj, key, default)


def _price_to_plan(price_id: str | None) -> str:
    mapping = {
        settings.stripe_starter_price_id: "starter",
        settings.stripe_starter_annual_price_id: "starter",
        settings.stripe_team_price_id: "team",
        settings.stripe_team_annual_price_id: "team",
        settings.stripe_business_price_id: "business",
        settings.stripe_business_annual_price_id: "business",
        settings.stripe_enterprise_price_id: "enterprise",
        settings.stripe_enterprise_annual_price_id: "enterprise",
    }
    return mapping.get(price_id or "", "starter")


def price_ids_by_plan() -> dict[str, dict[str, str]]:
    return {
        "starter": {"month": settings.stripe_starter_price_id, "year": settings.stripe_starter_annual_price_id},
        "team": {"month": settings.stripe_team_price_id, "year": settings.stripe_team_annual_price_id},
        "business": {"month": settings.stripe_business_price_id, "year": settings.stripe_business_annual_price_id},
        "enterprise": {"month": settings.stripe_enterprise_price_id, "year": settings.stripe_enterprise_annual_price_id},
    }


def _require_stripe() -> None:
    if not settings.stripe_secret_key:
        raise RuntimeError("Stripe is not configured")
    stripe.api_key = settings.stripe_secret_key


async def _org(db: AsyncSession, organization_id: uuid.UUID) -> Organization:
    org = (await db.execute(select(Organization).where(Organization.id == organization_id))).scalar_one()
    return org


async def _admin_email(db: AsyncSession, organization_id: uuid.UUID) -> str | None:
    return (
        await db.execute(
            select(User.email)
            .where(User.organization_id == organization_id, User.role.in_(["owner", "admin"]), User.is_active.is_(True))
            .order_by(User.created_at.asc())
        )
    ).scalars().first()


async def get_or_create_stripe_customer(db: AsyncSession, organization_id: uuid.UUID) -> str:
    org = await _org(db, organization_id)
    existing = (await db.execute(select(Subscription).where(Subscription.organization_id == organization_id))).scalar_one_or_none()
    if org.stripe_customer_id:
        return org.stripe_customer_id
    if existing and existing.stripe_customer_id:
        org.stripe_customer_id = existing.stripe_customer_id
        await db.commit()
        return existing.stripe_customer_id
    _require_stripe()
    email = await _admin_email(db, organization_id)
    customer = stripe.Customer.create(name=org.name, email=email, metadata={"organization_id": str(org.id), "org_slug": org.slug})
    customer_id = str(customer["id"])
    org.stripe_customer_id = customer_id
    if existing is None:
        existing = Subscription(organization_id=organization_id, stripe_customer_id=customer_id, plan=org.plan, seat_quantity=org.seats)
        db.add(existing)
    else:
        existing.stripe_customer_id = customer_id
    await db.commit()
    return customer_id


async def create_checkout_session(db: AsyncSession, organization_id: uuid.UUID, price_id: str, success_url: str, cancel_url: str, quantity: int = 1, coupon: str | None = None) -> str:
    _require_stripe()
    customer_id = await get_or_create_stripe_customer(db, organization_id)
    existing = (await db.execute(select(Subscription).where(Subscription.organization_id == organization_id))).scalar_one_or_none()
    subscription_data: dict[str, Any] = {"metadata": {"organization_id": str(organization_id)}}
    if (existing is None or not existing.stripe_subscription_id) and settings.trial_days > 0:
        subscription_data["trial_period_days"] = settings.trial_days
    kwargs: dict[str, Any] = {
        "customer": customer_id,
        "mode": "subscription",
        "line_items": [{"price": price_id, "quantity": max(1, quantity)}],
        "success_url": success_url,
        "cancel_url": cancel_url,
        "subscription_data": subscription_data,
        "automatic_tax": {"enabled": bool(settings.stripe_tax_enabled)},
    }
    if coupon:
        kwargs["discounts"] = [{"coupon": coupon}]
    session = stripe.checkout.Session.create(**kwargs)
    await audit_record(organization_id=organization_id, actor_user_id=None, actor_email=None, event="billing.checkout_created", target_type="subscription", details={"price_id": price_id, "quantity": quantity}, db=db)
    await db.commit()
    return str(session["url"])


async def create_customer_portal_session(db: AsyncSession, organization_id: uuid.UUID, return_url: str) -> str:
    _require_stripe()
    customer_id = await get_or_create_stripe_customer(db, organization_id)
    session = stripe.billing_portal.Session.create(customer=customer_id, return_url=return_url)
    return str(session["url"])


async def sync_subscription_from_stripe(db: AsyncSession, organization_id: uuid.UUID, stripe_subscription: Any) -> Subscription:
    sub_id = str(_obj_get(stripe_subscription, "id"))
    customer_id = str(_obj_get(stripe_subscription, "customer"))
    items = _obj_get(_obj_get(stripe_subscription, "items", {}), "data", []) or []
    item = items[0] if items else {}
    price = _obj_get(item, "price", {}) or {}
    price_id = _obj_get(price, "id")
    interval = _obj_get(_obj_get(price, "recurring", {}) or {}, "interval", "month")
    quantity = int(_obj_get(item, "quantity", 1) or 1)
    plan = _price_to_plan(price_id)
    row = (await db.execute(select(Subscription).where(Subscription.organization_id == organization_id))).scalar_one_or_none()
    if row is None:
        row = Subscription(organization_id=organization_id, stripe_customer_id=customer_id)
        db.add(row)
    row.stripe_customer_id = customer_id
    row.stripe_subscription_id = sub_id
    row.stripe_price_id = price_id
    row.plan = plan
    row.status = str(_obj_get(stripe_subscription, "status", "active"))
    row.billing_interval = interval or "month"
    row.seat_quantity = quantity
    row.trial_ends_at = _ts(_obj_get(stripe_subscription, "trial_end"))
    row.current_period_start = _ts(_obj_get(stripe_subscription, "current_period_start"))
    row.current_period_end = _ts(_obj_get(stripe_subscription, "current_period_end"))
    row.cancel_at_period_end = bool(_obj_get(stripe_subscription, "cancel_at_period_end", False))
    row.canceled_at = _ts(_obj_get(stripe_subscription, "canceled_at"))
    row.ended_at = _ts(_obj_get(stripe_subscription, "ended_at"))
    row.metadata_ = dict(_obj_get(stripe_subscription, "metadata", {}) or {})
    org = await _org(db, organization_id)
    org.stripe_customer_id = customer_id
    org.plan = plan if row.status not in {"past_due", "canceled", "unpaid", "expired"} else "starter"
    org.seats = quantity
    org.trial_ends_at = row.trial_ends_at
    await db.commit()
    await db.refresh(row)
    return row


async def cancel_subscription(db: AsyncSession, organization_id: uuid.UUID, at_period_end: bool = True) -> Subscription | None:
    _require_stripe()
    row = (await db.execute(select(Subscription).where(Subscription.organization_id == organization_id))).scalar_one_or_none()
    if row is None or not row.stripe_subscription_id:
        return row
    stripe_sub = stripe.Subscription.modify(row.stripe_subscription_id, cancel_at_period_end=True) if at_period_end else stripe.Subscription.cancel(row.stripe_subscription_id)
    await audit_record(organization_id=organization_id, actor_user_id=None, actor_email=None, event="billing.subscription_cancel", target_type="subscription", target_id=str(row.id), details={"at_period_end": at_period_end}, db=db)
    return await sync_subscription_from_stripe(db, organization_id, stripe_sub)


async def update_seat_quantity(db: AsyncSession, organization_id: uuid.UUID, new_quantity: int) -> Subscription | None:
    _require_stripe()
    row = (await db.execute(select(Subscription).where(Subscription.organization_id == organization_id))).scalar_one_or_none()
    if row is None or not row.stripe_subscription_id:
        org = await _org(db, organization_id)
        org.seats = new_quantity
        await db.commit()
        return row
    stripe_sub = stripe.Subscription.retrieve(row.stripe_subscription_id)
    item_id = stripe_sub["items"]["data"][0]["id"]
    updated = stripe.Subscription.modify(row.stripe_subscription_id, items=[{"id": item_id, "quantity": new_quantity}], proration_behavior="create_prorations")
    await audit_record(organization_id=organization_id, actor_user_id=None, actor_email=None, event="billing.seats_updated", target_type="subscription", target_id=str(row.id), details={"quantity": new_quantity}, db=db)
    return await sync_subscription_from_stripe(db, organization_id, updated)


async def get_invoices(db: AsyncSession, organization_id: uuid.UUID, limit: int = 20) -> list[dict]:
    _require_stripe()
    customer_id = await get_or_create_stripe_customer(db, organization_id)
    invoices = stripe.Invoice.list(customer=customer_id, limit=limit)
    return [
        {
            "id": inv["id"], "number": inv.get("number"), "amount_due": inv.get("amount_due"), "amount_paid": inv.get("amount_paid"),
            "currency": inv.get("currency"), "status": inv.get("status"), "invoice_pdf": inv.get("invoice_pdf"),
            "hosted_invoice_url": inv.get("hosted_invoice_url"), "created": _ts(inv.get("created")).isoformat() if inv.get("created") else None,
            "period_start": _ts(inv.get("period_start")).isoformat() if inv.get("period_start") else None,
            "period_end": _ts(inv.get("period_end")).isoformat() if inv.get("period_end") else None,
        }
        for inv in invoices.get("data", [])
    ]


async def _org_for_customer(db: AsyncSession, customer_id: str) -> uuid.UUID | None:
    org_id = (await db.execute(select(Organization.id).where(Organization.stripe_customer_id == customer_id))).scalar_one_or_none()
    if org_id:
        return org_id
    return (await db.execute(select(Subscription.organization_id).where(Subscription.stripe_customer_id == customer_id))).scalar_one_or_none()


async def _notify_admins_payment(db: AsyncSession, organization_id: uuid.UUID, title: str, body: str) -> None:
    admins = (await db.execute(select(User).where(User.organization_id == organization_id, User.role.in_(["owner", "admin"]), User.is_active.is_(True)))).scalars().all()
    for admin in admins:
        await send_email(admin.email, title, f"<p>{body}</p>")
        await notify(organization_id=organization_id, user_id=admin.id, kind="billing.payment_failed", title=title, body=body, link_url="/admin/billing", db=db)


async def handle_webhook_event(db: AsyncSession, event: Any) -> None:
    event_type = _obj_get(event, "type")
    data_obj = _obj_get(_obj_get(event, "data", {}), "object", {})
    customer_id = str(_obj_get(data_obj, "customer", ""))
    organization_id = await _org_for_customer(db, customer_id) if customer_id else None
    metadata = _obj_get(data_obj, "metadata", {}) or {}
    if not organization_id and metadata.get("organization_id"):
        organization_id = uuid.UUID(str(metadata["organization_id"]))
    if event_type in {"customer.subscription.created", "customer.subscription.updated", "customer.subscription.deleted"}:
        if organization_id:
            sub = await sync_subscription_from_stripe(db, organization_id, data_obj)
            if event_type.endswith("deleted"):
                sub.status = "canceled"
                (await _org(db, organization_id)).plan = "starter"
                await db.commit()
            await dispatch_event(
                db=db,
                organization_id=organization_id,
                event=SUBSCRIPTION_CANCELED if event_type.endswith("deleted") else SUBSCRIPTION_CREATED if event_type.endswith("created") else SUBSCRIPTION_UPDATED,
                payload={"subscription_id": sub.stripe_subscription_id, "status": sub.status, "plan": sub.plan},
            )
        return
    if not organization_id:
        return
    row = (await db.execute(select(Subscription).where(Subscription.organization_id == organization_id))).scalar_one_or_none()
    if event_type == "invoice.payment_succeeded" and row:
        row.latest_invoice_status = "paid"
        row.dunning_attempts = 0
        await db.commit()
    elif event_type == "invoice.payment_failed" and row:
        row.latest_invoice_status = "failed"
        row.dunning_attempts = int(row.dunning_attempts or 0) + 1
        attempt = row.dunning_attempts
        title = "Payment failed" if attempt == 1 else "Payment still failing" if attempt == 2 else "Account restricted after failed payments"
        body = "Please update your payment method to keep FlowLyra running."
        if attempt >= 3:
            row.status = "past_due"
            (await _org(db, organization_id)).plan = "starter"
            body = "Your account has been restricted to starter limits until payment is updated."
        await _notify_admins_payment(db, organization_id, title, body)
        await db.commit()
        await dispatch_event(
            db=db,
            organization_id=organization_id,
            event=PAYMENT_FAILED,
            payload={"subscription_id": row.stripe_subscription_id, "attempt": attempt, "status": row.status},
        )
    elif event_type == "customer.subscription.trial_will_end":
        await _notify_admins_payment(db, organization_id, "FlowLyra trial ending soon", "Your trial ends soon. Add a payment method to continue uninterrupted.")
        await db.commit()
