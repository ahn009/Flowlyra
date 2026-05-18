import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Bot, Plus, Save, Trash2, BarChart3 } from "lucide-react";

import { api } from "../lib/api";

interface FlowNode {
  id: string;
  type: "start" | "message" | "question" | "condition" | "action" | "faq" | "handoff";
  text?: string;
  quick_replies?: string[];
  variable?: string;
  condition?: { variable: string; op: string; value: unknown };
  action?: Record<string, unknown>;
  is_start?: boolean;
}

interface FlowEdge {
  from: string;
  to: string;
  branch?: string;
}

interface Flow {
  id: string;
  name: string;
  description: string | null;
  status: string;
  widget_id: string | null;
  trigger: Record<string, unknown>;
  nodes: FlowNode[];
  edges: FlowEdge[];
  variables: Record<string, unknown>;
  ab_variant_of: string | null;
  ab_weight: number;
}

interface Analytics {
  total_sessions: number;
  completed: number;
  handed_off: number;
  completion_rate: number;
}

const emptyFlow = (): Omit<Flow, "id"> => ({
  name: "New Bot",
  description: "",
  status: "draft",
  widget_id: null,
  trigger: {},
  nodes: [{ id: "start", type: "start", text: "Hi! How can I help today?", is_start: true }],
  edges: [],
  variables: {},
  ab_variant_of: null,
  ab_weight: 50,
});

export function ChatbotPage(): JSX.Element {
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Flow | null>(null);

  const { data: flows = [] } = useQuery({
    queryKey: ["chatbot-flows"],
    queryFn: async () => (await api.get<Flow[]>("/chatbot/flows")).data,
  });

  const { data: analytics } = useQuery({
    queryKey: ["chatbot-analytics", selectedId],
    queryFn: async () => (await api.get<Analytics>(`/chatbot/flows/${selectedId}/analytics`)).data,
    enabled: !!selectedId,
  });

  const create = useMutation({
    mutationFn: async () => (await api.post<Flow>("/chatbot/flows", emptyFlow())).data,
    onSuccess: (flow) => {
      void qc.invalidateQueries({ queryKey: ["chatbot-flows"] });
      setSelectedId(flow.id);
      setDraft(flow);
    },
  });

  const save = useMutation({
    mutationFn: async (flow: Flow) => (await api.put<Flow>(`/chatbot/flows/${flow.id}`, flow)).data,
    onSuccess: () => {
      toast.success("Flow saved");
      void qc.invalidateQueries({ queryKey: ["chatbot-flows"] });
    },
    onError: () => toast.error("Save failed"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => api.delete(`/chatbot/flows/${id}`),
    onSuccess: () => {
      toast.success("Flow deleted");
      setSelectedId(null);
      setDraft(null);
      void qc.invalidateQueries({ queryKey: ["chatbot-flows"] });
    },
  });

  const selectedFlow = useMemo(() => flows.find((f) => f.id === selectedId) ?? null, [flows, selectedId]);
  const editing = draft && draft.id === selectedId ? draft : selectedFlow;

  const updateNode = (idx: number, patch: Partial<FlowNode>): void => {
    if (!editing) return;
    const next = [...editing.nodes];
    next[idx] = { ...next[idx], ...patch };
    setDraft({ ...editing, nodes: next });
  };

  const addNode = (type: FlowNode["type"]): void => {
    if (!editing) return;
    const id = `${type}_${Date.now().toString(36)}`;
    const node: FlowNode = { id, type, text: type === "handoff" ? "Connecting you to an agent." : "" };
    setDraft({ ...editing, nodes: [...editing.nodes, node] });
  };

  const addEdge = (from: string, to: string, branch?: string): void => {
    if (!editing) return;
    setDraft({ ...editing, edges: [...editing.edges, { from, to, branch }] });
  };

  return (
    <div className="flex h-full">
        <aside className="w-72 shrink-0 border-r border-border bg-slate-50 p-3 dark:bg-slate-900">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-black"><Bot size={16} /> Chatbots</div>
            <button
              onClick={() => create.mutate()}
              className="rounded bg-purple-600 px-2 py-1 text-xs font-bold text-white hover:bg-purple-700"
            >
              <Plus size={12} className="inline" /> New
            </button>
          </div>
          <div className="space-y-1">
            {flows.map((f) => (
              <button
                key={f.id}
                onClick={() => { setSelectedId(f.id); setDraft(f); }}
                className={`flex w-full items-center justify-between rounded px-2 py-2 text-left text-xs font-bold ${selectedId === f.id ? "bg-purple-100 dark:bg-purple-900/30" : "hover:bg-slate-100 dark:hover:bg-slate-800"}`}
              >
                <span className="truncate">{f.name}</span>
                <span className={`text-[10px] uppercase ${f.status === "active" ? "text-emerald-600" : "text-slate-400"}`}>{f.status}</span>
              </button>
            ))}
            {flows.length === 0 && <div className="px-2 text-xs text-slate-500">No flows yet</div>}
          </div>
        </aside>

        <main className="flex-1 overflow-y-auto p-4">
          {!editing && (
            <div className="grid place-items-center py-20 text-sm text-slate-500">Select or create a flow.</div>
          )}
          {editing && (
            <div className="mx-auto max-w-3xl space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <input
                  value={editing.name}
                  onChange={(e) => setDraft({ ...editing, name: e.target.value })}
                  className="flex-1 rounded border border-border bg-white px-3 py-2 text-sm font-black dark:bg-slate-900"
                />
                <select
                  value={editing.status}
                  onChange={(e) => setDraft({ ...editing, status: e.target.value })}
                  className="rounded border border-border bg-white px-2 py-2 text-xs font-bold dark:bg-slate-900"
                >
                  <option value="draft">Draft</option>
                  <option value="active">Active</option>
                  <option value="archived">Archived</option>
                </select>
                <button
                  onClick={() => save.mutate(editing)}
                  className="rounded bg-slate-900 px-3 py-2 text-xs font-bold text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900"
                >
                  <Save size={12} className="inline" /> Save
                </button>
                <button
                  onClick={() => remove.mutate(editing.id)}
                  className="rounded bg-red-100 px-2 py-2 text-xs font-bold text-red-700 hover:bg-red-200"
                >
                  <Trash2 size={12} />
                </button>
              </div>

              <textarea
                value={editing.description ?? ""}
                onChange={(e) => setDraft({ ...editing, description: e.target.value })}
                placeholder="Description"
                rows={2}
                className="w-full rounded border border-border bg-white px-3 py-2 text-xs dark:bg-slate-900"
              />

              <div className="rounded-lg border border-border bg-white p-3 dark:bg-slate-900">
                <div className="mb-2 text-xs font-black uppercase text-slate-500">Trigger</div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <input
                    placeholder="URL contains"
                    value={(editing.trigger.url_contains as string) ?? ""}
                    onChange={(e) => setDraft({ ...editing, trigger: { ...editing.trigger, url_contains: e.target.value } })}
                    className="rounded border border-border bg-slate-50 px-2 py-1 text-xs"
                  />
                  <input
                    type="number"
                    placeholder="A/B weight"
                    value={editing.ab_weight}
                    onChange={(e) => setDraft({ ...editing, ab_weight: Number(e.target.value || 50) })}
                    className="rounded border border-border bg-slate-50 px-2 py-1 text-xs"
                  />
                </div>
              </div>

              <div className="rounded-lg border border-border bg-white p-3 dark:bg-slate-900">
                <div className="mb-2 flex items-center justify-between">
                  <div className="text-xs font-black uppercase text-slate-500">Nodes ({editing.nodes.length})</div>
                  <div className="flex flex-wrap gap-1">
                    {(["message", "question", "condition", "action", "faq", "handoff"] as const).map((t) => (
                      <button key={t} onClick={() => addNode(t)} className="rounded border border-border px-2 py-1 text-[11px] font-bold hover:bg-slate-100">
                        + {t}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  {editing.nodes.map((node, idx) => (
                    <div key={node.id} className="rounded border border-border p-2">
                      <div className="mb-1 flex items-center gap-2">
                        <span className="rounded bg-purple-100 px-2 py-0.5 text-[10px] font-black uppercase text-purple-700">{node.type}</span>
                        <input
                          value={node.id}
                          onChange={(e) => updateNode(idx, { id: e.target.value })}
                          className="flex-1 rounded border border-border bg-slate-50 px-2 py-1 text-xs font-mono"
                        />
                      </div>
                      {(node.type === "message" || node.type === "question" || node.type === "handoff") && (
                        <textarea
                          value={node.text ?? ""}
                          onChange={(e) => updateNode(idx, { text: e.target.value })}
                          placeholder="Text"
                          rows={2}
                          className="w-full rounded border border-border bg-slate-50 px-2 py-1 text-xs"
                        />
                      )}
                      {node.type === "question" && (
                        <input
                          value={node.variable ?? ""}
                          onChange={(e) => updateNode(idx, { variable: e.target.value })}
                          placeholder="Save answer to variable"
                          className="mt-1 w-full rounded border border-border bg-slate-50 px-2 py-1 text-xs"
                        />
                      )}
                      {node.type === "condition" && (
                        <div className="grid grid-cols-3 gap-1">
                          <input
                            placeholder="variable"
                            value={node.condition?.variable ?? ""}
                            onChange={(e) => updateNode(idx, { condition: { ...(node.condition ?? { op: "eq", value: "" }), variable: e.target.value } })}
                            className="rounded border border-border bg-slate-50 px-2 py-1 text-xs"
                          />
                          <select
                            value={node.condition?.op ?? "eq"}
                            onChange={(e) => updateNode(idx, { condition: { ...(node.condition ?? { variable: "", value: "" }), op: e.target.value } })}
                            className="rounded border border-border bg-slate-50 px-2 py-1 text-xs"
                          >
                            <option value="eq">eq</option>
                            <option value="neq">neq</option>
                            <option value="contains">contains</option>
                            <option value="gt">gt</option>
                            <option value="lt">lt</option>
                          </select>
                          <input
                            placeholder="value"
                            value={String(node.condition?.value ?? "")}
                            onChange={(e) => updateNode(idx, { condition: { ...(node.condition ?? { variable: "", op: "eq" }), value: e.target.value } })}
                            className="rounded border border-border bg-slate-50 px-2 py-1 text-xs"
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border border-border bg-white p-3 dark:bg-slate-900">
                <div className="mb-2 text-xs font-black uppercase text-slate-500">Edges</div>
                <EdgeEditor flow={editing} onAdd={addEdge} onRemove={(i) => setDraft({ ...editing, edges: editing.edges.filter((_, idx) => idx !== i) })} />
              </div>

              {selectedId && analytics && (
                <div className="rounded-lg border border-border bg-white p-3 dark:bg-slate-900">
                  <div className="mb-2 flex items-center gap-2 text-xs font-black uppercase text-slate-500"><BarChart3 size={12} /> Analytics</div>
                  <div className="grid grid-cols-4 gap-2 text-center">
                    <Stat label="Sessions" value={analytics.total_sessions} />
                    <Stat label="Completed" value={analytics.completed} />
                    <Stat label="Handed off" value={analytics.handed_off} />
                    <Stat label="Completion" value={`${analytics.completion_rate}%`} />
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
    </div>
  );
}

function EdgeEditor({ flow, onAdd, onRemove }: { flow: Flow; onAdd: (from: string, to: string, branch?: string) => void; onRemove: (idx: number) => void }): JSX.Element {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [branch, setBranch] = useState("");
  return (
    <div className="space-y-2">
      {flow.edges.map((e, i) => (
        <div key={i} className="flex items-center gap-2 text-xs">
          <span className="rounded bg-slate-100 px-2 py-1 font-mono">{e.from}</span>
          <span>→</span>
          <span className="rounded bg-slate-100 px-2 py-1 font-mono">{e.to}</span>
          {e.branch && <span className="rounded bg-amber-100 px-2 py-1 text-amber-700">{e.branch}</span>}
          <button onClick={() => onRemove(i)} className="ml-auto text-red-600">×</button>
        </div>
      ))}
      <div className="grid grid-cols-4 gap-1">
        <select value={from} onChange={(e) => setFrom(e.target.value)} className="rounded border border-border bg-slate-50 px-2 py-1 text-xs">
          <option value="">From</option>
          {flow.nodes.map((n) => <option key={n.id} value={n.id}>{n.id}</option>)}
        </select>
        <select value={to} onChange={(e) => setTo(e.target.value)} className="rounded border border-border bg-slate-50 px-2 py-1 text-xs">
          <option value="">To</option>
          {flow.nodes.map((n) => <option key={n.id} value={n.id}>{n.id}</option>)}
        </select>
        <input value={branch} onChange={(e) => setBranch(e.target.value)} placeholder="branch (true/false)" className="rounded border border-border bg-slate-50 px-2 py-1 text-xs" />
        <button
          onClick={() => { if (from && to) { onAdd(from, to, branch || undefined); setFrom(""); setTo(""); setBranch(""); } }}
          className="rounded bg-slate-900 px-2 py-1 text-xs font-bold text-white"
        >
          Add edge
        </button>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }): JSX.Element {
  return (
    <div className="rounded-lg bg-slate-50 p-2 dark:bg-slate-800">
      <div className="text-[10px] font-black uppercase text-slate-500">{label}</div>
      <div className="text-lg font-black">{value}</div>
    </div>
  );
}
