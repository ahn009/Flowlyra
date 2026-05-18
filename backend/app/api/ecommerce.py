from __future__ import annotations

from datetime import UTC, datetime, timedelta
from decimal import Decimal
import json
from typing import Annotated, Any
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import delete, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.middleware.auth import TokenUser, current_user
from app.models.analytics_event import AnalyticsEvent
from app.models.chat import Chat
from app.models.contact import Contact
from app.models.ecommerce import Cart, CartItem, Order, OrderItem
from app.models.engage import Goal, GoalAchievement
from app.models.integration import Integration
from app.models.product import Product
from app.models.proactive_trigger import ProactiveTrigger
from app.models.session import Session
from app.services.analytics_service import log_event
from app.services.integration_service import log_integration
from app.services.notification_service import notify
from app.services.sales_service import chat_revenue_summary, contact_ltv, contact_scores, recommend_products, sales_dashboard
from app.services.webhook_service import dispatch_event

router = APIRouter(prefix="/ecommerce", tags=["ecommerce"])


class ProductUpsertIn(BaseModel):
    provider: str | None = None
    external_product_id: str | None = None
    variant_id: str | None = None
    sku: str | None = None
    name: str = Field(min_length=1, max_length=255)
    description: str | None = None
    price: float | None = None
    currency: str = "USD"
    inventory: int = 0
    is_in_stock: bool = True
    category: str | None = None
    brand: str | None = None
    image_url: str | None = None
    product_url: str | None = None
    meta: dict = Field(default_factory=dict)
    is_active: bool = True


class ProductBulkSyncIn(BaseModel):
    items: list[ProductUpsertIn] = Field(default_factory=list, max_length=2000)


class CartItemIn(BaseModel):
    product_id: uuid.UUID | None = None
    sku: str | None = None
    name: str
    quantity: int = Field(default=1, ge=1)
    unit_price: float = 0
    currency: str = "USD"
    image_url: str | None = None
    product_url: str | None = None
    meta: dict = Field(default_factory=dict)


class CartUpsertIn(BaseModel):
    session_id: uuid.UUID | None = None
    contact_id: uuid.UUID | None = None
    chat_id: uuid.UUID | None = None
    status: str = "active"
    currency: str = "USD"
    subtotal: float | None = None
    discount_total: float | None = None
    total: float | None = None
    item_count: int | None = None
    external_cart_id: str | None = None
    source: str | None = None
    meta: dict = Field(default_factory=dict)
    items: list[CartItemIn] = Field(default_factory=list, max_length=500)


class OrderItemIn(BaseModel):
    product_id: uuid.UUID | None = None
    sku: str | None = None
    name: str
    quantity: int = Field(default=1, ge=1)
    unit_price: float = 0
    currency: str = "USD"
    image_url: str | None = None
    product_url: str | None = None
    meta: dict = Field(default_factory=dict)


class OrderUpsertIn(BaseModel):
    order_number: str = Field(min_length=1, max_length=120)
    external_order_id: str | None = None
    contact_id: uuid.UUID | None = None
    cart_id: uuid.UUID | None = None
    chat_id: uuid.UUID | None = None
    email: str | None = None
    status: str = "placed"
    currency: str = "USD"
    subtotal: float = 0
    tax_total: float = 0
    shipping_total: float = 0
    discount_total: float = 0
    total: float = 0
    source: str | None = None
    is_refunded: bool = False
    placed_at: datetime | None = None
    fulfilled_at: datetime | None = None
    cancelled_at: datetime | None = None
    meta: dict = Field(default_factory=dict)
    items: list[OrderItemIn] = Field(default_factory=list, max_length=1000)


class LeadPushIn(BaseModel):
    contact_id: uuid.UUID
    source: str = "chat"
    metadata: dict = Field(default_factory=dict)


class CouponSendIn(BaseModel):
    chat_id: uuid.UUID
    code: str = Field(min_length=2, max_length=80)
    discount_text: str | None = None
    expires_at: datetime | None = None
    message: str | None = None


class UpsellEvaluateIn(BaseModel):
    chat_id: uuid.UUID | None = None
    contact_id: uuid.UUID | None = None
    session_id: uuid.UUID | None = None
    query: str | None = None
    limit: int = Field(default=4, ge=1, le=20)


class CheckoutAssistIn(BaseModel):
    enabled: bool = True
    mode: str = "guided"


def _as_float(value: Decimal | float | int | None) -> float:
    if value is None:
        return 0.0
    if isinstance(value, Decimal):
        return float(value)
    return float(value)


def _product_out(row: Product) -> dict:
    return {
        "id": str(row.id),
        "provider": row.provider,
        "external_product_id": row.external_product_id,
        "variant_id": row.variant_id,
        "sku": row.sku,
        "name": row.name,
        "description": row.description,
        "price": _as_float(row.price) if row.price is not None else None,
        "currency": row.currency,
        "inventory": int(row.inventory or 0),
        "is_in_stock": bool(row.is_in_stock),
        "category": row.category,
        "brand": row.brand,
        "image_url": row.image_url,
        "product_url": row.product_url,
        "meta": row.meta or {},
        "is_active": row.is_active,
        "updated_at": row.updated_at.isoformat() if row.updated_at else None,
    }


def _cart_out(row: Cart, items: list[CartItem]) -> dict:
    return {
        "id": str(row.id),
        "session_id": str(row.session_id) if row.session_id else None,
        "contact_id": str(row.contact_id) if row.contact_id else None,
        "chat_id": str(row.chat_id) if row.chat_id else None,
        "status": row.status,
        "currency": row.currency,
        "subtotal": _as_float(row.subtotal),
        "discount_total": _as_float(row.discount_total),
        "total": _as_float(row.total),
        "item_count": int(row.item_count or 0),
        "external_cart_id": row.external_cart_id,
        "source": row.source,
        "meta": row.meta or {},
        "last_activity_at": row.last_activity_at.isoformat() if row.last_activity_at else None,
        "items": [
            {
                "id": str(item.id),
                "product_id": str(item.product_id) if item.product_id else None,
                "sku": item.sku,
                "name": item.name,
                "quantity": item.quantity,
                "unit_price": _as_float(item.unit_price),
                "currency": item.currency,
                "line_total": _as_float(item.line_total),
                "image_url": item.image_url,
                "product_url": item.product_url,
                "meta": item.meta or {},
            }
            for item in items
        ],
    }


def _order_out(row: Order, items: list[OrderItem]) -> dict:
    return {
        "id": str(row.id),
        "order_number": row.order_number,
        "external_order_id": row.external_order_id,
        "contact_id": str(row.contact_id) if row.contact_id else None,
        "cart_id": str(row.cart_id) if row.cart_id else None,
        "chat_id": str(row.chat_id) if row.chat_id else None,
        "email": row.email,
        "status": row.status,
        "currency": row.currency,
        "subtotal": _as_float(row.subtotal),
        "tax_total": _as_float(row.tax_total),
        "shipping_total": _as_float(row.shipping_total),
        "discount_total": _as_float(row.discount_total),
        "total": _as_float(row.total),
        "source": row.source,
        "is_refunded": row.is_refunded,
        "placed_at": row.placed_at.isoformat() if row.placed_at else None,
        "fulfilled_at": row.fulfilled_at.isoformat() if row.fulfilled_at else None,
        "cancelled_at": row.cancelled_at.isoformat() if row.cancelled_at else None,
        "meta": row.meta or {},
        "items": [
            {
                "id": str(item.id),
                "product_id": str(item.product_id) if item.product_id else None,
                "sku": item.sku,
                "name": item.name,
                "quantity": item.quantity,
                "unit_price": _as_float(item.unit_price),
                "currency": item.currency,
                "line_total": _as_float(item.line_total),
                "image_url": item.image_url,
                "product_url": item.product_url,
                "meta": item.meta or {},
            }
            for item in items
        ],
    }


async def _get_order_items(db: AsyncSession, order_id: uuid.UUID) -> list[OrderItem]:
    return (await db.execute(select(OrderItem).where(OrderItem.order_id == order_id).order_by(OrderItem.created_at.asc()))).scalars().all()


async def _get_cart_items(db: AsyncSession, cart_id: uuid.UUID) -> list[CartItem]:
    return (await db.execute(select(CartItem).where(CartItem.cart_id == cart_id).order_by(CartItem.created_at.asc()))).scalars().all()


async def _record_revenue_goal_achievements(
    db: AsyncSession,
    *,
    organization_id: uuid.UUID,
    session_id: uuid.UUID | None,
    chat_id: uuid.UUID | None,
    value: float,
) -> None:
    goals = (
        await db.execute(
            select(Goal).where(
                Goal.organization_id == organization_id,
                Goal.is_active.is_(True),
                Goal.goal_type == "revenue",
            )
        )
    ).scalars().all()
    for goal in goals:
        db.add(
            GoalAchievement(
                organization_id=organization_id,
                goal_id=goal.id,
                session_id=session_id,
                chat_id=chat_id,
                campaign_id=None,
                value=value,
                metadata_={"event": "order.created", "source": "ecommerce.orders.upsert"},
            )
        )


@router.get("/products")
async def list_products(
    user: Annotated[TokenUser, Depends(current_user)],
    db: AsyncSession = Depends(get_db),
    q: str | None = None,
    sku: str | None = None,
    category: str | None = None,
    limit: int = Query(50, ge=1, le=300),
) -> dict:
    stmt = select(Product).where(Product.organization_id == user.organization_id)
    if sku:
        stmt = stmt.where(Product.sku == sku)
    elif q:
        like = f"%{q.strip()}%"
        stmt = stmt.where(
            or_(
                Product.name.ilike(like),
                Product.description.ilike(like),
                Product.sku.ilike(like),
                Product.brand.ilike(like),
                Product.category.ilike(like),
            )
        )
    if category:
        stmt = stmt.where(Product.category.ilike(category.strip()))
    rows = (await db.execute(stmt.order_by(Product.updated_at.desc()).limit(limit))).scalars().all()
    return {"items": [_product_out(row) for row in rows]}


@router.get("/products/recommendations")
async def product_recommendations(
    user: Annotated[TokenUser, Depends(current_user)],
    db: AsyncSession = Depends(get_db),
    query: str | None = None,
    chat_id: uuid.UUID | None = None,
    limit: int = Query(6, ge=1, le=20),
) -> dict:
    source_query = (query or "").strip()
    if not source_query and chat_id:
        chat = (
            await db.execute(select(Chat).where(Chat.id == chat_id, Chat.organization_id == user.organization_id))
        ).scalar_one_or_none()
        if chat is not None:
            last_customer = (
                await db.execute(
                    select(AnalyticsEvent)
                    .where(AnalyticsEvent.organization_id == user.organization_id, AnalyticsEvent.chat_id == chat.id)
                    .order_by(AnalyticsEvent.occurred_at.desc())
                )
            ).scalars().first()
            source_query = str((last_customer.metadata_ or {}).get("last_text") or "") if last_customer else ""

    products = await recommend_products(db, organization_id=user.organization_id, query=source_query, limit=limit)
    return {"items": [_product_out(row) for row in products], "query": source_query}


@router.post("/products/upsert")
async def upsert_product(
    payload: ProductUpsertIn,
    user: Annotated[TokenUser, Depends(current_user)],
    db: AsyncSession = Depends(get_db),
) -> dict:
    row = None
    if payload.external_product_id and payload.provider:
        row = (
            await db.execute(
                select(Product).where(
                    Product.organization_id == user.organization_id,
                    Product.provider == payload.provider,
                    Product.external_product_id == payload.external_product_id,
                )
            )
        ).scalar_one_or_none()
    if row is None and payload.sku:
        row = (
            await db.execute(select(Product).where(Product.organization_id == user.organization_id, Product.sku == payload.sku))
        ).scalar_one_or_none()
    if row is None:
        row = Product(organization_id=user.organization_id)
        db.add(row)

    for key, value in payload.model_dump().items():
        setattr(row, key, value)

    await db.commit()
    await db.refresh(row)
    return {"ok": True, "item": _product_out(row)}


@router.post("/products/sync")
async def sync_products(
    payload: ProductBulkSyncIn,
    user: Annotated[TokenUser, Depends(current_user)],
    db: AsyncSession = Depends(get_db),
) -> dict:
    synced = 0
    for item in payload.items:
        row = None
        if item.external_product_id and item.provider:
            row = (
                await db.execute(
                    select(Product).where(
                        Product.organization_id == user.organization_id,
                        Product.provider == item.provider,
                        Product.external_product_id == item.external_product_id,
                    )
                )
            ).scalar_one_or_none()
        if row is None and item.sku:
            row = (
                await db.execute(select(Product).where(Product.organization_id == user.organization_id, Product.sku == item.sku))
            ).scalar_one_or_none()
        if row is None:
            row = Product(organization_id=user.organization_id)
            db.add(row)
        for key, value in item.model_dump().items():
            setattr(row, key, value)
        synced += 1

    await db.commit()
    return {"ok": True, "synced": synced}


@router.post("/carts/upsert")
async def upsert_cart(
    payload: CartUpsertIn,
    user: Annotated[TokenUser, Depends(current_user)],
    db: AsyncSession = Depends(get_db),
) -> dict:
    if payload.session_id:
        session = (
            await db.execute(select(Session).where(Session.id == payload.session_id, Session.organization_id == user.organization_id))
        ).scalar_one_or_none()
        if session is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")

    if payload.chat_id:
        chat = (
            await db.execute(select(Chat).where(Chat.id == payload.chat_id, Chat.organization_id == user.organization_id))
        ).scalar_one_or_none()
        if chat is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chat not found")

    row = None
    if payload.external_cart_id:
        row = (
            await db.execute(select(Cart).where(Cart.organization_id == user.organization_id, Cart.external_cart_id == payload.external_cart_id))
        ).scalar_one_or_none()
    if row is None and payload.session_id:
        row = (
            await db.execute(
                select(Cart).where(
                    Cart.organization_id == user.organization_id,
                    Cart.session_id == payload.session_id,
                    Cart.status == payload.status,
                )
            )
        ).scalar_one_or_none()

    if row is None:
        row = Cart(organization_id=user.organization_id)
        db.add(row)

    row.session_id = payload.session_id
    row.contact_id = payload.contact_id
    row.chat_id = payload.chat_id
    row.status = payload.status
    row.currency = payload.currency
    row.external_cart_id = payload.external_cart_id
    row.source = payload.source
    row.meta = payload.meta
    row.last_activity_at = datetime.now(UTC)
    await db.flush()

    item_count = payload.item_count
    subtotal = payload.subtotal
    discount_total = payload.discount_total
    total = payload.total

    if row.id is not None:
        await db.execute(delete(CartItem).where(CartItem.cart_id == row.id))

    computed_subtotal = 0.0
    computed_items = 0
    for item in payload.items:
        line_total = float(item.unit_price) * int(item.quantity)
        db.add(
            CartItem(
                cart_id=row.id,
                product_id=item.product_id,
                sku=item.sku,
                name=item.name,
                quantity=item.quantity,
                unit_price=item.unit_price,
                currency=item.currency,
                line_total=line_total,
                image_url=item.image_url,
                product_url=item.product_url,
                meta=item.meta,
            )
        )
        computed_subtotal += line_total
        computed_items += item.quantity

    if item_count is None:
        item_count = computed_items
    if subtotal is None:
        subtotal = computed_subtotal

    row.item_count = int(item_count or 0)
    row.subtotal = float(subtotal or 0)
    row.discount_total = float(discount_total or 0)
    row.total = float(total if total is not None else (row.subtotal - row.discount_total))

    await db.commit()
    await db.refresh(row)
    items = await _get_cart_items(db, row.id)
    return {"ok": True, "item": _cart_out(row, items)}


@router.get("/carts/by-session/{session_id}")
async def cart_by_session(
    session_id: uuid.UUID,
    user: Annotated[TokenUser, Depends(current_user)],
    db: AsyncSession = Depends(get_db),
) -> dict:
    row = (
        await db.execute(
            select(Cart).where(Cart.organization_id == user.organization_id, Cart.session_id == session_id).order_by(Cart.updated_at.desc()).limit(1)
        )
    ).scalar_one_or_none()
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cart not found")
    items = await _get_cart_items(db, row.id)
    return {"item": _cart_out(row, items)}


@router.post("/carts/recovery/run")
async def run_cart_recovery(
    user: Annotated[TokenUser, Depends(current_user)],
    db: AsyncSession = Depends(get_db),
    inactive_minutes: int = Query(45, ge=5, le=60 * 72),
) -> dict:
    cutoff = datetime.now(UTC) - timedelta(minutes=inactive_minutes)
    rows = (
        await db.execute(
            select(Cart).where(
                Cart.organization_id == user.organization_id,
                Cart.status == "active",
                Cart.last_activity_at <= cutoff,
                Cart.total > 0,
            )
        )
    ).scalars().all()

    count = 0
    for row in rows:
        row.status = "abandoned"
        count += 1
        conditions = {
            "campaign_type": "cart_recovery",
            "cart_id": str(row.id),
            "min_cart_total": float(row.total or 0),
            "session_id": str(row.session_id) if row.session_id else None,
        }
        trigger = ProactiveTrigger(
            organization_id=user.organization_id,
            name=f"Cart recovery {str(row.id)[:8]}",
            trigger_type="cart_value",
            conditions=conditions,
            message="Looks like you left items in your cart. Reply and we can help you check out.",
            is_active=True,
        )
        db.add(trigger)
        if row.chat_id:
            await notify(
                organization_id=user.organization_id,
                user_id=user.id,
                kind="cart.abandoned",
                title="Abandoned cart detected",
                body=f"Cart total {float(row.total or 0):.2f} requires follow-up",
                link_url=f"/inbox/chat/{row.chat_id}",
                db=db,
            )
    await db.commit()
    return {"ok": True, "carts_marked_abandoned": count}


@router.post("/orders/upsert")
async def upsert_order(
    payload: OrderUpsertIn,
    user: Annotated[TokenUser, Depends(current_user)],
    db: AsyncSession = Depends(get_db),
) -> dict:
    row = (
        await db.execute(select(Order).where(Order.organization_id == user.organization_id, Order.order_number == payload.order_number))
    ).scalar_one_or_none()
    created = row is None
    if row is None:
        row = Order(organization_id=user.organization_id, order_number=payload.order_number)
        db.add(row)

    contact_id = payload.contact_id
    if contact_id is None and payload.email:
        contact = (
            await db.execute(select(Contact).where(Contact.organization_id == user.organization_id, Contact.email == payload.email))
        ).scalar_one_or_none()
        if contact:
            contact_id = contact.id

    cart_row: Cart | None = None
    if payload.cart_id:
        cart_row = (
            await db.execute(select(Cart).where(Cart.id == payload.cart_id, Cart.organization_id == user.organization_id))
        ).scalar_one_or_none()
        if cart_row is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cart not found")
        if payload.status not in {"cancelled", "failed"}:
            cart_row.status = "converted"
            cart_row.converted_at = datetime.now(UTC)

    session_id: uuid.UUID | None = None
    if payload.chat_id:
        chat = (
            await db.execute(select(Chat).where(Chat.id == payload.chat_id, Chat.organization_id == user.organization_id))
        ).scalar_one_or_none()
        if chat is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chat not found")
        session_id = chat.session_id

    row.external_order_id = payload.external_order_id
    row.contact_id = contact_id
    row.cart_id = payload.cart_id
    row.chat_id = payload.chat_id
    row.email = payload.email
    row.status = payload.status
    row.currency = payload.currency
    row.subtotal = payload.subtotal
    row.tax_total = payload.tax_total
    row.shipping_total = payload.shipping_total
    row.discount_total = payload.discount_total
    row.total = payload.total
    row.source = payload.source
    row.is_refunded = payload.is_refunded
    row.placed_at = payload.placed_at
    row.fulfilled_at = payload.fulfilled_at
    row.cancelled_at = payload.cancelled_at
    row.meta = payload.meta

    await db.flush()
    await db.execute(delete(OrderItem).where(OrderItem.order_id == row.id))
    for item in payload.items:
        line_total = float(item.unit_price) * int(item.quantity)
        db.add(
            OrderItem(
                order_id=row.id,
                product_id=item.product_id,
                sku=item.sku,
                name=item.name,
                quantity=item.quantity,
                unit_price=item.unit_price,
                currency=item.currency,
                line_total=line_total,
                image_url=item.image_url,
                product_url=item.product_url,
                meta=item.meta,
            )
        )

    if created and row.status not in {"cancelled", "failed"}:
        if row.chat_id:
            await log_event(
                db,
                user.organization_id,
                "sale.attributed",
                chat_id=row.chat_id,
                contact_id=row.contact_id,
                metadata={"chat_id": str(row.chat_id), "order_id": str(row.id), "order_number": row.order_number, "value": float(row.total or 0)},
            )
        await _record_revenue_goal_achievements(
            db,
            organization_id=user.organization_id,
            session_id=session_id,
            chat_id=row.chat_id,
            value=float(row.total or 0),
        )

    await db.commit()
    await db.refresh(row)
    items = await _get_order_items(db, row.id)
    return {"ok": True, "item": _order_out(row, items)}


@router.get("/orders/lookup")
async def lookup_orders(
    user: Annotated[TokenUser, Depends(current_user)],
    db: AsyncSession = Depends(get_db),
    email: str | None = None,
    order_number: str | None = None,
    limit: int = Query(20, ge=1, le=100),
) -> dict:
    if not email and not order_number:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="email or order_number is required")

    stmt = select(Order).where(Order.organization_id == user.organization_id)
    if email:
        stmt = stmt.where(Order.email == email)
    if order_number:
        stmt = stmt.where(Order.order_number == order_number)

    rows = (await db.execute(stmt.order_by(Order.placed_at.desc().nullslast(), Order.created_at.desc()).limit(limit))).scalars().all()
    items: list[dict] = []
    for row in rows:
        order_items = await _get_order_items(db, row.id)
        items.append(_order_out(row, order_items))
    return {"items": items}


@router.get("/orders/{order_id}/tracking")
async def order_tracking(
    order_id: uuid.UUID,
    user: Annotated[TokenUser, Depends(current_user)],
    db: AsyncSession = Depends(get_db),
) -> dict:
    row = (
        await db.execute(select(Order).where(Order.id == order_id, Order.organization_id == user.organization_id))
    ).scalar_one_or_none()
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    tracking = {
        "order_number": row.order_number,
        "status": row.status,
        "placed_at": row.placed_at.isoformat() if row.placed_at else None,
        "fulfilled_at": row.fulfilled_at.isoformat() if row.fulfilled_at else None,
        "cancelled_at": row.cancelled_at.isoformat() if row.cancelled_at else None,
        "total": _as_float(row.total),
        "currency": row.currency,
    }
    return {"item": tracking}


@router.get("/revenue/attribution")
async def revenue_attribution(
    user: Annotated[TokenUser, Depends(current_user)],
    db: AsyncSession = Depends(get_db),
    days: int = Query(30, ge=1, le=365),
) -> dict:
    start = datetime.now(UTC) - timedelta(days=days)
    rows = (
        await db.execute(
            select(Order)
            .where(Order.organization_id == user.organization_id, Order.created_at >= start, Order.chat_id.is_not(None))
            .order_by(Order.created_at.desc())
        )
    ).scalars().all()
    by_chat: dict[str, float] = {}
    for row in rows:
        chat_id = str(row.chat_id)
        by_chat[chat_id] = by_chat.get(chat_id, 0.0) + float(row.total or 0)
    return {
        "days": days,
        "total_revenue": sum(by_chat.values()),
        "items": [
            {"chat_id": chat_id, "revenue": revenue}
            for chat_id, revenue in sorted(by_chat.items(), key=lambda x: x[1], reverse=True)
        ],
    }


@router.get("/sales/dashboard")
async def sales_tracker_dashboard(
    user: Annotated[TokenUser, Depends(current_user)],
    db: AsyncSession = Depends(get_db),
    days: int = Query(30, ge=1, le=365),
) -> dict:
    return await sales_dashboard(db, organization_id=user.organization_id, days=days)


@router.get("/contacts/{contact_id}/ltv")
async def customer_ltv(
    contact_id: uuid.UUID,
    user: Annotated[TokenUser, Depends(current_user)],
    db: AsyncSession = Depends(get_db),
) -> dict:
    payload = await contact_ltv(db, organization_id=user.organization_id, contact_id=contact_id)
    return {"item": payload}


@router.get("/contacts/{contact_id}/scores")
async def customer_scores(
    contact_id: uuid.UUID,
    user: Annotated[TokenUser, Depends(current_user)],
    db: AsyncSession = Depends(get_db),
) -> dict:
    payload = await contact_scores(db, organization_id=user.organization_id, contact_id=contact_id)
    return {"item": payload}


@router.post("/leads/push")
async def lead_push_to_crm(
    payload: LeadPushIn,
    user: Annotated[TokenUser, Depends(current_user)],
    db: AsyncSession = Depends(get_db),
) -> dict:
    contact = (
        await db.execute(select(Contact).where(Contact.id == payload.contact_id, Contact.organization_id == user.organization_id))
    ).scalar_one_or_none()
    if contact is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contact not found")

    score_payload = await contact_scores(db, organization_id=user.organization_id, contact_id=contact.id)

    integrations = (
        await db.execute(
            select(Integration).where(
                Integration.organization_id == user.organization_id,
                Integration.category == "crm",
                Integration.is_active.is_(True),
            )
        )
    ).scalars().all()

    pushed = 0
    for integration in integrations:
        await log_integration(
            db,
            integration_id=integration.id,
            organization_id=user.organization_id,
            event="crm.lead.push",
            message=f"Lead pushed to {integration.provider}",
            payload={
                "contact_id": str(contact.id),
                "email": contact.email,
                "full_name": contact.full_name,
                "source": payload.source,
                "lead_score": score_payload["lead_score"],
                "churn_risk": score_payload["churn_risk"],
                "metadata": payload.metadata,
            },
        )
        pushed += 1

    await dispatch_event(
        organization_id=user.organization_id,
        event="lead.crm.pushed",
        payload={
            "contact_id": str(contact.id),
            "pushed_integrations": pushed,
            "source": payload.source,
            "lead_score": score_payload["lead_score"],
        },
        db=db,
    )

    await db.commit()
    return {"ok": True, "pushed_integrations": pushed, "lead_score": score_payload["lead_score"]}


@router.post("/coupons/send")
async def coupon_delivery(
    payload: CouponSendIn,
    user: Annotated[TokenUser, Depends(current_user)],
    db: AsyncSession = Depends(get_db),
) -> dict:
    chat = (
        await db.execute(select(Chat).where(Chat.id == payload.chat_id, Chat.organization_id == user.organization_id))
    ).scalar_one_or_none()
    if chat is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chat not found")

    structured = {
        "type": "coupon",
        "code": payload.code,
        "discount_text": payload.discount_text or "Special discount unlocked",
        "expires_at": payload.expires_at.isoformat() if payload.expires_at else None,
        "message": payload.message or "Use this code at checkout.",
    }

    from app.services.chat_service import add_message

    message = await add_message(
        db,
        chat,
        "agent",
        content=json.dumps(structured),
        sender_id=user.id,
        is_internal=False,
        content_type="coupon",
    )
    await db.commit()

    from app.socket_manager import sio

    await sio.emit(
        "chat:message:new",
        {
            "id": str(message.id),
            "chat_id": str(message.chat_id),
            "sender_type": message.sender_type,
            "content": message.content,
            "content_type": message.content_type,
            "is_internal": message.is_internal,
            "created_at": message.created_at.isoformat(),
        },
        room=f"chat:{chat.id}",
    )
    return {"ok": True, "message_id": str(message.id)}


@router.post("/upsell/evaluate")
async def upsell_trigger(
    payload: UpsellEvaluateIn,
    user: Annotated[TokenUser, Depends(current_user)],
    db: AsyncSession = Depends(get_db),
) -> dict:
    base_query = payload.query or ""
    if payload.contact_id:
        contact = (
            await db.execute(select(Contact).where(Contact.id == payload.contact_id, Contact.organization_id == user.organization_id))
        ).scalar_one_or_none()
        if contact and contact.custom_attrs:
            interests = contact.custom_attrs.get("interests")
            if interests:
                base_query = f"{base_query} {' '.join(str(x) for x in interests if x)}".strip()

    if payload.session_id and not base_query:
        session = (
            await db.execute(select(Session).where(Session.id == payload.session_id, Session.organization_id == user.organization_id))
        ).scalar_one_or_none()
        if session:
            source_parts = [
                str(session.current_url or ""),
                str((session.custom_variables or {}).get("last_search") or ""),
                str((session.custom_variables or {}).get("cart_category") or ""),
            ]
            base_query = " ".join(part for part in source_parts if part).strip()

    products = await recommend_products(db, organization_id=user.organization_id, query=base_query, limit=payload.limit)
    return {"query": base_query, "items": [_product_out(row) for row in products]}


@router.post("/chats/{chat_id}/checkout-assist")
async def checkout_assist_mode(
    chat_id: uuid.UUID,
    payload: CheckoutAssistIn,
    user: Annotated[TokenUser, Depends(current_user)],
    db: AsyncSession = Depends(get_db),
) -> dict:
    chat = (
        await db.execute(select(Chat).where(Chat.id == chat_id, Chat.organization_id == user.organization_id))
    ).scalar_one_or_none()
    if chat is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chat not found")

    chat.tags = sorted(set((chat.tags or []) + (["checkout_assist"] if payload.enabled else []))) if payload.enabled else [tag for tag in (chat.tags or []) if tag != "checkout_assist"]

    from app.services.chat_service import add_message

    msg = "Checkout assist mode enabled. I can help with shipping, payment, and coupon questions." if payload.enabled else "Checkout assist mode disabled."
    message = await add_message(
        db,
        chat,
        "system",
        content=msg,
        sender_id=user.id,
        is_internal=False,
        content_type="text",
    )
    await db.commit()

    from app.socket_manager import sio

    await sio.emit(
        "chat:message:new",
        {
            "id": str(message.id),
            "chat_id": str(message.chat_id),
            "sender_type": message.sender_type,
            "content": message.content,
            "content_type": message.content_type,
            "is_internal": message.is_internal,
            "created_at": message.created_at.isoformat(),
        },
        room=f"chat:{chat.id}",
    )

    return {"ok": True, "enabled": payload.enabled, "mode": payload.mode}


@router.get("/currency/format")
async def currency_format(
    user: Annotated[TokenUser, Depends(current_user)],
    amount: float,
    currency: str = "USD",
    locale: str = "en-US",
) -> dict:
    _ = user
    rounded = f"{amount:,.2f}"
    return {"formatted": f"{currency.upper()} {rounded}", "amount": amount, "currency": currency.upper(), "locale": locale}
