import { useEffect } from "react";
import { useParams } from "react-router-dom";

declare global {
  interface Window {
    FlowLyraConfig?: Record<string, unknown>;
    FlowLyra?: { destroy?: () => void };
  }
}

export function PublicChatPage(): JSX.Element {
  const { wsId = "" } = useParams();

  useEffect(() => {
    const apiBase = import.meta.env.VITE_API_BASE_URL?.replace(/\/api\/v1\/?$/, "") ?? "http://localhost:8000";
    const widgetSrc = import.meta.env.VITE_WIDGET_SRC ?? "https://cdn.flowlyra.com/widget.js";
    window.FlowLyraConfig = {
      orgSlug: wsId,
      apiUrl: apiBase,
      autoOpen: true,
      lazy: false,
    };
    const script = document.createElement("script");
    script.async = true;
    script.src = widgetSrc;
    script.dataset.flowlyraPublic = "1";
    document.body.append(script);
    return () => {
      window.FlowLyra?.destroy?.();
      script.remove();
    };
  }, [wsId]);

  return (
    <main className="grid min-h-screen place-items-center bg-navy-100 p-6 text-center dark:bg-navy-950">
      <div className="max-w-xl rounded-2xl border border-navy-100 dark:border-navy-700 bg-white p-8 shadow-sm dark:bg-navy-900">
        <h1 className="text-2xl font-black tracking-tight text-navy-700 dark:text-navy-100">Live Chat</h1>
        <p className="mt-2 text-sm text-navy-500 dark:text-navy-300">
          Chat workspace: <span className="font-mono font-bold">{wsId}</span>. The widget opens automatically.
        </p>
      </div>
    </main>
  );
}
