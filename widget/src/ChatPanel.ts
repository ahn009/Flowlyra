import { CSATForm } from "./CSATForm";
import { OfflineForm } from "./OfflineForm";
import { PreChatForm } from "./PreChatForm";
import type { Message, PreChatData, SuggestedArticle, WidgetInitResponse } from "./types";
import { createEmojiPicker } from "./emoji";
import { renderQuickReplies, renderRichBody } from "./RichMessage";
import type { I18n } from "./i18n";
import { isMuted, setMuted } from "./sound";

export interface ChatPanelHandlers {
  onClose: () => void;
  onPreChat: (data: PreChatData) => void;
  onMessage: (text: string) => void;
  onPreview: (text: string) => void;
  onFile: (file: File) => void;
  onOffline: (data: { email: string; name?: string; message: string }) => Promise<void> | void;
  onCsat: (score: number, comment: string) => void;
  onLocaleChange?: (locale: string) => void;
  onQuickReply?: (payload: string) => void;
  onRetryMessage?: (clientId: string) => void;
  onKbSearch?: (query: string) => Promise<SuggestedArticle[]>;
  onRtcStart?: (mode: "voice" | "video" | "screen") => void;
  onRtcEnd?: () => void;
  onCobrowseRequest?: () => void;
  onGifSearch?: (query: string) => Promise<Array<{ url: string; preview: string }>>;
  onGifPick?: (url: string) => void;
}

interface RenderedMessage {
  id: string;
  clientId?: string;
  el: HTMLElement;
  failed?: boolean;
}

export class ChatPanel {
  root = document.createElement("div");
  body = document.createElement("div");
  footer = document.createElement("div");
  input = document.createElement("textarea");
  fileInput = document.createElement("input");
  private renderedMessages = new Map<string, RenderedMessage>();
  private optimisticByContent = new Map<string, string>();
  private connectionBanner: HTMLElement | null = null;
  private subtitle: HTMLElement | null = null;
  private assignedAgent: { name?: string; avatar_url?: string } | null = null;
  private kbSuggestTimer: number | null = null;

  constructor(private init: WidgetInitResponse, private handlers: ChatPanelHandlers, private i18n: I18n) {
    this.root.className = `cf-panel cf-root cf-pos-${safeToken(init.widget_config.position)} cf-theme-${safeToken(init.widget_config.theme)}`;
    this.root.setAttribute("role", "dialog");
    this.root.setAttribute("aria-label", i18n.t("header.title"));

    const header = document.createElement("div");
    header.className = "cf-head";

    const brandRow = document.createElement("div");
    brandRow.className = "cf-brand-row";

    const avatarStack = document.createElement("div");
    avatarStack.className = "cf-avatar-stack";
    avatarStack.setAttribute("aria-hidden", "true");
    avatarStack.innerHTML = `<span class="cf-avatar cf-avatar-a">${(init.widget_config.brand_text ?? "FL").slice(0, 2).toUpperCase()}</span><span class="cf-avatar cf-avatar-b">A</span>`;
    brandRow.append(avatarStack);

    const titleBlock = document.createElement("div");
    const title = document.createElement("div");
    title.className = "cf-title";
    title.textContent = init.widget_config.brand_text || i18n.t("header.title");
    this.subtitle = document.createElement("div");
    this.subtitle.className = "cf-subtitle";
    this.updateSubtitle(init.is_online);
    titleBlock.append(title, this.subtitle);
    brandRow.append(titleBlock);

    header.append(brandRow);

    const actions = document.createElement("div");
    actions.className = "cf-head-actions";

    if ((init.widget_config.supported_locales ?? []).length > 1) {
      const select = document.createElement("select");
      select.setAttribute("aria-label", "Language");
      for (const code of init.widget_config.supported_locales ?? []) {
        const opt = document.createElement("option");
        opt.value = code;
        opt.textContent = code.toUpperCase();
        if (code === i18n.current()) opt.selected = true;
        select.append(opt);
      }
      select.addEventListener("change", () => handlers.onLocaleChange?.(select.value));
      const wrap = document.createElement("div");
      wrap.className = "cf-locale-switch";
      wrap.append(select);
      header.append(wrap);
    }

    if (init.widget_config.sound_enabled) {
      const soundBtn = document.createElement("button");
      soundBtn.type = "button";
      soundBtn.className = "cf-sound-toggle";
      soundBtn.title = i18n.t("sound.toggle");
      soundBtn.setAttribute("aria-label", i18n.t("sound.toggle"));
      soundBtn.textContent = isMuted() ? "🔇" : "🔔";
      soundBtn.addEventListener("click", () => {
        const muted = !isMuted();
        setMuted(muted);
        soundBtn.textContent = muted ? "🔇" : "🔔";
      });
      actions.append(soundBtn);
    }

    const close = document.createElement("button");
    close.type = "button";
    close.className = "cf-close";
    close.setAttribute("aria-label", "Close chat");
    close.textContent = "×";
    close.addEventListener("click", handlers.onClose);
    actions.append(close);
    header.append(actions);

    const welcome = document.createElement("div");
    welcome.className = "cf-welcome";
    const copy = document.createElement("div");
    copy.className = "cf-welcome-copy";
    copy.textContent = init.widget_config.greeting;
    const meta = document.createElement("div");
    meta.className = "cf-welcome-meta";
    meta.textContent = i18n.t("welcome.tagline");
    welcome.append(copy, meta);

    this.body.className = "cf-body";
    this.footer.className = "cf-foot";
    this.root.append(header, welcome, this.body, this.footer);

    this.buildReplyBox();

    if (!init.widget_config.white_label) {
      const footnote = document.createElement("div");
      footnote.className = "cf-footnote";
      const brandLink = init.widget_config.brand_url || "https://flowlyra.com";
      footnote.innerHTML = `${escapeHtml(i18n.t("branding.poweredBy"))} <a href="${escapeAttribute(brandLink)}" target="_blank" rel="noreferrer">${escapeHtml(init.widget_config.brand_text || "FlowLyra")}</a>`;
      this.root.append(footnote);
    }
  }

  setOnline(online: boolean): void {
    this.updateSubtitle(online);
  }

  setAssignedAgent(agent: { name?: string; avatar_url?: string } | null): void {
    this.assignedAgent = agent;
    this.updateSubtitle(this.init.is_online);
  }

  showConnectionBanner(message: string | null): void {
    if (!message) {
      this.connectionBanner?.remove();
      this.connectionBanner = null;
      return;
    }
    if (!this.connectionBanner) {
      this.connectionBanner = document.createElement("div");
      this.connectionBanner.className = "cf-connect-banner";
      this.body.prepend(this.connectionBanner);
    }
    this.connectionBanner.textContent = message;
  }

  setLocale(i18n: I18n): void {
    this.i18n = i18n;
    this.input.placeholder = i18n.t("input.placeholder");
    this.input.setAttribute("aria-label", i18n.t("input.placeholder"));
    const hint = this.footer.querySelector<HTMLElement>(".cf-foot-hint");
    if (hint) hint.textContent = i18n.t("input.hint");
  }

  showPreChat(): void {
    this.body.replaceChildren(this.buildKbSearch(), this.buildWelcomeOptions(), new PreChatForm(this.handlers.onPreChat, this.init.widget_config.pre_chat_form, this.i18n).element);
    this.footer.hidden = true;
  }

  showOffline(): void {
    this.body.replaceChildren(new OfflineForm(this.handlers.onOffline, this.i18n, this.init.next_open_at).element);
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
      const dot = document.createElement("span");
      dot.className = "cf-status-dot";
      node.append(dot, document.createTextNode(this.i18n.t("chat.assigned")));
      this.body.append(node);
    }
  }

  showCsat(): void {
    this.body.replaceChildren(new CSATForm(this.handlers.onCsat, this.i18n).element);
    this.footer.hidden = true;
  }

  addMessage(message: Message): void {
    if (message.is_internal) return;
    if (this.renderedMessages.has(message.id)) return;

    if (!message.id.startsWith("opt-") && message.sender_type === "customer" && message.content) {
      const optimisticKey = (this.optimisticByContent.get(message.content) ?? "");
      if (optimisticKey && this.renderedMessages.has(optimisticKey)) {
        const optimistic = this.renderedMessages.get(optimisticKey);
        if (optimistic) {
          // Update tick state on the existing optimistic bubble
          optimistic.el.dataset.messageId = message.id;
          this.markDelivered(optimistic.el);
        }
        this.optimisticByContent.delete(message.content);
        this.renderedMessages.delete(optimisticKey);
        this.renderedMessages.set(message.id, { id: message.id, el: optimistic?.el ?? document.createElement("div") });
        return;
      }
    }

    const node = this.buildMessageNode(message);
    this.body.append(node);
    this.body.scrollTop = this.body.scrollHeight;
    this.renderedMessages.set(message.id, { id: message.id, el: node });
    if (message.id.startsWith("opt-") && message.content) {
      this.optimisticByContent.set(message.content, message.id);
    }
  }

  markFailed(clientId: string): void {
    const record = this.renderedMessages.get(clientId);
    if (!record) return;
    record.failed = true;
    record.el.classList.add("cf-failed");
    record.el.setAttribute("title", this.i18n.t("retry.failed"));
    record.el.addEventListener("click", () => this.handlers.onRetryMessage?.(clientId), { once: true });
  }

  markDelivered(node: HTMLElement): void {
    node.classList.remove("cf-failed");
    const tick = node.querySelector<HTMLElement>(".cf-tick");
    if (tick) tick.textContent = "✓";
  }

  markCustomerMessagesSeen(): void {
    for (const item of this.renderedMessages.values()) {
      if (!item.el.classList.contains("cf-customer")) continue;
      const tick = item.el.querySelector<HTMLElement>(".cf-tick");
      if (tick) tick.textContent = "✓✓";
    }
  }

  typingIndicator(show: boolean, agentName?: string, avatarUrl?: string): void {
    this.body.querySelector(".cf-typing-wrap")?.remove();
    if (!show) return;
    const node = document.createElement("div");
    node.className = "cf-msg cf-agent cf-typing-wrap";
    const label = document.createElement("div");
    label.className = "cf-agent-name";
    if (avatarUrl) {
      const img = document.createElement("img");
      img.src = avatarUrl;
      img.alt = agentName ?? this.i18n.t("agent.default_name");
      label.append(img);
    }
    label.append(document.createTextNode(agentName ? `${agentName} ${this.i18n.t("typing.someone")}` : this.i18n.t("typing.someone")));
    const dots = document.createElement("div");
    dots.className = "cf-typing";
    dots.innerHTML = `<span class="cf-dot"></span><span class="cf-dot"></span><span class="cf-dot"></span>`;
    node.append(label, dots);
    this.body.append(node);
    this.body.scrollTop = this.body.scrollHeight;
  }

  private updateSubtitle(online: boolean): void {
    if (!this.subtitle) return;
    this.subtitle.innerHTML = "";
    const dot = document.createElement("span");
    dot.className = `cf-status-dot${online ? "" : " cf-off"}`;
    const statusText = online ? this.i18n.t("header.online") : this.i18n.t("header.offline");
    const suffix = this.assignedAgent?.name ? ` · ${this.assignedAgent.name}` : "";
    this.subtitle.append(dot, document.createTextNode(`${statusText}${suffix}`));
  }

  private buildMessageNode(message: Message): HTMLElement {
    const node = document.createElement("div");
    node.dataset.messageId = message.id;
    const senderClass = message.sender_type === "customer" ? "cf-customer" : message.sender_type === "bot" ? "cf-bot" : message.sender_type === "system" ? "cf-system" : "cf-agent";
    node.className = `cf-msg ${senderClass}`;
    if (message.sender_type === "agent" || message.sender_type === "bot") {
      const heading = document.createElement("div");
      heading.className = "cf-agent-name";
      const agentName = message.metadata?.agent?.name || this.i18n.t("agent.default_name");
      if (message.metadata?.agent?.avatar_url) {
        const img = document.createElement("img");
        img.src = message.metadata.agent.avatar_url;
        img.alt = agentName;
        heading.append(img);
      }
      heading.append(document.createTextNode(agentName));
      node.append(heading);
    }
    const rich = renderRichBody(message);
    if (rich) {
      node.append(rich);
      if (message.content && (message.metadata?.card || message.metadata?.list || message.metadata?.product || message.metadata?.carousel)) {
        const caption = document.createElement("div");
        caption.style.marginTop = "8px";
        caption.textContent = message.content;
        node.append(caption);
      }
    } else if (message.content) {
      node.append(document.createTextNode(message.content));
    }
    const quick = renderQuickReplies(message, (text) => this.handlers.onQuickReply?.(text) ?? this.handlers.onMessage(text));
    if (quick) node.append(quick);
    if (message.sender_type === "customer") {
      const metaRow = document.createElement("div");
      metaRow.className = "cf-meta";
      const tick = document.createElement("span");
      tick.className = "cf-tick";
      tick.textContent = message.id.startsWith("opt-") ? "…" : "✓";
      metaRow.append(tick);
      node.append(metaRow);
    }
    return node;
  }

  private buildReplyBox(): void {
    this.fileInput.type = "file";
    this.fileInput.hidden = true;
    const attach = document.createElement("button");
    attach.className = "cf-btn cf-icon";
    attach.type = "button";
    attach.setAttribute("aria-label", this.i18n.t("attachment.label"));
    attach.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21.4 11.6 12 21a6 6 0 0 1-8.5-8.5l9.8-9.8a4 4 0 1 1 5.7 5.7l-9.8 9.8a2 2 0 1 1-2.8-2.8l8.9-8.9" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`;

    const emoji = document.createElement("button");
    emoji.className = "cf-btn cf-icon";
    emoji.type = "button";
    emoji.setAttribute("aria-label", "Emoji");
    emoji.innerHTML = "😀";
    const gif = document.createElement("button");
    gif.className = "cf-btn cf-icon";
    gif.type = "button";
    gif.setAttribute("aria-label", "GIF");
    gif.textContent = "GIF";

    const send = document.createElement("button");
    send.className = "cf-btn";
    send.type = "button";
    send.innerHTML = `${escapeHtml(this.i18n.t("input.send"))}<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 14-7-7 14-2-5-5-2Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>`;

    this.input.className = "cf-input";
    this.input.placeholder = this.i18n.t("input.placeholder");
    this.input.rows = 1;
    this.input.setAttribute("aria-label", this.i18n.t("input.placeholder"));

    const hint = document.createElement("div");
    hint.className = "cf-foot-hint";
    hint.textContent = this.i18n.t("input.hint");

    const row = document.createElement("div");
    row.className = "cf-row";
    const voice = document.createElement("button");
    voice.className = "cf-btn cf-icon";
    voice.type = "button";
    voice.title = "Voice call";
    voice.setAttribute("aria-label", "Voice call");
    voice.textContent = "📞";
    voice.addEventListener("click", () => this.handlers.onRtcStart?.("voice"));
    const video = document.createElement("button");
    video.className = "cf-btn cf-icon";
    video.type = "button";
    video.title = "Video call";
    video.setAttribute("aria-label", "Video call");
    video.textContent = "🎥";
    video.addEventListener("click", () => this.handlers.onRtcStart?.("video"));
    const screen = document.createElement("button");
    screen.className = "cf-btn cf-icon";
    screen.type = "button";
    screen.title = "Share screen";
    screen.setAttribute("aria-label", "Share screen");
    screen.textContent = "🖥️";
    screen.addEventListener("click", () => this.handlers.onRtcStart?.("screen"));
    const cobrowse = document.createElement("button");
    cobrowse.className = "cf-btn cf-icon";
    cobrowse.type = "button";
    cobrowse.title = "Request co-browse";
    cobrowse.setAttribute("aria-label", "Request co-browse");
    cobrowse.textContent = "🤝";
    cobrowse.addEventListener("click", () => this.handlers.onCobrowseRequest?.());
    if (this.init.widget_config.allow_attachments !== false) row.append(attach);
    row.append(voice, video, screen, cobrowse, emoji, gif, this.input, send, this.fileInput);
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
      this.fileInput.value = "";
    });

    let picker: HTMLElement | null = null;
    let gifPicker: HTMLElement | null = null;
    emoji.addEventListener("click", () => {
      if (picker) {
        picker.remove();
        picker = null;
        return;
      }
      picker = createEmojiPicker((value) => {
        this.input.value += value;
        this.input.focus();
      });
      this.footer.append(picker);
    });

    gif.addEventListener("click", () => {
      if (!this.handlers.onGifSearch || !this.handlers.onGifPick) return;
      if (gifPicker) {
        gifPicker.remove();
        gifPicker = null;
        return;
      }
      const panel = document.createElement("div");
      panel.className = "cf-emoji-panel";
      const search = document.createElement("input");
      search.type = "search";
      search.className = "cf-kb-input";
      search.placeholder = "Search GIFs";
      const grid = document.createElement("div");
      grid.className = "cf-gif-grid";
      const render = async () => {
        const items = await this.handlers.onGifSearch?.(search.value || "support");
        grid.replaceChildren(
          ...((items ?? []).map((item) => {
            const btn = document.createElement("button");
            btn.type = "button";
            btn.className = "cf-gif-item";
            const img = document.createElement("img");
            img.src = item.preview;
            img.alt = "gif";
            btn.append(img);
            btn.addEventListener("click", () => {
              this.handlers.onGifPick?.(item.url);
              panel.remove();
              gifPicker = null;
            });
            return btn;
          })),
        );
      };
      search.addEventListener("input", () => void render());
      panel.append(search, grid);
      this.footer.append(panel);
      gifPicker = panel;
      void render();
    });
  }

  private buildWelcomeOptions(): HTMLElement {
    const node = document.createElement("div");
    node.className = "cf-options";
    const opts: { titleKey: string; subKey: string; fill: string }[] = [
      { titleKey: "menu.option.account", subKey: "menu.option.account.sub", fill: "I need help with my account" },
      { titleKey: "menu.option.product", subKey: "menu.option.product.sub", fill: "I have a product question" },
      { titleKey: "menu.option.sales", subKey: "menu.option.sales.sub", fill: "I want to talk to sales" },
    ];
    for (const opt of opts) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "cf-option";
      button.dataset.fill = opt.fill;
      const title = document.createElement("span");
      title.textContent = this.i18n.t(opt.titleKey as never, opt.titleKey);
      const sub = document.createElement("small");
      sub.textContent = this.i18n.t(opt.subKey as never, opt.subKey);
      button.append(title, sub);
      button.addEventListener("click", () => {
        const form = this.body.querySelector<HTMLFormElement>(".cf-form");
        const subject = form?.querySelector<HTMLInputElement>("[name='subject']");
        const message = form?.querySelector<HTMLTextAreaElement>("[name='message']");
        if (subject && !subject.value) subject.value = title.textContent ?? "";
        if (message && !message.value) message.value = button.dataset.fill ?? "";
        message?.focus();
      });
      node.append(button);
    }
    return node;
  }

  private buildKbSearch(): HTMLElement {
    const node = document.createElement("div");
    node.className = "cf-kb-box";
    const input = document.createElement("input");
    input.className = "cf-kb-input";
    input.type = "search";
    input.placeholder = this.i18n.t("kb.search");
    input.setAttribute("aria-label", this.i18n.t("kb.search"));
    const list = document.createElement("div");
    list.className = "cf-kb-list";
    const runSuggest = async () => {
      const q = input.value.trim();
      if (q.length < 2 || !this.handlers.onKbSearch) {
        list.replaceChildren();
        return;
      }
      const items = await this.handlers.onKbSearch(q);
      list.replaceChildren(
        ...items.map((item) => {
          const a = document.createElement("a");
          a.href = item.url;
          a.target = "_blank";
          a.rel = "noreferrer";
          a.className = "cf-kb-item";
          const title = document.createElement("div");
          title.style.fontWeight = "600";
          title.textContent = item.title;
          a.append(title);
          const preview = item.snippet ?? item.summary;
          if (preview) {
            const p = document.createElement("div");
            p.style.fontSize = "11px";
            p.style.color = "#475569";
            p.style.marginTop = "2px";
            p.textContent = preview;
            a.append(p);
          }
          return a;
        }),
      );
    };
    input.addEventListener("input", () => {
      if (this.kbSuggestTimer !== null) window.clearTimeout(this.kbSuggestTimer);
      this.kbSuggestTimer = window.setTimeout(() => void runSuggest(), 220);
    });
    node.append(input, list);
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
