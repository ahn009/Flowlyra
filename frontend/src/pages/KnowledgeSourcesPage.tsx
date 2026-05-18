import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import toast from "react-hot-toast";
import { BrainCircuit, Globe, FileText, RefreshCw, Trash2, Plus, Search } from "lucide-react";

import { api } from "../lib/api";

interface KSource {
  id: string;
  name: string;
  source_type: string;
  url: string | null;
  status: string;
  chunk_count: number;
  error: string | null;
  last_ingested_at: string | null;
  created_at: string;
}

interface SearchResult {
  content: string;
  score: number;
  meta: Record<string, unknown>;
  kb_article_id: string | null;
  source_id: string | null;
}

export function KnowledgeSourcesPage(): JSX.Element {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [sourceType, setSourceType] = useState<"url" | "text">("url");
  const [url, setUrl] = useState("");
  const [content, setContent] = useState("");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);

  const { data: sources = [] } = useQuery({
    queryKey: ["knowledge-sources"],
    queryFn: async () => (await api.get<KSource[]>("/ai/knowledge/sources")).data,
    refetchInterval: 5000,
  });

  const create = useMutation({
    mutationFn: async () =>
      (
        await api.post<KSource>("/ai/knowledge/sources", {
          name,
          source_type: sourceType,
          url: sourceType === "url" ? url : null,
          content: sourceType === "text" ? content : null,
        })
      ).data,
    onSuccess: () => {
      toast.success("Source queued for ingestion");
      setName("");
      setUrl("");
      setContent("");
      void qc.invalidateQueries({ queryKey: ["knowledge-sources"] });
    },
    onError: () => toast.error("Create failed"),
  });

  const reingest = useMutation({
    mutationFn: async (id: string) => api.post(`/ai/knowledge/sources/${id}/reingest`),
    onSuccess: () => {
      toast.success("Reingest queued");
      void qc.invalidateQueries({ queryKey: ["knowledge-sources"] });
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => api.delete(`/ai/knowledge/sources/${id}`),
    onSuccess: () => {
      toast.success("Deleted");
      void qc.invalidateQueries({ queryKey: ["knowledge-sources"] });
    },
  });

  const search = useMutation({
    mutationFn: async () =>
      (await api.post<{ results: SearchResult[] }>("/ai/knowledge/search", { query, top_k: 8 })).data,
    onSuccess: (data) => setResults(data.results),
  });

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
        <div className="flex items-center gap-2 text-lg font-black">
          <BrainCircuit size={20} /> AI Knowledge Sources
        </div>

        <div className="rounded-xl border border-border bg-white p-4 dark:bg-slate-900">
          <div className="mb-3 text-sm font-black uppercase text-slate-500">Add source</div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Name"
              className="rounded border border-border bg-slate-50 px-3 py-2 text-sm dark:bg-slate-800"
            />
            <select
              value={sourceType}
              onChange={(e) => setSourceType(e.target.value as "url" | "text")}
              className="rounded border border-border bg-slate-50 px-3 py-2 text-sm dark:bg-slate-800"
            >
              <option value="url">URL (crawl + extract)</option>
              <option value="text">Pasted text</option>
            </select>
          </div>
          {sourceType === "url" ? (
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://docs.example.com/page"
              className="mt-2 w-full rounded border border-border bg-slate-50 px-3 py-2 text-sm dark:bg-slate-800"
            />
          ) : (
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Paste content"
              rows={4}
              className="mt-2 w-full rounded border border-border bg-slate-50 px-3 py-2 text-sm dark:bg-slate-800"
            />
          )}
          <button
            disabled={!name.trim() || (sourceType === "url" ? !url.trim() : !content.trim()) || create.isPending}
            onClick={() => create.mutate()}
            className="mt-2 rounded bg-purple-600 px-3 py-2 text-sm font-bold text-white hover:bg-purple-700 disabled:opacity-50"
          >
            <Plus size={14} className="inline" /> Add source
          </button>
        </div>

        <div className="rounded-xl border border-border bg-white p-4 dark:bg-slate-900">
          <div className="mb-3 text-sm font-black uppercase text-slate-500">Sources ({sources.length})</div>
          <div className="space-y-2">
            {sources.map((s) => (
              <div key={s.id} className="flex items-center gap-3 rounded border border-border p-2 text-sm">
                {s.source_type === "url" ? <Globe size={14} /> : <FileText size={14} />}
                <div className="flex-1">
                  <div className="font-bold">{s.name}</div>
                  <div className="text-[11px] text-slate-500">
                    {s.url ?? "—"} · {s.chunk_count} chunks · {s.status}
                    {s.error && <span className="text-red-600"> · {s.error}</span>}
                  </div>
                </div>
                <button onClick={() => reingest.mutate(s.id)} className="rounded p-1 hover:bg-slate-100 dark:hover:bg-slate-800">
                  <RefreshCw size={14} />
                </button>
                <button onClick={() => remove.mutate(s.id)} className="rounded p-1 text-red-600 hover:bg-red-50">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            {sources.length === 0 && <div className="px-2 text-xs text-slate-500">No sources yet.</div>}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-white p-4 dark:bg-slate-900">
          <div className="mb-3 flex items-center gap-2 text-sm font-black uppercase text-slate-500">
            <Search size={14} /> Test search
          </div>
          <div className="flex gap-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Query"
              className="flex-1 rounded border border-border bg-slate-50 px-3 py-2 text-sm dark:bg-slate-800"
            />
            <button
              onClick={() => search.mutate()}
              disabled={!query.trim() || search.isPending}
              className="rounded bg-slate-900 px-4 py-2 text-sm font-bold text-white dark:bg-white dark:text-slate-900"
            >
              Search
            </button>
          </div>
          <div className="mt-3 space-y-2">
            {results.map((r, i) => (
              <div key={i} className="rounded border border-border p-2 text-xs">
                <div className="mb-1 text-[11px] text-slate-500">
                  score {Math.round(r.score * 100)}% · {(r.meta as Record<string, string>).title ?? (r.meta as Record<string, string>).name ?? ""}
                </div>
                <div className="whitespace-pre-wrap">{r.content}</div>
              </div>
            ))}
          </div>
        </div>
    </div>
  );
}
