import { create } from "zustand";
import type { Chat, Message } from "../types";

interface ChatState {
  chats: Record<string, Chat>;
  activeChatId: string | null;
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
  setSuggestions: (chatId: string, suggestions: string[]) => void;
  setVisitorStatus: (chatId: string, status: "online" | "offline") => void;
}

export const useChatStore = create<ChatState>((set) => ({
  chats: {},
  activeChatId: null,
  messages: {},
  typingPreview: {},
  typingAgents: {},
  unreadCounts: {},
  aiSuggestions: {},
  addChat: (chat) => set((state) => ({ chats: { ...state.chats, [chat.id]: chat } })),
  addMessage: (message) =>
    set((state) => ({
      messages: hasMessage(state.messages[message.chat_id] ?? [], message.id)
        ? state.messages
        : { ...state.messages, [message.chat_id]: [...(state.messages[message.chat_id] ?? []), message] },
      chats:
        message.is_internal || !state.chats[message.chat_id]
          ? state.chats
          : {
              ...state.chats,
              [message.chat_id]: {
                ...state.chats[message.chat_id],
                last_message: { content: message.content, sender_type: message.sender_type, created_at: message.created_at },
                updated_at: message.created_at
              }
            },
      unreadCounts:
        hasMessage(state.messages[message.chat_id] ?? [], message.id) || state.activeChatId === message.chat_id
          ? state.unreadCounts
          : { ...state.unreadCounts, [message.chat_id]: (state.unreadCounts[message.chat_id] ?? 0) + 1 }
    })),
  setPreview: (chatId, text) => set((state) => ({ typingPreview: { ...state.typingPreview, [chatId]: text } })),
  setTyping: (chatId, typing) => set((state) => ({ typingAgents: { ...state.typingAgents, [chatId]: typing } })),
  setActiveChat: (chatId) => set({ activeChatId: chatId }),
  setSuggestions: (chatId, suggestions) => set((state) => ({ aiSuggestions: { ...state.aiSuggestions, [chatId]: suggestions } })),
  setVisitorStatus: (chatId, status) =>
    set((state) => ({
      chats: state.chats[chatId] ? { ...state.chats, [chatId]: { ...state.chats[chatId], visitor_status: status } } : state.chats
    }))
}));

function hasMessage(messages: Message[], id: string): boolean {
  return messages.some((message) => message.id === id);
}
