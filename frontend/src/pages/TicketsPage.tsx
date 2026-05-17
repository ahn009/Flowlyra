import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { Search, Ticket as TicketIcon, Wand2 } from "lucide-react";
import { api } from "../lib/api";
import { Badge, PageHeader } from "../components/AgentLayout";
import { Button, Card, EmptyPanel, PageShell, TextArea, TextInput } from "../components/ui";
import { activeSocket } from "../socket";
import type { Ticket, User } from "../types";

const statusOptions = ["open", "pending", "onhold", "solved", "resolved", "closed", "spam"] as const;
const priorityOptions = ["low", "normal", "high", "urgent"] as const;

export function TicketsPage(): JSX.Element {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<(typeof priorityOptions)[number]>("normal");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const { data = [], isLoading } = useQuery({
    queryKey: ["tickets", statusFilter, searchQuery],
    queryFn: async () => {
      const { data } = await api.get<Ticket[]>("/tickets", {
        params: {
          status: statusFilter !== "all" ? statusFilter : undefined,
          q: searchQuery || undefined,
        },
      });
      return data;
    },
  });

  const createTicket = useMutation({
    mutationFn: async () => {
      await api.post("/tickets", {
        subject,
        description: description || undefined,
        priority,
        status: "open",
      });
    },
    onSuccess: async () => {
      toast.success("Ticket created");
      setSubject("");
      setDescription("");
      setPriority("normal");
      setCreating(false);
      await queryClient.invalidateQueries({ queryKey: ["tickets"] });
    },
    onError: () => toast.error("Could not create ticket"),
  });

  const bulkClose = useMutation({
    mutationFn: async () => api.post("/tickets/bulk", { ticket_ids: selectedIds, action: "close", status: "closed" }),
    onSuccess: async () => {
      toast.success("Bulk action complete");
      setSelectedIds([]);
      await queryClient.invalidateQueries({ queryKey: ["tickets"] });
    },
    onError: () => toast.error("Bulk action failed"),
  });

  const exportCsv = async (): Promise<void> => {
    try {
      const response = await api.get("/tickets/export.csv", { responseType: "blob" });
      const blob = new Blob([response.data], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "tickets.csv";
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Could not export CSV");
    }
  };

  const filtered = useMemo(() => data, [data]);

  const toggle = (id: string): void => {
    setSelectedIds((state) => (state.includes(id) ? state.filter((item) => item !== id) : [...state, id]));
  };

  return (
    <PageShell>
      <PageHeader
        title="Tickets"
        action={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => void exportCsv()}>Export CSV</Button>
            <Button variant="primary" onClick={() => setCreating((value) => !value)}>{creating ? "Close" : "New ticket"}</Button>
          </div>
        }
      />
      {creating && (
        <div className="border-b border-border bg-white dark:bg-slate-900 p-4">
          <Card className="p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-2 text-sm font-semibold text-slate-700 sm:col-span-2">
                Subject
                <TextInput value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="Ticket subject" />
              </label>
              <label className="grid gap-2 text-sm font-semibold text-slate-700 sm:col-span-2">
                Description
                <TextArea className="min-h-28" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Describe the issue" />
              </label>
              <label className="grid gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                Priority
                <select className="h-10 rounded-lg border border-border bg-white px-3 dark:bg-slate-900 dark:text-slate-100" value={priority} onChange={(event) => setPriority(event.target.value as (typeof priorityOptions)[number])}>
                  {priorityOptions.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </label>
            </div>
            <div className="mt-4 flex gap-2">
              <Button variant="primary" disabled={!subject.trim() || createTicket.isPending} onClick={() => createTicket.mutate()}>{createTicket.isPending ? "Creating..." : "Create ticket"}</Button>
              <Button variant="secondary" onClick={() => setCreating(false)}>Cancel</Button>
            </div>
          </Card>
        </div>
      )}
      <div className="border-b border-border bg-white dark:bg-slate-900 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="-mx-1 flex gap-2 overflow-x-auto px-1">
            {["all", ...statusOptions].map((status) => (
              <Button key={status} size="sm" variant={statusFilter === status ? "primary" : "secondary"} onClick={() => setStatusFilter(status)}>{status}</Button>
            ))}
          </div>
          <div className="flex gap-2">
            {selectedIds.length > 0 && <Button size="sm" variant="secondary" onClick={() => bulkClose.mutate()}>Close selected ({selectedIds.length})</Button>}
            <label className="flex min-w-0 items-center gap-2 rounded-lg border border-border bg-white dark:bg-slate-900 px-3 text-sm text-slate-500 focus-within:border-blue-300 focus-within:ring-4 focus-within:ring-blue-100 lg:w-72">
              <Search size={16} /><TextInput className="border-0 px-0 focus:ring-0" placeholder="Search tickets" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} />
            </label>
          </div>
        </div>
      </div>
      <div className="p-4 sm:p-6">
        <Card className="overflow-hidden">
          {isLoading ? (
            <div className="p-4 text-sm font-semibold text-slate-500 dark:text-slate-400">Loading tickets...</div>
          ) : filtered.length ? (
            <div className="divide-y divide-border">
              {filtered.map((ticket) => (
                <div key={ticket.id} className="grid gap-2 px-4 py-4 transition hover:bg-slate-50 dark:bg-slate-800/50 md:grid-cols-[26px_90px_minmax(0,1fr)_110px_110px_150px] md:items-center md:gap-3 md:px-5">
                  <input type="checkbox" checked={selectedIds.includes(ticket.id)} onChange={() => toggle(ticket.id)} />
                  <Link to={`/ticket/${ticket.id}`} className="font-semibold text-slate-950 dark:text-slate-100">#{ticket.ticket_number}</Link>
                  <Link to={`/ticket/${ticket.id}`} className="min-w-0 truncate text-sm font-semibold text-slate-800 dark:text-slate-200">{ticket.subject}</Link>
                  <Badge tone={`status-${ticket.status}`}>{ticket.status}</Badge>
                  <Badge tone={`priority-${ticket.priority}`}>{ticket.priority}</Badge>
                  <span className="text-xs font-semibold text-slate-500 md:text-sm">{new Date(ticket.updated_at).toLocaleString()}</span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyPanel icon={<TicketIcon size={22} />} title="No tickets yet" description="Escalated conversations and follow-up work will appear here." />
          )}
        </Card>
      </div>
    </PageShell>
  );
}

export function TicketDetailPage(): JSX.Element {
  const { id = "" } = useParams();
  const queryClient = useQueryClient();
  const [content, setContent] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [statusValue, setStatusValue] = useState<string>("open");
  const [priorityValue, setPriorityValue] = useState<string>("normal");
  const [assignedUserId, setAssignedUserId] = useState<string>("");
  const [markdownMode, setMarkdownMode] = useState(false);
  const [mergeIds, setMergeIds] = useState("");
  const [splitSubject, setSplitSubject] = useState("");
  const [timeMinutes, setTimeMinutes] = useState(15);
  const [timeNote, setTimeNote] = useState("");
  const [presenceCount, setPresenceCount] = useState(1);

  const { data, isLoading } = useQuery({ queryKey: ["ticket", id], queryFn: async () => (await api.get(`/tickets/${id}`)).data, enabled: Boolean(id) });
  const { data: agents = [] } = useQuery({ queryKey: ["agents", "tickets"], queryFn: async () => (await api.get<User[]>("/agents")).data });
  const { data: canned = [] } = useQuery({ queryKey: ["canned", "tickets"], queryFn: async () => (await api.get("/admin/canned-responses")).data as Array<{ id: string; title: string; content: string }> });

  useEffect(() => {
    if (!id) return;
    activeSocket()?.emit("ticket:view:start", { ticket_id: id });
    const onPresence = (payload: { ticket_id: string; viewers: number }) => {
      if (payload.ticket_id === id) setPresenceCount(payload.viewers);
    };
    activeSocket()?.on("ticket:presence", onPresence);
    const timer = window.setInterval(() => {
      void api.post(`/tickets/${id}/presence/start`);
    }, 30000);
    return () => {
      window.clearInterval(timer);
      activeSocket()?.emit("ticket:view:stop", { ticket_id: id });
      activeSocket()?.off("ticket:presence", onPresence);
      void api.post(`/tickets/${id}/presence/stop`);
    };
  }, [id]);

  const saveMeta = useMutation({
    mutationFn: async () => api.patch(`/tickets/${id}`, { status: statusValue, priority: priorityValue, assigned_user_id: assignedUserId || null }),
    onSuccess: async () => {
      toast.success("Ticket updated");
      await queryClient.invalidateQueries({ queryKey: ["ticket", id] });
      await queryClient.invalidateQueries({ queryKey: ["tickets"] });
    },
    onError: () => toast.error("Could not update ticket"),
  });

  const resolveTicket = useMutation({
    mutationFn: async () => api.post(`/tickets/${id}/resolve`),
    onSuccess: async () => {
      toast.success("Ticket resolved");
      await queryClient.invalidateQueries({ queryKey: ["ticket", id] });
      await queryClient.invalidateQueries({ queryKey: ["tickets"] });
    },
    onError: () => toast.error("Could not resolve ticket"),
  });

  const addComment = useMutation({
    mutationFn: async () => api.post(`/tickets/${id}/comments`, { content, is_internal: isInternal, content_format: markdownMode ? "markdown" : "plain" }),
    onSuccess: async () => {
      setContent("");
      setIsInternal(false);
      await queryClient.invalidateQueries({ queryKey: ["ticket", id] });
    },
    onError: () => toast.error("Could not add comment"),
  });

  const followMutation = useMutation({ mutationFn: async () => api.post(`/tickets/${id}/follow`) });
  const mergeMutation = useMutation({
    mutationFn: async () => {
      const ids = mergeIds.split(",").map((v) => v.trim()).filter(Boolean);
      await api.post(`/tickets/${id}/merge`, ids);
    },
    onSuccess: async () => {
      toast.success("Tickets merged");
      await queryClient.invalidateQueries({ queryKey: ["ticket", id] });
      await queryClient.invalidateQueries({ queryKey: ["tickets"] });
    },
    onError: () => toast.error("Merge failed"),
  });
  const splitMutation = useMutation({
    mutationFn: async () => api.post(`/tickets/${id}/split`, { subject: splitSubject || "Split task", description: content || "" }),
    onSuccess: async () => {
      toast.success("Ticket split created");
      setSplitSubject("");
      await queryClient.invalidateQueries({ queryKey: ["ticket", id] });
      await queryClient.invalidateQueries({ queryKey: ["tickets"] });
    },
  });
  const timeMutation = useMutation({
    mutationFn: async () => api.post(`/tickets/${id}/time-entries`, { minutes: timeMinutes, note: timeNote || null }),
    onSuccess: async () => {
      toast.success("Time logged");
      setTimeNote("");
      await queryClient.invalidateQueries({ queryKey: ["ticket", id] });
    },
  });
  const aiSuggest = useMutation({
    mutationFn: async () => (await api.post(`/tickets/${id}/ai/suggest`)).data as { suggestions: string[] },
    onSuccess: (payload) => {
      if (payload.suggestions?.length) setContent(payload.suggestions[0]);
    },
  });
  const aiSummary = useMutation({
    mutationFn: async () => (await api.post(`/tickets/${id}/ai/summarize`)).data as { summary: string },
    onSuccess: (payload) => toast(payload.summary.slice(0, 240)),
  });

  const ticket = data?.ticket as Ticket | undefined;
  useEffect(() => {
    if (!ticket) return;
    setStatusValue(ticket.status);
    setPriorityValue(ticket.priority);
    setAssignedUserId(ticket.assigned_user_id ?? "");
  }, [ticket?.id, ticket?.status, ticket?.priority, ticket?.assigned_user_id]);

  if (isLoading) {
    return (
      <PageShell>
        <PageHeader title="Ticket" />
        <div className="p-6 text-sm font-semibold text-slate-500 dark:text-slate-400">Loading ticket...</div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHeader title={ticket?.subject ?? "Ticket"} action={<div className="text-xs font-black text-amber-600">Viewers: {presenceCount}</div>} />
      <div className="grid grid-cols-1 gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_360px] lg:p-6">
        <Card className="min-h-[420px] p-4 sm:p-6">
          {data?.linked_chat_id && <Link className="mb-4 block rounded-lg border border-blue-200 bg-blue-50 p-3 text-primary" to={`/inbox/chat/${data.linked_chat_id}`}>View original chat</Link>}
          <div className="grid gap-2 sm:grid-cols-2">
            <Button variant="secondary" onClick={() => followMutation.mutate()}>Follow ticket</Button>
            <Button variant="secondary" onClick={() => aiSuggest.mutate()}><Wand2 size={14} /> AI draft reply</Button>
            <Button variant="secondary" onClick={() => aiSummary.mutate()}><Wand2 size={14} /> AI summarize</Button>
          </div>
          <div className="mt-4 rounded-lg border border-border p-3">
            <div className="text-xs font-black uppercase tracking-wide text-slate-500">Activity timeline</div>
            <div className="mt-2 grid gap-2">
              {(data?.activity ?? []).slice(0, 12).map((item: { id: string; title: string; event_type: string; created_at: string; body?: string }) => (
                <div key={item.id} className="rounded-lg border border-border bg-slate-50 p-2 text-xs">
                  <div className="font-bold">{item.title}</div>
                  {item.body ? <div className="text-slate-600">{item.body}</div> : null}
                  <div className="text-slate-400">{item.event_type} · {new Date(item.created_at).toLocaleString()}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-4 grid gap-3">
            {(data?.comments ?? []).map((comment: { id: string; content: string; is_internal: boolean; content_format?: string }) => (
              <div key={comment.id} className={`rounded-lg border p-3 text-sm ${comment.is_internal ? "border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-200" : "border-border bg-white dark:bg-slate-800 dark:text-slate-200"}`}>
                <div className="mb-1 text-[11px] font-black uppercase text-slate-500">{comment.content_format ?? "plain"}</div>
                {comment.content}
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {canned.slice(0, 6).map((item) => <Button key={item.id} size="sm" variant="secondary" onClick={() => setContent(item.content)}>{item.title}</Button>)}
          </div>
          <TextArea className="mt-4 min-h-28" placeholder="Add comment (supports @mentions)" value={content} onChange={(event) => setContent(event.target.value)} />
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-400">
              <input type="checkbox" checked={isInternal} onChange={(event) => setIsInternal(event.target.checked)} /> Internal note
            </label>
            <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-400">
              <input type="checkbox" checked={markdownMode} onChange={(event) => setMarkdownMode(event.target.checked)} /> Markdown mode
            </label>
          </div>
          <div className="mt-4 flex gap-2">
            <Button variant="primary" disabled={!content.trim() || addComment.isPending} onClick={() => addComment.mutate()}>{addComment.isPending ? "Saving..." : "Add comment"}</Button>
          </div>
        </Card>
        <Card className="p-4">
          <h2 className="font-bold">Details</h2>
          <div className="mt-3 grid gap-3">
            <label className="grid gap-1 text-sm font-semibold text-slate-700 dark:text-slate-300">
              Status
              <select className="h-10 rounded-lg border border-border bg-white px-3 dark:bg-slate-900 dark:text-slate-100" value={statusValue} onChange={(event) => setStatusValue(event.target.value)}>
                {statusOptions.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
            <label className="grid gap-1 text-sm font-semibold text-slate-700 dark:text-slate-300">
              Priority
              <select className="h-10 rounded-lg border border-border bg-white px-3 dark:bg-slate-900 dark:text-slate-100" value={priorityValue} onChange={(event) => setPriorityValue(event.target.value)}>
                {priorityOptions.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
            <label className="grid gap-1 text-sm font-semibold text-slate-700 dark:text-slate-300">
              Assignee
              <select className="h-10 rounded-lg border border-border bg-white px-3 dark:bg-slate-900 dark:text-slate-100" value={assignedUserId} onChange={(event) => setAssignedUserId(event.target.value)}>
                <option value="">Unassigned</option>
                {agents.map((agent) => <option key={agent.id} value={agent.id}>{agent.full_name}</option>)}
              </select>
            </label>
            <div className="rounded-lg border border-border p-3 text-sm text-slate-600 dark:text-slate-400">
              Ticket #{ticket?.ticket_number ?? "-"}
              <div>SLA first response: {ticket?.sla_first_response_due_at ? new Date(ticket.sla_first_response_due_at).toLocaleString() : "-"}</div>
              <div>SLA resolution: {ticket?.sla_resolution_due_at ? new Date(ticket.sla_resolution_due_at).toLocaleString() : "-"}</div>
              <div>Portal enabled: {ticket?.portal_enabled ? "Yes" : "No"}</div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="primary" disabled={saveMeta.isPending} onClick={() => saveMeta.mutate()}>{saveMeta.isPending ? "Saving..." : "Save changes"}</Button>
              <Button variant="secondary" disabled={resolveTicket.isPending || ticket?.status === "resolved"} onClick={() => resolveTicket.mutate()}>{resolveTicket.isPending ? "Resolving..." : "Resolve"}</Button>
            </div>
            <div className="rounded-lg border border-border p-3">
              <div className="text-xs font-black uppercase tracking-wide text-slate-500">Merge tickets</div>
              <TextInput value={mergeIds} onChange={(e) => setMergeIds(e.target.value)} placeholder="Ticket IDs comma separated" />
              <Button className="mt-2" size="sm" variant="secondary" onClick={() => mergeMutation.mutate()}>Merge into this ticket</Button>
            </div>
            <div className="rounded-lg border border-border p-3">
              <div className="text-xs font-black uppercase tracking-wide text-slate-500">Split ticket</div>
              <TextInput value={splitSubject} onChange={(e) => setSplitSubject(e.target.value)} placeholder="New split ticket subject" />
              <Button className="mt-2" size="sm" variant="secondary" onClick={() => splitMutation.mutate()}>Create split ticket</Button>
            </div>
            <div className="rounded-lg border border-border p-3">
              <div className="text-xs font-black uppercase tracking-wide text-slate-500">Time tracking</div>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <TextInput type="number" value={String(timeMinutes)} onChange={(e) => setTimeMinutes(Number(e.target.value || 0))} />
                <TextInput value={timeNote} onChange={(e) => setTimeNote(e.target.value)} placeholder="Work note" />
              </div>
              <Button className="mt-2" size="sm" variant="secondary" onClick={() => timeMutation.mutate()}>Log time</Button>
            </div>
          </div>
        </Card>
      </div>
    </PageShell>
  );
}
