from __future__ import annotations

from datetime import UTC, datetime
from decimal import Decimal
from typing import Annotated
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import delete, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.middleware.auth import TokenUser, current_user
from app.models.chat import Chat
from app.models.contact import Contact
from app.models.ecommerce import Cart, CartItem, Order, OrderItem
from app.models.product import Product
from app.models.session import Session

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
    return (
        await db.execute(select(OrderItem).where(OrderItem.order_id == order_id).order_by(OrderItem.created_at.asc()))
    ).scalars().all()


async def _get_cart_items(db: AsyncSession, cart_id: uuid.UUID) -> list[CartItem]:
    return (
        await db.execute(select(CartItem).where(CartItem.cart_id == cart_id).order_by(CartItem.created_at.asc()))
    ).scalars().all()


@router.get("/products")
async def list_products(
    user: Annotated[TokenUser, Depends(current_user)],
    db: AsyncSession = Depends(get_db),
    q: str | None = None,
    sku: str | None = None,
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
    rows = (await db.execute(stmt.order_by(Product.updated_at.desc()).limit(limit))).scalars().all()
    return {"items": [_product_out(row) for row in rows]}


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
            await db.execute(
                select(Product).where(
                    Product.organization_id == user.organization_id,
                    Product.sku == payload.sku,
                )
            )
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
                await db.execute(
                    select(Product).where(
                        Product.organization_id == user.organization_id,
                        Product.sku == item.sku,
                    )
                )
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
            await db.execute(
                select(Session).where(Session.id == payload.session_id, Session.organization_id == user.organization_id)
            )
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
            await db.execute(
                select(Cart).where(
                    Cart.organization_id == user.organization_id,
                    Cart.external_cart_id == payload.external_cart_id,
                )
            )
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

    if payload.items:
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
            select(Cart)
            .where(Cart.organization_id == user.organization_id, Cart.session_id == session_id)
            .order_by(Cart.updated_at.desc())
            .limit(1)
        )
    ).scalar_one_or_none()
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cart not found")
    items = await _get_cart_items(db, row.id)
    return {"item": _cart_out(row, items)}


@router.post("/orders/upsert")
async def upsert_order(
    payload: OrderUpsertIn,
    user: Annotated[TokenUser, Depends(current_user)],
    db: AsyncSession = Depends(get_db),
) -> dict:
    row = (
        await db.execute(
            select(Order).where(
                Order.organization_id == user.organization_id,
                Order.order_number == payload.order_number,
            )
        )
    ).scalar_one_or_none()
    if row is None:
        row = Order(organization_id=user.organization_id, order_number=payload.order_number)
        db.add(row)

    contact_id = payload.contact_id
    if contact_id is None and payload.email:
        contact = (
            await db.execute(
                select(Contact).where(
                    Contact.organization_id == user.organization_id,
                    Contact.email == payload.email,
                )
            )
        ).scalar_one_or_none()
        if contact:
            contact_id = contact.id

    if payload.cart_id:
        cart = (
            await db.execute(
                select(Cart).where(Cart.id == payload.cart_id, Cart.organization_id == user.organization_id)
            )
        ).scalar_one_or_none()
        if cart is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cart not found")
        if payload.status not in {"cancelled", "failed"}:
            cart.status = "converted"
            cart.converted_at = datetime.now(UTC)

    if payload.chat_id:
        chat = (
            await db.execute(select(Chat).where(Chat.id == payload.chat_id, Chat.organization_id == user.organization_id))
        ).scalar_one_or_none()
        if chat is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chat not found")

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
