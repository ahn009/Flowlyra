import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

const apiBase = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000/api/v1";
const origin = apiBase.replace(/\/api\/v1\/?$/, "");

export function ApiDocsPage(): JSX.Element {
  return (
    <div className="min-h-screen bg-slate-50 p-6 text-slate-900">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-2xl bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Developer portal</p>
          <h1 className="mt-2 text-3xl font-black">FlowLyra API docs</h1>
          <p className="mt-2 text-sm text-slate-600">REST reference, webhook events, SDK quickstarts, and integration guides.</p>
          <div className="mt-4 flex flex-wrap gap-3 text-sm">
            <a href={`${origin}/openapi.json`} target="_blank" rel="noreferrer" className="rounded-md bg-slate-900 px-3 py-2 font-semibold text-white">OpenAPI JSON</a>
            <a href={`${origin}/docs`} target="_blank" rel="noreferrer" className="rounded-md border border-slate-300 px-3 py-2 font-semibold">Swagger UI</a>
            <Link to="/api-changelog" className="rounded-md border border-slate-300 px-3 py-2 font-semibold">API changelog</Link>
            <Link to="/api-status" className="rounded-md border border-slate-300 px-3 py-2 font-semibold">API status</Link>
          </div>
        </header>
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
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
    <div className="min-h-screen bg-slate-50 p-6 text-slate-900">
      <div className="mx-auto max-w-4xl space-y-4">
        <h1 className="text-3xl font-black">API changelog</h1>
        {(data?.items ?? []).map((row) => (
          <article key={row.version} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">{row.version}</p>
            <h2 className="mt-1 text-xl font-bold">{row.title}</h2>
            <ul className="mt-2 list-disc pl-5 text-sm text-slate-600">
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
    <div className="min-h-screen bg-slate-50 p-6 text-slate-900">
      <div className="mx-auto max-w-3xl space-y-5">
        <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-3xl font-black">API status</h1>
          <p className="mt-2 text-sm text-slate-600">Live health checks for database and Redis dependencies.</p>
          <button onClick={() => void refetch()} className="mt-3 rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold">Refresh</button>
        </header>
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          {isLoading ? <p className="text-sm text-slate-500">Loading…</p> : null}
          {data ? (
            <>
              <p className={`text-sm font-semibold ${data.ok ? "text-emerald-700" : "text-red-700"}`}>{data.ok ? "Operational" : "Degraded"}</p>
              <ul className="mt-2 space-y-1 text-sm text-slate-600">
                {Object.entries(data.checks || {}).map(([key, value]) => <li key={key}>{key}: {value}</li>)}
              </ul>
              <p className="mt-3 text-xs text-slate-400">Updated {new Date(data.timestamp).toLocaleString()}</p>
            </>
          ) : null}
        </section>
      </div>
    </div>
  );
}
