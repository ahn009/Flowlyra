import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";

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

interface DeliveryRow {
  id: string;
  event: string;
  status: string;
  status_code: number | null;
  response_body: string | null;
  attempt: number;
  next_retry_at: string | null;
  delivered_at: string | null;
  created_at: string | null;
}

export function WebhooksPage(): JSX.Element {
  const me = useMe();
  const queryClient = useQueryClient();
  const [newUrl, setNewUrl] = useState("");
  const [newEvents, setNewEvents] = useState("*");
  const [createdSecret, setCreatedSecret] = useState<string | null>(null);
  const [selectedWebhookId, setSelectedWebhookId] = useState<string | null>(null);
  const canWrite = hasPermission(me.data?.permissions, "webhooks.write");

  const list = useQuery({
    queryKey: ["webhooks"],
    queryFn: async () => (await api.get<WebhookRow[]>("/webhooks")).data,
    enabled: canWrite,
  });

  const catalog = useQuery({
    queryKey: ["webhook-events"],
    queryFn: async () => (await api.get<{ events: string[] }>("/webhooks/events/catalog")).data,
    enabled: canWrite,
  });

  const deliveries = useQuery({
    queryKey: ["webhook-deliveries", selectedWebhookId],
    queryFn: async () => (await api.get<{ items: DeliveryRow[] }>(`/webhooks/${selectedWebhookId}/deliveries`)).data,
    enabled: canWrite && Boolean(selectedWebhookId),
    refetchInterval: selectedWebhookId ? 5000 : false,
  });

  const createMutation = useMutation({
    mutationFn: async () =>
      (
        await api.post<WebhookRow>("/webhooks", {
          url: newUrl,
          events: newEvents.split(",").map((s) => s.trim()).filter(Boolean),
        })
      ).data,
    onSuccess: (data) => {
      setCreatedSecret(data.secret ?? null);
      setNewUrl("");
      void queryClient.invalidateQueries({ queryKey: ["webhooks"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => api.delete(`/webhooks/${id}`),
    onSuccess: () => {
      if (selectedWebhookId) setSelectedWebhookId(null);
      void queryClient.invalidateQueries({ queryKey: ["webhooks"] });
    },
  });

  const testMutation = useMutation({
    mutationFn: async (id: string) => api.post(`/webhooks/${id}/test`),
    onSuccess: () => {
      if (selectedWebhookId) void queryClient.invalidateQueries({ queryKey: ["webhook-deliveries", selectedWebhookId] });
    },
  });

  const replayMutation = useMutation({
    mutationFn: async (deliveryId: string) => api.post(`/webhooks/deliveries/${deliveryId}/replay`),
    onSuccess: () => {
      if (selectedWebhookId) void queryClient.invalidateQueries({ queryKey: ["webhook-deliveries", selectedWebhookId] });
    },
  });

  const selectedWebhook = useMemo(() => (list.data ?? []).find((x) => x.id === selectedWebhookId) ?? null, [list.data, selectedWebhookId]);

  if (!me.data) return <div className="p-6 text-sm text-navy-400">Loading…</div>;
  if (!canWrite) return <div className="p-6 text-sm text-navy-400">You don&apos;t have permission to manage webhooks.</div>;

  return (
    <div className="space-y-6 p-6">
      <header>
        <h1 className="text-2xl font-bold">Webhooks</h1>
        <p className="text-sm text-navy-400">Receive real-time event deliveries into your own services.</p>
      </header>

      <section className="rounded-lg border border-navy-100 bg-white p-5 shadow-xs dark:border-navy-700 dark:bg-navy-800">
        <h2 className="font-semibold">Add endpoint</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-[2fr_2fr_auto]">
          <input value={newUrl} onChange={(e) => setNewUrl(e.target.value)} placeholder="https://your-service.example.com/flowlyra" className="rounded-md border border-navy-100 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/20 dark:border-navy-700 dark:bg-navy-900 dark:text-navy-100" />
          <input value={newEvents} onChange={(e) => setNewEvents(e.target.value)} placeholder="* or chat.started,ticket.created" className="rounded-md border border-navy-100 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/20 dark:border-navy-700 dark:bg-navy-900 dark:text-navy-100" />
          <button disabled={!newUrl || createMutation.isPending} onClick={() => createMutation.mutate()} className="rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-600 disabled:opacity-50">Save</button>
        </div>
        {createdSecret && <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-900">Signing secret (copy now): <code>{createdSecret}</code></p>}
        <p className="mt-3 text-xs text-navy-400">Events: <code>{(catalog.data?.events ?? []).join(", ") || "—"}</code></p>
      </section>

      <section className="overflow-hidden rounded-lg border border-navy-100 bg-white shadow-xs dark:border-navy-700 dark:bg-navy-800">
        <table className="min-w-full text-sm">
          <thead className="bg-navy-50 text-left text-xs font-semibold uppercase tracking-wide text-navy-400">
            <tr>
              <th className="px-4 py-3">URL</th>
              <th className="px-4 py-3">Events</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Last delivery</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-navy-100">
            {(list.data ?? []).map((row) => (
              <tr key={row.id}>
                <td className="px-4 py-2 font-mono text-xs">{row.url}</td>
                <td className="px-4 py-2 text-xs text-navy-500">{row.events.join(", ")}</td>
                <td className="px-4 py-2">{row.is_active ? <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">active</span> : <span className="rounded-full bg-navy-200 px-2 py-0.5 text-xs font-semibold text-navy-500">paused</span>}</td>
                <td className="px-4 py-2 text-xs text-navy-400">{row.last_success_at ? `OK ${new Date(row.last_success_at).toLocaleString()}` : row.last_failure_at ? `Fail ${new Date(row.last_failure_at).toLocaleString()}` : "—"}</td>
                <td className="px-4 py-2 text-right">
                  <div className="inline-flex gap-3">
                    <button onClick={() => setSelectedWebhookId(row.id)} className="text-xs font-semibold text-navy-600">Deliveries</button>
                    <button onClick={() => testMutation.mutate(row.id)} className="text-xs font-semibold text-brand-600">Test</button>
                    <button onClick={() => deleteMutation.mutate(row.id)} className="text-xs font-semibold text-red-600">Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {selectedWebhookId && (
        <section className="rounded-lg border border-navy-100 bg-white p-5 shadow-xs dark:border-navy-700 dark:bg-navy-800">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Deliveries</h2>
            <button onClick={() => setSelectedWebhookId(null)} className="text-xs font-semibold text-navy-400">Close</button>
          </div>
          <p className="mt-1 text-xs text-navy-400">{selectedWebhook?.url ?? selectedWebhookId}</p>
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-navy-400">
                <tr>
                  <th className="py-2">Event</th>
                  <th className="py-2">Status</th>
                  <th className="py-2">Code</th>
                  <th className="py-2">Attempts</th>
                  <th className="py-2">Created</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-100">
                {(deliveries.data?.items ?? []).map((row) => (
                  <tr key={row.id}>
                    <td className="py-2 text-xs font-mono">{row.event}</td>
                    <td className="py-2 text-xs">{row.status}</td>
                    <td className="py-2 text-xs">{row.status_code ?? "—"}</td>
                    <td className="py-2 text-xs">{row.attempt}</td>
                    <td className="py-2 text-xs">{row.created_at ? new Date(row.created_at).toLocaleString() : "—"}</td>
                    <td className="py-2 text-right">
                      <button onClick={() => replayMutation.mutate(row.id)} className="text-xs font-semibold text-brand-600">Replay</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
