import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ReactElement } from "react";
import { Check, Copy, ExternalLink, MessageSquare, Palette, ShieldCheck, Sparkles, UsersRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import flowlyraMark from "../assets/flowlyra-mark.svg";
import { PageHeader } from "../components/AgentLayout";
import { Button, Card, EmptyPanel, Field, MetricCard, PageShell, PanelHeader, SelectInput, TextArea, TextInput } from "../components/ui";
import { api } from "../lib/api";
import { useThemeStore } from "../stores/themeStore";
import toast from "react-hot-toast";

export function AgentsPage(): JSX.Element {
  const queryClient = useQueryClient();
  const { data = [] } = useQuery({ queryKey: ["agents"], queryFn: async () => (await api.get("/agents")).data });
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState("agent");
  const [maxChats, setMaxChats] = useState(5);
  const [showForm, setShowForm] = useState(false);

  const createAgent = useMutation({
    mutationFn: async () => api.post("/agents", { email, full_name: fullName, role, max_chats: maxChats }),
    onSuccess: async () => {
      toast.success("Agent invited");
      setEmail("");
      setFullName("");
      setRole("agent");
      setMaxChats(5);
      setShowForm(false);
      await queryClient.invalidateQueries({ queryKey: ["agents"] });
    },
    onError: () => toast.error("Could not invite agent")
  });

  return (
    <PageShell>
      <PageHeader title="Agents" action={<Button variant="primary" onClick={() => setShowForm((value) => !value)}>{showForm ? "Close" : "Invite agent"}</Button>} />
      <div className="p-4 sm:p-6">
        {showForm && (
          <Card className="mb-4 p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Full name"><TextInput value={fullName} onChange={(event) => setFullName(event.target.value)} /></Field>
              <Field label="Email"><TextInput type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></Field>
              <Field label="Role">
                <SelectInput value={role} onChange={(event) => setRole(event.target.value)}>
                  <option value="agent">agent</option>
                  <option value="supervisor">supervisor</option>
                  <option value="admin">admin</option>
                </SelectInput>
              </Field>
              <Field label="Max chats"><TextInput type="number" value={String(maxChats)} onChange={(event) => setMaxChats(Number(event.target.value || 1))} /></Field>
            </div>
            <div className="mt-3">
              <Button variant="primary" disabled={createAgent.isPending || !fullName.trim() || !email.trim()} onClick={() => createAgent.mutate()}>{createAgent.isPending ? "Sending..." : "Send invite"}</Button>
            </div>
          </Card>
        )}
        <Card className="overflow-hidden">
          {data.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="border-b border-border bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400"><tr><th className="px-5 py-3 font-bold">Name</th><th className="px-5 py-3 font-bold">Email</th><th className="px-5 py-3 font-bold">Role</th><th className="px-5 py-3 font-bold">Status</th><th className="px-5 py-3 font-bold">Max chats</th></tr></thead>
                <tbody>{data.map((row: { id: string; full_name: string; email: string; role: string; status: string; max_chats: number }) => <tr key={row.id} className="border-b border-border last:border-0"><td className="px-5 py-4 font-semibold">{row.full_name}</td><td className="px-5 py-4">{row.email}</td><td className="px-5 py-4">{row.role}</td><td className="px-5 py-4">{row.status}</td><td className="px-5 py-4">{row.max_chats}</td></tr>)}</tbody>
              </table>
            </div>
          ) : (
            <EmptyPanel title="No agents added" description="Invite your first human support agent to start handling chats." />
          )}
        </Card>
      </div>
    </PageShell>
  );
}

interface TeamMember { user_id: string; name: string; email: string; status: string; priority: number; priority_label: string; }

export function TeamsPage(): JSX.Element {
  const queryClient = useQueryClient();
  const { data = [] } = useQuery({ queryKey: ["teams"], queryFn: async () => (await api.get("/admin/teams")).data });
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [routingMode, setRoutingMode] = useState("round_robin");
  const [expandedTeam, setExpandedTeam] = useState<string | null>(null);

  const { data: teamMembers = [] } = useQuery({
    queryKey: ["team-members", expandedTeam],
    queryFn: async () => expandedTeam ? (await api.get<TeamMember[]>(`/gaps/teams/${expandedTeam}/members`)).data : [],
    enabled: Boolean(expandedTeam),
  });

  const createTeam = useMutation({
    mutationFn: async () => api.post("/admin/teams", { name, description: description || undefined, routing_mode: routingMode }),
    onSuccess: async () => {
      toast.success("Team created");
      setName("");
      setDescription("");
      setRoutingMode("round_robin");
      await queryClient.invalidateQueries({ queryKey: ["teams"] });
    },
    onError: () => toast.error("Could not create team")
  });

  const deleteTeam = useMutation({
    mutationFn: async (id: string) => api.delete(`/admin/teams/${id}`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["teams"] });
    }
  });

  const setPriority = useMutation({
    mutationFn: async ({ teamId, userId, priority }: { teamId: string; userId: string; priority: number }) =>
      api.patch(`/gaps/teams/${teamId}/members/${userId}/priority`, { priority }),
    onSuccess: async () => {
      toast.success("Priority updated");
      await queryClient.invalidateQueries({ queryKey: ["team-members", expandedTeam] });
    },
    onError: () => toast.error("Could not update priority"),
  });

  return (
    <PageShell>
      <PageHeader title="Teams" />
      <div className="grid grid-cols-1 gap-4 p-4 lg:grid-cols-[minmax(320px,420px)_minmax(0,1fr)] lg:gap-6 lg:p-6">
        <Card className="p-4">
          <h2 className="text-lg font-black text-slate-950 dark:text-slate-100">Create team</h2>
          <div className="mt-3 grid gap-3">
            <Field label="Name"><TextInput value={name} onChange={(event) => setName(event.target.value)} /></Field>
            <Field label="Description"><TextArea className="min-h-24" value={description} onChange={(event) => setDescription(event.target.value)} /></Field>
            <Field label="Routing mode">
              <SelectInput value={routingMode} onChange={(event) => setRoutingMode(event.target.value)}>
                <option value="round_robin">round_robin</option>
                <option value="least_loaded">least_loaded</option>
                <option value="manual">manual</option>
              </SelectInput>
            </Field>
            <Button variant="primary" disabled={createTeam.isPending || !name.trim()} onClick={() => createTeam.mutate()}>{createTeam.isPending ? "Saving..." : "Create team"}</Button>
          </div>
        </Card>
        <div className="grid gap-4">
          <Card className="overflow-hidden">
            <PanelHeader title="Active teams" />
            {data.length ? (
              <div className="divide-y divide-border">
                {data.map((team: { id: string; name: string; description: string | null; routing_mode: string }) => (
                  <div key={team.id}>
                    <div className="flex items-center justify-between gap-3 p-4">
                      <div>
                        <div className="font-bold text-slate-900 dark:text-slate-100">{team.name}</div>
                        <div className="text-sm text-slate-600 dark:text-slate-400">{team.description || "No description"}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">Mode: {team.routing_mode}</div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="secondary" onClick={() => setExpandedTeam(expandedTeam === team.id ? null : team.id)}>
                          {expandedTeam === team.id ? "Hide members" : "Manage priority"}
                        </Button>
                        <Button size="sm" variant="danger" onClick={() => deleteTeam.mutate(team.id)}>Delete</Button>
                      </div>
                    </div>
                    {expandedTeam === team.id && (
                      <div className="border-t border-border bg-slate-50/50 dark:bg-slate-800/30 px-4 pb-4">
                        <div className="pt-3 text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Agent Priority</div>
                        {teamMembers.length === 0 ? (
                          <div className="text-sm text-slate-400 py-2">No members. Add agents to this team first.</div>
                        ) : (
                          <div className="grid gap-2">
                            {teamMembers.map((member) => (
                              <div key={member.user_id} className="flex items-center justify-between rounded-lg border border-border bg-white dark:bg-slate-900 px-3 py-2">
                                <div>
                                  <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">{member.name}</span>
                                  <span className="ml-2 text-xs text-slate-400">{member.email}</span>
                                </div>
                                <SelectInput
                                  className="w-36"
                                  value={String(member.priority)}
                                  onChange={(e) => setPriority.mutate({ teamId: team.id, userId: member.user_id, priority: Number(e.target.value) })}
                                >
                                  <option value="0">Primary</option>
                                  <option value="1">Secondary</option>
                                </SelectInput>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <EmptyPanel title="No teams configured" description="Create teams to organize routing and ownership." />
            )}
          </Card>
        </div>
      </div>
    </PageShell>
  );
}

export function WidgetConfigPage(): JSX.Element {
  const queryClient = useQueryClient();
  const { data } = useQuery({ queryKey: ["org"], queryFn: async () => (await api.get("/admin/org")).data });
  const [color, setColor] = useState("#1E40AF");
  const [greeting, setGreeting] = useState("Hi! How can we help you today?");
  const [position, setPosition] = useState("bottom-right");
  const [theme, setTheme] = useState("auto");
  const [allowlist, setAllowlist] = useState("");
  const [preChatFields, setPreChatFields] = useState("name,email,subject,message");
  const [postChatSurveyEnabled, setPostChatSurveyEnabled] = useState(true);
  const [greetings, setGreetings] = useState<string>("");
  const [eyeCatcherEnabled, setEyeCatcherEnabled] = useState(false);
  const [eyeCatcherText, setEyeCatcherText] = useState("");
  const [eyeCatcherImage, setEyeCatcherImage] = useState("");
  const [whiteLabel, setWhiteLabel] = useState(false);
  const [brandText, setBrandText] = useState("FlowLyra");
  const [brandUrl, setBrandUrl] = useState("");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [lazyLoad, setLazyLoad] = useState(false);
  const [allowAttachments, setAllowAttachments] = useState(true);
  const [maxUploadMb, setMaxUploadMb] = useState(10);
  const [defaultLocale, setDefaultLocale] = useState("en");
  const [supportedLocales, setSupportedLocales] = useState("en");
  const [customJs, setCustomJs] = useState("");
  const [giphyApiKey, setGiphyApiKey] = useState("");
  const [ohEnabled, setOhEnabled] = useState(false);
  const [ohTimezone, setOhTimezone] = useState("UTC");
  const [inactivityEnabled, setInactivityEnabled] = useState(false);
  const [inactivityDelay, setInactivityDelay] = useState(60);
  const [inactivityText, setInactivityText] = useState("Still there? Can I help you with anything?");

  const parsePreChatFields = (raw: string): Array<string | Record<string, unknown>> => {
    const text = raw.trim();
    if (!text) return ["name", "email", "subject", "message"];
    if (text.startsWith("[") || text.startsWith("{")) {
      try {
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed)) return parsed as Array<string | Record<string, unknown>>;
      } catch {
        // fall back to CSV
      }
    }
    return text.split(",").map((item) => item.trim()).filter(Boolean);
  };

  const saveWidget = useMutation({
    mutationFn: async () => {
      await api.patch("/admin/org", {
        widget_color: color,
        widget_greeting: greeting,
        widget_position: position,
        widget_theme: theme,
        widget_domain_allowlist: { domains: allowlist.split("\n").map((item) => item.trim()).filter(Boolean) },
        widget_pre_chat_form: { enabled: true, fields: parsePreChatFields(preChatFields) },
        widget_post_chat_survey: { enabled: postChatSurveyEnabled, type: "csat_5" },
        widget_greetings: { items: greetings.split("\n").map((item) => item.trim()).filter(Boolean) },
        widget_eye_catcher: { enabled: eyeCatcherEnabled, text: eyeCatcherText || null, image_url: eyeCatcherImage || null },
        widget_white_label: whiteLabel,
        widget_brand_text: brandText,
        widget_brand_url: brandUrl || null,
        widget_sound_enabled: soundEnabled,
        widget_lazy_load: lazyLoad,
        widget_allow_attachments: allowAttachments,
        widget_max_upload_mb: maxUploadMb,
        widget_default_locale: defaultLocale,
        widget_supported_locales: { locales: supportedLocales.split(",").map((s) => s.trim()).filter(Boolean) },
        widget_custom_js: customJs || null,
        widget_giphy_api_key: giphyApiKey || null,
        operating_hours: { enabled: ohEnabled, timezone: ohTimezone, schedule: data?.operating_hours?.schedule ?? {} },
        widget_inactivity_message: { enabled: inactivityEnabled, delay_seconds: inactivityDelay, text: inactivityText },
      });
    },
    onSuccess: async () => {
      toast.success("Widget settings saved");
      await queryClient.invalidateQueries({ queryKey: ["org"] });
    },
    onError: () => toast.error("Could not save widget settings")
  });

  useEffect(() => {
    if (!data) return;
    setColor(String(data.widget_color ?? "#1E40AF"));
    setGreeting(String(data.widget_greeting ?? "Hi! How can we help you today?"));
    setPosition(String(data.widget_position ?? "bottom-right"));
    setTheme(String(data.widget_theme ?? "auto"));
    setAllowlist(((data.widget_domain_allowlist?.domains ?? []) as string[]).join("\n"));
    const rawFields = (data.widget_pre_chat_form?.fields ?? ["name", "email", "subject", "message"]) as Array<string | Record<string, unknown>>;
    const hasObjects = rawFields.some((f) => typeof f === "object");
    setPreChatFields(hasObjects ? JSON.stringify(rawFields, null, 2) : (rawFields as string[]).join(","));
    setPostChatSurveyEnabled(data.widget_post_chat_survey?.enabled !== false);
    setGreetings(((data.widget_greetings?.items ?? []) as string[]).join("\n"));
    setEyeCatcherEnabled(Boolean(data.widget_eye_catcher?.enabled));
    setEyeCatcherText(String(data.widget_eye_catcher?.text ?? ""));
    setEyeCatcherImage(String(data.widget_eye_catcher?.image_url ?? ""));
    setWhiteLabel(Boolean(data.widget_white_label));
    setBrandText(String(data.widget_brand_text ?? "FlowLyra"));
    setBrandUrl(String(data.widget_brand_url ?? ""));
    setSoundEnabled(data.widget_sound_enabled !== false);
    setLazyLoad(Boolean(data.widget_lazy_load));
    setAllowAttachments(data.widget_allow_attachments !== false);
    setMaxUploadMb(Number(data.widget_max_upload_mb ?? 10));
    setDefaultLocale(String(data.widget_default_locale ?? "en"));
    setSupportedLocales(((data.widget_supported_locales?.locales ?? ["en"]) as string[]).join(","));
    setCustomJs(String(data.widget_custom_js ?? ""));
    setGiphyApiKey(String(data.widget_giphy_api_key ?? ""));
    setOhEnabled(Boolean(data.operating_hours?.enabled));
    setOhTimezone(String(data.operating_hours?.timezone ?? "UTC"));
    setInactivityEnabled(Boolean(data.widget_inactivity_message?.enabled));
    setInactivityDelay(Number(data.widget_inactivity_message?.delay_seconds ?? 60));
    setInactivityText(String(data.widget_inactivity_message?.text ?? "Still there? Can I help you with anything?"));
  }, [data]);

  return (
    <PageShell>
      <PageHeader title="Widget" action={<a className="inline-flex items-center gap-2 rounded-lg border border-border bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700" href="/admin/install"><ExternalLink size={16} /> Install</a>} />
      <div className="grid grid-cols-1 gap-4 p-4 lg:grid-cols-[minmax(300px,420px)_minmax(0,1fr)] lg:gap-6 lg:p-6">
        <Card>
          <PanelHeader title="Live editor" description="Match the widget to your website and make the first customer screen feel human." />
          <form className="grid gap-4 p-4 sm:p-5" onSubmit={(event) => {
            event.preventDefault();
            saveWidget.mutate();
          }}>
          <Field label="Brand color"><input className="h-11 w-full rounded-lg border border-border bg-white dark:bg-slate-900 p-1" type="color" value={color} onChange={(event) => setColor(event.target.value)} /></Field>
          <Field label="Greeting"><TextArea className="min-h-24" value={greeting} onChange={(event) => setGreeting(event.target.value)} /></Field>
          <Field label="Position"><SelectInput value={position} onChange={(event) => setPosition(event.target.value)}><option>bottom-right</option><option>bottom-left</option><option>top-right</option><option>top-left</option></SelectInput></Field>
          <Field label="Theme"><SelectInput value={theme} onChange={(event) => setTheme(event.target.value)}><option>auto</option><option>light</option><option>dark</option></SelectInput></Field>
          <Field label="Pre-chat fields"><TextArea className="min-h-24 font-mono text-xs" value={preChatFields} onChange={(event) => setPreChatFields(event.target.value)} placeholder='CSV: name,email,phone,subject,message OR JSON: [{"name":"plan","type":"select","options":[{"value":"starter","label":"Starter"}]}]' /></Field>
          <Field label="Allowed domains"><TextArea className="min-h-20" value={allowlist} onChange={(event) => setAllowlist(event.target.value)} placeholder="example.com&#10;*.example.com" /></Field>
          <Field label="Giphy API key"><TextInput value={giphyApiKey} onChange={(event) => setGiphyApiKey(event.target.value)} placeholder="Optional: enables GIF picker search" /></Field>
          <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300"><input type="checkbox" checked={postChatSurveyEnabled} onChange={(event) => setPostChatSurveyEnabled(event.target.checked)} /> Show post-chat CSAT survey</label>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <FeatureToggle icon={<UsersRound size={16} />} title="Agent profiles" />
            <FeatureToggle icon={<Sparkles size={16} />} title="Quick topics" />
            <FeatureToggle icon={<ShieldCheck size={16} />} title="Human only" />
            <FeatureToggle icon={<Palette size={16} />} title="Brand theme" />
          </div>
          <div className="rounded-lg border border-border bg-slate-50 dark:bg-slate-800/40 p-4 grid gap-3">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Inactivity Message</div>
            <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
              <input type="checkbox" checked={inactivityEnabled} onChange={(e) => setInactivityEnabled(e.target.checked)} />
              Send message when visitor is inactive
            </label>
            {inactivityEnabled && (
              <>
                <Field label="Delay (seconds)">
                  <TextInput type="number" value={String(inactivityDelay)} onChange={(e) => setInactivityDelay(Number(e.target.value))} />
                </Field>
                <Field label="Message text">
                  <TextInput value={inactivityText} onChange={(e) => setInactivityText(e.target.value)} />
                </Field>
              </>
            )}
          </div>
          <Button variant="primary" type="submit" disabled={saveWidget.isPending}>{saveWidget.isPending ? "Saving..." : "Save"}</Button>
          </form>
        </Card>
        <Card>
          <PanelHeader title="Preview" description="Use the full test page to try real messages." action={<a className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-semibold hover:bg-slate-50" href="http://localhost:5174/" target="_blank" rel="noreferrer"><ExternalLink size={16} /> Test</a>} />
          <div className="grid min-h-[520px] place-items-end rounded-b-lg bg-[linear-gradient(135deg,#f8fafc,#e2e8f0)] p-4 sm:p-6">
            <div className="w-full max-w-[390px] overflow-hidden rounded-lg border border-slate-200 bg-white dark:bg-slate-900 shadow-2xl">
              <div className="p-5 text-white" style={{ background: color }}>
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-full bg-white">
                    <img src={flowlyraMark} alt="FlowLyra mark" className="h-8 w-8 rounded-lg" />
                  </div>
                  <div><div className="font-black">FlowLyra</div><div className="text-xs opacity-85">Online now</div></div>
                </div>
                <div className="mt-5 text-2xl font-black leading-tight">{greeting}</div>
              </div>
              <div className="grid gap-2 bg-slate-50 dark:bg-slate-800/50 p-4">
                {["Account support", "Product question", "Talk to sales"].map((item) => <div key={item} className="rounded-xl border border-border bg-white dark:bg-slate-900 p-3 text-sm font-bold">{item}<div className="mt-1 text-xs font-normal text-slate-500 dark:text-slate-400">Start with this topic</div></div>)}
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
          <h2 className="text-lg font-black text-slate-950 dark:text-slate-100">Local JavaScript Link</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-400">Use this while testing with Docker Compose on your machine.</p>
          <CodeBlock code={localSnippet} />
        </Card>
        <Card className="p-4 sm:p-5">
          <h2 className="text-lg font-black text-slate-950 dark:text-slate-100">Production Embed</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-400">Use this format when the widget is hosted on your CDN.</p>
          <CodeBlock code={productionSnippet} />
        </Card>
        <Card className="p-4 sm:p-5">
          <h2 className="text-lg font-black text-slate-950 dark:text-slate-100">Direct URLs</h2>
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
  const queryClient = useQueryClient();
  const { data: rules = [] } = useQuery({ queryKey: ["routing-rules"], queryFn: async () => (await api.get("/admin/routing-rules")).data });
  const [name, setName] = useState("");
  const [priority, setPriority] = useState(0);
  const [conditions, setConditions] = useState("{}");
  const [actionJson, setActionJson] = useState("{}");
  const [isActive, setIsActive] = useState(true);

  const createRule = useMutation({
    mutationFn: async () => {
      await api.post("/admin/routing-rules", {
        name,
        priority,
        conditions: JSON.parse(conditions || "{}"),
        action: JSON.parse(actionJson || "{}"),
        is_active: isActive
      });
    },
    onSuccess: async () => {
      toast.success("Routing rule created");
      setName("");
      setPriority(0);
      setConditions("{}");
      setActionJson("{}");
      setIsActive(true);
      await queryClient.invalidateQueries({ queryKey: ["routing-rules"] });
    },
    onError: () => toast.error("Invalid JSON or request failed")
  });

  const deleteRule = useMutation({
    mutationFn: async (id: string) => api.delete(`/admin/routing-rules/${id}`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["routing-rules"] });
    }
  });

  return (
    <PageShell>
      <PageHeader title="Routing rules" />
      <div className="grid grid-cols-1 gap-4 p-4 lg:grid-cols-[minmax(320px,420px)_minmax(0,1fr)] lg:gap-6 lg:p-6">
        <Card className="p-4">
          <h2 className="text-lg font-black text-slate-950 dark:text-slate-100">Create rule</h2>
          <div className="mt-3 grid gap-3">
            <Field label="Name"><TextInput value={name} onChange={(event) => setName(event.target.value)} /></Field>
            <Field label="Priority"><TextInput type="number" value={String(priority)} onChange={(event) => setPriority(Number(event.target.value || 0))} /></Field>
            <Field label="Conditions (JSON)"><TextArea className="min-h-24" value={conditions} onChange={(event) => setConditions(event.target.value)} /></Field>
            <Field label="Action (JSON)"><TextArea className="min-h-24" value={actionJson} onChange={(event) => setActionJson(event.target.value)} /></Field>
            <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300"><input type="checkbox" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} /> Active</label>
            <Button variant="primary" disabled={createRule.isPending || !name.trim()} onClick={() => createRule.mutate()}>{createRule.isPending ? "Saving..." : "Create rule"}</Button>
          </div>
        </Card>
        <Card className="overflow-hidden">
          <PanelHeader title="Live rules" description="Executed in priority order." />
          {rules.length ? (
            <div className="divide-y divide-border">
              {rules.map((rule: { id: string; name: string; priority: number; is_active: boolean; conditions: Record<string, unknown>; action: Record<string, unknown> }) => (
                <div key={rule.id} className="p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="font-bold text-slate-900 dark:text-slate-100">{rule.name}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">Priority: {rule.priority} • {rule.is_active ? "Active" : "Disabled"}</div>
                    </div>
                    <Button size="sm" variant="danger" onClick={() => deleteRule.mutate(rule.id)}>Delete</Button>
                  </div>
                  <pre className="mt-3 overflow-x-auto rounded-lg bg-slate-50 dark:bg-slate-800/50 p-3 text-xs text-slate-700 dark:text-slate-300">{JSON.stringify({ conditions: rule.conditions, action: rule.action }, null, 2)}</pre>
                </div>
              ))}
            </div>
          ) : (
            <EmptyPanel title="No routing rules configured" description="Create your first rule to automate assignment." />
          )}
        </Card>
      </div>
    </PageShell>
  );
}

export function TriggersPage(): JSX.Element {
  const queryClient = useQueryClient();
  const { data: triggers = [] } = useQuery({ queryKey: ["proactive-triggers"], queryFn: async () => (await api.get("/admin/proactive-triggers")).data });
  const [name, setName] = useState("");
  const [triggerType, setTriggerType] = useState("time_on_page");
  const [conditions, setConditions] = useState("{}");
  const [message, setMessage] = useState("");
  const [isActive, setIsActive] = useState(true);

  const createTrigger = useMutation({
    mutationFn: async () => {
      await api.post("/admin/proactive-triggers", {
        name,
        trigger_type: triggerType,
        conditions: JSON.parse(conditions || "{}"),
        message,
        is_active: isActive
      });
    },
    onSuccess: async () => {
      toast.success("Trigger created");
      setName("");
      setConditions("{}");
      setMessage("");
      setIsActive(true);
      await queryClient.invalidateQueries({ queryKey: ["proactive-triggers"] });
    },
    onError: () => toast.error("Invalid JSON or request failed")
  });

  const deleteTrigger = useMutation({
    mutationFn: async (id: string) => api.delete(`/admin/proactive-triggers/${id}`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["proactive-triggers"] });
    }
  });

  return (
    <PageShell>
      <PageHeader title="Proactive triggers" />
      <div className="grid grid-cols-1 gap-4 p-4 lg:grid-cols-[minmax(320px,420px)_minmax(0,1fr)] lg:gap-6 lg:p-6">
        <Card className="p-4">
          <h2 className="text-lg font-black text-slate-950 dark:text-slate-100">Create trigger</h2>
          <div className="mt-3 grid gap-3">
            <Field label="Name"><TextInput value={name} onChange={(event) => setName(event.target.value)} /></Field>
            <Field label="Trigger type">
              <SelectInput value={triggerType} onChange={(event) => setTriggerType(event.target.value)}>
                <option value="time_on_page">time_on_page</option>
                <option value="exit_intent">exit_intent</option>
                <option value="url_match">url_match</option>
              </SelectInput>
            </Field>
            <Field label="Conditions (JSON)"><TextArea className="min-h-24" value={conditions} onChange={(event) => setConditions(event.target.value)} /></Field>
            <Field label="Message"><TextArea className="min-h-24" value={message} onChange={(event) => setMessage(event.target.value)} /></Field>
            <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300"><input type="checkbox" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} /> Active</label>
            <Button variant="primary" disabled={createTrigger.isPending || !name.trim() || !message.trim()} onClick={() => createTrigger.mutate()}>{createTrigger.isPending ? "Saving..." : "Create trigger"}</Button>
          </div>
        </Card>
        <Card className="overflow-hidden">
          <PanelHeader title="Live triggers" description="Displayed automatically when trigger conditions are met." />
          {triggers.length ? (
            <div className="divide-y divide-border">
              {triggers.map((trigger: { id: string; name: string; trigger_type: string; message: string; sent_count: number; is_active: boolean; conditions: Record<string, unknown> }) => (
                <div key={trigger.id} className="p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="font-bold text-slate-900 dark:text-slate-100">{trigger.name}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">{trigger.trigger_type} • Sent: {trigger.sent_count} • {trigger.is_active ? "Active" : "Disabled"}</div>
                    </div>
                    <Button size="sm" variant="danger" onClick={() => deleteTrigger.mutate(trigger.id)}>Delete</Button>
                  </div>
                  <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">{trigger.message}</p>
                  <pre className="mt-3 overflow-x-auto rounded-lg bg-slate-50 dark:bg-slate-800/50 p-3 text-xs text-slate-700 dark:text-slate-300">{JSON.stringify(trigger.conditions, null, 2)}</pre>
                </div>
              ))}
            </div>
          ) : (
            <EmptyPanel title="No proactive triggers configured" description="Create your first trigger to proactively engage visitors." />
          )}
        </Card>
      </div>
    </PageShell>
  );
}

export function CannedResponsesPage(): JSX.Element {
  const queryClient = useQueryClient();
  const { data = [] } = useQuery({ queryKey: ["canned"], queryFn: async () => (await api.get("/admin/canned-responses")).data });
  const [shortcut, setShortcut] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const createCanned = useMutation({
    mutationFn: async () => api.post("/admin/canned-responses", { shortcut, title, content }),
    onSuccess: async () => {
      toast.success("Response saved");
      setShortcut("");
      setTitle("");
      setContent("");
      await queryClient.invalidateQueries({ queryKey: ["canned"] });
    },
    onError: () => toast.error("Could not save response")
  });

  const deleteCanned = useMutation({
    mutationFn: async (id: string) => api.delete(`/admin/canned-responses/${id}`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["canned"] });
    }
  });

  return (
    <PageShell>
      <PageHeader title="Canned responses" />
      <div className="grid grid-cols-1 gap-4 p-4 lg:grid-cols-[minmax(320px,420px)_minmax(0,1fr)] lg:gap-6 lg:p-6">
        <Card className="p-4">
          <h2 className="text-lg font-black text-slate-950 dark:text-slate-100">Create response</h2>
          <div className="mt-3 grid gap-3">
            <Field label="Shortcut"><TextInput value={shortcut} onChange={(event) => setShortcut(event.target.value)} /></Field>
            <Field label="Title"><TextInput value={title} onChange={(event) => setTitle(event.target.value)} /></Field>
            <Field label="Content"><TextArea className="min-h-28" value={content} onChange={(event) => setContent(event.target.value)} /></Field>
            <Button variant="primary" disabled={createCanned.isPending || !shortcut.trim() || !title.trim() || !content.trim()} onClick={() => createCanned.mutate()}>{createCanned.isPending ? "Saving..." : "Save response"}</Button>
          </div>
        </Card>
        <Card className="overflow-hidden">
          <PanelHeader title="Saved responses" />
          {data.length ? (
            <div className="divide-y divide-border">
              {data.map((item: { id: string; shortcut: string; title: string; content: string }) => (
                <div key={item.id} className="p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="font-bold text-slate-900 dark:text-slate-100">/{item.shortcut}</div>
                      <div className="text-sm font-semibold text-slate-700 dark:text-slate-300">{item.title}</div>
                    </div>
                    <Button size="sm" variant="danger" onClick={() => deleteCanned.mutate(item.id)}>Delete</Button>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600 dark:text-slate-400">{item.content}</p>
                </div>
              ))}
            </div>
          ) : (
            <EmptyPanel title="No canned responses saved" description="Add reusable replies for faster, more consistent support." />
          )}
        </Card>
      </div>
    </PageShell>
  );
}

export function BillingPage(): JSX.Element {
  const queryClient = useQueryClient();
  const { data } = useQuery({ queryKey: ["org"], queryFn: async () => (await api.get("/admin/org")).data });
  const [name, setName] = useState("");
  const [timezone, setTimezone] = useState("UTC");
  const [plan, setPlan] = useState("starter");

  useEffect(() => {
    if (!data) return;
    setName(String(data.name ?? ""));
    setTimezone(String(data.timezone ?? "UTC"));
    setPlan(String(data.plan ?? "starter"));
  }, [data]);

  const saveOrg = useMutation({
    mutationFn: async () => api.patch("/admin/org", { name, timezone, plan }),
    onSuccess: async () => {
      toast.success("Workspace settings saved");
      await queryClient.invalidateQueries({ queryKey: ["org"] });
    },
    onError: () => toast.error("Could not save settings")
  });

  return (
    <PageShell>
      <PageHeader title="Workspace & Billing" />
      <div className="p-4 sm:p-6">
        <Card className="max-w-3xl p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Workspace name"><TextInput value={name} onChange={(event) => setName(event.target.value)} /></Field>
            <Field label="Timezone"><TextInput value={timezone} onChange={(event) => setTimezone(event.target.value)} /></Field>
            <Field label="Plan">
              <SelectInput value={plan} onChange={(event) => setPlan(event.target.value)}>
                <option value="starter">starter</option>
                <option value="team">team</option>
                <option value="business">business</option>
                <option value="enterprise">enterprise</option>
              </SelectInput>
            </Field>
          </div>
          <div className="mt-4">
            <Button variant="primary" disabled={saveOrg.isPending} onClick={() => saveOrg.mutate()}>{saveOrg.isPending ? "Saving..." : "Save settings"}</Button>
          </div>
        </Card>
      </div>
    </PageShell>
  );
}

export function AnalyticsPage(): JSX.Element {
  const queryClient = useQueryClient();
  const theme = useThemeStore((state) => state.theme);
  const axisColor = theme === "dark" ? "#9aacbf" : "#64748b";
  const gridColor = theme === "dark" ? "#243244" : "#dbe3ee";
  const tooltipStyle = theme === "dark" ? { backgroundColor: "#111b2e", border: "1px solid #243244", color: "#e6edf7" } : { backgroundColor: "#ffffff", border: "1px solid #dbe3ee", color: "#0f172a" };
  const [exportReport, setExportReport] = useState("channels");
  const [scheduleName, setScheduleName] = useState("Weekly channels report");
  const [scheduleType, setScheduleType] = useState("channels");
  const [scheduleEmail, setScheduleEmail] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [filterChannel, setFilterChannel] = useState("");
  const [filterTag, setFilterTag] = useState("");
  const [filterAgent, setFilterAgent] = useState("");
  const [filterTeam, setFilterTeam] = useState("");
  const [customSource, setCustomSource] = useState("chats");
  const [customDimensions, setCustomDimensions] = useState("channel,status");
  const [customMetric, setCustomMetric] = useState("count");
  const [sharedLink, setSharedLink] = useState("");

  const { data: overview } = useQuery({
    queryKey: ["analytics", "overview"],
    queryFn: async () => (await api.get<{
      active_chats: number;
      queue_length: number;
      agents_online: number;
      avg_wait_seconds: number;
      todays_resolved: number;
      todays_csat: number | null;
    }>("/analytics/overview")).data
  });
  const { data: volume = [] } = useQuery({
    queryKey: ["analytics", "chat-volume"],
    queryFn: async () => (await api.get<Array<{ bucket: string; count: number }>>("/analytics/chat-volume")).data
  });
  const { data: csat = [] } = useQuery({
    queryKey: ["analytics", "csat"],
    queryFn: async () => (await api.get<Array<{ bucket: string; score: number }>>("/analytics/csat")).data
  });
  const { data: responseTime } = useQuery({
    queryKey: ["analytics", "response-time"],
    queryFn: async () => (await api.get<{ p50: number; p90: number; p99: number }>("/analytics/response-time")).data
  });
  const { data: agentStats = [] } = useQuery({
    queryKey: ["analytics", "agent-stats"],
    queryFn: async () => (await api.get<Array<{ agent_id: string; name: string; chats: number; csat: number | null }>>("/analytics/agent-stats")).data
  });
  const { data: missed = [] } = useQuery({
    queryKey: ["analytics", "missed-chats"],
    queryFn: async () => (await api.get<Array<{ id: string }>>("/analytics/missed-chats")).data
  });
  const { data: channels = [] } = useQuery({
    queryKey: ["analytics", "channels"],
    queryFn: async () => (await api.get<Array<{ channel: string; chats: number; csat: number | null }>>("/analytics/channels")).data
  });
  const { data: chatDuration } = useQuery({
    queryKey: ["analytics", "chat-duration"],
    queryFn: async () => (await api.get<{ avg_seconds: number; p50_seconds: number; p90_seconds: number; series: Array<{ bucket: string; avg_seconds: number }> }>("/analytics/chat-duration")).data
  });
  const { data: queueAbandonment } = useQuery({
    queryKey: ["analytics", "queue-abandonment"],
    queryFn: async () => (await api.get<{ total: number; abandoned: number; rate: number }>("/analytics/queue-abandonment")).data
  });
  const { data: avgResolution } = useQuery({
    queryKey: ["analytics", "avg-resolution-time"],
    queryFn: async () => (await api.get<{ avg_seconds: number }>("/analytics/avg-resolution-time")).data
  });
  const { data: repeatCustomer } = useQuery({
    queryKey: ["analytics", "repeat-customer-rate"],
    queryFn: async () => (await api.get<{ total_contacts: number; repeat_contacts: number; rate: number }>("/analytics/repeat-customer-rate")).data
  });
  const { data: goalsAchieved } = useQuery({
    queryKey: ["analytics", "goals-achieved"],
    queryFn: async () => (await api.get<{ total: number; items: Array<{ goal: string; achieved: number; value: number }> }>("/analytics/goals-achieved")).data
  });
  const { data: revenue } = useQuery({
    queryKey: ["analytics", "revenue"],
    queryFn: async () => (await api.get<{ total: number; series: Array<{ bucket: string; revenue: number }> }>("/analytics/revenue")).data
  });
  const { data: campaignConversion } = useQuery({
    queryKey: ["analytics", "campaign-conversion"],
    queryFn: async () => (await api.get<{ items: Array<{ campaign_id: string; sent: number; converted: number; conversion_rate: number }> }>("/analytics/campaign-conversion")).data
  });
  const { data: slaCompliance } = useQuery({
    queryKey: ["analytics", "sla-compliance"],
    queryFn: async () => (await api.get<{ first_response_compliance: number; resolution_compliance: number }>("/analytics/sla-compliance")).data
  });
  const { data: kbReport } = useQuery({
    queryKey: ["analytics", "kb"],
    queryFn: async () => (await api.get<{ total_views: number; top_articles: Array<{ title: string; views: number }> }>("/analytics/kb")).data
  });
  const { data: comparePeriod } = useQuery({
    queryKey: ["analytics", "compare-period"],
    queryFn: async () => (await api.get<{ current: number; previous: number; delta: number; delta_ratio: number }>("/analytics/compare-period", { params: { days: 7 } })).data
  });
  const { data: staffingPrediction } = useQuery({
    queryKey: ["analytics", "staffing-prediction"],
    queryFn: async () => (await api.get<{ avg_handle_minutes: number; peak_hour: number; peak_agents: number; series: Array<{ hour: number; avg_chats_per_hour: number; recommended_agents: number }> }>("/analytics/staffing-prediction")).data
  });
  const { data: cohorts } = useQuery({
    queryKey: ["analytics", "cohorts"],
    queryFn: async () => (await api.get<{ months: number; cohorts: Array<Record<string, number | string>> }>("/analytics/cohorts", { params: { months: 6 } })).data
  });
  const { data: botPerformance } = useQuery({
    queryKey: ["analytics", "bot-performance"],
    queryFn: async () => (await api.get<{ items: Array<{ flow_id: string; flow_name: string; total_sessions: number; completion_rate: number; handoff_rate: number }> }>("/analytics/bot-performance")).data
  });
  const customReport = useMutation({
    mutationFn: async () => (await api.post<{ rows: Array<Record<string, unknown>> }>("/analytics/custom-report", {
      source: customSource,
      dimensions: customDimensions.split(",").map((item) => item.trim()).filter(Boolean),
      metric: customMetric,
      limit: 200
    })).data
  });
  const { data: schedules = [] } = useQuery({
    queryKey: ["analytics", "report-schedules"],
    queryFn: async () => (await api.get<Array<{ id: string; name: string; report_type: string; frequency: string; recipients: { emails?: string[] }; is_active: boolean }>>("/analytics/report-schedules")).data
  });
  const shareReport = useMutation({
    mutationFn: async () => (await api.post<{ url: string }>("/analytics/share-link", {
      report: exportReport,
      filters: { date_from: filterDateFrom || null, date_to: filterDateTo || null, channel: filterChannel || null, tag: filterTag || null, agent: filterAgent || null, team: filterTeam || null },
      ttl_hours: 72
    })).data,
    onSuccess: (data) => {
      setSharedLink(data.url);
      toast.success("Share link created");
    },
    onError: () => toast.error("Could not create share link")
  });
  const { data: viewerIp } = useQuery({
    queryKey: ["viewer-ip"],
    queryFn: async () => (await api.get<{ ip: string | null }>("/public/client-ip")).data,
    refetchInterval: 30000
  });
  const createSchedule = useMutation({
    mutationFn: async () => api.post("/analytics/report-schedules", {
      name: scheduleName,
      report_type: scheduleType,
      frequency: "weekly",
      report_format: "csv",
      recipients: { emails: scheduleEmail.trim() ? [scheduleEmail.trim()] : [] },
      filters: { date_from: filterDateFrom || null, date_to: filterDateTo || null, channel: filterChannel || null, tag: filterTag || null, agent: filterAgent || null, team: filterTeam || null },
    }),
    onSuccess: async () => {
      toast.success("Report schedule created");
      await queryClient.invalidateQueries({ queryKey: ["analytics", "report-schedules"] });
    },
    onError: () => toast.error("Could not create schedule")
  });
  const toggleSchedule = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => api.patch(`/analytics/report-schedules/${id}`, { is_active: isActive }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["analytics", "report-schedules"] });
    },
    onError: () => toast.error("Could not update schedule")
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
  const chatDurationSeries = (chatDuration?.series || []).slice(-7).map((row) => ({ bucket: shortDate(row.bucket), avg: Number((row.avg_seconds / 60).toFixed(1)) }));
  const channelSeries = channels.map((row) => ({ name: row.channel, chats: row.chats }));
  const campaignSeries = (campaignConversion?.items || []).slice(0, 7).map((row) => ({ campaign: row.campaign_id.slice(0, 8), rate: Number((row.conversion_rate * 100).toFixed(1)) }));
  const revenueSeries = (revenue?.series || []).slice(-7).map((row) => ({ bucket: shortDate(row.bucket), revenue: row.revenue }));
  const exportCsv = async (): Promise<void> => {
    try {
      const response = await api.get("/analytics/export.csv", { params: { report: exportReport }, responseType: "blob" });
      const blob = new Blob([response.data], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `analytics_${exportReport}.csv`;
      document.body.append(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error("Could not export CSV");
    }
  };
  const exportBinary = async (kind: "pdf" | "xlsx"): Promise<void> => {
    try {
      const response = await api.get(`/analytics/export.${kind}`, { params: { report: exportReport }, responseType: "blob" });
      const mime = kind === "pdf" ? "application/pdf" : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
      const blob = new Blob([response.data], { type: mime });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `analytics_${exportReport}.${kind}`;
      document.body.append(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error(`Could not export ${kind.toUpperCase()}`);
    }
  };
  return (
    <PageShell>
      <PageHeader title="Analytics" />
      <div className="grid gap-4 p-4 sm:p-6">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-8">
          <MetricCard label="Chats today" value={todayChats} tone="blue" />
          <MetricCard label="Resolved" value={overview?.todays_resolved ?? 0} tone="green" />
          <MetricCard label="Waiting" value={overview?.queue_length ?? 0} tone="yellow" />
          <MetricCard label="CSAT" value={csatValue == null ? "-" : csatValue.toFixed(1)} tone="slate" />
          <MetricCard label="Avg response" value={formatDuration(avgResponseSeconds)} tone="slate" />
          <MetricCard label="Missed" value={missed.length} tone={missed.length > 0 ? "red" : "slate"} />
          <MetricCard label="Abandon rate" value={`${((queueAbandonment?.rate || 0) * 100).toFixed(1)}%`} tone="red" />
          <MetricCard label="Avg resolution" value={formatDuration(avgResolution?.avg_seconds || 0)} tone="blue" />
        </div>
        <Card className="p-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            <Field label="Date from"><TextInput type="date" value={filterDateFrom} onChange={(event) => setFilterDateFrom(event.target.value)} /></Field>
            <Field label="Date to"><TextInput type="date" value={filterDateTo} onChange={(event) => setFilterDateTo(event.target.value)} /></Field>
            <Field label="Channel"><TextInput placeholder="web/whatsapp" value={filterChannel} onChange={(event) => setFilterChannel(event.target.value)} /></Field>
            <Field label="Tag"><TextInput placeholder="vip" value={filterTag} onChange={(event) => setFilterTag(event.target.value)} /></Field>
            <Field label="Agent"><TextInput placeholder="agent id" value={filterAgent} onChange={(event) => setFilterAgent(event.target.value)} /></Field>
            <Field label="Team"><TextInput placeholder="team id" value={filterTeam} onChange={(event) => setFilterTeam(event.target.value)} /></Field>
            <Field label="CSV report type">
              <SelectInput value={exportReport} onChange={(event) => setExportReport(event.target.value)}>
                <option value="channels">channels</option>
                <option value="tags">tags</option>
                <option value="leaderboard">leaderboard</option>
                <option value="csat">csat</option>
                <option value="chat_volume">chat_volume</option>
                <option value="goals_achieved">goals_achieved</option>
                <option value="revenue">revenue</option>
                <option value="campaign_conversion">campaign_conversion</option>
                <option value="sla_compliance">sla_compliance</option>
                <option value="kb">kb</option>
                <option value="bot_performance">bot_performance</option>
              </SelectInput>
            </Field>
            <div className="flex items-end gap-2">
              <Button variant="secondary" onClick={() => void exportCsv()}>CSV</Button>
              <Button variant="secondary" onClick={() => void exportBinary("pdf")}>PDF</Button>
              <Button variant="secondary" onClick={() => void exportBinary("xlsx")}>Excel</Button>
              <Button variant="primary" onClick={() => shareReport.mutate()} disabled={shareReport.isPending}>{shareReport.isPending ? "Sharing..." : "Share link"}</Button>
            </div>
          </div>
          {sharedLink ? <div className="mt-3 text-sm text-slate-600 dark:text-slate-300">Public read-only link: <span className="font-semibold break-all">{sharedLink}</span></div> : null}
        </Card>
        <Card className="p-4 text-sm text-slate-600 dark:text-slate-400">
          <div className="font-bold text-slate-900 dark:text-slate-100">Admin session</div>
          <div className="mt-1">Your current IP: <span className="font-semibold">{viewerIp?.ip ?? "Unavailable"}</span></div>
        </Card>
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
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
          <Chart title="Duration trend (mins)">
            <LineChart data={chatDurationSeries}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis dataKey="bucket" stroke={axisColor} />
              <YAxis stroke={axisColor} />
              <Tooltip contentStyle={tooltipStyle} />
              <Line dataKey="avg" stroke="#0EA5E9" />
            </LineChart>
          </Chart>
        </div>
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <Chart title="Channel breakdown">
            <BarChart data={channelSeries}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis dataKey="name" stroke={axisColor} />
              <YAxis stroke={axisColor} allowDecimals={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="chats" fill="#2563EB" />
            </BarChart>
          </Chart>
          <Chart title="Campaign conversion %">
            <BarChart data={campaignSeries}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis dataKey="campaign" stroke={axisColor} />
              <YAxis stroke={axisColor} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="rate" fill="#14B8A6" />
            </BarChart>
          </Chart>
          <Chart title="Revenue trend">
            <AreaChart data={revenueSeries}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis dataKey="bucket" stroke={axisColor} />
              <YAxis stroke={axisColor} />
              <Tooltip contentStyle={tooltipStyle} />
              <Area dataKey="revenue" stroke="#F59E0B" fill="#FEF3C7" />
            </AreaChart>
          </Chart>
        </div>
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-6">
          <MetricCard label="Goals achieved" value={goalsAchieved?.total ?? 0} tone="green" />
          <MetricCard label="Revenue" value={`$${(revenue?.total || 0).toFixed(2)}`} tone="yellow" />
          <MetricCard label="Repeat rate" value={`${((repeatCustomer?.rate || 0) * 100).toFixed(1)}%`} tone="blue" />
          <MetricCard label="SLA 1st resp" value={`${((slaCompliance?.first_response_compliance || 0) * 100).toFixed(1)}%`} tone="slate" />
          <MetricCard label="SLA resolve" value={`${((slaCompliance?.resolution_compliance || 0) * 100).toFixed(1)}%`} tone="slate" />
          <MetricCard label="KB views" value={kbReport?.total_views || 0} tone="blue" />
        </div>
        <Card className="p-4">
          <PanelHeader title="Compare period (7d)" description="Current period vs previous period chat volume." />
          <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
            <MetricCard label="Current" value={comparePeriod?.current || 0} tone="blue" />
            <MetricCard label="Previous" value={comparePeriod?.previous || 0} tone="slate" />
            <MetricCard label="Delta" value={comparePeriod?.delta || 0} tone={(comparePeriod?.delta || 0) >= 0 ? "green" : "red"} />
            <MetricCard label="Delta %" value={`${((comparePeriod?.delta_ratio || 0) * 100).toFixed(1)}%`} tone="yellow" />
          </div>
        </Card>
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <Chart title="Staffing prediction">
            <LineChart data={(staffingPrediction?.series || []).map((item) => ({ hour: String(item.hour), agents: item.recommended_agents }))}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis dataKey="hour" stroke={axisColor} />
              <YAxis stroke={axisColor} allowDecimals={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Line dataKey="agents" stroke="#9333EA" />
            </LineChart>
          </Chart>
          <Card className="p-4">
            <PanelHeader title="Cohort analysis" description="Retention by month from first-seen cohort." />
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[520px] text-left text-xs">
                <thead><tr className="border-b border-border"><th className="py-2 pr-2">Cohort</th><th className="py-2 pr-2">Size</th><th className="py-2 pr-2">M0</th><th className="py-2 pr-2">M1</th><th className="py-2 pr-2">M2</th><th className="py-2 pr-2">M3</th><th className="py-2 pr-2">M4</th><th className="py-2 pr-2">M5</th></tr></thead>
                <tbody>
                  {(cohorts?.cohorts || []).slice(0, 10).map((row, index) => (
                    <tr key={`${row.cohort}-${index}`} className="border-b border-border">
                      <td className="py-2 pr-2 font-semibold">{String(row.cohort || "")}</td>
                      <td className="py-2 pr-2">{Number(row.size || 0)}</td>
                      <td className="py-2 pr-2">{`${(Number(row.m0 || 0) * 100).toFixed(0)}%`}</td>
                      <td className="py-2 pr-2">{`${(Number(row.m1 || 0) * 100).toFixed(0)}%`}</td>
                      <td className="py-2 pr-2">{`${(Number(row.m2 || 0) * 100).toFixed(0)}%`}</td>
                      <td className="py-2 pr-2">{`${(Number(row.m3 || 0) * 100).toFixed(0)}%`}</td>
                      <td className="py-2 pr-2">{`${(Number(row.m4 || 0) * 100).toFixed(0)}%`}</td>
                      <td className="py-2 pr-2">{`${(Number(row.m5 || 0) * 100).toFixed(0)}%`}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <Card className="p-4">
            <PanelHeader title="Custom report builder" description="Build ad-hoc pivot-like reports by source, dimensions, and metric." />
            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-4">
              <Field label="Source"><TextInput value={customSource} onChange={(event) => setCustomSource(event.target.value)} /></Field>
              <Field label="Dimensions (csv)"><TextInput value={customDimensions} onChange={(event) => setCustomDimensions(event.target.value)} /></Field>
              <Field label="Metric"><TextInput value={customMetric} onChange={(event) => setCustomMetric(event.target.value)} /></Field>
              <div className="flex items-end"><Button variant="primary" onClick={() => customReport.mutate()} disabled={customReport.isPending}>{customReport.isPending ? "Running..." : "Run"}</Button></div>
            </div>
            <div className="mt-4 overflow-x-auto rounded-xl border border-border">
              <pre className="p-3 text-xs text-slate-700 dark:text-slate-300">{JSON.stringify(customReport.data?.rows || [], null, 2)}</pre>
            </div>
          </Card>
          <Card className="p-4">
            <PanelHeader title="Bot performance" description="Completion and handoff rates by chatbot flow." />
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[520px] text-left text-xs">
                <thead><tr className="border-b border-border"><th className="py-2 pr-2">Flow</th><th className="py-2 pr-2">Sessions</th><th className="py-2 pr-2">Completion</th><th className="py-2 pr-2">Handoff</th></tr></thead>
                <tbody>
                  {(botPerformance?.items || []).map((item) => (
                    <tr key={item.flow_id} className="border-b border-border">
                      <td className="py-2 pr-2 font-semibold">{item.flow_name}</td>
                      <td className="py-2 pr-2">{item.total_sessions}</td>
                      <td className="py-2 pr-2">{`${(item.completion_rate * 100).toFixed(1)}%`}</td>
                      <td className="py-2 pr-2">{`${(item.handoff_rate * 100).toFixed(1)}%`}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
        <Card className="p-4">
          <PanelHeader title="Scheduled reports" description="Email weekly/monthly report exports." />
          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-5">
            <Field label="Name"><TextInput value={scheduleName} onChange={(event) => setScheduleName(event.target.value)} /></Field>
            <Field label="Report type"><TextInput value={scheduleType} onChange={(event) => setScheduleType(event.target.value)} /></Field>
            <Field label="Recipient email"><TextInput type="email" placeholder="ops@company.com" value={scheduleEmail} onChange={(event) => setScheduleEmail(event.target.value)} /></Field>
            <div className="md:col-span-2 flex items-end"><Button variant="primary" disabled={!scheduleName.trim() || !scheduleType.trim() || createSchedule.isPending} onClick={() => createSchedule.mutate()}>{createSchedule.isPending ? "Saving..." : "Create schedule"}</Button></div>
          </div>
          <div className="mt-4 divide-y divide-border rounded-xl border border-border">
            {schedules.length ? schedules.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-3">
                <div>
                  <div className="font-semibold text-slate-900 dark:text-slate-100">{item.name}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">{item.report_type} • {item.frequency} • {(item.recipients?.emails || []).join(", ") || "no recipients"}</div>
                </div>
                <Button size="sm" variant={item.is_active ? "secondary" : "primary"} onClick={() => toggleSchedule.mutate({ id: item.id, isActive: !item.is_active })}>{item.is_active ? "Pause" : "Resume"}</Button>
              </div>
            )) : <div className="p-3 text-sm text-slate-500">No schedules configured.</div>}
          </div>
        </Card>
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
        <button onClick={() => void copy()} className="inline-flex items-center gap-2 rounded-lg bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-900 hover:bg-slate-100">
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
      <button onClick={() => void copy()} className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-border px-3 py-1.5 font-semibold hover:bg-slate-50 dark:bg-slate-800/50 dark:hover:bg-slate-800">
        {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}
