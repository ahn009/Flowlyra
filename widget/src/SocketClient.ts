import { io, Socket } from "socket.io-client";
import type { Message, StartChatPayload } from "./types";

type Handler<T> = (payload: T) => void;

export class SocketClient {
  private socket: Socket | null = null;
  private handlers = new Map<string, Set<Handler<unknown>>>();

  constructor(private apiUrl: string) {}

  connect(): void {
    if (this.socket) return;
    this.socket = io(this.apiUrl, { path: "/socket.io", transports: ["websocket"] });
    this.socket.onAny((event, payload) => this.emitLocal(event, payload));
  }

  on<T>(event: string, handler: Handler<T>): void {
    const handlers = this.handlers.get(event) ?? new Set<Handler<unknown>>();
    handlers.add(handler as Handler<unknown>);
    this.handlers.set(event, handlers);
  }

  startChat(payload: StartChatPayload): void {
    this.socket?.emit("chat:start", payload);
  }

  joinChat(chatId: string): void {
    this.socket?.emit("widget:join:chat", { chat_id: chatId });
  }

  sendMessage(payload: Record<string, unknown>): void {
    this.socket?.emit("chat:message", payload);
  }

  updateUrl(chatId: string, url: string, title?: string): void {
    this.socket?.emit("visitor:url:update", { chat_id: chatId, url, title });
  }

  typingPreview(chatId: string, text: string): void {
    this.socket?.emit("chat:typing:preview", { chat_id: chatId, text });
  }

  typing(chatId: string, started: boolean): void {
    this.socket?.emit(started ? "chat:typing:start" : "chat:typing:stop", { chat_id: chatId, sender_type: "customer" });
  }

  csat(chatId: string, organizationId: string, score: number, comment: string): void {
    this.socket?.emit("chat:csat", { chat_id: chatId, organization_id: organizationId, score, comment });
  }

  markRead(chatId: string): void {
    this.socket?.emit("chat:mark_read", { chat_id: chatId });
  }

  webrtcSignal(chatId: string, mode: "voice" | "video" | "screen", signal: Record<string, unknown>): void {
    this.socket?.emit("webrtc:signal", { chat_id: chatId, mode, signal });
  }

  cobrowseRequest(chatId: string, mode: "screen" | "video" | "voice" = "screen"): void {
    this.socket?.emit("cobrowse:request", { chat_id: chatId, mode });
  }

  disconnect(): void {
    this.socket?.removeAllListeners();
    this.socket?.disconnect();
    this.socket = null;
    this.handlers.clear();
  }

  private emitLocal(event: string, payload: unknown): void {
    for (const handler of this.handlers.get(event) ?? []) handler(payload);
  }
}

export type MessageHandler = Handler<Message>;
