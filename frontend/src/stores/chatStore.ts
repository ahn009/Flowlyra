import { create } from "zustand";
import type { Chat, Message } from "../types";

interface ChatState {
  chats: Record<string, Chat>;
  activeChatId: string | null;
  openChatTabs: string[];
  messages: Record<string, Message[]>;
  typingPreview: Record<string, string>;
  typingAgents: Record<string, boolean>;
  unreadCounts: Record<string, number>;
  aiSuggestions: Record<string, string[]>;
  addChat: (chat: Chat) => void;
  addMessage: (message: Message) => void;
  setPreview: (chatId: string, text: string) => void;
  setTyping: (chatId: string, typing: boolean) => void;
  setActiveChat: (chatId: string | null) => void;
  closeChatTab: (chatId: string) => void;
  setSuggestions: (chatId: string, suggestions: string[]) => void;
  setVisitorStatus: (chatId: string, status: "online" | "offline") => void;
  clearUnread: (chatId: string) => void;
  updateMessage: (chatId: string, messageId: string, patch: Partial<Message>) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  chats: {},
  activeChatId: null,
  openChatTabs: [],
  messages: {},
  typingPreview: {},
  typingAgents: {},
  unreadCounts: {},
  aiSuggestions: {},
  addChat: (chat) => set((state) => ({ chats: { ...state.chats, [chat.id]: chat } })),
  addMessage: (message) =>
    set((state) => {
      const alreadyExists = hasMessage(state.messages[message.chat_id] ?? [], message.id);
      const nextMessages = alreadyExists
        ? state.messages
        : { ...state.messages, [message.chat_id]: [...(state.messages[message.chat_id] ?? []), message] };
      const nextChats =
        message.is_internal || !state.chats[message.chat_id]
          ? state.chats
          : {
              ...state.chats,
              [message.chat_id]: {
                ...state.chats[message.chat_id],
                last_message: { content: message.content, sender_type: message.sender_type, created_at: message.created_at },
                updated_at: message.created_at
              }
            };
      const shouldIncrementUnread =
        !alreadyExists &&
        !message.is_internal &&
        message.sender_type === "customer" &&
        state.activeChatId !== message.chat_id;
      const nextUnread = shouldIncrementUnread
        ? { ...state.unreadCounts, [message.chat_id]: (state.unreadCounts[message.chat_id] ?? 0) + 1 }
        : state.unreadCounts;
      return { messages: nextMessages, chats: nextChats, unreadCounts: nextUnread };
    }),
  setPreview: (chatId, text) => set((state) => ({ typingPreview: { ...state.typingPreview, [chatId]: text } })),
  setTyping: (chatId, typing) => set((state) => ({ typingAgents: { ...state.typingAgents, [chatId]: typing } })),
  setActiveChat: (chatId) =>
    set((state) => ({
      activeChatId: chatId,
      openChatTabs: chatId && !state.openChatTabs.includes(chatId) ? [...state.openChatTabs, chatId].slice(-8) : state.openChatTabs,
      unreadCounts: chatId ? { ...state.unreadCounts, [chatId]: 0 } : state.unreadCounts
    })),
  closeChatTab: (chatId) =>
    set((state) => {
      const openChatTabs = state.openChatTabs.filter((item) => item !== chatId);
      const activeChatId = state.activeChatId === chatId ? (openChatTabs.length ? openChatTabs[openChatTabs.length - 1] : null) : state.activeChatId;
      return { openChatTabs, activeChatId };
    }),
  setSuggestions: (chatId, suggestions) => set((state) => ({ aiSuggestions: { ...state.aiSuggestions, [chatId]: suggestions } })),
  setVisitorStatus: (chatId, status) =>
    set((state) => ({
      chats: state.chats[chatId] ? { ...state.chats, [chatId]: { ...state.chats[chatId], visitor_status: status } } : state.chats
    })),
  clearUnread: (chatId) =>
    set((state) => ({
      unreadCounts: { ...state.unreadCounts, [chatId]: 0 }
    })),
  updateMessage: (chatId, messageId, patch) =>
    set((state) => ({
      messages: {
        ...state.messages,
        [chatId]: (state.messages[chatId] ?? []).map((item) => (item.id === messageId ? { ...item, ...patch } : item))
      }
    }))
}));

function hasMessage(messages: Message[], id: string): boolean {
  return messages.some((message) => message.id === id);
}
