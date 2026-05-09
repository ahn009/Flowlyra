import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { Search, Ticket as TicketIcon } from "lucide-react";
import { api } from "../lib/api";
import { Badge, PageHeader } from "../components/AgentLayout";
import { Button, Card, EmptyPanel, PageShell, TextArea, TextInput } from "../components/ui";
import type { Ticket } from "../types";

const statusOptions = ["open", "pending", "resolved"] as const;
const priorityOptions = ["low", "medium", "high", "urgent"] as const;

export function TicketsPage(): JSX.Element {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<(typeof priorityOptions)[number]>("medium");

  const { data = [], isLoading } = useQuery({
    queryKey: ["tickets", statusFilter, searchQuery],
    queryFn: async () => {
      const { data } = await api.get<Ticket[]>("/tickets", {
        params: {
          status: statusFilter !== "all" ? statusFilter : undefined,
          q: searchQuery || undefined
        }
      });
      return data;
    }
  });

  const createTicket = useMutation({
    mutationFn: async () => {
      await api.post("/tickets", {
        subject,
        description: description || undefined,
        priority
      });
    },
    onSuccess: async () => {
      toast.success("Ticket created");
      setSubject("");
      setDescription("");
      setPriority("medium");
      setCreating(false);
      await queryClient.invalidateQueries({ queryKey: ["tickets"] });
    },
    onError: () => toast.error("Could not create ticket")
  });

  const filtered = useMemo(() => data, [data]);

  return (
    <PageShell>
      <PageHeader title="Tickets" action={<Button variant="primary" onClick={() => setCreating((value) => !value)}>{creating ? "Close" : "New ticket"}</Button>} />
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
          <label className="flex min-w-0 items-center gap-2 rounded-lg border border-border bg-white dark:bg-slate-900 px-3 text-sm text-slate-500 focus-within:border-blue-300 focus-within:ring-4 focus-within:ring-blue-100 lg:w-72">
            <Search size={16} /><TextInput className="border-0 px-0 focus:ring-0" placeholder="Search tickets" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} />
          </label>
        </div>
      </div>
      <div className="p-4 sm:p-6">
        <Card className="overflow-hidden">
          {isLoading ? (
            <div className="p-4 text-sm font-semibold text-slate-500 dark:text-slate-400">Loading tickets...</div>
          ) : filtered.length ? (
            <div className="divide-y divide-border">
              {filtered.map((ticket) => (
                <Link key={ticket.id} to={`/ticket/${ticket.id}`} className="grid gap-2 px-4 py-4 outline-none transition hover:bg-slate-50 dark:bg-slate-800/50 focus-visible:bg-blue-50 md:grid-cols-[90px_minmax(0,1fr)_110px_110px_150px] md:items-center md:gap-3 md:px-5">
                  <span className="font-semibold text-slate-950 dark:text-slate-100">#{ticket.ticket_number}</span>
                  <span className="min-w-0 truncate text-sm font-semibold text-slate-800 dark:text-slate-200">{ticket.subject}</span>
                  <Badge tone={`status-${ticket.status}`}>{ticket.status}</Badge>
                  <Badge tone={`priority-${ticket.priority}`}>{ticket.priority}</Badge>
                  <span className="text-xs font-semibold text-slate-500 md:text-sm">{new Date(ticket.updated_at).toLocaleString()}</span>
                </Link>
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

  const { data, isLoading } = useQuery({ queryKey: ["ticket", id], queryFn: async () => (await api.get(`/tickets/${id}`)).data, enabled: Boolean(id) });

  const [statusValue, setStatusValue] = useState<string>("open");
  const [priorityValue, setPriorityValue] = useState<string>("medium");

  const saveMeta = useMutation({
    mutationFn: async () => api.patch(`/tickets/${id}`, { status: statusValue, priority: priorityValue }),
    onSuccess: async () => {
      toast.success("Ticket updated");
      await queryClient.invalidateQueries({ queryKey: ["ticket", id] });
      await queryClient.invalidateQueries({ queryKey: ["tickets"] });
    },
    onError: () => toast.error("Could not update ticket")
  });

  const resolveTicket = useMutation({
    mutationFn: async () => api.post(`/tickets/${id}/resolve`),
    onSuccess: async () => {
      toast.success("Ticket resolved");
      await queryClient.invalidateQueries({ queryKey: ["ticket", id] });
      await queryClient.invalidateQueries({ queryKey: ["tickets"] });
    },
    onError: () => toast.error("Could not resolve ticket")
  });

  const addComment = useMutation({
    mutationFn: async () => api.post(`/tickets/${id}/comments`, { content, is_internal: isInternal }),
    onSuccess: async () => {
      setContent("");
      setIsInternal(false);
      await queryClient.invalidateQueries({ queryKey: ["ticket", id] });
    },
    onError: () => toast.error("Could not add comment")
  });

  const ticket = data?.ticket as Ticket | undefined;
  useEffect(() => {
    if (!ticket) return;
    setStatusValue(ticket.status);
    setPriorityValue(ticket.priority);
  }, [ticket?.id, ticket?.status, ticket?.priority]);

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
      <PageHeader title={ticket?.subject ?? "Ticket"} />
      <div className="grid grid-cols-1 gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_320px] lg:p-6">
        <Card className="min-h-[420px] p-4 sm:p-6">
          {data?.linked_chat_id && <Link className="mb-4 block rounded-lg border border-blue-200 bg-blue-50 p-3 text-primary" to={`/chat/${data.linked_chat_id}`}>View original chat</Link>}
          <div className="grid gap-3">
            {(data?.comments ?? []).map((comment: { id: string; content: string; is_internal: boolean }) => (
              <div key={comment.id} className={`rounded-lg border p-3 text-sm ${comment.is_internal ? "border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-200" : "border-border bg-white dark:bg-slate-800 dark:text-slate-200"}`}>{comment.content}</div>
            ))}
          </div>
          <TextArea className="mt-4 min-h-28" placeholder="Add comment" value={content} onChange={(event) => setContent(event.target.value)} />
          <label className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-400">
            <input type="checkbox" checked={isInternal} onChange={(event) => setIsInternal(event.target.checked)} /> Internal note
          </label>
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
            <div className="rounded-lg border border-border p-3 text-sm text-slate-600 dark:text-slate-400">Ticket #{ticket?.ticket_number ?? "-"}</div>
            <div className="flex flex-wrap gap-2">
              <Button variant="primary" disabled={saveMeta.isPending} onClick={() => saveMeta.mutate()}>{saveMeta.isPending ? "Saving..." : "Save changes"}</Button>
              <Button variant="secondary" disabled={resolveTicket.isPending || ticket?.status === "resolved"} onClick={() => resolveTicket.mutate()}>{resolveTicket.isPending ? "Resolving..." : "Resolve"}</Button>
            </div>
          </div>
        </Card>
      </div>
    </PageShell>
  );
}
