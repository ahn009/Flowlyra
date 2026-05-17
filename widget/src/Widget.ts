import { ChatPanel } from "./ChatPanel";
import { SocketClient } from "./SocketClient";
import { styles } from "./styles";
import type { FlowLyraInstance, Message, PreChatData, SuggestedArticle, VisitorPayload, WidgetHistoryResponse, WidgetInitResponse, WidgetState } from "./types";
import { I18n, detectLocale } from "./i18n";
import { play as playSound } from "./sound";
import { debounce, sessionToken, setSessionToken, trackRouteChanges } from "./utils";

export class Widget implements FlowLyraInstance {
  private state: WidgetState = "HIDDEN";
  private initData: WidgetInitResponse | null = null;
  private socket: SocketClient | null = null;
  private socketHandlersBound = false;
  private bubble: HTMLButtonElement | null = null;
  private panel: ChatPanel | null = null;
  private chatId: string | null = null;
  private apiUrl: string;
  private orgSlug: string;
  private styleElement: HTMLStyleElement | null = null;
  private unreadCount = 0;
  private isHidden = false;
  private customJsApplied = false;
  private i18n: I18n = new I18n({}, "en");
  private listeners = new Map<string, Set<(payload: unknown) => void>>();
  private readyResolvers: Array<() => void> = [];
  private readyState = false;
  private eyeCatcher: HTMLElement | null = null;
  private pendingOfflineSubmit = false;
  private rtcPeer: RTCPeerConnection | null = null;
  private rtcLocal: MediaStream | null = null;
  private rtcRemoteVideo: HTMLVideoElement | null = null;

  constructor(config: typeof window.FlowLyraConfig) {
    if (!config?.orgSlug) throw new Error("FlowLyraConfig.orgSlug is required");
    this.orgSlug = config.orgSlug;
    this.apiUrl = config.apiUrl ?? "http://localhost:8000";
    const lazy = config.lazy ?? false;
    if (lazy) {
      const start = () => {
        document.removeEventListener("mousemove", start);
        document.removeEventListener("touchstart", start);
        document.removeEventListener("keydown", start);
        clearTimeout(timer);
        void this.boot(config);
      };
      const timer = window.setTimeout(start, 4000);
      document.addEventListener("mousemove", start, { once: true });
      document.addEventListener("touchstart", start, { once: true });
      document.addEventListener("keydown", start, { once: true });
    } else {
      void this.boot(config);
    }
  }

  async boot(config: NonNullable<typeof window.FlowLyraConfig>): Promise<void> {
    const detectedLocale = config.locale ?? detectLocale(undefined) ?? "en";
    const visitor = config.visitor;
    const response = await fetch(`${this.apiUrl}/api/v1/widget/init`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        org_slug: this.orgSlug,
        widget_slug: config.widgetSlug,
        session_token: sessionToken(),
        url: location.href,
        referrer: document.referrer,
        user_agent: navigator.userAgent,
        locale: detectedLocale,
        visitor,
        page_title: document.title,
      }),
    });
    if (!response.ok) {
      console.warn("[FlowLyra] widget disabled:", await response.text());
      return;
    }
    this.initData = (await response.json()) as WidgetInitResponse;
    setSessionToken(this.initData.session_token);
    this.chatId = this.initData.existing_chat_id;
    const wantedLocale = config.locale ?? detectLocale(this.initData.widget_config.supported_locales) ?? this.initData.widget_config.locale ?? "en";
    if (wantedLocale && wantedLocale !== this.initData.widget_config.locale) {
      await this.applyLocale(wantedLocale, /*emit*/ false);
    } else {
      this.i18n = new I18n(this.initData.i18n, this.initData.widget_config.locale ?? "en");
    }
    this.injectStyles();
    this.renderBubble();
    this.setState("BUBBLE");
    this.applyEyeCatcher();
    this.applyChatButtonsScanner();
    this.applyCustomJs();
    await this.maybeConsumeMagicLink();
    trackRouteChanges(() => this.socket?.sendMessage({ type: "url:update", url: location.href }));
    this.markReady();
    if (config.autoOpen) this.open();
  }

  private markReady(): void {
    this.readyState = true;
    for (const resolve of this.readyResolvers.splice(0)) resolve();
    this.emit("ready", this.initData);
  }

  ready(): Promise<void> {
    if (this.readyState) return Promise.resolve();
    return new Promise((resolve) => this.readyResolvers.push(resolve));
  }

  isOpen(): boolean {
    return Boolean(this.panel);
  }

  getSessionToken(): string | null {
    return this.initData?.session_token ?? null;
  }

  on(event: string, handler: (payload: unknown) => void): void {
    const set = this.listeners.get(event) ?? new Set();
    set.add(handler);
    this.listeners.set(event, set);
  }

  off(event: string, handler: (payload: unknown) => void): void {
    this.listeners.get(event)?.delete(handler);
  }

  private emit(event: string, payload: unknown): void {
    for (const handler of this.listeners.get(event) ?? []) {
      try {
        handler(payload);
      } catch (err) {
        console.warn("[FlowLyra] listener error", event, err);
      }
    }
  }

  open(): void {
    if (!this.initData) return;
    if (this.isHidden) this.show();
    if (this.panel) return;
    this.dismissEyeCatcher();
    this.socket = this.socket ?? new SocketClient(this.apiUrl);
    this.socket.connect();
    this.bindSocketHandlers();
    this.panel = new ChatPanel(this.initData, {
      onClose: () => this.close(),
      onPreChat: (data) => this.startChat(data),
      onMessage: (text) => this.send(text),
      onPreview: debounce((text: string) => {
        if (this.chatId) this.socket?.typingPreview(this.chatId, text);
      }, 200),
      onFile: (file) => void this.uploadAndSendFile(file),
      onOffline: (data) => this.submitOfflineForm(data),
      onCsat: (score, comment) => {
        if (this.chatId && this.initData) this.socket?.csat(this.chatId, this.initData.organization_id, score, comment);
        this.close();
      },
      onLocaleChange: (locale) => void this.setLocale(locale),
      onQuickReply: (payload) => this.send(payload),
      onRetryMessage: (clientId) => this.retryMessage(clientId),
      onKbSearch: (query) => this.searchKb(query),
      onRtcStart: (mode) => void this.startRtcCall(mode),
      onRtcEnd: () => this.endRtcCall(),
      onCobrowseRequest: () => {
        if (this.chatId) this.socket?.cobrowseRequest(this.chatId, "screen");
      },
      onGifSearch: (query) => this.searchGifs(query),
      onGifPick: (url) => this.sendGif(url),
    }, this.i18n);
    document.body.append(this.panel.root);
    this.clearUnread();

    const within = this.initData.is_within_hours ?? true;
    const online = this.initData.is_online;
    if (!online && !within) this.setState("OFFLINE");
    else if (this.chatId) {
      this.socket.joinChat(this.chatId);
      this.setState("CHATTING");
      this.socket.markRead(this.chatId);
      void this.loadHistory();
    } else if (!online) this.setState("OFFLINE");
    else this.setState("PRECHAT");
    this.emit("open", null);
  }

  close(): void {
    this.panel?.root.remove();
    this.panel = null;
    this.setState("BUBBLE");
    this.emit("close", null);
  }

  show(): void {
    this.isHidden = false;
    if (this.bubble) this.bubble.style.display = "";
    this.emit("show", null);
  }

  hide(): void {
    this.isHidden = true;
    if (this.bubble) this.bubble.style.display = "none";
    this.panel?.root.remove();
    this.panel = null;
    this.emit("hide", null);
  }

  toggle(): void {
    if (this.panel) this.close();
    else this.open();
  }

  destroy(): void {
    this.endRtcCall();
    this.socket?.disconnect();
    this.socket = null;
    this.panel?.root.remove();
    this.panel = null;
    this.bubble?.remove();
    this.bubble = null;
    this.styleElement?.remove();
    this.styleElement = null;
    this.eyeCatcher?.remove();
    this.eyeCatcher = null;
    this.socketHandlersBound = false;
    this.listeners.clear();
  }

  async identify(visitor: VisitorPayload): Promise<void> {
    return this.setVisitor(visitor);
  }

  async setVisitor(visitor: VisitorPayload): Promise<void> {
    if (!this.initData) return;
    const response = await fetch(`${this.apiUrl}/api/v1/widget/identify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        org_slug: this.orgSlug,
        session_token: this.initData.session_token,
        name: visitor.name,
        email: visitor.email,
        phone: visitor.phone,
        custom_variables: visitor.custom_variables,
      }),
    });
    if (!response.ok) console.warn("[FlowLyra] identify failed", await response.text());
  }

  async set(key: string, value: string | number | boolean | null): Promise<void> {
    return this.setVisitor({ custom_variables: { [key]: value } });
  }

  async setLocale(locale: string): Promise<void> {
    await this.applyLocale(locale, true);
  }

  async trackEvent(name: string, properties: Record<string, unknown> = {}, value?: number): Promise<void> {
    if (!this.initData) return;
    await fetch(`${this.apiUrl}/api/v1/widget/track`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        org_slug: this.orgSlug,
        session_token: this.initData.session_token,
        event: name,
        value: typeof value === "number" ? value : null,
        properties,
      }),
    });
  }

  async trackGoal(name: string, value?: number): Promise<void> {
    return this.trackEvent(`goal:${name}`, {}, value);
  }

  private async applyLocale(locale: string, emit: boolean): Promise<void> {
    try {
      const response = await fetch(`${this.apiUrl}/api/v1/widget/locale`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ org_slug: this.orgSlug, locale }),
      });
      if (response.ok) {
        const data = (await response.json()) as { locale: string; catalog: Record<string, string> };
        this.i18n.setCatalog(data.catalog, data.locale);
        if (this.initData) this.initData.widget_config.locale = data.locale;
        this.panel?.setLocale(this.i18n);
        if (emit) this.emit("locale", data.locale);
      }
    } catch (err) {
      console.warn("[FlowLyra] locale fetch failed", err);
    }
  }

  private bindSocketHandlers(): void {
    if (!this.socket || this.socketHandlersBound) return;
    this.socketHandlersBound = true;
    this.socket.on<{ chat: { id: string }; message: Message | null }>("chat:started", (payload) => {
      this.chatId = payload.chat.id;
      this.socket?.joinChat(payload.chat.id);
      this.socket?.markRead(payload.chat.id);
      this.setState("CHATTING");
      if (payload.message) this.panel?.addMessage(payload.message);
      this.emit("chat:started", payload);
    });
    this.socket.on<Message>("chat:message:new", (message) => {
      if (message.chat_id !== this.chatId) return;
      if (this.panel) {
        this.panel.addMessage(message);
        if (message.sender_type !== "customer") this.socket?.markRead(message.chat_id);
        if (message.sender_type === "agent" || message.sender_type === "bot") playSound();
      } else if (message.sender_type === "agent" || message.sender_type === "bot") {
        this.incrementUnread();
        playSound();
      }
      this.emit("message", message);
    });
    this.socket.on("connect", () => {
      this.panel?.showConnectionBanner(this.i18n.t("connection.online"));
      if (this.chatId) {
        this.socket?.joinChat(this.chatId);
        this.socket?.markRead(this.chatId);
      }
      window.setTimeout(() => this.panel?.showConnectionBanner(null), 1600);
    });
    this.socket.on("disconnect", () => {
      this.panel?.showConnectionBanner(this.i18n.t("connection.offline"));
    });
    this.socket.on<{ chat_id: string }>("chat:read", (payload) => {
      if (payload.chat_id === this.chatId) this.panel?.markCustomerMessagesSeen();
    });
    this.socket.on<{ chat_id: string; typing: boolean; agent_name?: string; agent_avatar_url?: string }>("chat:typing", (payload) => {
      if (payload.chat_id === this.chatId) this.panel?.typingIndicator(payload.typing, payload.agent_name, payload.agent_avatar_url);
    });
    this.socket.on<{ chat_id: string }>("chat:resolved", (payload) => {
      if (payload.chat_id === this.chatId) {
        if (this.initData?.widget_config.post_chat_survey.enabled === false) this.close();
        else this.setState("CSAT");
      }
    });
    this.socket.on<{ chat_id: string; assigned: { id: string; name: string; avatar_url?: string } }>("chat:assigned", (payload) => {
      if (payload.chat_id === this.chatId) this.panel?.setAssignedAgent(payload.assigned);
      this.emit("chat:assigned", payload);
    });
    this.socket.on<{ chat_id: string; mode: "voice" | "video" | "screen"; from: "agent" | "visitor"; signal: Record<string, unknown> }>("webrtc:signal", (payload) => {
      if (payload.chat_id !== this.chatId) return;
      void this.handleWebrtcSignal(payload.mode, payload.from, payload.signal);
    });
    this.socket.on<{ chat_id: string; from: "agent" | "visitor"; mode?: "screen" | "video" | "voice" }>("cobrowse:request", (payload) => {
      if (payload.chat_id !== this.chatId || payload.from !== "agent") return;
      if (!window.confirm("Support requested screen sharing for co-browsing. Share your screen?")) return;
      void this.startRtcCall("screen");
    });
    this.socket.on<{ message: string }>("error", (payload) => {
      console.error("[FlowLyra] socket error:", payload.message);
    });
  }

  private async ensureRtcPeer(mode: "voice" | "video" | "screen"): Promise<RTCPeerConnection> {
    if (this.rtcPeer) return this.rtcPeer;
    const pc = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });
    pc.onicecandidate = (event) => {
      if (!event.candidate || !this.chatId) return;
      this.socket?.webrtcSignal(this.chatId, mode, { type: "candidate", candidate: event.candidate });
    };
    pc.ontrack = (event) => {
      const stream = event.streams[0];
      if (!this.rtcRemoteVideo) {
        this.rtcRemoteVideo = document.createElement("video");
        this.rtcRemoteVideo.autoplay = true;
        this.rtcRemoteVideo.playsInline = true;
        this.rtcRemoteVideo.className = "cf-rtc-remote";
        document.body.append(this.rtcRemoteVideo);
      }
      this.rtcRemoteVideo.srcObject = stream;
    };
    this.rtcPeer = pc;
    return pc;
  }

  private async getRtcStream(mode: "voice" | "video" | "screen"): Promise<MediaStream> {
    if (mode === "screen") return navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
    if (mode === "video") return navigator.mediaDevices.getUserMedia({ audio: true, video: true });
    return navigator.mediaDevices.getUserMedia({ audio: true, video: false });
  }

  private async startRtcCall(mode: "voice" | "video" | "screen"): Promise<void> {
    if (!this.chatId) return;
    const stream = await this.getRtcStream(mode);
    this.rtcLocal = stream;
    const pc = await this.ensureRtcPeer(mode);
    stream.getTracks().forEach((track) => pc.addTrack(track, stream));
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    this.socket?.webrtcSignal(this.chatId, mode, { type: "offer", sdp: offer.sdp });
  }

  private async handleWebrtcSignal(mode: "voice" | "video" | "screen", from: "agent" | "visitor", signal: Record<string, unknown>): Promise<void> {
    const type = String(signal.type ?? "");
    const pc = await this.ensureRtcPeer(mode);
    if (type === "offer") {
      const accept = window.confirm(`Incoming ${mode} request. Accept?`);
      if (!accept) return;
      if (!(mode === "screen" && from === "agent")) {
        const stream = await this.getRtcStream(mode);
        this.rtcLocal = stream;
        stream.getTracks().forEach((track) => pc.addTrack(track, stream));
      }
      await pc.setRemoteDescription({ type: "offer", sdp: String(signal.sdp ?? "") });
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      if (this.chatId) this.socket?.webrtcSignal(this.chatId, mode, { type: "answer", sdp: answer.sdp });
      return;
    }
    if (type === "answer") {
      await pc.setRemoteDescription({ type: "answer", sdp: String(signal.sdp ?? "") });
      return;
    }
    if (type === "candidate" && signal.candidate) {
      await pc.addIceCandidate(signal.candidate as RTCIceCandidateInit);
    }
  }

  private endRtcCall(): void {
    this.rtcLocal?.getTracks().forEach((track) => track.stop());
    this.rtcLocal = null;
    this.rtcPeer?.close();
    this.rtcPeer = null;
    this.rtcRemoteVideo?.remove();
    this.rtcRemoteVideo = null;
  }

  private startChat(data: PreChatData): void {
    if (!this.initData) return;
    this.socket?.startChat({ organization_id: this.initData.organization_id, session_token: this.initData.session_token, ...data });
  }

  private async loadHistory(): Promise<void> {
    if (!this.initData || !this.chatId) return;
    const response = await fetch(`${this.apiUrl}/api/v1/widget/history`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ org_slug: this.orgSlug, session_token: this.initData.session_token, chat_id: this.chatId }),
    });
    if (!response.ok) return;
    const history = (await response.json()) as WidgetHistoryResponse;
    history.messages.forEach((message) => this.panel?.addMessage(message));
    this.socket?.markRead(this.chatId);
  }

  private retryMessage(clientId: string): void {
    if (!this.initData || !this.chatId) return;
    const node = document.querySelector<HTMLElement>(`[data-message-id="${clientId}"]`);
    const text = node?.textContent?.trim();
    if (!text) return;
    this.socket?.sendMessage({ organization_id: this.initData.organization_id, chat_id: this.chatId, content: text, sender_type: "customer", client_id: clientId });
  }

  private send(text: string): void {
    if (!this.initData || !this.chatId) {
      // Optimistic: queue locally; chat:started will trigger join + flush. For now, just push to panel.
      return;
    }
    const optimisticId = `opt-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    this.panel?.addMessage({
      id: optimisticId,
      chat_id: this.chatId,
      sender_type: "customer",
      content: text,
      content_type: "text",
      is_internal: false,
      created_at: new Date().toISOString(),
    });
    this.socket?.sendMessage({ organization_id: this.initData.organization_id, chat_id: this.chatId, content: text, sender_type: "customer", client_id: optimisticId });
    this.socket?.typing(this.chatId, false);
    // Failure detection: if not acknowledged within 8s, mark failed.
    window.setTimeout(() => {
      const stillOptimistic = document.querySelector<HTMLElement>(`[data-message-id="${optimisticId}"]`);
      if (stillOptimistic && stillOptimistic.dataset.messageId === optimisticId) {
        this.panel?.markFailed(optimisticId);
      }
    }, 8000);
  }

  private async uploadAndSendFile(file: File): Promise<void> {
    if (!this.initData || !this.chatId) return;
    const maxMb = this.initData.widget_config.max_upload_mb ?? 10;
    if (file.size > maxMb * 1024 * 1024) {
      console.warn(`[FlowLyra] file too large (${(file.size / 1024 / 1024).toFixed(1)} MB > ${maxMb} MB)`);
      return;
    }
    const form = new FormData();
    form.append("file", file);
    form.append("org_slug", this.orgSlug);
    form.append("session_token", this.initData.session_token);
    form.append("chat_id", this.chatId);
    const response = await fetch(`${this.apiUrl}/api/v1/upload/widget`, { method: "POST", body: form });
    if (!response.ok) {
      console.error("[FlowLyra] file upload failed", await response.text());
      return;
    }
    const uploaded = (await response.json()) as { file_url: string; file_name: string; file_size: number; file_mime: string };
    this.socket?.sendMessage({
      organization_id: this.initData.organization_id,
      chat_id: this.chatId,
      content: uploaded.file_name,
      sender_type: "customer",
      content_type: uploaded.file_mime?.startsWith("image/") ? "image" : "file",
      ...uploaded,
    });
  }

  private async submitOfflineForm(data: { email: string; name?: string; message: string }): Promise<void> {
    if (this.pendingOfflineSubmit) return;
    this.pendingOfflineSubmit = true;
    try {
      const response = await fetch(`${this.apiUrl}/api/v1/widget/offline`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          org_slug: this.orgSlug,
          session_token: this.initData?.session_token,
          email: data.email,
          name: data.name,
          message: data.message,
          page_url: location.href,
        }),
      });
      if (!response.ok) throw new Error(await response.text());
      this.emit("offline:submitted", data);
    } finally {
      this.pendingOfflineSubmit = false;
    }
  }

  private async searchKb(query: string): Promise<SuggestedArticle[]> {
    try {
      const response = await fetch(`${this.apiUrl}/api/v1/widget/kb/suggest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ org_slug: this.orgSlug, query, limit: 5 }),
      });
      if (!response.ok) return [];
      const payload = (await response.json()) as { items?: SuggestedArticle[] };
      return payload.items ?? [];
    } catch {
      return [];
    }
  }

  private async searchGifs(query: string): Promise<Array<{ url: string; preview: string }>> {
    const apiKey = this.initData?.widget_config.giphy_api_key || "dc6zaTOxFJmzC";
    const q = encodeURIComponent(query.trim() || "support");
    try {
      const response = await fetch(`https://api.giphy.com/v1/gifs/search?api_key=${encodeURIComponent(apiKey)}&q=${q}&limit=8&rating=g`);
      if (!response.ok) return [];
      const payload = (await response.json()) as { data?: Array<{ images?: { original?: { url?: string }; fixed_width_small?: { url?: string } } }> };
      return (payload.data ?? [])
        .map((item) => ({
          url: item.images?.original?.url ?? "",
          preview: item.images?.fixed_width_small?.url ?? item.images?.original?.url ?? "",
        }))
        .filter((item) => item.url && item.preview);
    } catch {
      return [];
    }
  }

  private sendGif(url: string): void {
    if (!this.initData || !this.chatId) return;
    this.socket?.sendMessage({
      organization_id: this.initData.organization_id,
      chat_id: this.chatId,
      sender_type: "customer",
      content_type: "image",
      content: "GIF",
      file_url: url,
      file_name: "gif.gif",
      file_mime: "image/gif",
    });
  }

  private async maybeConsumeMagicLink(): Promise<void> {
    if (!this.initData) return;
    const params = new URLSearchParams(window.location.search);
    const token = params.get("continue");
    if (!token) return;
    try {
      const response = await fetch(`${this.apiUrl}/api/v1/widget/magic-link/consume`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ org_slug: this.orgSlug, token }),
      });
      if (!response.ok) return;
      const data = (await response.json()) as { session_token: string; chat_id: string | null };
      setSessionToken(data.session_token);
      this.initData.session_token = data.session_token;
      if (data.chat_id) {
        this.chatId = data.chat_id;
        this.open();
      }
    } catch (err) {
      console.warn("[FlowLyra] magic link consume failed", err);
    }
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
    style.textContent = styles(
      this.initData?.widget_config.color ?? "#1E40AF",
      this.initData?.widget_config.custom_css ?? "",
    );
    document.head.append(style);
    this.styleElement = style;
  }

  private renderBubble(): void {
    if (!this.initData) return;
    this.bubble = document.createElement("button");
    const position = safeToken(this.initData.widget_config.position);
    const theme = safeToken(this.initData.widget_config.theme);
    this.bubble.className = `cf-bubble cf-root cf-pos-${position} cf-theme-${theme}`;
    this.bubble.type = "button";
    this.bubble.setAttribute("aria-label", this.i18n.t("header.title"));
    this.bubble.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"/></svg><span class="cf-badge" hidden>0</span>`;
    this.bubble.addEventListener("click", () => this.toggle());
    document.body.append(this.bubble);
  }

  private applyEyeCatcher(): void {
    const config = this.initData?.widget_config.eye_catcher;
    if (!config?.enabled) return;
    const node = document.createElement("div");
    node.className = `cf-eyecatcher cf-pos-${safeToken(this.initData?.widget_config.position ?? "bottom-right")}`;
    node.setAttribute("role", "complementary");
    if (config.image_url) {
      const img = document.createElement("img");
      img.src = config.image_url;
      img.alt = "";
      node.append(img);
    }
    if (typeof (config as Record<string, unknown>).popup_html === "string" && (config as Record<string, unknown>).popup_html) {
      const html = document.createElement("div");
      html.className = "cf-eyecatcher-html";
      html.innerHTML = String((config as Record<string, unknown>).popup_html);
      node.append(html);
    }
    if (config.text) {
      const text = document.createElement("div");
      text.textContent = config.text;
      node.append(text);
    }
    const close = document.createElement("button");
    close.className = "cf-eyecatcher-close";
    close.type = "button";
    close.textContent = "×";
    close.setAttribute("aria-label", "Dismiss");
    close.addEventListener("click", (event) => {
      event.stopPropagation();
      this.dismissEyeCatcher();
    });
    node.addEventListener("click", () => this.open());
    node.append(close);
    document.body.append(node);
    this.eyeCatcher = node;
  }

  private dismissEyeCatcher(): void {
    this.eyeCatcher?.remove();
    this.eyeCatcher = null;
  }

  private applyChatButtonsScanner(): void {
    const scan = () => {
      const nodes = document.querySelectorAll<HTMLElement>('[data-flowlyra-chat],[data-flowlyra]');
      nodes.forEach((node) => {
        if (node.dataset.flowlyraBound === "1") return;
        node.dataset.flowlyraBound = "1";
        node.style.cursor = node.style.cursor || "pointer";
        node.addEventListener("click", (event) => {
          event.preventDefault();
          this.open();
        });
      });
    };
    scan();
    if (typeof MutationObserver !== "undefined") {
      new MutationObserver(scan).observe(document.documentElement, { childList: true, subtree: true });
    }
  }

  private applyCustomJs(): void {
    if (this.customJsApplied) return;
    const code = this.initData?.widget_config.custom_js;
    if (!code) return;
    try {
      const sandbox = new Function("FlowLyra", code);
      sandbox(window.FlowLyra);
      this.customJsApplied = true;
    } catch (err) {
      console.warn("[FlowLyra] custom JS failed:", err);
    }
  }

  private incrementUnread(): void {
    this.unreadCount += 1;
    this.updateBadge();
  }

  private clearUnread(): void {
    this.unreadCount = 0;
    this.updateBadge();
  }

  private updateBadge(): void {
    const badge = this.bubble?.querySelector<HTMLSpanElement>(".cf-badge");
    if (!badge) return;
    badge.hidden = this.unreadCount === 0;
    badge.textContent = String(Math.min(this.unreadCount, 99));
  }
}

function safeToken(value: string): string {
  return /^[a-z0-9-]+$/i.test(value) ? value : "auto";
}

function flushQueue(instance: FlowLyraInstance): void {
  const queue = window.FlowLyraQueue ?? [];
  window.FlowLyraQueue = [];
  for (const [method, args] of queue) {
    try {
      const fn = (instance as unknown as Record<string, (...args: unknown[]) => unknown>)[method as string];
      if (typeof fn === "function") fn.apply(instance, args);
    } catch (err) {
      console.warn("[FlowLyra] queued call failed", method, err);
    }
  }
}

function bootWidget(): void {
  const config = window.FlowLyraConfig;
  if (!config) return;
  window.FlowLyra?.destroy();
  const instance = new Widget(config);
  window.FlowLyra = instance;
  flushQueue(instance);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bootWidget, { once: true });
} else {
  bootWidget();
}

if (import.meta.hot) {
  import.meta.hot.dispose(() => window.FlowLyra?.destroy());
}
