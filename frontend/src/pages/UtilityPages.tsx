/**
 * Utility & legal pages: Contact, Help, ProductTour, Status,
 * Privacy, Terms, Signup.
 */
import { type FormEvent, useEffect, useState } from "react";
import {
  BarChart3,
  Check,
  CheckCircle,
  CheckCircle2,
  Code,
  CreditCard,
  Globe,
  Headphones,
  LayoutDashboard,
  Mail,
  MapPin,
  MessageCircle,
  Play,
  Puzzle,
  Rocket,
  Search,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { MarketingNavigation } from "../components/MarketingNavigation";
import { api } from "../lib/api";
import { useAuthStore } from "../stores/authStore";
import { cx } from "../components/ui";

/* ─── Design tokens (inline, no cross-file import needed) ─── */
const OVERLINE = "font-sans text-[11px] font-bold uppercase leading-[1.2] tracking-[0.1em] text-indigo-600";

/* ─── Shared footer (same as MarketingSubPages) ─── */
const FOOTER_COLS = [
  { title: "Product",   links: [{ to: "/features", l: "Features" }, { to: "/pricing", l: "Pricing" }, { to: "/integrations", l: "Integrations" }] },
  { title: "Solutions", links: [{ to: "/solutions/customer-support", l: "Customer Support" }, { to: "/solutions/sales-marketing", l: "Sales & Marketing" }] },
  { title: "Resources", links: [{ to: "/help", l: "Help Center" }, { to: "/blog", l: "Blog" }, { to: "/status", l: "Status" }, { to: "/contact", l: "Contact" }] },
  { title: "Company",   links: [{ to: "/customers", l: "About" }, { to: "/terms", l: "Legal" }, { to: "/privacy", l: "Privacy" }] },
];

function SiteFooter() {
  return (
    <footer className="border-t border-slate-800 bg-[#0F172A] text-slate-300">
      <div className="mx-auto grid w-full max-w-7xl gap-12 px-4 py-16 sm:px-6 lg:grid-cols-5">
        <div className="lg:col-span-1">
          <Link to="/" className="inline-flex items-center gap-2.5">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/10 ring-1 ring-white/15">
              <svg viewBox="0 0 36 36" className="h-7 w-7">
                <path d="M7 14.5C10.2 8.8 17.7 7.8 22.1 11.8l2.1 1.9c1.7 1.5 4.1 1.2 5.8-.6" fill="none" stroke="white" strokeWidth="4.2" strokeLinecap="round" />
                <path d="M6 22.2c3.5 5.4 11.2 6.2 15.4 1.9l2.2-2.2c1.6-1.6 4.2-1.5 6.2.2" fill="none" stroke="white" strokeWidth="4.2" strokeLinecap="round" />
              </svg>
            </span>
            <span className="font-sans text-xl font-semibold text-white">Flowlyra</span>
          </Link>
          <p className="mt-3 text-sm text-slate-400">Conversations that move.</p>
        </div>
        {FOOTER_COLS.map((col) => (
          <div key={col.title}>
            <h3 className="text-[13px] font-semibold uppercase tracking-[0.1em] text-slate-400">{col.title}</h3>
            <nav className="mt-5 grid gap-0">
              {col.links.map((link) => <Link key={link.l} to={link.to} className="flex min-h-8 items-center text-sm text-slate-300 transition-colors hover:text-white">{link.l}</Link>)}
            </nav>
          </div>
        ))}
      </div>
      <div className="border-t border-white/5">
        <p className="py-4 text-center text-xs text-slate-500">&copy; {new Date().getFullYear()} Flowlyra. All rights reserved.</p>
      </div>
    </footer>
  );
}

/* ─── Sub-page hero ─── */
function SubPageHero({ headline, description }: { headline: string; description: string }) {
  return (
    <section className="border-b border-slate-200" style={{ background: "linear-gradient(180deg, #F8FAFC 0%, #EEF2FF 100%)", minHeight: 280 }}>
      <div className="mx-auto flex w-full max-w-7xl flex-col items-center justify-center px-4 py-20 text-center sm:px-6 sm:py-24">
        <h1 className="font-display text-[clamp(1.75rem,3.5vw+0.75rem,3rem)] font-bold leading-[1.1] tracking-[-0.025em] text-[#0F172A]">{headline}</h1>
        <p className="mx-auto mt-5 max-w-[640px] font-sans text-base leading-[1.7] text-slate-600 sm:text-lg">{description}</p>
      </div>
    </section>
  );
}

/* ─── Input helper ─── */
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1.5 text-sm font-medium text-slate-700">
      {label}
      {children}
    </label>
  );
}

const inputCls = "h-[44px] w-full rounded-md border border-slate-300 bg-white px-[14px] font-sans text-[15px] text-midnight outline-none transition placeholder:text-slate-400 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-50";
const textareaCls = "min-h-[96px] w-full resize-vertical rounded-md border border-slate-300 bg-white px-[14px] py-[10px] font-sans text-[15px] text-midnight outline-none transition placeholder:text-slate-400 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-50";

/* ═══════════════════════════════════════
   PAGE 1 — /contact
   ═══════════════════════════════════════ */
export function ContactPage() {
  const [fullName, setFullName]   = useState("");
  const [email, setEmail]         = useState("");
  const [company, setCompany]     = useState("");
  const [subject, setSubject]     = useState("Sales inquiry");
  const [message, setMessage]     = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post("/public/contact", { full_name: fullName, email, company: company || undefined, subject, message });
      toast.success("Message sent! We'll be in touch shortly.");
      setFullName(""); setEmail(""); setCompany(""); setMessage("");
    } catch {
      toast.error("Could not send message. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const infoCards = [
    { icon: Mail,      title: "Sales",   body: "sales@flowlyra.com",  sub: "Response within 1 business day" },
    { icon: Headphones, title: "Support", body: "Chat with us",        sub: "Available 9am–6pm Mon–Fri", link: "/signup" },
    { icon: MapPin,    title: "Office",  body: "San Francisco, CA",   sub: "123 Market St, Suite 400" },
  ];

  return (
    <div className="min-h-screen bg-white">
      <MarketingNavigation />
      <main>
        <SubPageHero headline="Get in touch" description="Questions, partnerships, or just want to say hello." />
        <section className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:py-20">
          <div className="grid gap-12 lg:grid-cols-12">
            {/* Form — 7 cols */}
            <div className="lg:col-span-7">
              <h2 className="font-display text-2xl font-bold text-midnight">Send us a message</h2>
              <form className="mt-6 grid gap-5" onSubmit={(e) => void submit(e)}>
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label="Name">
                    <input required className={inputCls} placeholder="Your name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
                  </Field>
                  <Field label="Work email">
                    <input required type="email" className={inputCls} placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} />
                  </Field>
                </div>
                <Field label="Company">
                  <input className={inputCls} placeholder="Company name" value={company} onChange={(e) => setCompany(e.target.value)} />
                </Field>
                <Field label="Subject">
                  <select className={inputCls} value={subject} onChange={(e) => setSubject(e.target.value)}>
                    <option>Sales inquiry</option>
                    <option>Technical support</option>
                    <option>Partnership</option>
                    <option>Other</option>
                  </select>
                </Field>
                <Field label="Message">
                  <textarea required minLength={10} className={textareaCls} placeholder="How can we help?" value={message} onChange={(e) => setMessage(e.target.value)} />
                </Field>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex h-[44px] items-center justify-center rounded-lg bg-indigo-600 px-6 text-[15px] font-semibold text-white shadow-sm transition-all hover:bg-indigo-700 active:scale-[0.97] disabled:opacity-50"
                >
                  {submitting ? "Sending…" : "Send message"}
                </button>
              </form>
            </div>
            {/* Info cards — 5 cols */}
            <div className="flex flex-col gap-4 lg:col-span-5">
              {infoCards.map((card) => (
                <div key={card.title} className="flex items-start gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                    <card.icon size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-midnight">{card.title}</p>
                    {card.link
                      ? <Link to={card.link} className="mt-0.5 block text-sm font-medium text-indigo-600 hover:underline">{card.body}</Link>
                      : <p className="mt-0.5 text-sm text-indigo-600">{card.body}</p>}
                    <p className="mt-0.5 text-xs text-slate-500">{card.sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

/* ═══════════════════════════════════════
   PAGE 2 — /help
   ═══════════════════════════════════════ */
const helpCategories = [
  { icon: Rocket,          title: "Getting Started",    articles: 12 },
  { icon: CreditCard,      title: "Account & Billing",  articles: 8  },
  { icon: MessageCircle,   title: "Chat Widget",         articles: 15 },
  { icon: LayoutDashboard, title: "Agent Dashboard",    articles: 20 },
  { icon: Puzzle,          title: "Integrations",        articles: 18 },
  { icon: Code,            title: "API & Developers",   articles: 24 },
];

export function HelpPage() {
  const [query, setQuery] = useState("");
  return (
    <div className="min-h-screen bg-slate-50">
      <MarketingNavigation />
      <main>
        <SubPageHero headline="How can we help?" description="Find answers, guides, and resources." />
        <section className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:py-20">
          {/* Search */}
          <div className="mx-auto mb-14 max-w-2xl">
            <label className="relative flex items-center">
              <Search size={20} className="pointer-events-none absolute left-4 text-slate-400" />
              <input
                type="search"
                className="h-[52px] w-full rounded-xl border border-slate-200 bg-white pl-12 pr-4 text-[15px] text-midnight shadow-md outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50"
                placeholder="Search help articles..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
          </div>
          {/* Category cards */}
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {helpCategories.map((cat) => (
              <article
                key={cat.title}
                className="flex cursor-pointer flex-col gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-xs transition-all duration-200 hover:-translate-y-1 hover:shadow-md"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                  <cat.icon size={24} strokeWidth={1.75} />
                </div>
                <div>
                  <h3 className="font-sans text-[1.125rem] font-semibold text-midnight">{cat.title}</h3>
                  <p className="mt-1 text-sm text-slate-500">{cat.articles} articles</p>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

/* ═══════════════════════════════════════
   PAGE 3 — /product-tour
   ═══════════════════════════════════════ */
const tourHighlights = [
  { icon: Rocket,        title: "Setup in 5 minutes",     desc: "Paste one snippet. Widget live immediately. No dev time required." },
  { icon: MessageCircle, title: "Your first conversation", desc: "Respond to visitors from the inbox, with full context in one panel." },
  { icon: BarChart3,     title: "Measure what matters",    desc: "CSAT, response time, and volume — visible in your analytics dashboard." },
];

function CTABanner() {
  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 sm:py-20">
      <div className="overflow-hidden rounded-3xl px-8 py-12 text-white sm:px-12" style={{ background: "linear-gradient(135deg, #4F46E5, #7C3AED, #F97066)" }}>
        <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <h2 className="font-display text-[1.75rem] font-bold tracking-[-0.02em] sm:text-[2.25rem]">Ready to start flowing?</h2>
            <p className="mt-3 max-w-lg text-base text-white/80">Join 10,000+ support teams. No credit card required.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link to="/signup" className="inline-flex items-center justify-center rounded-xl bg-white px-6 py-3 text-[15px] font-semibold text-indigo-700 transition-all hover:bg-indigo-50 active:scale-[0.97]">Start flowing free</Link>
            <Link to="/contact" className="inline-flex items-center justify-center rounded-xl border border-white/30 bg-white/10 px-6 py-3 text-[15px] font-semibold text-white transition-all hover:bg-white/20 active:scale-[0.97]">Contact sales</Link>
          </div>
        </div>
      </div>
    </section>
  );
}

export function ProductTourPage() {
  const [playing, setPlaying] = useState(false);
  return (
    <div className="min-h-screen bg-white">
      <MarketingNavigation />
      <main>
        <SubPageHero headline="See Flowlyra in action" description="A quick walkthrough of everything your team gets." />
        <section className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:py-20">
          {/* Video placeholder */}
          <div className="relative mx-auto w-full max-w-4xl">
            <div
              className="relative overflow-hidden rounded-3xl shadow-[0_25px_50px_-12px_rgba(15,23,42,0.2)]"
              style={{ aspectRatio: "16/9", background: "#0F172A" }}
            >
              {/* Fake timeline/UI inside */}
              <div className="absolute inset-0 flex flex-col">
                <div className="flex items-center gap-2 border-b border-white/10 px-6 py-4">
                  <div className="h-3 w-3 rounded-full bg-[#F97066]" />
                  <div className="h-3 w-3 rounded-full bg-amber-400" />
                  <div className="h-3 w-3 rounded-full bg-emerald-500" />
                  <div className="mx-auto text-sm font-medium text-white/40">Flowlyra Dashboard</div>
                </div>
                <div className="flex flex-1 items-center justify-center opacity-40">
                  <div className="grid grid-cols-3 gap-4 px-8 w-full max-w-lg">
                    {[2847, "28s", "4.6/5"].map((v, i) => (
                      <div key={i} className="rounded-xl bg-white/10 px-4 py-3 text-center">
                        <div className="font-display text-2xl font-bold text-white">{v}</div>
                        <div className="mt-1 text-xs text-white/50">{["Chats","Avg resp","CSAT"][i]}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              {/* Play button */}
              {!playing && (
                <button
                  onClick={() => setPlaying(true)}
                  className="absolute inset-0 flex items-center justify-center transition-all"
                  aria-label="Play product tour"
                >
                  <span className="flex h-[72px] w-[72px] items-center justify-center rounded-full bg-white shadow-xl transition-transform hover:scale-110">
                    <Play size={28} className="ml-1 text-indigo-600" fill="#4F46E5" />
                  </span>
                </button>
              )}
              {playing && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <p className="text-sm text-white/60">Video would play here</p>
                </div>
              )}
            </div>
          </div>
          {/* Feature highlights */}
          <div className="mt-16 grid gap-6 sm:grid-cols-3">
            {tourHighlights.map((item) => (
              <div key={item.title} className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                  <item.icon size={22} strokeWidth={1.75} />
                </div>
                <h3 className="font-sans text-base font-semibold text-midnight">{item.title}</h3>
                <p className="text-sm leading-relaxed text-slate-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>
        <CTABanner />
      </main>
      <SiteFooter />
    </div>
  );
}

/* ═══════════════════════════════════════
   PAGE 4 — /status
   ═══════════════════════════════════════ */
interface PublicIncident {
  id: string; title: string; body: string; status: string; impact: string; started_at?: string | null; resolved_at?: string | null;
}

type ServiceStatus = "operational" | "degraded" | "outage";

const SERVICES: Array<{ name: string; status: ServiceStatus }> = [
  { name: "Chat Platform",  status: "operational" },
  { name: "API",            status: "operational" },
  { name: "Widget CDN",     status: "operational" },
  { name: "Dashboard",      status: "operational" },
  { name: "Email Service",  status: "operational" },
];

const STATUS_DOT: Record<ServiceStatus, string> = {
  operational: "bg-emerald-500",
  degraded:    "bg-amber-400",
  outage:      "bg-red-500",
};

const STATUS_LABEL: Record<ServiceStatus, string> = {
  operational: "Operational",
  degraded:    "Degraded",
  outage:      "Outage",
};

export function StatusPage() {
  const [incidents, setIncidents] = useState<PublicIncident[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    void api.get<{ items: PublicIncident[] }>("/public/status/incidents")
      .then(({ data }) => { if (!alive) return; setIncidents(data.items || []); })
      .catch(() => { if (!alive) return; setIncidents([]); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  const active = incidents.filter((i) => i.status !== "resolved");
  const allOk = !loading && active.length === 0;

  return (
    <div className="min-h-screen bg-white">
      <MarketingNavigation />
      <main>
        <SubPageHero headline="System Status" description="Real-time operational status of Flowlyra services." />
        <section className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6">
          {/* Overall banner */}
          <div className={cx(
            "flex items-center gap-3 rounded-xl border-l-[3px] px-5 py-4 text-sm font-semibold",
            allOk
              ? "border-l-emerald-500 bg-emerald-50 text-emerald-800"
              : loading
                ? "border-l-slate-300 bg-slate-50 text-slate-600"
                : "border-l-amber-400 bg-amber-50 text-amber-800",
          )}>
            <CheckCircle size={20} className={allOk ? "text-emerald-500" : "text-slate-400"} />
            {loading ? "Checking system status…" : allOk ? "All systems operational" : `${active.length} active incident${active.length === 1 ? "" : "s"}`}
          </div>

          {/* Service list */}
          <div className="mt-6 grid gap-3">
            {SERVICES.map((svc) => (
              <div key={svc.name} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-5 py-4">
                <span className="text-[15px] font-medium text-midnight">{svc.name}</span>
                <span className="flex items-center gap-2 text-sm font-medium text-slate-600">
                  <span className={cx("h-2.5 w-2.5 rounded-full", STATUS_DOT[svc.status])} />
                  {STATUS_LABEL[svc.status]}
                </span>
              </div>
            ))}
          </div>

          {/* Incidents */}
          {incidents.length > 0 && (
            <div className="mt-8 grid gap-3">
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Recent incidents</h3>
              {incidents.map((inc) => (
                <div key={inc.id} className="rounded-xl border border-slate-200 bg-white px-5 py-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-bold text-midnight">{inc.title}</span>
                    <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[11px] font-bold uppercase text-white">{inc.status}</span>
                  </div>
                  {inc.body && <p className="mt-2 text-sm leading-relaxed text-slate-600">{inc.body}</p>}
                </div>
              ))}
            </div>
          )}

          <p className="mt-6 text-xs text-slate-400">Last updated: just now</p>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

/* ═══════════════════════════════════════
   PAGE 5 — /privacy
   ═══════════════════════════════════════ */
const PRIVACY_SECTIONS = [
  {
    title: "Information We Collect",
    body: "We collect information you provide directly to us when you create an account, use our services, or communicate with us. This includes your name, email address, company information, and any messages or content you submit through our platform. We also collect certain technical information automatically when you use our services, including log data, device information, and usage patterns.",
  },
  {
    title: "How We Use Your Information",
    body: "We use the information we collect to provide, maintain, and improve our services, process transactions, send technical notices and support messages, respond to your comments and questions, and monitor and analyze usage trends. We do not sell your personal information to third parties or use it for advertising purposes unrelated to our services.",
  },
  {
    title: "Data Retention",
    body: "We retain your information for as long as your account is active or as needed to provide you services. You may request deletion of your personal data at any time by contacting our support team. We will respond to deletion requests within 30 days, subject to legal obligations that may require us to retain certain information for longer periods.",
  },
  {
    title: "Data Security",
    body: "We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. This includes encryption of data in transit and at rest, regular security assessments, and strict access controls for our personnel. No method of transmission over the Internet is 100% secure, and we cannot guarantee absolute security.",
  },
  {
    title: "Cookies & Tracking",
    body: "We use cookies and similar tracking technologies to track activity on our services and hold certain information. You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent. However, if you do not accept cookies, some portions of our service may not function properly. We use both session and persistent cookies for various purposes including authentication and analytics.",
  },
  {
    title: "Contact Us",
    body: "If you have questions about this privacy policy or our privacy practices, please contact us at privacy@flowlyra.com. We will respond to your request within a reasonable timeframe. If you are located in the European Economic Area and wish to make a complaint, you have the right to lodge a complaint with your local supervisory authority.",
  },
];

export function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white">
      <MarketingNavigation />
      <main>
        <SubPageHero headline="Privacy Policy" description="Last updated: May 2026" />
        <section className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6 lg:py-20">
          {PRIVACY_SECTIONS.map((sec) => (
            <div key={sec.title} className="mt-10 first:mt-0">
              <h2 className="font-sans text-[1.125rem] font-semibold text-midnight">{sec.title}</h2>
              <p className="mt-4 text-base leading-[1.7] text-slate-700">{sec.body}</p>
            </div>
          ))}
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

/* ═══════════════════════════════════════
   PAGE 6 — /terms
   ═══════════════════════════════════════ */
const TERMS_SECTIONS = [
  {
    title: "Acceptance of Terms",
    body: "By accessing or using Flowlyra's services, you agree to be bound by these Terms of Service and all applicable laws and regulations. If you do not agree with any of these terms, you are prohibited from using or accessing our services. We reserve the right to update these terms at any time, and continued use of our services constitutes acceptance of any changes.",
  },
  {
    title: "Use of Services",
    body: "You may use our services only for lawful purposes and in accordance with these terms. You agree not to use our services in any way that violates applicable laws or regulations, to transmit unsolicited or unauthorized advertising, to impersonate any person or entity, or to interfere with the proper functioning of our services. You are responsible for all activities that occur under your account.",
  },
  {
    title: "Account Responsibilities",
    body: "You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You agree to notify us immediately of any unauthorized use of your account. We cannot be held liable for any loss or damage arising from your failure to comply with these security obligations. Account owners manage all aspects of their organization workspace.",
  },
  {
    title: "Intellectual Property",
    body: "The services and their original content, features, and functionality are owned by Flowlyra and are protected by international copyright, trademark, and other intellectual property laws. Our trademarks may not be used in connection with any product or service without our prior written consent. You retain ownership of content you submit through our services.",
  },
  {
    title: "Limitation of Liability",
    body: "In no event shall Flowlyra be liable for any indirect, incidental, special, consequential, or punitive damages, including without limitation loss of profits, data, or goodwill, arising out of or in connection with your use of our services. Our liability is limited to the amount you paid for the services in the 12 months preceding the claim. Some jurisdictions do not allow certain limitations, so these may not apply to you.",
  },
  {
    title: "Termination",
    body: "We may terminate or suspend your access to our services at any time, with or without cause, with or without notice, effective immediately. If you wish to terminate your account, you may simply discontinue using the services or contact us to request account deletion. All provisions that by their nature should survive termination shall survive, including ownership provisions and warranty disclaimers.",
  },
];

export function TermsPage() {
  return (
    <div className="min-h-screen bg-white">
      <MarketingNavigation />
      <main>
        <SubPageHero headline="Terms of Service" description="Last updated: May 2026" />
        <section className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6 lg:py-20">
          {TERMS_SECTIONS.map((sec) => (
            <div key={sec.title} className="mt-10 first:mt-0">
              <h2 className="font-sans text-[1.125rem] font-semibold text-midnight">{sec.title}</h2>
              <p className="mt-4 text-base leading-[1.7] text-slate-700">{sec.body}</p>
            </div>
          ))}
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

/* ═══════════════════════════════════════
   PAGE 7 — /signup (split layout)
   ═══════════════════════════════════════ */
const BENEFITS = ["14-day free trial", "No credit card required", "Setup in under 5 minutes"];

export function SignupPage() {
  const signup    = useAuthStore((state) => state.signup);
  const navigate  = useNavigate();
  const [fullName, setFullName]           = useState("");
  const [email, setEmail]                 = useState("");
  const [orgName, setOrgName]             = useState("");
  const [password, setPassword]           = useState("");
  const [submitting, setSubmitting]       = useState(false);
  const [error, setError]                 = useState("");

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await signup({ full_name: fullName, email, password, organization_name: orgName });
      navigate("/inbox");
    } catch {
      setError("Signup failed. Please check your details and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* Left — dark gradient */}
      <div
        className="hidden flex-col justify-between px-12 py-12 lg:flex lg:w-[45%]"
        style={{ background: "linear-gradient(180deg, #4F46E5 0%, #312E81 100%)" }}
      >
        {/* Logo */}
        <Link to="/" className="inline-flex items-center gap-2.5" aria-label="Flowlyra home">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/15 ring-1 ring-white/20">
            <svg viewBox="0 0 36 36" className="h-7 w-7">
              <path d="M7 14.5C10.2 8.8 17.7 7.8 22.1 11.8l2.1 1.9c1.7 1.5 4.1 1.2 5.8-.6" fill="none" stroke="white" strokeWidth="4.2" strokeLinecap="round" />
              <path d="M6 22.2c3.5 5.4 11.2 6.2 15.4 1.9l2.2-2.2c1.6-1.6 4.2-1.5 6.2.2" fill="none" stroke="white" strokeWidth="4.2" strokeLinecap="round" />
            </svg>
          </span>
          <span className="font-sans text-xl font-semibold text-white">Flowlyra</span>
        </Link>

        {/* Main copy */}
        <div>
          <h1 className="font-display text-[1.75rem] font-bold leading-[1.2] text-white">Start flowing free</h1>
          <p className="mt-3 text-base text-white/70">Deploy a world-class customer support platform in minutes.</p>
          <ul className="mt-6 grid gap-3">
            {BENEFITS.map((b) => (
              <li key={b} className="flex items-center gap-3 text-[15px] text-white/90">
                <Check size={16} className="shrink-0 text-emerald-400" />
                {b}
              </li>
            ))}
          </ul>
        </div>

        {/* Testimonial quote */}
        <div className="rounded-xl border border-white/10 bg-white/10 p-5 backdrop-blur">
          <p className="text-sm italic leading-relaxed text-white/85">"Setup took 15 minutes. Not days. Not weeks. Fifteen minutes."</p>
          <div className="mt-3 text-sm font-semibold text-white">Priya Nair</div>
          <div className="text-xs text-white/60">Support Operations Lead, BrightLine</div>
        </div>
      </div>

      {/* Right — form */}
      <div className="flex flex-1 flex-col items-center justify-center bg-white px-6 py-12 sm:px-10">
        {/* Mobile logo */}
        <Link to="/" className="mb-8 inline-flex items-center gap-2 lg:hidden" aria-label="Flowlyra home">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-indigo-50">
            <svg viewBox="0 0 36 36" className="h-6 w-6">
              <path d="M7 14.5C10.2 8.8 17.7 7.8 22.1 11.8l2.1 1.9c1.7 1.5 4.1 1.2 5.8-.6" fill="none" stroke="#4F46E5" strokeWidth="4.2" strokeLinecap="round" />
              <path d="M6 22.2c3.5 5.4 11.2 6.2 15.4 1.9l2.2-2.2c1.6-1.6 4.2-1.5 6.2.2" fill="none" stroke="#4F46E5" strokeWidth="4.2" strokeLinecap="round" />
            </svg>
          </span>
          <span className="font-sans text-lg font-semibold text-midnight">Flowlyra</span>
        </Link>

        <div className="w-full max-w-md">
          <h2 className="font-sans text-2xl font-bold text-midnight">Create your account</h2>
          <p className="mt-1 text-sm text-slate-500">Join 10,000+ support teams worldwide.</p>

          {error && (
            <div className="mt-4 rounded-lg border-l-[3px] border-l-red-500 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
              {error}
            </div>
          )}

          <form className="mt-6 grid gap-4" onSubmit={(e) => void submit(e)}>
            <Field label="Full name">
              <input required className={inputCls} placeholder="Your full name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </Field>
            <Field label="Work email">
              <input required type="email" className={inputCls} placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            </Field>
            <Field label="Company name">
              <input required className={inputCls} placeholder="Acme Inc." value={orgName} onChange={(e) => setOrgName(e.target.value)} />
            </Field>
            <Field label="Password">
              <input required type="password" minLength={8} className={inputCls} placeholder="Min. 8 characters" value={password} onChange={(e) => setPassword(e.target.value)} />
            </Field>
            <button
              type="submit"
              disabled={submitting}
              className="mt-1 flex h-[52px] w-full items-center justify-center rounded-xl bg-indigo-600 text-[16px] font-semibold text-white shadow-sm transition-all hover:bg-indigo-700 active:scale-[0.97] disabled:opacity-50"
            >
              {submitting ? "Creating workspace…" : "Start free trial"}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-slate-600">
            Already have an account?{" "}
            <Link to="/login" className="font-semibold text-indigo-600 hover:underline">Log in</Link>
          </p>
          <p className="mt-4 text-center text-xs text-slate-500">
            By signing up you agree to our{" "}
            <Link to="/terms" className="text-indigo-600 hover:underline">Terms</Link>
            {" "}and{" "}
            <Link to="/privacy" className="text-indigo-600 hover:underline">Privacy Policy</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
