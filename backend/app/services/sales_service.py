from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Any
import math
import uuid

from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.analytics_event import AnalyticsEvent
from app.models.contact import Contact
from app.models.ecommerce import Cart, Order
from app.models.product import Product


def _clip(value: float, lower: float = 0, upper: float = 100) -> float:
    return max(lower, min(upper, value))


def _days_since(value: datetime | None) -> float:
    if value is None:
        return 365.0
    now = datetime.now(UTC)
    return max(0.0, (now - value).total_seconds() / 86400)


async def recommend_products(
    db: AsyncSession,
    *,
    organization_id: uuid.UUID,
    query: str,
    limit: int = 6,
) -> list[Product]:
    q = query.strip().lower()
    stmt = select(Product).where(Product.organization_id == organization_id, Product.is_active.is_(True), Product.is_in_stock.is_(True))
    rows = (await db.execute(stmt.limit(500))).scalars().all()
    if not q:
        return sorted(rows, key=lambda row: ((row.inventory or 0), row.updated_at or datetime.min), reverse=True)[:limit]

    tokens = {tok for tok in q.replace("/", " ").replace("-", " ").split() if tok}

    def score(row: Product) -> float:
        hay = " ".join(
            [
                (row.name or "").lower(),
                (row.description or "").lower(),
                (row.category or "").lower(),
                (row.brand or "").lower(),
                (row.sku or "").lower(),
            ]
        )
        base = 0.0
        if q in hay:
            base += 8
        overlap = sum(1 for tok in tokens if tok in hay)
        base += overlap * 2.2
        if row.meta and isinstance(row.meta, dict):
            tags = " ".join(str(x).lower() for x in (row.meta.get("tags") or []))
            base += sum(1 for tok in tokens if tok in tags) * 1.3
        base += min(2.5, (row.inventory or 0) / 40)
        if row.price is not None:
            price = float(row.price)
            if price > 0:
                base += 0.2 * (1 / (1 + math.log10(price + 1)))
        return base

    ranked = sorted(rows, key=score, reverse=True)
    return ranked[:limit]


async def chat_revenue_summary(db: AsyncSession, *, organization_id: uuid.UUID, chat_id: uuid.UUID) -> dict[str, float | int]:
    rows = (
        await db.execute(
            select(Order).where(
                Order.organization_id == organization_id,
                Order.chat_id == chat_id,
            )
        )
    ).scalars().all()
    revenue = 0.0
    refunds = 0.0
    for row in rows:
        amount = float(row.total or 0)
        if row.is_refunded:
            refunds += amount
        else:
            revenue += amount
    return {
        "orders": len(rows),
        "attributed_revenue": revenue,
        "refunded_revenue": refunds,
        "net_revenue": revenue - refunds,
    }


async def sales_dashboard(db: AsyncSession, *, organization_id: uuid.UUID, days: int = 30) -> dict[str, Any]:
    start = datetime.now(UTC) - timedelta(days=days)
    orders = (
        await db.execute(
            select(Order)
            .where(Order.organization_id == organization_id, Order.created_at >= start)
            .order_by(desc(Order.created_at))
        )
    ).scalars().all()
    carts = (
        await db.execute(
            select(Cart).where(Cart.organization_id == organization_id, Cart.created_at >= start)
        )
    ).scalars().all()

    gross = sum(float(o.total or 0) for o in orders if not o.is_refunded)
    refunded = sum(float(o.total or 0) for o in orders if o.is_refunded)
    net = gross - refunded
    aov = net / len(orders) if orders else 0.0
    converted_carts = sum(1 for c in carts if c.status == "converted")
    conversion_rate = (converted_carts / len(carts)) if carts else 0.0

    attributed = (
        await db.execute(
            select(AnalyticsEvent)
            .where(
                AnalyticsEvent.organization_id == organization_id,
                AnalyticsEvent.event_type == "sale.attributed",
                AnalyticsEvent.occurred_at >= start,
            )
            .order_by(desc(AnalyticsEvent.occurred_at))
            .limit(200)
        )
    ).scalars().all()

    by_chat: dict[str, float] = {}
    for row in attributed:
        meta = row.metadata_ or {}
        chat_id = str(meta.get("chat_id") or "")
        if not chat_id:
            continue
        by_chat[chat_id] = by_chat.get(chat_id, 0.0) + float(meta.get("value") or 0)

    return {
        "days": days,
        "orders": len(orders),
        "gross_revenue": gross,
        "refunded_revenue": refunded,
        "net_revenue": net,
        "average_order_value": aov,
        "carts": len(carts),
        "converted_carts": converted_carts,
        "cart_conversion_rate": conversion_rate,
        "top_chats": sorted(({"chat_id": chat_id, "revenue": value} for chat_id, value in by_chat.items()), key=lambda x: x["revenue"], reverse=True)[:10],
    }


async def contact_ltv(db: AsyncSession, *, organization_id: uuid.UUID, contact_id: uuid.UUID) -> dict[str, Any]:
    orders = (
        await db.execute(
            select(Order)
            .where(Order.organization_id == organization_id, Order.contact_id == contact_id)
            .order_by(desc(Order.placed_at), desc(Order.created_at))
        )
    ).scalars().all()
    total = sum(float(order.total or 0) for order in orders if not order.is_refunded)
    count = len(orders)
    last = orders[0].placed_at or orders[0].created_at if orders else None
    avg = total / count if count else 0
    return {
        "lifetime_value": total,
        "orders": count,
        "average_order_value": avg,
        "last_order": last.isoformat() if last else None,
    }


async def contact_scores(db: AsyncSession, *, organization_id: uuid.UUID, contact_id: uuid.UUID) -> dict[str, Any]:
    contact = (
        await db.execute(select(Contact).where(Contact.id == contact_id, Contact.organization_id == organization_id))
    ).scalar_one_or_none()
    if contact is None:
        return {"lead_score": 0.0, "churn_risk": 0.0, "reasons": []}

    orders = (
        await db.execute(
            select(Order)
            .where(Order.organization_id == organization_id, Order.contact_id == contact_id)
            .order_by(desc(Order.placed_at), desc(Order.created_at))
        )
    ).scalars().all()

    total_value = sum(float(order.total or 0) for order in orders if not order.is_refunded)
    order_count = len(orders)
    last_order_at = (orders[0].placed_at or orders[0].created_at) if orders else None
    days_since = _days_since(last_order_at)
    chats = int(contact.total_chats or 0)

    lead_score = 10.0
    lead_score += min(40.0, total_value / 50.0)
    lead_score += min(20.0, chats * 2.0)
    lead_score += min(15.0, order_count * 3.0)
    if order_count == 0 and chats >= 3:
        lead_score += 15.0
    if contact.is_vip:
        lead_score += 10.0

    churn_risk = 15.0
    churn_risk += min(35.0, days_since / 3.0)
    churn_risk += 20.0 if order_count <= 1 else 0.0
    churn_risk += 15.0 if chats >= 5 and order_count == 0 else 0.0
    if total_value > 250 and days_since < 30:
        churn_risk -= 15.0

    reasons: list[str] = []
    if order_count == 0:
        reasons.append("no_completed_orders")
    if days_since > 45:
        reasons.append("long_time_since_last_order")
    if chats >= 3:
        reasons.append("high_engagement")
    if total_value > 100:
        reasons.append("high_purchase_value")

    return {
        "lead_score": round(_clip(lead_score), 2),
        "churn_risk": round(_clip(churn_risk), 2),
        "reasons": reasons,
        "stats": {
            "order_count": order_count,
            "lifetime_value": total_value,
            "days_since_last_order": round(days_since, 2),
            "total_chats": chats,
        },
    }
