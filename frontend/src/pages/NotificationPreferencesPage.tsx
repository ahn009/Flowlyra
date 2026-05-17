import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "../lib/api";

interface Preferences {
  in_app: Record<string, boolean | string>;
  email: Record<string, boolean | string>;
  push: Record<string, boolean | string>;
}

export function NotificationPreferencesPage(): JSX.Element {
  const queryClient = useQueryClient();
  const { data } = useQuery({
    queryKey: ["notification-preferences"],
    queryFn: async () => (await api.get<Preferences>("/notifications/preferences")).data
  });

  const update = useMutation({
    mutationFn: async (payload: Partial<Preferences>) => api.put("/notifications/preferences", payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notification-preferences"] })
  });

  function toggle(channel: keyof Preferences, key: string): void {
    const current = data?.[channel] ?? {};
    const next = { ...current, [key]: !(current[key] as boolean) };
    update.mutate({ [channel]: next } as Partial<Preferences>);
  }

  function setEmailDigest(value: string): void {
    update.mutate({ email: { ...(data?.email ?? {}), digest: value } });
  }

  if (!data) return <div className="p-6 text-sm text-slate-500">Loading preferences…</div>;

  return (
    <div className="space-y-6 p-6">
      <header>
        <h1 className="text-2xl font-bold">Notification preferences</h1>
        <p className="text-sm text-slate-500">Choose which alerts you receive and how.</p>
      </header>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="font-semibold">In-app</h2>
        <div className="mt-3 space-y-2 text-sm">
          {(["all", "new_chat", "new_message", "mention", "assignment"] as const).map((key) => (
            <label key={key} className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={Boolean(data.in_app[key])}
                onChange={() => toggle("in_app", key)}
              />
              <span className="capitalize">{key.replace("_", " ")}</span>
            </label>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="font-semibold">Email digest</h2>
        <div className="mt-3 flex gap-3 text-sm">
          {(["instant", "hourly", "daily", "off"] as const).map((value) => (
            <label key={value} className="flex items-center gap-2">
              <input
                type="radio"
                checked={(data.email.digest ?? "instant") === value}
                onChange={() => setEmailDigest(value)}
              />
              <span className="capitalize">{value}</span>
            </label>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="font-semibold">Browser push</h2>
        <div className="mt-3 space-y-2 text-sm">
          {(["all", "new_chat", "mention"] as const).map((key) => (
            <label key={key} className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={Boolean(data.push[key])}
                onChange={() => toggle("push", key)}
              />
              <span className="capitalize">{key.replace("_", " ")}</span>
            </label>
          ))}
        </div>
      </section>
    </div>
  );
}
