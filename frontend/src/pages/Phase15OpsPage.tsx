import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FormEvent, useState } from "react";
import toast from "react-hot-toast";

import { PageHeader } from "../components/AgentLayout";
import { Button, Card } from "../components/ui";
import { api } from "../lib/api";

interface IncidentRow {
  id: string;
  title: string;
  body: string;
  status: string;
  impact: string;
  is_public: boolean;
  components: string[];
  resolved_at?: string | null;
}

interface BlogRow {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content_markdown: string;
  tags: string[];
  is_published: boolean;
  published_at?: string | null;
}

export function Phase15OpsPage(): JSX.Element {
  const qc = useQueryClient();
  const { data: org } = useQuery({ queryKey: ["org"], queryFn: async () => (await api.get("/admin/org")).data });
  const { data: incidents = [] } = useQuery({ queryKey: ["phase15", "incidents"], queryFn: async () => (await api.get<{ items: IncidentRow[] }>("/polish/status/incidents")).data.items });
  const { data: posts = [] } = useQuery({ queryKey: ["phase15", "blog"], queryFn: async () => (await api.get<{ items: BlogRow[] }>("/polish/blog/posts")).data.items });
  const { data: domainSettings } = useQuery({ queryKey: ["phase15", "domain"], queryFn: async () => (await api.get("/polish/domains/dashboard")).data });
  const { data: senderSettings } = useQuery({ queryKey: ["phase15", "sender"], queryFn: async () => (await api.get("/polish/domains/email-sender")).data });

  const [incidentTitle, setIncidentTitle] = useState("");
  const [incidentBody, setIncidentBody] = useState("");
  const [incidentImpact, setIncidentImpact] = useState("minor");
  const [incidentComponents, setIncidentComponents] = useState("Realtime chat,REST API");

  const [blogSlug, setBlogSlug] = useState("");
  const [blogTitle, setBlogTitle] = useState("");
  const [blogExcerpt, setBlogExcerpt] = useState("");
  const [blogContent, setBlogContent] = useState("");
  const [blogTags, setBlogTags] = useState("");
  const [blogPublished, setBlogPublished] = useState(true);

  const [dashboardDomain, setDashboardDomain] = useState("");
  const [dashboardToken, setDashboardToken] = useState("");
  const [senderDomain, setSenderDomain] = useState("");
  const [senderDkim, setSenderDkim] = useState("");
  const [senderSpf, setSenderSpf] = useState("");

  const [dashboardLogo, setDashboardLogo] = useState("");
  const [dashboardColor, setDashboardColor] = useState("#0F172A");
  const [helpWidgetEnabled, setHelpWidgetEnabled] = useState(true);
  const [statusPagePublic, setStatusPagePublic] = useState(true);

  const createIncident = useMutation({
    mutationFn: async () => api.post("/polish/status/incidents", {
      title: incidentTitle.trim(),
      body: incidentBody.trim(),
      impact: incidentImpact,
      status: "investigating",
      is_public: true,
      components: incidentComponents.split(",").map((v) => v.trim()).filter(Boolean),
    }),
    onSuccess: async () => {
      toast.success("Incident published");
      setIncidentTitle("");
      setIncidentBody("");
      await qc.invalidateQueries({ queryKey: ["phase15", "incidents"] });
    },
    onError: () => toast.error("Could not publish incident"),
  });

  const resolveIncident = useMutation({
    mutationFn: async (row: IncidentRow) => api.patch(`/polish/status/incidents/${row.id}`, {
      ...row,
      status: "resolved",
      resolved_at: new Date().toISOString(),
    }),
    onSuccess: async () => {
      toast.success("Incident resolved");
      await qc.invalidateQueries({ queryKey: ["phase15", "incidents"] });
    },
  });

  const saveBlog = useMutation({
    mutationFn: async () => api.post("/polish/blog/posts", {
      slug: blogSlug.trim(),
      title: blogTitle.trim(),
      excerpt: blogExcerpt.trim(),
      content_markdown: blogContent,
      tags: blogTags.split(",").map((v) => v.trim()).filter(Boolean),
      is_published: blogPublished,
    }),
    onSuccess: async () => {
      toast.success("Blog post saved");
      await qc.invalidateQueries({ queryKey: ["phase15", "blog"] });
    },
    onError: () => toast.error("Could not save blog post"),
  });

  const configureDomain = useMutation({
    mutationFn: async () => api.post("/polish/domains/dashboard", { domain: dashboardDomain.trim() }),
    onSuccess: async () => {
      toast.success("Domain configured");
      await qc.invalidateQueries({ queryKey: ["phase15", "domain"] });
    },
  });
  const verifyDomain = useMutation({
    mutationFn: async () => api.post("/polish/domains/dashboard/verify", { token: dashboardToken.trim() }),
    onSuccess: async () => {
      toast.success("Domain verification checked");
      await qc.invalidateQueries({ queryKey: ["phase15", "domain"] });
    },
  });

  const configureSender = useMutation({
    mutationFn: async () => api.post("/polish/domains/email-sender", { domain: senderDomain.trim() }),
    onSuccess: async () => {
      toast.success("Sender domain configured");
      await qc.invalidateQueries({ queryKey: ["phase15", "sender"] });
    },
  });
  const verifySender = useMutation({
    mutationFn: async () => api.post("/polish/domains/email-sender/verify", {
      dkim_value: senderDkim.trim(),
      spf_include: senderSpf.trim(),
    }),
    onSuccess: async () => {
      toast.success("Sender verification checked");
      await qc.invalidateQueries({ queryKey: ["phase15", "sender"] });
    },
  });

  const saveBranding = useMutation({
    mutationFn: async () => api.patch("/admin/org", {
      dashboard_logo_url: dashboardLogo.trim() || null,
      dashboard_primary_color: dashboardColor,
      help_widget_enabled: helpWidgetEnabled,
      status_page_public: statusPagePublic,
    }),
    onSuccess: async () => {
      toast.success("Branding saved");
      await qc.invalidateQueries({ queryKey: ["org"] });
    },
  });

  const runDrip = useMutation({
    mutationFn: async () => api.post("/polish/onboarding-drip/run"),
    onSuccess: () => toast.success("Onboarding drip executed"),
    onError: () => toast.error("Could not run onboarding drip"),
  });

  return (
    <section className="min-h-[calc(100dvh-64px)] bg-slate-50">
      <PageHeader title="Phase 15 Operations" />
      <div className="grid gap-4 p-4 sm:p-6">
        <Card className="p-4">
          <h2 className="text-lg font-black">White-label & dashboard branding</h2>
          <form
            className="mt-3 grid gap-3 md:grid-cols-2"
            onSubmit={(event) => {
              event.preventDefault();
              saveBranding.mutate();
            }}
          >
            <label className="grid gap-1 text-sm font-semibold text-slate-700">Dashboard logo URL
              <input className="h-10 rounded-lg border border-slate-300 px-3" value={dashboardLogo} onChange={(e) => setDashboardLogo(e.target.value)} placeholder={String(org?.dashboard_logo_url ?? "")} />
            </label>
            <label className="grid gap-1 text-sm font-semibold text-slate-700">Primary color
              <input className="h-10 rounded-lg border border-slate-300 px-3" type="color" value={dashboardColor} onChange={(e) => setDashboardColor(e.target.value)} />
            </label>
            <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700"><input type="checkbox" checked={helpWidgetEnabled} onChange={(e) => setHelpWidgetEnabled(e.target.checked)} /> Enable help/support widget</label>
            <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700"><input type="checkbox" checked={statusPagePublic} onChange={(e) => setStatusPagePublic(e.target.checked)} /> Public status page enabled</label>
            <Button type="submit" variant="primary" disabled={saveBranding.isPending}>{saveBranding.isPending ? "Saving..." : "Save branding"}</Button>
          </form>
        </Card>

        <Card className="p-4">
          <h2 className="text-lg font-black">Status incidents (public publish)</h2>
          <form
            className="mt-3 grid gap-3 md:grid-cols-2"
            onSubmit={(event: FormEvent) => {
              event.preventDefault();
              if (!incidentTitle.trim()) return;
              createIncident.mutate();
            }}
          >
            <input className="h-10 rounded-lg border border-slate-300 px-3" value={incidentTitle} onChange={(e) => setIncidentTitle(e.target.value)} placeholder="Incident title" />
            <select className="h-10 rounded-lg border border-slate-300 px-3" value={incidentImpact} onChange={(e) => setIncidentImpact(e.target.value)}>
              <option value="minor">minor</option>
              <option value="major">major</option>
              <option value="critical">critical</option>
            </select>
            <input className="h-10 rounded-lg border border-slate-300 px-3 md:col-span-2" value={incidentComponents} onChange={(e) => setIncidentComponents(e.target.value)} placeholder="Components (comma separated)" />
            <textarea className="min-h-20 rounded-lg border border-slate-300 px-3 py-2 md:col-span-2" value={incidentBody} onChange={(e) => setIncidentBody(e.target.value)} placeholder="Incident details" />
            <Button variant="primary" disabled={createIncident.isPending}>{createIncident.isPending ? "Publishing..." : "Publish incident"}</Button>
          </form>
          <div className="mt-4 grid gap-2">
            {incidents.map((row) => (
              <div key={row.id} className="rounded-lg border border-slate-200 bg-white p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-black">{row.title} <span className="text-xs font-semibold text-slate-500">({row.status})</span></div>
                  {row.status !== "resolved" ? <Button size="sm" variant="secondary" onClick={() => resolveIncident.mutate(row)}>Resolve</Button> : null}
                </div>
                <div className="mt-1 text-xs text-slate-600">{row.body}</div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-4">
          <h2 className="text-lg font-black">Blog / CMS</h2>
          <form
            className="mt-3 grid gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              if (!blogSlug.trim() || !blogTitle.trim()) return;
              saveBlog.mutate();
            }}
          >
            <div className="grid gap-3 md:grid-cols-2">
              <input className="h-10 rounded-lg border border-slate-300 px-3" value={blogSlug} onChange={(e) => setBlogSlug(e.target.value)} placeholder="slug (example: launch-checklist)" />
              <input className="h-10 rounded-lg border border-slate-300 px-3" value={blogTitle} onChange={(e) => setBlogTitle(e.target.value)} placeholder="Title" />
            </div>
            <input className="h-10 rounded-lg border border-slate-300 px-3" value={blogExcerpt} onChange={(e) => setBlogExcerpt(e.target.value)} placeholder="Excerpt" />
            <input className="h-10 rounded-lg border border-slate-300 px-3" value={blogTags} onChange={(e) => setBlogTags(e.target.value)} placeholder="Tags (comma separated)" />
            <textarea className="min-h-40 rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm" value={blogContent} onChange={(e) => setBlogContent(e.target.value)} placeholder="# Heading\nYour content..." />
            <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700"><input type="checkbox" checked={blogPublished} onChange={(e) => setBlogPublished(e.target.checked)} /> Publish immediately</label>
            <Button variant="primary" disabled={saveBlog.isPending}>{saveBlog.isPending ? "Saving..." : "Save post"}</Button>
          </form>
          <div className="mt-4 grid gap-2">
            {posts.map((row) => (
              <div key={row.id} className="rounded-lg border border-slate-200 bg-white p-3 text-sm">
                <div className="font-black">{row.title}</div>
                <div className="text-xs text-slate-500">/{row.slug} · {row.is_published ? "published" : "draft"}</div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-4">
          <h2 className="text-lg font-black">Custom dashboard domain (CNAME)</h2>
          <div className="mt-2 text-xs text-slate-500">Current: {String(domainSettings?.domain ?? "not configured")}</div>
          <div className="mt-1 text-xs text-slate-500">Status: {String(domainSettings?.verification?.status ?? "unconfigured")}</div>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <input className="h-10 rounded-lg border border-slate-300 px-3" value={dashboardDomain} onChange={(e) => setDashboardDomain(e.target.value)} placeholder="support.company.com" />
            <Button variant="secondary" onClick={() => dashboardDomain.trim() && configureDomain.mutate()} disabled={configureDomain.isPending}>{configureDomain.isPending ? "Saving..." : "Configure domain"}</Button>
            <input className="h-10 rounded-lg border border-slate-300 px-3 md:col-span-2" value={dashboardToken} onChange={(e) => setDashboardToken(e.target.value)} placeholder="Paste TXT verification token value to confirm" />
            <Button variant="primary" onClick={() => dashboardToken.trim() && verifyDomain.mutate()} disabled={verifyDomain.isPending}>{verifyDomain.isPending ? "Checking..." : "Verify domain"}</Button>
          </div>
          {domainSettings?.verification?.dns ? <pre className="mt-3 overflow-x-auto rounded bg-slate-900 p-3 text-xs text-slate-100">{JSON.stringify(domainSettings.verification.dns, null, 2)}</pre> : null}
        </Card>

        <Card className="p-4">
          <h2 className="text-lg font-black">Custom email sender domain (DKIM/SPF)</h2>
          <div className="mt-2 text-xs text-slate-500">Current: {String(senderSettings?.domain ?? "not configured")}</div>
          <div className="mt-1 text-xs text-slate-500">Status: {String(senderSettings?.verification?.status ?? "unconfigured")}</div>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <input className="h-10 rounded-lg border border-slate-300 px-3" value={senderDomain} onChange={(e) => setSenderDomain(e.target.value)} placeholder="mail.company.com" />
            <Button variant="secondary" onClick={() => senderDomain.trim() && configureSender.mutate()} disabled={configureSender.isPending}>{configureSender.isPending ? "Saving..." : "Configure sender domain"}</Button>
            <input className="h-10 rounded-lg border border-slate-300 px-3 md:col-span-2" value={senderDkim} onChange={(e) => setSenderDkim(e.target.value)} placeholder="Paste DKIM TXT record value" />
            <input className="h-10 rounded-lg border border-slate-300 px-3 md:col-span-2" value={senderSpf} onChange={(e) => setSenderSpf(e.target.value)} placeholder="Paste SPF TXT value" />
            <Button variant="primary" onClick={() => verifySender.mutate()} disabled={verifySender.isPending}>{verifySender.isPending ? "Checking..." : "Verify sender DNS"}</Button>
          </div>
          {senderSettings?.verification?.dns ? <pre className="mt-3 overflow-x-auto rounded bg-slate-900 p-3 text-xs text-slate-100">{JSON.stringify(senderSettings.verification.dns, null, 2)}</pre> : null}
        </Card>

        <Card className="p-4">
          <h2 className="text-lg font-black">Onboarding drip</h2>
          <p className="mt-1 text-sm text-slate-600">Sends staged onboarding emails (day 0 / day 2 / day 7) to active team users.</p>
          <Button className="mt-3" variant="primary" onClick={() => runDrip.mutate()} disabled={runDrip.isPending}>{runDrip.isPending ? "Running..." : "Run drip now"}</Button>
        </Card>
      </div>
    </section>
  );
}
