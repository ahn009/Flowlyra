import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

const apiBase = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000/api/v1";
const origin = apiBase.replace(/\/api\/v1\/?$/, "");

export function ApiDocsPage(): JSX.Element {
  return (
    <div className="min-h-screen premium-surface p-6 text-navy-700 dark:text-navy-100">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-lg border border-navy-100 bg-white p-6 shadow-soft dark:border-navy-700 dark:bg-navy-900">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-600 dark:text-brand-300">Developer portal</p>
          <h1 className="mt-2 font-display text-3xl font-bold">FlowLyra API docs</h1>
          <p className="mt-2 text-sm text-navy-500">REST reference, webhook events, SDK quickstarts, and integration guides.</p>
          <div className="mt-4 flex flex-wrap gap-3 text-sm">
            <a href={`${origin}/openapi.json`} target="_blank" rel="noreferrer" className="rounded-md bg-brand-500 px-3 py-2 font-medium text-white shadow-sm hover:bg-brand-600">OpenAPI JSON</a>
            <a href={`${origin}/docs`} target="_blank" rel="noreferrer" className="rounded-md border border-navy-200 px-3 py-2 font-medium hover:bg-navy-50 dark:border-navy-700 dark:hover:bg-navy-800">Swagger UI</a>
            <Link to="/api-changelog" className="rounded-md border border-navy-200 px-3 py-2 font-medium hover:bg-navy-50 dark:border-navy-700 dark:hover:bg-navy-800">API changelog</Link>
            <Link to="/api-status" className="rounded-md border border-navy-200 px-3 py-2 font-medium hover:bg-navy-50 dark:border-navy-700 dark:hover:bg-navy-800">API status</Link>
          </div>
        </header>
        <section className="overflow-hidden rounded-lg border border-navy-100 bg-white shadow-soft dark:border-navy-700 dark:bg-navy-900">
          <iframe title="FlowLyra Redoc" src={`${origin}/redoc`} className="h-[80vh] w-full" />
        </section>
      </div>
    </div>
  );
}

export function ApiChangelogPage(): JSX.Element {
  const data = {
    items: [
      { version: "2026-05-18", title: "Phase 9 API platform", changes: ["API keys", "webhooks replay/test", "SDKs", "platform REST"] },
      { version: "2026-05-17", title: "Phase 8 reports", changes: ["scheduled reports", "CSV/PDF/XLSX exports", "custom reports"] },
    ],
  } as { items: Array<{ version: string; title: string; changes: string[] }> };

  return (
    <div className="min-h-screen premium-surface p-6 text-navy-700 dark:text-navy-100">
      <div className="mx-auto max-w-4xl space-y-4">
        <h1 className="font-display text-3xl font-bold">API changelog</h1>
        {(data?.items ?? []).map((row) => (
          <article key={row.version} className="rounded-lg border border-navy-100 bg-white p-5 shadow-xs dark:border-navy-700 dark:bg-navy-900">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-600 dark:text-brand-300">{row.version}</p>
            <h2 className="mt-1 text-xl font-bold">{row.title}</h2>
            <ul className="mt-2 list-disc pl-5 text-sm text-navy-500">
              {row.changes.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </article>
        ))}
      </div>
    </div>
  );
}

export function ApiStatusPage(): JSX.Element {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["api-status-public"],
    queryFn: async () => {
      const response = await fetch(`${origin}/healthz`);
      const payload = await response.json();
      return {
        ok: Boolean(payload?.ok),
        checks: (payload?.checks || {}) as Record<string, string>,
        timestamp: new Date().toISOString(),
      } as { ok: boolean; checks: Record<string, string>; timestamp: string };
    },
    refetchInterval: 30000,
  });

  return (
    <div className="min-h-screen premium-surface p-6 text-navy-700 dark:text-navy-100">
      <div className="mx-auto max-w-3xl space-y-5">
        <header className="rounded-lg border border-navy-100 bg-white p-6 shadow-soft dark:border-navy-700 dark:bg-navy-900">
          <h1 className="font-display text-3xl font-bold">API status</h1>
          <p className="mt-2 text-sm text-navy-500">Live health checks for database and Redis dependencies.</p>
          <button onClick={() => void refetch()} className="mt-3 rounded-md border border-navy-200 px-3 py-2 text-sm font-medium hover:bg-navy-50 dark:border-navy-700 dark:hover:bg-navy-800">Refresh</button>
        </header>
        <section className="rounded-lg border border-navy-100 bg-white p-6 shadow-xs dark:border-navy-700 dark:bg-navy-900">
          {isLoading ? <p className="text-sm text-navy-400">Loading...</p> : null}
          {data ? (
            <>
              <p className={`text-sm font-semibold ${data.ok ? "text-emerald-700" : "text-red-700"}`}>{data.ok ? "Operational" : "Degraded"}</p>
              <ul className="mt-2 space-y-1 text-sm text-navy-500">
                {Object.entries(data.checks || {}).map(([key, value]) => <li key={key}>{key}: {value}</li>)}
              </ul>
              <p className="mt-3 text-xs text-navy-400">Updated {new Date(data.timestamp).toLocaleString()}</p>
            </>
          ) : null}
        </section>
      </div>
    </div>
  );
}
