import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { api } from "../lib/api";
import { useMe } from "../lib/me";

interface ApiKey {
  id: string;
  name: string;
  key_prefix: string;
  scopes: string[];
  is_active: boolean;
  created_at: string | null;
  last_used_at: string | null;
}

interface ScopesResponse {
  scopes: string[];
}

const WEBHOOK_EVENTS = [
  "chat.started",
  "chat.ended",
  "chat.message.created",
  "chat.assigned",
  "ticket.created",
  "ticket.updated",
  "ticket.closed",
  "contact.created",
  "contact.updated",
  "integration.installed",
  "integration.uninstalled",
  "integration.error",
  "goal.achieved",
];

export function DeveloperPortalPage(): JSX.Element {
  const me = useMe();
  const apiBase = `${window.location.origin}/api/v1`;
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const keysQuery = useQuery({
    queryKey: ["api-keys"],
    queryFn: async () => (await api.get<{ items: ApiKey[] }>("/api-keys")).data,
    enabled: Boolean(me.data),
  });

  const scopesQuery = useQuery({
    queryKey: ["api-key-scopes"],
    queryFn: async () => (await api.get<ScopesResponse>("/api-keys/scopes")).data,
    enabled: Boolean(me.data),
  });

  const activeKeys = (keysQuery.data?.items ?? []).filter((k) => k.is_active);
  const firstKey = activeKeys[0];

  const curlExample = `curl -H "Authorization: Bearer ${firstKey?.key_prefix ?? "fl_xxx"}..." \\
  ${apiBase}/chats`;

  const pythonExample = `import httpx

token = "${firstKey?.key_prefix ?? "fl_xxx"}..."
resp = httpx.get(
    "${apiBase}/chats",
    headers={"Authorization": f"Bearer {token}"},
)
print(resp.json())`;

  const nodeExample = `const resp = await fetch("${apiBase}/chats", {
  headers: { Authorization: "Bearer ${firstKey?.key_prefix ?? "fl_xxx"}..." },
});
const data = await resp.json();`;

  function copyToClipboard(text: string, key: string): void {
    void navigator.clipboard.writeText(text).then(() => {
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    });
  }

  if (!me.data) return <div className="p-6 text-sm text-navy-400">Loading…</div>;

  return (
    <div className="space-y-8 p-6">
      <header>
        <h1 className="text-2xl font-bold">Developer Portal</h1>
        <p className="text-sm text-navy-400">API reference, keys, webhooks, and quick-start guides.</p>
      </header>

      <section className="rounded-xl border border-navy-100 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-base font-semibold">API Base URL</h2>
        <div className="flex items-center gap-3">
          <code className="flex-1 rounded-md bg-navy-50 px-3 py-2 text-sm font-mono">{apiBase}</code>
          <button
            onClick={() => copyToClipboard(apiBase, "base")}
            className="rounded-md border border-navy-200 px-3 py-2 text-xs font-semibold"
          >
            {copiedKey === "base" ? "Copied!" : "Copy"}
          </button>
        </div>
        <div className="mt-3 flex gap-3">
          <a
            href="/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md bg-navy-900 px-4 py-2 text-sm font-semibold text-white"
          >
            Swagger UI →
          </a>
          <a
            href="/redoc"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md border border-navy-200 px-4 py-2 text-sm font-semibold"
          >
            ReDoc →
          </a>
        </div>
      </section>

      <section className="rounded-xl border border-navy-100 bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold">Your API Keys</h2>
          <a href="/settings/api" className="text-xs font-semibold text-navy-600 underline">
            Manage keys →
          </a>
        </div>
        {keysQuery.isLoading && <p className="text-sm text-navy-400">Loading…</p>}
        {activeKeys.length === 0 && !keysQuery.isLoading && (
          <p className="text-sm text-navy-400">No active API keys. <a href="/settings/api" className="underline">Create one</a>.</p>
        )}
        <div className="space-y-2">
          {activeKeys.map((key) => (
            <div key={key.id} className="flex items-center justify-between rounded-md border border-navy-100 px-3 py-2 text-sm">
              <div>
                <span className="font-semibold">{key.name}</span>
                <span className="ml-2 font-mono text-xs text-navy-400">{key.key_prefix}…</span>
              </div>
              <div className="flex gap-1 text-xs text-navy-400">
                {key.scopes.slice(0, 3).map((s) => (
                  <span key={s} className="rounded bg-navy-50 px-1.5 py-0.5">{s}</span>
                ))}
                {key.scopes.length > 3 && <span className="rounded bg-navy-50 px-1.5 py-0.5">+{key.scopes.length - 3}</span>}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-navy-100 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-base font-semibold">Quick Start</h2>
        {[
          { label: "cURL", id: "curl", code: curlExample },
          { label: "Python", id: "python", code: pythonExample },
          { label: "Node.js", id: "node", code: nodeExample },
        ].map(({ label, id, code }) => (
          <div key={id} className="mb-4">
            <div className="mb-1 flex items-center justify-between">
              <span className="text-xs font-semibold text-navy-500">{label}</span>
              <button
                onClick={() => copyToClipboard(code, id)}
                className="text-xs font-semibold text-navy-400"
              >
                {copiedKey === id ? "Copied!" : "Copy"}
              </button>
            </div>
            <pre className="overflow-x-auto rounded-md bg-navy-950 p-3 text-xs text-green-300">{code}</pre>
          </div>
        ))}
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-xl border border-navy-100 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-base font-semibold">Available Scopes</h2>
          {scopesQuery.isLoading && <p className="text-sm text-navy-400">Loading…</p>}
          <div className="flex flex-wrap gap-1.5">
            {(scopesQuery.data?.scopes ?? []).map((scope) => (
              <span key={scope} className="rounded-full bg-navy-100 px-2.5 py-0.5 text-xs font-medium text-navy-700">
                {scope}
              </span>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-navy-100 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-base font-semibold">Webhook Events</h2>
          <div className="flex flex-wrap gap-1.5">
            {WEBHOOK_EVENTS.map((event) => (
              <span key={event} className="rounded-full bg-navy-100 px-2.5 py-0.5 text-xs font-medium text-navy-700">
                {event}
              </span>
            ))}
          </div>
          <p className="mt-3 text-xs text-navy-400">
            Subscribe to events at <a href="/settings/webhooks" className="underline">Settings → Webhooks</a>.
          </p>
        </section>
      </div>

      <section className="rounded-xl border border-navy-100 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-base font-semibold">Rate Limits</h2>
        <div className="space-y-2 text-sm text-navy-600">
          <p>Rate limits are enforced per API key. Headers returned on every response:</p>
          <ul className="ml-4 list-disc space-y-1 text-xs">
            <li><code className="font-mono">X-RateLimit-Limit</code> — requests allowed per window</li>
            <li><code className="font-mono">X-RateLimit-Remaining</code> — requests left in current window</li>
            <li><code className="font-mono">X-RateLimit-Reset</code> — Unix timestamp when window resets</li>
          </ul>
          <p className="text-xs">Exceeding the limit returns <code className="font-mono">429 Too Many Requests</code>. Contact support to increase limits.</p>
        </div>
      </section>
    </div>
  );
}
