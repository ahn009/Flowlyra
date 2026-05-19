import { useQuery } from "@tanstack/react-query";
import { Download, Filter, MessageSquare } from "lucide-react";
import { Link } from "react-router-dom";
import { PageHeader } from "../components/AgentLayout";
import { Card, EmptyPanel, Field, PageShell, Pill, SelectInput, TextInput } from "../components/ui";
import { api } from "../lib/api";
import type { Chat } from "../types";

export function ArchivesPage(): JSX.Element {
  const { data = [] } = useQuery({
    queryKey: ["archives"],
    queryFn: async () => (await api.get<Chat[]>("/chats", { params: { status: "resolved", limit: 100 } })).data
  });

  return (
    <PageShell>
      <PageHeader title="Archives" action={<div className="inline-flex items-center gap-2 text-sm font-semibold text-navy-400"><Filter size={16} /> Resolved chat history</div>} />
      <div className="grid gap-4 p-4 sm:p-6">
        <Card className="p-4">
          <div className="grid gap-3 md:grid-cols-4">
            <Field label="Search"><TextInput placeholder="Customer, email, message" /></Field>
            <Field label="Status"><SelectInput defaultValue="resolved"><option value="resolved">Resolved</option><option value="closed">Closed</option><option value="active">Active</option></SelectInput></Field>
            <Field label="Channel"><SelectInput defaultValue=""><option value="">All channels</option><option value="widget">Widget</option></SelectInput></Field>
            <Field label="Rating"><SelectInput defaultValue=""><option value="">Any rating</option><option value="5">5 stars</option><option value="1">Needs attention</option></SelectInput></Field>
          </div>
        </Card>

        <Card className="overflow-hidden">
          {data.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-left text-sm">
                <thead className="border-b border-navy-100 dark:border-navy-700 bg-navy-50 text-navy-400 dark:bg-navy-800/60 dark:text-navy-400">
                  <tr><th className="px-5 py-3 font-black">Visitor</th><th className="px-5 py-3 font-black">Subject</th><th className="px-5 py-3 font-black">Status</th><th className="px-5 py-3 font-black">Last message</th><th className="px-5 py-3 font-black">Updated</th><th className="px-5 py-3 font-black">Actions</th></tr>
                </thead>
                <tbody>
                  {data.map((chat) => <ArchiveRow key={chat.id} chat={chat} />)}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyPanel icon={<MessageSquare size={22} />} title="No archived chats yet" description="Resolved conversations will appear here with transcript export links." />
          )}
        </Card>
      </div>
    </PageShell>
  );
}

function ArchiveRow({ chat }: { chat: Chat }): JSX.Element {
  return (
    <tr className="border-b border-navy-100 dark:border-navy-700 last:border-0 dark:text-navy-200">
      <td className="px-5 py-4"><div className="font-black">{chat.visitor_name || "Website visitor"}</div><div className="text-xs text-navy-400">{chat.visitor_email || chat.visitor_ip || "Unknown contact"}</div></td>
      <td className="px-5 py-4">{chat.subject || "Live chat"}</td>
      <td className="px-5 py-4"><Pill tone={chat.status === "resolved" || chat.status === "closed" ? "slate" : "green"}>{chat.status}</Pill></td>
      <td className="max-w-[280px] truncate px-5 py-4 text-navy-500 dark:text-navy-400">{chat.last_message?.content || "No public messages"}</td>
      <td className="px-5 py-4 text-navy-400">{new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(chat.updated_at))}</td>
      <td className="px-5 py-4">
        <div className="flex items-center gap-2">
          <Link className="rounded-lg border border-navy-100 dark:border-navy-700 px-3 py-2 text-xs font-black hover:bg-navy-50 dark:hover:bg-navy-800" to={`/inbox/chat/${chat.id}`}>View</Link>
          <a className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-2 text-xs font-black text-white hover:bg-primary-hover" href={`${import.meta.env.VITE_API_URL ?? "http://localhost:8000"}/api/v1/chats/${chat.id}/transcript.txt`} target="_blank" rel="noreferrer"><Download size={14} /> TXT</a>
        </div>
      </td>
    </tr>
  );
}
