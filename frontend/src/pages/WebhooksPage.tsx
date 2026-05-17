import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { api } from "../lib/api";
import { hasPermission, useMe } from "../lib/me";

interface WebhookRow {
  id: string;
  url: string;
  events: string[];
  description: string | null;
  is_active: boolean;
  last_success_at: string | null;
  last_failure_at: string | null;
  failure_streak: number;
  secret?: string;
}

export function WebhooksPage(): JSX.Element {
  const me = useMe();
  const queryClient = useQueryClient();
  const [newUrl, setNewUrl] = useState("");
  const [newEvents, setNewEvents] = useState("*");
  const [createdSecret, setCreatedSecret] = useState<string | null>(null);
  const canWrite = hasPermission(me.data?.permissions, "webhooks.write");

  const list = useQuery({
    queryKey: ["webhooks"],
    queryFn: async () => (await api.get<WebhookRow[]>("/webhooks")).data,
    enabled: canWrite
  });

  const catalog = useQuery({
    queryKey: ["webhook-events"],
    queryFn: async () => (await api.get<{ events: string[] }>("/webhooks/events/catalog")).data,
    enabled: canWrite
  });

  const createMutation = useMutation({
    mutationFn: async () =>
      (
        await api.post<WebhookRow>("/webhooks", {
          url: newUrl,
          events: newEvents.split(",").map((s) => s.trim()).filter(Boolean)
        })
      ).data,
    onSuccess: (data) => {
      setCreatedSecret(data.secret ?? null);
      setNewUrl("");
      void queryClient.invalidateQueries({ queryKey: ["webhooks"] });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => api.delete(`/webhooks/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["webhooks"] })
  });

  if (!me.data) return <div className="p-6 text-sm text-slate-500">Loading…</div>;
  if (!canWrite) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-bold">Webhooks</h1>
        <p className="mt-2 text-sm text-slate-500">You don't have permission to manage webhooks.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <header>
        <h1 className="text-2xl font-bold">Webhooks</h1>
        <p className="text-sm text-slate-500">Receive real-time notifications from FlowLyra into your own services.</p>
      </header>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="font-semibold">Add endpoint</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-[2fr_2fr_auto]">
          <input
            value={newUrl}
            onChange={(e) => setNewUrl(e.target.value)}
            placeholder="https://your-service.example.com/flowlyra"
            className="rounded-md border border-slate-200 px-3 py-2 text-sm"
          />
          <input
            value={newEvents}
            onChange={(e) => setNewEvents(e.target.value)}
            placeholder="* or comma-separated events (chat.started, ticket.created, …)"
            className="rounded-md border border-slate-200 px-3 py-2 text-sm"
          />
          <button
            disabled={!newUrl || createMutation.isPending}
            onClick={() => createMutation.mutate()}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            Save
          </button>
        </div>
        {createdSecret && (
          <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-900">
            New signing secret (copy now — it won't be shown again): <code className="font-mono">{createdSecret}</code>
          </p>
        )}
        <p className="mt-3 text-xs text-slate-500">
          Subscribable events: <code>{(catalog.data?.events ?? []).join(", ") || "—"}</code>
        </p>
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">URL</th>
              <th className="px-4 py-3">Events</th>
              <th className="px-4 py-3">Last delivery</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {(list.data ?? []).map((row) => (
              <tr key={row.id}>
                <td className="px-4 py-2 font-mono text-xs">{row.url}</td>
                <td className="px-4 py-2 text-xs text-slate-600">{row.events.join(", ")}</td>
                <td className="px-4 py-2 text-xs text-slate-500">
                  {row.last_success_at ? `OK ${new Date(row.last_success_at).toLocaleString()}` : row.last_failure_at ? `Fail ${new Date(row.last_failure_at).toLocaleString()}` : "—"}
                </td>
                <td className="px-4 py-2">
                  {row.is_active ? (
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">active</span>
                  ) : (
                    <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-600">paused</span>
                  )}
                </td>
                <td className="px-4 py-2 text-right">
                  <button onClick={() => deleteMutation.mutate(row.id)} className="text-xs font-semibold text-red-600">
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {(list.data ?? []).length === 0 && !list.isLoading && (
          <p className="px-4 py-6 text-center text-sm text-slate-400">No webhook subscriptions yet.</p>
        )}
      </section>
    </div>
  );
}
