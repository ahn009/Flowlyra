import { Bell, Bot, ChevronLeft, ClipboardList, Code2, Contact, Inbox, LayoutDashboard, LifeBuoy, LogOut, Menu, Search, Send, Settings, Tag, Ticket, UserPlus, Users } from "lucide-react";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import { connectSocket, setRealtimeUpdateHandler } from "../socket";
import { useAuthStore } from "../stores/authStore";
import { useNotificationStore } from "../stores/notificationStore";
import { Button, Pill, ThemeToggle } from "./ui";

const nav = [
  { section: "Conversations", items: [
    { to: "/inbox", label: "Inbox", icon: Inbox },
    { to: "/tickets", label: "Tickets", icon: Ticket },
    { to: "/contacts", label: "Contacts", icon: Contact }
  ] },
  { section: "Workspace", items: [
    { to: "/admin/analytics", label: "Reports", icon: LayoutDashboard },
    { to: "/admin/canned", label: "Canned", icon: ClipboardList },
    { to: "/admin/routing", label: "Routing", icon: Tag },
    { to: "/admin/triggers", label: "Triggers", icon: Bot }
  ] },
  { section: "Settings", items: [
    { to: "/admin/agents", label: "Agents", icon: Users },
    { to: "/admin/teams", label: "Teams", icon: UserPlus },
    { to: "/admin/widget", label: "Widget", icon: Settings },
    { to: "/admin/install", label: "Install", icon: Code2 }
  ] }
];

export function AgentLayout(): JSX.Element {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const unread = useNotificationStore((state) => state.unread);
  const notifications = useNotificationStore((state) => state.notifications);
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const sidebarWidth = collapsed ? "w-14 md:w-16" : "w-14 md:w-64";
  const contentOffset = collapsed ? "pl-14 md:pl-16" : "pl-14 md:pl-64";

  useEffect(() => {
    connectSocket();
    setRealtimeUpdateHandler(() => {
      void queryClient.invalidateQueries({ queryKey: ["chats"] });
    });
    return () => setRealtimeUpdateHandler(null);
  }, [queryClient, user?.id]);

  return (
    <div className="min-h-screen bg-surface text-ink">
      <Toaster position="top-right" />
      <aside className={`fixed inset-y-0 left-0 z-20 border-r border-border bg-white text-slate-800 shadow-soft dark:bg-slate-900 dark:text-slate-100 ${sidebarWidth}`}>
        <div className="flex h-16 items-center justify-center border-b border-border px-2 md:justify-between md:px-4">
          {!collapsed && <div className="hidden items-center gap-3 md:flex"><span className="grid h-9 w-9 place-items-center rounded-xl bg-primary font-black text-white">CF</span><span className="font-extrabold tracking-tight">ChatFlow</span></div>}
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
                      `flex h-10 items-center justify-center gap-3 rounded-lg px-0 text-sm font-semibold md:justify-start md:px-3 ${isActive ? "bg-primary text-white shadow-sm shadow-blue-900/20" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"}`
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
        {!collapsed && <div className="absolute inset-x-3 bottom-3 hidden rounded-xl border border-border bg-slate-50 p-3 dark:bg-slate-800 md:block">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-100"><LifeBuoy size={16} /> Human-first support</div>
          <div className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">AI suggestions stay private to agents.</div>
        </div>}
      </aside>
      <div className={contentOffset}>
        <header className="sticky top-0 z-10 flex h-16 min-w-0 items-center justify-between gap-3 border-b border-border bg-white/90 px-3 shadow-sm shadow-slate-200/40 backdrop-blur sm:px-5 dark:bg-slate-900/90 dark:shadow-slate-900/40">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <label className="hidden min-w-[220px] items-center gap-2 rounded-lg border border-border bg-slate-50 px-3 py-2 text-sm text-slate-500 md:flex lg:min-w-[320px] dark:bg-slate-800 dark:text-slate-400">
              <Search size={16} />
              <input className="w-full bg-transparent outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500 dark:text-slate-200" placeholder="Search chats, tickets, contacts" />
            </label>
            <select className="max-w-[112px] rounded-lg border border-border bg-white px-2 py-2 text-sm font-semibold sm:max-w-none sm:px-3 dark:bg-slate-800 dark:text-slate-200">
              <option>online</option>
              <option>busy</option>
              <option>away</option>
              <option>offline</option>
            </select>
          </div>
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <ThemeToggle />
            <div className="relative">
              <button className="rounded-lg border border-border p-2 hover:bg-slate-50 dark:hover:bg-slate-700" aria-label="Notifications">
                <Bell size={18} />
              </button>
              {unread > 0 && <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-danger px-1 text-xs text-white">{unread}</span>}
            </div>
            <div className="hidden text-right sm:block">
              <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">{user?.full_name ?? "Agent"}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">{user?.role ?? "agent"}</div>
            </div>
            <button
              className="rounded-lg border border-border p-2 hover:bg-slate-50 dark:hover:bg-slate-700"
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
    </div>
  );
}

export function PageHeader({ title, action }: { title: string; action?: ReactNode }): JSX.Element {
  return (
    <div className="flex min-h-[64px] flex-col gap-3 border-b border-border bg-white px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 dark:bg-slate-800">
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
