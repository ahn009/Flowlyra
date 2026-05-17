import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Bold,
  Check,
  CheckCheck,
  Clock,
  FileUp,
  Image,
  Italic,
  Link2,
  List,
  Mail,
  MapPin,
  MoreHorizontal,
  Paperclip,
  Pin,
  Plus,
  ScreenShare,
  Send,
  ShieldCheck,
  Sparkles,
  Tag,
  Trash2,
  UserRound,
  Video,
  Zap,
} from "lucide-react";
import toast from "react-hot-toast";

import { api } from "../lib/api";
import { activeSocket } from "../socket";
import { useAuthStore } from "../stores/authStore";
import { useChatStore } from "../stores/chatStore";
import type { Chat, Message, User } from "../types";

interface ChatDetail extends Chat {
  messages: Message[];
  contact?: { id: string; custom_attrs?: Record<string, unknown> } | null;
  visitor_session?: {
    ip_address?: string | null;
    country?: string | null;
    city?: string | null;
    current_url?: string | null;
    referrer?: string | null;
    page_views?: number | null;
    first_seen_at?: string | null;
    last_seen_at?: string | null;
    browser?: string | null;
    browser_version?: string | null;
    os?: string | null;
    device_type?: string | null;
    custom_variables?: Record<string, unknown>;
    page_history?: Array<{ url?: string; ts?: string }>;
  } | null;
  past_chats?: Array<{ id: string; subject?: string | null; status: string; updated_at?: string | null }>;
  tickets?: Array<{ id: string; ticket_number: number; subject: string; status: string; priority: string; updated_at?: string | null }>;
  ecommerce?: { lifetime_value?: string | number | null; orders?: string | number | null; last_order?: string | null } | null;
}

interface CannedResponse {
  id: string;
  shortcut: string;
  title: string;
  content: string;
  use_count?: number;
}

const QUICK_EMOJIS = ["👍", "✅", "🙏", "🙂", "🔥", "🎉"];

export function ChatPage(): JSX.Element {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const me = useAuthStore((state) => state.user);

  const [reply, setReply] = useState("");
  const [noteMode, setNoteMode] = useState(false);
  const [callMode, setCallMode] = useState<null | "video" | "screen">(null);
  const [callConnected, setCallConnected] = useState(false);
  const [shortcutOpen, setShortcutOpen] = useState(false);
  const [gifUrl, setGifUrl] = useState("");
  const [tagText, setTagText] = useState("");
  const [assignModal, setAssignModal] = useState(false);
  const [assignId, setAssignId] = useState("");
  const [snoozeMinutes, setSnoozeMinutes] = useState(30);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  const { data } = useQuery({
    queryKey: ["chat", id],
    queryFn: async () => (await api.get<ChatDetail>(`/chats/${id}`)).data,
    enabled: Boolean(id),
    refetchInterval: 2500,
  });
  const { data: agents = [] } = useQuery({ queryKey: ["agents", "chat"], queryFn: async () => (await api.get<User[]>("/agents")).data });
  const { data: canned = [] } = useQuery({ queryKey: ["canned"], queryFn: async () => (await api.get<CannedResponse[]>("/admin/canned-responses")).data });

  const liveMessages = useChatStore((state) => state.messages[id]) ?? [];
  const openChatTabs = useChatStore((state) => state.openChatTabs);
  const chatsById = useChatStore((state) => state.chats);
  const closeChatTab = useChatStore((state) => state.closeChatTab);
  const updateMessageInStore = useChatStore((state) => state.updateMessage);
  const setActiveChat = useChatStore((state) => state.setActiveChat);
  const preview = useChatStore((state) => state.typingPreview[id]);
  const suggestions = useChatStore((state) => state.aiSuggestions[id]) ?? [];

  const messages = useMemo(() => mergeMessages(data?.messages ?? [], liveMessages), [data?.messages, liveMessages]);
  const slashResults = useMemo(() => {
    const lines = reply.split("\n");
    const lastLine = lines[lines.length - 1] ?? "";
    if (!lastLine.startsWith("/")) return [];
    const query = lastLine.slice(1).trim().toLowerCase();
    return canned.filter((item) => (`${item.shortcut} ${item.title}`.toLowerCase().includes(query))).slice(0, 6);
  }, [reply, canned]);

  useEffect(() => {
    setActiveChat(id);
    activeSocket()?.emit("agent:join:chat", { chat_id: id });
    activeSocket()?.emit("chat:read", { chat_id: id });
    return () => {
      activeSocket()?.emit("agent:leave:chat", { chat_id: id });
      setActiveChat(null);
    };
  }, [id, setActiveChat]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "enter") {
        event.preventDefault();
        send();
        return;
      }
      if (event.key === "?" && !event.metaKey && !event.ctrlKey) {
        event.preventDefault();
        setShortcutOpen((value) => !value);
        return;
      }
      if (event.key.toLowerCase() === "r") {
        event.preventDefault();
        textareaRef.current?.focus();
        return;
      }
      if (event.key.toLowerCase() === "n") {
        event.preventDefault();
        setNoteMode((value) => !value);
        return;
      }
      if (event.key.toLowerCase() === "a") {
        event.preventDefault();
        setAssignModal(true);
        return;
      }
      if (event.key.toLowerCase() === "t") {
        event.preventDefault();
        document.getElementById("chat-tag-input")?.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  useEffect(() => () => endCall(), []);

  const refreshChat = async (): Promise<void> => {
    await queryClient.invalidateQueries({ queryKey: ["chat", id] });
    await queryClient.invalidateQueries({ queryKey: ["chats"] });
  };

  const quickAction = useMutation({
    mutationFn: async ({ path, payload }: { path: string; payload?: Record<string, unknown> }) => api.post(path, payload ?? {}),
    onSuccess: () => void refreshChat(),
    onError: () => toast.error("Action failed"),
  });

  const editMessage = useMutation({
    mutationFn: async ({ messageId, content }: { messageId: string; content: string }) => api.patch(`/chats/${id}/messages/${messageId}`, { content }),
    onSuccess: () => toast.success("Message edited"),
    onError: () => toast.error("Could not edit message"),
  });

  const deleteMessage = useMutation({
    mutationFn: async (messageId: string) => api.delete(`/chats/${id}/messages/${messageId}`),
    onSuccess: () => void refreshChat(),
    onError: () => toast.error("Could not delete message"),
  });

  const reactMessage = useMutation({
    mutationFn: async ({ messageId, emoji }: { messageId: string; emoji: string }) => (await api.post(`/chats/${id}/messages/${messageId}/react`, { emoji })).data as { reactions: Record<string, string[]> },
    onSuccess: (payload, vars) => updateMessageInStore(id, vars.messageId, { reactions: payload.reactions }),
  });

  const send = (): void => {
    if (!reply.trim()) return;
    if (noteMode) {
      void api.post(`/chats/${id}/note`, { content: reply }).then(() => {
        setReply("");
        void refreshChat();
      });
      return;
    }
    activeSocket()?.emit("chat:message", { organization_id: data?.organization_id, chat_id: id, content: reply, sender_type: "agent" });
    setReply("");
  };

  const useCanned = async (item: CannedResponse): Promise<void> => {
    const visitorName = data?.visitor_name || "Visitor";
    const visitorEmail = data?.visitor_email || "";
    const resolved = item.content
      .split("{{visitor.name}}").join(visitorName)
      .split("{{visitor.email}}").join(visitorEmail)
      .split("{{agent.name}}").join(me?.full_name || "Support");
    setReply((value) => value.replace(/(^|\n)\/[\w-]*\s*$/, `$1${resolved}`));
    try {
      await api.post(`/admin/canned-responses/${item.id}/use`);
    } catch {
      // no-op: usage stats are best-effort
    }
  };

  async function ensurePeer(mode: "video" | "screen"): Promise<RTCPeerConnection> {
    if (pcRef.current) return pcRef.current;
    const pc = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });
    pc.onicecandidate = (event) => {
      if (!event.candidate) return;
      activeSocket()?.emit("webrtc:signal", { chat_id: id, mode, signal: { type: "candidate", candidate: event.candidate } });
    };
    pc.ontrack = (event) => {
      const remote = event.streams[0];
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remote;
      setCallConnected(true);
    };
    pcRef.current = pc;
    return pc;
  }

  async function startCall(mode: "video" | "screen"): Promise<void> {
    try {
      const stream = mode === "screen"
        ? await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false })
        : await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      const pc = await ensurePeer(mode);
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      activeSocket()?.emit("webrtc:signal", { chat_id: id, mode, signal: { type: "offer", sdp: offer.sdp } });
      setCallMode(mode);
    } catch {
      toast.error("Could not start call");
    }
  }

  function endCall(): void {
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    pcRef.current?.close();
    pcRef.current = null;
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    setCallMode(null);
    setCallConnected(false);
  }

  async function uploadFile(file: File): Promise<void> {
    const form = new FormData();
    form.append("file", file);
    const response = await api.post("/upload/", form, { headers: { "Content-Type": "multipart/form-data" } });
    const uploaded = response.data as { file_url: string; file_name: string; file_size: number; file_mime: string };
    activeSocket()?.emit("chat:message", {
      organization_id: data?.organization_id,
      chat_id: id,
      content: uploaded.file_name,
      sender_type: "agent",
      content_type: "file",
      ...uploaded,
    });
    toast.success("File sent");
  }

  const applyMarkdown = (type: "bold" | "italic" | "link" | "list"): void => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = reply.slice(start, end) || "text";
    let insert = selected;
    if (type === "bold") insert = `**${selected}**`;
    if (type === "italic") insert = `_${selected}_`;
    if (type === "link") insert = `[${selected}](https://)`;
    if (type === "list") insert = `- ${selected}`;
    const next = `${reply.slice(0, start)}${insert}${reply.slice(end)}`;
    setReply(next);
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(start + insert.length, start + insert.length);
    });
  };

  const onPaste: React.ClipboardEventHandler<HTMLTextAreaElement> = (event) => {
    const file = Array.from(event.clipboardData.files)[0];
    if (file) {
      event.preventDefault();
      void uploadFile(file);
    }
  };

  const onDrop: React.DragEventHandler<HTMLTextAreaElement> = (event) => {
    event.preventDefault();
    const file = Array.from(event.dataTransfer.files)[0];
    if (file) void uploadFile(file);
  };

  const currentChat = data;

  return (
    <section className="min-h-[calc(100dvh-64px)] premium-surface">
      <OpenChatTabs
        tabs={openChatTabs}
        chatsById={chatsById}
        activeChatId={id}
        onOpen={(chatId) => navigate(`/inbox/chat/${chatId}`)}
        onClose={(chatId) => closeChatTab(chatId)}
      />
      <div className="grid min-h-[calc(100dvh-108px)] grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex min-h-[calc(100dvh-108px)] min-w-0 flex-col xl:h-[calc(100dvh-108px)]">
          <header className="border-b border-border bg-white/85 px-3 py-3 shadow-sm backdrop-blur-xl dark:bg-slate-950/85 sm:px-4 lg:px-6">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <button type="button" onClick={() => navigate("/inbox")} className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-border bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700" aria-label="Back to inbox" title="Back to inbox"><ArrowLeft size={16} /></button>
                <div className="relative grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-slate-950 font-black text-white shadow-sm dark:bg-white dark:text-slate-950">{initials(currentChat?.visitor_name || currentChat?.visitor_email || "Visitor")}<span className={`absolute -right-1 -top-1 h-3.5 w-3.5 rounded-full border-2 border-white ${currentChat?.visitor_status === "online" ? "bg-success" : "bg-slate-400"}`} /></div>
                <div className="min-w-0">
                  <div className="flex min-w-0 items-center gap-2">
                    <h1 className="truncate text-base font-black tracking-tight text-ink sm:text-lg">{currentChat?.visitor_name || currentChat?.visitor_email || "Website visitor"}</h1>
                    <span className={`rounded-lg px-2 py-1 text-[11px] font-black uppercase ${statusTone(currentChat?.status ?? "waiting")}`}>{currentChat?.status ?? "waiting"}</span>
                    {currentChat?.is_pinned ? <Pin size={14} className="text-blue-700" /> : null}
                  </div>
                  <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 dark:text-slate-400 sm:text-sm">
                    <span className="truncate">{currentChat?.subject || "Live chat"}</span>
                    <span className="hidden h-1 w-1 rounded-full bg-slate-300 sm:block" />
                    <span>{messages.length} messages</span>
                  </div>
                </div>
              </div>
              <div className="-mx-1 flex max-w-full shrink-0 items-center gap-2 overflow-x-auto px-1 pb-1">
                <Action icon={<Video size={16} />} label="Video" onClick={() => void startCall("video")} />
                <Action icon={<ScreenShare size={16} />} label="Share" onClick={() => void startCall("screen")} />
                <Action icon={<ScreenShare size={16} />} label="Co-browse" onClick={() => activeSocket()?.emit("cobrowse:request", { chat_id: id, mode: "screen" })} />
                {callMode ? <Action icon={<Trash2 size={16} />} label={callConnected ? "Hang up" : "Cancel"} onClick={endCall} /> : null}
                <Action icon={<Pin size={16} />} label={currentChat?.is_pinned ? "Unpin" : "Pin"} onClick={() => quickAction.mutate({ path: `/chats/${id}/${currentChat?.is_pinned ? "unpin" : "pin"}` })} />
                <Action icon={<Clock size={16} />} label="Snooze" onClick={() => quickAction.mutate({ path: `/chats/${id}/snooze`, payload: { minutes: snoozeMinutes } })} />
                <Action icon={<Tag size={16} />} label="Assign" onClick={() => setAssignModal(true)} />
                <button className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-bold text-white shadow-sm hover:bg-blue-800" onClick={() => quickAction.mutate({ path: `/chats/${id}/resolve` })}><Check size={16} />Resolve</button>
              </div>
            </div>
          </header>

          <div className="min-h-0 flex-1 overflow-hidden px-3 py-3 sm:px-4 lg:px-6 lg:py-5">
            <div className="mx-auto flex h-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-border bg-white shadow-sm dark:bg-slate-900">
              <div className="border-b border-border bg-white px-5 py-3 dark:bg-slate-900">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-200"><ShieldCheck size={16} className="text-green-600" /> Human conversation</div>
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                    <button className="rounded border border-border px-2 py-1 hover:bg-slate-50" onClick={() => setShortcutOpen(true)}>Shortcuts (?)</button>
                    <button className="rounded border border-border px-2 py-1 hover:bg-slate-50" onClick={() => quickAction.mutate({ path: `/chats/${id}/convert-ticket` })}>Convert to ticket</button>
                    <button className="rounded border border-border px-2 py-1 hover:bg-slate-50" onClick={() => quickAction.mutate({ path: `/chats/${id}/spam` })}>Mark spam</button>
                    <button className="rounded border border-border px-2 py-1 hover:bg-slate-50" onClick={() => quickAction.mutate({ path: `/chats/${id}/ban` })}>Ban visitor</button>
                  </div>
                </div>
              </div>

              {preview && <div className="border-b border-blue-100 bg-blue-50 px-5 py-3 text-sm text-blue-950 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-200"><div className="mb-1 flex items-center gap-2 font-black"><Zap size={16} /> Visitor is typing now</div><div className="line-clamp-2 italic">{preview}</div></div>}
              {callMode && (
                <div className="border-b border-purple-100 bg-purple-50 px-5 py-3 dark:border-purple-900 dark:bg-purple-950/20">
                  <div className="mb-2 text-xs font-black uppercase tracking-wide text-purple-800 dark:text-purple-300">{callMode} call {callConnected ? "connected" : "connecting..."}</div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <video ref={localVideoRef} autoPlay muted playsInline className="w-full rounded-xl bg-slate-900" />
                    <video ref={remoteVideoRef} autoPlay playsInline className="w-full rounded-xl bg-slate-900" />
                  </div>
                </div>
              )}

              <div className="min-h-[260px] flex-1 overflow-y-auto bg-slate-50 p-3 dark:bg-slate-950">
                {messages.length > 0 ? messages.map((message) => (
                  <MessageRow
                    key={message.id}
                    message={message}
                    currentUserId={me?.id}
                    onReact={(emoji) => reactMessage.mutate({ messageId: message.id, emoji })}
                    onEdit={(content) => editMessage.mutate({ messageId: message.id, content })}
                    onDelete={() => deleteMessage.mutate(message.id)}
                  />
                )) : <EmptyConversation />}
              </div>

              {suggestions.length > 0 && (
                <div className="border-t border-blue-100 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900">
                  <div className="mb-2 flex items-center gap-2 text-sm font-black text-primary"><Sparkles size={16} /> Suggested replies</div>
                  <div className="flex flex-wrap gap-2">{suggestions.map((item) => <button key={item} onClick={() => setReply(item)} className="rounded-full border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-bold text-primary hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-900/20 dark:hover:bg-blue-900/40">{item}</button>)}</div>
                </div>
              )}
            </div>
          </div>

          <div className="shrink-0 border-t border-slate-200 bg-white px-3 py-3 dark:border-slate-700 dark:bg-slate-900 sm:px-4 lg:px-6 lg:py-4">
            <div className="mx-auto max-w-5xl rounded-2xl border border-border bg-white p-3 shadow-sm dark:bg-slate-900">
              <div className="mb-2 flex flex-wrap gap-2">
                <button onClick={() => setNoteMode(!noteMode)} className={`inline-flex shrink-0 items-center gap-2 rounded-full px-3 py-1.5 text-xs font-black ${noteMode ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300" : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"}`}><ShieldCheck size={14} /> {noteMode ? "Internal note" : "Public reply"}</button>
                <button onClick={() => applyMarkdown("bold")} className="rounded-full border border-border px-3 py-1.5 text-xs font-black"><Bold size={14} /></button>
                <button onClick={() => applyMarkdown("italic")} className="rounded-full border border-border px-3 py-1.5 text-xs font-black"><Italic size={14} /></button>
                <button onClick={() => applyMarkdown("list")} className="rounded-full border border-border px-3 py-1.5 text-xs font-black"><List size={14} /></button>
                <button onClick={() => applyMarkdown("link")} className="rounded-full border border-border px-3 py-1.5 text-xs font-black"><Link2 size={14} /></button>
                {QUICK_EMOJIS.map((emoji) => <button key={emoji} onClick={() => setReply((v) => `${v}${emoji}`)} className="rounded-full border border-border px-2 py-1 text-xs">{emoji}</button>)}
                <input id="chat-tag-input" value={tagText} onChange={(e) => setTagText(e.target.value)} placeholder="tag" className="h-8 w-24 rounded-full border border-border px-2 text-xs" />
                <button className="rounded-full border border-border px-2 py-1 text-xs" onClick={() => tagText.trim() && quickAction.mutate({ path: `/chats/${id}/tag`, payload: { tag: tagText.trim() } })}>Tag</button>
                <input value={gifUrl} onChange={(e) => setGifUrl(e.target.value)} placeholder="GIF URL" className="h-8 w-40 rounded-full border border-border px-2 text-xs" />
                <button className="rounded-full border border-border px-2 py-1 text-xs" onClick={() => gifUrl.trim() && activeSocket()?.emit("chat:message", { organization_id: data?.organization_id, chat_id: id, content: gifUrl, sender_type: "agent", content_type: "image", file_url: gifUrl, file_name: "GIF" })}><Image size={13} /></button>
                <input id="agent-chat-upload" className="hidden" type="file" onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void uploadFile(file);
                  event.currentTarget.value = "";
                }} />
                <label htmlFor="agent-chat-upload" className="inline-flex shrink-0 cursor-pointer items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-black text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"><Paperclip size={14} />Attach</label>
                <label htmlFor="agent-chat-upload" className="inline-flex shrink-0 cursor-pointer items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-black text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"><FileUp size={14} />Upload</label>
                <button className="inline-flex shrink-0 items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-black text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"><Plus size={14} />More</button>
                {canned.slice(0, 6).map((item) => <button key={item.id} onClick={() => void useCanned(item)} className="shrink-0 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-black text-slate-600 hover:bg-slate-50 dark:bg-slate-800/50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">/{item.shortcut}</button>)}
              </div>
              {slashResults.length > 0 && (
                <div className="mb-2 rounded-lg border border-blue-200 bg-blue-50 p-2 text-xs">
                  {slashResults.map((item) => (
                    <button key={item.id} onClick={() => void useCanned(item)} className="mr-2 rounded border border-blue-200 bg-white px-2 py-1 font-semibold">/{item.shortcut} - {item.title}</button>
                  ))}
                </div>
              )}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <textarea
                  ref={textareaRef}
                  className="min-h-24 flex-1 resize-none rounded-2xl border-0 bg-slate-50 p-4 text-sm leading-6 outline-none ring-1 ring-border transition focus:bg-white focus:ring-4 focus:ring-blue-100 dark:bg-slate-800 dark:text-slate-100 dark:focus:bg-slate-800"
                  placeholder={noteMode ? "Write an internal note. Customers cannot see this." : "Type your reply..."}
                  value={reply}
                  onChange={(event) => setReply(event.target.value)}
                  onPaste={onPaste}
                  onDrop={onDrop}
                  onDragOver={(event) => event.preventDefault()}
                />
                <button onClick={send} className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-slate-950 px-6 text-sm font-black text-white shadow-sm transition hover:bg-slate-800 dark:bg-white dark:text-slate-950 sm:w-auto"><Send size={17} />Send</button>
              </div>
              <div className="mt-2 text-center text-[11px] font-semibold text-slate-400 dark:text-slate-500">Ctrl/Cmd + Enter send • R reply • A assign • T tag • N note • ? shortcuts</div>
            </div>
          </div>
        </div>

        <VisitorPanel chat={currentChat} />
      </div>

      {shortcutOpen ? <ShortcutsModal onClose={() => setShortcutOpen(false)} /> : null}
      {assignModal ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={() => setAssignModal(false)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-4" onClick={(e) => e.stopPropagation()}>
            <div className="mb-2 text-sm font-black">Assign chat</div>
            <select className="h-10 w-full rounded border border-border px-2" value={assignId} onChange={(e) => setAssignId(e.target.value)}>
              <option value="">Select agent</option>
              {agents.map((agent) => <option key={agent.id} value={agent.id}>{agent.full_name}</option>)}
            </select>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <input type="number" className="h-10 rounded border border-border px-2" value={String(snoozeMinutes)} onChange={(e) => setSnoozeMinutes(Number(e.target.value || 30))} />
              <button className="rounded bg-slate-900 px-3 py-2 text-sm font-bold text-white" onClick={() => {
                if (!assignId) return;
                void api.post(`/chats/${id}/assign`, { assigned_user_id: assignId }).then(() => {
                  setAssignModal(false);
                  toast.success("Assigned");
                  void refreshChat();
                });
              }}>Assign</button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function OpenChatTabs({
  tabs,
  chatsById,
  activeChatId,
  onOpen,
  onClose,
}: {
  tabs: string[];
  chatsById: Record<string, Chat>;
  activeChatId: string;
  onOpen: (chatId: string) => void;
  onClose: (chatId: string) => void;
}): JSX.Element {
  if (!tabs.length) return <div className="border-b border-border bg-white px-3 py-2 text-xs font-semibold text-slate-500">No open chat tabs</div>;
  return (
    <div className="border-b border-border bg-white px-3 py-2">
      <div className="flex gap-2 overflow-x-auto">
        {tabs.map((tabId) => {
          const chat = chatsById[tabId];
          return (
            <div key={tabId} className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs ${tabId === activeChatId ? "border-slate-950 bg-slate-950 text-white" : "border-border bg-slate-50"}`}>
              <button onClick={() => onOpen(tabId)} className="font-bold">{chat?.visitor_name || chat?.visitor_email || `Chat ${tabId.slice(0, 6)}`}</button>
              <button onClick={() => onClose(tabId)} className="opacity-80">x</button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function mergeMessages(serverMessages: Message[], liveMessages: Message[]): Message[] {
  const byId = new Map<string, Message>();
  for (const message of serverMessages) byId.set(message.id, message);
  for (const message of liveMessages) byId.set(message.id, { ...byId.get(message.id), ...message });
  return [...byId.values()].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
}

function MessageRow({
  message,
  currentUserId,
  onReact,
  onEdit,
  onDelete,
}: {
  message: Message;
  currentUserId?: string;
  onReact: (emoji: string) => void;
  onEdit: (content: string) => void;
  onDelete: () => void;
}): JSX.Element {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(message.content ?? "");
  if (message.is_internal) return <div className="px-2 py-3 text-center text-sm text-amber-800 sm:px-8"><span className="inline-block max-w-full rounded-full border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20 px-3 py-2 font-semibold">Internal note: {message.content}</span></div>;
  const mine = message.sender_type === "agent";
  const canModify = mine && !!currentUserId && !message.deleted_at;
  const reactionEntries = Object.entries(message.reactions ?? {});
  return (
    <div className={`group flex items-end gap-2 px-1 py-2 sm:gap-3 sm:px-5 sm:py-3 ${mine ? "justify-start" : "justify-end"}`}>
      {mine && <div className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-blue-600 text-[10px] font-black text-white shadow-sm sm:h-8 sm:w-8 sm:rounded-xl sm:text-xs">AG</div>}
      <div className={`max-w-[82%] overflow-hidden break-words rounded-xl px-3 py-2 text-sm leading-6 shadow-sm sm:max-w-[72%] sm:rounded-2xl sm:px-4 sm:py-3 ${mine ? "rounded-bl-md bg-blue-600 text-white" : "rounded-br-md border border-slate-200 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"}`}>
        {mine && <div className="mb-1 text-[11px] font-black uppercase tracking-wide text-blue-100">Support agent</div>}
        {editing ? (
          <div>
            <textarea className="w-full rounded bg-white/90 p-2 text-slate-900" value={draft} onChange={(e) => setDraft(e.target.value)} />
            <div className="mt-1 flex gap-2">
              <button className="rounded bg-white px-2 py-1 text-xs font-bold text-slate-900" onClick={() => {
                onEdit(draft);
                setEditing(false);
              }}>Save</button>
              <button className="rounded border border-white/70 px-2 py-1 text-xs" onClick={() => setEditing(false)}>Cancel</button>
            </div>
          </div>
        ) : message.file_url ? <a className="font-black underline underline-offset-4" href={message.file_url} target="_blank" rel="noreferrer">📎 {message.file_name ?? message.content ?? "Attachment"}</a> : message.content}
        <div className={`mt-1 flex items-center gap-2 text-[10px] font-semibold ${mine ? "text-blue-100" : "text-slate-400 dark:text-slate-500"}`}>
          <span>{formatTime(message.created_at)}</span>
          {message.edited_at ? <span>edited</span> : null}
          {mine ? <span className="inline-flex items-center gap-1">{message.is_read ? <CheckCheck size={12} /> : <Check size={12} />} {message.is_read ? "read" : "sent"}</span> : null}
        </div>
        <div className="mt-1 flex flex-wrap gap-1">
          {reactionEntries.map(([emoji, users]) => <button key={emoji} onClick={() => onReact(emoji)} className="rounded-full border border-white/50 px-2 text-[11px]">{emoji} {users.length}</button>)}
          {QUICK_EMOJIS.slice(0, 3).map((emoji) => <button key={emoji} onClick={() => onReact(emoji)} className="rounded-full border border-white/40 px-2 text-[11px] opacity-80">{emoji}</button>)}
        </div>
      </div>
      {!mine && <div className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-slate-200 text-[10px] font-black text-slate-700 sm:h-8 sm:w-8 sm:rounded-xl sm:text-xs">V</div>}
      {canModify && (
        <div className="opacity-0 transition group-hover:opacity-100">
          <button className="mr-1 rounded border border-border bg-white px-2 py-1 text-xs" onClick={() => setEditing(true)}>Edit</button>
          <button className="rounded border border-red-300 bg-white px-2 py-1 text-xs text-red-600" onClick={onDelete}>Delete</button>
        </div>
      )}
    </div>
  );
}

function EmptyConversation(): JSX.Element {
  return <div className="grid min-h-full place-items-center px-4 py-10 text-center text-sm font-semibold text-slate-500 dark:text-slate-400">No messages yet.</div>;
}

function Action({ icon, label, onClick }: { icon: ReactNode; label: string; onClick?: () => void }): JSX.Element {
  return <button onClick={onClick} className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-slate-200 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50">{icon}{label}</button>;
}

function VisitorPanel({ chat }: { chat?: ChatDetail }): JSX.Element {
  const location = [chat?.visitor_session?.city, chat?.visitor_session?.country].filter(Boolean).join(", ");
  const customVariables = chat?.visitor_session?.custom_variables ?? {};
  const customAttrs = chat?.contact?.custom_attrs ?? {};
  const pageTrail = (chat?.visitor_session?.page_history ?? []).slice(-10).reverse();

  return (
    <aside className="border-t border-border bg-white p-3 dark:bg-slate-900 sm:p-5 xl:h-[calc(100dvh-108px)] xl:overflow-auto xl:border-l xl:border-t-0">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-black uppercase tracking-wide text-slate-500 dark:text-slate-400">Customer 360</h2>
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
          <InfoLine icon={<UserRound size={15} />} value={`${chat?.visitor_session?.browser || "browser"} on ${chat?.visitor_session?.os || "OS"}`} />
        </div>
      </div>

      <div className="mt-4 grid gap-3 text-sm text-slate-600 dark:text-slate-300">
        <InfoCard title="Custom variables" lines={objectToLines(customVariables)} />
        <InfoCard title="Contact attributes" lines={objectToLines(customAttrs)} />
        <InfoCard title="Ecommerce" lines={objectToLines(chat?.ecommerce ?? {})} />
        <InfoCard title="Past chats" lines={(chat?.past_chats ?? []).map((item) => `${item.status.toUpperCase()} · ${item.subject || "Live chat"}`)} />
        <InfoCard title="Tickets" lines={(chat?.tickets ?? []).map((item) => `#${item.ticket_number} · ${item.status} · ${item.subject}`)} />
        <InfoCard title="Page trail" lines={pageTrail.map((item) => `${item.url || "Unknown page"}${item.ts ? ` · ${formatDate(item.ts)}` : ""}`)} />
      </div>
    </aside>
  );
}

function ShortcutsModal({ onClose }: { onClose: () => void }): JSX.Element {
  const shortcuts = [
    "? Open shortcut panel",
    "R Focus reply box",
    "A Assign chat",
    "T Focus tag input",
    "N Toggle note mode",
    "Ctrl/Cmd + Enter Send",
  ];
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white p-4" onClick={(e) => e.stopPropagation()}>
        <div className="mb-2 text-sm font-black">Keyboard shortcuts</div>
        <div className="grid gap-2 text-sm">{shortcuts.map((item) => <div key={item} className="rounded border border-border px-3 py-2">{item}</div>)}</div>
      </div>
    </div>
  );
}

function VisitorPresence({ status }: { status: "online" | "offline" }): JSX.Element {
  return <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-black ${status === "online" ? "bg-green-100 text-green-800" : "bg-slate-100 text-slate-600 dark:text-slate-400"}`}><span className={`h-2 w-2 rounded-full ${status === "online" ? "bg-success" : "bg-slate-400"}`} />Visitor {status}</span>;
}

function InfoLine({ icon, value }: { icon: ReactNode; value: string }): JSX.Element {
  return <div className="flex min-w-0 items-center gap-2">{icon}<span className="truncate">{value}</span></div>;
}

function InfoCard({ title, lines }: { title: string; lines: string[] }): JSX.Element {
  return <div className="rounded-lg border border-border bg-white p-4 shadow-sm dark:bg-slate-800 dark:shadow-none"><div className="font-black text-ink">{title}</div><div className="mt-2 grid gap-1.5 leading-6 text-slate-600 dark:text-slate-400">{lines.length ? lines.map((line) => <div key={line}>{line}</div>) : <div className="text-slate-400">No data</div>}</div></div>;
}

function objectToLines(value: Record<string, unknown>): string[] {
  return Object.entries(value).slice(0, 10).map(([k, v]) => `${k}: ${String(v)}`);
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
