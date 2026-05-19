import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Activity, BarChart2, PhoneCall, Target, TrendingUp, Users, Zap } from "lucide-react";
import toast from "react-hot-toast";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { PageHeader } from "../components/AgentLayout";
import { Button, Card, EmptyPanel, Field, MetricCard, PageShell, PanelHeader, SelectInput, TextArea, TextInput } from "../components/ui";
import { api } from "../lib/api";
import { useThemeStore } from "../stores/themeStore";

// ─── Benchmark Report ──────────────────────────────────────────────────────────

export function BenchmarkPage(): JSX.Element {
  const theme = useThemeStore((s) => s.theme);
  const axisColor = theme === "dark" ? "#9aacbf" : "#64748b";
  const gridColor = theme === "dark" ? "#243244" : "#dbe3ee";
  const tooltipStyle = theme === "dark"
    ? { backgroundColor: "#111b2e", border: "1px solid #243244", color: "#e6edf7" }
    : { backgroundColor: "#ffffff", border: "1px solid #dbe3ee", color: "#0f172a" };

  const [days, setDays] = useState(30);
  const { data, isLoading } = useQuery({
    queryKey: ["gaps", "benchmark", days],
    queryFn: async () => (await api.get<BenchmarkData>("/gaps/reports/benchmark", { params: { days } })).data,
  });

  const STATUS_COLOR: Record<string, string> = {
    better: "text-emerald-600 dark:text-emerald-400",
    worse: "text-red-500 dark:text-red-400",
    on_par: "text-blue-600 dark:text-blue-400",
    no_data: "text-navy-400",
  };
  const STATUS_LABEL: Record<string, string> = {
    better: "Above industry",
    worse: "Below industry",
    on_par: "On par",
    no_data: "No data",
  };

  const chartData = data
    ? Object.entries(data.comparison)
        .filter(([, v]) => v.your !== null && v.industry !== null)
        .map(([key, v]) => ({
          name: key.replace(/_/g, " "),
          you: Number(v.your?.toFixed(2) ?? 0),
          industry: Number(v.industry?.toFixed(2) ?? 0),
        }))
    : [];

  return (
    <PageShell>
      <PageHeader title="Industry Benchmark" />
      <div className="grid gap-4 p-4 lg:gap-6 lg:p-6">
        <div className="flex items-center gap-3">
          <Field label="Period">
            <SelectInput value={String(days)} onChange={(e) => setDays(Number(e.target.value))}>
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
            </SelectInput>
          </Field>
        </div>

        {isLoading && <Card className="p-6 text-center text-navy-400">Loading benchmark...</Card>}
        {data && (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {Object.entries(data.comparison).map(([key, val]) => (
                <Card key={key} className="p-4">
                  <div className="text-xs font-semibold uppercase tracking-wider text-navy-400">{key.replace(/_/g, " ")}</div>
                  <div className="mt-1 text-2xl font-black text-navy-700 dark:text-navy-100">
                    {val.your !== null ? String(val.your) : "—"}
                  </div>
                  <div className="mt-0.5 text-xs text-navy-400">Industry: {val.industry}</div>
                  <div className={`mt-1 text-xs font-semibold ${STATUS_COLOR[val.status]}`}>
                    {STATUS_LABEL[val.status]}
                  </div>
                </Card>
              ))}
            </div>
            <Card>
              <PanelHeader title="Your metrics vs industry average" />
              <div className="p-4">
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={chartData} margin={{ top: 8, right: 16, left: -8, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                    <XAxis dataKey="name" tick={{ fill: axisColor, fontSize: 11 }} />
                    <YAxis tick={{ fill: axisColor, fontSize: 11 }} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="you" fill="#3b82f6" name="You" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="industry" fill="#94a3b8" name="Industry" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </>
        )}
      </div>
    </PageShell>
  );
}

// ─── Chat Availability Report ──────────────────────────────────────────────────

export function ChatAvailabilityPage(): JSX.Element {
  const [days, setDays] = useState(7);
  const { data, isLoading } = useQuery({
    queryKey: ["gaps", "availability", days],
    queryFn: async () => (await api.get<AvailabilityData>("/gaps/reports/chat-availability", { params: { days } })).data,
  });

  return (
    <PageShell>
      <PageHeader title="Chat Availability" />
      <div className="grid gap-4 p-4 lg:gap-6 lg:p-6">
        <div className="flex items-center gap-3">
          <Field label="Period">
            <SelectInput value={String(days)} onChange={(e) => setDays(Number(e.target.value))}>
              <option value="7">Last 7 days</option>
              <option value="14">Last 14 days</option>
              <option value="30">Last 30 days</option>
            </SelectInput>
          </Field>
        </div>

        {isLoading && <Card className="p-6 text-center text-navy-400">Loading...</Card>}
        {data && data.agents.length === 0 && (
          <EmptyPanel title="No availability data" description="Availability is logged when agents change their status. Data will appear here once agents start using the dashboard." />
        )}
        {data && data.agents.length > 0 && (
          <div className="grid gap-4">
            {data.agents.map((agent) => (
              <Card key={agent.user_id} className="overflow-hidden">
                <PanelHeader title={agent.name} description={`${Object.keys(agent.days).length} days with activity`} />
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-navy-100 dark:border-navy-700 bg-navy-50 dark:bg-navy-800/50">
                        <th className="px-4 py-2 text-left font-semibold text-navy-500 dark:text-navy-400">Date</th>
                        <th className="px-4 py-2 text-right font-semibold text-emerald-600">Online</th>
                        <th className="px-4 py-2 text-right font-semibold text-amber-600">Away</th>
                        <th className="px-4 py-2 text-right font-semibold text-navy-400">Offline</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {Object.entries(agent.days).map(([day, counts]) => (
                        <tr key={day}>
                          <td className="px-4 py-2 font-mono text-xs text-navy-600 dark:text-navy-300">{day}</td>
                          <td className="px-4 py-2 text-right text-emerald-600 font-semibold">{counts.online}</td>
                          <td className="px-4 py-2 text-right text-amber-600 font-semibold">{counts.away}</td>
                          <td className="px-4 py-2 text-right text-navy-400">{counts.offline}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </PageShell>
  );
}

// ─── Greetings Conversion Report ──────────────────────────────────────────────

export function GreetingsConversionPage(): JSX.Element {
  const [days, setDays] = useState(30);
  const { data, isLoading } = useQuery({
    queryKey: ["gaps", "greetings-conversion", days],
    queryFn: async () => (await api.get<GreetingsConversionData>("/gaps/reports/greetings-conversion", { params: { days } })).data,
  });

  return (
    <PageShell>
      <PageHeader title="Greetings Conversion" />
      <div className="grid gap-4 p-4 lg:gap-6 lg:p-6">
        <div className="flex items-center gap-3">
          <Field label="Period">
            <SelectInput value={String(days)} onChange={(e) => setDays(Number(e.target.value))}>
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
            </SelectInput>
          </Field>
        </div>

        {isLoading && <Card className="p-6 text-center text-navy-400">Loading...</Card>}
        {data && (
          <>
            <div className="grid grid-cols-3 gap-3">
              <MetricCard label="Total impressions" value={String(data.total_impressions)} />
              <MetricCard label="Total conversions" value={String(data.total_conversions)} />
              <MetricCard label="Conversion rate" value={`${(data.overall_conversion_rate * 100).toFixed(1)}%`} />
            </div>

            {data.items.length === 0 ? (
              <EmptyPanel title="No greeting events yet" description="Greeting impressions and conversions are recorded when visitors interact with targeted greetings." />
            ) : (
              <Card className="overflow-hidden">
                <PanelHeader title="Per-greeting breakdown" />
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-navy-100 dark:border-navy-700 bg-navy-50 dark:bg-navy-800/50">
                        <th className="px-4 py-2 text-left font-semibold text-navy-500 dark:text-navy-400">Greeting</th>
                        <th className="px-4 py-2 text-right font-semibold">Impressions</th>
                        <th className="px-4 py-2 text-right font-semibold">Conversions</th>
                        <th className="px-4 py-2 text-right font-semibold">Rate</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {data.items.map((item, i) => (
                        <tr key={i}>
                          <td className="max-w-xs truncate px-4 py-2 text-navy-600 dark:text-navy-300">{item.greeting_text || item.greeting_id || "—"}</td>
                          <td className="px-4 py-2 text-right text-navy-600 dark:text-navy-300">{item.impressions}</td>
                          <td className="px-4 py-2 text-right text-navy-600 dark:text-navy-300">{item.conversions}</td>
                          <td className="px-4 py-2 text-right font-semibold text-blue-600 dark:text-blue-400">
                            {(item.conversion_rate * 100).toFixed(1)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </>
        )}
      </div>
    </PageShell>
  );
}

// ─── Moments Manager ──────────────────────────────────────────────────────────

export function MomentsPage(): JSX.Element {
  const queryClient = useQueryClient();
  const [chatId, setChatId] = useState("");
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [momentType, setMomentType] = useState("custom");

  const { data: moments = [], isLoading } = useQuery({
    queryKey: ["gaps", "moments"],
    queryFn: async () => (await api.get<MomentItem[]>("/gaps/moments")).data,
  });

  const createMoment = useMutation({
    mutationFn: async () =>
      api.post("/gaps/moments", { chat_id: chatId, title, url, type: momentType }),
    onSuccess: async () => {
      toast.success("Moment sent to visitor");
      setChatId(""); setTitle(""); setUrl("");
      await queryClient.invalidateQueries({ queryKey: ["gaps", "moments"] });
    },
    onError: () => toast.error("Failed to send moment"),
  });

  const TYPE_LABELS: Record<string, string> = {
    custom: "Custom app",
    payment: "Payment form",
    booking: "Booking / Calendly",
    survey: "Survey",
    form: "Form",
  };

  return (
    <PageShell>
      <PageHeader title="Moments" />
      <div className="grid grid-cols-1 gap-4 p-4 lg:grid-cols-[minmax(320px,420px)_minmax(0,1fr)] lg:gap-6 lg:p-6">
        <Card className="p-4">
          <h2 className="text-lg font-black text-navy-700 dark:text-navy-100">Send a Moment</h2>
          <p className="mt-1 text-sm text-navy-400">Open a temporary in-chat app overlay for a visitor — payment form, booking link, survey, or any custom URL.</p>
          <div className="mt-4 grid gap-3">
            <Field label="Chat ID">
              <TextInput value={chatId} onChange={(e) => setChatId(e.target.value)} placeholder="Paste active chat UUID" />
            </Field>
            <Field label="Title shown to visitor">
              <TextInput value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Complete your payment" />
            </Field>
            <Field label="URL (opens in iframe)">
              <TextInput value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://your-app.com/action" />
            </Field>
            <Field label="Type">
              <SelectInput value={momentType} onChange={(e) => setMomentType(e.target.value)}>
                {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </SelectInput>
            </Field>
            <Button
              variant="primary"
              disabled={createMoment.isPending || !chatId.trim() || !title.trim() || !url.trim()}
              onClick={() => createMoment.mutate()}
            >
              {createMoment.isPending ? "Sending..." : "Send Moment"}
            </Button>
          </div>
        </Card>

        <Card className="overflow-hidden">
          <PanelHeader title="Recent moments" />
          {isLoading && <div className="p-6 text-center text-navy-400 text-sm">Loading...</div>}
          {!isLoading && moments.length === 0 && (
            <EmptyPanel title="No moments sent yet" description="Send a Moment from the form to open an in-chat app overlay for a visitor." />
          )}
          {moments.length > 0 && (
            <div className="divide-y divide-border">
              {moments.map((m) => (
                <div key={m.id} className="flex items-center justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <div className="truncate font-semibold text-navy-700 dark:text-navy-100">{m.title}</div>
                    <div className="truncate text-xs text-navy-400">{m.url}</div>
                    <div className="mt-0.5 flex gap-2 text-xs text-navy-400">
                      <span>{m.type}</span>
                      <span>·</span>
                      <span className={m.visitor_completed ? "text-emerald-600" : "text-amber-600"}>
                        {m.visitor_completed ? "Completed" : m.status}
                      </span>
                    </div>
                  </div>
                  <div className="shrink-0 text-xs text-navy-400">{new Date(m.created_at).toLocaleDateString()}</div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </PageShell>
  );
}

// ─── Voice / Video Settings (informational + enable toggle) ───────────────────

export function VoiceVideoPage(): JSX.Element {
  const queryClient = useQueryClient();
  const { data: org } = useQuery({ queryKey: ["org"], queryFn: async () => (await api.get("/admin/org")).data });
  const [enabled, setEnabled] = useState(false);

  const save = useMutation({
    mutationFn: async () => api.patch("/admin/org", { widget_voice_video_enabled: enabled }),
    onSuccess: async () => {
      toast.success("Voice/video settings saved");
      await queryClient.invalidateQueries({ queryKey: ["org"] });
    },
    onError: () => toast.error("Could not save"),
  });

  // Sync from server
  useState(() => { if (org) setEnabled(Boolean(org.widget_voice_video_enabled)); });

  return (
    <PageShell>
      <PageHeader title="Voice, Video & Screen Share" />
      <div className="grid gap-4 p-4 lg:gap-6 lg:p-6">
        <Card className="p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/40">
              <PhoneCall size={20} className="text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="font-black text-navy-700 dark:text-navy-100">In-chat Voice, Video & Screen Share</h3>
              <p className="mt-1 text-sm text-navy-400">
                When enabled, agents and visitors can start voice/video calls and screen sharing directly inside the chat window. Uses WebRTC — no plugin required.
              </p>
              <ul className="mt-3 grid gap-1.5 text-sm text-navy-500 dark:text-navy-400">
                <li>• Agent sees <strong>Voice</strong>, <strong>Video</strong>, <strong>Screen share</strong> buttons in chat header</li>
                <li>• Visitor sees an <strong>Accept call</strong> button when agent initiates</li>
                <li>• All signaling via <code className="rounded bg-navy-100 px-1 dark:bg-navy-800">webrtc:signal</code> socket event</li>
                <li>• Works on Chrome, Firefox, Edge, Safari 15+</li>
              </ul>
              <div className="mt-4 flex items-center gap-3">
                <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-semibold text-navy-600 dark:text-navy-300">
                  <input
                    type="checkbox"
                    checked={enabled}
                    onChange={(e) => setEnabled(e.target.checked)}
                  />
                  Enable voice/video in widget
                </label>
                <Button variant="primary" disabled={save.isPending} onClick={() => save.mutate()}>
                  {save.isPending ? "Saving..." : "Save"}
                </Button>
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="font-black text-navy-700 dark:text-navy-100">How it works</h3>
          <ol className="mt-3 grid gap-2 text-sm text-navy-500 dark:text-navy-400 list-decimal list-inside">
            <li>Agent clicks <strong>Start call</strong> in chat — emits <code className="rounded bg-navy-100 px-1 dark:bg-navy-800">webrtc:signal</code> with <code>mode: "voice"</code></li>
            <li>Widget receives signal, shows <strong>Incoming call</strong> banner</li>
            <li>Visitor accepts → WebRTC peer connection established</li>
            <li>For screen share: agent emits <code className="rounded bg-navy-100 px-1 dark:bg-navy-800">cobrowse:request</code></li>
            <li>Call ends when either party closes the widget or clicks hang up</li>
          </ol>
        </Card>
      </div>
    </PageShell>
  );
}

// ─── Type definitions ──────────────────────────────────────────────────────────

interface BenchmarkData {
  days: number;
  total_chats: number;
  comparison: Record<string, {
    your: number | null;
    industry: number;
    delta: number | null;
    status: "better" | "worse" | "on_par" | "no_data";
  }>;
}

interface AvailabilityData {
  days: number;
  agents: Array<{
    user_id: string;
    name: string;
    days: Record<string, { online: number; offline: number; away: number }>;
  }>;
}

interface GreetingsConversionData {
  days: number;
  total_impressions: number;
  total_conversions: number;
  overall_conversion_rate: number;
  items: Array<{
    greeting_id: string;
    greeting_text: string;
    impressions: number;
    conversions: number;
    conversion_rate: number;
  }>;
}

interface MomentItem {
  id: string;
  chat_id: string;
  title: string;
  url: string;
  type: string;
  status: string;
  visitor_completed: boolean;
  visitor_completed_at: string | null;
  created_at: string;
}
