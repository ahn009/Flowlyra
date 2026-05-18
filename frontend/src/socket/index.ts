import { io, Socket } from "socket.io-client";
import toast from "react-hot-toast";
import { useAgentStore } from "../stores/agentStore";
import { useAuthStore } from "../stores/authStore";
import { useChatStore } from "../stores/chatStore";
import { useNotificationStore } from "../stores/notificationStore";
import { playIncomingChatSound } from "../lib/notificationSound";
import type { Chat, Message } from "../types";

let socket: Socket | null = null;
let socketToken: string | null = null;
let onRealtimeUpdate: (() => void) | null = null;
const recentNotificationKeys = new Map<string, number>();

interface ServerNotificationPayload {
  id?: string;
  kind?: string;
  title: string;
  body: string;
  level?: "info" | "warning" | "urgent";
  priority?: "low" | "normal" | "high" | "urgent";
  link_url?: string;
  chat_id?: string;
}

export function setRealtimeUpdateHandler(handler: (() => void) | null): void {
  onRealtimeUpdate = handler;
}

export function connectSocket(): Socket | null {
  const token = useAuthStore.getState().accessToken;
  if (!token) return null;
  if (socket && socketToken === token) {
    if (!socket.connected) socket.connect();
    return socket;
  }
  socket?.removeAllListeners();
  socket?.disconnect();
  socketToken = token;
  socket = io(import.meta.env.VITE_SOCKET_URL ?? "http://localhost:8000", { path: "/socket.io", auth: { token }, transports: ["websocket"] });
  registerListeners(socket);
  return socket;
}

export function activeSocket(): Socket | null {
  return socket;
}

function registerListeners(instance: Socket): void {
  instance.on("connect", () => toast.success("Live chat connected", { duration: 1200 }));
  instance.on("connect_error", () => toast.error("Live chat connection failed"));
  instance.on("disconnect", () => toast("Live chat disconnected", { duration: 1600 }));
  instance.on("chat:message:new", (message: Message) => {
    const activeChatId = useChatStore.getState().activeChatId;
    useChatStore.getState().addMessage(message);
    if (message.sender_type === "customer" && !message.is_internal) {
      rememberNotification(`message:${message.id}`);
      rememberNotification(`chat:${message.chat_id}`);
      playIncomingChatSound();
      const chat = useChatStore.getState().chats[message.chat_id];
      useNotificationStore.getState().addNotification({
        kind: "chat.new_message",
        title: chat?.visitor_name || chat?.visitor_email || "New visitor message",
        body: message.content ?? "New message from widget",
        level: "info",
        linkUrl: `/inbox/chat/${message.chat_id}`,
      });
      if (activeChatId !== message.chat_id) toast("New message in inbox");
    }
    onRealtimeUpdate?.();
  });
  instance.on("chat:typing", (payload: { chat_id: string; typing: boolean }) => useChatStore.getState().setTyping(payload.chat_id, payload.typing));
  instance.on("chat:typing:preview", (payload: { chat_id: string; text: string }) => useChatStore.getState().setPreview(payload.chat_id, payload.text));
  instance.on("visitor:status:changed", (payload: { chat_id: string; visitor_status: "online" | "offline" }) => {
    useChatStore.getState().setVisitorStatus(payload.chat_id, payload.visitor_status);
    onRealtimeUpdate?.();
  });
  instance.on("visitor:page:view", () => onRealtimeUpdate?.());
  instance.on("campaign:sent", () => onRealtimeUpdate?.());
  instance.on("campaign:converted", () => onRealtimeUpdate?.());
  instance.on("analytics:update", () => onRealtimeUpdate?.());
  instance.on("chat:new", (payload: { chat: Chat; message?: Message | null }) => {
    useChatStore.getState().addChat(payload.message ? { ...payload.chat, last_message: { content: payload.message.content, sender_type: payload.message.sender_type, created_at: payload.message.created_at } } : payload.chat);
    if (payload.message) useChatStore.getState().addMessage(payload.message);
    rememberNotification(`chat:${payload.chat.id}`);
    if (payload.message) rememberNotification(`message:${payload.message.id}`);
    useNotificationStore.getState().addNotification({
      kind: "chat.new",
      title: "New chat",
      body: payload.message?.content ?? payload.chat.subject ?? "Waiting in queue",
      level: "info",
      linkUrl: `/inbox/chat/${payload.chat.id}`,
    });
    playIncomingChatSound();
    toast("New chat assigned");
    onRealtimeUpdate?.();
  });
  instance.on("chat:assigned", (payload: { chat_id: string }) => toast(`Chat assigned: ${payload.chat_id}`));
  instance.on("chat:resolved", (payload: { chat_id: string }) => {
    const chat = useChatStore.getState().chats[payload.chat_id];
    if (chat) useChatStore.getState().addChat({ ...chat, status: "resolved" });
    onRealtimeUpdate?.();
  });
  instance.on("agent:status:changed", (payload: { user_id: string; status: string }) => useAgentStore.getState().setPresence(payload.user_id, payload.status));
  instance.on("ai:suggestions", (payload: { chat_id: string; suggestions: string[] }) => useChatStore.getState().setSuggestions(payload.chat_id, payload.suggestions));
  instance.on("whisper:new", (payload: { from?: string; message: string }) => toast(`Whisper: ${payload.message}`));
  instance.on("notification", (payload: ServerNotificationPayload) => {
    const key = payload.chat_id ? `chat:${payload.chat_id}` : `${payload.title}:${payload.body}`;
    if (wasRecentlyNotified(key)) return;
    rememberNotification(key);
    useNotificationStore.getState().addNotification({
      id: payload.id,
      kind: payload.kind,
      title: payload.title,
      body: payload.body,
      level: payload.level ?? (payload.priority === "urgent" ? "urgent" : payload.priority === "high" ? "warning" : "info"),
      linkUrl: payload.link_url ?? (payload.chat_id ? `/inbox/chat/${payload.chat_id}` : null),
    });
    playIncomingChatSound();
  });
  instance.on("sla:breach", () => toast.error("SLA breach"));
}

function rememberNotification(key: string): void {
  const now = Date.now();
  recentNotificationKeys.set(key, now);
  for (const [storedKey, storedAt] of recentNotificationKeys) {
    if (now - storedAt > 4000) recentNotificationKeys.delete(storedKey);
  }
}

function wasRecentlyNotified(key: string): boolean {
  const storedAt = recentNotificationKeys.get(key);
  return storedAt !== undefined && Date.now() - storedAt < 4000;
}
