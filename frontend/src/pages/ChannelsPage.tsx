import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  Facebook,
  Instagram,
  MessageSquare,
  Phone,
  Plug,
  Plus,
  Send,
  Trash2,
  Webhook,
} from "lucide-react";

import { api } from "../lib/api";

interface Connection {
  id: string;
  channel: string;
  name: string;
  external_id: string;
  settings: Record<string, unknown>;
  is_active: boolean;
  status: string;
  last_inbound_at: string | null;
  last_outbound_at: string | null;
  last_error: string | null;
  created_at: string;
}

interface ChannelOption {
  channel: string;
  display_name: string;
}

const ICONS: Record<string, JSX.Element> = {
  messenger: <Facebook size={14} />,
  instagram: <Instagram size={14} />,
  whatsapp: <MessageSquare size={14} />,
  sms: <Phone size={14} />,
  telegram: <Send size={14} />,
  email: <Send size={14} />,
};

const CRED_FIELDS: Record<string, string[]> = {
  messenger: ["page_access_token", "app_secret", "verify_token"],
  instagram: ["page_access_token", "app_secret", "verify_token"],
  whatsapp: ["access_token", "phone_number_id", "app_secret", "verify_token"],
  sms: ["account_sid", "auth_token", "from_number"],
  telegram: ["bot_token", "webhook_secret"],
  email: ["inbound_secret"],
  apple: ["access_token", "outbound_url", "webhook_secret"],
  twitter: ["access_token", "outbound_url", "webhook_secret"],
  line: ["access_token", "outbound_url", "webhook_secret"],
  viber: ["access_token", "outbound_url", "webhook_secret"],
};

export function ChannelsPage(): JSX.Element {
  const qc = useQueryClient();
  const [channel, setChannel] = useState("messenger");
  const [name, setName] = useState("");
  const [externalId, setExternalId] = useState("");
  const [creds, setCreds] = useState<Record<string, string>>({});
  const [testRecipient, setTestRecipient] = useState("");

  const { data: connections = [] } = useQuery({
    queryKey: ["channel-connections"],
    queryFn: async () => (await api.get<Connection[]>("/channels/connections")).data,
    refetchInterval: 8000,
  });

  const { data: avail = { items: [] as ChannelOption[] } } = useQuery({
    queryKey: ["channel-options"],
    queryFn: async () => (await api.get<{ items: ChannelOption[] }>("/channels/available")).data,
  });

  const fields = useMemo(() => CRED_FIELDS[channel] ?? ["access_token"], [channel]);

  const create = useMutation({
    mutationFn: async () =>
      (
        await api.post<Connection>("/channels/connections", {
          channel,
          name,
          external_id: externalId,
          credentials: creds,
          settings: {},
          is_active: true,
        })
      ).data,
    onSuccess: () => {
      toast.success("Connection created");
      setName("");
      setExternalId("");
      setCreds({});
      void qc.invalidateQueries({ queryKey: ["channel-connections"] });
    },
    onError: () => toast.error("Create failed"),
  });

  const toggle = useMutation({
    mutationFn: async (c: Connection) =>
      api.put(`/channels/connections/${c.id}`, {
        channel: c.channel,
        name: c.name,
        external_id: c.external_id,
        credentials: {},
        settings: c.settings,
        is_active: !c.is_active,
      }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["channel-connections"] }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => api.delete(`/channels/connections/${id}`),
    onSuccess: () => {
      toast.success("Removed");
      void qc.invalidateQueries({ queryKey: ["channel-connections"] });
    },
  });

  const test = useMutation({
    mutationFn: async (c: Connection) =>
      api.post(`/channels/connections/${c.id}/test`, {
        recipient: testRecipient,
        text: "Test message from FlowLyra.",
      }),
    onSuccess: () => toast.success("Test queued"),
    onError: () => toast.error("Test failed"),
  });

  const webhookUrl = (c: Connection): string => {
    const base = window.location.origin;
    return `${base.replace(/^https?:\/\//, "https://api.")}/api/v1/channels/webhook/${c.channel}/${c.id}`;
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div className="flex items-center gap-2 text-lg font-black">
        <Plug size={20} /> Channels
      </div>

      <div className="rounded-xl border border-navy-100 dark:border-navy-700 bg-white p-4 dark:bg-navy-900">
        <div className="mb-3 text-sm font-black uppercase text-navy-400">Connect channel</div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <select
            value={channel}
            onChange={(e) => {
              setChannel(e.target.value);
              setCreds({});
            }}
            className="rounded border border-navy-100 dark:border-navy-700 bg-navy-50 px-3 py-2 text-sm dark:bg-navy-800"
          >
            {avail.items.map((o) => (
              <option key={o.channel} value={o.channel}>
                {o.display_name}
              </option>
            ))}
          </select>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name"
            className="rounded border border-navy-100 dark:border-navy-700 bg-navy-50 px-3 py-2 text-sm dark:bg-navy-800"
          />
          <input
            value={externalId}
            onChange={(e) => setExternalId(e.target.value)}
            placeholder="External ID (page_id / phone_id / chat_id)"
            className="rounded border border-navy-100 dark:border-navy-700 bg-navy-50 px-3 py-2 text-sm dark:bg-navy-800"
          />
        </div>
        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {fields.map((field) => (
            <input
              key={field}
              type="password"
              value={creds[field] ?? ""}
              onChange={(e) => setCreds({ ...creds, [field]: e.target.value })}
              placeholder={field}
              className="rounded border border-navy-100 dark:border-navy-700 bg-navy-50 px-3 py-2 text-xs font-mono dark:bg-navy-800"
            />
          ))}
        </div>
        <button
          disabled={!name.trim() || !externalId.trim() || create.isPending}
          onClick={() => create.mutate()}
          className="mt-3 rounded bg-purple-600 px-3 py-2 text-sm font-bold text-white hover:bg-purple-700 disabled:opacity-50"
        >
          <Plus size={14} className="inline" /> Add connection
        </button>
      </div>

      <div className="rounded-xl border border-navy-100 dark:border-navy-700 bg-white p-4 dark:bg-navy-900">
        <div className="mb-3 text-sm font-black uppercase text-navy-400">
          Connections ({connections.length})
        </div>
        <div className="space-y-2">
          {connections.map((c) => (
            <div key={c.id} className="rounded border border-navy-100 dark:border-navy-700 p-3 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded bg-navy-100 px-2 py-1 text-[11px] font-black uppercase dark:bg-navy-800">
                  {ICONS[c.channel] ?? <Plug size={12} />} {c.channel}
                </span>
                <div className="font-bold">{c.name}</div>
                <span
                  className={`rounded px-2 py-0.5 text-[10px] font-black uppercase ${
                    c.status === "healthy"
                      ? "bg-emerald-100 text-emerald-700"
                      : c.status === "degraded"
                      ? "bg-amber-100 text-amber-700"
                      : "bg-red-100 text-red-700"
                  }`}
                >
                  {c.status}
                </span>
                <span className="ml-auto text-[11px] text-navy-400">
                  {c.is_active ? "active" : "paused"}
                </span>
                <button
                  onClick={() => toggle.mutate(c)}
                  className="rounded border border-navy-100 dark:border-navy-700 px-2 py-1 text-[11px] font-bold"
                >
                  {c.is_active ? "Pause" : "Resume"}
                </button>
                <button
                  onClick={() => remove.mutate(c.id)}
                  className="rounded p-1 text-red-600 hover:bg-red-50"
                >
                  <Trash2 size={13} />
                </button>
              </div>
              <div className="mt-1 text-[11px] text-navy-400">
                external_id <span className="font-mono">{c.external_id}</span>
                {c.last_error && <span className="ml-2 text-red-600">err: {c.last_error}</span>}
              </div>
              <div className="mt-1 flex items-center gap-1 text-[11px] text-navy-400">
                <Webhook size={11} />
                <code className="rounded bg-navy-100 px-2 py-0.5 dark:bg-navy-800">{webhookUrl(c)}</code>
                <button
                  onClick={() => navigator.clipboard.writeText(webhookUrl(c))}
                  className="ml-1 rounded border border-navy-100 dark:border-navy-700 px-1 text-[10px]"
                >
                  copy
                </button>
              </div>
              <div className="mt-2 flex items-center gap-1">
                <input
                  value={testRecipient}
                  onChange={(e) => setTestRecipient(e.target.value)}
                  placeholder="Test recipient (psid / phone)"
                  className="h-8 flex-1 rounded border border-navy-100 dark:border-navy-700 bg-navy-50 px-2 text-xs dark:bg-navy-800"
                />
                <button
                  disabled={!testRecipient.trim()}
                  onClick={() => test.mutate(c)}
                  className="rounded bg-navy-900 px-2 py-1 text-[11px] font-bold text-white dark:bg-white dark:text-navy-700"
                >
                  Send test
                </button>
              </div>
            </div>
          ))}
          {connections.length === 0 && <div className="px-2 text-xs text-navy-400">No channels connected yet.</div>}
        </div>
      </div>
    </div>
  );
}
