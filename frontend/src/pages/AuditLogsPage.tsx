import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { api } from "../lib/api";
import { useMe, hasPermission } from "../lib/me";

interface AuditRow {
  id: string;
  event: string;
  actor_email: string | null;
  ip_address: string | null;
  method: string | null;
  path: string | null;
  status_code: number | null;
  target_type: string | null;
  target_id: string | null;
  request_id: string | null;
  details: Record<string, unknown>;
  created_at: string | null;
}

export function AuditLogsPage(): JSX.Element {
  const me = useMe();
  const [eventFilter, setEventFilter] = useState("");
  const canRead = hasPermission(me.data?.permissions, "audit.read");
  const canExport = hasPermission(me.data?.permissions, "audit.export");

  const { data, isLoading, error } = useQuery({
    queryKey: ["audit", eventFilter],
    queryFn: async () => {
      const params: Record<string, string | number> = { limit: 100 };
      if (eventFilter) params.event = eventFilter;
      return (await api.get<{ items: AuditRow[] }>("/audit", { params })).data;
    },
    enabled: canRead
  });

  if (!me.data) return <div className="p-6 text-sm text-slate-500">Loading…</div>;
  if (!canRead) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-bold">Audit log</h1>
        <p className="mt-2 text-sm text-slate-500">You don't have permission to view the audit log.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Audit log</h1>
          <p className="text-sm text-slate-500">All mutating actions on this workspace.</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            value={eventFilter}
            onChange={(e) => setEventFilter(e.target.value)}
            placeholder="filter by event (e.g. http.post)"
            className="rounded-md border border-slate-200 px-3 py-1.5 text-sm"
          />
          {canExport && (
            <a
              href={`${api.defaults.baseURL ?? ""}/audit/export.csv`}
              className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white"
            >
              Export CSV
            </a>
          )}
        </div>
      </header>

      {isLoading && <p className="text-sm text-slate-500">Loading audit entries…</p>}
      {error && <p className="text-sm text-red-600">Failed to load audit log.</p>}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">When</th>
              <th className="px-4 py-3">Event</th>
              <th className="px-4 py-3">Actor</th>
              <th className="px-4 py-3">Method / Path</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">IP</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {(data?.items ?? []).map((row) => (
              <tr key={row.id} className="hover:bg-slate-50">
                <td className="px-4 py-2 text-xs text-slate-500">{row.created_at ? new Date(row.created_at).toLocaleString() : ""}</td>
                <td className="px-4 py-2 font-mono text-xs text-slate-700">{row.event}</td>
                <td className="px-4 py-2">{row.actor_email ?? "—"}</td>
                <td className="px-4 py-2 font-mono text-xs text-slate-600">
                  {row.method ? `${row.method} ${row.path ?? ""}` : "—"}
                </td>
                <td className="px-4 py-2">{row.status_code ?? "—"}</td>
                <td className="px-4 py-2 font-mono text-xs text-slate-500">{row.ip_address ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {(data?.items ?? []).length === 0 && !isLoading && (
          <p className="px-4 py-6 text-center text-sm text-slate-400">No audit entries yet.</p>
        )}
      </div>
    </div>
  );
}
