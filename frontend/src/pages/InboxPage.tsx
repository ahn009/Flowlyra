import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Clock, Globe2, MessageCircle, MessageSquare, Search, Sparkles, UsersRound } from "lucide-react";
import { api } from "../lib/api";
import { PageHeader } from "../components/AgentLayout";
import { Card, EmptyPanel, MetricCard, PageShell, Pill, TextInput } from "../components/ui";
import { useChatStore } from "../stores/chatStore";
import type { Chat } from "../types";

export function InboxPage(): JSX.Element {
  const { data = [] } = useQuery({ queryKey: ["chats"], queryFn: async () => (await api.get<Chat[]>("/chats")).data, refetchInterval: 2500 });
  const chats = Object.values(useChatStore((state) => state.chats));
  const unreadCounts = useChatStore((state) => state.unreadCounts);
  const rows = mergeChats(data, chats);
  const waiting = rows.filter((chat) => chat.status === "waiting").length;
  const active = rows.filter((chat) => chat.status === "active").length;
  const online = rows.filter((chat) => chat.visitor_status === "online").length;
  const totalUnread = Object.values(unreadCounts).reduce((sum, count) => sum + count, 0);

  return (
    <PageShell className="bg-[radial-gradient(circle_at_top_left,#dbeafe_0,transparent_32%),linear-gradient(180deg,#f8fafc,#eef3f8)]">
      <PageHeader
        title="Inbox"
        action={<div className="hidden items-center gap-2 rounded-full border border-blue-100 bg-white/80 px-3 py-2 text-sm font-bold text-slate-600 shadow-sm md:flex dark:border-blue-900/50 dark:bg-slate-900/70 dark:text-slate-300"><Sparkles size={16} className="text-blue-600" /> Live sneak-peek, AI replies, sound alerts</div>}
      />
      <div className="grid min-h-[calc(100dvh-128px)] grid-cols-1 gap-4 p-3 lg:grid-cols-[minmax(340px,460px)_minmax(0,1fr)] lg:p-5">
        <Card className="min-w-0 overflow-hidden border-0 bg-white/90 shadow-2xl shadow-slate-200/70 backdrop-blur dark:bg-slate-900/90 dark:shadow-black/20">
          <div className="border-b border-border bg-gradient-to-br from-white to-blue-50/70 p-4 dark:from-slate-900 dark:to-blue-950/20">
            <div className="mb-4 grid grid-cols-4 gap-2">
              <MetricCard label="Waiting" value={waiting} tone="yellow" />
              <MetricCard label="Active" value={active} tone="green" />
              <MetricCard label="Online" value={online} tone="blue" />
              <MetricCard label="Unread" value={totalUnread} tone={totalUnread ? "red" : "slate"} />
            </div>
            <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
              {[
                ["All", rows.length],
                ["Waiting", waiting],
                ["Active", active],
                ["Resolved", rows.filter((chat) => chat.status === "resolved").length]
              ].map(([label, count], index) => <button key={label} className={`shrink-0 rounded-full border px-3 py-1.5 text-sm font-black transition ${index === 0 ? "border-blue-200 bg-blue-600 text-white shadow-lg shadow-blue-900/20" : "border-border bg-white/80 text-slate-600 hover:border-blue-200 hover:bg-blue-50 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"}`}>{label} <span className="opacity-75">{count}</span></button>)}
            </div>
            <label className="flex items-center gap-2 rounded-2xl border border-border bg-white px-3 text-sm text-slate-500 shadow-sm focus-within:border-blue-400 focus-within:ring-4 focus-within:ring-blue-100 dark:bg-slate-800 dark:text-slate-400 dark:focus-within:border-blue-500 dark:focus-within:ring-blue-900/40">
              <Search size={16} /> <TextInput className="h-11 border-0 px-0 shadow-none focus:ring-0" placeholder="Search conversations, email, topic" />
            </label>
          </div>
          <div className="max-h-[620px] overflow-y-auto lg:max-h-[calc(100dvh-330px)]">
            {rows.length ? rows.map((chat) => <ChatRow key={chat.id} chat={chat} unreadCount={unreadCounts[chat.id] ?? 0} />) : <EmptyState />}
          </div>
        </Card>
        <div className="grid place-items-center rounded-[2rem] border border-white/70 bg-white/50 p-4 shadow-inner shadow-white/60 backdrop-blur dark:border-slate-700/60 dark:bg-slate-900/40 sm:p-8">
          <Card className="w-full max-w-xl border-0 bg-white/90 shadow-2xl shadow-blue-900/10 dark:bg-slate-900/90">
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
  return [...byId.values()].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
}

function ChatRow({ chat, unreadCount }: { chat: Chat; unreadCount: number }): JSX.Element {
  const isUnread = unreadCount > 0;
  return (
    <Link to={`/chat/${chat.id}`} className={`group flex min-w-0 items-center gap-3 border-b border-border px-4 py-3 outline-none transition last:border-0 focus-visible:bg-blue-50 dark:focus-visible:bg-slate-800 ${isUnread ? "bg-blue-50/80 hover:bg-blue-50 dark:bg-blue-950/20" : "hover:bg-slate-50 dark:hover:bg-slate-800/80"}`}>
      <div className="relative grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-400 text-white shadow-lg shadow-blue-900/15"><MessageSquare size={19} /><span className={`absolute -right-0.5 -top-0.5 h-3.5 w-3.5 rounded-full border-2 border-white ${chat.visitor_status === "online" ? "bg-success" : "bg-slate-400"}`} /></div>
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-2">
          <div className={`truncate font-black ${isUnread ? "text-slate-950 dark:text-white" : "text-slate-800 dark:text-slate-200"}`}>{chat.visitor_name || chat.visitor_email || "Website visitor"}</div>
          <ChatStatusBadge status={chat.status} visitorStatus={chat.visitor_status ?? "offline"} />
        </div>
        <div className="mt-1 flex items-center gap-1 truncate text-sm text-slate-500 dark:text-slate-400">
          <Globe2 size={13} />
          {chat.last_message?.content ? `${chat.last_message.sender_type === "agent" ? "Agent" : "Visitor"}: ${chat.last_message.content}` : chat.subject || chat.visitor_email || `${chat.channel} conversation`}
        </div>
        <div className="mt-1 flex items-center gap-2 text-xs font-semibold text-slate-400 dark:text-slate-500"><Clock size={12} />{formatTime(chat.updated_at)}<span className="h-1 w-1 rounded-full bg-slate-300" /><span>{chat.channel}</span></div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {isUnread && <span className="grid h-6 min-w-6 animate-pulse place-items-center rounded-full bg-green-600 px-1 text-[11px] font-black text-white shadow-lg shadow-green-900/20">{unreadCount}</span>}
        <div className="hidden sm:block"><VisitorPresenceBadge status={chat.visitor_status ?? "offline"} /></div>
      </div>
    </Link>
  );
}

function VisitorPresenceBadge({ status }: { status: "online" | "offline" }): JSX.Element {
  return <Pill tone={status === "online" ? "green" : "slate"} className="rounded-full"><span className={`h-2 w-2 rounded-full ${status === "online" ? "bg-success" : "bg-slate-400"}`} />{status}</Pill>;
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
