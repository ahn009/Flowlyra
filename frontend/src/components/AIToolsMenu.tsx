import { useState } from "react";
import { Wand2, Loader2 } from "lucide-react";

import { api } from "../lib/api";

interface Props {
  value: string;
  onApply: (text: string) => void;
}

const OPS: Array<{ op: string; label: string }> = [
  { op: "expand", label: "Expand" },
  { op: "rephrase", label: "Rephrase" },
  { op: "summarize", label: "Summarize" },
  { op: "grammar", label: "Fix grammar" },
  { op: "friendly", label: "Friendly tone" },
  { op: "formal", label: "Formal tone" },
  { op: "casual", label: "Casual tone" },
];

export function AIToolsMenu({ value, onApply }: Props): JSX.Element {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [lang, setLang] = useState("Spanish");

  const run = async (op: string, target_language?: string): Promise<void> => {
    if (!value.trim()) return;
    setBusy(op);
    try {
      const { data } = await api.post<{ result: string }>("/ai/text", {
        operation: op,
        text: value,
        target_language,
      });
      if (data.result) onApply(data.result);
    } finally {
      setBusy(null);
      setOpen(false);
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex shrink-0 items-center gap-2 rounded-full bg-purple-100 px-3 py-1.5 text-xs font-black text-purple-700 hover:bg-purple-200 dark:bg-purple-900/30 dark:text-purple-300"
      >
        <Wand2 size={14} /> AI tools
      </button>
      {open && (
        <div className="absolute bottom-full left-0 z-30 mb-1 w-56 rounded-xl border border-navy-100 dark:border-navy-700 bg-white p-2 shadow-xl dark:bg-navy-900">
          {OPS.map(({ op, label }) => (
            <button
              key={op}
              disabled={busy !== null}
              onClick={() => void run(op)}
              className="flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-xs font-bold hover:bg-navy-100 disabled:opacity-50 dark:hover:bg-navy-800"
            >
              <span>{label}</span>
              {busy === op && <Loader2 size={12} className="animate-spin" />}
            </button>
          ))}
          <div className="mt-1 border-t border-navy-100 dark:border-navy-700 pt-1">
            <div className="flex items-center gap-1">
              <input
                value={lang}
                onChange={(e) => setLang(e.target.value)}
                placeholder="lang"
                className="h-7 flex-1 rounded border border-navy-100 dark:border-navy-700 px-2 text-xs"
              />
              <button
                disabled={busy !== null}
                onClick={() => void run("translate", lang)}
                className="rounded bg-purple-600 px-2 py-1 text-[11px] font-bold text-white disabled:opacity-50"
              >
                Translate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
