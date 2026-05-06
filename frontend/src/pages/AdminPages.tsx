import { useQuery } from "@tanstack/react-query";
import type { ReactElement } from "react";
import { Check, Copy, ExternalLink, MessageSquare, Palette, ShieldCheck, Sparkles, UsersRound } from "lucide-react";
import { useMemo, useState } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import flowlyraMark from "../assets/flowlyra-mark.svg";
import { PageHeader } from "../components/AgentLayout";
import { Button, Card, EmptyPanel, Field, MetricCard, PageShell, PanelHeader, SelectInput, TextArea } from "../components/ui";
import { api } from "../lib/api";
import { useThemeStore } from "../stores/themeStore";

export function AgentsPage(): JSX.Element {
  const { data = [] } = useQuery({ queryKey: ["agents"], queryFn: async () => (await api.get("/agents")).data });
  return <TablePage title="Agents" rows={data} columns={["full_name", "email", "role", "status", "max_chats"]} action="Invite agent" />;
}

export function TeamsPage(): JSX.Element {
  const { data = [] } = useQuery({ queryKey: ["teams"], queryFn: async () => (await api.get("/admin/teams")).data });
  return <TablePage title="Teams" rows={data} columns={["name", "description", "routing_mode"]} action="Create team" />;
}

export function WidgetConfigPage(): JSX.Element {
  const { data } = useQuery({ queryKey: ["org"], queryFn: async () => (await api.get("/admin/org")).data });
  const color = String(data?.widget_color ?? "#1E40AF");
  return (
    <PageShell>
      <PageHeader title="Widget" action={<a className="inline-flex items-center gap-2 rounded-lg border border-border bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700" href="/admin/install"><ExternalLink size={16} /> Install</a>} />
      <div className="grid grid-cols-1 gap-4 p-4 lg:grid-cols-[minmax(300px,420px)_minmax(0,1fr)] lg:gap-6 lg:p-6">
        <Card>
          <PanelHeader title="Live editor" description="Match the widget to your website and make the first customer screen feel human." />
          <form className="grid gap-4 p-4 sm:p-5">
          <Field label="Brand color"><input className="h-11 w-full rounded-lg border border-border bg-white p-1" type="color" defaultValue={color} /></Field>
          <Field label="Greeting"><TextArea className="min-h-24" defaultValue={data?.widget_greeting ?? "Hi! How can we help you today?"} /></Field>
          <Field label="Position"><SelectInput><option>bottom-right</option><option>bottom-left</option></SelectInput></Field>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <FeatureToggle icon={<UsersRound size={16} />} title="Agent profiles" />
            <FeatureToggle icon={<Sparkles size={16} />} title="Quick topics" />
            <FeatureToggle icon={<ShieldCheck size={16} />} title="Human only" />
            <FeatureToggle icon={<Palette size={16} />} title="Brand theme" />
          </div>
          <Button variant="primary" type="button">Save</Button>
          </form>
        </Card>
        <Card>
          <PanelHeader title="Preview" description="Use the full test page to try real messages." action={<a className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-semibold hover:bg-slate-50" href="http://localhost:5174/" target="_blank" rel="noreferrer"><ExternalLink size={16} /> Test</a>} />
          <div className="grid min-h-[520px] place-items-end rounded-b-lg bg-[linear-gradient(135deg,#f8fafc,#e2e8f0)] p-4 sm:p-6">
            <div className="w-full max-w-[390px] overflow-hidden rounded-lg border border-slate-200 bg-white shadow-2xl">
              <div className="p-5 text-white" style={{ background: color }}>
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-full bg-white">
                    <img src={flowlyraMark} alt="FlowLyra mark" className="h-8 w-8 rounded-lg" />
                  </div>
                  <div><div className="font-black">FlowLyra</div><div className="text-xs opacity-85">Online now</div></div>
                </div>
                <div className="mt-5 text-2xl font-black leading-tight">{data?.widget_greeting ?? "Hi! How can we help you today?"}</div>
              </div>
              <div className="grid gap-2 bg-slate-50 p-4">
                {["Account support", "Product question", "Talk to sales"].map((item) => <div key={item} className="rounded-xl border border-border bg-white p-3 text-sm font-bold">{item}<div className="mt-1 text-xs font-normal text-slate-500">Start with this topic</div></div>)}
              </div>
            </div>
            <div className="mt-4 grid h-14 w-14 place-items-center rounded-full text-white shadow-xl" style={{ background: color }}><MessageSquare size={24} /></div>
          </div>
        </Card>
      </div>
    </PageShell>
  );
}

export function InstallPage(): JSX.Element {
  const { data } = useQuery({ queryKey: ["org"], queryFn: async () => (await api.get("/admin/org")).data });
  const orgSlug = String(data?.slug ?? "test-org");
  const localSnippet = useMemo(
    () => `<script>
  window.FlowLyraConfig = {
    orgSlug: "${orgSlug}",
    apiUrl: "http://localhost:8000"
  };
</script>
<script type="module" async src="http://localhost:5174/src/Widget.ts"></script>`,
    [orgSlug]
  );
  const productionSnippet = useMemo(
    () => `<script>
  window.FlowLyraConfig = {
    orgSlug: "${orgSlug}",
    apiUrl: "https://api.flowlyra.com"
  };
</script>
<script async src="https://cdn.flowlyra.com/widget.js"></script>`,
    [orgSlug]
  );
  return (
    <PageShell>
      <PageHeader title="Install Widget" action={<a className="inline-flex items-center gap-2 rounded-lg border border-border bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700" href="http://localhost:5174/" target="_blank" rel="noreferrer"><ExternalLink size={16} /> Test page</a>} />
      <div className="grid gap-4 p-4 sm:p-6">
        <Card className="p-4 sm:p-5">
          <h2 className="text-lg font-black text-slate-950">Local JavaScript Link</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">Use this while testing with Docker Compose on your machine.</p>
          <CodeBlock code={localSnippet} />
        </Card>
        <Card className="p-4 sm:p-5">
          <h2 className="text-lg font-black text-slate-950">Production Embed</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">Use this format when the widget is hosted on your CDN.</p>
          <CodeBlock code={productionSnippet} />
        </Card>
        <Card className="p-4 sm:p-5">
          <h2 className="text-lg font-black text-slate-950">Direct URLs</h2>
          <div className="mt-3 grid gap-2 text-sm">
            <CopyLine label="Local widget source" value="http://localhost:5174/src/Widget.ts" />
            <CopyLine label="Local test page" value="http://localhost:5174/" />
            <CopyLine label="Local API" value="http://localhost:8000" />
            <CopyLine label="Production CDN" value="https://cdn.flowlyra.com/widget.js" />
          </div>
        </Card>
      </div>
    </PageShell>
  );
}

function FeatureToggle({ icon, title }: { icon: ReactElement; title: string }): JSX.Element {
  return <div className="flex items-center gap-2 rounded-lg border border-border bg-slate-50 p-3 text-sm font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-200">{icon}<span className="min-w-0 truncate">{title}</span></div>;
}

export function RoutingRulesPage(): JSX.Element {
  return <BuilderPage title="Routing" label="Create rule" />;
}

export function TriggersPage(): JSX.Element {
  return <BuilderPage title="Proactive triggers" label="Create trigger" />;
}

export function CannedResponsesPage(): JSX.Element {
  const { data = [] } = useQuery({ queryKey: ["canned"], queryFn: async () => (await api.get("/admin/canned-responses")).data });
  return <TablePage title="Canned responses" rows={data} columns={["shortcut", "title", "content"]} action="New response" />;
}

export function BillingPage(): JSX.Element {
  return <BuilderPage title="Billing" label="Manage plan" />;
}

export function AnalyticsPage(): JSX.Element {
  const theme = useThemeStore((state) => state.theme);
  const axisColor = theme === "dark" ? "#9aacbf" : "#64748b";
  const gridColor = theme === "dark" ? "#243244" : "#dbe3ee";
  const tooltipStyle = theme === "dark" ? { backgroundColor: "#111b2e", border: "1px solid #243244", color: "#e6edf7" } : { backgroundColor: "#ffffff", border: "1px solid #dbe3ee", color: "#0f172a" };
  const { data: overview } = useQuery({
    queryKey: ["analytics", "overview"],
    queryFn: async () => (await api.get<{
      active_chats: number;
      queue_length: number;
      agents_online: number;
      avg_wait_seconds: number;
      todays_resolved: number;
      todays_csat: number | null;
    }>("/analytics/overview")).data,
    refetchInterval: 5000
  });
  const { data: volume = [] } = useQuery({
    queryKey: ["analytics", "chat-volume"],
    queryFn: async () => (await api.get<Array<{ bucket: string; count: number }>>("/analytics/chat-volume")).data,
    refetchInterval: 5000
  });
  const { data: csat = [] } = useQuery({
    queryKey: ["analytics", "csat"],
    queryFn: async () => (await api.get<Array<{ bucket: string; score: number }>>("/analytics/csat")).data,
    refetchInterval: 5000
  });
  const { data: responseTime } = useQuery({
    queryKey: ["analytics", "response-time"],
    queryFn: async () => (await api.get<{ p50: number; p90: number; p99: number }>("/analytics/response-time")).data,
    refetchInterval: 5000
  });
  const { data: agentStats = [] } = useQuery({
    queryKey: ["analytics", "agent-stats"],
    queryFn: async () => (await api.get<Array<{ agent_id: string; name: string; chats: number; csat: number | null }>>("/analytics/agent-stats")).data,
    refetchInterval: 5000
  });
  const { data: missed = [] } = useQuery({
    queryKey: ["analytics", "missed-chats"],
    queryFn: async () => (await api.get<Array<{ id: string }>>("/analytics/missed-chats")).data,
    refetchInterval: 5000
  });

  const todayChats = volume.reduce((total, point) => (isToday(point.bucket) ? total + point.count : total), 0);
  const chatSeries = volume.slice(-7).map((point) => ({ bucket: shortDate(point.bucket), chats: point.count }));
  const csatSeries = csat.slice(-7).map((point) => ({ bucket: shortDate(point.bucket), csat: Number(point.score.toFixed(2)) }));
  const agentSeries = [...agentStats]
    .sort((a, b) => b.chats - a.chats)
    .slice(0, 7)
    .map((row) => ({ agent: row.name, chats: row.chats }));
  const csatValue = overview?.todays_csat ?? null;
  const avgResponseSeconds = overview?.avg_wait_seconds ?? responseTime?.p50 ?? 0;
  return (
    <PageShell>
      <PageHeader title="Analytics" />
      <div className="grid gap-4 p-4 sm:p-6">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
          <MetricCard label="Chats today" value={todayChats} tone="blue" />
          <MetricCard label="Resolved" value={overview?.todays_resolved ?? 0} tone="green" />
          <MetricCard label="Waiting" value={overview?.queue_length ?? 0} tone="yellow" />
          <MetricCard label="CSAT" value={csatValue == null ? "-" : csatValue.toFixed(1)} tone="slate" />
          <MetricCard label="Avg response" value={formatDuration(avgResponseSeconds)} tone="slate" />
          <MetricCard label="Missed" value={missed.length} tone={missed.length > 0 ? "red" : "slate"} />
        </div>
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <Chart title="Chat volume">
            <AreaChart data={chatSeries}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis dataKey="bucket" stroke={axisColor} />
              <YAxis stroke={axisColor} allowDecimals={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Area dataKey="chats" stroke="#1E40AF" fill="#DBEAFE" />
            </AreaChart>
          </Chart>
          <Chart title="Chats by agent">
            <BarChart data={agentSeries}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis dataKey="agent" stroke={axisColor} />
              <YAxis stroke={axisColor} allowDecimals={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="chats" fill="#3B82F6" />
            </BarChart>
          </Chart>
          <Chart title="CSAT trend">
            <LineChart data={csatSeries}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis dataKey="bucket" stroke={axisColor} />
              <YAxis stroke={axisColor} domain={[0, 5]} />
              <Tooltip contentStyle={tooltipStyle} />
              <Line dataKey="csat" stroke="#16A34A" />
            </LineChart>
          </Chart>
        </div>
        <Card className="overflow-x-auto">
          {agentStats.length ? (
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="border-b border-border bg-slate-50 dark:bg-slate-800">
                <tr>
                  <th className="px-4 py-3 font-bold text-slate-600 dark:text-slate-300">Agent</th>
                  <th className="px-4 py-3 font-bold text-slate-600 dark:text-slate-300">Chats</th>
                  <th className="px-4 py-3 font-bold text-slate-600 dark:text-slate-300">CSAT</th>
                </tr>
              </thead>
              <tbody>
                {agentStats.map((row) => (
                  <tr key={row.agent_id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-100">{row.name}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{row.chats}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{row.csat == null ? "-" : row.csat.toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <EmptyPanel title="No analytics yet" description="Live agent performance appears once conversations are active." />
          )}
        </Card>
      </div>
    </PageShell>
  );
}

function isToday(value: string): boolean {
  const date = new Date(value);
  const now = new Date();
  return date.getUTCFullYear() === now.getUTCFullYear() && date.getUTCMonth() === now.getUTCMonth() && date.getUTCDate() === now.getUTCDate();
}

function shortDate(value: string): string {
  const date = new Date(value);
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(date);
}

function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return "0s";
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${mins}m ${secs}s`;
}

function TablePage({ title, rows, columns, action }: { title: string; rows: Record<string, unknown>[]; columns: string[]; action: string }): JSX.Element {
  return (
    <PageShell>
      <PageHeader title={title} action={<Button variant="primary">{action}</Button>} />
      <div className="p-4 sm:p-6">
        <Card className="overflow-hidden">
          {rows.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="border-b border-border bg-slate-50 text-slate-500 dark:bg-slate-800 dark:text-slate-300"><tr>{columns.map((column) => <th key={column} className="px-5 py-3 font-bold capitalize">{column.replace(/_/g, " ")}</th>)}<th className="px-5 py-3" /></tr></thead>
                <tbody>{rows.map((row, index) => <tr key={String(row.id ?? index)} className="border-b border-border last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800">{columns.map((column) => <td key={column} className="max-w-[280px] truncate px-5 py-4 font-medium text-slate-700 dark:text-slate-200">{String(row[column] ?? "")}</td>)}<td className="px-5 py-4 text-right"><Button size="sm">Edit</Button></td></tr>)}</tbody>
              </table>
            </div>
          ) : (
            <EmptyPanel title={`No ${title.toLowerCase()} yet`} description="Records will appear here once they are created." />
          )}
        </Card>
      </div>
    </PageShell>
  );
}

function BuilderPage({ title, label }: { title: string; label: string }): JSX.Element {
  return (
    <PageShell>
      <PageHeader title={title} action={<Button variant="primary">{label}</Button>} />
      <div className="grid grid-cols-1 gap-4 p-4 lg:grid-cols-[minmax(280px,360px)_minmax(0,1fr)] lg:gap-6 lg:p-6">
        <Card><EmptyPanel title="Ordered list" description="Drag, prioritize, and manage active rules from this panel." /></Card>
        <Card><EmptyPanel title="Visual builder" description="Configure conditions, actions, and safe defaults without leaving the page." /></Card>
      </div>
    </PageShell>
  );
}

function Chart({ title, children }: { title: string; children: ReactElement }): JSX.Element {
  return <Card className="h-72 p-4"><h2 className="mb-3 font-black text-slate-950 dark:text-slate-100">{title}</h2><ResponsiveContainer width="100%" height="85%">{children}</ResponsiveContainer></Card>;
}

function CodeBlock({ code }: { code: string }): JSX.Element {
  const [copied, setCopied] = useState(false);
  async function copy(): Promise<void> {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  }
  return (
    <div className="mt-4 overflow-hidden rounded-lg border border-border bg-slate-950 dark:bg-slate-900">
      <div className="flex items-center justify-between border-b border-slate-800 px-4 py-2">
        <span className="text-xs font-semibold uppercase text-slate-400">HTML</span>
        <button onClick={() => void copy()} className="inline-flex items-center gap-2 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-slate-900 hover:bg-slate-100">
          {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="overflow-auto p-4 text-sm leading-6 text-slate-100"><code>{code}</code></pre>
    </div>
  );
}

function CopyLine({ label, value }: { label: string; value: string }): JSX.Element {
  const [copied, setCopied] = useState(false);
  async function copy(): Promise<void> {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  }
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="font-semibold text-slate-900 dark:text-slate-100">{label}</div>
        <div className="truncate text-slate-500 dark:text-slate-400">{value}</div>
      </div>
      <button onClick={() => void copy()} className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-border px-3 py-1.5 font-semibold hover:bg-slate-50 dark:hover:bg-slate-800">
        {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}
