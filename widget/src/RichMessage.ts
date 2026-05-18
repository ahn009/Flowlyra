import type { Message, MessageMetadata } from "./types";

export function renderRichBody(message: Message): HTMLElement | null {
  const structured = parseStructuredPayload(message);
  const metadata = (structured?.metadata ?? message.metadata) ?? null;
  const type = message.content_type ?? structured?.type ?? "text";

  if (metadata?.card) {
    return renderCard(metadata.card);
  }
  if (metadata?.carousel) {
    return renderCarousel(metadata.carousel.items ?? []);
  }
  if (metadata?.image_url || type === "image") {
    return renderImage(metadata?.image_url ?? message.file_url ?? "", message.content ?? "");
  }
  if (metadata?.video_url || type === "video") {
    return renderVideo(metadata?.video_url ?? message.file_url ?? "");
  }
  if (metadata?.location) {
    return renderLocation(metadata.location);
  }
  if (metadata?.list) {
    return renderList(metadata.list);
  }
  if (metadata?.product) {
    return renderProduct(metadata.product);
  }
  if (structured?.type === "coupon" && structured.coupon) {
    return renderCoupon(structured.coupon);
  }
  if (structured?.type === "order_tracking" && structured.orderTracking) {
    return renderOrderTracking(structured.orderTracking);
  }
  if (message.file_url) {
    return renderAttachment(message);
  }
  return null;
}

export function renderQuickReplies(message: Message, onPick: (text: string) => void): HTMLElement | null {
  const replies = message.metadata?.quick_replies;
  if (!replies || !replies.length) return null;
  const wrap = document.createElement("div");
  wrap.className = "cf-qr-wrap";
  for (const reply of replies) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "cf-qr";
    button.textContent = reply.label;
    button.addEventListener("click", () => onPick(reply.payload ?? reply.label));
    wrap.append(button);
  }
  return wrap;
}

function renderCard(card: NonNullable<MessageMetadata["card"]>): HTMLElement {
  const node = document.createElement("div");
  node.className = "cf-card";
  if (card.image_url) {
    const img = document.createElement("img");
    img.src = card.image_url;
    img.alt = card.title ?? "";
    img.loading = "lazy";
    node.append(img);
  }
  if (card.title) {
    const title = document.createElement("div");
    title.className = "cf-card-title";
    title.textContent = card.title;
    node.append(title);
  }
  if (card.subtitle) {
    const subtitle = document.createElement("div");
    subtitle.className = "cf-card-subtitle";
    subtitle.textContent = card.subtitle;
    node.append(subtitle);
  }
  if (card.buttons?.length) {
    const row = document.createElement("div");
    row.className = "cf-card-buttons";
    for (const button of card.buttons) {
      if (button.url) {
        const anchor = document.createElement("a");
        anchor.href = button.url;
        anchor.target = "_blank";
        anchor.rel = "noreferrer";
        anchor.className = "cf-card-button";
        anchor.textContent = button.label;
        row.append(anchor);
      } else {
        const el = document.createElement("button");
        el.type = "button";
        el.className = "cf-card-button";
        el.textContent = button.label;
        el.dataset.payload = button.payload ?? button.label;
        row.append(el);
      }
    }
    node.append(row);
  }
  return node;
}

function renderCarousel(items: (NonNullable<MessageMetadata["card"]> | undefined)[]): HTMLElement {
  const node = document.createElement("div");
  node.className = "cf-carousel";
  for (const item of items) {
    if (!item) continue;
    const card = renderCard(item);
    card.classList.add("cf-carousel-card");
    node.append(card);
  }
  return node;
}

function renderImage(url: string, alt: string): HTMLElement {
  const node = document.createElement("a");
  node.href = url;
  node.target = "_blank";
  node.rel = "noreferrer";
  node.className = "cf-image";
  const img = document.createElement("img");
  img.src = url;
  img.alt = alt;
  img.loading = "lazy";
  node.append(img);
  return node;
}

function renderVideo(url: string): HTMLElement {
  const video = document.createElement("video");
  video.src = url;
  video.controls = true;
  video.preload = "metadata";
  video.className = "cf-video";
  return video;
}

function renderLocation(loc: NonNullable<MessageMetadata["location"]>): HTMLElement {
  const link = document.createElement("a");
  link.href = `https://maps.google.com/?q=${loc.lat},${loc.lng}`;
  link.target = "_blank";
  link.rel = "noreferrer";
  link.className = "cf-location";
  link.textContent = loc.label ? `📍 ${loc.label}` : `📍 ${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)}`;
  return link;
}

function renderList(list: NonNullable<MessageMetadata["list"]>): HTMLElement {
  const node = document.createElement("div");
  node.className = "cf-list";
  if (list.title) {
    const heading = document.createElement("div");
    heading.className = "cf-list-title";
    heading.textContent = list.title;
    node.append(heading);
  }
  const ul = document.createElement("ul");
  for (const item of list.items ?? []) {
    const li = document.createElement("li");
    const title = document.createElement("strong");
    title.textContent = item.title;
    li.append(title);
    if (item.subtitle) {
      const subtitle = document.createElement("div");
      subtitle.className = "cf-list-subtitle";
      subtitle.textContent = item.subtitle;
      li.append(subtitle);
    }
    if (item.payload) li.dataset.payload = item.payload;
    ul.append(li);
  }
  node.append(ul);
  return node;
}

function renderProduct(product: NonNullable<MessageMetadata["product"]>): HTMLElement {
  const node = document.createElement("a");
  node.className = "cf-product";
  if (product.product_url) {
    node.href = product.product_url;
    node.target = "_blank";
    node.rel = "noreferrer";
  } else {
    node.href = "#";
  }
  if (product.image_url) {
    const img = document.createElement("img");
    img.src = product.image_url;
    img.alt = product.name;
    img.loading = "lazy";
    node.append(img);
  }
  const meta = document.createElement("div");
  meta.className = "cf-product-meta";
  const name = document.createElement("div");
  name.className = "cf-product-name";
  name.textContent = product.name;
  meta.append(name);
  if (product.description) {
    const desc = document.createElement("div");
    desc.className = "cf-product-desc";
    desc.textContent = product.description;
    meta.append(desc);
  }
  if (typeof product.price === "number") {
    const price = document.createElement("div");
    price.className = "cf-product-price";
    price.textContent = formatMoney(product.price, product.currency ?? "USD");
    meta.append(price);
  }
  node.append(meta);
  return node;
}

function renderCoupon(payload: { code: string; discount_text?: string; expires_at?: string; message?: string }): HTMLElement {
  const node = document.createElement("div");
  node.className = "cf-card";
  const title = document.createElement("div");
  title.className = "cf-card-title";
  title.textContent = payload.discount_text || "Coupon unlocked";
  const code = document.createElement("div");
  code.className = "cf-card-subtitle";
  code.textContent = `Code: ${payload.code}`;
  const desc = document.createElement("div");
  desc.className = "cf-list-subtitle";
  desc.textContent = payload.message || "Apply this code at checkout.";
  node.append(title, code, desc);
  if (payload.expires_at) {
    const exp = document.createElement("div");
    exp.className = "cf-list-subtitle";
    exp.textContent = `Expires ${new Date(payload.expires_at).toLocaleString()}`;
    node.append(exp);
  }
  return node;
}

function renderOrderTracking(payload: { order_number: string; status: string; total?: number; currency?: string; placed_at?: string; fulfilled_at?: string; cancelled_at?: string }): HTMLElement {
  const node = document.createElement("div");
  node.className = "cf-list";
  const title = document.createElement("div");
  title.className = "cf-list-title";
  title.textContent = `Order #${payload.order_number}`;
  const ul = document.createElement("ul");
  const rows = [
    `Status: ${payload.status}`,
    payload.total != null ? `Total: ${formatMoney(payload.total, payload.currency || "USD")}` : null,
    payload.placed_at ? `Placed: ${new Date(payload.placed_at).toLocaleString()}` : null,
    payload.fulfilled_at ? `Fulfilled: ${new Date(payload.fulfilled_at).toLocaleString()}` : null,
    payload.cancelled_at ? `Cancelled: ${new Date(payload.cancelled_at).toLocaleString()}` : null,
  ].filter(Boolean) as string[];
  for (const row of rows) {
    const li = document.createElement("li");
    li.textContent = row;
    ul.append(li);
  }
  node.append(title, ul);
  return node;
}

function parseStructuredPayload(message: Message): { type?: string; metadata?: MessageMetadata; coupon?: { code: string; discount_text?: string; expires_at?: string; message?: string }; orderTracking?: { order_number: string; status: string; total?: number; currency?: string; placed_at?: string; fulfilled_at?: string; cancelled_at?: string } } | null {
  if (!message.content || typeof message.content !== "string") return null;
  try {
    const parsed = JSON.parse(message.content) as Record<string, unknown>;
    if (message.content_type === "product_card") {
      return {
        type: "product_card",
        metadata: {
          product: {
            name: String(parsed.name || ""),
            description: parsed.description ? String(parsed.description) : undefined,
            price: typeof parsed.price === "number" ? parsed.price : Number(parsed.price || 0),
            currency: parsed.currency ? String(parsed.currency) : "USD",
            image_url: parsed.image_url ? String(parsed.image_url) : undefined,
            product_url: parsed.product_url ? String(parsed.product_url) : undefined,
          },
        },
      };
    }
    if (message.content_type === "coupon") {
      return {
        type: "coupon",
        coupon: {
          code: String(parsed.code || ""),
          discount_text: parsed.discount_text ? String(parsed.discount_text) : undefined,
          expires_at: parsed.expires_at ? String(parsed.expires_at) : undefined,
          message: parsed.message ? String(parsed.message) : undefined,
        },
      };
    }
    if (message.content_type === "order_tracking") {
      return {
        type: "order_tracking",
        orderTracking: {
          order_number: String(parsed.order_number || ""),
          status: String(parsed.status || "unknown"),
          total: typeof parsed.total === "number" ? parsed.total : Number(parsed.total || 0),
          currency: parsed.currency ? String(parsed.currency) : "USD",
          placed_at: parsed.placed_at ? String(parsed.placed_at) : undefined,
          fulfilled_at: parsed.fulfilled_at ? String(parsed.fulfilled_at) : undefined,
          cancelled_at: parsed.cancelled_at ? String(parsed.cancelled_at) : undefined,
        },
      };
    }
  } catch {
    return null;
  }
  return null;
}

function formatMoney(value: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
}

function renderAttachment(message: Message): HTMLElement {
  const link = document.createElement("a");
  link.className = "cf-attachment";
  link.href = message.file_url ?? "#";
  link.target = "_blank";
  link.rel = "noreferrer";
  link.textContent = `📎 ${message.file_name ?? message.content ?? "Attachment"}`;
  return link;
}
