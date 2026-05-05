import { io, Socket } from "socket.io-client";
import toast from "react-hot-toast";
import { useAgentStore } from "../stores/agentStore";
import { useAuthStore } from "../stores/authStore";
import { useChatStore } from "../stores/chatStore";
import { useNotificationStore } from "../stores/notificationStore";
import type { Chat, Message } from "../types";

let socket: Socket | null = null;
let socketToken: string | null = null;
let onRealtimeUpdate: (() => void) | null = null;

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
    if (message.sender_type === "customer" && !message.is_internal && activeChatId !== message.chat_id) {
      const chat = useChatStore.getState().chats[message.chat_id];
      useNotificationStore.getState().addNotification({
        title: chat?.visitor_name || chat?.visitor_email || "New visitor message",
        body: message.content ?? "New message from widget",
        level: "info"
      });
      toast("New message in inbox");
    }
    onRealtimeUpdate?.();
  });
  instance.on("chat:typing", (payload: { chat_id: string; typing: boolean }) => useChatStore.getState().setTyping(payload.chat_id, payload.typing));
  instance.on("chat:typing:preview", (payload: { chat_id: string; text: string }) => useChatStore.getState().setPreview(payload.chat_id, payload.text));
  instance.on("visitor:status:changed", (payload: { chat_id: string; visitor_status: "online" | "offline" }) => {
    useChatStore.getState().setVisitorStatus(payload.chat_id, payload.visitor_status);
    onRealtimeUpdate?.();
  });
  instance.on("chat:new", (payload: { chat: Chat; message?: Message | null }) => {
    useChatStore.getState().addChat(payload.message ? { ...payload.chat, last_message: { content: payload.message.content, sender_type: payload.message.sender_type, created_at: payload.message.created_at } } : payload.chat);
    if (payload.message) useChatStore.getState().addMessage(payload.message);
    useNotificationStore.getState().addNotification({ title: "New chat", body: payload.message?.content ?? payload.chat.subject ?? "Waiting in queue", level: "info" });
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
  instance.on("notification", (payload: { title: string; body: string; level?: "info" | "warning" | "urgent" }) =>
    useNotificationStore.getState().addNotification({ title: payload.title, body: payload.body, level: payload.level ?? "info" })
  );
  instance.on("sla:breach", () => toast.error("SLA breach"));
}
