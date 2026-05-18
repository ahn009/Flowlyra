import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import { api } from "../lib/api";
import { hasPermission, useMe } from "../lib/me";

interface CatalogItem {
  provider: string;
  name: string;
  category: string;
  install_type: string;
  priority: string;
  capabilities: string[];
}

interface IntegrationRow {
  id: string;
  provider: string;
  display_name: string;
  category: string;
  install_type: string;
  status: string;
  is_active: boolean;
  health_status: string;
  failure_streak: number;
  capabilities: string[];
  config: Record<string, unknown>;
  last_sync_at: string | null;
  last_success_at: string | null;
  last_error_at: string | null;
  last_error_message: string | null;
}

interface IntegrationLog {
  id: string;
  level: string;
  event: string;
  message: string;
  status_code: number | null;
  payload: Record<string, unknown>;
  created_at: string | null;
}

export function IntegrationsMarketplacePage(): JSX.Element {
  const me = useMe();
  const queryClient = useQueryClient();
  const canRead = hasPermission(me.data?.permissions, "integrations.read") || hasPermission(me.data?.permissions, "integrations.write");
  const canWrite = hasPermission(me.data?.permissions, "integrations.write");

  const [category, setCategory] = useState<string>("all");
  const [query, setQuery] = useState<string>("");
  const [selectedIntegrationId, setSelectedIntegrationId] = useState<string | null>(null);

  const catalog = useQuery({
    queryKey: ["integrations-catalog"],
    queryFn: async () => (await api.get<{ items: CatalogItem[] }>("/integrations/catalog")).data,
    enabled: canRead,
  });

  const installed = useQuery({
    queryKey: ["integrations-installed"],
    queryFn: async () => (await api.get<IntegrationRow[]>("/integrations")).data,
    enabled: canRead,
  });

  const logs = useQuery({
    queryKey: ["integration-logs", selectedIntegrationId],
    queryFn: async () => (await api.get<{ items: IntegrationLog[] }>(`/integrations/${selectedIntegrationId}/logs`)).data,
    enabled: canRead && Boolean(selectedIntegrationId),
  });

  const installMutation = useMutation({
    mutationFn: async (provider: string) => (await api.post<IntegrationRow>("/integrations", { provider, config: {} })).data,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["integrations-installed"] });
      void queryClient.invalidateQueries({ queryKey: ["integrations-health"] });
    },
  });

  const uninstallMutation = useMutation({
    mutationFn: async (id: string) => api.delete(`/integrations/${id}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["integrations-installed"] });
      void queryClient.invalidateQueries({ queryKey: ["integrations-health"] });
    },
  });

  const testMutation = useMutation({
    mutationFn: async (id: string) => api.post(`/integrations/${id}/test`),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["integrations-installed"] }),
  });

  const syncMutation = useMutation({
    mutationFn: async (id: string) => api.post(`/integrations/${id}/sync`),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["integrations-installed"] }),
  });

  const categories = useMemo(() => {
    const set = new Set<string>((catalog.data?.items ?? []).map((row) => row.category));
    return ["all", ...Array.from(set).sort()];
  }, [catalog.data?.items]);

  const installedByProvider = useMemo(() => {
    const map = new Map<string, IntegrationRow>();
    for (const row of installed.data ?? []) map.set(row.provider, row);
    return map;
  }, [installed.data]);

  const visibleCatalog = useMemo(() => {
    const rows = catalog.data?.items ?? [];
    const needle = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (category !== "all" && row.category !== category) return false;
      if (!needle) return true;
      return row.name.toLowerCase().includes(needle) || row.provider.toLowerCase().includes(needle);
    });
  }, [catalog.data?.items, category, query]);

  if (!me.data) return <div className="p-6 text-sm text-slate-500">Loading…</div>;
  if (!canRead) return <div className="p-6 text-sm text-slate-500">You don&apos;t have permission to view integrations.</div>;

  return (
    <div className="space-y-6 p-6">
      <header>
        <h1 className="text-2xl font-bold">Integrations marketplace</h1>
        <p className="text-sm text-slate-500">Install connectors, monitor health, view logs, and run sync/test operations.</p>
      </header>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-[1fr_auto]">
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search integrations" className="rounded-md border border-slate-200 px-3 py-2 text-sm" />
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="rounded-md border border-slate-200 px-3 py-2 text-sm">
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {visibleCatalog.map((item) => {
          const installedItem = installedByProvider.get(item.provider);
          const isInstalled = Boolean(installedItem && installedItem.status !== "uninstalled");
          const installedId = installedItem?.id ?? null;
          return (
            <article key={item.provider} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold">{item.name}</h2>
                  <p className="text-xs text-slate-500">{item.provider} · {item.category} · {item.install_type}</p>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${item.priority === "P0" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"}`}>{item.priority}</span>
              </div>
              <p className="mt-2 text-xs text-slate-600">{item.capabilities.join(", ")}</p>

              <div className="mt-3 flex flex-wrap gap-2">
                {!isInstalled ? (
                  <button disabled={!canWrite || installMutation.isPending} onClick={() => installMutation.mutate(item.provider)} className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">Install</button>
                ) : (
                  <>
                    <button disabled={!canWrite || testMutation.isPending || !installedId} onClick={() => installedId && testMutation.mutate(installedId)} className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold">Test</button>
                    <button disabled={!canWrite || syncMutation.isPending || !installedId} onClick={() => installedId && syncMutation.mutate(installedId)} className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold">Sync</button>
                    <button disabled={!installedId} onClick={() => installedId && setSelectedIntegrationId(installedId)} className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold disabled:opacity-50">Logs</button>
                    <button disabled={!canWrite || uninstallMutation.isPending || !installedId} onClick={() => installedId && uninstallMutation.mutate(installedId)} className="rounded-md border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-700 disabled:opacity-50">Uninstall</button>
                  </>
                )}
              </div>

              {installedItem && (
                <div className="mt-3 rounded-md bg-slate-50 p-2 text-xs text-slate-600">
                  <div>Status: <span className="font-semibold">{installedItem.status}</span> · Health: <span className="font-semibold">{installedItem.health_status}</span></div>
                  <div>Last sync: {installedItem.last_sync_at ? new Date(installedItem.last_sync_at).toLocaleString() : "—"}</div>
                  {installedItem.last_error_message && <div className="text-red-700">Error: {installedItem.last_error_message}</div>}
                </div>
              )}
            </article>
          );
        })}
      </section>

      {selectedIntegrationId && (
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-semibold">Integration logs</h2>
            <button onClick={() => setSelectedIntegrationId(null)} className="text-xs font-semibold text-slate-500">Close</button>
          </div>
          <div className="space-y-2">
            {(logs.data?.items ?? []).map((row) => (
              <div key={row.id} className="rounded-md border border-slate-200 p-2 text-xs">
                <div className="font-semibold">{row.event} · {row.level}</div>
                <div className="text-slate-600">{row.message}</div>
                <div className="text-slate-400">{row.created_at ? new Date(row.created_at).toLocaleString() : "—"}</div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
