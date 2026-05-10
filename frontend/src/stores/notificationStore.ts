import { create } from "zustand";
import type { Notification } from "../types";

interface NotificationState {
  notifications: Notification[];
  unread: number;
  addNotification: (notification: Omit<Notification, "id" | "createdAt">) => void;
  markAllRead: () => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  unread: 0,
  addNotification: (notification) =>
    set((state) => ({
      notifications: [{ ...notification, id: crypto.randomUUID(), createdAt: new Date().toISOString() }, ...state.notifications].slice(0, 50),
      unread: state.unread + 1
    })),
  markAllRead: () => set({ unread: 0 }),
  removeNotification: (id) =>
    set((state) => ({
      notifications: state.notifications.filter((notification) => notification.id !== id)
    })),
  clearNotifications: () => set({ notifications: [], unread: 0 })
}));
