import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Clock, Globe2, MessageCircle, MessageSquare, Pin, Search, Sparkles, UsersRound } from "lucide-react";
import { useMemo, useState } from "react";
import { api } from "../lib/api";
import { useMe } from "../lib/me";
import { PageHeader } from "../components/AgentLayout";
import { Card, EmptyPanel, MetricCard, PageShell, Pill, TextInput } from "../components/ui";
import { useChatStore } from "../stores/chatStore";
import type { Chat } from "../types";

type InboxView = "all" | "my" | "queued" | "supervised" | "pinned" | "archived";

const VIEW_LABELS: Record<InboxView, string> = {
  all: "All",
  my: "My chats",
  queued: "Queued",
  supervised: "Supervised",
  pinned: "Pinned",
  archived: "Archived",
};

export function InboxPage(): JSX.Element {
  const me = useMe();
  const role = me.data?.user.role ?? "agent";
  const queryViewOptions: InboxView[] = role === "admin" || role === "supervisor"
    ? ["all", "my", "queued", "supervised", "pinned", "archived"]
    : ["all", "my", "queued", "pinned", "archived"];

  const [view, setView] = useState<InboxView>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const { data = [] } = useQuery({
    queryKey: ["chats", "inbox", view, searchQuery],
    queryFn: async () => (await api.get<Chat[]>("/chats", { params: { view: view === "all" ? undefined : view, q: searchQuery || undefined } })).data,
    refetchInterval: 2500,
  });

  const chats = Object.values(useChatStore((state) => state.chats));
  const unreadCounts = useChatStore((state) => state.unreadCounts);
  const rows = useMemo(() => mergeChats(data, chats), [data, chats]);

  const waiting = rows.filter((chat) => chat.status === "waiting").length;
  const active = rows.filter((chat) => chat.status === "active").length;
  const online = rows.filter((chat) => chat.visitor_status === "online").length;
  const pinned = rows.filter((chat) => chat.is_pinned).length;
  const totalUnread = Object.values(unreadCounts).reduce((sum, count) => sum + count, 0);

  return (
    <PageShell>
      <PageHeader
        title="Inbox"
        action={<div className="hidden items-center gap-2 rounded-xl border border-navy-100 dark:border-navy-700 bg-white px-3 py-2 text-sm font-bold text-navy-500 shadow-sm md:flex dark:bg-navy-900 dark:text-navy-300"><Sparkles size={16} className="text-navy-600 dark:text-navy-200" /> Live sneak-peek, AI replies, sound alerts</div>}
      />
      <div className="grid min-h-[calc(100dvh-128px)] grid-cols-1 gap-4 p-3 lg:grid-cols-[minmax(340px,460px)_minmax(0,1fr)] lg:p-5">
        <Card className="min-w-0 overflow-hidden bg-white dark:bg-navy-900">
          <div className="border-b border-navy-100 dark:border-navy-700 bg-white p-4 dark:bg-navy-900">
            <div className="mb-4 grid grid-cols-5 gap-2">
              <MetricCard label="Waiting" value={waiting} tone="yellow" />
              <MetricCard label="Active" value={active} tone="green" />
              <MetricCard label="Online" value={online} tone="blue" />
              <MetricCard label="Pinned" value={pinned} tone="slate" />
              <MetricCard label="Unread" value={totalUnread} tone={totalUnread ? "red" : "slate"} />
            </div>
            <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
              {queryViewOptions.map((option) => (
                <button
                  key={option}
                  className={`shrink-0 rounded-lg border px-3 py-1.5 text-sm font-medium transition ${view === option ? "border-brand-500 bg-brand-50 text-brand-600 dark:border-brand-700 dark:bg-brand-950/30 dark:text-brand-400" : "border-navy-100 dark:border-navy-700 bg-white text-navy-500 hover:bg-navy-50 dark:bg-navy-900 dark:text-navy-300 dark:hover:bg-navy-800"}`}
                  onClick={() => setView(option)}
                >
                  {VIEW_LABELS[option]}
                </button>
              ))}
            </div>
            <label className="flex items-center gap-2 rounded-lg border border-navy-100 bg-white px-3 text-sm text-navy-400 shadow-sm focus-within:border-brand-500 focus-within:ring-4 focus-within:ring-brand-500/20 dark:border-navy-700 dark:bg-navy-800 dark:text-navy-400 dark:focus-within:border-brand-500 dark:focus-within:ring-brand-500/30">
              <Search size={16} />
              <TextInput
                className="h-11 border-0 px-0 shadow-none focus:ring-0"
                placeholder="Search conversations, email, topic"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
            </label>
          </div>
          <div className="max-h-[620px] overflow-y-auto lg:max-h-[calc(100dvh-330px)]">
            {rows.length ? rows.map((chat) => <ChatRow key={chat.id} chat={chat} unreadCount={unreadCounts[chat.id] ?? 0} />) : <EmptyState />}
          </div>
        </Card>
        <div className="grid place-items-center rounded-2xl border border-navy-100 dark:border-navy-700 bg-white/70 p-4 backdrop-blur dark:bg-navy-900/50 sm:p-8">
          <Card className="w-full max-w-xl bg-white dark:bg-navy-900">
            <EmptyPanel icon={<MessageCircle size={24} />} title="Choose a conversation" description="Reply, see live typing previews, use AI suggestions, send files, and review visitor context from one clean workspace." />
          </Card>
        </div>
      </div>
    </PageShell>
  );
}

function mergeChats(serverChats: Chat[], realtimeChats: Chat[]): Chat[] {
  const byId = new Map<string, Chat>();
  for (const chat of serverChats) byId.set(chat.id, chat);
  for (const chat of realtimeChats) byId.set(chat.id, { ...byId.get(chat.id), ...chat });
  return [...byId.values()].sort((a, b) => {
    if ((a.is_pinned ? 1 : 0) !== (b.is_pinned ? 1 : 0)) return (b.is_pinned ? 1 : 0) - (a.is_pinned ? 1 : 0);
    return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
  });
}

function ChatRow({ chat, unreadCount }: { chat: Chat; unreadCount: number }): JSX.Element {
  const isUnread = unreadCount > 0;
  return (
    <Link to={`/inbox/chat/${chat.id}`} className={`group flex min-w-0 items-center gap-3 border-b border-navy-100 px-4 py-3 outline-none transition last:border-0 focus-visible:bg-brand-50 dark:border-navy-700 dark:focus-visible:bg-navy-800 ${isUnread ? "bg-brand-50/80 hover:bg-brand-50 dark:bg-brand-950/20" : "hover:bg-navy-50 dark:hover:bg-navy-800/80"}`}>
      <div className="relative grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-navy-950 text-white shadow-sm dark:bg-white dark:text-navy-700"><MessageSquare size={19} /><span className={`absolute -right-0.5 -top-0.5 h-3.5 w-3.5 rounded-full border-2 border-white ${chat.visitor_status === "online" ? "bg-success-500" : "bg-navy-300"}`} /></div>
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-2">
          <div className={`truncate font-black ${isUnread ? "text-navy-700 dark:text-white" : "text-navy-700 dark:text-navy-200"}`}>{chat.visitor_name || chat.visitor_email || "Website visitor"}</div>
          {chat.is_pinned ? <Pin size={12} className="text-brand-600" /> : null}
          <ChatStatusBadge status={chat.status} visitorStatus={chat.visitor_status ?? "offline"} />
        </div>
        <div className="mt-1 flex items-center gap-1 truncate text-sm text-navy-400 dark:text-navy-400">
          <Globe2 size={13} />
          {chat.last_message?.content ? `${chat.last_message.sender_type === "agent" ? "Agent" : "Visitor"}: ${chat.last_message.content}` : chat.subject || chat.visitor_email || `${chat.channel} conversation`}
        </div>
        <div className="mt-1 flex items-center gap-2 text-xs font-semibold text-navy-400 dark:text-navy-400"><Clock size={12} />{formatTime(chat.updated_at)}<span className="h-1 w-1 rounded-full bg-navy-200" /><span>{chat.channel}</span></div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {isUnread && <span className="grid h-6 min-w-6 animate-pulse place-items-center rounded-full bg-brand-500 px-1 text-[11px] font-black text-white shadow-lg shadow-brand-500/20">{unreadCount}</span>}
        <div className="hidden sm:block"><VisitorPresenceBadge status={chat.visitor_status ?? "offline"} /></div>
      </div>
    </Link>
  );
}

function VisitorPresenceBadge({ status }: { status: "online" | "offline" }): JSX.Element {
  return <Pill tone={status === "online" ? "green" : "slate"} className="rounded-full"><span className={`h-2 w-2 rounded-full ${status === "online" ? "bg-success-500" : "bg-navy-300"}`} />{status}</Pill>;
}

function ChatStatusBadge({ status, visitorStatus }: { status: Chat["status"]; visitorStatus: "online" | "offline" }): JSX.Element {
  if (status === "active" && visitorStatus === "offline") return <Pill tone="slate" className="shrink-0 rounded-full px-2 py-0.5 text-[10px] uppercase">offline</Pill>;
  const tone = status === "waiting" ? "yellow" : status === "active" ? "green" : status === "resolved" ? "slate" : "orange";
  return <Pill tone={tone} className="shrink-0 rounded-full px-2 py-0.5 text-[10px] uppercase">{status}</Pill>;
}

function formatTime(value: string): string {
  return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

function EmptyState(): JSX.Element {
  return <EmptyPanel icon={<UsersRound size={22} />} title="No chats match this view." description="New and active conversations will appear here with sound alerts." />;
}
