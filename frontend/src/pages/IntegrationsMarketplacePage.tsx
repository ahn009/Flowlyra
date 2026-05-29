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

interface ConfigField {
  key: string;
  label: string;
  type: string;
  placeholder: string;
  required?: boolean;
}

const CONFIG_FIELDS: Record<string, ConfigField[]> = {
  api_key: [
    { key: "access_token", label: "API Key / Access Token", type: "password", placeholder: "Enter your API key", required: true },
  ],
  oauth2: [
    { key: "shop", label: "Shop domain (if applicable)", type: "text", placeholder: "your-store.myshopify.com" },
  ],
  webhook: [
    { key: "webhook_url", label: "Webhook URL", type: "url", placeholder: "https://hooks.zapier.com/...", required: true },
  ],
  embed: [
    { key: "site_url", label: "Website URL", type: "url", placeholder: "https://your-site.com" },
  ],
  script: [
    { key: "tracking_id", label: "Tracking / Measurement ID", type: "text", placeholder: "G-XXXXXXXXXX or GTM-XXXXXXX", required: true },
    { key: "api_secret", label: "API Secret (if applicable)", type: "password", placeholder: "Optional" },
  ],
};

const PROVIDER_CONFIG_OVERRIDES: Record<string, ConfigField[]> = {
  shopify: [
    { key: "shop", label: "Shop domain", type: "text", placeholder: "your-store.myshopify.com", required: true },
    { key: "access_token", label: "Admin API Access Token", type: "password", placeholder: "shpat_..." },
    { key: "webhook_secret", label: "Webhook signing secret", type: "password", placeholder: "Optional" },
  ],
  slack: [
    { key: "bot_token", label: "Bot OAuth Token", type: "password", placeholder: "xoxb-...", required: true },
    { key: "default_channel", label: "Default notification channel", type: "text", placeholder: "#support" },
  ],
  ga4: [
    { key: "measurement_id", label: "Measurement ID", type: "text", placeholder: "G-XXXXXXXXXX", required: true },
    { key: "api_secret", label: "API Secret", type: "password", placeholder: "From GA4 Admin → Data Streams", required: true },
  ],
  hubspot: [
    { key: "access_token", label: "Private App Access Token", type: "password", placeholder: "pat-...", required: true },
    { key: "pipeline", label: "Deal pipeline ID", type: "text", placeholder: "default" },
  ],
  salesforce: [
    { key: "instance_url", label: "Instance URL", type: "url", placeholder: "https://yourorg.my.salesforce.com", required: true },
    { key: "access_token", label: "Access Token", type: "password", placeholder: "From Connected App", required: true },
  ],
  zapier: [
    { key: "webhook_url", label: "Zapier Webhook URL", type: "url", placeholder: "https://hooks.zapier.com/hooks/catch/...", required: true },
  ],
};

export function IntegrationsMarketplacePage(): JSX.Element {
  const me = useMe();
  const queryClient = useQueryClient();
  const canRead = hasPermission(me.data?.permissions, "integrations.read") || hasPermission(me.data?.permissions, "integrations.write");
  const canWrite = hasPermission(me.data?.permissions, "integrations.write");

  const [category, setCategory] = useState<string>("all");
  const [query, setQuery] = useState<string>("");
  const [selectedIntegrationId, setSelectedIntegrationId] = useState<string | null>(null);
  const [configModalProvider, setConfigModalProvider] = useState<string | null>(null);
  const [configValues, setConfigValues] = useState<Record<string, string>>({});

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
    mutationFn: async ({ provider, config }: { provider: string; config: Record<string, string> }) =>
      (await api.post<IntegrationRow>("/integrations", { provider, config })).data,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["integrations-installed"] });
      void queryClient.invalidateQueries({ queryKey: ["integrations-health"] });
    },
  });

  const updateConfigMutation = useMutation({
    mutationFn: async ({ id, config }: { id: string; config: Record<string, string> }) =>
      api.patch(`/integrations/${id}`, { config }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["integrations-installed"] }),
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

  if (!me.data) return <div className="p-6 text-sm text-navy-400">Loading…</div>;
  if (!canRead) return <div className="p-6 text-sm text-navy-400">You don&apos;t have permission to view integrations.</div>;

  return (
    <div className="space-y-6 p-6">
      <header>
        <h1 className="text-2xl font-bold">Integrations marketplace</h1>
        <p className="text-sm text-navy-400">Install connectors, monitor health, view logs, and run sync/test operations.</p>
      </header>

      <section className="rounded-xl border border-navy-100 bg-white p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-[1fr_auto]">
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search integrations" className="rounded-md border border-navy-100 px-3 py-2 text-sm" />
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="rounded-md border border-navy-100 px-3 py-2 text-sm">
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
            <article key={item.provider} className="rounded-xl border border-navy-100 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold">{item.name}</h2>
                  <p className="text-xs text-navy-400">{item.provider} · {item.category} · {item.install_type}</p>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${item.priority === "P0" ? "bg-amber-100 text-amber-700" : "bg-navy-100 text-navy-500"}`}>{item.priority}</span>
              </div>
              <p className="mt-2 text-xs text-navy-500">{item.capabilities.join(", ")}</p>

              <div className="mt-3 flex flex-wrap gap-2">
                {!isInstalled ? (
                  <button
                    disabled={!canWrite || installMutation.isPending}
                    onClick={() => { setConfigModalProvider(item.provider); setConfigValues({}); }}
                    className="rounded-md bg-navy-900 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                  >
                    {item.install_type === "oauth2" ? "Connect" : "Install"}
                  </button>
                ) : (
                  <>
                    <button disabled={!canWrite || testMutation.isPending || !installedId} onClick={() => installedId && testMutation.mutate(installedId)} className="rounded-md border border-navy-200 px-3 py-1.5 text-xs font-semibold">Test</button>
                    <button disabled={!canWrite || syncMutation.isPending || !installedId} onClick={() => installedId && syncMutation.mutate(installedId)} className="rounded-md border border-navy-200 px-3 py-1.5 text-xs font-semibold">Sync</button>
                    <button disabled={!installedId} onClick={() => installedId && setSelectedIntegrationId(installedId)} className="rounded-md border border-navy-200 px-3 py-1.5 text-xs font-semibold disabled:opacity-50">Logs</button>
                    <button
                      disabled={!canWrite}
                      onClick={() => {
                        setConfigModalProvider(item.provider);
                        setConfigValues(Object.fromEntries(
                          Object.entries(installedItem?.config ?? {}).map(([k, v]) => [k, String(v ?? "")])
                        ));
                      }}
                      className="rounded-md border border-navy-200 px-3 py-1.5 text-xs font-semibold"
                    >Configure</button>
                    <button disabled={!canWrite || uninstallMutation.isPending || !installedId} onClick={() => installedId && uninstallMutation.mutate(installedId)} className="rounded-md border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-700 disabled:opacity-50">Uninstall</button>
                  </>
                )}
              </div>

              {installedItem && (
                <div className="mt-3 rounded-md bg-navy-50 p-2 text-xs text-navy-500">
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
        <section className="rounded-xl border border-navy-100 bg-white p-4 shadow-sm">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-semibold">Integration logs</h2>
            <button onClick={() => setSelectedIntegrationId(null)} className="text-xs font-semibold text-navy-400">Close</button>
          </div>
          <div className="space-y-2">
            {(logs.data?.items ?? []).map((row) => (
              <div key={row.id} className="rounded-md border border-navy-100 p-2 text-xs">
                <div className="font-semibold">{row.event} · {row.level}</div>
                <div className="text-navy-500">{row.message}</div>
                <div className="text-navy-400">{row.created_at ? new Date(row.created_at).toLocaleString() : "—"}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {configModalProvider && (() => {
        const catalogItem = (catalog.data?.items ?? []).find((i) => i.provider === configModalProvider);
        const installedItem = installedByProvider.get(configModalProvider);
        const isAlreadyInstalled = Boolean(installedItem && installedItem.status !== "uninstalled");
        const fields = PROVIDER_CONFIG_OVERRIDES[configModalProvider] ?? CONFIG_FIELDS[catalogItem?.install_type ?? "api_key"] ?? CONFIG_FIELDS.api_key;
        const canSubmit = fields.filter((f) => f.required).every((f) => configValues[f.key]?.trim());

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/60 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl border border-navy-100 bg-white p-6 shadow-xl dark:border-navy-700 dark:bg-navy-900">
              <h2 className="text-lg font-bold text-navy-800 dark:text-white">
                Configure {catalogItem?.name ?? configModalProvider}
              </h2>
              <p className="mt-1 text-sm text-navy-400">
                {catalogItem?.install_type === "oauth2"
                  ? "Enter any required details, then you'll be redirected to authorize."
                  : "Enter your credentials to connect this integration."}
              </p>
              <div className="mt-4 space-y-3">
                {fields.map((field) => (
                  <div key={field.key}>
                    <label className="mb-1 block text-sm font-medium text-navy-600 dark:text-navy-300">
                      {field.label}{field.required && <span className="text-red-500"> *</span>}
                    </label>
                    <input
                      type={field.type}
                      placeholder={field.placeholder}
                      value={configValues[field.key] ?? ""}
                      onChange={(e) => setConfigValues((prev) => ({ ...prev, [field.key]: e.target.value }))}
                      className="w-full rounded-lg border border-navy-200 bg-white px-3 py-2 text-sm dark:border-navy-600 dark:bg-navy-800"
                    />
                  </div>
                ))}
              </div>
              <div className="mt-5 flex justify-end gap-2">
                <button
                  onClick={() => { setConfigModalProvider(null); setConfigValues({}); }}
                  className="rounded-lg border border-navy-200 px-4 py-2 text-sm font-semibold"
                >Cancel</button>
                <button
                  disabled={!canSubmit}
                  onClick={async () => {
                    if (isAlreadyInstalled && installedItem?.id) {
                      await updateConfigMutation.mutateAsync({ id: installedItem.id, config: configValues });
                    } else {
                      await installMutation.mutateAsync({ provider: configModalProvider, config: configValues });
                    }
                    setConfigModalProvider(null);
                    setConfigValues({});
                  }}
                  className="rounded-lg bg-navy-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {isAlreadyInstalled ? "Save Config" : catalogItem?.install_type === "oauth2" ? "Connect" : "Save & Install"}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
