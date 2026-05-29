import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ArrowRight, Bot, CheckCircle2, ClipboardList, Code2, Compass, Inbox, LayoutDashboard, MessageSquareText, Plug, Settings, Sparkles, Users, Zap } from "lucide-react";

import { api } from "../lib/api";

interface DashboardSummary {
  active_chats: number;
  agents_online: number;
  online_visitors: number;
  activity: Array<{ id: string; event: string; actor_email?: string | null; path?: string | null; created_at?: string | null }>;
}

const SETUP_STEPS = [
  { title: "Install the chat widget", description: "Copy the embed script and add chat to your site.", href: "/admin/install", icon: Code2 },
  { title: "Customize the widget", description: "Set branding, greetings, forms, surveys, languages, and inactivity messages.", href: "/admin/widget", icon: Settings },
  { title: "Invite your agents", description: "Add teammates, roles, skills, and concurrent chat limits.", href: "/admin/agents", icon: Users },
  { title: "Create canned responses", description: "Give agents shortcuts for common questions.", href: "/admin/canned", icon: ClipboardList },
  { title: "Set routing rules", description: "Send chats to the right team by load, skills, VIP status, or page.", href: "/admin/routing", icon: Zap },
  { title: "Connect channels", description: "Bring web chat, email, WhatsApp, SMS, and social messages together.", href: "/admin/channels", icon: Plug },
];

const PRODUCT_AREAS = [
  { n: "01", title: "Chat Widget", href: "/admin/widget", body: "Customer-facing launcher, pre-chat form, surveys, branding, languages, and availability.", icon: MessageSquareText },
  { n: "02", title: "Live Chat Inbox", href: "/inbox", body: "My chats, queued chats, sneak peek, chat feed, visitor profile, transfer, transcripts, files, voice/video.", icon: Inbox },
  { n: "03", title: "AI Copilot", href: "/admin/ai-knowledge", body: "Reply suggestions, text enhancement, chat summaries, sentiment, tag suggestions, and knowledge search.", icon: Sparkles },
  { n: "04", title: "Engage", href: "/engage/campaigns", body: "Targeted messages, eye-catchers, greetings, goals, traffic, and campaign conversion.", icon: Bot },
  { n: "05", title: "Reports", href: "/admin/analytics", body: "Dashboard, chat reports, agent reports, exports, CSAT, ecommerce, staffing, and traffic insights.", icon: LayoutDashboard },
  { n: "06", title: "Feature Hub", href: "/settings", body: "Search every feature by plain language and jump directly to the right screen.", icon: Compass },
];

export function WorkspaceHomePage(): JSX.Element {
  const { data } = useQuery({
    queryKey: ["dashboard", "home"],
    queryFn: async () => (await api.get<DashboardSummary>("/chats/dashboard")).data,
    refetchInterval: 15000,
  });

  return (
    <div className="min-h-full bg-navy-50/60 p-4 dark:bg-navy-950 sm:p-6">
      <section className="overflow-hidden rounded-3xl border border-navy-100 bg-white shadow-soft dark:border-navy-800 dark:bg-navy-900">
        <div className="bg-gradient-to-br from-navy-950 via-brand-700 to-cyan-600 px-6 py-8 text-white sm:px-8">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-black uppercase tracking-wide backdrop-blur">
                <Compass size={14} /> Workspace Home
              </div>
              <h1 className="font-display text-3xl font-black tracking-tight sm:text-4xl">Run support, sales, automation, and reports from one clear home.</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-white/80 sm:text-base">
                Start with the setup checklist, then use the product map to jump to the exact LiveChat-style area you need.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3 xl:w-[520px]">
              <Metric label="Active chats" value={data?.active_chats ?? "—"} />
              <Metric label="Online visitors" value={data?.online_visitors ?? "—"} />
              <Metric label="Agents online" value={data?.agents_online ?? "—"} />
            </div>
          </div>
        </div>

        <div className="grid gap-6 p-5 sm:p-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <main className="space-y-6">
            <section>
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-black text-navy-900 dark:text-white">Product map</h2>
                  <p className="mt-1 text-sm text-navy-400">Each card explains what lives inside that area, so users stop hunting through menus.</p>
                </div>
                <Link to="/settings" className="hidden rounded-xl border border-brand-100 bg-brand-50 px-3 py-2 text-sm font-black text-brand-700 hover:bg-brand-100 dark:border-brand-900/50 dark:bg-brand-950/30 dark:text-brand-300 sm:inline-flex">Open Feature Hub</Link>
              </div>
              <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
                {PRODUCT_AREAS.map((area) => {
                  const Icon = area.icon;
                  return (
                    <Link key={area.href} to={area.href} className="group rounded-2xl border border-navy-100 bg-white p-5 shadow-xs transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-soft dark:border-navy-800 dark:bg-navy-900 dark:hover:border-brand-900/70">
                      <div className="flex items-start justify-between gap-3">
                        <div className="grid h-11 w-11 place-items-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-950/40 dark:text-brand-300"><Icon size={20} /></div>
                        <span className="font-display text-2xl font-black text-navy-200 dark:text-navy-700">{area.n}</span>
                      </div>
                      <h3 className="mt-4 font-display text-lg font-black text-navy-900 dark:text-white">{area.title}</h3>
                      <p className="mt-2 min-h-20 text-sm leading-6 text-navy-500 dark:text-navy-400">{area.body}</p>
                      <div className="mt-4 flex items-center gap-2 text-sm font-black text-brand-600 group-hover:gap-3 dark:text-brand-300">Go there <ArrowRight size={15} /></div>
                    </Link>
                  );
                })}
              </div>
            </section>
          </main>

          <aside className="space-y-4">
            <div className="rounded-2xl border border-navy-100 bg-white p-5 shadow-xs dark:border-navy-800 dark:bg-navy-900">
              <h2 className="text-lg font-black text-navy-900 dark:text-white">Setup checklist</h2>
              <p className="mt-1 text-sm text-navy-400">The fastest path to a usable support workspace.</p>
              <div className="mt-4 space-y-2">
                {SETUP_STEPS.map((step) => {
                  const Icon = step.icon;
                  return (
                    <Link key={step.href} to={step.href} className="group flex gap-3 rounded-xl border border-transparent p-3 transition hover:border-brand-100 hover:bg-brand-50 dark:hover:border-brand-900/60 dark:hover:bg-brand-950/30">
                      <div className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-navy-50 text-navy-500 group-hover:bg-white group-hover:text-brand-600 dark:bg-navy-800 dark:text-navy-300"><Icon size={16} /></div>
                      <div>
                        <div className="text-sm font-black text-navy-800 dark:text-white">{step.title}</div>
                        <p className="mt-0.5 text-xs leading-5 text-navy-400">{step.description}</p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>

            <div className="rounded-2xl border border-navy-100 bg-white p-5 shadow-xs dark:border-navy-800 dark:bg-navy-900">
              <div className="mb-3 flex items-center gap-2 text-lg font-black text-navy-900 dark:text-white"><CheckCircle2 size={18} className="text-success-500" /> Recent activity</div>
              <div className="space-y-2">
                {(data?.activity ?? []).slice(0, 5).map((item) => (
                  <div key={item.id} className="rounded-xl bg-navy-50 p-3 dark:bg-navy-800/70">
                    <div className="text-sm font-bold text-navy-700 dark:text-navy-100">{item.event}</div>
                    <div className="mt-0.5 truncate text-xs text-navy-400">{item.actor_email || item.path || "System"}</div>
                  </div>
                ))}
                {!data?.activity?.length ? <p className="text-sm leading-6 text-navy-400">No recent activity yet. Install the widget and start a test chat.</p> : null}
              </div>
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }): JSX.Element {
  return (
    <div className="rounded-2xl bg-white/15 p-4 backdrop-blur">
      <div className="text-2xl font-black">{value}</div>
      <div className="mt-1 text-xs font-bold uppercase tracking-wide text-white/70">{label}</div>
    </div>
  );
}
