from __future__ import annotations

import base64
import hashlib
import hmac
from datetime import UTC, datetime
from typing import Any

import httpx
from sqlalchemy import select

from app.integrations.base import IntegrationProvider
from app.models.contact import Contact
from app.models.ecommerce import Order, OrderItem


class ShopifyProvider(IntegrationProvider):
    provider = "shopify"

    @property
    def shop_url(self) -> str:
        shop = str(self.config.get("shop") or self.config.get("shop_domain") or "").strip().replace("https://", "")
        return f"https://{shop}" if shop else ""

    @property
    def token(self) -> str | None:
        return self.oauth_token or self.config.get("access_token")

    async def test_connection(self) -> bool:
        if not self.shop_url or not self.token:
            return False
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(f"{self.shop_url}/admin/api/2024-01/shop.json", headers={"X-Shopify-Access-Token": self.token})
        return 200 <= resp.status_code < 300

    async def sync(self, org_id, db) -> dict[str, Any]:
        if not self.shop_url or not self.token:
            return {"orders": 0, "customers": 0, "skipped": "missing credentials"}
        headers = {"X-Shopify-Access-Token": self.token}
        async with httpx.AsyncClient(timeout=30) as client:
            orders_resp = await client.get(f"{self.shop_url}/admin/api/2024-01/orders.json", params={"status": "any", "limit": 50}, headers=headers)
            customers_resp = await client.get(f"{self.shop_url}/admin/api/2024-01/customers.json", params={"limit": 50}, headers=headers)
        orders_resp.raise_for_status(); customers_resp.raise_for_status()
        customer_count = 0
        for item in customers_resp.json().get("customers", []):
            await self._upsert_contact(db, org_id, item)
            customer_count += 1
        order_count = 0
        for item in orders_resp.json().get("orders", []):
            await self._upsert_order(db, org_id, item)
            order_count += 1
        await db.commit()
        return {"orders": order_count, "customers": customer_count}

    async def handle_webhook(self, payload: dict, headers: dict) -> dict[str, Any]:
        secret = self.config.get("webhook_secret")
        raw = self.config.get("_raw_body", "")
        if secret and raw:
            digest = hmac.new(str(secret).encode(), raw.encode(), hashlib.sha256).digest()
            expected = base64.b64encode(digest).decode()
            actual = headers.get("x-shopify-hmac-sha256") or headers.get("X-Shopify-Hmac-Sha256")
            if actual and not hmac.compare_digest(expected, actual):
                return {"ok": False, "error": "invalid_hmac"}
        return {"ok": True, "topic": headers.get("x-shopify-topic") or headers.get("X-Shopify-Topic")}

    async def _upsert_contact(self, db, org_id, item: dict) -> Contact | None:
        email = item.get("email")
        if not email:
            return None
        contact = (await db.execute(select(Contact).where(Contact.organization_id == org_id, Contact.email == email))).scalar_one_or_none()
        if contact is None:
            contact = Contact(organization_id=org_id, email=email)
            db.add(contact)
        contact.full_name = " ".join(v for v in [item.get("first_name"), item.get("last_name")] if v) or contact.full_name
        contact.phone = item.get("phone") or contact.phone
        contact.custom_attrs = {**(contact.custom_attrs or {}), "shopify_customer_id": str(item.get("id")), "shopify": item}
        return contact

    async def _upsert_order(self, db, org_id, item: dict) -> Order:
        order_number = str(item.get("order_number") or item.get("name") or item.get("id"))
        order = (await db.execute(select(Order).where(Order.organization_id == org_id, Order.order_number == order_number))).scalar_one_or_none()
        if order is None:
            order = Order(organization_id=org_id, order_number=order_number)
            db.add(order)
            await db.flush()
        order.external_order_id = str(item.get("id"))
        order.email = item.get("email")
        order.status = item.get("financial_status") or item.get("fulfillment_status") or "placed"
        order.currency = item.get("currency") or "USD"
        order.subtotal = float(item.get("subtotal_price") or 0)
        order.tax_total = float(item.get("total_tax") or 0)
        order.total = float(item.get("total_price") or 0)
        order.source = "shopify"
        order.placed_at = datetime.fromisoformat(item["created_at"].replace("Z", "+00:00")) if item.get("created_at") else datetime.now(UTC)
        order.meta = item
        for li in item.get("line_items", [])[:100]:
            db.add(OrderItem(order_id=order.id, sku=li.get("sku"), name=li.get("name") or "Item", quantity=int(li.get("quantity") or 1), unit_price=float(li.get("price") or 0), currency=order.currency, line_total=float(li.get("price") or 0) * int(li.get("quantity") or 1), meta=li))
        return order
