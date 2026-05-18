import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { api } from "../lib/api";
import { hasPermission, useMe } from "../lib/me";

interface ApiKeyRow {
  id: string;
  name: string;
  key_hint: string;
  scopes: string[];
  rate_limit_per_min: number | null;
  usage_count: number;
  last_used_at: string | null;
  is_active: boolean;
  expires_at: string | null;
  secret?: string;
}

export function ApiKeysPage(): JSX.Element {
  const me = useMe();
  const queryClient = useQueryClient();
  const canWrite = hasPermission(me.data?.permissions, "api_keys.write");
  const [name, setName] = useState("");
  const [scopesText, setScopesText] = useState("chats.read, chats.write, messages.read, messages.write");
  const [rateLimit, setRateLimit] = useState("300");
  const [createdSecret, setCreatedSecret] = useState<string | null>(null);

  const scopeCatalog = useQuery({
    queryKey: ["api-key-scopes"],
    queryFn: async () => (await api.get<{ items: string[] }>("/api-keys/scopes")).data,
    enabled: canWrite,
  });

  const usage = useQuery({
    queryKey: ["api-key-usage"],
    queryFn: async () => (await api.get<{ total_keys: number; active_keys: number; total_requests: number; last_used_at: string | null }>("/api-keys/usage/summary")).data,
    enabled: canWrite,
  });

  const keys = useQuery({
    queryKey: ["api-keys"],
    queryFn: async () => (await api.get<ApiKeyRow[]>("/api-keys")).data,
    enabled: canWrite,
  });

  const createMutation = useMutation({
    mutationFn: async () =>
      (
        await api.post<ApiKeyRow>("/api-keys", {
          name,
          scopes: scopesText.split(",").map((s) => s.trim()).filter(Boolean),
          rate_limit_per_min: Number(rateLimit) || null,
        })
      ).data,
    onSuccess: (row) => {
      setCreatedSecret(row.secret ?? null);
      setName("");
      void queryClient.invalidateQueries({ queryKey: ["api-keys"] });
      void queryClient.invalidateQueries({ queryKey: ["api-key-usage"] });
    },
  });

  const revokeMutation = useMutation({
    mutationFn: async (id: string) => api.delete(`/api-keys/${id}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["api-keys"] });
      void queryClient.invalidateQueries({ queryKey: ["api-key-usage"] });
    },
  });

  if (!me.data) return <div className="p-6 text-sm text-slate-500">Loading…</div>;
  if (!canWrite) return <div className="p-6 text-sm text-slate-500">You don&apos;t have permission to manage API keys.</div>;

  return (
    <div className="space-y-6 p-6">
      <header>
        <h1 className="text-2xl font-bold">API keys</h1>
        <p className="text-sm text-slate-500">Create scoped keys for secure server-to-server integrations.</p>
      </header>

      <section className="grid gap-3 rounded-xl border border-slate-200 bg-white p-5 text-sm shadow-sm md:grid-cols-4">
        <div><p className="text-slate-500">Total keys</p><p className="text-xl font-bold">{usage.data?.total_keys ?? 0}</p></div>
        <div><p className="text-slate-500">Active keys</p><p className="text-xl font-bold">{usage.data?.active_keys ?? 0}</p></div>
        <div><p className="text-slate-500">Requests</p><p className="text-xl font-bold">{usage.data?.total_requests ?? 0}</p></div>
        <div><p className="text-slate-500">Last used</p><p className="text-sm font-semibold">{usage.data?.last_used_at ? new Date(usage.data.last_used_at).toLocaleString() : "—"}</p></div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="font-semibold">Create key</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-4">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Backend integration" className="rounded-md border border-slate-200 px-3 py-2 text-sm" />
          <input value={scopesText} onChange={(e) => setScopesText(e.target.value)} placeholder="scopes,comma,separated" className="rounded-md border border-slate-200 px-3 py-2 text-sm md:col-span-2" />
          <input value={rateLimit} onChange={(e) => setRateLimit(e.target.value)} placeholder="300" className="rounded-md border border-slate-200 px-3 py-2 text-sm" />
        </div>
        <button
          disabled={!name || createMutation.isPending}
          onClick={() => createMutation.mutate()}
          className="mt-3 rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          Create key
        </button>
        {createdSecret && <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-900">Copy this secret now: <code>{createdSecret}</code></p>}
        <p className="mt-3 text-xs text-slate-500">Available scopes: {(scopeCatalog.data?.items ?? []).join(", ")}</p>
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Key hint</th>
              <th className="px-4 py-3">Scopes</th>
              <th className="px-4 py-3">Usage</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {(keys.data ?? []).map((row) => (
              <tr key={row.id}>
                <td className="px-4 py-2 font-semibold">{row.name}</td>
                <td className="px-4 py-2 font-mono text-xs">{row.key_hint}</td>
                <td className="px-4 py-2 text-xs text-slate-600">{row.scopes.join(", ")}</td>
                <td className="px-4 py-2 text-xs text-slate-600">{row.usage_count} requests</td>
                <td className="px-4 py-2">{row.is_active ? <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">active</span> : <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-600">revoked</span>}</td>
                <td className="px-4 py-2 text-right">
                  {row.is_active && <button onClick={() => revokeMutation.mutate(row.id)} className="text-xs font-semibold text-red-600">Revoke</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
