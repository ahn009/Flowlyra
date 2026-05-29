import { Bell, Bot, BrainCircuit, CheckCheck, ChevronLeft, ClipboardList, Code2, Compass, Contact, CreditCard, FileText, Home, Inbox, LayoutDashboard, LifeBuoy, Lock, LogOut, Menu, Plug, Search, Send, Settings, Shield, Sparkles, Tag, Ticket, Trash2, UserPlus, Users, WandSparkles, X, Zap } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import { connectSocket, setRealtimeUpdateHandler } from "../socket";
import { api } from "../lib/api";
import { useAuthStore } from "../stores/authStore";
import { useNotificationStore } from "../stores/notificationStore";
import { Button, Pill, ThemeToggle } from "./ui";
import flowlyraMark from "../assets/flowlyra-mark.svg";
import type { Notification } from "../types";
import { playIncomingChatSound, unlockNotificationSound } from "../lib/notificationSound";
import { useI18n } from "../i18n/I18nProvider";
import { ProductTour } from "./ProductTour";
import { FEATURE_LINKS, searchFeatures } from "../lib/featureCatalog";

const nav = [
  { section: "Start here", items: [
    { to: "/home", label: "Home", icon: Home },
    { to: "/settings", label: "Feature Hub", icon: Compass },
    { to: "/inbox", label: "Live Chat Inbox", icon: Inbox },
    { to: "/tickets", label: "HelpDesk Tickets", icon: Ticket },
    { to: "/contacts", label: "Customers", icon: Contact }
  ] },
  { section: "Automation & AI", items: [
    { to: "/admin/canned", label: "Canned Responses", icon: ClipboardList },
    { to: "/settings/tags", label: "Chat Tags", icon: Tag },
    { to: "/admin/routing", label: "Routing & Assignment", icon: Zap },
    { to: "/admin/triggers", label: "Proactive Triggers", icon: Bot },
    { to: "/admin/chatbot", label: "Chatbot Builder", icon: Sparkles },
    { to: "/admin/ai-knowledge", label: "AI Copilot & Knowledge", icon: BrainCircuit }
  ] },
  { section: "Growth & reports", items: [
    { to: "/admin/analytics", label: "Reports Dashboard", icon: LayoutDashboard },
    { to: "/engage/traffic", label: "Website Traffic", icon: Search },
    { to: "/engage/campaigns", label: "Targeted Campaigns", icon: Send },
    { to: "/engage/goals", label: "Goals & Sales Tracker", icon: CheckCheck }
  ] },
  { section: "Widget & channels", items: [
    { to: "/admin/widget", label: "Widget Builder", icon: Settings },
    { to: "/admin/install", label: "Install Widget", icon: Code2 },
    { to: "/admin/channels", label: "Messaging Channels", icon: Plug },
    { to: "/settings/integrations", label: "Integrations", icon: Plug }
  ] },
  { section: "Admin", items: [
    { to: "/admin/agents", label: "Agents", icon: Users },
    { to: "/admin/teams", label: "Teams / Departments", icon: UserPlus },
    { to: "/settings/security", label: "Security", icon: Shield },
    { to: "/settings/api", label: "API Keys", icon: Lock },
    { to: "/settings/webhooks", label: "Webhooks", icon: Plug },
    { to: "/admin/billing", label: "Billing & Plans", icon: CreditCard },
    { to: "/settings/notifications", label: "Notifications", icon: Bell },
    { to: "/settings/audit", label: "Audit Log", icon: FileText }
  ] }
];

interface NotificationListResponse {
  items: Array<{
    id: string;
    kind?: string;
    title: string;
    body: string | null;
    link_url: string | null;
    priority: string;
    is_read: boolean;
    created_at: string | null;
  }>;
  unread: number;
}

export function AgentLayout(): JSX.Element {
  const { locale, setLocale, supportedLocales, t } = useI18n();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const unread = useNotificationStore((state) => state.unread);
  const notifications = useNotificationStore((state) => state.notifications);
  const setNotifications = useNotificationStore((state) => state.setNotifications);
  const markAllRead = useNotificationStore((state) => state.markAllRead);
  const clearNotifications = useNotificationStore((state) => state.clearNotifications);
  const removeNotification = useNotificationStore((state) => state.removeNotification);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [commandQuery, setCommandQuery] = useState("");
  const [commandResults, setCommandResults] = useState<Array<{ type: "chat" | "ticket" | "contact" | "nav" | "feature"; id: string; label: string; href: string; description?: string }>>([]);
  const [helpOpen, setHelpOpen] = useState(false);
  const [tourOpen, setTourOpen] = useState(false);
  const notificationPanelRef = useRef<HTMLDivElement | null>(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const sidebarWidth = collapsed ? "md:w-[68px]" : "md:w-[260px]";
  const contentOffset = collapsed ? "pl-0 md:pl-[68px]" : "pl-0 md:pl-[260px]";
  const orgQuery = useQuery({
    queryKey: ["org", "layout"],
    queryFn: async () => (await api.get("/admin/org")).data as {
      slug: string;
      dashboard_logo_url?: string | null;
      dashboard_primary_color?: string | null;
      help_widget_enabled?: boolean;
    },
    staleTime: 60000,
  });
  const dashboardLogo = orgQuery.data?.dashboard_logo_url || flowlyraMark;
  const dashboardColor = orgQuery.data?.dashboard_primary_color || "#0f172a";
  const helpWidgetEnabled = orgQuery.data?.help_widget_enabled !== false;
  const helpChatUrl = orgQuery.data?.slug ? `/chat/${orgQuery.data.slug}` : "/help";
  const notificationsQuery = useQuery({
    queryKey: ["notifications", "center"],
    queryFn: async () => (await api.get<NotificationListResponse>("/notifications", { params: { limit: 50 } })).data,
    staleTime: 15000,
    refetchInterval: 15000,
  });
  const markReadMutation = useMutation({
    mutationFn: async () => api.post("/notifications/read", { ids: null }),
  });
  const removeNotificationMutation = useMutation({
    mutationFn: async (id: string) => api.delete(`/notifications/${id}`),
  });
  const clearNotificationsMutation = useMutation({
    mutationFn: async () => api.delete("/notifications"),
  });

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
    const data = notificationsQuery.data;
    if (!data) return;
    setNotifications(
      data.items.map((item) => ({
        id: item.id,
        kind: item.kind,
        title: item.title,
        body: item.body ?? "",
        linkUrl: item.link_url,
        level: item.priority === "urgent" ? "urgent" : item.priority === "high" ? "warning" : "info",
        createdAt: item.created_at ?? new Date().toISOString(),
        isRead: item.is_read,
      })),
      data.unread,
    );
  }, [notificationsQuery.data, setNotifications]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent): void {
      if (!notificationPanelRef.current?.contains(event.target as Node)) setNotificationsOpen(false);
    }
    function handleEscape(event: KeyboardEvent): void {
      if (event.key === "Escape") {
        setNotificationsOpen(false);
        setMobileNavOpen(false);
      }
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
    const key = "flowlyra.productTour.dismissed";
    const dismissed = window.localStorage.getItem(key);
    if (!dismissed) setTourOpen(true);
  }, []);

  useEffect(() => {
    if (!commandOpen) return;
    const query = commandQuery.trim();
    if (!query) {
      setCommandResults(FEATURE_LINKS.slice(0, 8).map((feature) => ({
        type: "feature" as const,
        id: feature.href,
        label: feature.title,
        href: feature.href,
        description: feature.description,
      })));
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
        const featureRows = searchFeatures(query).slice(0, 8).map((feature) => ({
          type: "feature" as const,
          id: feature.href,
          label: feature.title,
          description: feature.description,
          href: feature.href,
        }));
        setCommandResults([...featureRows, ...chatRows, ...ticketRows, ...contactRows].slice(0, 14));
      }).catch(() => {
        setCommandResults([]);
      });
    }, 180);
    return () => window.clearTimeout(timer);
  }, [commandOpen, commandQuery]);

  function handleMarkAllRead(): void {
    markAllRead();
    markReadMutation.mutate();
  }

  function handleRemoveNotification(id: string): void {
    removeNotification(id);
    removeNotificationMutation.mutate(id);
  }

  function handleClearNotifications(): void {
    clearNotifications();
    clearNotificationsMutation.mutate();
  }

  return (
    <div className="min-h-screen bg-white text-navy-700 dark:bg-navy-900 dark:text-navy-100">
      <Toaster position="top-right" />
      <aside className={`fixed inset-y-0 left-0 z-[200] hidden flex-col border-r border-navy-100 bg-white transition-all duration-300 dark:bg-navy-900 dark:border-navy-700 md:flex ${sidebarWidth}`}>
        {/* Logo */}
        <div className="flex h-16 items-center justify-between border-b border-navy-100 px-4 dark:border-navy-700">
          {!collapsed && <div className="flex items-center gap-2"><img src={dashboardLogo} alt="FlowLyra" className="h-7 w-7 rounded-lg" /><span className="text-lg font-bold font-display text-brand-500">FlowLyra</span></div>}
          <button aria-label="Toggle navigation" className="flex h-8 w-8 items-center justify-center rounded-md text-navy-400 hover:bg-navy-50 dark:hover:bg-navy-800" onClick={() => setCollapsed((v) => !v)}>
            {collapsed ? <Menu size={17} /> : <ChevronLeft size={17} />}
          </button>
        </div>
        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-2 px-2">
          {nav.map((group) => (
            <div key={group.section} className="mb-4">
              {!collapsed && <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-navy-300 dark:text-navy-500">{group.section}</div>}
              <div className="flex flex-col gap-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      className={({ isActive }) =>
                        `relative flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
                          isActive
                            ? "bg-brand-50 text-brand-600 dark:bg-brand-950/30 dark:text-brand-400"
                            : "text-navy-600 hover:bg-navy-50 dark:text-navy-400 dark:hover:bg-navy-800"
                        } ${collapsed ? "justify-center px-0" : ""}`
                      }
                    >
                      {({ isActive }) => (
                        <>
                          {isActive && !collapsed && (
                            <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-brand-500 rounded-r-full" />
                          )}
                          <Icon size={17} className={`shrink-0 ${collapsed ? "" : "ml-1"}`} />
                          {!collapsed && <span>{item.label}</span>}
                        </>
                      )}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
        {/* User footer */}
        <div className="border-t border-navy-100 p-3 dark:border-navy-700">
          <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-navy-50 dark:hover:bg-navy-800 cursor-pointer">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-600 text-sm font-medium dark:bg-brand-950 dark:text-brand-300">
              {(user?.full_name ?? "A").charAt(0).toUpperCase()}
            </div>
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-navy-700 dark:text-navy-100 truncate">{user?.full_name ?? "Agent"}</div>
                <div className="text-xs text-navy-400 capitalize">{user?.role ?? "agent"}</div>
              </div>
            )}
          </div>
        </div>
      </aside>
      {mobileNavOpen ? (
        <div className="fixed inset-0 z-[300] md:hidden">
          <button type="button" className="absolute inset-0 bg-navy-950/60 backdrop-blur-sm" aria-label="Close navigation drawer" onClick={() => setMobileNavOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 border-r border-navy-100 bg-white shadow-lift dark:bg-navy-900 dark:border-navy-700">
            <div className="flex h-14 items-center justify-between border-b border-navy-100 px-4 dark:border-navy-700">
              <div className="flex items-center gap-2"><img src={dashboardLogo} alt="FlowLyra logo" className="h-7 w-7 rounded-lg" /><span className="text-lg font-bold font-display text-brand-500">FlowLyra</span></div>
              <button aria-label="Close navigation" className="flex h-8 w-8 items-center justify-center rounded-md text-navy-400 hover:bg-navy-50 dark:hover:bg-navy-800" onClick={() => setMobileNavOpen(false)}><X size={17} /></button>
            </div>
            <nav className="flex flex-col gap-4 p-2 py-3 overflow-y-auto">
              {nav.map((group) => (
                <div key={group.section}>
                  <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-navy-300 dark:text-navy-500">{group.section}</div>
                  <div className="flex flex-col gap-0.5">
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      return (
                        <NavLink
                          key={item.to}
                          to={item.to}
                          onClick={() => setMobileNavOpen(false)}
                          className={({ isActive }) =>
                            `relative flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${isActive ? "bg-brand-50 text-brand-600 dark:bg-brand-950/30 dark:text-brand-400" : "text-navy-600 hover:bg-navy-50 dark:text-navy-400 dark:hover:bg-navy-800"}`
                          }
                        >
                          {({ isActive }) => (
                            <>
                              {isActive && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-brand-500 rounded-r-full" />}
                              <Icon size={17} className="shrink-0 ml-1" />
                              <span>{item.label}</span>
                            </>
                          )}
                        </NavLink>
                      );
                    })}
                  </div>
                </div>
              ))}
            </nav>
          </aside>
        </div>
      ) : null}
      <div className={contentOffset}>
        <header className="sticky top-0 z-[100] flex h-14 min-w-0 items-center justify-between gap-3 border-b border-navy-100 bg-white/80 px-3 backdrop-blur-md dark:bg-navy-900/80 dark:border-navy-700 sm:px-5">
          <div className="flex min-w-0 items-center gap-2">
            <button
              aria-label="Open navigation drawer"
              className="flex h-8 w-8 items-center justify-center rounded-md text-navy-500 hover:bg-navy-50 dark:text-navy-400 dark:hover:bg-navy-800 md:hidden"
              onClick={() => setMobileNavOpen(true)}
            >
              <Menu size={18} />
            </button>
            <button
              className="hidden md:flex items-center gap-2 min-w-[220px] lg:min-w-[300px] rounded-md border border-navy-100 bg-navy-50 px-3 py-1.5 text-sm text-navy-400 hover:border-navy-200 hover:bg-white transition-colors dark:bg-navy-800 dark:border-navy-700 dark:text-navy-500 dark:hover:bg-navy-700"
              onClick={() => setCommandOpen(true)}
            >
              <Search size={15} className="shrink-0" />
              <span className="flex-1 text-left">Search features, chats, tickets...</span>
              <kbd className="hidden lg:inline-flex items-center gap-0.5 rounded border border-navy-200 bg-white px-1.5 py-0.5 text-[10px] font-medium text-navy-400 dark:border-navy-600 dark:bg-navy-700 dark:text-navy-500">⌘K</kbd>
            </button>
            <select className="rounded-md border border-navy-100 bg-white px-2 py-1.5 text-sm font-medium text-navy-600 dark:bg-navy-800 dark:border-navy-700 dark:text-navy-300">
              <option>{t("layout.status.online")}</option>
              <option>{t("layout.status.busy")}</option>
              <option>{t("layout.status.away")}</option>
              <option>{t("layout.status.offline")}</option>
            </select>
            <label className="sr-only" htmlFor="dashboard-locale">{t("layout.language")}</label>
            <select
              id="dashboard-locale"
              className="rounded-md border border-navy-100 bg-white px-2 py-1.5 text-sm font-medium uppercase text-navy-600 dark:bg-navy-800 dark:border-navy-700 dark:text-navy-300"
              value={locale}
              onChange={(event) => setLocale(event.target.value as "en" | "es")}
            >
              {supportedLocales.map((code) => (
                <option key={code} value={code}>{code}</option>
              ))}
            </select>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <ThemeToggle />
            <button
              className="flex h-8 w-8 items-center justify-center rounded-md text-xs font-semibold text-navy-500 hover:bg-navy-50 dark:text-navy-400 dark:hover:bg-navy-800"
              onClick={() => setTourOpen(true)}
              title="Product Tour"
            >
              <WandSparkles size={17} />
            </button>
            <div ref={notificationPanelRef} className="relative">
              <button
                className="relative flex h-8 w-8 items-center justify-center rounded-md text-navy-500 hover:bg-navy-50 dark:text-navy-400 dark:hover:bg-navy-800"
                aria-label={t("layout.notifications.title")}
                aria-expanded={notificationsOpen}
                onClick={() => {
                  const nextOpen = !notificationsOpen;
                  setNotificationsOpen(nextOpen);
                  if (nextOpen) handleMarkAllRead();
                }}
              >
                <Bell size={17} />
                {unread > 0 && <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-danger-500 px-0.5 text-[10px] font-semibold text-white leading-none">{unread > 9 ? "9+" : unread}</span>}
              </button>
              {notificationsOpen && (
                <NotificationCenter
                  notifications={notifications}
                  onClose={() => setNotificationsOpen(false)}
                  onClear={handleClearNotifications}
                  onRemove={handleRemoveNotification}
                  t={t}
                />
              )}
            </div>
            <button
              className="flex h-8 w-8 items-center justify-center rounded-md text-navy-500 hover:bg-navy-50 dark:text-navy-400 dark:hover:bg-navy-800"
              onClick={() => {
                void logout().then(() => navigate("/login"));
              }}
              aria-label={t("layout.logout")}
              title={t("layout.logout")}
            >
              <LogOut size={17} />
            </button>
          </div>
        </header>
        <main className="min-h-[calc(100dvh-56px)] min-w-0">
          <Outlet />
        </main>
      </div>
      <div className="sr-only" aria-live="polite">
        {notifications[0]?.title}
      </div>
      {commandOpen ? (
        <div className="fixed inset-0 z-[600] grid place-items-start bg-navy-950/60 backdrop-blur-sm p-4 pt-24" onClick={() => { setCommandOpen(false); setCommandQuery(""); }}>
          <div className="w-full max-w-2xl rounded-2xl border border-navy-100 bg-white shadow-lift dark:bg-navy-900 dark:border-navy-700" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 border-b border-navy-100 px-4 py-3 dark:border-navy-700">
              <Search size={16} className="shrink-0 text-navy-400" />
              <input
                autoFocus
                className="flex-1 bg-transparent text-sm text-navy-700 placeholder:text-navy-400 outline-none dark:text-navy-100"
                placeholder="Search any feature, chat, ticket, customer..."
                value={commandQuery}
                onChange={(event) => setCommandQuery(event.target.value)}
              />
              <kbd className="rounded border border-navy-100 bg-navy-50 px-1.5 py-0.5 text-[10px] font-medium text-navy-400 dark:border-navy-700 dark:bg-navy-800 dark:text-navy-500">ESC</kbd>
            </div>
            <div className="max-h-[420px] overflow-y-auto p-2">
              {commandResults.length ? commandResults.map((row) => (
                <button
                  key={`${row.type}:${row.id}`}
                  className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left hover:bg-navy-50 dark:hover:bg-navy-800"
                  onClick={() => {
                    setCommandOpen(false);
                    setCommandQuery("");
                    navigate(row.href);
                  }}
                >
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-navy-700 dark:text-navy-100">{row.label}</span>
                    {row.description ? <span className="mt-0.5 line-clamp-1 block text-xs text-navy-400">{row.description}</span> : null}
                  </span>
                  <span className="rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide bg-navy-50 text-navy-400 dark:bg-navy-800 dark:text-navy-500">{row.type}</span>
                </button>
              )) : <div className="px-3 py-8 text-center text-sm text-navy-400">{t("layout.command.noResults")}</div>}
            </div>
          </div>
        </div>
      ) : null}
      {helpWidgetEnabled ? (
        <>
          <button
            className="fixed bottom-5 right-5 z-40 inline-flex items-center gap-2 rounded-full px-4 py-3 text-sm font-black text-white shadow-xl"
            style={{ backgroundColor: dashboardColor }}
            onClick={() => setHelpOpen(true)}
          >
            <LifeBuoy size={16} /> Help
          </button>
          {helpOpen ? (
            <div className="fixed inset-0 z-[70] bg-black/45 p-4" onClick={() => setHelpOpen(false)}>
              <div className="ml-auto h-full w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
                <div className="flex items-center justify-between border-b border-navy-100 dark:border-navy-700 px-4 py-3">
                  <div className="text-sm font-black text-navy-700">Support Widget (Dogfood)</div>
                  <button className="rounded-lg p-2 text-navy-400 hover:bg-navy-100" onClick={() => setHelpOpen(false)} aria-label="Close help"><X size={16} /></button>
                </div>
                <iframe title="Help widget" src={helpChatUrl} className="h-[calc(100%-53px)] w-full" />
              </div>
            </div>
          ) : null}
        </>
      ) : null}
      <ProductTour
        open={tourOpen}
        onClose={() => {
          window.localStorage.setItem("flowlyra.productTour.dismissed", "1");
          setTourOpen(false);
        }}
      />
    </div>
  );
}

function NotificationCenter({ notifications, onClose, onClear, onRemove, t }: { notifications: Notification[]; onClose: () => void; onClear: () => void; onRemove: (id: string) => void; t: (key: string, vars?: Record<string, string | number>) => string }): JSX.Element {
  return (
    <div className="absolute right-0 top-12 z-50 w-[min(92vw,420px)] overflow-hidden rounded-2xl border border-navy-100 bg-white shadow-lift dark:border-navy-700 dark:bg-navy-900">
      <div className="flex items-start justify-between gap-3 border-b border-navy-100 bg-gradient-to-br from-brand-50 via-white to-navy-50 px-4 py-4 dark:border-navy-700 dark:from-brand-950/30 dark:via-navy-900 dark:to-navy-800/50">
        <div>
          <div className="flex items-center gap-2 text-base font-semibold font-display text-navy-700 dark:text-white"><Bell size={17} className="text-brand-500" /> {t("layout.notifications.title")}</div>
          <p className="mt-1 text-xs text-navy-400">{t("layout.notifications.subtitle")}</p>
        </div>
        <div className="flex items-center gap-1">
          <button
            className="rounded-md border border-brand-100 bg-white px-3 py-1.5 text-xs font-medium text-brand-600 shadow-xs hover:bg-brand-50 dark:border-brand-900/50 dark:bg-brand-950/40 dark:text-brand-300 dark:hover:bg-brand-900/40"
            onClick={() => {
              void unlockNotificationSound().then(() => playIncomingChatSound());
            }}
          >
            {t("layout.notifications.testSound")}
          </button>
          <button aria-label="Close notifications" className="flex h-7 w-7 items-center justify-center rounded-md text-navy-400 hover:bg-navy-50 dark:text-navy-300 dark:hover:bg-navy-800" onClick={onClose}><X size={15} /></button>
        </div>
      </div>
      <div className="flex items-center justify-between border-b border-navy-100 dark:border-navy-700 px-4 py-2">
        <span className="text-xs font-black uppercase tracking-wide text-navy-400 dark:text-navy-500">{t("layout.notifications.recent", { count: notifications.length })}</span>
        <div className="flex items-center gap-2">
          <button className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold text-brand-700 hover:bg-brand-50 dark:text-brand-300 dark:hover:bg-brand-950/40" onClick={onClose}><CheckCheck size={14} /> {t("layout.notifications.read")}</button>
          <button className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold text-danger-600 hover:bg-danger-50 disabled:opacity-40 dark:text-danger-400 dark:hover:bg-danger-50/10" onClick={onClear} disabled={!notifications.length}><Trash2 size={14} /> {t("layout.notifications.clear")}</button>
        </div>
      </div>
      <div className="max-h-[420px] overflow-y-auto p-2">
        {notifications.length ? notifications.map((notification) => (
          <NotificationRow key={notification.id} notification={notification} onRemove={() => onRemove(notification.id)} />
        )) : <div className="grid min-h-48 place-items-center px-6 py-8 text-center"><div><div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-brand-50 text-brand-600 dark:bg-brand-950/40 dark:text-brand-300"><Bell size={20} /></div><div className="font-black font-display text-navy-900 dark:text-white">{t("layout.notifications.emptyTitle")}</div><p className="mt-1 text-sm leading-6 text-navy-400 dark:text-navy-400">{t("layout.notifications.emptySubtitle")}</p></div></div>}
      </div>
    </div>
  );
}

function NotificationRow({ notification, onRemove }: { notification: Notification; onRemove: () => void }): JSX.Element {
  const dot = notification.level === "urgent" ? "bg-danger-500" : notification.level === "warning" ? "bg-warning-500" : "bg-blue-500";
  return (
    <div className="group flex gap-3 rounded-lg px-3 py-3 hover:bg-navy-50 dark:hover:bg-navy-800">
      <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${dot}`} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold text-navy-700 dark:text-navy-100">{notification.title}</div>
        <p className="mt-0.5 line-clamp-2 text-sm leading-5 text-navy-400 dark:text-navy-400">{notification.body}</p>
        <div className="mt-1.5 text-[11px] font-medium text-navy-300 dark:text-navy-500">{formatNotificationTime(notification.createdAt)}</div>
      </div>
      <button aria-label="Remove notification" className="flex h-7 w-7 items-center justify-center rounded-md text-navy-300 opacity-0 transition-opacity hover:bg-navy-100 hover:text-danger-500 group-hover:opacity-100 dark:hover:bg-navy-700 dark:hover:text-danger-400" onClick={onRemove}><X size={14} /></button>
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
    <div className="flex min-h-[56px] flex-col gap-3 border-b border-navy-100 bg-white/80 px-4 py-4 backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between sm:px-6 dark:bg-navy-900/80 dark:border-navy-700">
      <div className="min-w-0">
        <h1 className="truncate text-xl font-semibold tracking-tight font-display text-navy-700 dark:text-navy-100">{title}</h1>
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
