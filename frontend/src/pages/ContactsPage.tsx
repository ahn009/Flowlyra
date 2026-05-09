import { useQuery } from "@tanstack/react-query";
import { Clock, Mail, MessageSquare, Search, UserRound, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { PageHeader } from "../components/AgentLayout";
import { Card, EmptyPanel, PageShell, Pill, TextInput } from "../components/ui";
import { useState } from "react";

interface Contact {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
  chat_count?: number;
  last_seen_at?: string | null;
}

export function ContactsPage(): JSX.Element {
  const [search, setSearch] = useState("");
  const { data = [], isLoading } = useQuery({
    queryKey: ["contacts", search],
    queryFn: async () => (await api.get<Contact[]>("/contacts", { params: { q: search || undefined } })).data,
    refetchInterval: 5000
  });

  return (
    <PageShell>
      <PageHeader title="Contacts" action={<Pill tone="blue">{data.length} contacts</Pill>} />
      <div className="border-b border-border bg-white p-4 dark:bg-slate-900">
        <label className="flex max-w-md items-center gap-2 rounded-lg border border-border bg-white px-3 text-sm text-slate-500 focus-within:border-blue-400 focus-within:ring-4 focus-within:ring-blue-100 dark:bg-slate-800 dark:text-slate-400 dark:focus-within:border-blue-500 dark:focus-within:ring-blue-900/40">
          <Search size={16} />
          <TextInput className="border-0 px-0 shadow-none focus:ring-0" placeholder="Search contacts by name or email" value={search} onChange={(e) => setSearch(e.target.value)} />
        </label>
      </div>
      <div className="p-4 sm:p-6">
        <Card className="overflow-hidden">
          {isLoading ? (
            <div className="p-6 text-center text-sm font-semibold text-slate-500 dark:text-slate-400">Loading contacts...</div>
          ) : data.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="border-b border-border bg-slate-50 dark:bg-slate-800/50">
                  <tr>
                    <th className="px-5 py-3 font-bold text-slate-600 dark:text-slate-300">Contact</th>
                    <th className="px-5 py-3 font-bold text-slate-600 dark:text-slate-300">Email</th>
                    <th className="px-5 py-3 font-bold text-slate-600 dark:text-slate-300">Chats</th>
                    <th className="px-5 py-3 font-bold text-slate-600 dark:text-slate-300">Last seen</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((contact) => (
                    <tr key={contact.id} className="border-b border-border transition last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-blue-50 text-primary dark:bg-blue-900/20">
                            <UserRound size={16} />
                          </div>
                          <span className="font-semibold text-slate-900 dark:text-slate-100">{contact.full_name || "Unknown"}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-slate-600 dark:text-slate-400">{contact.email}</td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                          <MessageSquare size={14} />
                          {contact.chat_count ?? 0}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-slate-500 dark:text-slate-400">
                        <div className="flex items-center gap-1.5">
                          <Clock size={14} />
                          {contact.last_seen_at ? new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(contact.last_seen_at)) : "Never"}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyPanel
              icon={<Users size={22} />}
              title="No contacts found"
              description="Contacts are created when visitors provide their details via the chat widget. Start a conversation to see contacts appear here."
            />
          )}
        </Card>
      </div>
    </PageShell>
  );
}
