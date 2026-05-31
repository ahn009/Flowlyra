import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
} from "lucide-react";
import { api } from "../lib/api";
import { PageHeader } from "../components/AgentLayout";
import { PageShell } from "../components/ui";
import { cn } from "../lib/cn";

/* ─── Design tokens ─── */
const C = {
  indigo:  "#4F46E5",
  coral:   "#F97066",
  emerald: "#10B981",
  amber:   "#FBBF24",
  violet:  "#8B5CF6",
  cyan:    "#06B6D4",
  rose:    "#F43F5E",
  slate:   "#64748B",
  slate100: "#F1F5F9",
  slate200: "#E2E8F0",
  slate500: "#64748B",
  midnight: "#0F172A",
} as const;

/* ─── Tooltip ─── */
function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number | string; name?: string; color?: string }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md px-3 py-2 shadow-lg" style={{ background: C.midnight, color: "#fff", fontSize: 12 }}>
      {label && <div className="mb-1 text-[11px] text-slate-400">{label}</div>}
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center gap-2">
          {entry.color && <span className="inline-block h-2 w-2 rounded-full" style={{ background: entry.color }} />}
          <span style={{ color: "#fff" }}>{entry.name ? `${entry.name}: ` : ""}{entry.value}</span>
        </div>
      ))}
    </div>
  );
}

/* ─── Axis defaults ─── */
const AXIS_STYLE = { fontSize: 11, fill: C.slate500, fontFamily: "Plus Jakarta Sans, sans-serif" };
const GRID_STYLE = { stroke: C.slate100, strokeWidth: 1 };

/* ─── Sample data factories ─── */
function makeVolumeData(days = 30) {
  const base = [80, 95, 110, 88, 76, 120, 135, 145, 90, 88, 102, 118, 130, 144, 98, 112, 125, 88, 97, 115, 130, 140, 95, 88, 105, 122, 138, 145, 99, 110];
  const now = new Date();
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(now);
    d.setDate(d.getDate() - (days - 1 - i));
    return {
      date: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      chats: base[i % base.length] + Math.round(Math.random() * 20),
    };
  });
}

const RESPONSE_TIME_DATA = [
  { bucket: "<15s",   pct: 28 },
  { bucket: "15–30s", pct: 35 },
  { bucket: "30–60s", pct: 20 },
  { bucket: "1–2m",   pct: 12 },
  { bucket: "2m+",    pct: 5 },
];

const CSAT_DATA = [
  { stars: "5 ★", value: 58, color: C.emerald },
  { stars: "4 ★", value: 24, color: "#34D399" },
  { stars: "3 ★", value: 11, color: C.amber },
  { stars: "2 ★", value: 5,  color: C.coral },
  { stars: "1 ★", value: 2,  color: "#EF4444" },
];

const CHANNEL_DATA = [
  { channel: "Website Widget", value: 1420, color: C.indigo },
  { channel: "Email",          value: 612,  color: C.coral },
  { channel: "Instagram",      value: 383,  color: C.violet },
  { channel: "Messenger",      value: 298,  color: C.cyan },
  { channel: "API",            value: 134,  color: C.slate },
];

const SAMPLE_AGENTS = [
  { id: "1", name: "Aria Johnson",   status: "online",  chats: 142, avgResp: "18s", csat: 4.8, resolution: 97 },
  { id: "2", name: "Marcus Lee",     status: "online",  chats: 118, avgResp: "24s", csat: 4.6, resolution: 94 },
  { id: "3", name: "Sofia Patel",    status: "away",    chats: 95,  avgResp: "32s", csat: 4.5, resolution: 92 },
  { id: "4", name: "Devon Rivera",   status: "online",  chats: 87,  avgResp: "29s", csat: 4.7, resolution: 95 },
  { id: "5", name: "Yuki Tanaka",    status: "offline", chats: 74,  avgResp: "41s", csat: 4.3, resolution: 89 },
  { id: "6", name: "Emre Yilmaz",    status: "online",  chats: 68,  avgResp: "22s", csat: 4.9, resolution: 98 },
  { id: "7", name: "Laila Hassan",   status: "away",    chats: 61,  avgResp: "38s", csat: 4.4, resolution: 91 },
  { id: "8", name: "Jin Park",       status: "online",  chats: 55,  avgResp: "27s", csat: 4.6, resolution: 93 },
];

/* ─── KPI card ─── */
interface KpiCardProps {
  label: string;
  value: string;
  trend: number;
  trendLabel?: string;
  /** if down trend is positive (e.g. response time), set invertTrend */
  invertTrend?: boolean;
}

function KpiCard({ label, value, trend, trendLabel = "vs last period", invertTrend }: KpiCardProps) {
  const isPositive = invertTrend ? trend < 0 : trend > 0;
  const abs = Math.abs(trend);
  const color = isPositive ? C.emerald : "#EF4444";
  const Icon = isPositive ? TrendingUp : TrendingDown;
  const sign = trend > 0 ? "↑" : "↓";

  return (
    <div className="rounded-xl border border-navy-200 bg-white px-5 py-5 shadow-xs dark:border-navy-700 dark:bg-navy-900">
      <div className="text-[13px] font-medium text-navy-500 dark:text-navy-400">{label}</div>
      <div className="mt-1.5 text-[28px] font-bold leading-none text-midnight dark:text-white">{value}</div>
      <div className="mt-2 flex items-center gap-1.5">
        <Icon size={14} style={{ color }} />
        <span className="text-[13px] font-medium" style={{ color }}>
          {sign} {abs}%
        </span>
        <span className="text-xs text-navy-400">{trendLabel}</span>
      </div>
    </div>
  );
}

/* ─── Chart card wrapper ─── */
function ChartCard({ title, subtitle, children, className }: { title: string; subtitle?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-xl border border-navy-200 bg-white px-6 py-5 shadow-xs dark:border-navy-700 dark:bg-navy-900", className)}>
      <div className="mb-4">
        <h3 className="text-base font-semibold text-midnight dark:text-white">{title}</h3>
        {subtitle && <p className="mt-0.5 text-[13px] text-navy-500 dark:text-navy-400">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

/* ─── Mini bar indicator ─── */
function MiniBar({ value, max = 100, color = C.indigo }: { value: number; max?: number; color?: string }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div className="flex items-center gap-2">
      <div className="h-1 w-[60px] overflow-hidden rounded-full bg-navy-100 dark:bg-navy-700">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

/* ─── Date range selector ─── */
type DateRange = "today" | "7d" | "30d" | "month" | "custom";

const DATE_RANGE_LABELS: Record<DateRange, string> = {
  today:  "Today",
  "7d":   "Last 7 days",
  "30d":  "Last 30 days",
  month:  "This month",
  custom: "Custom range",
};

/* ─── Tabs ─── */
type AnalyticsTab = "overview" | "volume" | "response" | "csat" | "agents";

const TABS: Array<{ key: AnalyticsTab; label: string }> = [
  { key: "overview",  label: "Overview" },
  { key: "volume",    label: "Volume" },
  { key: "response",  label: "Response Time" },
  { key: "csat",      label: "CSAT" },
  { key: "agents",    label: "Agent Performance" },
];

/* ─── Agent table ─── */
type SortKey = "name" | "chats" | "avgResp" | "csat" | "resolution";

const STATUS_DOT: Record<string, string> = {
  online:  "bg-success-500",
  away:    "bg-warning-500",
  offline: "bg-navy-400",
};

const PAGE_SIZE = 8;

function AgentTable({ agents }: { agents: typeof SAMPLE_AGENTS }) {
  const [sortKey, setSortKey] = useState<SortKey>("chats");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(0);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("desc"); }
  }

  const sorted = useMemo(() => {
    return [...agents].sort((a, b) => {
      let av: number | string = a[sortKey as keyof typeof a] as number | string;
      let bv: number | string = b[sortKey as keyof typeof b] as number | string;
      if (typeof av === "string" && typeof bv === "string") {
        return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      }
      av = Number(av); bv = Number(bv);
      return sortDir === "asc" ? av - bv : bv - av;
    });
  }, [agents, sortKey, sortDir]);

  const totalPages = Math.ceil(sorted.length / PAGE_SIZE);
  const pageRows = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <ChevronUp size={12} className="opacity-20" />;
    return sortDir === "asc" ? <ChevronUp size={12} className="text-brand-600" /> : <ChevronDown size={12} className="text-brand-600" />;
  }

  const TH = ({ col, children }: { col?: SortKey; children: React.ReactNode }) => (
    <th
      className={cn(
        "bg-navy-50 px-4 py-3 text-left text-[13px] font-semibold uppercase tracking-wide text-navy-600 dark:bg-navy-800 dark:text-navy-400",
        col && "cursor-pointer select-none hover:text-brand-600",
      )}
      onClick={col ? () => toggleSort(col) : undefined}
    >
      <span className="flex items-center gap-1">
        {children}
        {col && <SortIcon col={col} />}
      </span>
    </th>
  );

  return (
    <div className="overflow-hidden rounded-xl border border-navy-200 shadow-xs dark:border-navy-700">
      <div className="flex items-center justify-between border-b border-navy-200 bg-white px-6 py-4 dark:border-navy-700 dark:bg-navy-900">
        <h3 className="text-base font-semibold text-midnight dark:text-white">Agent Performance</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <TH col="name">Agent</TH>
              <TH>Status</TH>
              <TH col="chats">Chats</TH>
              <TH col="avgResp">Avg Response</TH>
              <TH col="csat">CSAT</TH>
              <TH col="resolution">Resolution</TH>
            </tr>
          </thead>
          <tbody>
            {pageRows.map((agent, i) => (
              <tr
                key={agent.id}
                className={cn(
                  "border-b border-navy-100 transition-colors hover:bg-brand-50 dark:border-navy-800 dark:hover:bg-brand-950/20",
                  i % 2 === 1 ? "bg-navy-50 dark:bg-navy-900/50" : "bg-white dark:bg-navy-900",
                )}
                style={{ height: 52 }}
              >
                {/* Agent */}
                <td className="px-4">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-600 text-xs font-semibold dark:bg-brand-950 dark:text-brand-300">
                      {agent.name.split(" ").map((w) => w[0]).join("").slice(0, 2)}
                    </div>
                    <span className="font-medium text-midnight dark:text-navy-100">{agent.name}</span>
                  </div>
                </td>
                {/* Status */}
                <td className="px-4">
                  <span className="flex items-center gap-1.5 text-[13px] text-navy-600 dark:text-navy-300 capitalize">
                    <span className={cn("h-2 w-2 rounded-full", STATUS_DOT[agent.status] ?? "bg-navy-300")} />
                    {agent.status}
                  </span>
                </td>
                {/* Chats */}
                <td className="px-4 font-semibold text-midnight dark:text-navy-100">{agent.chats}</td>
                {/* Avg response */}
                <td className="px-4 text-navy-700 dark:text-navy-300">{agent.avgResp}</td>
                {/* CSAT */}
                <td className="px-4">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-midnight dark:text-navy-100">{agent.csat}</span>
                    <MiniBar value={agent.csat} max={5} color={C.emerald} />
                  </div>
                </td>
                {/* Resolution */}
                <td className="px-4">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-midnight dark:text-navy-100">{agent.resolution}%</span>
                    <MiniBar value={agent.resolution} color={C.indigo} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Pagination */}
      <div className="flex items-center justify-between border-t border-navy-100 bg-white px-5 py-3 dark:border-navy-800 dark:bg-navy-900">
        <span className="text-[13px] text-navy-500">
          Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, sorted.length)} of {sorted.length}
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setPage((p) => p - 1)}
            disabled={page === 0}
            className="flex h-7 w-7 items-center justify-center rounded border border-navy-200 text-navy-500 hover:bg-navy-50 disabled:opacity-30 dark:border-navy-700 dark:hover:bg-navy-800"
          >
            <ChevronLeft size={14} />
          </button>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={page >= totalPages - 1}
            className="flex h-7 w-7 items-center justify-center rounded border border-navy-200 text-navy-500 hover:bg-navy-50 disabled:opacity-30 dark:border-navy-700 dark:hover:bg-navy-800"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Donut center label ─── */
function DonutCenter({ cx = 0, cy = 0, score }: { cx?: number; cy?: number; score: string }) {
  return (
    <g>
      <text x={cx} y={cy - 8} textAnchor="middle" dominantBaseline="central" style={{ fontSize: 32, fontWeight: 700, fill: C.midnight, fontFamily: "Plus Jakarta Sans, sans-serif" }}>
        {score}
      </text>
      <text x={cx} y={cy + 22} textAnchor="middle" dominantBaseline="central" style={{ fontSize: 14, fill: C.slate500, fontFamily: "Plus Jakarta Sans, sans-serif" }}>
        /5
      </text>
    </g>
  );
}

/* ─── Overview tab content ─── */
function OverviewTab({ volumeData }: { volumeData: ReturnType<typeof makeVolumeData> }) {
  // Sparse X labels (every 5 days)
  const tickFormatter = (val: string, i: number) => i % 5 === 0 ? val : "";

  return (
    <div className="grid gap-5 lg:grid-cols-12">
      {/* Chart A — Chat Volume (8 cols) */}
      <ChartCard
        title="Chat Volume"
        subtitle="Daily conversations over time"
        className="lg:col-span-8"
      >
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={volumeData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="gradIndigo" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={C.indigo} stopOpacity={0.15} />
                <stop offset="95%" stopColor={C.indigo} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} {...GRID_STYLE} />
            <XAxis dataKey="date" tick={AXIS_STYLE} tickLine={false} axisLine={false} tickFormatter={tickFormatter} />
            <YAxis tick={AXIS_STYLE} tickLine={false} axisLine={false} />
            <Tooltip content={<ChartTooltip />} cursor={{ stroke: C.slate200 }} />
            <Area
              type="monotone"
              dataKey="chats"
              stroke={C.indigo}
              strokeWidth={2}
              fill="url(#gradIndigo)"
              dot={false}
              activeDot={{ r: 6, fill: C.indigo, strokeWidth: 0 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Chart B — Response Time (4 cols) */}
      <ChartCard
        title="Response Time"
        subtitle="Distribution by bucket"
        className="lg:col-span-4"
      >
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={RESPONSE_TIME_DATA} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
            <CartesianGrid vertical={false} {...GRID_STYLE} />
            <XAxis dataKey="bucket" tick={AXIS_STYLE} tickLine={false} axisLine={false} />
            <YAxis tick={AXIS_STYLE} tickLine={false} axisLine={false} unit="%" />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: `${C.indigo}08` }} />
            <Bar dataKey="pct" name="%" fill={C.indigo} radius={[4, 4, 0, 0]} maxBarSize={48} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Chart C — CSAT Donut (4 cols) */}
      <ChartCard title="Satisfaction Score" className="lg:col-span-4">
        <div className="flex flex-col items-center">
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={CSAT_DATA}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                dataKey="value"
                startAngle={90}
                endAngle={-270}
                paddingAngle={2}
              >
                {CSAT_DATA.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<ChartTooltip />} />
              {/* Centre label via custom label */}
              <text x="50%" y="45%" textAnchor="middle" dominantBaseline="central" style={{ fontSize: 28, fontWeight: 700, fill: C.midnight, fontFamily: "Plus Jakarta Sans, sans-serif" }}>4.6</text>
              <text x="50%" y="58%" textAnchor="middle" dominantBaseline="central" style={{ fontSize: 13, fill: C.slate500, fontFamily: "Plus Jakarta Sans, sans-serif" }}>/5</text>
            </PieChart>
          </ResponsiveContainer>
          {/* Legend */}
          <div className="mt-1 flex flex-wrap justify-center gap-x-4 gap-y-1.5">
            {CSAT_DATA.map((entry) => (
              <div key={entry.stars} className="flex items-center gap-1.5 text-xs text-navy-500">
                <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: entry.color }} />
                {entry.stars} ({entry.value}%)
              </div>
            ))}
          </div>
        </div>
      </ChartCard>

      {/* Chart D — Channel Breakdown (8 cols) */}
      <ChartCard
        title="Conversations by Channel"
        subtitle="Volume per source"
        className="lg:col-span-8"
      >
        <ResponsiveContainer width="100%" height={220}>
          <BarChart
            data={CHANNEL_DATA}
            layout="vertical"
            margin={{ top: 4, right: 24, left: 8, bottom: 0 }}
          >
            <CartesianGrid horizontal={false} {...GRID_STYLE} />
            <XAxis type="number" tick={AXIS_STYLE} tickLine={false} axisLine={false} />
            <YAxis type="category" dataKey="channel" tick={AXIS_STYLE} tickLine={false} axisLine={false} width={110} />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: `${C.indigo}08` }} />
            <Bar dataKey="value" name="Conversations" radius={[0, 4, 4, 0]} maxBarSize={28}>
              {CHANNEL_DATA.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}

/* ─── Main page ─── */
export function AnalyticsPage(): JSX.Element {
  const [dateRange, setDateRange] = useState<DateRange>("30d");
  const [activeTab, setActiveTab] = useState<AnalyticsTab>("overview");

  const volumeData = useMemo(() => makeVolumeData(dateRange === "today" ? 1 : dateRange === "7d" ? 7 : 30), [dateRange]);

  /* Real API call — graceful fallback to sample data */
  const { data: apiAgents } = useQuery({
    queryKey: ["analytics", "agents", dateRange],
    queryFn: async () => (await api.get<typeof SAMPLE_AGENTS>("/admin/analytics/agents", { params: { range: dateRange } })).data,
    retry: false,
    staleTime: 60_000,
  });

  const agents = apiAgents?.length ? apiAgents : SAMPLE_AGENTS;

  return (
    <PageShell>
      <PageHeader
        title="Analytics"
        action={
          <div className="flex items-center gap-2">
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as DateRange)}
              className="rounded-md border border-navy-200 bg-white px-3 py-1.5 text-sm font-medium text-navy-600 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-navy-700 dark:bg-navy-800 dark:text-navy-300"
            >
              {(Object.entries(DATE_RANGE_LABELS) as Array<[DateRange, string]>).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
            <button className="flex items-center gap-1.5 rounded-md border border-navy-200 bg-white px-3 py-1.5 text-sm font-medium text-navy-600 hover:bg-navy-50 dark:border-navy-700 dark:bg-navy-800 dark:text-navy-300 dark:hover:bg-navy-700 transition-colors">
              <Download size={14} /> Export
            </button>
          </div>
        }
      />

      <div className="px-4 pb-6 pt-0 sm:px-6">
        {/* Tab bar */}
        <div className="mb-5 flex gap-0 border-b border-navy-200 dark:border-navy-700">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "relative px-4 py-3 text-sm font-medium transition-colors",
                activeTab === tab.key
                  ? "text-brand-600 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[3px] after:rounded-t-full after:bg-brand-600"
                  : "text-navy-500 hover:text-navy-700 dark:text-navy-400 dark:hover:text-navy-200",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* KPI cards — visible on all tabs */}
        <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <KpiCard label="Total Chats"        value="2,847"  trend={12.5} />
          <KpiCard label="Avg Response Time"  value="28s"    trend={-15.3} invertTrend trendLabel="faster" />
          <KpiCard label="CSAT Score"         value="4.6/5"  trend={0.3}  trendLabel="vs last period" />
          <KpiCard label="Resolution Rate"    value="94.2%"  trend={2.1} />
        </div>

        {/* Tab content */}
        {activeTab === "overview" && <OverviewTab volumeData={volumeData} />}

        {activeTab === "volume" && (
          <ChartCard title="Chat Volume" subtitle={`Daily conversations — ${DATE_RANGE_LABELS[dateRange]}`}>
            <ResponsiveContainer width="100%" height={360}>
              <AreaChart data={volumeData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradIndigoFull" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={C.indigo} stopOpacity={0.15} />
                    <stop offset="95%" stopColor={C.indigo} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} {...GRID_STYLE} />
                <XAxis dataKey="date" tick={AXIS_STYLE} tickLine={false} axisLine={false} />
                <YAxis tick={AXIS_STYLE} tickLine={false} axisLine={false} />
                <Tooltip content={<ChartTooltip />} cursor={{ stroke: C.slate200 }} />
                <Area type="monotone" dataKey="chats" stroke={C.indigo} strokeWidth={2} fill="url(#gradIndigoFull)" dot={false} activeDot={{ r: 6, fill: C.indigo, strokeWidth: 0 }} />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>
        )}

        {activeTab === "response" && (
          <ChartCard title="Response Time Distribution" subtitle="% of conversations by first-response bucket">
            <ResponsiveContainer width="100%" height={360}>
              <BarChart data={RESPONSE_TIME_DATA} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid vertical={false} {...GRID_STYLE} />
                <XAxis dataKey="bucket" tick={AXIS_STYLE} tickLine={false} axisLine={false} />
                <YAxis tick={AXIS_STYLE} tickLine={false} axisLine={false} unit="%" />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: `${C.indigo}08` }} />
                <Bar dataKey="pct" name="%" fill={C.indigo} radius={[4, 4, 0, 0]} maxBarSize={72} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        )}

        {activeTab === "csat" && (
          <div className="grid gap-5 lg:grid-cols-2">
            <ChartCard title="Satisfaction Score Distribution">
              <div className="flex flex-col items-center">
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={CSAT_DATA} cx="50%" cy="50%" innerRadius={80} outerRadius={120} dataKey="value" startAngle={90} endAngle={-270} paddingAngle={2}>
                      {CSAT_DATA.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                    <text x="50%" y="45%" textAnchor="middle" dominantBaseline="central" style={{ fontSize: 36, fontWeight: 700, fill: C.midnight, fontFamily: "Plus Jakarta Sans, sans-serif" }}>4.6</text>
                    <text x="50%" y="59%" textAnchor="middle" dominantBaseline="central" style={{ fontSize: 14, fill: C.slate500, fontFamily: "Plus Jakarta Sans, sans-serif" }}>/5</text>
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap justify-center gap-x-4 gap-y-1.5">
                  {CSAT_DATA.map((entry) => (
                    <div key={entry.stars} className="flex items-center gap-1.5 text-xs text-navy-500">
                      <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: entry.color }} />
                      {entry.stars} ({entry.value}%)
                    </div>
                  ))}
                </div>
              </div>
            </ChartCard>
            <ChartCard title="CSAT by Agent" subtitle="Average satisfaction per team member">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={SAMPLE_AGENTS.slice(0, 6).map((a) => ({ name: a.name.split(" ")[0], csat: a.csat }))} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                  <CartesianGrid vertical={false} {...GRID_STYLE} />
                  <XAxis dataKey="name" tick={AXIS_STYLE} tickLine={false} axisLine={false} />
                  <YAxis domain={[3.5, 5]} tick={AXIS_STYLE} tickLine={false} axisLine={false} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: `${C.emerald}08` }} />
                  <Bar dataKey="csat" name="CSAT" fill={C.emerald} radius={[4, 4, 0, 0]} maxBarSize={48} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        )}

        {(activeTab === "overview" || activeTab === "agents") && (
          <div className="mt-5">
            <AgentTable agents={agents} />
          </div>
        )}
      </div>
    </PageShell>
  );
}
