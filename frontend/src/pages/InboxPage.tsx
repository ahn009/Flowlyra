import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Clock, Globe2, MessageSquare, Search, Sparkles } from "lucide-react";
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
  return (
    <PageShell>
      <PageHeader title="Inbox" action={<div className="hidden items-center gap-2 text-sm text-slate-500 md:flex"><Sparkles size={16} className="text-blue-600" /> Message sneak-peek and AI suggestions are agent-only</div>} />
      <div className="grid min-h-[calc(100dvh-128px)] grid-cols-1 lg:grid-cols-[minmax(320px,420px)_minmax(0,1fr)]">
        <div className="min-w-0 border-b border-border bg-white dark:bg-slate-900 lg:border-b-0 lg:border-r">
          <div className="border-b border-border p-3 sm:p-4">
            <div className="mb-4 grid grid-cols-3 gap-2">
              <MetricCard label="Waiting" value={waiting} tone="yellow" />
              <MetricCard label="Active" value={active} tone="green" />
              <MetricCard label="Online" value={online} tone="blue" />
            </div>
            <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-3">
              {["All", "Waiting", "Active", "Resolved"].map((label, index) => <button key={label} className={`shrink-0 rounded-lg border px-3 py-1.5 text-sm font-semibold ${index === 0 ? "border-blue-200 bg-blue-50 text-primary dark:border-blue-900 dark:bg-blue-950/50 dark:text-blue-200" : "border-border text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"}`}>{label}</button>)}
            </div>
            <label className="flex items-center gap-2 rounded-lg border border-border bg-white px-3 text-sm text-slate-500 focus-within:border-blue-300 focus-within:ring-4 focus-within:ring-blue-100 dark:bg-slate-800 dark:text-slate-300">
              <Search size={16} /> <TextInput className="border-0 px-0 shadow-none focus:ring-0" placeholder="Search chats" />
            </label>
          </div>
          <div className="max-h-[520px] overflow-y-auto lg:max-h-[calc(100dvh-285px)]">
            {rows.length ? rows.map((chat) => <ChatRow key={chat.id} chat={chat} unreadCount={unreadCounts[chat.id] ?? 0} />) : <EmptyState />}
          </div>
        </div>
        <div className="grid place-items-center p-4 sm:p-8">
          <Card className="w-full max-w-xl">
            <EmptyPanel icon={<MessageSquare size={22} />} title="Pick a visitor conversation" description="Open a chat to reply, see live typing preview, use canned responses, and review visitor context in one workspace." />
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
  return (
    <Link to={`/chat/${chat.id}`} className="flex min-w-0 items-center gap-3 border-b border-border px-4 py-3 outline-none transition hover:bg-slate-50 focus-visible:bg-blue-50 dark:hover:bg-slate-800 dark:focus-visible:bg-slate-800">
      <div className="relative grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-blue-50 text-primary"><MessageSquare size={18} /><span className={`absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-white ${chat.visitor_status === "online" ? "bg-success" : "bg-slate-400"}`} /></div>
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-2">
          <div className={`truncate font-semibold ${unreadCount > 0 ? "text-slate-900 dark:text-slate-100" : "dark:text-slate-200"}`}>{chat.visitor_name || chat.visitor_email || "Website visitor"}</div>
          <ChatStatusBadge status={chat.status} visitorStatus={chat.visitor_status ?? "offline"} />
        </div>
        <div className="mt-1 flex items-center gap-1 truncate text-sm text-slate-500 dark:text-slate-400">
          <Globe2 size={13} />
          {chat.last_message?.content ? `${chat.last_message.sender_type === "agent" ? "Agent" : "Visitor"}: ${chat.last_message.content}` : chat.subject || chat.visitor_email || `${chat.channel} conversation`}
        </div>
        <div className="mt-1 flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500"><Clock size={12} />{formatTime(chat.updated_at)}</div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {unreadCount > 0 && <span className="grid h-6 min-w-6 place-items-center rounded-full bg-green-600 px-1 text-[11px] font-bold text-white">{unreadCount}</span>}
        <div className="hidden sm:block"><VisitorPresenceBadge status={chat.visitor_status ?? "offline"} /></div>
      </div>
    </Link>
  );
}

function VisitorPresenceBadge({ status }: { status: "online" | "offline" }): JSX.Element {
  return (
    <Pill tone={status === "online" ? "green" : "slate"}>
      <span className={`h-2 w-2 rounded-full ${status === "online" ? "bg-success" : "bg-slate-400"}`} />
      {status}
    </Pill>
  );
}

function ChatStatusBadge({ status, visitorStatus }: { status: Chat["status"]; visitorStatus: "online" | "offline" }): JSX.Element {
  if (status === "active" && visitorStatus === "offline") {
    return <Pill tone="slate" className="shrink-0 px-1.5 py-0.5 text-[10px] uppercase">offline</Pill>;
  }
  const tone = status === "waiting" ? "yellow" : status === "active" ? "green" : status === "resolved" ? "slate" : "orange";
  return <Pill tone={tone} className="shrink-0 px-1.5 py-0.5 text-[10px] uppercase">{status}</Pill>;
}

function formatTime(value: string): string {
  return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

function EmptyState(): JSX.Element {
  return <EmptyPanel title="No chats match this view." description="New and active conversations will appear here." />;
}
