import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { api } from "../lib/api";
import { PageHeader } from "../components/AgentLayout";
import { Button, Card, EmptyPanel, Field, PageShell, TextInput } from "../components/ui";

interface TagRow {
  key: string;
  label: string;
  color: string;
  usage_count?: number;
}

export function TagsPage(): JSX.Element {
  const queryClient = useQueryClient();
  const { data: tags = [] } = useQuery({ queryKey: ["chat-tags"], queryFn: async () => (await api.get<TagRow[]>("/admin/tags")).data });
  const [label, setLabel] = useState("");
  const [color, setColor] = useState("#64748b");

  const saveMutation = useMutation({
    mutationFn: async () => api.post("/admin/tags", { label, color }),
    onSuccess: async () => {
      setLabel("");
      await queryClient.invalidateQueries({ queryKey: ["chat-tags"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (key: string) => api.delete(`/admin/tags/${key}`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["chat-tags"] });
    },
  });

  return (
    <PageShell>
      <PageHeader title="Tags" />
      <div className="grid grid-cols-1 gap-4 p-4 lg:grid-cols-[minmax(320px,420px)_minmax(0,1fr)] lg:gap-6 lg:p-6">
        <Card className="p-4">
          <h2 className="text-lg font-black text-slate-950 dark:text-slate-100">Create tag</h2>
          <div className="mt-3 grid gap-3">
            <Field label="Label"><TextInput value={label} onChange={(event) => setLabel(event.target.value)} placeholder="VIP" /></Field>
            <Field label="Color"><input type="color" className="h-10 w-full rounded border border-border p-1" value={color} onChange={(event) => setColor(event.target.value)} /></Field>
            <Button variant="primary" disabled={saveMutation.isPending || !label.trim()} onClick={() => saveMutation.mutate()}>{saveMutation.isPending ? "Saving..." : "Save tag"}</Button>
          </div>
        </Card>
        <Card className="overflow-hidden">
          <div className="border-b border-border px-4 py-3 text-sm font-black uppercase tracking-wide text-slate-500">Tag library</div>
          {tags.length ? (
            <div className="divide-y divide-border">
              {tags.map((tag) => (
                <div key={tag.key} className="flex items-center justify-between gap-3 p-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="inline-block h-4 w-4 rounded-full" style={{ backgroundColor: tag.color }} />
                    <div>
                      <div className="font-bold text-slate-900 dark:text-slate-100">{tag.label}</div>
                      <div className="text-xs text-slate-500">/{tag.key} • used {tag.usage_count ?? 0} times</div>
                    </div>
                  </div>
                  <Button size="sm" variant="danger" onClick={() => deleteMutation.mutate(tag.key)}>Delete</Button>
                </div>
              ))}
            </div>
          ) : (
            <EmptyPanel title="No tags yet" description="Create tags for quick conversation categorization." />
          )}
        </Card>
      </div>
    </PageShell>
  );
}
