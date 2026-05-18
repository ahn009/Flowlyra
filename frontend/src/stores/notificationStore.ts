import { create } from "zustand";
import type { Notification } from "../types";

interface NotificationState {
  notifications: Notification[];
  unread: number;
  setNotifications: (notifications: Notification[], unread?: number) => void;
  addNotification: (notification: Omit<Notification, "id" | "createdAt"> & Partial<Pick<Notification, "id" | "createdAt">>) => void;
  markAllRead: () => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
}

function unreadCount(rows: Notification[]): number {
  return rows.filter((row) => !row.isRead).length;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  unread: 0,
  setNotifications: (notifications, unread) =>
    set({
      notifications,
      unread: typeof unread === "number" ? unread : unreadCount(notifications),
    }),
  addNotification: (notification) =>
    set((state) => {
      const next: Notification = {
        id: notification.id ?? crypto.randomUUID(),
        kind: notification.kind,
        title: notification.title,
        body: notification.body,
        linkUrl: notification.linkUrl ?? null,
        level: notification.level,
        createdAt: notification.createdAt ?? new Date().toISOString(),
        isRead: notification.isRead ?? false,
      };
      const merged = [next, ...state.notifications.filter((item) => item.id !== next.id)].slice(0, 100);
      return {
        notifications: merged,
        unread: unreadCount(merged),
      };
    }),
  markAllRead: () =>
    set((state) => ({
      notifications: state.notifications.map((notification) => ({ ...notification, isRead: true })),
      unread: 0,
    })),
  removeNotification: (id) =>
    set((state) => {
      const remaining = state.notifications.filter((notification) => notification.id !== id);
      return {
        notifications: remaining,
        unread: unreadCount(remaining),
      };
    }),
  clearNotifications: () => set({ notifications: [], unread: 0 }),
}));
