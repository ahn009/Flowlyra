import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { activeSocket } from "../socket";
import { useAuthStore } from "../stores/authStore";

interface ChatRow { id:string; visitor_name?:string|null; visitor_email?:string|null; assigned_user_id?:string|null; created_at:string; messages?:Array<{content:string|null; sender_type:string; created_at:string}> }
interface AgentRow { id:string; full_name?:string|null; is_online?:boolean; status?:string; team_id?:string|null }

export function SupervisionPage(): JSX.Element {
  const me = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [agentFilter, setAgentFilter] = useState("all");
  const [whispers, setWhispers] = useState<Record<string,string>>({});

  if (!me || !["admin","supervisor"].includes(me.role)) return <div className="p-6">Access denied.</div>;

  const chatsQ = useQuery({ queryKey:["supervision-chats"], queryFn: async()=> (await api.get<{items:ChatRow[]}>("/chats",{params:{status:"active",limit:50}})).data, refetchInterval:5000});
  const agentsQ = useQuery({ queryKey:["supervision-agents"], queryFn: async()=> (await api.get<AgentRow[]>("/admin/agents")).data, refetchInterval:10000});

  const agentById = useMemo(()=> new Map((agentsQ.data??[]).map(a=>[a.id,a])), [agentsQ.data]);
  const rows = useMemo(()=> (chatsQ.data?.items??[]).filter(c=>{
    const n = `${c.visitor_name??""} ${c.visitor_email??""}`.toLowerCase();
    if (search && !n.includes(search.toLowerCase())) return false;
    if (agentFilter!=="all" && c.assigned_user_id!==agentFilter) return false;
    return true;
  }), [chatsQ.data, search, agentFilter]);

  const whisper = (chat: ChatRow) => {
    const text = whispers[chat.id]?.trim();
    const target = chat.assigned_user_id;
    if (!text || !target) return;
    activeSocket()?.emit("whisper", { target_user_id: target, message: text });
    setWhispers((p)=>({ ...p, [chat.id]: "" }));
  };

  return <div className="p-6 space-y-4">
    <h1 className="text-2xl font-bold">Supervision</h1>
    <div className="grid gap-2 md:grid-cols-4">
      <input className="border rounded px-3 py-2" placeholder="Search visitor" value={search} onChange={(e)=>setSearch(e.target.value)} />
      <select className="border rounded px-3 py-2" value={agentFilter} onChange={(e)=>setAgentFilter(e.target.value)}>
        <option value="all">All agents</option>
        {(agentsQ.data??[]).map(a=><option key={a.id} value={a.id}>{a.full_name??a.id}</option>)}
      </select>
      <div className="rounded border p-2 text-sm">Active chats: {rows.length}</div>
      <div className="rounded border p-2 text-sm">Agents online: {(agentsQ.data??[]).filter(a=>a.is_online||a.status==="online").length}</div>
    </div>
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {rows.map(chat=>{
        const agent = chat.assigned_user_id ? agentById.get(chat.assigned_user_id) : undefined;
        const mini = (chat.messages??[]).slice(-5);
        return <div key={chat.id} className="rounded-xl border bg-white p-3 space-y-2">
          <div className="font-semibold">{chat.visitor_name || chat.visitor_email || "Visitor"}</div>
          <div className="text-xs">Agent: {agent?.full_name ?? "Unassigned"} <span className={agent?.is_online?"text-green-600":"text-slate-400"}>●</span></div>
          <div className="max-h-48 overflow-auto rounded border p-2 text-xs space-y-1">
            {mini.map((m,i)=><div key={i}><b>{m.sender_type}:</b> {m.content ?? ""}</div>)}
          </div>
          <div className="flex gap-2">
            <input className="flex-1 border rounded px-2 py-1 text-xs" placeholder="Whisper..." value={whispers[chat.id]??""} onChange={(e)=>setWhispers(p=>({...p,[chat.id]:e.target.value}))} />
            <button className="border rounded px-2 py-1 text-xs" onClick={()=>whisper(chat)}>Whisper</button>
            <button className="border rounded px-2 py-1 text-xs" onClick={()=>navigate(`/inbox/chat/${chat.id}`)}>Join</button>
          </div>
        </div>
      })}
    </div>
  </div>
}
