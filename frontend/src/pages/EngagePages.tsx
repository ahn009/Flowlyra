import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { PageHeader } from "../components/AgentLayout";
import { api } from "../lib/api";
import { Button, Card, EmptyPanel, Field, MetricCard, PageShell, PanelHeader, SelectInput, TextArea, TextInput } from "../components/ui";

interface TrafficItem {
  session_id: string;
  name?: string | null;
  email?: string | null;
  country?: string | null;
  city?: string | null;
  current_url?: string | null;
  referrer?: string | null;
  utm_source?: string | null;
  page_views?: number;
  timeline?: Array<{ url?: string; title?: string; ts?: string }>;
  is_returning?: boolean;
  is_online?: boolean;
  chat_id?: string | null;
  is_watched?: boolean;
  custom_variables?: Record<string, unknown>;
}

interface Campaign {
  id: string;
  name: string;
  campaign_type: string;
  trigger_type: string;
  conditions: Record<string, unknown>;
  message: string;
  is_active: boolean;
  sent_count: number;
}

interface Goal {
  id: string;
  name: string;
  goal_type: string;
  event_name?: string | null;
  target_url?: string | null;
  default_value?: number | null;
  is_active: boolean;
}

function geoPoint(input: string): { x: number; y: number } {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) hash = ((hash << 5) - hash) + input.charCodeAt(i);
  const x = Math.abs(hash % 100);
  const y = Math.abs((hash >> 8) % 100);
  return { x, y };
}

export function EngageTrafficPage(): JSX.Element {
  const [country, setCountry] = useState("");
  const [page, setPage] = useState("");
  const [source, setSource] = useState("");
  const [messageBySession, setMessageBySession] = useState<Record<string, string>>({});
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["engage-traffic", country, page, source],
    queryFn: async () => (await api.get("/engage/traffic", { params: { country: country || undefined, page: page || undefined, source: source || undefined } })).data as { items: TrafficItem[] },
    refetchInterval: 5000,
  });

  const sendMessage = useMutation({
    mutationFn: async ({ sessionId, message }: { sessionId: string; message: string }) => {
      await api.post(`/engage/traffic/${sessionId}/message`, { message });
    },
    onSuccess: async () => {
      toast.success("Message sent");
      await queryClient.invalidateQueries({ queryKey: ["engage-traffic"] });
    },
    onError: () => toast.error("Could not send message"),
  });

  const toggleWatch = useMutation({
    mutationFn: async ({ sessionId, watch }: { sessionId: string; watch: boolean }) => {
      await api.post(`/engage/traffic/${sessionId}/watch`, { watch });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["engage-traffic"] });
    },
    onError: () => toast.error("Could not update watch state"),
  });

  const items = data?.items ?? [];
  const countryPoints = useMemo(() => {
    return items
      .filter((row) => row.country)
      .map((row) => ({
        key: `${row.session_id}-${row.country}`,
        label: `${row.country}${row.city ? `, ${row.city}` : ""}`,
        ...geoPoint(`${row.country}:${row.city || ""}`),
      }));
  }, [items]);

  return (
    <PageShell>
      <PageHeader title="Visitor traffic" />
      <div className="grid gap-4 p-4 lg:grid-cols-[minmax(320px,420px)_minmax(0,1fr)] lg:gap-6 lg:p-6">
        <Card className="p-4">
          <h2 className="text-lg font-black text-slate-950 dark:text-slate-100">Filters</h2>
          <div className="mt-3 grid gap-3">
            <Field label="Country"><TextInput placeholder="US" value={country} onChange={(event) => setCountry(event.target.value)} /></Field>
            <Field label="Page contains"><TextInput placeholder="/pricing" value={page} onChange={(event) => setPage(event.target.value)} /></Field>
            <Field label="Source"><TextInput placeholder="google" value={source} onChange={(event) => setSource(event.target.value)} /></Field>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <MetricCard label="Live visitors" value={items.filter((item) => item.is_online).length} tone="green" />
            <MetricCard label="Returning" value={items.filter((item) => item.is_returning).length} tone="blue" />
          </div>
        </Card>

        <Card className="overflow-hidden">
          <PanelHeader title="Geo map view" description="Real-time online visitors mapped by country/city." />
          <div className="border-b border-border p-4">
            <div className="relative h-48 w-full rounded-xl border border-border bg-[radial-gradient(circle_at_20%_20%,#dbeafe,transparent_40%),radial-gradient(circle_at_80%_30%,#bfdbfe,transparent_45%),radial-gradient(circle_at_50%_80%,#c7d2fe,transparent_40%)]">
              {countryPoints.map((point) => (
                <span
                  key={point.key}
                  title={point.label}
                  className="absolute inline-block h-3 w-3 rounded-full bg-slate-900 ring-2 ring-white"
                  style={{ left: `${point.x}%`, top: `${point.y}%` }}
                />
              ))}
            </div>
          </div>
          {isLoading ? <div className="p-4 text-sm text-slate-500">Loading traffic...</div> : null}
          {!isLoading && items.length === 0 ? <EmptyPanel title="No active visitors" description="Traffic appears here when visitors load your site with the widget." /> : null}
          {items.length > 0 ? (
            <div className="divide-y divide-border">
              {items.map((item) => (
                <div key={item.session_id} className="grid gap-3 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-slate-100">{item.name || item.email || item.session_id.slice(0, 8)}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">{item.country || "Unknown"}{item.city ? `, ${item.city}` : ""} • {item.is_online ? "Online" : "Offline"} • {item.page_views || 0} views</div>
                    </div>
                    <Button
                      size="sm"
                      variant={item.is_watched ? "secondary" : "primary"}
                      onClick={() => toggleWatch.mutate({ sessionId: item.session_id, watch: !item.is_watched })}
                    >
                      {item.is_watched ? "Unwatch" : "Watch"}
                    </Button>
                  </div>
                  <div className="text-xs text-slate-600 dark:text-slate-300">{item.current_url || "No page URL yet"}</div>
                  <div className="flex gap-2">
                    <TextInput
                      placeholder="Send proactive message"
                      value={messageBySession[item.session_id] || ""}
                      onChange={(event) => setMessageBySession((prev) => ({ ...prev, [item.session_id]: event.target.value }))}
                    />
                    <Button
                      size="sm"
                      onClick={() => sendMessage.mutate({ sessionId: item.session_id, message: messageBySession[item.session_id] || "" })}
                      disabled={!String(messageBySession[item.session_id] || "").trim() || sendMessage.isPending}
                    >
                      Send
                    </Button>
                  </div>
                  {item.timeline?.length ? (
                    <details className="rounded-lg border border-border bg-slate-50 p-2 text-xs dark:bg-slate-900/50">
                      <summary className="cursor-pointer font-semibold">Session timeline</summary>
                      <div className="mt-2 grid gap-1">
                        {item.timeline.slice(-8).map((step, index) => (
                          <div key={`${item.session_id}-${index}`} className="text-slate-600 dark:text-slate-300">{step.ts ? new Date(step.ts).toLocaleTimeString() : "--"} • {step.title || "Page"} • {step.url}</div>
                        ))}
                      </div>
                    </details>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}
        </Card>
      </div>
    </PageShell>
  );
}

export function EngageCampaignsPage(): JSX.Element {
  const queryClient = useQueryClient();
  const { data = [] } = useQuery({ queryKey: ["engage-campaigns"], queryFn: async () => (await api.get("/engage/campaigns")).data as Campaign[] });
  const [name, setName] = useState("");
  const [campaignType, setCampaignType] = useState("lead_capture");
  const [triggerType, setTriggerType] = useState("welcome");
  const [message, setMessage] = useState("");
  const [frequencyCap, setFrequencyCap] = useState("1");
  const [scheduleJson, setScheduleJson] = useState('{"days":[1,2,3,4,5],"start_hour":9,"end_hour":18}');
  const [targetingJson, setTargetingJson] = useState('{"logic":"AND","rules":[]}');
  const [variantsJson, setVariantsJson] = useState('[{"message":"Need help deciding?","weight":50},{"message":"Quick question before checkout?","weight":50}]');

  const createCampaign = useMutation({
    mutationFn: async () => {
      await api.post("/engage/campaigns", {
        name,
        campaign_type: campaignType,
        trigger_type: triggerType,
        message,
        frequency_cap: { per_day: Number(frequencyCap || "0") || 0 },
        schedule: JSON.parse(scheduleJson || "{}"),
        targeting: JSON.parse(targetingJson || "{}"),
        variants: JSON.parse(variantsJson || "[]"),
      });
    },
    onSuccess: async () => {
      toast.success("Campaign created");
      setName("");
      setMessage("");
      await queryClient.invalidateQueries({ queryKey: ["engage-campaigns"] });
    },
    onError: () => toast.error("Invalid campaign JSON or request failed"),
  });

  const toggleCampaign = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      await api.patch(`/engage/campaigns/${id}`, { is_active: active });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["engage-campaigns"] });
    },
    onError: () => toast.error("Could not update campaign"),
  });

  return (
    <PageShell>
      <PageHeader title="Campaigns" />
      <div className="grid grid-cols-1 gap-4 p-4 lg:grid-cols-[minmax(360px,460px)_minmax(0,1fr)] lg:gap-6 lg:p-6">
        <Card className="p-4">
          <h2 className="text-lg font-black text-slate-950 dark:text-slate-100">New campaign</h2>
          <div className="mt-3 grid gap-3">
            <Field label="Name"><TextInput value={name} onChange={(event) => setName(event.target.value)} /></Field>
            <Field label="Type">
              <SelectInput value={campaignType} onChange={(event) => setCampaignType(event.target.value)}>
                <option value="lead_capture">lead_capture</option>
                <option value="promotional">promotional</option>
                <option value="announcement">announcement</option>
              </SelectInput>
            </Field>
            <Field label="Trigger">
              <SelectInput value={triggerType} onChange={(event) => setTriggerType(event.target.value)}>
                <option value="welcome">welcome</option>
                <option value="idle">idle</option>
                <option value="dwell">dwell</option>
                <option value="exit_intent">exit_intent</option>
                <option value="url_match">url_match</option>
                <option value="time_on_site">time_on_site</option>
                <option value="scroll_depth">scroll_depth</option>
                <option value="returning_visitor">returning_visitor</option>
                <option value="cart_value">cart_value</option>
                <option value="custom_variable">custom_variable</option>
              </SelectInput>
            </Field>
            <Field label="Default message"><TextArea className="min-h-20" value={message} onChange={(event) => setMessage(event.target.value)} /></Field>
            <Field label="Frequency cap per day"><TextInput value={frequencyCap} onChange={(event) => setFrequencyCap(event.target.value)} /></Field>
            <Field label="Schedule JSON"><TextArea className="min-h-20" value={scheduleJson} onChange={(event) => setScheduleJson(event.target.value)} /></Field>
            <Field label="Targeting rules (AND/OR groups)"><TextArea className="min-h-20" value={targetingJson} onChange={(event) => setTargetingJson(event.target.value)} /></Field>
            <Field label="A/B variants JSON"><TextArea className="min-h-20" value={variantsJson} onChange={(event) => setVariantsJson(event.target.value)} /></Field>
            <Button variant="primary" disabled={createCampaign.isPending || !name.trim() || !message.trim()} onClick={() => createCampaign.mutate()}>
              {createCampaign.isPending ? "Saving..." : "Create campaign"}
            </Button>
          </div>
        </Card>

        <Card className="overflow-hidden">
          <PanelHeader title="Live campaigns" description="Sent/seen/clicked/converted metrics are tracked via widget events." />
          {data.length ? (
            <div className="divide-y divide-border">
              {data.map((campaign) => (
                <div key={campaign.id} className="grid gap-2 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-slate-100">{campaign.name}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">{campaign.campaign_type} • {campaign.trigger_type} • Sent: {campaign.sent_count}</div>
                    </div>
                    <Button size="sm" variant={campaign.is_active ? "secondary" : "primary"} onClick={() => toggleCampaign.mutate({ id: campaign.id, active: !campaign.is_active })}>
                      {campaign.is_active ? "Disable" : "Enable"}
                    </Button>
                  </div>
                  <div className="text-sm text-slate-700 dark:text-slate-300">{campaign.message}</div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyPanel title="No campaigns yet" description="Create your first campaign to proactively engage live traffic." />
          )}
        </Card>
      </div>
    </PageShell>
  );
}

export function EngageGoalsPage(): JSX.Element {
  const queryClient = useQueryClient();
  const { data: goals = [] } = useQuery({ queryKey: ["engage-goals"], queryFn: async () => (await api.get("/engage/goals")).data as Goal[] });
  const { data: dashboard } = useQuery({ queryKey: ["engage-goals-dashboard"], queryFn: async () => (await api.get("/engage/goals/dashboard")).data as { total_goals: number; achieved: number; revenue: number; funnel: { visitors: number; engaged: number; chats: number; conversions: number } } });
  const { data: achievements = [] } = useQuery({ queryKey: ["engage-goals-achievements"], queryFn: async () => (await api.get("/engage/goals/achievements")).data as Array<{ id: string; goal_name: string; value?: number | null; achieved_at: string; metadata?: Record<string, unknown> }> });

  const [name, setName] = useState("");
  const [goalType, setGoalType] = useState("event");
  const [eventName, setEventName] = useState("");
  const [targetUrl, setTargetUrl] = useState("");
  const [defaultValue, setDefaultValue] = useState("");

  const createGoal = useMutation({
    mutationFn: async () => {
      await api.post("/engage/goals", {
        name,
        goal_type: goalType,
        event_name: eventName || null,
        target_url: targetUrl || null,
        default_value: defaultValue ? Number(defaultValue) : null,
      });
    },
    onSuccess: async () => {
      toast.success("Goal created");
      setName("");
      setEventName("");
      setTargetUrl("");
      setDefaultValue("");
      await queryClient.invalidateQueries({ queryKey: ["engage-goals"] });
      await queryClient.invalidateQueries({ queryKey: ["engage-goals-dashboard"] });
    },
    onError: () => toast.error("Could not create goal"),
  });

  return (
    <PageShell>
      <PageHeader title="Goals" />
      <div className="grid grid-cols-1 gap-4 p-4 lg:grid-cols-[minmax(340px,440px)_minmax(0,1fr)] lg:gap-6 lg:p-6">
        <Card className="p-4">
          <h2 className="text-lg font-black text-slate-950 dark:text-slate-100">New goal</h2>
          <div className="mt-3 grid gap-3">
            <Field label="Name"><TextInput value={name} onChange={(event) => setName(event.target.value)} /></Field>
            <Field label="Goal type">
              <SelectInput value={goalType} onChange={(event) => setGoalType(event.target.value)}>
                <option value="page_view">page_view</option>
                <option value="event">event</option>
                <option value="revenue">revenue</option>
              </SelectInput>
            </Field>
            <Field label="Event name"><TextInput placeholder="signup_submitted" value={eventName} onChange={(event) => setEventName(event.target.value)} /></Field>
            <Field label="Target URL"><TextInput placeholder="/checkout/success" value={targetUrl} onChange={(event) => setTargetUrl(event.target.value)} /></Field>
            <Field label="Default value"><TextInput placeholder="49.99" value={defaultValue} onChange={(event) => setDefaultValue(event.target.value)} /></Field>
            <Button variant="primary" disabled={createGoal.isPending || !name.trim()} onClick={() => createGoal.mutate()}>
              {createGoal.isPending ? "Saving..." : "Create goal"}
            </Button>
          </div>
        </Card>

        <div className="grid gap-4">
          <Card className="p-4">
            <h2 className="text-lg font-black text-slate-950 dark:text-slate-100">Sales tracker</h2>
            <div className="mt-3 grid grid-cols-2 gap-2 lg:grid-cols-4">
              <MetricCard label="Active goals" value={dashboard?.total_goals || 0} tone="blue" />
              <MetricCard label="Achieved" value={dashboard?.achieved || 0} tone="green" />
              <MetricCard label="Revenue" value={`$${(dashboard?.revenue || 0).toFixed(2)}`} tone="yellow" />
              <MetricCard label="Conversions" value={dashboard?.funnel?.conversions || 0} tone="slate" />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-4">
              <MetricCard label="Visitors" value={dashboard?.funnel?.visitors || 0} tone="slate" />
              <MetricCard label="Engaged" value={dashboard?.funnel?.engaged || 0} tone="blue" />
              <MetricCard label="Chats" value={dashboard?.funnel?.chats || 0} tone="green" />
              <MetricCard label="Converted" value={dashboard?.funnel?.conversions || 0} tone="yellow" />
            </div>
          </Card>

          <Card className="overflow-hidden">
            <PanelHeader title="Configured goals" description="Track page views, custom events, and revenue goals." />
            {goals.length ? (
              <div className="divide-y divide-border">
                {goals.map((goal) => (
                  <div key={goal.id} className="p-4">
                    <div className="font-semibold text-slate-900 dark:text-slate-100">{goal.name}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{goal.goal_type} • {goal.event_name || "-"} • {goal.target_url || "-"}</div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyPanel title="No goals yet" description="Add goals to measure conversion and revenue attribution." />
            )}
          </Card>

          <Card className="overflow-hidden">
            <PanelHeader title="Recent goal achievements" description="Latest conversions attributed to campaign/chat/session." />
            {achievements.length ? (
              <div className="divide-y divide-border">
                {achievements.slice(0, 20).map((item) => (
                  <div key={item.id} className="p-4">
                    <div className="font-semibold text-slate-900 dark:text-slate-100">{item.goal_name}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{new Date(item.achieved_at).toLocaleString()} • {item.value != null ? `$${Number(item.value).toFixed(2)}` : "No value"}</div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyPanel title="No achievements yet" description="Once visitors hit goals, they will appear here in real time." />
            )}
          </Card>
        </div>
      </div>
    </PageShell>
  );
}
