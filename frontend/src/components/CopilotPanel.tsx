import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Sparkles, X, BookOpen, Loader2 } from "lucide-react";

import { api } from "../lib/api";

interface CopilotSource {
  title: string | null;
  kb_article_id: string | null;
  source_id: string | null;
  score: number;
}

interface CopilotResult {
  answer: string;
  sources: CopilotSource[];
}

interface Props {
  chatId: string;
  open: boolean;
  onClose: () => void;
  onInsert?: (text: string) => void;
}

export function CopilotPanel({ chatId, open, onClose, onInsert }: Props): JSX.Element | null {
  const [question, setQuestion] = useState("");
  const [history, setHistory] = useState<Array<{ q: string; a: CopilotResult }>>([]);

  const ask = useMutation({
    mutationFn: async (q: string) =>
      (await api.post<CopilotResult>("/ai/copilot", { question: q, chat_id: chatId })).data,
    onSuccess: (result, q) => {
      setHistory((h) => [...h, { q, a: result }]);
      setQuestion("");
    },
  });

  if (!open) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-navy-100 dark:border-navy-700 bg-white shadow-2xl dark:bg-navy-900">
      <div className="flex items-center justify-between border-b border-navy-100 dark:border-navy-700 bg-gradient-to-r from-purple-50 to-blue-50 px-4 py-3 dark:from-purple-900/20 dark:to-blue-900/20">
        <div className="flex items-center gap-2">
          <Sparkles size={18} className="text-purple-600" />
          <div className="text-sm font-black">Copilot</div>
        </div>
        <button onClick={onClose} className="rounded p-1 hover:bg-white/50 dark:hover:bg-navy-800">
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-4 text-sm">
        {history.length === 0 && (
          <div className="rounded-lg border border-dashed border-navy-200 p-4 text-center text-xs text-navy-400 dark:border-navy-700">
            Ask anything about this chat or your KB. Sources cited inline.
          </div>
        )}
        {history.map((h, i) => (
          <div key={i} className="space-y-2">
            <div className="rounded-lg bg-navy-100 p-2 text-xs font-bold text-navy-600 dark:bg-navy-800 dark:text-navy-200">
              You: {h.q}
            </div>
            <div className="rounded-lg border border-purple-100 bg-purple-50 p-3 text-xs dark:border-purple-900 dark:bg-purple-900/10">
              <div className="whitespace-pre-wrap text-navy-700 dark:text-navy-100">{h.a.answer}</div>
              {h.a.sources.length > 0 && (
                <div className="mt-2 space-y-1 border-t border-purple-200 pt-2 dark:border-purple-800">
                  <div className="text-[10px] font-black uppercase text-navy-400">Sources</div>
                  {h.a.sources.map((s, idx) => (
                    <div key={idx} className="flex items-center gap-1 text-[11px] text-navy-500 dark:text-navy-300">
                      <BookOpen size={11} />
                      <span>{s.title ?? "Knowledge"}</span>
                      <span className="text-navy-400">· {Math.round(s.score * 100)}%</span>
                    </div>
                  ))}
                </div>
              )}
              {onInsert && (
                <button
                  onClick={() => onInsert(h.a.answer)}
                  className="mt-2 rounded bg-purple-600 px-2 py-1 text-[11px] font-bold text-white hover:bg-purple-700"
                >
                  Insert into reply
                </button>
              )}
            </div>
          </div>
        ))}
        {ask.isPending && (
          <div className="flex items-center gap-2 text-xs text-navy-400">
            <Loader2 size={14} className="animate-spin" /> Thinking…
          </div>
        )}
      </div>

      <div className="border-t border-navy-100 dark:border-navy-700 p-3">
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask Copilot…"
          rows={2}
          className="w-full resize-none rounded-lg border border-navy-100 dark:border-navy-700 bg-navy-50 p-2 text-sm outline-none focus:bg-white dark:bg-navy-800 dark:focus:bg-navy-800"
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && question.trim()) {
              e.preventDefault();
              ask.mutate(question.trim());
            }
          }}
        />
        <button
          disabled={!question.trim() || ask.isPending}
          onClick={() => ask.mutate(question.trim())}
          className="mt-2 w-full rounded-lg bg-purple-600 px-3 py-2 text-sm font-bold text-white shadow-sm hover:bg-purple-700 disabled:opacity-50"
        >
          Ask
        </button>
      </div>
    </div>
  );
}
