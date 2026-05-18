import { Bell, Bot, BrainCircuit, CheckCheck, ChevronLeft, ClipboardList, Code2, Contact, Inbox, LayoutDashboard, LifeBuoy, Lock, LogOut, Menu, Plug, Search, Send, Settings, Sparkles, Tag, Ticket, Trash2, UserPlus, Users, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import { connectSocket, setRealtimeUpdateHandler } from "../socket";
import { api } from "../lib/api";
import { useAuthStore } from "../stores/authStore";
import { useNotificationStore } from "../stores/notificationStore";
import { Button, Pill, ThemeToggle } from "./ui";
import flowlyraMark from "../assets/flowlyra-mark.svg";
import type { Notification } from "../types";
import { playIncomingChatSound, unlockNotificationSound } from "../lib/notificationSound";

const nav = [
  { section: "Conversations", items: [
    { to: "/inbox", label: "Inbox", icon: Inbox },
    { to: "/tickets", label: "Tickets", icon: Ticket },
    { to: "/contacts", label: "Contacts", icon: Contact }
  ] },
  { section: "Workspace", items: [
    { to: "/admin/analytics", label: "Reports", icon: LayoutDashboard },
    { to: "/engage/traffic", label: "Traffic", icon: Search },
    { to: "/engage/campaigns", label: "Campaigns", icon: Send },
    { to: "/engage/goals", label: "Goals", icon: CheckCheck },
    { to: "/admin/canned", label: "Canned", icon: ClipboardList },
    { to: "/admin/kb", label: "Knowledge", icon: LifeBuoy },
    { to: "/settings/tags", label: "Tags", icon: Tag },
    { to: "/admin/routing", label: "Routing", icon: Tag },
    { to: "/admin/triggers", label: "Triggers", icon: Bot },
    { to: "/admin/chatbot", label: "Chatbot", icon: Sparkles },
    { to: "/admin/ai-knowledge", label: "AI Knowledge", icon: BrainCircuit },
    { to: "/admin/channels", label: "Channels", icon: Plug }
  ] },
  { section: "Settings", items: [
    { to: "/admin/agents", label: "Agents", icon: Users },
    { to: "/admin/teams", label: "Teams", icon: UserPlus },
    { to: "/admin/widget", label: "Widget", icon: Settings },
    { to: "/admin/install", label: "Install", icon: Code2 },
    { to: "/settings/api", label: "API Keys", icon: Lock },
    { to: "/settings/webhooks", label: "Webhooks", icon: Plug },
    { to: "/settings/integrations", label: "Integrations", icon: Plug }
  ] }
];

export function AgentLayout(): JSX.Element {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const unread = useNotificationStore((state) => state.unread);
  const notifications = useNotificationStore((state) => state.notifications);
  const markAllRead = useNotificationStore((state) => state.markAllRead);
  const clearNotifications = useNotificationStore((state) => state.clearNotifications);
  const removeNotification = useNotificationStore((state) => state.removeNotification);
  const [collapsed, setCollapsed] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [commandQuery, setCommandQuery] = useState("");
  const [commandResults, setCommandResults] = useState<Array<{ type: "chat" | "ticket" | "contact" | "nav"; id: string; label: string; href: string }>>([]);
  const notificationPanelRef = useRef<HTMLDivElement | null>(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const sidebarWidth = collapsed ? "w-14 md:w-16" : "w-14 md:w-64";
  const contentOffset = collapsed ? "pl-14 md:pl-16" : "pl-14 md:pl-64";

  useEffect(() => {
    connectSocket();
    setRealtimeUpdateHandler(() => {
      void queryClient.invalidateQueries({ queryKey: ["chats"] });
      void queryClient.invalidateQueries({ queryKey: ["tickets"] });
      void queryClient.invalidateQueries({ queryKey: ["analytics"] });
      void queryClient.invalidateQueries({ queryKey: ["contacts"] });
    });
    return () => setRealtimeUpdateHandler(null);
  }, [queryClient, user?.id]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent): void {
      if (!notificationPanelRef.current?.contains(event.target as Node)) setNotificationsOpen(false);
    }
    function handleEscape(event: KeyboardEvent): void {
      if (event.key === "Escape") setNotificationsOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen((value) => !value);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!commandOpen) return;
    const query = commandQuery.trim();
    if (!query) {
      setCommandResults([
        { type: "nav", id: "inbox", label: "Go to Inbox", href: "/inbox" },
        { type: "nav", id: "tickets", label: "Go to Tickets", href: "/tickets" },
        { type: "nav", id: "contacts", label: "Go to Contacts", href: "/contacts" },
        { type: "nav", id: "tags", label: "Manage Tags", href: "/settings/tags" },
      ]);
      return;
    }
    const timer = window.setTimeout(() => {
      void Promise.all([
        api.get("/chats", { params: { q: query, limit: 8 } }),
        api.get("/tickets", { params: { q: query, limit: 8 } }),
        api.get("/contacts", { params: { q: query } }),
      ]).then(([chatsRes, ticketsRes, contactsRes]) => {
        const chatRows = (chatsRes.data as Array<{ id: string; visitor_name?: string | null; visitor_email?: string | null; subject?: string | null }>).slice(0, 4).map((row) => ({
          type: "chat" as const,
          id: row.id,
          label: `Chat: ${row.visitor_name || row.visitor_email || row.subject || row.id.slice(0, 6)}`,
          href: `/inbox/chat/${row.id}`,
        }));
        const ticketRows = (ticketsRes.data as Array<{ id: string; ticket_number: number; subject: string }>).slice(0, 4).map((row) => ({
          type: "ticket" as const,
          id: row.id,
          label: `Ticket #${row.ticket_number}: ${row.subject}`,
          href: `/ticket/${row.id}`,
        }));
        const contactRows = (contactsRes.data as Array<{ id: string; email?: string | null; full_name?: string | null }>).slice(0, 4).map((row) => ({
          type: "contact" as const,
          id: row.id,
          label: `Contact: ${row.full_name || row.email || row.id.slice(0, 6)}`,
          href: "/contacts",
        }));
        setCommandResults([...chatRows, ...ticketRows, ...contactRows]);
      }).catch(() => {
        setCommandResults([]);
      });
    }, 180);
    return () => window.clearTimeout(timer);
  }, [commandOpen, commandQuery]);

  return (
    <div className="min-h-screen bg-surface text-ink">
      <Toaster position="top-right" />
      <aside className={`fixed inset-y-0 left-0 z-20 border-r border-border bg-white/95 text-slate-800 shadow-[0_1px_2px_rgba(16,24,40,0.04)] backdrop-blur dark:bg-slate-950/95 dark:text-slate-100 ${sidebarWidth}`}>
        <div className="flex h-16 items-center justify-center border-b border-border px-2 md:justify-between md:px-4">
          {!collapsed && <div className="hidden items-center gap-3 md:flex"><img src={flowlyraMark} alt="FlowLyra logo" className="h-9 w-9 rounded-xl" /><span className="font-extrabold tracking-tight">FlowLyra</span></div>}
          <button aria-label="Toggle navigation" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white" onClick={() => setCollapsed((value) => !value)}>
            {collapsed ? <Menu size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>
        <nav className="grid gap-4 p-2 md:p-3">
          {nav.map((group) => (
            <div key={group.section} className="grid gap-1">
              {!collapsed && <div className="hidden px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 md:block">{group.section}</div>}
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      `flex h-10 items-center justify-center gap-3 rounded-xl px-0 text-sm font-bold md:justify-start md:px-3 ${isActive ? "bg-slate-950 text-white shadow-sm dark:bg-white dark:text-slate-950" : "text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"}`
                    }
                  >
                    <Icon size={18} className="shrink-0" />
                    {!collapsed && <span className="hidden md:inline">{item.label}</span>}
                  </NavLink>
                );
              })}
            </div>
          ))}
        </nav>
        {!collapsed && <div className="absolute inset-x-3 bottom-3 hidden rounded-2xl border border-border bg-slate-50 p-3 dark:bg-slate-900 md:block">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-100"><LifeBuoy size={16} /> Human-first support</div>
          <div className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">AI suggestions stay private to agents.</div>
        </div>}
      </aside>
      <div className={contentOffset}>
        <header className="sticky top-0 z-10 flex h-16 min-w-0 items-center justify-between gap-3 border-b border-border bg-white/85 px-3 shadow-sm backdrop-blur-xl sm:px-5 dark:bg-slate-950/85">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <label className="hidden min-w-[220px] items-center gap-2 rounded-xl border border-border bg-slate-50 px-3 py-2 text-sm text-slate-500 md:flex lg:min-w-[320px] dark:bg-slate-900 dark:text-slate-400">
              <Search size={16} />
              <input
                className="w-full bg-transparent outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500 dark:text-slate-200"
                placeholder="Search chats, tickets, contacts (Cmd/Ctrl+K)"
                value={commandQuery}
                onFocus={() => setCommandOpen(true)}
                onChange={(event) => setCommandQuery(event.target.value)}
              />
            </label>
            <select className="max-w-[112px] rounded-xl border border-border bg-white px-2 py-2 text-sm font-semibold sm:max-w-none sm:px-3 dark:bg-slate-900 dark:text-slate-200">
              <option>online</option>
              <option>busy</option>
              <option>away</option>
              <option>offline</option>
            </select>
          </div>
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <ThemeToggle />
            <div ref={notificationPanelRef} className="relative">
              <button
                className="relative rounded-xl border border-border bg-white p-2 text-slate-700 shadow-sm hover:bg-slate-50 focus-ring dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
                aria-label="Notifications"
                aria-expanded={notificationsOpen}
                onClick={() => {
                  setNotificationsOpen((value) => !value);
                  markAllRead();
                }}
              >
                <Bell size={18} />
              </button>
              {unread > 0 && <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-danger px-1 text-xs text-white">{unread}</span>}
              {notificationsOpen && (
                <NotificationCenter
                  notifications={notifications}
                  onClose={() => setNotificationsOpen(false)}
                  onClear={clearNotifications}
                  onRemove={removeNotification}
                />
              )}
            </div>
            <div className="hidden text-right sm:block">
              <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">{user?.full_name ?? "Agent"}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">{user?.role ?? "agent"}</div>
            </div>
            <button
              className="rounded-xl border border-border bg-white p-2 text-slate-700 shadow-sm hover:bg-slate-50 focus-ring dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
              onClick={() => {
                void logout().then(() => navigate("/login"));
              }}
              aria-label="Logout"
            >
              <LogOut size={18} />
            </button>
          </div>
        </header>
        <main className="min-h-[calc(100dvh-64px)] min-w-0">
          <Outlet />
        </main>
      </div>
      <div className="sr-only" aria-live="polite">
        {notifications[0]?.title}
      </div>
      {commandOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-start bg-black/35 p-4 pt-24" onClick={() => setCommandOpen(false)}>
          <div className="w-full max-w-2xl rounded-2xl border border-border bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="border-b border-border px-4 py-3 text-xs font-black uppercase tracking-wide text-slate-500">Command Palette</div>
            <div className="max-h-[420px] overflow-y-auto p-2">
              {commandResults.length ? commandResults.map((row) => (
                <button
                  key={`${row.type}:${row.id}`}
                  className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left hover:bg-slate-50"
                  onClick={() => {
                    setCommandOpen(false);
                    setCommandQuery("");
                    navigate(row.href);
                  }}
                >
                  <span className="text-sm font-semibold text-slate-800">{row.label}</span>
                  <span className="text-xs uppercase text-slate-400">{row.type}</span>
                </button>
              )) : <div className="p-3 text-sm text-slate-500">No results</div>}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function NotificationCenter({ notifications, onClose, onClear, onRemove }: { notifications: Notification[]; onClose: () => void; onClear: () => void; onRemove: (id: string) => void }): JSX.Element {
  return (
    <div className="absolute right-0 top-12 z-50 w-[min(92vw,420px)] overflow-hidden rounded-3xl border border-border bg-white shadow-2xl shadow-slate-950/15 ring-1 ring-slate-950/5 dark:border-slate-700 dark:bg-slate-950 dark:shadow-black/40 dark:ring-white/10">
      <div className="flex items-start justify-between gap-3 border-b border-border bg-gradient-to-br from-blue-50 via-white to-slate-50 px-4 py-4 dark:from-slate-900 dark:via-slate-950 dark:to-blue-950/30">
        <div>
          <div className="flex items-center gap-2 text-base font-black text-slate-950 dark:text-white"><Bell size={17} className="text-blue-600 dark:text-blue-300" /> Notifications</div>
          <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">New chats, visitor messages, assignments, and system alerts.</p>
        </div>
        <div className="flex items-center gap-1">
          <button
            className="rounded-xl border border-blue-100 bg-white px-3 py-2 text-xs font-black text-blue-700 shadow-sm hover:bg-blue-50 dark:border-blue-900/50 dark:bg-blue-950/40 dark:text-blue-200 dark:hover:bg-blue-900/40"
            onClick={() => {
              void unlockNotificationSound().then(() => playIncomingChatSound());
            }}
          >
            Test sound
          </button>
          <button aria-label="Close notifications" className="rounded-xl p-2 text-slate-500 hover:bg-white hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white" onClick={onClose}><X size={17} /></button>
        </div>
      </div>
      <div className="flex items-center justify-between border-b border-border px-4 py-2">
        <span className="text-xs font-black uppercase tracking-wide text-slate-500 dark:text-slate-400">{notifications.length} recent</span>
        <div className="flex items-center gap-2">
          <button className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold text-blue-700 hover:bg-blue-50 dark:text-blue-300 dark:hover:bg-blue-950/40" onClick={onClose}><CheckCheck size={14} /> Read</button>
          <button className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold text-red-700 hover:bg-red-50 disabled:opacity-40 dark:text-red-300 dark:hover:bg-red-950/40" onClick={onClear} disabled={!notifications.length}><Trash2 size={14} /> Clear</button>
        </div>
      </div>
      <div className="max-h-[420px] overflow-y-auto p-2">
        {notifications.length ? notifications.map((notification) => (
          <NotificationRow key={notification.id} notification={notification} onRemove={() => onRemove(notification.id)} />
        )) : <div className="grid min-h-48 place-items-center px-6 py-8 text-center"><div><div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"><Bell size={20} /></div><div className="font-black text-slate-900 dark:text-white">No notifications yet</div><p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">When a visitor messages the admin, it will appear here with the sound alert.</p></div></div>}
      </div>
    </div>
  );
}

function NotificationRow({ notification, onRemove }: { notification: Notification; onRemove: () => void }): JSX.Element {
  const tone = notification.level === "urgent" ? "bg-red-500" : notification.level === "warning" ? "bg-yellow-500" : "bg-blue-500";
  return (
    <div className="group flex gap-3 rounded-2xl px-3 py-3 hover:bg-slate-50 dark:hover:bg-slate-900">
      <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${tone}`} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-black text-slate-900 dark:text-white">{notification.title}</div>
        <p className="mt-1 line-clamp-2 text-sm leading-5 text-slate-500 dark:text-slate-400">{notification.body}</p>
        <div className="mt-2 text-[11px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">{formatNotificationTime(notification.createdAt)}</div>
      </div>
      <button aria-label="Remove notification" className="h-8 w-8 rounded-lg text-slate-400 opacity-100 hover:bg-white hover:text-red-600 sm:opacity-0 sm:group-hover:opacity-100 dark:hover:bg-slate-800 dark:hover:text-red-300" onClick={onRemove}><X size={15} className="mx-auto" /></button>
    </div>
  );
}

function formatNotificationTime(value: string): string {
  const diffMs = Date.now() - new Date(value).getTime();
  const diffMinutes = Math.max(0, Math.floor(diffMs / 60000));
  if (diffMinutes < 1) return "just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

export function PageHeader({ title, action }: { title: string; action?: ReactNode }): JSX.Element {
  return (
    <div className="flex min-h-[64px] flex-col gap-3 border-b border-border bg-white/80 px-4 py-4 backdrop-blur sm:flex-row sm:items-center sm:justify-between sm:px-6 dark:bg-slate-950/80">
      <div className="min-w-0">
        <h1 className="truncate text-xl font-black tracking-tight text-ink">{title}</h1>
      </div>
      {action && <div className="flex shrink-0 items-center gap-2 overflow-x-auto">{action}</div>}
    </div>
  );
}

export function Badge({ children, tone }: { children: ReactNode; tone: string }): JSX.Element {
  return <Pill className={tone}>{children}</Pill>;
}

export function SendButton({ onClick }: { onClick: () => void }): JSX.Element {
  return (
    <Button onClick={onClick} variant="primary">
      <Send size={16} /> Send
    </Button>
  );
}
