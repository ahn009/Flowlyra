import { Link } from "react-router-dom";

import { hasPermission, useMe } from "../lib/me";

interface Card {
  title: string;
  description: string;
  href: string;
  permission?: string;
}

const CARDS: Card[] = [
  { title: "Widget", description: "Brand, position, theme, pre/post-chat forms.", href: "/admin/widget", permission: "widget.write" },
  { title: "Install", description: "Embed code & install snippets.", href: "/admin/install" },
  { title: "Team", description: "Manage agents, invitations & roles.", href: "/admin/agents", permission: "agents.read" },
  { title: "Teams", description: "Groups / departments.", href: "/admin/teams", permission: "teams.read" },
  { title: "Canned responses", description: "Reusable replies and shortcuts.", href: "/admin/canned", permission: "canned.write" },
  { title: "Tags", description: "Tag colors and chat tag library.", href: "/settings/tags", permission: "tags.write" },
  { title: "Routing rules", description: "Auto-assign chats to teams or agents.", href: "/admin/routing", permission: "routing.write" },
  { title: "Triggers", description: "Proactive engagement & campaigns.", href: "/admin/triggers", permission: "triggers.write" },
  { title: "Analytics", description: "Dashboards & reports.", href: "/admin/analytics", permission: "reports.read" },
  { title: "Webhooks", description: "Receive real-time events into your own services.", href: "/settings/webhooks", permission: "webhooks.write" },
  { title: "API keys", description: "Scoped credentials for public REST and server integrations.", href: "/settings/api", permission: "api_keys.write" },
  { title: "Integrations", description: "Install connectors, OAuth links, health checks, and logs.", href: "/settings/integrations", permission: "integrations.read" },
  { title: "Notifications", description: "Per-user delivery preferences.", href: "/settings/notifications" },
  { title: "Audit log", description: "Every action taken on your workspace.", href: "/settings/audit", permission: "audit.read" },
  { title: "Billing", description: "Plan, seats, invoices.", href: "/admin/billing", permission: "billing.read" }
];

export function SettingsOverviewPage(): JSX.Element {
  const me = useMe();
  const visible = CARDS.filter((c) => !c.permission || hasPermission(me.data?.permissions, c.permission));

  return (
    <div className="space-y-6 p-6">
      <header>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-slate-500">
          Plan: <span className="font-semibold capitalize">{me.data?.organization.plan ?? "—"}</span>
          {me.data?.organization.trial_ends_at ? ` · trial ends ${new Date(me.data.organization.trial_ends_at).toLocaleDateString()}` : null}
        </p>
      </header>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((card) => (
          <Link
            key={card.href}
            to={card.href}
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md"
          >
            <h2 className="font-semibold">{card.title}</h2>
            <p className="mt-1 text-sm text-slate-500">{card.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
