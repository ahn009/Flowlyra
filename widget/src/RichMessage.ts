import type { Message, MessageMetadata } from "./types";

export function renderRichBody(message: Message): HTMLElement | null {
  const metadata = message.metadata ?? null;
  const type = message.content_type ?? "text";

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
    price.textContent = `${product.currency ?? "USD"} ${product.price.toFixed(2)}`;
    meta.append(price);
  }
  node.append(meta);
  return node;
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
