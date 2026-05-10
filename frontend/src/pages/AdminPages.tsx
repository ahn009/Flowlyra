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

export function TeamsPage(): JSX.Element {
  const queryClient = useQueryClient();
  const { data = [] } = useQuery({ queryKey: ["teams"], queryFn: async () => (await api.get("/admin/teams")).data });
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [routingMode, setRoutingMode] = useState("round_robin");

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
        <Card className="overflow-hidden">
          <PanelHeader title="Active teams" />
          {data.length ? (
            <div className="divide-y divide-border">
              {data.map((team: { id: string; name: string; description: string | null; routing_mode: string }) => (
                <div key={team.id} className="flex items-center justify-between gap-3 p-4">
                  <div>
                    <div className="font-bold text-slate-900 dark:text-slate-100">{team.name}</div>
                    <div className="text-sm text-slate-600 dark:text-slate-400">{team.description || "No description"}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">Mode: {team.routing_mode}</div>
                  </div>
                  <Button size="sm" variant="danger" onClick={() => deleteTeam.mutate(team.id)}>Delete</Button>
                </div>
              ))}
            </div>
          ) : (
            <EmptyPanel title="No teams configured" description="Create teams to organize routing and ownership." />
          )}
        </Card>
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

  const saveWidget = useMutation({
    mutationFn: async () => {
      await api.patch("/admin/org", {
        widget_color: color,
        widget_greeting: greeting,
        widget_position: position,
        widget_theme: theme,
        widget_domain_allowlist: { domains: allowlist.split("\n").map((item) => item.trim()).filter(Boolean) },
        widget_pre_chat_form: { enabled: true, fields: preChatFields.split(",").map((item) => item.trim()).filter(Boolean) },
        widget_post_chat_survey: { enabled: postChatSurveyEnabled, type: "csat_5" }
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
    setPreChatFields(((data.widget_pre_chat_form?.fields ?? ["name", "email", "subject", "message"]) as string[]).join(","));
    setPostChatSurveyEnabled(data.widget_post_chat_survey?.enabled !== false);
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
          <Field label="Pre-chat fields"><TextInput value={preChatFields} onChange={(event) => setPreChatFields(event.target.value)} placeholder="name,email,phone,subject,message" /></Field>
          <Field label="Allowed domains"><TextArea className="min-h-20" value={allowlist} onChange={(event) => setAllowlist(event.target.value)} placeholder="example.com&#10;*.example.com" /></Field>
          <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300"><input type="checkbox" checked={postChatSurveyEnabled} onChange={(event) => setPostChatSurveyEnabled(event.target.checked)} /> Show post-chat CSAT survey</label>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <FeatureToggle icon={<UsersRound size={16} />} title="Agent profiles" />
            <FeatureToggle icon={<Sparkles size={16} />} title="Quick topics" />
            <FeatureToggle icon={<ShieldCheck size={16} />} title="Human only" />
            <FeatureToggle icon={<Palette size={16} />} title="Brand theme" />
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
  const { data: viewerIp } = useQuery({
    queryKey: ["viewer-ip"],
    queryFn: async () => (await api.get<{ ip: string | null }>("/public/client-ip")).data,
    refetchInterval: 30000
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
        <Card className="p-4 text-sm text-slate-600 dark:text-slate-400">
          <div className="font-bold text-slate-900 dark:text-slate-100">Admin session</div>
          <div className="mt-1">Your current IP: <span className="font-semibold">{viewerIp?.ip ?? "Unavailable"}</span></div>
        </Card>
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
