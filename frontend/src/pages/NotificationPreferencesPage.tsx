import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import toast from "react-hot-toast";

import { disableBrowserPush, enableBrowserPush } from "../lib/browserPush";
import { canPromptInstall, promptInstallApp } from "../lib/pwa";
import { api } from "../lib/api";

interface Preferences {
  in_app: Record<string, boolean | string>;
  email: Record<string, boolean | string>;
  push: Record<string, boolean | string>;
}

export function NotificationPreferencesPage(): JSX.Element {
  const queryClient = useQueryClient();
  const [installable, setInstallable] = useState(canPromptInstall());
  const { data } = useQuery({
    queryKey: ["notification-preferences"],
    queryFn: async () => (await api.get<Preferences>("/notifications/preferences")).data,
  });

  const update = useMutation({
    mutationFn: async (payload: Partial<Preferences>) => api.put("/notifications/preferences", payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notification-preferences"] }),
  });

  function toggle(channel: keyof Preferences, key: string): void {
    const current = data?.[channel] ?? {};
    const next = { ...current, [key]: !(current[key] as boolean) };
    update.mutate({ [channel]: next } as Partial<Preferences>);
  }

  function setEmailDigest(value: string): void {
    update.mutate({ email: { ...(data?.email ?? {}), digest: value } });
  }

  async function toggleBrowserPush(nextEnabled: boolean): Promise<void> {
    try {
      if (nextEnabled) {
        await enableBrowserPush();
      } else {
        await disableBrowserPush();
      }
      update.mutate({ push: { ...(data?.push ?? {}), all: nextEnabled } });
      toast.success(nextEnabled ? "Browser push enabled" : "Browser push disabled");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update browser push");
    }
  }

  async function triggerInstall(): Promise<void> {
    const accepted = await promptInstallApp();
    if (accepted) {
      toast.success("App install started");
      setInstallable(false);
      return;
    }
    setInstallable(canPromptInstall());
  }

  if (!data) return <div className="p-6 text-sm text-navy-400">Loading preferences…</div>;

  return (
    <div className="space-y-6 p-6">
      <header>
        <h1 className="text-2xl font-bold">Notification preferences</h1>
        <p className="text-sm text-navy-400">Choose which alerts you receive and how.</p>
      </header>

      <section className="rounded-lg border border-navy-100 bg-white p-5 shadow-xs dark:border-navy-700 dark:bg-navy-800">
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

      <section className="rounded-lg border border-navy-100 bg-white p-5 shadow-xs dark:border-navy-700 dark:bg-navy-800">
        <h2 className="font-semibold">Email digest</h2>
        <div className="mt-3 flex flex-wrap gap-3 text-sm">
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

      <section className="rounded-lg border border-navy-100 bg-white p-5 shadow-xs dark:border-navy-700 dark:bg-navy-800">
        <h2 className="font-semibold">Browser push</h2>
        <p className="mt-1 text-xs text-navy-400">Uses Web Push + VAPID for new chats and mentions.</p>
        <div className="mt-3 space-y-2 text-sm">
          {(["all", "new_chat", "new_message", "mention"] as const).map((key) => (
            <label key={key} className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={Boolean(data.push[key])}
                onChange={() => {
                  if (key === "all") {
                    void toggleBrowserPush(!Boolean(data.push.all));
                    return;
                  }
                  toggle("push", key);
                }}
              />
              <span className="capitalize">{key.replace("_", " ")}</span>
            </label>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-navy-100 bg-white p-5 shadow-xs dark:border-navy-700 dark:bg-navy-800">
        <h2 className="font-semibold">Install app</h2>
        <p className="mt-1 text-xs text-navy-400">Install FlowLyra on desktop/mobile for a native-like shell and offline start page.</p>
        <button
          type="button"
          className="mt-3 rounded-md bg-brand-500 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!installable}
          onClick={() => {
            void triggerInstall();
          }}
        >
          {installable ? "Install FlowLyra" : "Install prompt unavailable"}
        </button>
      </section>

      <section className="rounded-lg border border-navy-100 bg-white p-5 shadow-xs dark:border-navy-700 dark:bg-navy-800">
        <h2 className="font-semibold">Native mobile push</h2>
        <p className="mt-1 text-xs text-navy-400">iOS/Android device token endpoints are available at <code>/notifications/push/native/register</code>.</p>
      </section>
    </div>
  );
}
