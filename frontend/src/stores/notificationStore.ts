import { create } from "zustand";
import type { Notification } from "../types";

interface NotificationState {
  notifications: Notification[];
  unread: number;
  addNotification: (notification: Omit<Notification, "id" | "createdAt">) => void;
  markAllRead: () => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  unread: 0,
  addNotification: (notification) =>
    set((state) => ({
      notifications: [{ ...notification, id: crypto.randomUUID(), createdAt: new Date().toISOString() }, ...state.notifications],
      unread: state.unread + 1
    })),
  markAllRead: () => set({ unread: 0 })
}));
