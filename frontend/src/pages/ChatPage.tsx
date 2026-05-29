import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { VisitorMap } from "../components/VisitorMap";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { CopilotPanel } from "../components/CopilotPanel";
import {
  ArrowLeft,
  Check,
  CheckCheck,
  ChevronDown,
  Clock,
  Globe2,
  Link2,
  MapPin,
  MessageSquare,
  MoreHorizontal,
  Paperclip,
  Pin,
  Search,
  Plus,
  ScreenShare,
  SendHorizontal,
  SmilePlus,
  Sparkles,
  StickyNote,
  Tag,
  UserRound,
  Video,
  X,
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
  ecommerce?: {
    lifetime_value?: string | number | null;
    orders?: string | number | null;
    last_order?: string | null;
    attributed_revenue?: string | number | null;
    refunded_revenue?: string | number | null;
    net_revenue?: string | number | null;
    lead_score?: string | number | null;
    churn_risk?: string | number | null;
  } | null;
}

interface CannedResponse {
  id: string;
  shortcut: string;
  title: string;
  content: string;
  use_count?: number;
}

interface ProductCatalogItem {
  id: string;
  sku?: string | null;
  name: string;
  description?: string | null;
  price?: number | null;
  currency?: string | null;
  image_url?: string | null;
  product_url?: string | null;
  category?: string | null;
  brand?: string | null;
}

type ChatListView = "my" | "queued" | "supervised";

const CHAT_LIST_LABELS: Record<ChatListView, string> = {
  my: "My chats",
  queued: "Queued",
  supervised: "Supervised",
};

function numberFromCustomVariable(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

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
  const [tagText, setTagText] = useState("");
  const [assignModal, setAssignModal] = useState(false);
  const [assignId, setAssignId] = useState("");
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [ghostText, setGhostText] = useState("");
  const [productPanelOpen, setProductPanelOpen] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const [couponPanelOpen, setCouponPanelOpen] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [couponDiscountText, setCouponDiscountText] = useState("");
  const [couponMessage, setCouponMessage] = useState("");
  const [chatListView, setChatListView] = useState<ChatListView>("my");
  const [chatListSearch, setChatListSearch] = useState("");
  const [visitorPanelOpen, setVisitorPanelOpen] = useState(false);

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
  const { data: chatListData = [] } = useQuery({
    queryKey: ["chats", "agent-chat-list", chatListView, chatListSearch],
    queryFn: async () => (await api.get<Chat[]>("/chats", { params: { view: chatListView, q: chatListSearch || undefined } })).data,
    refetchInterval: 2500,
  });
  const { data: agents = [] } = useQuery({ queryKey: ["agents", "chat"], queryFn: async () => (await api.get<User[]>("/agents")).data });
  const { data: canned = [] } = useQuery({ queryKey: ["canned"], queryFn: async () => (await api.get<CannedResponse[]>("/admin/canned-responses")).data });
  const normalizedProductSearch = productSearch.trim();
  const { data: searchedProducts, isFetching: searchingProducts } = useQuery({
    queryKey: ["ecommerce", "products", "search", id, normalizedProductSearch],
    queryFn: async () => (await api.get<{ items: ProductCatalogItem[] }>("/ecommerce/products", { params: { q: normalizedProductSearch, limit: 8 } })).data,
    enabled: productPanelOpen && normalizedProductSearch.length > 0,
    staleTime: 10_000,
  });
  const { data: recommendedProducts, isFetching: loadingRecommendations, refetch: refetchRecommendations } = useQuery({
    queryKey: ["ecommerce", "products", "recommendations", id, normalizedProductSearch],
    queryFn: async () => (
      await api.get<{ items: ProductCatalogItem[] }>("/ecommerce/products/recommendations", {
        params: {
          chat_id: id,
          query: normalizedProductSearch || undefined,
          limit: 8,
        },
      })
    ).data,
    enabled: productPanelOpen && normalizedProductSearch.length === 0,
    staleTime: 10_000,
  });

  const liveMessages = useChatStore((state) => state.messages[id]) ?? [];
  const chatsById = useChatStore((state) => state.chats);
  const unreadCounts = useChatStore((state) => state.unreadCounts);
  const updateMessageInStore = useChatStore((state) => state.updateMessage);
  const setActiveChat = useChatStore((state) => state.setActiveChat);
  const preview = useChatStore((state) => state.typingPreview[id]);
  const suggestions = useChatStore((state) => state.aiSuggestions[id]) ?? [];

  const messages = useMemo(() => mergeMessages(data?.messages ?? [], liveMessages), [data?.messages, liveMessages]);
  const chatListRows = useMemo(
    () => mergeChatListRows(chatListData, Object.values(chatsById), data),
    [chatListData, chatsById, data],
  );
  const slashResults = useMemo(() => {
    const lines = reply.split("\n");
    const lastLine = lines[lines.length - 1] ?? "";
    if (!lastLine.startsWith("/")) return [];
    const query = lastLine.slice(1).trim().toLowerCase();
    return canned.filter((item) => (`${item.shortcut} ${item.title}`.toLowerCase().includes(query))).slice(0, 6);
  }, [reply, canned]);
  const productItems = useMemo(() => {
    if (normalizedProductSearch.length > 0) return searchedProducts?.items ?? [];
    return recommendedProducts?.items ?? [];
  }, [normalizedProductSearch, searchedProducts?.items, recommendedProducts?.items]);

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
  const sendCoupon = useMutation({
    mutationFn: async () => api.post("/ecommerce/coupons/send", {
      chat_id: id,
      code: couponCode.trim(),
      discount_text: couponDiscountText.trim() || null,
      message: couponMessage.trim() || null,
    }),
    onSuccess: () => {
      setCouponCode("");
      setCouponDiscountText("");
      setCouponMessage("");
      setCouponPanelOpen(false);
      toast.success("Coupon delivered");
    },
    onError: () => toast.error("Could not send coupon"),
  });
  const checkoutAssist = useMutation({
    mutationFn: async () => api.post(`/ecommerce/chats/${id}/checkout-assist`, { enabled: true, mode: "guided" }),
    onSuccess: () => toast.success("Checkout assist enabled"),
    onError: () => toast.error("Could not enable checkout assist"),
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

  const downloadTranscript = async (): Promise<void> => {
    try {
      const response = await api.get(`/chats/${id}/transcript.txt`, { responseType: "blob" });
      const url = URL.createObjectURL(response.data as Blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `flowlyra-chat-${id}.txt`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Could not download transcript");
    }
  };

  const emailTranscript = async (): Promise<void> => {
    try {
      await api.post(`/chats/${id}/transcript/email`, { email: data?.visitor_email || undefined });
      toast.success(data?.visitor_email ? "Transcript emailed" : "Transcript email queued/skipped");
    } catch {
      toast.error("Could not email transcript");
    }
  };

  const sendProductCard = (product: ProductCatalogItem): void => {
    const payload = {
      type: "product_card",
      product: {
        id: product.id,
        sku: product.sku,
        name: product.name,
        description: product.description,
        price: product.price,
        currency: product.currency || "USD",
        image_url: product.image_url,
        product_url: product.product_url,
        category: product.category,
        brand: product.brand,
      },
    };
    activeSocket()?.emit("chat:message", {
      organization_id: data?.organization_id,
      chat_id: id,
      content: JSON.stringify(payload),
      sender_type: "agent",
      content_type: "product_card",
    });
    toast.success(`Sent ${product.name}`);
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
    <section className="flex min-h-[calc(100dvh-56px)] flex-col overflow-x-auto bg-[#f4f6f8] text-navy-700">
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-navy-100 bg-white px-4">
        <div className="flex min-w-0 items-center gap-3">
          <button
            onClick={() => setShortcutOpen(true)}
            className="hidden sm:flex w-40 sm:w-64 items-center gap-2 rounded-md border border-navy-100 bg-navy-50 px-3 py-1.5 text-sm text-navy-400 transition hover:border-navy-200 hover:bg-white"
          >
            <Search size={14} />
            <span className="flex-1 text-left">Search chats, tickets, visitors</span>
            <kbd className="rounded border border-navy-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold leading-none text-navy-400">⌘K</kbd>
          </button>
          <div className="hidden items-center gap-2 text-xs font-medium text-navy-400 md:flex">
            <span className="h-2 w-2 rounded-full bg-success-500" />
            Chats workspace
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1.5 rounded-md border border-navy-200 bg-white px-3 py-1.5 text-sm font-medium text-navy-600 transition hover:bg-navy-50">
            <Plus size={14} /> Invite
          </button>
          <div className="relative grid h-8 w-8 place-items-center rounded-full bg-brand-500 text-xs font-semibold text-white">
            {initials(me?.full_name || "MT")}
            <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-success-500" />
          </div>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 overflow-y-hidden xl:grid-cols-[320px_minmax(0,1fr)]">
        <ChatListPane
          rows={chatListRows}
          activeChatId={id}
          unreadCounts={unreadCounts}
          view={chatListView}
          search={chatListSearch}
          onViewChange={setChatListView}
          onSearchChange={setChatListSearch}
          onOpen={(chatId) => navigate(`/inbox/chat/${chatId}`)}
        />

        <div className="flex min-h-0 flex-col border-l border-navy-100 bg-white">
          {/* Chat header */}
          <header className="flex shrink-0 items-center justify-between border-b border-navy-100 bg-white px-5 py-3">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={() => navigate("/inbox")}
                className="flex shrink-0 items-center gap-1 text-sm font-semibold text-navy-400 transition hover:text-navy-600"
              >
                <ArrowLeft size={15} /> Back
              </button>
              <div className="relative shrink-0">
                <div className="grid h-9 w-9 place-items-center rounded-full bg-brand-500 text-xs font-black text-white shadow-sm">
                  {initials(currentChat?.visitor_name || currentChat?.visitor_email || "V")}
                </div>
                <span className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white ${currentChat?.visitor_status === "online" ? "bg-success-500" : "bg-navy-300"}`} />
              </div>
              <div className="min-w-0">
                <h1 className="truncate text-sm font-semibold text-navy-700">
                  {currentChat?.visitor_name || currentChat?.visitor_email || "Website visitor"}
                </h1>
                <div className="flex items-center gap-1.5 text-xs text-navy-400">
                  <span className={`h-1.5 w-1.5 rounded-full ${currentChat?.visitor_status === "online" ? "bg-success-500" : "bg-navy-300"}`} />
                  {currentChat?.visitor_status === "online" ? "Online" : "Offline"}
                  <span className="h-1 w-1 rounded-full bg-navy-200" />
                  <span>{currentChat?.created_at ? formatDate(currentChat.created_at) : "—"}</span>
                </div>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <button
                className={`flex h-8 w-8 items-center justify-center rounded-md transition hover:bg-navy-50 ${visitorPanelOpen ? "bg-brand-50 text-brand-500" : "text-navy-400 hover:text-navy-600"}`}
                title="Visitor details"
                onClick={() => setVisitorPanelOpen((v) => !v)}
              ><UserRound size={15} /></button>
              <button className="flex h-8 w-8 items-center justify-center rounded-md text-navy-400 transition hover:bg-navy-50 hover:text-navy-600" title="Copy link"><Link2 size={15} /></button>
              <button className="flex h-8 w-8 items-center justify-center rounded-md text-navy-400 transition hover:bg-navy-50 hover:text-navy-600" title="More options"><MoreHorizontal size={15} /></button>
              <div className="mx-1 h-4 w-px bg-navy-100" />
              <button className="flex h-8 w-8 items-center justify-center rounded-md text-navy-400 transition hover:bg-navy-50 hover:text-navy-600" onClick={() => void startCall("video")} title="Video call"><Video size={15} /></button>
              <button className="flex h-8 w-8 items-center justify-center rounded-md text-navy-400 transition hover:bg-navy-50 hover:text-navy-600" onClick={() => void startCall("screen")} title="Screen share"><ScreenShare size={15} /></button>
              <button className="flex h-8 w-8 items-center justify-center rounded-md text-navy-400 transition hover:bg-navy-50 hover:text-navy-600" onClick={() => setAssignModal(true)} title="Assign"><UserRound size={15} /></button>
              <button className="flex h-8 items-center gap-1 rounded-md px-2 text-xs font-semibold text-navy-400 transition hover:bg-navy-50 hover:text-navy-600" onClick={() => void downloadTranscript()} title="Download transcript"><Link2 size={14} /> Transcript</button>
              <button className="flex h-8 items-center gap-1 rounded-md px-2 text-xs font-semibold text-navy-400 transition hover:bg-navy-50 hover:text-navy-600" onClick={() => void emailTranscript()} title="Email transcript"><MessageSquare size={14} /> Email</button>
              <div className="mx-1 h-4 w-px bg-navy-100" />
              <button
                className="flex items-center gap-1.5 rounded-lg bg-success-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-success-700"
                onClick={() => quickAction.mutate({ path: `/chats/${id}/resolve` })}
              >
                <Check size={13} /> Resolve
              </button>
            </div>
          </header>

          {/* Typing preview */}
          {preview && (
            <div className="shrink-0 border-b border-brand-100 bg-brand-50/60 px-5 py-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-brand-600">
                <Zap size={13} /> Visitor is typing...
              </div>
              <div className="mt-0.5 line-clamp-1 text-xs italic text-brand-400">{preview}</div>
            </div>
          )}

          {/* Call panel */}
          {callMode && (
            <div className="shrink-0 border-b border-purple-100 bg-purple-50 px-5 py-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wide text-purple-600">
                  {callMode} call {callConnected ? "• connected" : "• connecting..."}
                </span>
                <button onClick={endCall} className="rounded-lg bg-danger-50 px-3 py-1 text-xs font-bold text-danger-600 hover:bg-danger-100">
                  End call
                </button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <video ref={localVideoRef} autoPlay muted playsInline className="w-full rounded-xl bg-navy-100" />
                <video ref={remoteVideoRef} autoPlay playsInline className="w-full rounded-xl bg-navy-100" />
              </div>
            </div>
          )}

          {/* Messages */}
          <div className="min-h-0 flex-1 overflow-y-auto bg-navy-50/50 px-5 py-4">
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

          {/* AI Suggestions */}
          {suggestions.length > 0 && (
            <div className="shrink-0 border-t border-navy-100 bg-white px-4 py-2.5">
              <div className="mb-1.5 flex items-center gap-1.5">
                <Sparkles size={12} className="text-purple-500" />
                <span className="text-[10px] font-semibold uppercase tracking-wider text-purple-500">AI suggestions</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {suggestions.map((item) => (
                  <button
                    key={item}
                    onClick={() => setReply(item)}
                    className="max-w-[220px] truncate rounded-full border border-purple-200 bg-purple-50 px-3 py-1.5 text-xs font-medium text-purple-700 transition hover:border-purple-300 hover:bg-purple-100"
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input area */}
          <div className="shrink-0 border-t border-navy-100 bg-white">
            {/* Product panel */}
            {productPanelOpen && (
              <div className="border-b border-navy-100 p-3">
                <div className="mb-2 flex gap-2">
                  <input
                    value={productSearch}
                    onChange={(event) => setProductSearch(event.target.value)}
                    placeholder="Search products..."
                    className="h-9 flex-1 rounded-lg border border-navy-200 bg-navy-50 px-3 text-sm text-navy-700 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30"
                  />
                  <button
                    type="button"
                    onClick={() => void refetchRecommendations()}
                    className="h-9 shrink-0 rounded-lg border border-navy-200 bg-white px-3 text-xs font-semibold text-navy-600 hover:bg-navy-50"
                  >
                    Refresh
                  </button>
                </div>
                <div className="max-h-40 overflow-y-auto">
                  {searchingProducts || loadingRecommendations ? (
                    <div className="py-2 text-xs text-navy-400">Loading...</div>
                  ) : (
                    <div className="grid gap-1.5">
                      {productItems.map((product) => (
                        <button
                          key={product.id}
                          type="button"
                          onClick={() => sendProductCard(product)}
                          className="flex items-center justify-between rounded-lg border border-navy-100 bg-white px-3 py-2 text-left hover:bg-navy-50"
                        >
                          <div className="min-w-0">
                            <div className="truncate text-sm font-semibold text-navy-700">{product.name}</div>
                            <div className="truncate text-xs text-navy-400">{product.sku || product.category}</div>
                          </div>
                          <div className="ml-3 shrink-0 text-xs font-bold text-success-600">{formatMoney(product.price, product.currency)}</div>
                        </button>
                      ))}
                      {productItems.length === 0 && <div className="py-2 text-xs text-navy-400">No products found.</div>}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Coupon panel */}
            {couponPanelOpen && (
              <div className="border-b border-navy-100 p-3">
                <div className="grid gap-2 sm:grid-cols-2">
                  <input value={couponCode} onChange={(e) => setCouponCode(e.target.value)} placeholder="Coupon code" className="h-9 rounded-lg border border-navy-200 bg-navy-50 px-3 text-sm text-navy-700 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30" />
                  <input value={couponDiscountText} onChange={(e) => setCouponDiscountText(e.target.value)} placeholder="e.g. 20% off" className="h-9 rounded-lg border border-navy-200 bg-navy-50 px-3 text-sm text-navy-700 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30" />
                </div>
                <div className="mt-2 flex gap-2">
                  <input value={couponMessage} onChange={(e) => setCouponMessage(e.target.value)} placeholder="Optional message" className="h-9 flex-1 rounded-lg border border-navy-200 bg-navy-50 px-3 text-sm text-navy-700 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30" />
                  <button
                    type="button"
                    disabled={!couponCode.trim() || sendCoupon.isPending}
                    onClick={() => sendCoupon.mutate()}
                    className="h-9 rounded-lg bg-warning-600 px-4 text-xs font-semibold text-white hover:bg-warning-700 disabled:opacity-60"
                  >
                    Send
                  </button>
                </div>
              </div>
            )}

            {/* Slash canned results */}
            {slashResults.length > 0 && (
              <div className="border-b border-navy-100 bg-navy-50/60 px-4 py-2">
                <div className="flex flex-wrap gap-1.5">
                  {slashResults.map((item) => (
                    <button key={item.id} onClick={() => void useCanned(item)} className="rounded-md border border-navy-200 bg-white px-2 py-1 text-xs font-medium text-navy-600 hover:bg-navy-50 hover:border-navy-300">
                      /{item.shortcut} — {item.title}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input container */}
            <div className="mx-4 mt-3 mb-2 rounded-xl border border-navy-100 bg-navy-50/50 focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/20 transition-all duration-150">
              {noteMode && (
                <div className="flex items-center gap-1.5 border-b border-warning-100 bg-warning-50 px-4 py-1.5 rounded-t-xl">
                  <StickyNote size={12} className="text-warning-600" />
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-warning-600">Private Note — not visible to visitor</span>
                </div>
              )}
              <textarea
                ref={textareaRef}
                className="min-h-[56px] max-h-[120px] w-full resize-none bg-transparent px-4 py-2.5 text-sm leading-6 text-navy-700 outline-none placeholder:text-navy-300"
                placeholder={noteMode ? "Write an internal note..." : "Reply to visitor... (Ctrl+K for quick actions)"}
                value={reply}
                onChange={(event) => {
                  const v = event.target.value;
                  setReply(v);
                  if (ghostText) setGhostText("");
                  if (!noteMode && v.length >= 8 && v.length % 12 === 0) {
                    void api.post<{ suggestion: string }>("/ai/ghost", { chat_id: id, prefix: v })
                      .then(({ data: d }) => { if (d.suggestion) setGhostText(d.suggestion); })
                      .catch(() => undefined);
                  }
                }}
                onKeyDown={(event) => {
                  if (event.key === "Tab" && ghostText) {
                    event.preventDefault();
                    setReply((v) => `${v} ${ghostText}`);
                    setGhostText("");
                  }
                }}
                onPaste={onPaste}
                onDrop={onDrop}
                onDragOver={(event) => event.preventDefault()}
              />
              {ghostText && (
                <div className="px-4 pb-1 text-xs text-navy-400">
                  <span className="font-semibold text-purple-500">Tab</span> to accept:{" "}
                  <span className="italic">{ghostText}</span>
                </div>
              )}

              {/* Toolbar inside input container */}
              <div className="flex items-center justify-between px-3 py-2">
                <div className="flex items-center gap-0.5">
                  <button
                    onClick={() => setNoteMode(!noteMode)}
                    className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition ${noteMode ? "bg-warning-100 text-warning-700" : "text-navy-400 hover:bg-navy-100 hover:text-navy-600"}`}
                  >
                    {noteMode ? <StickyNote size={13} /> : <MessageSquare size={13} />}
                    {noteMode ? "Note" : "Message"}
                  </button>
                  <div className="mx-1 h-4 w-px bg-navy-200" />
                  <button className="flex h-8 w-8 items-center justify-center rounded-md text-navy-400 transition hover:bg-navy-100 hover:text-navy-600" title="Emoji"><SmilePlus size={15} /></button>
                  <label htmlFor="agent-chat-upload" className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-navy-400 transition hover:bg-navy-100 hover:text-navy-600" title="Attach file">
                    <Paperclip size={15} />
                  </label>
                  <input id="agent-chat-upload" className="hidden" type="file" onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void uploadFile(file);
                    event.currentTarget.value = "";
                  }} />
                  <button
                    className="flex h-8 w-8 items-center justify-center rounded-md text-navy-400 transition hover:bg-navy-100 hover:text-navy-600"
                    title="Add tag"
                    onClick={() => document.getElementById("chat-tag-input")?.focus()}
                  >
                    <Tag size={15} />
                  </button>
                  <button className="flex h-8 w-8 items-center justify-center rounded-md text-xs font-bold text-navy-400 transition hover:bg-navy-100 hover:text-navy-600" title="Canned responses">#</button>
                  <div className="mx-1 h-4 w-px bg-navy-200" />
                  <button
                    onClick={() => setCopilotOpen(true)}
                    className="flex h-8 w-8 items-center justify-center rounded-md bg-purple-50 text-purple-500 transition hover:bg-purple-100"
                    title="AI Copilot"
                  >
                    <Sparkles size={15} />
                  </button>
                  <button
                    onClick={() => { setProductPanelOpen((v) => !v); setCouponPanelOpen(false); }}
                    className={`flex h-8 w-8 items-center justify-center rounded-md transition ${productPanelOpen ? "bg-success-50 text-success-600" : "text-navy-400 hover:bg-navy-100 hover:text-navy-600"}`}
                    title="Products"
                  >
                    <Search size={15} />
                  </button>
                  <button
                    onClick={() => { setCouponPanelOpen((v) => !v); setProductPanelOpen(false); }}
                    className={`flex h-8 w-8 items-center justify-center rounded-md transition ${couponPanelOpen ? "bg-warning-50 text-warning-600" : "text-navy-400 hover:bg-navy-100 hover:text-navy-600"}`}
                    title="Coupon"
                  >
                    <Tag size={15} />
                  </button>
                  <button
                    onClick={() => checkoutAssist.mutate()}
                    className="flex h-8 w-8 items-center justify-center rounded-md text-navy-400 transition hover:bg-navy-100 hover:text-navy-600"
                    title="Checkout assist"
                  >
                    <Zap size={15} />
                  </button>
                </div>
                <button
                  onClick={send}
                  disabled={!reply.trim()}
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500 text-white transition hover:bg-brand-600 disabled:bg-navy-200 disabled:text-navy-400"
                  title="Send (Ctrl+Enter)"
                >
                  <SendHorizontal size={15} />
                </button>
              </div>
            </div>

            {/* Add tag row */}
            <div className="flex items-center gap-2 border-t border-navy-100/60 px-4 py-2">
              <Tag size={13} className="shrink-0 text-navy-400" />
              <input
                id="chat-tag-input"
                value={tagText}
                onChange={(e) => setTagText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && tagText.trim()) {
                    quickAction.mutate({ path: `/chats/${id}/tag`, payload: { tag: tagText.trim() } });
                    setTagText("");
                  }
                }}
                placeholder="Add tag"
                className="flex-1 bg-transparent text-xs text-navy-500 outline-none placeholder:text-navy-300"
              />
              {tagText.trim() && (
                <button
                  className="text-xs font-semibold text-brand-500 transition hover:text-brand-600"
                  onClick={() => {
                    quickAction.mutate({ path: `/chats/${id}/tag`, payload: { tag: tagText.trim() } });
                    setTagText("");
                  }}
                >
                  Add
                </button>
              )}
            </div>
          </div>
        </div>

      </div>

      <ChatVisitorPanel chat={currentChat} open={visitorPanelOpen} onClose={() => setVisitorPanelOpen(false)} />
      <CopilotPanel chatId={id} open={copilotOpen} onClose={() => setCopilotOpen(false)} onInsert={(t) => setReply((v) => (v ? `${v}\n\n${t}` : t))} />
      {shortcutOpen ? <ShortcutsModal onClose={() => setShortcutOpen(false)} /> : null}
      {assignModal ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={() => setAssignModal(false)}>
          <div className="w-full max-w-md rounded-xl border border-navy-100 bg-white p-5 shadow-lift" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 text-sm font-semibold text-navy-700">Assign chat</div>
            <select
              className="h-10 w-full rounded-lg border border-navy-200 bg-white px-3 text-sm text-navy-700 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30"
              value={assignId}
              onChange={(e) => setAssignId(e.target.value)}
            >
              <option value="">Select agent</option>
              {agents.map((agent) => <option key={agent.id} value={agent.id}>{agent.full_name}</option>)}
            </select>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                className="rounded-lg border border-navy-200 bg-white px-3 py-2 text-sm font-medium text-navy-600 hover:bg-navy-50"
                onClick={() => setAssignModal(false)}
              >
                Cancel
              </button>
              <button
                className="rounded-lg bg-brand-500 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-600"
                onClick={() => {
                  if (!assignId) return;
                  void api.post(`/chats/${id}/assign`, { assigned_user_id: assignId }).then(() => {
                    setAssignModal(false);
                    toast.success("Assigned");
                    void refreshChat();
                  });
                }}
              >
                Assign
              </button>
            </div>
          </div>
        </div>
      ) : null}

    </section>
  );
}

function ChatListPane({
  rows,
  activeChatId,
  unreadCounts,
  view,
  search,
  onViewChange,
  onSearchChange,
  onOpen,
}: {
  rows: Chat[];
  activeChatId: string;
  unreadCounts: Record<string, number>;
  view: ChatListView;
  search: string;
  onViewChange: (view: ChatListView) => void;
  onSearchChange: (value: string) => void;
  onOpen: (chatId: string) => void;
}): JSX.Element {
  return (
    <aside className="hidden min-h-0 flex-col border-r border-navy-100 bg-white xl:flex">
      <div className="border-b border-navy-100 px-3 py-3">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-base font-semibold text-navy-800">Chats</h2>
          <span className="rounded-full bg-navy-50 px-2 py-0.5 text-[11px] font-semibold text-navy-400">{rows.length}</span>
        </div>
        <label className="flex h-9 items-center gap-2 rounded-md border border-navy-100 bg-navy-50 px-2 text-sm text-navy-400 focus-within:border-brand-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-brand-500/15">
          <Search size={14} />
          <input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search chats"
            className="min-w-0 flex-1 border-0 bg-transparent p-0 text-sm text-navy-700 outline-none placeholder:text-navy-300 focus:ring-0"
          />
        </label>
        <div className="mt-3 grid grid-cols-3 gap-1 rounded-md bg-navy-50 p-1">
          {(Object.keys(CHAT_LIST_LABELS) as ChatListView[]).map((item) => (
            <button
              key={item}
              onClick={() => onViewChange(item)}
              className={`rounded px-2 py-1.5 text-[11px] font-semibold transition ${view === item ? "bg-white text-brand-600 shadow-xs" : "text-navy-400 hover:text-navy-600"}`}
            >
              {CHAT_LIST_LABELS[item].replace(" chats", "")}
            </button>
          ))}
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {rows.length ? rows.map((chat) => (
          <ChatListRow
            key={chat.id}
            chat={chat}
            active={chat.id === activeChatId}
            unreadCount={unreadCounts[chat.id] ?? 0}
            onClick={() => onOpen(chat.id)}
          />
        )) : (
          <div className="grid h-full place-items-center px-6 text-center">
            <div>
              <MessageSquare size={22} className="mx-auto mb-2 text-navy-300" />
              <div className="text-sm font-semibold text-navy-500">No chats here</div>
              <p className="mt-1 text-xs leading-5 text-navy-400">Queued and assigned conversations will appear in this list.</p>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}

function ChatListRow({
  chat,
  active,
  unreadCount,
  onClick,
}: {
  chat: Chat;
  active: boolean;
  unreadCount: number;
  onClick: () => void;
}): JSX.Element {
  const name = chat.visitor_name || chat.visitor_email || "Website visitor";
  const preview = chat.last_message?.content || chat.subject || `${chat.channel} conversation`;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative flex w-full min-w-0 gap-3 border-b border-navy-100 px-3 py-3 text-left transition hover:bg-navy-50 ${active ? "bg-brand-50/70" : "bg-white"}`}
    >
      {active && <span className="absolute left-0 top-3 h-9 w-1 rounded-r-full bg-brand-500" />}
      <div className="relative grid h-10 w-10 shrink-0 place-items-center rounded-full bg-navy-900 text-xs font-semibold text-white">
        {initials(name)}
        <span className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white ${chat.visitor_status === "online" ? "bg-success-500" : "bg-navy-300"}`} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-2">
          <span className={`truncate text-sm font-semibold ${active ? "text-brand-700" : "text-navy-800"}`}>{name}</span>
          {chat.is_pinned ? <Pin size={11} className="shrink-0 text-brand-500" /> : null}
        </div>
        <div className="mt-1 truncate text-xs text-navy-400">
          {chat.last_message?.sender_type === "agent" ? "You: " : ""}
          {preview}
        </div>
        <div className="mt-1 flex items-center gap-1.5 text-[11px] font-medium text-navy-300">
          <Globe2 size={11} />
          <span>{chat.channel}</span>
          <span className="h-1 w-1 rounded-full bg-navy-200" />
          <span>{formatTime(chat.updated_at)}</span>
        </div>
      </div>
      {unreadCount > 0 && (
        <span className="grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-brand-500 px-1 text-[10px] font-bold text-white">{unreadCount}</span>
      )}
    </button>
  );
}

function mergeMessages(serverMessages: Message[], liveMessages: Message[]): Message[] {
  const byId = new Map<string, Message>();
  for (const message of serverMessages) byId.set(message.id, message);
  for (const message of liveMessages) byId.set(message.id, { ...byId.get(message.id), ...message });
  return [...byId.values()].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
}

function mergeChatListRows(serverChats: Chat[], realtimeChats: Chat[], activeChat?: ChatDetail): Chat[] {
  const byId = new Map<string, Chat>();
  for (const chat of serverChats) byId.set(chat.id, chat);
  for (const chat of realtimeChats) byId.set(chat.id, { ...byId.get(chat.id), ...chat });
  if (activeChat) byId.set(activeChat.id, { ...byId.get(activeChat.id), ...activeChat });

  return [...byId.values()].sort((a, b) => {
    if (a.status !== b.status) {
      if (a.status === "waiting") return -1;
      if (b.status === "waiting") return 1;
    }
    const pinnedDiff = Number(Boolean(b.is_pinned)) - Number(Boolean(a.is_pinned));
    if (pinnedDiff !== 0) return pinnedDiff;
    return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
  });
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

  if (message.is_internal) {
    return (
      <div className="my-2 px-4 py-1.5 text-center">
        <span className="inline-block rounded-full border border-warning-200 bg-warning-50 px-3 py-1.5 text-xs font-medium italic text-warning-700">
          <span className="not-italic font-semibold uppercase tracking-wider text-[10px] text-warning-600 block mb-0.5">Private Note</span>
          {message.content}
        </span>
      </div>
    );
  }

  const mine = message.sender_type === "agent";
  const canModify = mine && !!currentUserId && !message.deleted_at;
  const reactionEntries = Object.entries(message.reactions ?? {});

  return (
    <div className={`group mb-4 flex items-end gap-2.5 ${mine ? "flex-row-reverse" : "flex-row"}`}>
      {/* Avatar */}
      <div className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-[11px] font-bold mt-1 ${mine ? "bg-brand-100 text-brand-600" : "bg-navy-200 text-navy-600"}`}>
        {mine ? initials(currentUserId || "AG") : "V"}
      </div>

      <div className={`max-w-[75%] space-y-1 ${mine ? "" : ""}`}>
        <div
          className={`overflow-hidden break-words px-4 py-2.5 text-sm leading-relaxed shadow-xs ${
            mine
              ? "rounded-2xl rounded-tr-md bg-brand-500 text-white"
              : "rounded-2xl rounded-tl-md border border-navy-100 bg-white text-navy-700"
          }`}
        >
          {editing ? (
            <div>
              <textarea
                className="w-full rounded-lg border border-navy-200 bg-navy-50 p-2 text-sm text-navy-700 outline-none focus:border-brand-500"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
              />
              <div className="mt-1 flex gap-2">
                <button
                  className="rounded-lg bg-brand-500 px-2.5 py-1 text-xs font-semibold text-white hover:bg-brand-600"
                  onClick={() => { onEdit(draft); setEditing(false); }}
                >
                  Save
                </button>
                <button
                  className="rounded-lg border border-navy-200 px-2.5 py-1 text-xs text-navy-500 hover:text-navy-700"
                  onClick={() => setEditing(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : message.file_url ? (
            <a
              className={`font-semibold underline underline-offset-4 ${mine ? "text-brand-500" : "text-white"}`}
              href={message.file_url}
              target="_blank"
              rel="noreferrer"
            >
              📎 {message.file_name ?? message.content ?? "Attachment"}
            </a>
          ) : (
            <MessageContent message={message} mine={mine} />
          )}
        </div>

        <div className={`flex items-center gap-2 px-1 text-[10px] text-navy-300 ${mine ? "justify-end" : "justify-start"}`}>
          <span>{formatTime(message.created_at)}</span>
          {message.edited_at ? <span className="text-navy-300">edited</span> : null}
          {mine && (
            <span className="inline-flex items-center gap-1 text-navy-300">
              {message.is_read ? <CheckCheck size={11} className="text-brand-400" /> : <Check size={11} />}
              {message.is_read ? "Read" : "Sent"}
            </span>
          )}
        </div>

        {reactionEntries.length > 0 && (
          <div className="flex flex-wrap gap-1 px-1">
            {reactionEntries.map(([emoji, users]) => (
              <button
                key={emoji}
                onClick={() => onReact(emoji)}
                className="rounded-full border border-navy-200 bg-white px-2 py-0.5 text-[11px] text-navy-600 hover:bg-navy-50"
              >
                {emoji} {users.length}
              </button>
            ))}
          </div>
        )}

        {canModify && (
          <div className="flex gap-1 px-1 opacity-0 transition group-hover:opacity-100">
            <button
              className="rounded border border-navy-200 bg-white px-2 py-0.5 text-xs text-navy-500 hover:text-navy-700"
              onClick={() => setEditing(true)}
            >
              Edit
            </button>
            <button
              className="rounded border border-danger-200 bg-white px-2 py-0.5 text-xs text-danger-500 hover:text-danger-700"
              onClick={onDelete}
            >
              Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

type StructuredProductPayload = {
  type: "product_card";
  product: {
    id?: string;
    sku?: string | null;
    name: string;
    description?: string | null;
    price?: number | null;
    currency?: string | null;
    image_url?: string | null;
    product_url?: string | null;
    category?: string | null;
    brand?: string | null;
  };
};

type StructuredCouponPayload = {
  type: "coupon";
  code: string;
  discount_text?: string | null;
  expires_at?: string | null;
  message?: string | null;
};

type StructuredOrderPayload = {
  type: "order_tracking";
  order_number: string;
  status: string;
  total?: number | null;
  currency?: string | null;
  placed_at?: string | null;
  fulfilled_at?: string | null;
  cancelled_at?: string | null;
};

type StructuredChatMessage = StructuredProductPayload | StructuredCouponPayload | StructuredOrderPayload;

function MessageContent({ message, mine }: { message: Message; mine: boolean }): JSX.Element {
  const structured = parseStructuredMessage(message);
  if (structured?.type === "product_card") {
    const product = structured.product;
    return (
      <div className="rounded-lg border border-navy-100 bg-navy-50 p-3">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-navy-400">Product</div>
        <div className="mt-1 text-sm font-semibold text-navy-700">{product.name}</div>
        {product.description ? <div className="mt-1 text-xs text-navy-500">{product.description}</div> : null}
        <div className="mt-2 flex items-center justify-between gap-3">
          <div className="text-xs font-bold text-success-600">{formatMoney(product.price, product.currency)}</div>
          {product.product_url ? <a href={product.product_url} target="_blank" rel="noreferrer" className="text-xs font-medium text-brand-500 underline underline-offset-4">View product</a> : null}
        </div>
      </div>
    );
  }
  if (structured?.type === "coupon") {
    return (
      <div className="rounded-lg border border-warning-200 bg-warning-50 p-3">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-warning-600">Coupon</div>
        <div className="mt-1 text-lg font-bold text-warning-700">{structured.code}</div>
        <div className="text-xs font-medium text-warning-600">{structured.discount_text || "Special discount unlocked"}</div>
        {structured.message ? <div className="mt-1 text-xs text-warning-600/80">{structured.message}</div> : null}
        {structured.expires_at ? <div className="mt-1 text-[11px] font-medium text-warning-500">Expires {formatDate(structured.expires_at)}</div> : null}
      </div>
    );
  }
  if (structured?.type === "order_tracking") {
    return (
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-blue-600">Order update</div>
        <div className="mt-1 text-sm font-semibold text-blue-700">Order #{structured.order_number}</div>
        <div className="text-xs text-blue-600">Status: {structured.status}</div>
        {(structured.total ?? null) !== null ? <div className="mt-1 text-xs font-bold text-blue-700">{formatMoney(structured.total, structured.currency)}</div> : null}
        {structured.placed_at ? <div className="mt-1 text-[11px] text-blue-500">Placed {formatDate(structured.placed_at)}</div> : null}
      </div>
    );
  }
  return <>{message.content || ""}</>;
}

function EmptyConversation(): JSX.Element {
  return (
    <div className="grid min-h-full place-items-center px-4 py-16 text-center">
      <div>
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-navy-100 text-navy-300 mx-auto">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
        </div>
        <div className="text-sm font-semibold text-navy-500">No messages yet</div>
        <div className="mt-1 text-xs text-navy-400">New messages will appear here.</div>
      </div>
    </div>
  );
}


function parseStructuredMessage(message: Message): StructuredChatMessage | null {
  const content = message.content;
  if (!content) return null;
  if (!["product_card", "coupon", "order_tracking"].includes(message.content_type)) return null;
  try {
    const parsed = JSON.parse(content) as Record<string, unknown>;
    if (message.content_type === "product_card") {
      const root = (typeof parsed.product === "object" && parsed.product !== null ? parsed.product : parsed) as Record<string, unknown>;
      const name = String(root.name || "");
      if (!name) return null;
      return {
        type: "product_card",
        product: {
          id: root.id ? String(root.id) : undefined,
          sku: root.sku ? String(root.sku) : null,
          name,
          description: root.description ? String(root.description) : null,
          price: typeof root.price === "number" ? root.price : root.price ? Number(root.price) : null,
          currency: root.currency ? String(root.currency) : "USD",
          image_url: root.image_url ? String(root.image_url) : null,
          product_url: root.product_url ? String(root.product_url) : null,
          category: root.category ? String(root.category) : null,
          brand: root.brand ? String(root.brand) : null,
        },
      };
    }
    if (message.content_type === "coupon") {
      const code = String(parsed.code || "");
      if (!code) return null;
      return {
        type: "coupon",
        code,
        discount_text: parsed.discount_text ? String(parsed.discount_text) : null,
        expires_at: parsed.expires_at ? String(parsed.expires_at) : null,
        message: parsed.message ? String(parsed.message) : null,
      };
    }
    if (message.content_type === "order_tracking") {
      const orderNumber = String(parsed.order_number || "");
      const status = String(parsed.status || "");
      if (!orderNumber || !status) return null;
      return {
        type: "order_tracking",
        order_number: orderNumber,
        status,
        total: typeof parsed.total === "number" ? parsed.total : parsed.total ? Number(parsed.total) : null,
        currency: parsed.currency ? String(parsed.currency) : "USD",
        placed_at: parsed.placed_at ? String(parsed.placed_at) : null,
        fulfilled_at: parsed.fulfilled_at ? String(parsed.fulfilled_at) : null,
        cancelled_at: parsed.cancelled_at ? String(parsed.cancelled_at) : null,
      };
    }
  } catch {
    return null;
  }
  return null;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

function formatTime(value: string): string {
  return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

function formatMoney(value: number | string | null | undefined, currency: string | null | undefined): string {
  const amount = typeof value === "number" ? value : value ? Number(value) : 0;
  const moneyCurrency = (currency || "USD").toUpperCase();
  if (!Number.isFinite(amount)) return `${moneyCurrency} 0.00`;
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: moneyCurrency }).format(amount);
  } catch {
    return `${moneyCurrency} ${amount.toFixed(2)}`;
  }
}

function initials(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "V";
}

function formatDuration(ms: number): string {
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function formatRelative(value: string): string {
  const diffMs = Date.now() - new Date(value).getTime();
  if (diffMs < 60000) return "just now";
  const mins = Math.floor(diffMs / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(diffMs / 3600000);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(diffMs / 86400000);
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  try {
    return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
  } catch { return `${days} days ago`; }
}

function computePageDurations(history: Array<{ url?: string; ts?: string }>): Array<{ url: string; label: string; duration: string }> {
  const result: Array<{ url: string; label: string; duration: string }> = [];
  for (let i = 0; i < history.length; i++) {
    const page = history[i];
    if (!page.url || !page.ts) continue;
    const startMs = new Date(page.ts).getTime();
    const endMs = history[i + 1]?.ts ? new Date(history[i + 1].ts!).getTime() : Date.now();
    const diff = Math.max(0, endMs - startMs);
    let label = page.url;
    try {
      const u = new URL(page.url);
      const path = u.pathname.replace(/\/$/, "");
      label = path ? decodeURIComponent(path.split("/").pop() ?? u.hostname).replace(/[-_]/g, " ") : u.hostname;
    } catch { label = page.url; }
    result.push({ url: page.url, label: label || page.url, duration: formatDuration(diff) });
  }
  return result.reverse();
}

function PanelSection({ title, open, onToggle, children }: { title: string; open: boolean; onToggle: () => void; children: ReactNode }): JSX.Element {
  return (
    <div className="shrink-0">
      <button
        className="flex w-full items-center justify-between px-5 py-3 text-xs font-semibold uppercase tracking-wider text-navy-400 transition hover:bg-navy-50 dark:hover:bg-navy-800"
        onClick={onToggle}
      >
        {title}
        <ChevronDown size={14} className={`text-navy-300 transition-transform duration-200 ${open ? "" : "-rotate-90"}`} />
      </button>
      {open && <div className="grid gap-2.5 px-5 pb-4 text-xs">{children}</div>}
    </div>
  );
}

function InfoRow({ label, value, accent }: { label: string; value: string; accent?: boolean }): JSX.Element {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="shrink-0 text-navy-400 dark:text-navy-500">{label}</span>
      <span className={`break-all text-right font-medium ${accent ? "text-brand-500" : "text-navy-700 dark:text-navy-200"}`}>{value}</span>
    </div>
  );
}

function ChatVisitorPanel({ chat, open, onClose }: { chat?: ChatDetail; open: boolean; onClose: () => void }): JSX.Element {
  const [, forceUpdate] = useState(0);
  const [additionalOpen, setAdditionalOpen] = useState(true);
  const [pagesOpen, setPagesOpen] = useState(true);
  const [preChatOpen, setPreChatOpen] = useState(true);
  const [techOpen, setTechOpen] = useState(true);
  const [integrationsOpen, setIntegrationsOpen] = useState(true);
  const [ticketsOpen, setTicketsOpen] = useState(false);
  const [pastChatsOpen, setPastChatsOpen] = useState(false);
  const [ecommerceOpen, setEcommerceOpen] = useState(false);
  type GeoResult = {
    city: string; country: string; latitude: number; longitude: number;
    isp: string; timezone: string;
    publicIp: string; os: string; browser: string; device: string;
  };
  const [fetchedGeo, setFetchedGeo] = useState<GeoResult | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoFetchedIp, setGeoFetchedIp] = useState<string | null>(null);
  const [localTimeDisplay, setLocalTimeDisplay] = useState("");

  // Live re-render every second for chat duration
  useEffect(() => {
    const t = setInterval(() => forceUpdate((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const customVariables = chat?.visitor_session?.custom_variables ?? {};
  const customAttrs = chat?.contact?.custom_attrs ?? {};

  const latitude = numberFromCustomVariable(customVariables["_geo_latitude"]);
  const longitude = numberFromCustomVariable(customVariables["_geo_longitude"]);
  const geoCity = (customVariables["_geo_city"] as string | undefined) || chat?.visitor_session?.city || "";
  const geoCountry = (customVariables["_geo_country"] as string | undefined) || chat?.visitor_session?.country || "";
  const geoIsp = customVariables["_geo_isp"] as string | undefined;
  const geoTimezoneVar = customVariables["_geo_timezone"] as string | undefined;
  const geoSource = customVariables["_geo_source"] as string | undefined;
  const geoAccuracy = numberFromCustomVariable(customVariables["_geo_accuracy_m"]);

  const visitorIp = chat?.visitor_session?.ip_address ?? null;

  useEffect(() => {
    if (geoFetchedIp !== null) return;
    if (latitude !== null && longitude !== null && geoCity && geoCountry) return;
    if (!chat) return;

    setGeoLoading(true);

    function toNum(v: unknown): number | null {
      if (typeof v === "number" && Number.isFinite(v)) return v;
      if (typeof v === "string" && v.trim()) { const n = Number(v); return Number.isFinite(n) ? n : null; }
      return null;
    }

    function isPublicIp(ip: string): boolean {
      if (!ip) return false;
      return !/^(10\.|172\.(1[6-9]|2[0-9]|3[01])\.|192\.168\.|127\.|169\.254\.|0\.0\.0\.0|::1$|fc|fd|fe80:|localhost)/i.test(ip);
    }

    // Parse browser UA for OS/device/browser info (used as fallback when backend doesn't provide it)
    const ua = navigator.userAgent;
    const uaInfo = {
      os: (() => {
        if (/Windows NT 1[01]/.test(ua)) return "Windows 10/11";
        if (/Windows/.test(ua)) return "Windows";
        if (/Android/.test(ua)) return "Android";
        if (/iPhone|iPad/.test(ua)) return "iOS";
        if (/Mac OS X/.test(ua)) return "macOS";
        if (/Linux x86_64/.test(ua)) return "Linux (x86_64)";
        if (/Linux/.test(ua)) return "Linux";
        return "";
      })(),
      browser: (() => {
        const m = ua.match(/Edg\/([\d.]+)/) || ua.match(/OPR\/([\d.]+)/) ||
          ua.match(/Chrome\/([\d.]+)/) || ua.match(/Firefox\/([\d.]+)/) || ua.match(/Safari\/([\d.]+)/);
        if (!m) return "";
        const name = /Edg/.test(ua) ? "Edge" : /OPR/.test(ua) ? "Opera" : /Chrome/.test(ua) ? "Chrome" : /Firefox/.test(ua) ? "Firefox" : "Safari";
        return `${name} (${m[1]})`;
      })(),
      device: /Mobi|Android/i.test(ua) ? "Mobile" : /Tablet|iPad/i.test(ua) ? "Tablet" : "Desktop",
    };

    async function run(): Promise<GeoResult | null> {
      function make(d: { city: string; country: string; lat: number; lng: number; isp: string; tz: string; ip: string }): GeoResult {
        return { city: d.city, country: d.country, latitude: d.lat, longitude: d.lng, isp: d.isp, timezone: d.tz, publicIp: d.ip, ...uaInfo };
      }

      // Try real public visitor IP first
      if (visitorIp && isPublicIp(visitorIp)) {
        try {
          const d = (await (await fetch(`https://ipapi.co/${visitorIp}/json/`)).json()) as Record<string, unknown>;
          const lat = toNum(d.latitude); const lng = toNum(d.longitude);
          if (lat !== null && lng !== null && !d.error) {
            return make({ city: String(d.city ?? ""), country: String(d.country_name ?? ""), lat, lng, isp: String(d.org ?? ""), tz: String(d.timezone ?? ""), ip: visitorIp });
          }
        } catch { /* next */ }
      }

      // Service 1: ipwho.is — auto-detects browser's real public IP in one call
      try {
        const d = (await (await fetch("https://ipwho.is/")).json()) as Record<string, unknown>;
        const lat = toNum(d.latitude); const lng = toNum(d.longitude);
        const ip = String(d.ip ?? "");
        if (d.success && lat !== null && lng !== null && isPublicIp(ip)) {
          return make({
            city: String(d.city ?? ""), country: String(d.country ?? ""), lat, lng,
            isp: String((d.connection as Record<string, unknown> | undefined)?.isp ?? ""),
            tz: String((d.timezone as Record<string, unknown> | undefined)?.id ?? ""),
            ip,
          });
        }
      } catch { /* next */ }

      // Service 2: freeipapi.com
      try {
        const d = (await (await fetch("https://freeipapi.com/api/json")).json()) as Record<string, unknown>;
        const lat = toNum(d.latitude); const lng = toNum(d.longitude);
        const ip = String(d.ipAddress ?? "");
        if (lat !== null && lng !== null && isPublicIp(ip)) {
          return make({ city: String(d.cityName ?? ""), country: String(d.countryName ?? ""), lat, lng, isp: "", tz: String(d.timeZone ?? ""), ip });
        }
      } catch { /* next */ }

      // Service 3: ip-api.com (HTTP — may be blocked on HTTPS pages)
      try {
        const d = (await (await fetch("http://ip-api.com/json/?fields=status,country,city,lat,lon,timezone,query,org")).json()) as Record<string, unknown>;
        const lat = toNum(d.lat); const lng = toNum(d.lon);
        const ip = String(d.query ?? "");
        if (d.status === "success" && lat !== null && lng !== null && isPublicIp(ip)) {
          return make({ city: String(d.city ?? ""), country: String(d.country ?? ""), lat, lng, isp: String(d.org ?? ""), tz: String(d.timezone ?? ""), ip });
        }
      } catch { /* ignore */ }

      // All geo failed — still return UA info with no location
      return { city: "", country: "", latitude: 0, longitude: 0, isp: "", timezone: "", publicIp: "", ...uaInfo };
    }

    run().then((geo) => {
      if (geo) setFetchedGeo(geo.latitude !== 0 ? geo : { ...geo, latitude: NaN, longitude: NaN });
      setGeoFetchedIp(visitorIp ?? "__none__");
    }).finally(() => setGeoLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chat, visitorIp, latitude, longitude, geoCity, geoCountry, geoFetchedIp]);

  const resolvedTimezone = geoTimezoneVar || fetchedGeo?.timezone || "";

  // Update local time every 60 seconds based on visitor timezone
  useEffect(() => {
    function tick(): string {
      try {
        return new Intl.DateTimeFormat(undefined, {
          hour: "numeric", minute: "2-digit", hour12: true,
          ...(resolvedTimezone ? { timeZone: resolvedTimezone } : {}),
        }).format(new Date());
      } catch {
        return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit", hour12: true }).format(new Date());
      }
    }
    setLocalTimeDisplay(tick());
    const t = setInterval(() => setLocalTimeDisplay(tick()), 60000);
    return () => clearInterval(t);
  }, [resolvedTimezone]);

  const uaOs = (customVariables["_ua_os"] as string | undefined) || chat?.visitor_session?.os || fetchedGeo?.os || "";
  const uaBrowser = (customVariables["_ua_browser"] as string | undefined)
    || (chat?.visitor_session?.browser
      ? `${chat.visitor_session.browser}${chat.visitor_session.browser_version ? ` (${chat.visitor_session.browser_version})` : ""}`
      : "") || fetchedGeo?.browser || "";
  const uaDevice = (customVariables["_ua_device"] as string | undefined) || chat?.visitor_session?.device_type || fetchedGeo?.device || "";

  const sessionVisitCount = typeof customVariables["_session_visit_count"] === "number"
    ? (customVariables["_session_visit_count"] as number)
    : (chat?.visitor_session?.page_views ?? 0);
  const sessionChatCount = typeof customVariables["_session_chat_count"] === "number"
    ? (customVariables["_session_chat_count"] as number)
    : ((chat?.past_chats?.length ?? 0) + 1);
  const sessionLastSeen = (customVariables["_session_last_seen"] as string | undefined)
    || chat?.visitor_session?.last_seen_at || null;

  const widgetPages = (() => {
    const raw = customVariables["_session_pages"];
    if (typeof raw !== "string") return null;
    try { return JSON.parse(raw) as Array<{ url: string; title: string; timeSpent: number; enteredAt?: number }>; }
    catch { return null; }
  })();
  const pageDurations = (() => {
    if (widgetPages) {
      return [...widgetPages].reverse().map((p, i) => {
        // First item (after reverse) is current page — if timeSpent=0, use live elapsed time
        const isCurrentPage = i === 0 && p.timeSpent === 0;
        const liveMs = isCurrentPage && p.enteredAt ? Math.max(0, Date.now() - p.enteredAt) : null;
        const duration = liveMs !== null ? formatDuration(liveMs) : formatDuration(p.timeSpent * 1000);
        return { url: p.url, label: p.title || p.url, duration, isLive: isCurrentPage };
      });
    }
    return computePageDurations(chat?.visitor_session?.page_history ?? []).map((p) => ({ ...p, isLive: false }));
  })();

  const fgLat = fetchedGeo && Number.isFinite(fetchedGeo.latitude) ? fetchedGeo.latitude : null;
  const fgLng = fetchedGeo && Number.isFinite(fetchedGeo.longitude) ? fetchedGeo.longitude : null;
  const resolvedLatitude = latitude ?? fgLat;
  const resolvedLongitude = longitude ?? fgLng;
  const resolvedCity = geoCity || fetchedGeo?.city || "";
  const resolvedCountry = geoCountry || fetchedGeo?.country || "";
  const resolvedIsp = geoIsp || fetchedGeo?.isp || "";
  const resolvedPublicIp = (visitorIp && !/^(10\.|172\.(1[6-9]|2[0-9]|3[01])\.|192\.168\.|127\.|::1$|fe80:|fc|fd|localhost)/i.test(visitorIp))
    ? visitorIp
    : fetchedGeo?.publicIp || "";

  const geoLocation = [resolvedCity, resolvedCountry].filter(Boolean).join(", ");
  const visitorName = chat?.visitor_name || chat?.visitor_email || "Website visitor";
  const chatDuration = chat?.created_at
    ? formatDuration(Math.max(0, Date.now() - new Date(chat.created_at).getTime()))
    : null;

  const integrationsData: Record<string, unknown> = {};
  for (const [k, v] of Object.entries({ ...customVariables, ...customAttrs })) {
    if (!k.startsWith("_geo_") && !k.startsWith("_ua_") && !k.startsWith("_session_")) {
      integrationsData[k] = v;
    }
  }
  const hasEcommerce = chat?.ecommerce && Object.values(chat.ecommerce).some((v) => v != null);

  const isOnline = chat?.visitor_status === "online";

  return (
    <>
      {open && <div className="fixed inset-0 z-[150] bg-black/30" onClick={onClose} />}
      <aside className={`fixed inset-y-0 right-0 z-[160] flex w-80 flex-col overflow-y-auto border-l border-navy-100 bg-white shadow-2xl transition-transform duration-300 dark:border-navy-700 dark:bg-navy-900 ${open ? "translate-x-0" : "translate-x-full"}`}
        style={{ borderTop: "3px solid #f97316" }}>

        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-navy-100 px-5 py-4 dark:border-navy-700">
          <span className="text-sm font-semibold text-navy-700 dark:text-navy-100">Visitor Info</span>
          <button className="flex h-7 w-7 items-center justify-center rounded-md text-navy-400 hover:bg-navy-50 dark:hover:bg-navy-800" onClick={onClose} aria-label="Close">
            <X size={15} />
          </button>
        </div>

        {/* Section 1: Profile */}
        <div className="shrink-0 border-b border-navy-100 px-5 py-5 text-center dark:border-navy-700">
          <div className="relative mx-auto inline-block">
            <div className="grid h-14 w-14 place-items-center rounded-full bg-orange-100 text-xl font-bold text-orange-600">
              {initials(visitorName)}
            </div>
            {isOnline && (
              <span className="absolute bottom-0.5 right-0.5 block h-3.5 w-3.5 rounded-full border-2 border-white bg-green-500 dark:border-navy-900"
                style={{ animation: "pulse-ring 2s infinite" }} />
            )}
          </div>
          <div className="mt-3 text-base font-semibold text-navy-700 dark:text-navy-100">{visitorName}</div>
          {chat?.visitor_email && (
            <a href={`mailto:${chat.visitor_email}`} className="mt-1 block text-sm text-brand-500 hover:text-brand-600">{chat.visitor_email}</a>
          )}
          {geoLocation && (
            <div className="mt-1.5 flex items-center justify-center gap-1 text-xs text-navy-400">
              <MapPin size={11} /> {geoLocation}
            </div>
          )}
          {localTimeDisplay && (
            <div className="mt-1 flex items-center justify-center gap-1 text-xs text-navy-400">
              <Clock size={11} /> {localTimeDisplay} local time
            </div>
          )}
          <div className="mt-2 flex items-center justify-center gap-1.5">
            {isOnline
              ? <span className="flex items-center gap-1 text-xs font-medium text-green-600"><span className="h-1.5 w-1.5 rounded-full bg-green-500" />Online now</span>
              : <span className="text-xs text-navy-400">Offline</span>}
          </div>
        </div>

        {/* Section 2: Map */}
        <div className="shrink-0 border-b border-navy-100 dark:border-navy-700">
          {geoLoading && (
            <div className="flex h-44 items-center justify-center bg-navy-50 dark:bg-navy-800">
              <span className="text-xs text-navy-400">Loading map…</span>
            </div>
          )}
          {!geoLoading && resolvedLatitude !== null && resolvedLongitude !== null && (
            <VisitorMap latitude={resolvedLatitude} longitude={resolvedLongitude} city={resolvedCity} country={resolvedCountry} source={geoSource} accuracyMeters={geoAccuracy} />
          )}
          {!geoLoading && resolvedLatitude === null && geoLocation && (
            <div className="flex h-24 items-center justify-center bg-navy-50 dark:bg-navy-800">
              <div className="text-center">
                <MapPin size={18} className="mx-auto mb-1 text-danger-400" />
                <div className="text-xs font-medium text-navy-500">{geoLocation}</div>
                <div className="mt-0.5 text-[10px] text-navy-400">No coordinates available</div>
              </div>
            </div>
          )}
          {!geoLoading && resolvedLatitude === null && !geoLocation && geoFetchedIp && (
            <div className="flex h-16 items-center justify-center bg-navy-50 dark:bg-navy-800">
              <div className="text-center">
                <MapPin size={16} className="mx-auto mb-1 text-navy-300" />
                <div className="text-[10px] text-navy-400">Location unavailable</div>
              </div>
            </div>
          )}
        </div>

        <div className="divide-y divide-navy-100 dark:divide-navy-700">

          {/* Section 3: Additional info */}
          <PanelSection title="Additional info" open={additionalOpen} onToggle={() => setAdditionalOpen((v) => !v)}>
            <InfoRow label="Returning visitor" value={`${sessionVisitCount} visit${sessionVisitCount !== 1 ? "s" : ""}, ${sessionChatCount} chat${sessionChatCount !== 1 ? "s" : ""}`} />
            {sessionLastSeen && <InfoRow label="Last seen" value={formatRelative(sessionLastSeen)} />}
            {chat?.visitor_session?.first_seen_at && <InfoRow label="First seen" value={formatRelative(chat.visitor_session.first_seen_at)} />}
            {chatDuration && <InfoRow label="Chat duration" value={chatDuration} />}
            {chat?.visitor_session?.current_url && (
              <div className="flex items-start justify-between gap-3">
                <span className="shrink-0 text-navy-400 dark:text-navy-500">Current page</span>
                <a href={chat.visitor_session.current_url} target="_blank" rel="noreferrer"
                  className="break-all text-right text-xs font-medium text-blue-500 hover:underline" title={chat.visitor_session.current_url}>
                  {(() => { try { return new URL(chat.visitor_session.current_url!).pathname || "/"; } catch { return chat.visitor_session.current_url; } })()}
                </a>
              </div>
            )}
            {chat?.visitor_session?.referrer && <InfoRow label="Referrer" value={chat.visitor_session.referrer} />}
            <InfoRow label="Groups" value="General" />
          </PanelSection>

          {/* Section 4: Visited pages */}
          <PanelSection title="Visited pages" open={pagesOpen} onToggle={() => setPagesOpen((v) => !v)}>
            {pageDurations.length > 0 ? (
              <div className="grid gap-3">
                {pageDurations.slice(0, 8).map((page, i) => (
                  <div key={i}>
                    <div className="flex items-center gap-1">
                      <a href={page.url} target="_blank" rel="noreferrer"
                        className="block truncate text-xs font-medium text-blue-500 hover:underline" title={page.url}>
                        {page.label}
                      </a>
                      {page.isLive && <span className="shrink-0 rounded-full bg-green-100 px-1 text-[9px] font-semibold text-green-600">live</span>}
                    </div>
                    <div className="mt-0.5 text-[11px] text-navy-400">{page.duration}</div>
                  </div>
                ))}
              </div>
            ) : <div className="text-xs text-navy-400">No page history available.</div>}
          </PanelSection>

          {/* Section 5: Pre-chat form */}
          <PanelSection title="Pre-chat form" open={preChatOpen} onToggle={() => setPreChatOpen((v) => !v)}>
            {chat?.visitor_name && <InfoRow label="Name" value={chat.visitor_name} />}
            {chat?.visitor_email && <InfoRow label="E-mail" value={chat.visitor_email} accent />}
            {!chat?.visitor_name && !chat?.visitor_email && <div className="text-xs text-navy-400">No pre-chat form data.</div>}
          </PanelSection>

          {/* Section 6: Technology */}
          <PanelSection title="Technology" open={techOpen} onToggle={() => setTechOpen((v) => !v)}>
            {resolvedPublicIp && <InfoRow label="IP address" value={resolvedPublicIp} />}
            {uaOs && <InfoRow label="OS / Device" value={uaDevice ? `${uaOs} / ${uaDevice}` : uaOs} />}
            {uaBrowser && <InfoRow label="Browser" value={uaBrowser} />}
            {resolvedIsp && <InfoRow label="ISP" value={resolvedIsp} />}
            {resolvedTimezone && <InfoRow label="Timezone" value={resolvedTimezone} />}
            {!resolvedPublicIp && !uaOs && !uaBrowser && <div className="text-xs text-navy-400">No technology data.</div>}
          </PanelSection>

          {/* Section 7: Integrations data */}
          <PanelSection title="Integrations data" open={integrationsOpen} onToggle={() => setIntegrationsOpen((v) => !v)}>
            {chat?.visitor_name && <InfoRow label="default_Name" value={chat.visitor_name} />}
            {chat?.visitor_email && <InfoRow label="default_E-mail" value={chat.visitor_email} />}
            {Object.entries(integrationsData).slice(0, 15).map(([k, v]) => (
              <InfoRow key={k} label={k} value={String(v ?? "")} />
            ))}
            {!chat?.visitor_name && !chat?.visitor_email && Object.keys(integrationsData).length === 0 && (
              <div className="text-xs text-navy-400">No integrations data.</div>
            )}
          </PanelSection>

          {/* Section 8: E-commerce — always visible */}
          <PanelSection title="E-commerce" open={ecommerceOpen} onToggle={() => setEcommerceOpen((v) => !v)}>
            <InfoRow label="Total orders" value={chat?.ecommerce?.orders != null ? String(chat.ecommerce.orders) : "0"} />
            <InfoRow label="Total spent" value={chat?.ecommerce?.lifetime_value != null ? formatMoney(chat.ecommerce.lifetime_value, null) : "$0.00"} />
            <InfoRow label="Last order" value={chat?.ecommerce?.last_order ? formatRelative(chat.ecommerce.last_order) : "Never"} />
            {chat?.visitor_session?.first_seen_at && (
              <InfoRow label="Customer since" value={formatRelative(chat.visitor_session.first_seen_at)} />
            )}
            {chat?.ecommerce?.lead_score != null && <InfoRow label="Lead score" value={String(chat.ecommerce.lead_score)} />}
            {chat?.ecommerce?.churn_risk != null && <InfoRow label="Churn risk" value={String(chat.ecommerce.churn_risk)} />}
            {!hasEcommerce && (
              <div className="mt-1 text-[10px] italic text-navy-400">Connect your store to see order data</div>
            )}
          </PanelSection>

          {/* Past chats with status badges */}
          {(chat?.past_chats?.length ?? 0) > 0 && (
            <PanelSection title={`Past chats (${chat?.past_chats?.length})`} open={pastChatsOpen} onToggle={() => setPastChatsOpen((v) => !v)}>
              <div className="grid gap-2">
                {(chat?.past_chats ?? []).slice(0, 8).map((c) => (
                  <div key={c.id} className="rounded-lg border border-navy-100 p-2.5 transition hover:bg-navy-50 dark:border-navy-700 dark:hover:bg-navy-800">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-1.5">
                        <MessageSquare size={11} className="shrink-0 text-navy-400" />
                        <span className="truncate text-xs font-medium text-navy-700 dark:text-navy-200">{c.subject || "Chat"}</span>
                      </div>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold text-white ${
                        c.status === "resolved" ? "bg-green-600"
                        : c.status === "active" || c.status === "open" ? "bg-blue-600"
                        : c.status === "missed" ? "bg-red-600"
                        : "bg-navy-400"}`}>
                        {c.status}
                      </span>
                    </div>
                    {c.updated_at && <div className="mt-1 text-[10px] text-navy-400">{formatRelative(c.updated_at)}</div>}
                  </div>
                ))}
              </div>
            </PanelSection>
          )}

          {/* Tickets */}
          {(chat?.tickets?.length ?? 0) > 0 && (
            <PanelSection title={`Tickets (${chat?.tickets?.length})`} open={ticketsOpen} onToggle={() => setTicketsOpen((v) => !v)}>
              <div className="grid gap-2">
                {(chat?.tickets ?? []).slice(0, 6).map((ticket) => (
                  <div key={ticket.id} className="flex items-start justify-between gap-2 text-xs">
                    <span className="truncate text-navy-500 dark:text-navy-400">#{ticket.ticket_number} {ticket.subject}</span>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold text-white ${ticket.status === "resolved" ? "bg-green-600" : "bg-navy-400"}`}>
                      {ticket.status}
                    </span>
                  </div>
                ))}
              </div>
            </PanelSection>
          )}

        </div>
      </aside>
    </>
  );
}
