import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { Search, Ticket as TicketIcon } from "lucide-react";
import { api } from "../lib/api";
import { Badge, PageHeader } from "../components/AgentLayout";
import { Button, Card, EmptyPanel, PageShell, TextArea, TextInput } from "../components/ui";
import type { Ticket } from "../types";

export function TicketsPage(): JSX.Element {
  const { data = [] } = useQuery({ queryKey: ["tickets"], queryFn: async () => (await api.get<Ticket[]>("/tickets")).data });
  return (
    <PageShell>
      <PageHeader title="Tickets" action={<Button variant="primary">New ticket</Button>} />
      <div className="border-b border-border bg-white p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="-mx-1 flex gap-2 overflow-x-auto px-1">
            {["open", "pending", "resolved"].map((status) => <Button key={status} size="sm" variant="secondary">{status}</Button>)}
          </div>
          <label className="flex min-w-0 items-center gap-2 rounded-lg border border-border bg-white px-3 text-sm text-slate-500 focus-within:border-blue-300 focus-within:ring-4 focus-within:ring-blue-100 lg:w-72">
            <Search size={16} /><TextInput className="border-0 px-0 focus:ring-0" placeholder="Search tickets" />
          </label>
        </div>
      </div>
      <div className="p-4 sm:p-6">
        <Card className="overflow-hidden">
          {data.length ? (
            <div className="divide-y divide-border">
              {data.map((ticket) => (
                <Link key={ticket.id} to={`/ticket/${ticket.id}`} className="grid gap-2 px-4 py-4 outline-none transition hover:bg-slate-50 focus-visible:bg-blue-50 md:grid-cols-[90px_minmax(0,1fr)_110px_110px_150px] md:items-center md:gap-3 md:px-5">
                  <span className="font-semibold text-slate-950">#{ticket.ticket_number}</span>
                  <span className="min-w-0 truncate text-sm font-semibold text-slate-800">{ticket.subject}</span>
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
  const { data } = useQuery({ queryKey: ["ticket", id], queryFn: async () => (await api.get(`/tickets/${id}`)).data, enabled: Boolean(id) });
  return (
    <PageShell>
      <PageHeader title={data?.ticket?.subject ?? "Ticket"} />
      <div className="grid grid-cols-1 gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_320px] lg:p-6">
        <Card className="min-h-[420px] p-4 sm:p-6">
          {data?.linked_chat_id && <Link className="mb-4 block rounded-lg border border-blue-200 bg-blue-50 p-3 text-primary" to={`/chat/${data.linked_chat_id}`}>View original chat</Link>}
          <div className="grid gap-3">
            {(data?.comments ?? []).map((comment: { id: string; content: string; is_internal: boolean }) => (
              <div key={comment.id} className={`rounded-lg border p-3 ${comment.is_internal ? "border-amber-200 bg-amber-50" : "border-border bg-white"}`}>{comment.content}</div>
            ))}
          </div>
          <TextArea className="mt-4 min-h-28" placeholder="Add comment" />
        </Card>
        <Card className="p-4">
          <h2 className="font-bold">Details</h2>
          <div className="mt-3 rounded-lg border border-border p-3 text-sm text-slate-600">SLA timer and contact information</div>
        </Card>
      </div>
    </PageShell>
  );
}
