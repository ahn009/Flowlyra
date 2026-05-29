from typing import Annotated, Any

import stripe
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.db.session import get_db
from app.middleware.auth import TokenUser, current_user
from app.models.plan_limit import PLANS
from app.models.subscription import Subscription
from app.services import billing_service

router = APIRouter(prefix="/billing", tags=["billing"])
settings = get_settings()


class CheckoutIn(BaseModel):
    price_id: str
    success_url: str
    cancel_url: str
    quantity: int = 1
    coupon: str | None = None


class PortalIn(BaseModel):
    return_url: str


class SubscriptionPatch(BaseModel):
    seat_quantity: int | None = None
    billing_interval: str | None = None
    price_id: str | None = None


AdminUser = Annotated[TokenUser, Depends(current_user)]


def _require_billing_admin(user: TokenUser) -> None:
    if user.role not in {"owner", "admin"}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Billing requires admin or owner role")


def _sub_dict(row: Subscription | None) -> dict | None:
    if row is None:
        return None
    return {
        "id": str(row.id),
        "organization_id": str(row.organization_id),
        "stripe_customer_id": row.stripe_customer_id,
        "stripe_subscription_id": row.stripe_subscription_id,
        "stripe_price_id": row.stripe_price_id,
        "plan": row.plan,
        "status": row.status,
        "billing_interval": row.billing_interval,
        "seat_quantity": row.seat_quantity,
        "trial_ends_at": row.trial_ends_at.isoformat() if row.trial_ends_at else None,
        "current_period_start": row.current_period_start.isoformat() if row.current_period_start else None,
        "current_period_end": row.current_period_end.isoformat() if row.current_period_end else None,
        "cancel_at_period_end": row.cancel_at_period_end,
        "payment_method_brand": row.payment_method_brand,
        "payment_method_last4": row.payment_method_last4,
        "latest_invoice_status": row.latest_invoice_status,
        "dunning_attempts": row.dunning_attempts,
    }


@router.post("/checkout")
async def checkout(payload: CheckoutIn, user: AdminUser, db: AsyncSession = Depends(get_db)) -> dict:
    _require_billing_admin(user)
    try:
        url = await billing_service.create_checkout_session(
            db, user.organization_id, payload.price_id, payload.success_url, payload.cancel_url, payload.quantity, payload.coupon
        )
        return {"url": url}
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.post("/portal")
async def portal(payload: PortalIn, user: AdminUser, db: AsyncSession = Depends(get_db)) -> dict:
    _require_billing_admin(user)
    try:
        return {"url": await billing_service.create_customer_portal_session(db, user.organization_id, payload.return_url)}
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.get("/subscription")
async def subscription(user: AdminUser, db: AsyncSession = Depends(get_db)) -> dict | None:
    _require_billing_admin(user)
    row = (await db.execute(select(Subscription).where(Subscription.organization_id == user.organization_id))).scalar_one_or_none()
    return _sub_dict(row)


@router.patch("/subscription")
async def update_subscription(payload: SubscriptionPatch, user: AdminUser, db: AsyncSession = Depends(get_db)) -> dict | None:
    _require_billing_admin(user)
    try:
        if payload.seat_quantity is not None:
            row = await billing_service.update_seat_quantity(db, user.organization_id, max(1, payload.seat_quantity))
            return _sub_dict(row)
        if payload.price_id:
            row = (await db.execute(select(Subscription).where(Subscription.organization_id == user.organization_id))).scalar_one_or_none()
            if row and row.stripe_subscription_id:
                stripe_sub = stripe.Subscription.retrieve(row.stripe_subscription_id)
                item_id = stripe_sub["items"]["data"][0]["id"]
                updated = stripe.Subscription.modify(row.stripe_subscription_id, items=[{"id": item_id, "price": payload.price_id}], proration_behavior="create_prorations")
                row = await billing_service.sync_subscription_from_stripe(db, user.organization_id, updated)
            return _sub_dict(row)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    return await subscription(user, db)


@router.delete("/subscription")
async def cancel(user: AdminUser, db: AsyncSession = Depends(get_db), at_period_end: bool = Query(True)) -> dict | None:
    _require_billing_admin(user)
    try:
        return _sub_dict(await billing_service.cancel_subscription(db, user.organization_id, at_period_end))
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.get("/invoices")
async def invoices(user: AdminUser, db: AsyncSession = Depends(get_db), limit: int = Query(20, ge=1, le=100)) -> list[dict]:
    _require_billing_admin(user)
    try:
        return await billing_service.get_invoices(db, user.organization_id, limit)
    except RuntimeError:
        return []


@router.get("/plans")
async def plans(user: AdminUser) -> dict[str, Any]:
    _require_billing_admin(user)
    prices = billing_service.price_ids_by_plan()
    return {
        name: {
            **limits.__dict__,
            "features": sorted(limits.features),
            "price_ids": prices.get(name, {}),
        }
        for name, limits in PLANS.items()
    }


@router.post("/webhooks/stripe")
async def stripe_webhook(request: Request, db: AsyncSession = Depends(get_db)) -> dict:
    payload = await request.body()
    sig = request.headers.get("stripe-signature", "")
    if not settings.stripe_webhook_secret:
        raise HTTPException(status_code=503, detail="Stripe webhook secret not configured")
    try:
        event = stripe.Webhook.construct_event(payload, sig, settings.stripe_webhook_secret)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=400, detail="Invalid Stripe webhook signature") from exc
    await billing_service.handle_webhook_event(db, event)
    return {"received": True}
