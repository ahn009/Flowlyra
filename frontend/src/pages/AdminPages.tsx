import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart3,
  Bot,
  CheckCircle2,
  Code2,
  CreditCard,
  LifeBuoy,
  MessageSquareText,
  Plus,
  Route,
  Sparkles,
  Users,
  Wand2,
} from "lucide-react";

import { PageHeader } from "../components/AgentLayout";
import { Button, Card, EmptyPanel, Field, MetricCard, PageShell, Pill, TextArea, TextInput } from "../components/ui";
import { api } from "../lib/api";
import type { User } from "../types";

interface TeamRow {
  id: string;
  name: string;
  description?: string | null;
  member_count?: number;
}

interface TriggerRow {
  id: string;
  name: string;
  status?: string;
  event?: string;
}

interface CannedRow {
  id: string;
  title: string;
  content: string;
  tags?: string[];
}

const fallbackTeams: TeamRow[] = [
  { id: "support", name: "Customer Support", description: "Handles product questions and escalations.", member_count: 8 },
  { id: "sales", name: "Sales", description: "Owns high-intent conversations and demos.", member_count: 5 },
  { id: "success", name: "Customer Success", description: "Keeps accounts healthy after handoff.", member_count: 4 },
];

const fallbackTriggers: TriggerRow[] = [
  { id: "pricing", name: "Pricing page assistance", status: "active", event: "Visitor is on pricing for 45s" },
  { id: "checkout", name: "Checkout rescue", status: "active", event: "Cart value exceeds $200" },
  { id: "returning", name: "Returning visitor greeting", status: "draft", event: "Visitor has 3+ sessions" },
];

const fallbackCanned: CannedRow[] = [
  { id: "refund", title: "Refund policy", content: "Our refund policy depends on plan and billing period.", tags: ["billing"] },
  { id: "demo", title: "Book a demo", content: "I can help you book a demo with our team.", tags: ["sales"] },
  { id: "handoff", title: "Escalate to specialist", content: "I am bringing in a teammate who specializes in this.", tags: ["support"] },
];

export function AgentsPage(): JSX.Element {
  const [inviteOpen, setInviteOpen] = useState(false);
  const { data = [], isLoading } = useQuery({
    queryKey: ["admin-agents"],
    queryFn: async () => (await api.get<User[]>("/agents")).data,
  });

  return (
    <PageShell>
      <PageHeader title="Agents" action={<Button variant="primary" leftIcon={<Plus size={16} />} onClick={() => setInviteOpen((value) => !value)}>Invite agent</Button>} />
      {inviteOpen && (
        <div className="border-b border-navy-100 bg-white p-4 dark:border-navy-700 dark:bg-navy-900">
          <Card className="grid gap-3 p-4 md:grid-cols-[1fr_1fr_auto]">
            <TextInput label="Email" placeholder="agent@company.com" />
            <TextInput label="Role" placeholder="Agent" />
            <Button className="self-end" variant="primary">Send invite</Button>
          </Card>
        </div>
      )}
      <div className="grid gap-4 p-4 sm:p-6">
        <div className="grid gap-4 md:grid-cols-3">
          <MetricCard label="Total agents" value={data.length} tone="blue" />
          <MetricCard label="Online now" value={data.filter((agent) => agent.status === "online").length} tone="green" />
          <MetricCard label="Invites pending" value="3" tone="yellow" />
        </div>
        <Card className="overflow-hidden">
          {isLoading ? (
            <div className="p-6 text-sm font-semibold text-navy-400">Loading agents...</div>
          ) : data.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="bg-navy-50 text-xs font-semibold uppercase tracking-wider text-navy-400 dark:bg-navy-800/60">
                  <tr>
                    <th className="px-5 py-3">Agent</th>
                    <th className="px-5 py-3">Email</th>
                    <th className="px-5 py-3">Role</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Chats</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-navy-100 dark:divide-navy-700">
                  {data.map((agent) => (
                    <tr key={agent.id} className="transition hover:bg-navy-50 dark:hover:bg-navy-800/60">
                      <td className="px-5 py-4 font-semibold text-navy-800 dark:text-navy-100">{agent.full_name || "Unnamed agent"}</td>
                      <td className="px-5 py-4 text-navy-500 dark:text-navy-400">{agent.email}</td>
                      <td className="px-5 py-4"><Pill>{agent.role || "agent"}</Pill></td>
                      <td className="px-5 py-4"><Pill tone={agent.status === "online" ? "green" : "slate"}>{agent.status || "offline"}</Pill></td>
                      <td className="px-5 py-4 text-navy-500 dark:text-navy-400">{(agent as User & { active_chats?: number }).active_chats ?? 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyPanel icon={<Users size={22} />} title="No agents yet" description="Invite teammates to start handling conversations together." />
          )}
        </Card>
      </div>
    </PageShell>
  );
}

export function TeamsPage(): JSX.Element {
  const { data } = useQuery({
    queryKey: ["admin-teams"],
    queryFn: async () => (await api.get<TeamRow[]>("/admin/teams")).data,
    retry: false,
  });
  const teams = data?.length ? data : fallbackTeams;

  return (
    <PageShell>
      <PageHeader title="Teams" action={<Button variant="primary" leftIcon={<Plus size={16} />}>Create team</Button>} />
      <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-6 xl:grid-cols-3">
        {teams.map((team) => (
          <Card key={team.id} hover className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-950/40 dark:text-brand-300"><Users size={20} /></div>
              <Pill tone="blue">{team.member_count ?? 0} members</Pill>
            </div>
            <h2 className="mt-4 font-display text-lg font-semibold text-navy-800 dark:text-white">{team.name}</h2>
            <p className="mt-1 min-h-10 text-sm leading-6 text-navy-400">{team.description || "Routing group for specialized conversations."}</p>
            <div className="mt-5 flex -space-x-2">
              {Array.from({ length: Math.min(team.member_count ?? 3, 5) }).map((_, index) => (
                <span key={index} className="grid h-8 w-8 place-items-center rounded-full border-2 border-white bg-navy-100 text-xs font-semibold text-navy-500 dark:border-navy-800 dark:bg-navy-700 dark:text-navy-200">{index + 1}</span>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </PageShell>
  );
}

export function AnalyticsPage(): JSX.Element {
  const bars = [
    { label: "Live chat", value: 78 },
    { label: "Email", value: 52 },
    { label: "Widget bot", value: 64 },
    { label: "Social", value: 38 },
  ];

  return (
    <PageShell>
      <PageHeader title="Reports" action={<Button variant="secondary">Export</Button>} />
      <div className="grid gap-4 p-4 sm:p-6">
        <div className="grid gap-4 md:grid-cols-4">
          <MetricCard label="Conversations" value="2,418" tone="blue" />
          <MetricCard label="CSAT" value="94%" tone="green" />
          <MetricCard label="First response" value="42s" tone="yellow" />
          <MetricCard label="Resolution" value="7m" tone="slate" />
        </div>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
          <Card className="p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold text-navy-800 dark:text-white">Conversation volume</h2>
              <Pill>Last 30 days</Pill>
            </div>
            <div className="mt-6 grid h-64 grid-cols-12 items-end gap-2">
              {Array.from({ length: 12 }).map((_, index) => (
                <div key={index} className="rounded-t-md bg-brand-500/85" style={{ height: `${28 + ((index * 17) % 58)}%` }} />
              ))}
            </div>
          </Card>
          <Card className="p-5">
            <h2 className="font-display text-lg font-semibold text-navy-800 dark:text-white">Channels</h2>
            <div className="mt-5 grid gap-4">
              {bars.map((bar) => (
                <div key={bar.label}>
                  <div className="mb-1 flex justify-between text-sm font-medium text-navy-500"><span>{bar.label}</span><span>{bar.value}%</span></div>
                  <div className="h-2 overflow-hidden rounded-full bg-navy-100 dark:bg-navy-700"><div className="h-full rounded-full bg-brand-500" style={{ width: `${bar.value}%` }} /></div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </PageShell>
  );
}

export function BillingPage(): JSX.Element {
  const plans = ["Starter", "Team", "Business", "Enterprise"];
  return (
    <PageShell>
      <PageHeader title="Billing" action={<Button variant="primary" leftIcon={<CreditCard size={16} />}>Update payment</Button>} />
      <div className="grid gap-4 p-4 sm:p-6">
        <Card className="p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <Pill tone="blue">Current plan</Pill>
              <h2 className="mt-3 font-display text-2xl font-semibold text-navy-800 dark:text-white">Team</h2>
              <p className="mt-1 text-sm text-navy-400">$39 per agent/month, billed monthly.</p>
            </div>
            <Button variant="secondary">Manage subscription</Button>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <Usage label="Seats" value={62} />
            <Usage label="Chatbot resolutions" value={44} />
            <Usage label="Storage" value={28} />
          </div>
        </Card>
        <div className="grid gap-4 md:grid-cols-4">
          {plans.map((plan, index) => (
            <Card key={plan} className={`p-5 ${plan === "Team" ? "border-brand-300 ring-2 ring-brand-100 dark:ring-brand-900/40" : ""}`}>
              <h3 className="font-display text-lg font-semibold text-navy-800 dark:text-white">{plan}</h3>
              <div className="mt-3 text-3xl font-bold text-navy-900 dark:text-white">{index === 3 ? "Custom" : `$${[19, 39, 59][index]}`}</div>
              <p className="mt-1 text-sm text-navy-400">{index === 3 ? "For advanced security and scale." : "per agent/month"}</p>
              <Button className="mt-5 w-full" variant={plan === "Team" ? "primary" : "secondary"}>{plan === "Team" ? "Current" : "Choose"}</Button>
            </Card>
          ))}
        </div>
      </div>
    </PageShell>
  );
}

export function WidgetConfigPage(): JSX.Element {
  const [brand, setBrand] = useState("#FF5100");
  return (
    <PageShell>
      <PageHeader title="Widget settings" action={<Button variant="primary">Publish changes</Button>} />
      <div className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_380px] lg:p-6">
        <Card className="p-5">
          <div className="mb-5 flex flex-wrap gap-2 border-b border-navy-100 pb-4 dark:border-navy-700">
            {["Appearance", "Behavior", "Pre-chat", "Post-chat", "Advanced"].map((tab, index) => <Pill key={tab} tone={index === 0 ? "blue" : "slate"}>{tab}</Pill>)}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextInput label="Widget title" defaultValue="Chat with us" />
            <TextInput label="Subtitle" defaultValue="We usually reply in a few minutes" />
            <Field label="Brand color">
              <input className="h-10 w-full rounded-md border border-navy-100 bg-white px-3 dark:border-navy-700 dark:bg-navy-900" value={brand} onChange={(event) => setBrand(event.target.value)} />
            </Field>
            <Field label="Position">
              <select className="h-10 rounded-md border border-navy-100 bg-white px-3 text-sm dark:border-navy-700 dark:bg-navy-900"><option>Bottom right</option><option>Bottom left</option></select>
            </Field>
          </div>
        </Card>
        <Card className="p-5">
          <div className="mx-auto max-w-[280px] rounded-[2rem] border border-navy-100 bg-navy-900 p-3 shadow-lift dark:border-navy-700">
            <div className="overflow-hidden rounded-2xl bg-white dark:bg-navy-950">
              <div className="p-4 text-white" style={{ backgroundColor: brand }}>
                <div className="font-semibold">Chat with us</div>
                <div className="text-xs opacity-90">Online now</div>
              </div>
              <div className="space-y-3 p-4">
                <div className="rounded-2xl rounded-tl-md border border-navy-100 p-3 text-sm dark:border-navy-700">Hi, how can we help?</div>
                <div className="ml-auto rounded-2xl rounded-tr-md p-3 text-sm text-white" style={{ backgroundColor: brand }}>I need pricing help.</div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </PageShell>
  );
}

export function InstallPage(): JSX.Element {
  const snippet = `<script src="https://cdn.flowlyra.com/widget.js" data-workspace="YOUR_WORKSPACE_ID" async></script>`;
  return (
    <PageShell>
      <PageHeader title="Install widget" action={<Button variant="secondary" leftIcon={<Code2 size={16} />}>Copy code</Button>} />
      <div className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_340px] lg:p-6">
        <Card className="p-5">
          <h2 className="font-display text-lg font-semibold text-navy-800 dark:text-white">Website snippet</h2>
          <pre className="mt-4 overflow-x-auto rounded-lg bg-navy-900 p-4 text-sm text-brand-100"><code>{snippet}</code></pre>
          <p className="mt-3 text-sm leading-6 text-navy-400">Place this before the closing body tag on every page where chat should appear.</p>
        </Card>
        <Card className="p-5">
          <h2 className="font-display text-lg font-semibold text-navy-800 dark:text-white">Checklist</h2>
          <div className="mt-4 grid gap-3">
            {["Snippet installed", "Domain allowed", "Widget published"].map((item) => <div key={item} className="flex items-center gap-2 text-sm text-navy-500"><CheckCircle2 size={16} className="text-success-600" />{item}</div>)}
          </div>
        </Card>
      </div>
    </PageShell>
  );
}

export function RoutingRulesPage(): JSX.Element {
  const rules = ["VIP customers to Success", "Billing questions to Finance", "Spanish chats to LATAM team"];
  return (
    <PageShell>
      <PageHeader title="Routing rules" action={<Button variant="primary" leftIcon={<Plus size={16} />}>New rule</Button>} />
      <div className="p-4 sm:p-6">
        <Card className="overflow-hidden">
          <div className="divide-y divide-navy-100 dark:divide-navy-700">
            {rules.map((rule, index) => (
              <div key={rule} className="flex flex-col gap-3 p-5 transition hover:bg-navy-50 dark:hover:bg-navy-800/60 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-950/40"><Route size={18} /></div>
                  <div><div className="font-semibold text-navy-800 dark:text-white">{rule}</div><div className="text-sm text-navy-400">Priority {index + 1} with fallback assignment.</div></div>
                </div>
                <Pill tone={index === 0 ? "green" : "slate"}>{index === 0 ? "active" : "enabled"}</Pill>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </PageShell>
  );
}

export function TriggersPage(): JSX.Element {
  const { data } = useQuery({
    queryKey: ["admin-triggers"],
    queryFn: async () => (await api.get<TriggerRow[]>("/admin/triggers")).data,
    retry: false,
  });
  const rows = data?.length ? data : fallbackTriggers;

  return (
    <PageShell>
      <PageHeader title="Triggers" action={<Button variant="primary" leftIcon={<Wand2 size={16} />}>Create trigger</Button>} />
      <div className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_360px] lg:p-6">
        <Card className="overflow-hidden">
          <div className="divide-y divide-navy-100 dark:divide-navy-700">
            {rows.map((trigger) => (
              <div key={trigger.id} className="p-5 transition hover:bg-navy-50 dark:hover:bg-navy-800/60">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="font-semibold text-navy-800 dark:text-white">{trigger.name}</h2>
                  <Pill tone={trigger.status === "active" ? "green" : "yellow"}>{trigger.status || "draft"}</Pill>
                </div>
                <p className="mt-1 text-sm text-navy-400">{trigger.event || "Visitor matches configured AND/OR rules."}</p>
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-5">
          <h2 className="font-display text-lg font-semibold text-navy-800 dark:text-white">Rule builder</h2>
          <div className="mt-4 grid gap-3">
            <TextInput label="Trigger name" placeholder="High intent visitor" />
            <TextInput label="Condition" placeholder="Page contains /pricing" />
            <TextArea label="Message" placeholder="Need help choosing a plan?" />
            <Button variant="primary">Save trigger</Button>
          </div>
        </Card>
      </div>
    </PageShell>
  );
}

export function CannedResponsesPage(): JSX.Element {
  const { data } = useQuery({
    queryKey: ["admin-canned"],
    queryFn: async () => (await api.get<CannedRow[]>("/admin/canned-responses")).data,
    retry: false,
  });
  const rows = data?.length ? data : fallbackCanned;

  return (
    <PageShell>
      <PageHeader title="Canned responses" action={<Button variant="primary" leftIcon={<Plus size={16} />}>New response</Button>} />
      <div className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_360px] lg:p-6">
        <Card className="overflow-hidden">
          <div className="divide-y divide-navy-100 dark:divide-navy-700">
            {rows.map((row) => (
              <div key={row.id} className="p-5 transition hover:bg-navy-50 dark:hover:bg-navy-800/60">
                <h2 className="font-semibold text-navy-800 dark:text-white">{row.title}</h2>
                <p className="mt-1 text-sm leading-6 text-navy-400">{row.content}</p>
                <div className="mt-3 flex flex-wrap gap-2">{(row.tags ?? []).map((tag) => <Pill key={tag}>{tag}</Pill>)}</div>
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-5">
          <h2 className="font-display text-lg font-semibold text-navy-800 dark:text-white">Compose</h2>
          <div className="mt-4 grid gap-3">
            <TextInput label="Title" placeholder="Response title" />
            <TextArea label="Message" placeholder="Write the reusable response..." />
            <Button variant="primary">Save response</Button>
          </div>
        </Card>
      </div>
    </PageShell>
  );
}

function Usage({ label, value }: { label: string; value: number }): JSX.Element {
  return (
    <div>
      <div className="mb-1 flex justify-between text-sm font-medium text-navy-500"><span>{label}</span><span>{value}%</span></div>
      <div className="h-2 overflow-hidden rounded-full bg-navy-100 dark:bg-navy-700"><div className="h-full rounded-full bg-brand-500" style={{ width: `${value}%` }} /></div>
    </div>
  );
}
