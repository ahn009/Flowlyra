import { CSATForm } from "./CSATForm";
import { OfflineForm } from "./OfflineForm";
import { PreChatForm } from "./PreChatForm";
import type { Message, PreChatData, WidgetInitResponse } from "./types";

export class ChatPanel {
  root = document.createElement("div");
  body = document.createElement("div");
  footer = document.createElement("div");
  input = document.createElement("textarea");
  fileInput = document.createElement("input");
  private renderedMessageIds = new Set<string>();
  private optimisticContents = new Set<string>();

  constructor(private init: WidgetInitResponse, private handlers: {
    onClose: () => void;
    onPreChat: (data: PreChatData) => void;
    onMessage: (text: string) => void;
    onPreview: (text: string) => void;
    onFile: (file: File) => void;
    onOffline: (data: { email: string; message: string }) => void;
    onCsat: (score: number, comment: string) => void;
  }) {
    this.root.className = `cf-panel cf-root cf-pos-${safeToken(init.widget_config.position)} cf-theme-${safeToken(init.widget_config.theme)}`;
    this.root.innerHTML = `
      <div class="cf-head">
        <div class="cf-brand-row">
          <div class="cf-avatar-stack" aria-hidden="true">
            <span class="cf-avatar cf-avatar-a">CF</span>
            <span class="cf-avatar cf-avatar-b">A</span>
          </div>
          <div>
            <div class="cf-title">FlowLyra</div>
            <div class="cf-subtitle"><span class="cf-status-dot"></span>${init.is_online ? "Online now" : "Away for now"}</div>
          </div>
        </div>
        <button class="cf-close" type="button" aria-label="Close chat">×</button>
      </div>
      <div class="cf-welcome">
        <div class="cf-welcome-copy">${escapeHtml(init.widget_config.greeting)}</div>
        <div class="cf-welcome-meta">Real people answer here. Average reply: a few minutes.</div>
      </div>
    `;
    this.body.className = "cf-body";
    this.footer.className = "cf-foot";
    this.root.append(this.body, this.footer);
    this.root.querySelector<HTMLButtonElement>(".cf-close")?.addEventListener("click", handlers.onClose);
    this.buildReplyBox();
  }

  showPreChat(): void {
    this.body.replaceChildren(this.buildWelcomeOptions(), new PreChatForm(this.handlers.onPreChat, this.init.widget_config.pre_chat_form).element);
    this.footer.hidden = true;
  }

  showOffline(): void {
    this.body.replaceChildren(new OfflineForm(this.handlers.onOffline).element);
    this.footer.hidden = true;
  }

  showChat(): void {
    this.footer.hidden = false;
    if (this.body.querySelector(".cf-form") || this.body.querySelector(".cf-options")) {
      this.body.replaceChildren();
    }
    if (!this.body.querySelector(".cf-chat-start")) {
      const node = document.createElement("div");
      node.className = "cf-chat-start";
      node.innerHTML = `<span class="cf-status-dot"></span>You are chatting with the support team`;
      this.body.append(node);
    }
  }

  showCsat(): void {
    this.body.replaceChildren(new CSATForm(this.handlers.onCsat).element);
    this.footer.hidden = true;
  }

  addMessage(message: Message): void {
    if (message.is_internal) return;
    if (this.renderedMessageIds.has(message.id)) return;

    // Skip server echoes of messages already rendered optimistically.
    const isOptimistic = message.id.startsWith("opt-");
    if (isOptimistic) {
      this.optimisticContents.add(message.content ?? "");
    } else if (message.sender_type === "customer" && this.optimisticContents.has(message.content ?? "")) {
      // Server echo of an optimistic message - track the real id but
      // don't render a duplicate bubble.
      this.optimisticContents.delete(message.content ?? "");
      this.renderedMessageIds.add(message.id);
      return;
    }

    this.renderedMessageIds.add(message.id);
    const node = document.createElement("div");
    node.className = message.sender_type === "customer" ? "cf-msg cf-customer" : message.sender_type === "agent" ? "cf-msg cf-agent" : "cf-system";
    const content = message.file_url
      ? `<a class="cf-attachment" href="${escapeAttribute(message.file_url)}" target="_blank" rel="noreferrer">📎 ${escapeHtml(message.file_name ?? message.content ?? "Attachment")}</a>`
      : escapeHtml(message.content ?? "");
    node.innerHTML = message.sender_type === "agent" ? `<div class="cf-agent-name">Support agent</div>${content}` : content;
    this.body.append(node);
    this.body.scrollTop = this.body.scrollHeight;
  }

  typingIndicator(show: boolean): void {
    this.body.querySelector(".cf-typing-wrap")?.remove();
    if (!show) return;
    const node = document.createElement("div");
    node.className = "cf-msg cf-agent cf-typing-wrap";
    node.innerHTML = `<div class="cf-typing"><span class="cf-dot"></span><span class="cf-dot"></span><span class="cf-dot"></span></div>`;
    this.body.append(node);
  }

  private buildReplyBox(): void {
    this.fileInput.type = "file";
    this.fileInput.hidden = true;
    const attach = document.createElement("button");
    attach.className = "cf-btn cf-icon";
    attach.type = "button";
    attach.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21.4 11.6 12 21a6 6 0 0 1-8.5-8.5l9.8-9.8a4 4 0 1 1 5.7 5.7l-9.8 9.8a2 2 0 1 1-2.8-2.8l8.9-8.9" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`;
    attach.setAttribute("aria-label", "Attach file");
    const send = document.createElement("button");
    send.className = "cf-btn";
    send.type = "button";
    send.innerHTML = `Send <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 14-7-7 14-2-5-5-2Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>`;
    this.input.className = "cf-input";
    this.input.placeholder = "Write a message...";
    this.input.rows = 1;
    const hint = document.createElement("div");
    hint.className = "cf-foot-hint";
    hint.textContent = "Enter to send. Agents can see your live typing preview.";
    const row = document.createElement("div");
    row.className = "cf-row";
    row.append(attach, this.input, send, this.fileInput);
    this.footer.replaceChildren(row, hint);
    const submit = () => {
      const text = this.input.value.trim();
      if (!text) return;
      this.handlers.onMessage(text);
      this.input.value = "";
    };
    send.addEventListener("click", submit);
    this.input.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        submit();
      }
    });
    this.input.addEventListener("input", () => this.handlers.onPreview(this.input.value));
    attach.addEventListener("click", () => this.fileInput.click());
    this.fileInput.addEventListener("change", () => {
      const file = this.fileInput.files?.[0];
      if (file) this.handlers.onFile(file);
    });
  }

  private buildWelcomeOptions(): HTMLElement {
    const node = document.createElement("div");
    node.className = "cf-options";
    node.innerHTML = `
      <button type="button" class="cf-option" data-fill="I need help with my account">
        <span>Account support</span><small>Billing, access, profile</small>
      </button>
      <button type="button" class="cf-option" data-fill="I have a product question">
        <span>Product question</span><small>Plans, setup, features</small>
      </button>
      <button type="button" class="cf-option" data-fill="I want to talk to sales">
        <span>Talk to sales</span><small>Pricing and demos</small>
      </button>
    `;
    node.querySelectorAll<HTMLButtonElement>(".cf-option").forEach((button) => {
      button.addEventListener("click", () => {
        const form = this.body.querySelector<HTMLFormElement>(".cf-form");
        const subject = form?.querySelector<HTMLInputElement>("[name='subject']");
        const message = form?.querySelector<HTMLTextAreaElement>("[name='message']");
        if (subject && !subject.value) subject.value = button.querySelector("span")?.textContent ?? "";
        if (message && !message.value) message.value = button.dataset.fill ?? "";
        message?.focus();
      });
    });
    return node;
  }
}

function safeToken(value: string): string {
  return /^[a-z0-9-]+$/i.test(value) ? value : "auto";
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[char] ?? char);
}

function escapeAttribute(value: string): string {
  return escapeHtml(value).replace(/`/g, "&#096;");
}
