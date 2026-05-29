import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Compass, Search, Sparkles } from "lucide-react";

import { FEATURE_LINKS, searchFeatures, type FeatureLink } from "../lib/featureCatalog";
import { hasPermission, useMe } from "../lib/me";

const CATEGORY_ORDER: FeatureLink["category"][] = ["Conversations", "Widget", "Automation", "AI", "Reports", "Channels", "Team", "Security", "Developer", "Billing"];

const QUICK_START = [
  { title: "Install chat widget", href: "/admin/install", description: "Copy the script and put chat on a website." },
  { title: "Customize widget", href: "/admin/widget", description: "Branding, forms, surveys, languages, and inactivity message." },
  { title: "Invite agents", href: "/admin/agents", description: "Add teammates and configure chat limits." },
  { title: "Create canned replies", href: "/admin/canned", description: "Speed up answers with shortcuts and templates." },
  { title: "Set routing rules", href: "/admin/routing", description: "Auto-assign chats by team, skills, and workload." },
  { title: "Open reports", href: "/admin/analytics", description: "Track CSAT, response time, chat volume, and exports." },
];

export function SettingsOverviewPage(): JSX.Element {
  const me = useMe();
  const [query, setQuery] = useState("");
  const permissions = me.data?.permissions;
  const visibleFeatures = useMemo(
    () => searchFeatures(query).filter((feature) => !feature.permission || hasPermission(permissions, feature.permission)),
    [permissions, query],
  );
  const grouped = useMemo(() => {
    const groups = new Map<FeatureLink["category"], FeatureLink[]>();
    for (const category of CATEGORY_ORDER) groups.set(category, []);
    for (const feature of visibleFeatures) groups.get(feature.category)?.push(feature);
    return CATEGORY_ORDER.map((category) => ({ category, items: groups.get(category) ?? [] })).filter((group) => group.items.length > 0);
  }, [visibleFeatures]);

  return (
    <div className="min-h-full bg-navy-50/50 p-4 dark:bg-navy-950 sm:p-6">
      <section className="overflow-hidden rounded-3xl border border-navy-100 bg-white shadow-soft dark:border-navy-800 dark:bg-navy-900">
        <div className="bg-gradient-to-br from-brand-600 via-brand-500 to-cyan-500 px-6 py-8 text-white sm:px-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-black uppercase tracking-wide backdrop-blur">
                <Compass size={14} /> Feature Hub
              </div>
              <h1 className="font-display text-3xl font-black tracking-tight sm:text-4xl">Find every LiveChat-style feature from one place.</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-white/85 sm:text-base">
                Search by normal words like “sneak peek”, “transcript”, “chat limit”, “WhatsApp”, “AI summary”, or “routing”. Each card tells users exactly what the feature does and where to configure it.
              </p>
            </div>
            <div className="rounded-2xl bg-white/15 p-4 text-sm backdrop-blur lg:w-72">
              <div className="font-black">Workspace plan</div>
              <div className="mt-1 capitalize text-white/85">{me.data?.organization.plan ?? "loading"}</div>
              {me.data?.organization.trial_ends_at ? <div className="mt-2 text-xs text-white/75">Trial ends {new Date(me.data.organization.trial_ends_at).toLocaleDateString()}</div> : null}
            </div>
          </div>
        </div>

        <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="space-y-4">
            <div className="rounded-2xl border border-navy-100 bg-white p-4 shadow-xs dark:border-navy-800 dark:bg-navy-900">
              <label className="text-xs font-black uppercase tracking-wide text-navy-400">Search features</label>
              <div className="mt-2 flex items-center gap-2 rounded-xl border border-navy-100 bg-navy-50 px-3 py-2 dark:border-navy-700 dark:bg-navy-800">
                <Search size={16} className="text-navy-400" />
                <input
                  className="w-full bg-transparent text-sm font-semibold text-navy-800 outline-none placeholder:text-navy-400 dark:text-white"
                  placeholder="Try: transcript, routing, AI, widget..."
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </div>
            </div>

            <div className="rounded-2xl border border-navy-100 bg-white p-4 shadow-xs dark:border-navy-800 dark:bg-navy-900">
              <div className="mb-3 flex items-center gap-2 text-sm font-black text-navy-800 dark:text-white"><Sparkles size={16} className="text-brand-500" /> Quick setup</div>
              <div className="grid gap-2">
                {QUICK_START.map((item) => (
                  <Link key={item.href} to={item.href} className="rounded-xl border border-transparent p-3 transition hover:border-brand-100 hover:bg-brand-50 dark:hover:border-brand-900/60 dark:hover:bg-brand-950/30">
                    <div className="text-sm font-bold text-navy-700 dark:text-navy-100">{item.title}</div>
                    <p className="mt-0.5 text-xs leading-5 text-navy-400">{item.description}</p>
                  </Link>
                ))}
              </div>
            </div>
          </aside>

          <main className="space-y-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-black text-navy-900 dark:text-white">{query ? `Search results for “${query}”` : "All feature areas"}</h2>
                <p className="mt-1 text-sm text-navy-400">{visibleFeatures.length} visible features. Use ⌘K from anywhere for the same search.</p>
              </div>
              {query ? <button className="rounded-xl border border-navy-100 px-3 py-2 text-sm font-bold text-navy-500 hover:bg-navy-50 dark:border-navy-700 dark:hover:bg-navy-800" onClick={() => setQuery("")}>Clear</button> : null}
            </div>

            {grouped.map((group) => (
              <section key={group.category}>
                <h3 className="mb-3 text-xs font-black uppercase tracking-[0.18em] text-navy-400">{group.category}</h3>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {group.items.map((feature) => <FeatureCard key={feature.href} feature={feature} />)}
                </div>
              </section>
            ))}

            {!visibleFeatures.length ? (
              <div className="rounded-2xl border border-dashed border-navy-200 bg-white p-10 text-center dark:border-navy-700 dark:bg-navy-900">
                <div className="text-lg font-black text-navy-900 dark:text-white">No feature found</div>
                <p className="mt-2 text-sm text-navy-400">Try a broader search, for example “chat”, “AI”, “widget”, “report”, or “security”.</p>
              </div>
            ) : null}
          </main>
        </div>
      </section>
    </div>
  );
}

function FeatureCard({ feature }: { feature: FeatureLink }): JSX.Element {
  return (
    <Link
      to={feature.href}
      className="group flex min-h-[170px] flex-col rounded-2xl border border-navy-100 bg-white p-5 shadow-xs transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-soft dark:border-navy-800 dark:bg-navy-900 dark:hover:border-brand-900/70"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className="font-display text-base font-black text-navy-900 dark:text-white">{feature.title}</h4>
          <div className="mt-1 text-xs font-bold uppercase tracking-wide text-brand-500">{feature.category}</div>
        </div>
        {feature.status ? <span className="rounded-full bg-brand-50 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-brand-600 dark:bg-brand-950/40 dark:text-brand-300">{feature.status}</span> : null}
      </div>
      <p className="mt-3 flex-1 text-sm leading-6 text-navy-500 dark:text-navy-400">{feature.description}</p>
      <div className="mt-4 flex items-center gap-2 text-sm font-black text-brand-600 group-hover:gap-3 dark:text-brand-300">
        Open feature <ArrowRight size={15} />
      </div>
    </Link>
  );
}
