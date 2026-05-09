import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Check, Clock, FileUp, Mail, MapPin, MoreHorizontal, Paperclip, Plus, Send, ShieldCheck, Sparkles, Tag, UserRound, Zap } from "lucide-react";
import { api } from "../lib/api";
import { activeSocket } from "../socket";
import { useChatStore } from "../stores/chatStore";
import type { Chat, Message } from "../types";

interface ChatDetail extends Chat {
  messages: Message[];
  contact?: { id: string } | null;
  visitor_session?: {
    ip_address?: string | null;
    country?: string | null;
    city?: string | null;
    current_url?: string | null;
    referrer?: string | null;
    page_views?: number | null;
    first_seen_at?: string | null;
    last_seen_at?: string | null;
  } | null;
}

export function ChatPage(): JSX.Element {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const [reply, setReply] = useState("");
  const [noteMode, setNoteMode] = useState(false);
  const { data } = useQuery({ queryKey: ["chat", id], queryFn: async () => (await api.get<ChatDetail>(`/chats/${id}`)).data, enabled: Boolean(id), refetchInterval: 2500 });
  const liveMessages = useChatStore((state) => state.messages[id]) ?? [];
  const messages = mergeMessages(data?.messages ?? [], liveMessages);
  const preview = useChatStore((state) => state.typingPreview[id]);
  const suggestions = useChatStore((state) => state.aiSuggestions[id]) ?? [];
  const setActiveChat = useChatStore((state) => state.setActiveChat);
  const cannedReplies = [
    "Thanks for reaching out. I am checking this now.",
    "Could you share the email address on the account?",
    "I can help with that. Give me a moment to review the details."
  ];

  useEffect(() => {
    setActiveChat(id);
    activeSocket()?.emit("agent:join:chat", { chat_id: id });
    return () => {
      activeSocket()?.emit("agent:leave:chat", { chat_id: id });
      setActiveChat(null);
    };
  }, [id, setActiveChat]);

  const rows = useMemo(() => messages, [messages]);
  function send(): void {
    if (!reply.trim()) return;
    if (noteMode) void api.post(`/chats/${id}/note`, { content: reply });
    else activeSocket()?.emit("chat:message", { organization_id: data?.organization_id, chat_id: id, content: reply, sender_type: "agent" });
    setReply("");
  }

  return (
    <section className="min-h-[calc(100dvh-64px)] bg-[linear-gradient(180deg,#f8fafc_0%,#f6f8fb_42%,#eef3f8_100%)] dark:bg-none dark:bg-slate-950">
      <div className="grid min-h-[calc(100dvh-64px)] grid-cols-1 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex min-h-[calc(100dvh-64px)] min-w-0 flex-col xl:h-[calc(100dvh-64px)]">
          <header className="border-b border-border bg-white/90 px-3 py-3 shadow-sm shadow-slate-200/40 backdrop-blur dark:bg-slate-900/90 dark:shadow-slate-900/30 sm:px-4 lg:px-6">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <button
                  type="button"
                  onClick={() => navigate("/inbox")}
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-white text-slate-600 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                  aria-label="Back to inbox"
                  title="Back to inbox"
                >
                  <ArrowLeft size={16} />
                </button>
                <div className="relative grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-primary to-sky-500 font-black text-white shadow-lg shadow-blue-900/20 sm:h-12 sm:w-12">
                  {initials(data?.visitor_name || data?.visitor_email || "Visitor")}
                  <span className={`absolute -right-1 -top-1 h-3.5 w-3.5 rounded-full border-2 border-white ${data?.visitor_status === "online" ? "bg-success" : "bg-slate-400"}`} />
                </div>
                <div className="min-w-0">
                  <div className="flex min-w-0 items-center gap-2">
                    <h1 className="truncate text-base font-black tracking-tight text-ink sm:text-lg">{data?.visitor_name || data?.visitor_email || "Website visitor"}</h1>
                    <span className={`rounded-lg px-2 py-1 text-[11px] font-black uppercase ${statusTone(data?.status ?? "waiting")}`}>{data?.status ?? "waiting"}</span>
                  </div>
                  <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 dark:text-slate-400 sm:text-sm">
                    <span className="truncate">{data?.subject || "Live chat"}</span>
                    <span className="hidden h-1 w-1 rounded-full bg-slate-300 sm:block" />
                    <span>{messages.length} messages</span>
                    <span className="hidden h-1 w-1 rounded-full bg-slate-300 sm:block" />
                    <VisitorPresence status={data?.visitor_status ?? "offline"} />
                  </div>
                </div>
              </div>
              <div className="-mx-1 flex max-w-full shrink-0 items-center gap-2 overflow-x-auto px-1 pb-1">
                <Action icon={<MoreHorizontal size={16} />} label="Assign" />
                <Action icon={<Clock size={16} />} label="Snooze" />
                <Action icon={<Tag size={16} />} label="Tag" />
                <button className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-bold text-white shadow-sm hover:bg-blue-800"><Check size={16} />Resolve</button>
              </div>
            </div>
          </header>

          <div className="min-h-0 flex-1 overflow-hidden px-3 py-3 sm:px-4 lg:px-6 lg:py-5">
            <div className="mx-auto flex h-full max-w-5xl flex-col overflow-hidden rounded-lg border border-border bg-white shadow-soft dark:bg-slate-900">
              <div className="border-b border-border bg-surface-muted px-5 py-3 dark:bg-slate-800">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-200">
                    <ShieldCheck size={16} className="text-green-600" />
                    Human conversation
                  </div>
                  <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">AI suggestions are private to agents</div>
                </div>
              </div>

              {preview && (
                <div className="border-b border-blue-100 bg-blue-50 px-5 py-3 text-sm text-blue-950 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-200">
                  <div className="mb-1 flex items-center gap-2 font-black"><Zap size={16} /> Visitor is typing now</div>
                  <div className="line-clamp-2 italic">{preview}</div>
                </div>
              )}

              <div className="min-h-[260px] flex-1 overflow-y-auto bg-[radial-gradient(circle_at_top_left,#dbeafe_0,transparent_28%),linear-gradient(#f8fafc,#eef3f8)] p-3 dark:bg-[linear-gradient(180deg,#111827,#0b1220)]">
                {rows.length > 0 ? rows.map((message) => <MessageRow key={message.id} message={message} />) : <EmptyConversation />}
              </div>

              {suggestions.length > 0 && (
                <div className="border-t border-blue-100 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900">
                  <div className="mb-2 flex items-center gap-2 text-sm font-black text-primary"><Sparkles size={16} /> Suggested replies</div>
                  <div className="flex flex-wrap gap-2">{suggestions.map((item) => <button key={item} onClick={() => setReply(item)} className="rounded-full border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-bold text-primary hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-900/20 dark:hover:bg-blue-900/40">{item}</button>)}</div>
                </div>
              )}
            </div>
          </div>

          <Composer
            reply={reply}
            noteMode={noteMode}
            cannedReplies={cannedReplies}
            setReply={setReply}
            setNoteMode={setNoteMode}
            send={send}
          />
        </div>
        <VisitorPanel chat={data} />
      </div>
    </section>
  );
}

function mergeMessages(serverMessages: Message[], liveMessages: Message[]): Message[] {
  const byId = new Map<string, Message>();
  for (const message of serverMessages) byId.set(message.id, message);
  for (const message of liveMessages) byId.set(message.id, message);
  return [...byId.values()].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
}

function MessageRow({ message }: { message: Message }): JSX.Element {
  if (message.is_internal) return <div className="px-2 py-3 text-center text-sm text-amber-800 sm:px-8"><span className="inline-block max-w-full rounded-full border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20 px-3 py-2 font-semibold">Internal note: {message.content}</span></div>;
  const mine = message.sender_type === "agent";
  return (
    <div className={`flex items-end gap-2 px-1 py-2 sm:gap-3 sm:px-5 sm:py-3 ${mine ? "justify-start" : "justify-end"}`}>
      {mine && <div className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-blue-600 text-[10px] font-black text-white shadow-sm sm:h-8 sm:w-8 sm:rounded-xl sm:text-xs">CF</div>}
      <div className={`max-w-[82%] overflow-hidden break-words rounded-xl px-3 py-2 text-sm leading-6 shadow-sm sm:max-w-[72%] sm:rounded-2xl sm:px-4 sm:py-3 ${mine ? "rounded-bl-md bg-blue-600 text-white" : "rounded-br-md border border-slate-200 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"}`}>
        {mine && <div className="mb-1 text-[11px] font-black uppercase tracking-wide text-blue-100">Support agent</div>}
        {message.content}
        <div className={`mt-1 text-[10px] font-semibold ${mine ? "text-blue-100" : "text-slate-400 dark:text-slate-500"}`}>{formatTime(message.created_at)}</div>
      </div>
      {!mine && <div className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-slate-200 text-[10px] font-black text-slate-700 sm:h-8 sm:w-8 sm:rounded-xl sm:text-xs">V</div>}
    </div>
  );
}

function EmptyConversation(): JSX.Element {
  return <div className="grid min-h-full place-items-center px-4 py-10 text-center text-sm font-semibold text-slate-500 dark:text-slate-400">No messages yet.</div>;
}

function Action({ icon, label }: { icon: ReactNode; label: string }): JSX.Element {
  return <button className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-slate-200 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50">{icon}{label}</button>;
}

function VisitorPanel({ chat }: { chat?: ChatDetail }): JSX.Element {
  const location = [chat?.visitor_session?.city, chat?.visitor_session?.country].filter(Boolean).join(", ");
  return (
    <aside className="border-t border-border bg-white p-3 dark:bg-slate-900 sm:p-5 xl:h-[calc(100dvh-64px)] xl:overflow-auto xl:border-l xl:border-t-0">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-black uppercase tracking-wide text-slate-500 dark:text-slate-400">Visitor</h2>
        <button className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50 dark:bg-slate-800/50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"><MoreHorizontal size={16} /></button>
      </div>
      <div className="mt-4 rounded-lg border border-border bg-gradient-to-b from-white to-slate-50 p-4 shadow-soft dark:from-slate-900 dark:to-slate-800">
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-blue-50 text-primary ring-1 ring-blue-100 sm:h-14 sm:w-14"><UserRound size={24} /></div>
          <div className="min-w-0">
            <div className="truncate text-lg font-black">{chat?.visitor_name || chat?.visitor_email || "Website visitor"}</div>
            <div className="mt-1"><VisitorPresence status={chat?.visitor_status ?? "offline"} /></div>
          </div>
        </div>
        <div className="mt-5 grid gap-3 text-sm text-slate-600 dark:text-slate-300">
          <InfoLine icon={<Mail size={15} />} value={chat?.visitor_email || "Email not provided"} />
          <InfoLine icon={<MapPin size={15} />} value={chat?.visitor_ip || "IP unavailable"} />
          {location ? <InfoLine icon={<MapPin size={15} />} value={location} /> : null}
        </div>
      </div>
      <div className="mt-4 grid gap-3 text-sm text-slate-600 dark:text-slate-300 md:grid-cols-2 xl:grid-cols-1">
        <InfoCard
          title="Session"
          lines={[
            `Channel: ${chat?.channel ?? "web"}`,
            `Page views: ${chat?.visitor_session?.page_views ?? chat?.visitor_page_views ?? 0}`,
            `Current page: ${chat?.visitor_session?.current_url || chat?.visitor_current_url || "Unknown"}`,
            `Referrer: ${chat?.visitor_session?.referrer || chat?.visitor_referrer || "Direct"}`
          ]}
        />
        <InfoCard
          title="Timeline"
          lines={[
            `First seen: ${chat?.visitor_session?.first_seen_at ? formatDate(chat.visitor_session.first_seen_at) : "Unknown"}`,
            `Last seen: ${chat?.visitor_session?.last_seen_at ? formatDate(chat.visitor_session.last_seen_at) : "Unknown"}`,
            `Chat created: ${chat?.created_at ? formatDate(chat.created_at) : "Unknown"}`,
            `Updated: ${chat?.updated_at ? formatDate(chat.updated_at) : "Unknown"}`
          ]}
        />
      </div>
    </aside>
  );
}

function VisitorPresence({ status }: { status: "online" | "offline" }): JSX.Element {
  return <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-black ${status === "online" ? "bg-green-100 text-green-800" : "bg-slate-100 text-slate-600 dark:text-slate-400"}`}><span className={`h-2 w-2 rounded-full ${status === "online" ? "bg-success" : "bg-slate-400"}`} />Visitor {status}</span>;
}

function InfoLine({ icon, value }: { icon: ReactNode; value: string }): JSX.Element {
  return <div className="flex min-w-0 items-center gap-2">{icon}<span className="truncate">{value}</span></div>;
}

function InfoCard({ title, lines }: { title: string; lines: string[] }): JSX.Element {
  return <div className="rounded-lg border border-border bg-white p-4 shadow-sm dark:bg-slate-800 dark:shadow-none"><div className="font-black text-ink">{title}</div><div className="mt-2 grid gap-1.5 leading-6 text-slate-600 dark:text-slate-400">{lines.map((line) => <div key={line}>{line}</div>)}</div></div>;
}

function statusTone(status: Chat["status"]): string {
  if (status === "waiting") return "bg-yellow-100 text-yellow-800";
  if (status === "active") return "bg-green-100 text-green-800";
  if (status === "resolved" || status === "closed") return "bg-slate-100 text-slate-700 dark:text-slate-300";
  return "bg-orange-100 text-orange-800";
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

function formatTime(value: string): string {
  return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

function initials(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "V";
}

function Composer({
  reply,
  noteMode,
  cannedReplies,
  setReply,
  setNoteMode,
  send
}: {
  reply: string;
  noteMode: boolean;
  cannedReplies: string[];
  setReply: (value: string) => void;
  setNoteMode: (value: boolean) => void;
  send: () => void;
}): JSX.Element {
  return (
    <div className="shrink-0 border-t border-slate-200 bg-white px-3 py-3 dark:border-slate-700 dark:bg-slate-900 sm:px-4 lg:px-6 lg:py-4">
      <div className="mx-auto max-w-5xl rounded-lg border border-border bg-white p-3 shadow-soft dark:bg-slate-900">
        <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setNoteMode(!noteMode)}
            className={`inline-flex shrink-0 items-center gap-2 rounded-full px-3 py-1.5 text-xs font-black ${noteMode ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300" : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"}`}
          >
            <ShieldCheck size={14} /> {noteMode ? "Internal note" : "Public reply"}
          </button>
          <button className="inline-flex shrink-0 items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-black text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"><Paperclip size={14} />Attach</button>
          <button className="inline-flex shrink-0 items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-black text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"><FileUp size={14} />Upload</button>
          <button className="inline-flex shrink-0 items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-black text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"><Plus size={14} />More</button>
          {cannedReplies.map((item) => <button key={item} onClick={() => setReply(item)} className="shrink-0 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-black text-slate-600 hover:bg-slate-50 dark:bg-slate-800/50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">/{item.split(" ")[0].toLowerCase()}</button>)}
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <textarea
            className="min-h-24 flex-1 resize-none rounded-lg border-0 bg-slate-50 p-4 text-sm leading-6 outline-none ring-1 ring-border transition focus:bg-white focus:ring-4 focus:ring-blue-100 dark:bg-slate-800 dark:text-slate-100 dark:focus:bg-slate-800"
            placeholder={noteMode ? "Write an internal note. Customers cannot see this." : "Type your reply..."}
            value={reply}
            onChange={(event) => setReply(event.target.value)}
            onKeyDown={(event) => {
              if (event.ctrlKey && event.key === "Enter") send();
            }}
          />
          <button onClick={send} className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-black text-white shadow-lg shadow-blue-900/20 hover:bg-primary-hover sm:w-auto">
            <Send size={17} />Send
          </button>
        </div>
        <div className="mt-2 text-center text-[11px] font-semibold text-slate-400 dark:text-slate-500">Ctrl + Enter to send</div>
      </div>
    </div>
  );
}
