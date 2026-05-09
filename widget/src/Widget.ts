import { ChatPanel } from "./ChatPanel";
import { SocketClient } from "./SocketClient";
import { styles } from "./styles";
import type { Message, WidgetInitResponse, WidgetState } from "./types";
import { debounce, sessionToken, setSessionToken, trackRouteChanges } from "./utils";

export class Widget {
  private state: WidgetState = "HIDDEN";
  private initData: WidgetInitResponse | null = null;
  private socket: SocketClient | null = null;
  private socketHandlersBound = false;
  private bubble: HTMLButtonElement | null = null;
  private panel: ChatPanel | null = null;
  private chatId: string | null = null;
  private apiUrl: string;
  private styleElement: HTMLStyleElement | null = null;

  constructor() {
    const config = window.FlowLyraConfig;
    if (!config?.orgSlug) throw new Error("FlowLyraConfig.orgSlug is required");
    this.apiUrl = config.apiUrl ?? "http://localhost:8000";
    void this.boot(config.orgSlug);
  }

  async boot(orgSlug: string): Promise<void> {
    const response = await fetch(`${this.apiUrl}/api/v1/widget/init`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        org_slug: orgSlug,
        session_token: sessionToken(),
        url: location.href,
        referrer: document.referrer,
        user_agent: navigator.userAgent
      })
    });
    this.initData = await response.json() as WidgetInitResponse;
    setSessionToken(this.initData.session_token);
    this.chatId = this.initData.existing_chat_id;
    this.injectStyles();
    this.renderBubble();
    this.setState("BUBBLE");
    trackRouteChanges(() => this.socket?.sendMessage({ type: "url:update", url: location.href }));
  }

  private open(): void {
    if (!this.initData) return;
    if (this.panel) return;
    this.socket = this.socket ?? new SocketClient(this.apiUrl);
    this.socket.connect();
    this.bindSocketHandlers();
    this.panel = new ChatPanel(this.initData, {
      onClose: () => this.close(),
      onPreChat: (data) => this.startChat(data.name, data.email, data.subject, data.message),
      onMessage: (text) => this.send(text),
      onPreview: debounce((text: string) => {
        if (this.chatId) this.socket?.typingPreview(this.chatId, text);
      }, 200),
      onFile: (file) => this.send(`Uploaded file: ${file.name}`),
      onOffline: (data) => this.createOfflineTicket(data.email, data.message),
      onCsat: (score, comment) => {
        if (this.chatId && this.initData) this.socket?.csat(this.chatId, this.initData.organization_id, score, comment);
        this.close();
      }
    });
    document.body.append(this.panel.root);
    if (!this.initData.is_online) this.setState("OFFLINE");
    else if (this.chatId) {
      this.socket.joinChat(this.chatId);
      this.setState("CHATTING");
    }
    else this.setState("PRECHAT");
  }

  private close(): void {
    this.panel?.root.remove();
    this.panel = null;
    this.setState("BUBBLE");
  }

  destroy(): void {
    this.socket?.disconnect();
    this.socket = null;
    this.panel?.root.remove();
    this.panel = null;
    this.bubble?.remove();
    this.bubble = null;
    this.styleElement?.remove();
    this.styleElement = null;
    this.socketHandlersBound = false;
  }

  private bindSocketHandlers(): void {
    if (!this.socket || this.socketHandlersBound) return;
    this.socketHandlersBound = true;
    this.socket.on<{ chat: { id: string }; message: Message | null }>("chat:started", (payload) => {
      this.chatId = payload.chat.id;
      this.socket?.joinChat(payload.chat.id);
      this.setState("CHATTING");
      if (payload.message) this.panel?.addMessage(payload.message);
    });
    this.socket.on<Message>("chat:message:new", (message) => {
      if (message.chat_id === this.chatId) this.panel?.addMessage(message);
    });
    this.socket.on<{ chat_id: string; typing: boolean }>("chat:typing", (payload) => {
      if (payload.chat_id === this.chatId) this.panel?.typingIndicator(payload.typing);
    });
    this.socket.on<{ chat_id: string }>("chat:resolved", (payload) => {
      if (payload.chat_id === this.chatId) this.setState("CSAT");
    });
    this.socket.on<{ message: string }>("error", (payload) => {
      console.error("[FlowLyra] socket error:", payload.message);
    });
  }

  private startChat(name: string, email: string, subject: string, message: string): void {
    if (!this.initData) return;
    this.socket?.startChat({ organization_id: this.initData.organization_id, session_token: this.initData.session_token, name, email, subject, message });
  }

  private send(text: string): void {
    if (!this.initData || !this.chatId) return;
    // Show the message optimistically so the customer sees it immediately,
    // even if the server echo is delayed or fails.
    this.panel?.addMessage({
      id: `opt-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      chat_id: this.chatId,
      sender_type: "customer",
      content: text,
      content_type: "text",
      is_internal: false,
      created_at: new Date().toISOString(),
    });
    this.socket?.sendMessage({ organization_id: this.initData.organization_id, chat_id: this.chatId, content: text, sender_type: "customer" });
    this.socket?.typing(this.chatId, false);
  }

  private createOfflineTicket(email: string, message: string): void {
    void fetch(`${this.apiUrl}/api/v1/widget/init`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ org_slug: window.FlowLyraConfig?.orgSlug, email, url: location.href }) });
    console.info("FlowLyra offline message captured", message);
  }

  private setState(state: WidgetState): void {
    if (this.state === state) return;
    this.state = state;
    if (state === "PRECHAT") this.panel?.showPreChat();
    if (state === "OFFLINE") this.panel?.showOffline();
    if (state === "CHATTING" || state === "WAITING") this.panel?.showChat();
    if (state === "CSAT") this.panel?.showCsat();
  }

  private injectStyles(): void {
    this.styleElement?.remove();
    const style = document.createElement("style");
    style.textContent = styles(this.initData?.widget_config.color ?? "#1E40AF", this.initData?.widget_config.custom_css ?? "");
    document.head.append(style);
    this.styleElement = style;
  }

  private renderBubble(): void {
    this.bubble = document.createElement("button");
    this.bubble.className = "cf-bubble cf-root";
    this.bubble.type = "button";
    this.bubble.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"/></svg>`;
    this.bubble.addEventListener("click", () => this.open());
    document.body.append(this.bubble);
  }
}

function bootWidget(): void {
  window.FlowLyra?.destroy();
  window.FlowLyra = new Widget();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bootWidget, { once: true });
} else {
  bootWidget();
}

if (import.meta.hot) {
  import.meta.hot.dispose(() => window.FlowLyra?.destroy());
}
