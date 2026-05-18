import { CheckCircle2, ChevronRight, Globe2, Headphones, Layers3, LifeBuoy, LineChart, Lock, MessageSquareText, Network, ShieldCheck, Sparkles, Users, Workflow } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Link, NavLink, useNavigate, useParams } from "react-router-dom";
import { Button, Card, Pill, cx } from "../components/ui";
import flowlyraLogo from "../assets/flowlyra-logo.svg";
import flowlyraMark from "../assets/flowlyra-mark.svg";
import { api } from "../lib/api";
import { useAuthStore } from "../stores/authStore";

const topNav = [
  { to: "/features", label: "Features" },
  { to: "/pricing", label: "Pricing" },
  { to: "/solutions/customer-support", label: "Solutions" },
  { to: "/integrations", label: "Integrations" },
  { to: "/customers", label: "Customers" },
  { to: "/blog", label: "Blog" },
  { to: "/help", label: "Help" }
];

const solutionLinks = [
  { to: "/solutions/customer-support", label: "Customer Support" },
  { to: "/solutions/sales-marketing", label: "Sales & Marketing" },
  { to: "/solutions/enterprise", label: "Enterprise" }
];

const coreFeatures = [
  {
    icon: MessageSquareText,
    title: "Chat tools",
    items: ["Canned responses", "File sharing", "Chat tags", "Chat transfers"]
  },
  {
    icon: Workflow,
    title: "Engagement automation",
    items: ["Targeted greetings", "Routing rules", "Availability schedules", "Chat assignment"]
  },
  {
    icon: Globe2,
    title: "Messaging channels",
    items: ["Website widget", "Email handoff", "Social channels", "Mobile-ready experience"]
  },
  {
    icon: LineChart,
    title: "Reporting",
    items: ["Agent performance", "Chat satisfaction", "Response-time trends", "Conversion tracking"]
  },
  {
    icon: ShieldCheck,
    title: "Security",
    items: ["Access controls", "Audit-friendly logs", "Secure data handling", "Role-based permissions"]
  },
  {
    icon: Sparkles,
    title: "AI copilots",
    items: ["Reply assistance", "Conversation summaries", "Tag suggestions", "Tone improvements"]
  }
];

const plans = [
  {
    name: "Starter",
    audience: "Small teams",
    price: "$19",
    points: ["1 agent seat", "60-day history", "Basic customization", "Core reporting"]
  },
  {
    name: "Team",
    audience: "Growing support teams",
    price: "$49",
    points: ["Unlimited agents", "Unlimited history", "Full customization", "Team management"],
    highlighted: true
  },
  {
    name: "Business",
    audience: "Established departments",
    price: "$79",
    points: ["Advanced analytics", "Staff forecasting", "Work scheduler", "Priority operations"]
  },
  {
    name: "Enterprise",
    audience: "Large organizations",
    price: "Custom",
    points: ["Dedicated success support", "Custom security controls", "Scale architecture", "Tailored onboarding"]
  }
];

const integrations = [
  "Shopify",
  "WordPress",
  "Squarespace",
  "HubSpot",
  "Mailchimp",
  "Salesforce",
  "Zapier",
  "Slack",
  "Google Analytics",
  "BigCommerce",
  "Meta",
  "WhatsApp"
];

const audienceCards = [
  { label: "Support", title: "Resolve customers faster", body: "Route each visitor to the right queue, reply with AI-assisted context, and keep CSAT visible for every manager.", metric: "42% faster first reply" },
  { label: "Sales", title: "Turn high-intent traffic into demos", body: "Trigger page-specific greetings, capture leads before chat starts, and hand off qualified prospects without losing context.", metric: "3.1x more qualified chats" },
  { label: "Ops", title: "Control the whole workflow", body: "Use archives, transcripts, routing, files, tickets, and analytics in one operator-ready command center.", metric: "1 workspace for every team" }
];

interface PublicIncident {
  id: string;
  title: string;
  body: string;
  status: string;
  impact: string;
  components: string[];
  started_at?: string | null;
  resolved_at?: string | null;
}

interface PublicBlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content_markdown: string;
  cover_image_url?: string | null;
  tags: string[];
  published_at?: string | null;
}

function PublicLayout({ title, subtitle, children }: { title: string; subtitle: string; children: JSX.Element | JSX.Element[] }): JSX.Element {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link to="/" className="inline-flex items-center gap-3">
            <img src={flowlyraMark} alt="FlowLyra" className="h-10 w-10 rounded-2xl shadow-lg shadow-blue-900/10" />
            <span className="text-lg font-black tracking-tight">FlowLyra</span>
          </Link>
          <nav className="hidden items-center gap-1 lg:flex">
            {topNav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => cx("rounded-xl px-3 py-2 text-sm font-bold transition", isActive ? "bg-slate-950 text-white" : "text-slate-600 hover:bg-slate-100 hover:text-slate-950")}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/login"><Button variant="ghost" size="sm">Log in</Button></Link>
            <Link to="/product-tour"><Button variant="secondary" size="sm" className="hidden sm:inline-flex">Product tour</Button></Link>
            <Link to="/signup"><Button variant="primary" size="sm">Start free</Button></Link>
          </div>
        </div>
        <div className="border-t border-slate-200/80 lg:hidden">
          <div className="mx-auto flex w-full max-w-7xl gap-2 overflow-x-auto px-4 py-2 sm:px-6">
            {topNav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => cx("whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-bold", isActive ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900")}
              >
                {item.label}
              </NavLink>
            ))}
          </div>
        </div>
      </header>

      <main>
        <section className="relative border-b border-slate-200 bg-slate-50">
          <div className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-slate-200/70 blur-3xl" />
          <div className="pointer-events-none absolute right-0 top-32 h-80 w-80 rounded-full bg-blue-100/60 blur-3xl" />
          <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-14 sm:px-6 lg:grid-cols-[minmax(0,1fr)_430px] lg:items-center lg:py-20">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-black text-slate-700 shadow-sm"><Sparkles size={16} /> FlowLyra production suite</div>
              <h1 className="mt-5 max-w-4xl text-4xl font-black tracking-[-0.04em] text-slate-950 sm:text-5xl lg:text-6xl">{title}</h1>
              <p className="mt-5 max-w-2xl text-base leading-8 text-slate-600 sm:text-lg">{subtitle}</p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link to="/signup"><Button variant="primary" className="h-12 rounded-xl px-6">Start free</Button></Link>
                <Link to="/product-tour"><Button variant="secondary" className="h-12 rounded-xl px-6">View product tour</Button></Link>
              </div>
              <div className="mt-7 grid max-w-xl grid-cols-3 gap-3 text-center text-xs font-black uppercase tracking-wide text-slate-500">
                <div className="rounded-2xl border border-white bg-white/70 p-3 shadow-sm"><div className="text-2xl text-slate-950">2.4s</div>Avg reply</div>
                <div className="rounded-2xl border border-white bg-white/70 p-3 shadow-sm"><div className="text-2xl text-slate-950">98%</div>CSAT goal</div>
                <div className="rounded-2xl border border-white bg-white/70 p-3 shadow-sm"><div className="text-2xl text-slate-950">24/7</div>Coverage</div>
              </div>
            </div>
            <div className="relative">
              <div className="absolute -inset-4 rounded-[2rem] bg-slate-200/60 blur-2xl" />
              <Card className="relative overflow-hidden rounded-[2rem] border-white/80 bg-white/90 p-5 shadow-2xl shadow-blue-900/15 backdrop-blur sm:p-6">
                <div className="flex items-center justify-between gap-3">
                  <img src={flowlyraLogo} alt="FlowLyra logo" className="h-12 w-auto" />
                  <Pill tone="green" className="rounded-full">Live</Pill>
                </div>
                <div className="mt-5 rounded-3xl bg-slate-950 p-4 text-white">
                  <div className="flex items-center gap-2 text-xs font-bold text-blue-200"><span className="h-2 w-2 rounded-full bg-green-400" /> Visitor from pricing page</div>
                  <div className="mt-4 rounded-2xl bg-white/10 p-3 text-sm">Hi, do you offer team routing and file uploads?</div>
                  <div className="ml-auto mt-3 max-w-[85%] rounded-2xl bg-white p-3 text-sm text-slate-950 shadow-sm">Yes. FlowLyra routes by team, stores chat history, and supports secure attachments.</div>
                  <div className="mt-4 grid grid-cols-3 gap-2 text-center text-[11px] font-bold text-slate-300">
                    <div className="rounded-xl bg-white/10 p-2">AI draft</div>
                    <div className="rounded-xl bg-white/10 p-2">Transfer</div>
                    <div className="rounded-xl bg-white/10 p-2">Tag lead</div>
                  </div>
                </div>
                <div className="mt-5 grid gap-2 text-sm">
                  <Metric label="Live channels" value="Web + social + email" />
                  <Metric label="Automation" value="Rules + AI assistance" />
                  <Metric label="Analytics" value="Team and conversion reporting" />
                </div>
              </Card>
            </div>
          </div>
        </section>

        {children}
      </main>

      <footer className="border-t border-slate-200 bg-white/85 backdrop-blur">
        <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-4">
          <div>
            <img src={flowlyraMark} alt="FlowLyra mark" className="h-10 w-10 rounded-xl" />
            <p className="mt-3 text-sm leading-6 text-slate-600">FlowLyra helps teams deliver faster support and more reliable customer outcomes.</p>
          </div>
          <FooterColumn title="Product" links={[{ to: "/features", label: "Features" }, { to: "/pricing", label: "Pricing" }, { to: "/product-tour", label: "Product Tour" }, { to: "/integrations", label: "Integrations" }]} />
          <FooterColumn title="Solutions" links={solutionLinks} />
          <FooterColumn title="Company" links={[{ to: "/customers", label: "Customers" }, { to: "/contact", label: "Contact" }, { to: "/help", label: "Help Center" }, { to: "/status", label: "System Status" }, { to: "/privacy", label: "Privacy" }, { to: "/terms", label: "Terms" }]} />
        </div>
      </footer>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
      <span className="font-semibold text-slate-600">{label}</span>
      <span className="font-bold text-slate-900">{value}</span>
    </div>
  );
}

function FooterColumn({ title, links }: { title: string; links: Array<{ to: string; label: string }> }): JSX.Element {
  return (
    <div>
      <h2 className="text-sm font-black uppercase tracking-wide text-slate-700">{title}</h2>
      <div className="mt-3 grid gap-2">
        {links.map((link) => (
          <Link key={link.to} to={link.to} className="text-sm font-medium text-slate-600 hover:text-slate-900">
            {link.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

function FeatureGrid(): JSX.Element {
  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
      <div className="mb-6 flex items-center justify-between gap-3">
        <h2 className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">Everything needed for production support operations</h2>
        <Link to="/features" className="hidden items-center gap-1 text-sm font-semibold text-blue-700 hover:text-blue-900 sm:inline-flex">All features <ChevronRight size={16} /></Link>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {coreFeatures.map((feature) => (
          <Card key={feature.title} className="p-5">
            <div className="inline-grid h-10 w-10 place-items-center rounded-lg bg-blue-50 text-blue-700"><feature.icon size={20} /></div>
            <h3 className="mt-3 text-lg font-black text-slate-950">{feature.title}</h3>
            <div className="mt-3 grid gap-2">
              {feature.items.map((item) => (
                <div key={item} className="inline-flex items-center gap-2 text-sm text-slate-600"><CheckCircle2 size={15} className="text-green-600" />{item}</div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}

function InteractiveHomepage(): JSX.Element {
  const [selected, setSelected] = useState(0);
  const active = audienceCards[selected];
  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
      <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)] lg:items-stretch">
        <div>
          <Pill tone="blue" className="rounded-full">Interactive homepage</Pill>
          <h2 className="mt-4 text-3xl font-black tracking-tight text-slate-950">Choose a team and watch FlowLyra adapt</h2>
          <p className="mt-3 text-sm leading-7 text-slate-600">Each navigation page now has its own story, while the homepage gives visitors a clickable way to understand the product fast.</p>
          <div className="mt-5 grid gap-2">
            {audienceCards.map((item, index) => (
              <button
                key={item.label}
                type="button"
                onClick={() => setSelected(index)}
                className={cx("rounded-2xl border px-4 py-3 text-left transition", selected === index ? "border-blue-200 bg-blue-600 text-white shadow-xl shadow-blue-900/20" : "border-white bg-white/80 text-slate-700 shadow-sm hover:border-blue-200 hover:bg-blue-50")}
              >
                <div className="text-sm font-black">{item.label}</div>
                <div className={cx("text-xs", selected === index ? "text-blue-100" : "text-slate-500")}>{item.metric}</div>
              </button>
            ))}
          </div>
        </div>
        <Card className="overflow-hidden rounded-[2rem] border-white/80 bg-white/90 shadow-2xl shadow-slate-200/70">
          <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_300px]">
            <div className="p-6 sm:p-8">
              <div className="inline-flex items-center gap-2 rounded-full bg-green-50 px-3 py-2 text-xs font-black uppercase tracking-wide text-green-700"><span className="h-2 w-2 rounded-full bg-green-500" /> {active.label} workflow</div>
              <h3 className="mt-5 text-3xl font-black tracking-tight text-slate-950">{active.title}</h3>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">{active.body}</p>
              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                {["Live chat", "AI assist", "Reports"].map((item) => <div key={item} className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm font-black text-slate-800">{item}<div className="mt-2 h-2 rounded-full bg-blue-100"><div className="h-2 w-2/3 rounded-full bg-blue-600" /></div></div>)}
              </div>
            </div>
            <div className="bg-slate-950 p-5 text-white">
              <div className="text-xs font-bold uppercase tracking-wide text-blue-200">Agent view</div>
              <div className="mt-4 grid gap-3">
                <div className="rounded-2xl bg-white/10 p-3 text-sm">New visitor on /pricing</div>
                <div className="rounded-2xl bg-blue-500 p-3 text-sm shadow-lg">Suggested reply ready</div>
                <div className="rounded-2xl bg-white/10 p-3 text-sm">Transcript and file saved</div>
              </div>
              <div className="mt-6 rounded-2xl bg-green-400/15 p-4 text-sm font-black text-green-200">{active.metric}</div>
            </div>
          </div>
        </Card>
      </div>
    </section>
  );
}

function PricingBlocks(): JSX.Element {
  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
      <h2 className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">Pricing that scales with your team</h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">Simple per-agent plans with transparent feature tiers for launch, growth, and enterprise rollout.</p>
      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {plans.map((plan) => (
          <Card key={plan.name} className={cx("p-5", plan.highlighted && "ring-2 ring-blue-200") }>
            {plan.highlighted && <Pill tone="blue">Most popular</Pill>}
            <h3 className="mt-2 text-xl font-black text-slate-950">{plan.name}</h3>
            <p className="text-sm text-slate-600">{plan.audience}</p>
            <div className="mt-4 text-3xl font-black text-slate-950">{plan.price}<span className="ml-1 text-sm font-semibold text-slate-500">/agent</span></div>
            <div className="mt-4 grid gap-2 text-sm text-slate-600">
              {plan.points.map((point) => <div key={point} className="inline-flex items-center gap-2"><CheckCircle2 size={15} className="text-green-600" />{point}</div>)}
            </div>
            <Button className="mt-5 w-full" variant={plan.highlighted ? "primary" : "secondary"}>Choose {plan.name}</Button>
          </Card>
        ))}
      </div>
    </section>
  );
}

function IntegrationsBlock(): JSX.Element {
  return (
    <section className="border-y border-slate-200 bg-white">
      <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
        <h2 className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">Connect FlowLyra to your existing stack</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">Prebuilt integrations and webhook-ready APIs keep your sales, support, and ops data in sync.</p>
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {integrations.map((item) => (
            <div key={item} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-center text-sm font-semibold text-slate-700">{item}</div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTASection(): JSX.Element {
  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
      <Card className="overflow-hidden bg-[linear-gradient(120deg,#0f172a,#1e3a8a)] p-8 text-white">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div>
            <h2 className="text-2xl font-black tracking-tight sm:text-3xl">Launch-ready customer operations, not a prototype</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-blue-100 sm:text-base">Deploy FlowLyra with production routing, analytics, widget configuration, and multi-team collaboration.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link to="/signup"><Button variant="secondary" className="border-white/30 bg-white/10 text-white hover:bg-white/20">Start free</Button></Link>
            <Link to="/contact"><Button variant="secondary" className="border-white/30 bg-transparent text-white hover:bg-white/10">Talk to sales</Button></Link>
          </div>
        </div>
      </Card>
    </section>
  );
}

export function HomePage(): JSX.Element {
  return (
    <PublicLayout
      title="The AI live chat platform built to run real customer operations"
      subtitle="Increase conversions, improve support quality, and automate repetitive work with a production-ready chat and workflow suite."
    >
      <>
        <InteractiveHomepage />
        <FeatureGrid />
        <PricingBlocks />
        <IntegrationsBlock />
        <CTASection />
      </>
    </PublicLayout>
  );
}

export function FeaturesPage(): JSX.Element {
  return (
    <PublicLayout
      title="Features designed for support quality and sales performance"
      subtitle="From real-time chat handling to AI assistance and reporting, FlowLyra covers the entire customer conversation lifecycle."
    >
      <>
        <FeatureGrid />
        <section className="mx-auto w-full max-w-7xl px-4 pb-12 sm:px-6 sm:pb-16">
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="p-6">
              <h3 className="text-xl font-black text-slate-950">Team management</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">Groups, roles, workload controls, and routing logic keep agents efficient and conversations assigned correctly.</p>
              <div className="mt-4 grid gap-2 text-sm text-slate-600">
                <div className="inline-flex items-center gap-2"><Users size={16} className="text-blue-700" />Agent roles and permissions</div>
                <div className="inline-flex items-center gap-2"><Layers3 size={16} className="text-blue-700" />Multi-team routing groups</div>
                <div className="inline-flex items-center gap-2"><LifeBuoy size={16} className="text-blue-700" />Escalation-safe transfer flow</div>
              </div>
            </Card>
            <Card className="p-6">
              <h3 className="text-xl font-black text-slate-950">Platform reliability</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">Production environments need observability, consistency, and secure controls by default.</p>
              <div className="mt-4 grid gap-2 text-sm text-slate-600">
                <div className="inline-flex items-center gap-2"><Lock size={16} className="text-blue-700" />Role-based access boundaries</div>
                <div className="inline-flex items-center gap-2"><Network size={16} className="text-blue-700" />API + widget integration patterns</div>
                <div className="inline-flex items-center gap-2"><Headphones size={16} className="text-blue-700" />Operational workflows for busy teams</div>
              </div>
            </Card>
          </div>
        </section>
        <CTASection />
      </>
    </PublicLayout>
  );
}

export function PricingPage(): JSX.Element {
  return (
    <PublicLayout
      title="Transparent plans for teams at every growth stage"
      subtitle="Choose a plan for startup velocity, team-scale support, or enterprise-grade governance and scale."
    >
      <>
        <PricingBlocks />
        <section className="mx-auto w-full max-w-7xl px-4 pb-12 sm:px-6 sm:pb-16">
          <Card className="p-6">
            <h3 className="text-xl font-black text-slate-950">What every plan includes</h3>
            <div className="mt-4 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
              <div className="inline-flex items-center gap-2"><CheckCircle2 size={15} className="text-green-600" />Real-time messaging workspace</div>
              <div className="inline-flex items-center gap-2"><CheckCircle2 size={15} className="text-green-600" />Widget deployment and customization</div>
              <div className="inline-flex items-center gap-2"><CheckCircle2 size={15} className="text-green-600" />Routing and automation tools</div>
              <div className="inline-flex items-center gap-2"><CheckCircle2 size={15} className="text-green-600" />Analytics dashboards and exports</div>
            </div>
          </Card>
        </section>
        <CTASection />
      </>
    </PublicLayout>
  );
}

function SolutionPage({
  title,
  subtitle,
  points
}: {
  title: string;
  subtitle: string;
  points: Array<{ icon: JSX.Element; title: string; detail: string }>;
}): JSX.Element {
  return (
    <PublicLayout title={title} subtitle={subtitle}>
      <>
        <section className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
          <div className="mb-6 flex flex-wrap gap-2">
            {solutionLinks.map((item) => (
              <Link key={item.to} to={item.to}><Button size="sm" variant="secondary">{item.label}</Button></Link>
            ))}
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {points.map((point) => (
              <Card key={point.title} className="p-5">
                <div className="inline-grid h-10 w-10 place-items-center rounded-lg bg-blue-50 text-blue-700">{point.icon}</div>
                <h3 className="mt-3 text-lg font-black text-slate-950">{point.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{point.detail}</p>
              </Card>
            ))}
          </div>
        </section>
        <CTASection />
      </>
    </PublicLayout>
  );
}

export function SolutionSupportPage(): JSX.Element {
  return (
    <SolutionPage
      title="Customer support that protects satisfaction and retention"
      subtitle="Route customers to the right team, resolve faster, and maintain service quality with operational visibility."
      points={[
        { icon: <Workflow size={20} />, title: "Smart routing", detail: "Match incoming conversations to the right queue by page, profile, and business rules." },
        { icon: <Headphones size={20} />, title: "Faster response", detail: "Use canned responses, AI drafting, and context-rich timelines to reduce response times." },
        { icon: <LineChart size={20} />, title: "Quality tracking", detail: "Monitor CSAT, wait time, and resolution patterns to improve team-level performance." }
      ]}
    />
  );
}

export function SolutionSalesPage(): JSX.Element {
  return (
    <SolutionPage
      title="Sales and marketing workflows that convert intent into revenue"
      subtitle="Engage high-intent visitors at the right moment and guide them toward clear next actions."
      points={[
        { icon: <Sparkles size={20} />, title: "Targeted outreach", detail: "Launch contextual greetings on high-conversion pages and campaigns." },
        { icon: <MessageSquareText size={20} />, title: "Guided buying", detail: "Share key details in chat and move prospects from questions to purchase decisions." },
        { icon: <LineChart size={20} />, title: "Conversion analytics", detail: "Track chat-driven outcomes and tune scripts, routing, and handoff workflows." }
      ]}
    />
  );
}

export function SolutionEnterprisePage(): JSX.Element {
  return (
    <SolutionPage
      title="Enterprise governance with secure, scalable chat operations"
      subtitle="Support global teams with role controls, predictable processes, and multi-team operational governance."
      points={[
        { icon: <Lock size={20} />, title: "Control and compliance", detail: "Enforce strict access boundaries and secure data handling practices." },
        { icon: <Network size={20} />, title: "System integration", detail: "Integrate with enterprise CRM, workflow, and reporting systems." },
        { icon: <Users size={20} />, title: "Large-team operations", detail: "Coordinate many teams with clear ownership, routing, and escalation patterns." }
      ]}
    />
  );
}

export function IntegrationsPage(): JSX.Element {
  return (
    <PublicLayout
      title="Integrations that keep your entire customer stack connected"
      subtitle="Unify data between chat, CRM, marketing tools, and internal operations so your team never works blind."
    >
      <>
        <IntegrationsBlock />
        <section className="mx-auto w-full max-w-7xl px-4 pb-12 sm:px-6 sm:pb-16">
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="p-6">
              <h3 className="text-xl font-black text-slate-950">Marketplace integrations</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">Quickly connect tools already used by support, marketing, and commerce teams.</p>
            </Card>
            <Card className="p-6">
              <h3 className="text-xl font-black text-slate-950">Developer-friendly APIs</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">Use webhooks and APIs for custom workflows, event pipelines, and enterprise sync jobs.</p>
            </Card>
          </div>
        </section>
      </>
    </PublicLayout>
  );
}

export function CustomersPage(): JSX.Element {
  return (
    <PublicLayout
      title="Trusted by teams that treat support as a growth engine"
      subtitle="FlowLyra helps companies improve service outcomes while increasing conversion opportunities in customer conversations."
    >
      <>
        <section className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
          <div className="grid gap-4 md:grid-cols-3">
            {[
              { stat: "35,000+", label: "Businesses using live-chat style support platforms" },
              { stat: "30%", label: "Typical conversion lift reported after chat implementation" },
              { stat: "24/7", label: "Always-on customer coverage through asynchronous messaging" }
            ].map((item) => (
              <Card key={item.label} className="p-6 text-center">
                <div className="text-4xl font-black text-slate-950">{item.stat}</div>
                <p className="mt-2 text-sm text-slate-600">{item.label}</p>
              </Card>
            ))}
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <Card className="p-6">
              <p className="text-sm leading-6 text-slate-700">"Support team response time dropped and customer ratings improved after we standardized workflows in one chat workspace."</p>
              <div className="mt-3 text-sm font-black text-slate-900">Head of Customer Experience</div>
            </Card>
            <Card className="p-6">
              <p className="text-sm leading-6 text-slate-700">"Sales chats converted more consistently once routing and script quality became data-driven and measurable."</p>
              <div className="mt-3 text-sm font-black text-slate-900">Revenue Operations Lead</div>
            </Card>
          </div>
        </section>
        <CTASection />
      </>
    </PublicLayout>
  );
}

export function ProductTourPage(): JSX.Element {
  return (
    <PublicLayout
      title="Take a product tour before launch"
      subtitle="Review the full operation flow from visitor engagement to reporting so teams can deploy with confidence."
    >
      <>
        <section className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="p-6">
              <h3 className="text-xl font-black text-slate-950">Operator workspace</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">Inbox, tickets, contacts, and unified chat handling for day-to-day operations.</p>
            </Card>
            <Card className="p-6">
              <h3 className="text-xl font-black text-slate-950">Admin console</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">Routing, triggers, widget config, team management, and install controls.</p>
            </Card>
            <Card className="p-6">
              <h3 className="text-xl font-black text-slate-950">Analytics and quality</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">Track response speed, CSAT, staffing pressure, and team output trends.</p>
            </Card>
            <Card className="p-6">
              <h3 className="text-xl font-black text-slate-950">Deployment readiness</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">Widget embed snippets, API endpoints, and environment templates for production rollout.</p>
            </Card>
          </div>
        </section>
      </>
    </PublicLayout>
  );
}

export function HelpPage(): JSX.Element {
  return (
    <PublicLayout
      title="Help center and implementation guidance"
      subtitle="Get quick answers, deployment steps, and operational troubleshooting so your launch stays on schedule."
    >
      <>
        <section className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
          <div className="grid gap-4 md:grid-cols-2">
            <FAQCard q="How do I install the widget?" a="Use the script snippet from the Install page and set window.FlowLyraConfig with your org slug and API URL." />
            <FAQCard q="How do I configure routing?" a="Define rules in Admin > Routing and segment by page context, team ownership, or customer attributes." />
            <FAQCard q="How do I monitor quality?" a="Use Analytics dashboards to monitor response times, CSAT, and missed conversation trends." />
            <FAQCard q="Can I integrate with CRM tools?" a="Yes, use built-in integrations and API/webhook workflows for custom enterprise sync." />
          </div>
        </section>
      </>
    </PublicLayout>
  );
}

function FAQCard({ q, a }: { q: string; a: string }): JSX.Element {
  return (
    <Card className="p-6">
      <h3 className="text-lg font-black text-slate-950">{q}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-600">{a}</p>
    </Card>
  );
}

export function ContactPage(): JSX.Element {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent): Promise<void> {
    event.preventDefault();
    setSubmitting(true);
    try {
      await api.post("/public/contact", {
        full_name: fullName,
        email,
        company: company || undefined,
        message
      });
      toast.success("Request sent");
      setFullName("");
      setEmail("");
      setCompany("");
      setMessage("");
    } catch {
      toast.error("Could not send request");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PublicLayout
      title="Contact FlowLyra"
      subtitle="Speak with product and implementation support for pricing, migration, and production launch planning."
    >
      <>
        <section className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
          <Card className="p-6 sm:p-7">
            <form onSubmit={(event) => void submit(event)}>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2 text-sm font-semibold text-slate-700">
                Full name
                <input required className="h-10 rounded-lg border border-slate-300 px-3" placeholder="Your name" value={fullName} onChange={(event) => setFullName(event.target.value)} />
              </label>
              <label className="grid gap-2 text-sm font-semibold text-slate-700">
                Work email
                <input required type="email" className="h-10 rounded-lg border border-slate-300 px-3" placeholder="you@company.com" value={email} onChange={(event) => setEmail(event.target.value)} />
              </label>
            </div>
            <label className="mt-4 grid gap-2 text-sm font-semibold text-slate-700">
              Company
              <input className="h-10 rounded-lg border border-slate-300 px-3" placeholder="Company name" value={company} onChange={(event) => setCompany(event.target.value)} />
            </label>
            <label className="mt-4 grid gap-2 text-sm font-semibold text-slate-700">
              Message
              <textarea required minLength={10} className="min-h-28 rounded-lg border border-slate-300 px-3 py-2" placeholder="Tell us what you need for your launch" value={message} onChange={(event) => setMessage(event.target.value)} />
            </label>
            <Button type="submit" disabled={submitting} variant="primary" className="mt-5">{submitting ? "Sending..." : "Send request"}</Button>
            </form>
          </Card>
        </section>
      </>
    </PublicLayout>
  );
}

export function StatusPage(): JSX.Element {
  const [incidents, setIncidents] = useState<PublicIncident[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    void api.get<{ items: PublicIncident[] }>("/public/status/incidents")
      .then(({ data }) => {
        if (!alive) return;
        setIncidents(data.items || []);
      })
      .catch(() => {
        if (!alive) return;
        setIncidents([]);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  const active = incidents.filter((item) => item.status !== "resolved");
  const stateText = loading ? "Checking..." : active.length ? `${active.length} active incident${active.length === 1 ? "" : "s"}` : "All systems operational";

  return (
    <PublicLayout
      title="System status"
      subtitle="Current service health for chat delivery, widget infrastructure, and API platform."
    >
      <>
        <section className="mx-auto w-full max-w-4xl px-4 py-12 sm:px-6 sm:py-16">
          <Card className="p-6">
            <div className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold ${active.length ? "bg-amber-50 text-amber-800" : "bg-green-50 text-green-700"}`}>
              <CheckCircle2 size={16} /> {stateText}
            </div>
            <div className="mt-5 grid gap-3 text-sm">
              <Metric label="Realtime chat" value="Operational" />
              <Metric label="Widget CDN" value="Operational" />
              <Metric label="REST API" value="Operational" />
              <Metric label="Agent dashboard" value="Operational" />
            </div>
            <div className="mt-6 grid gap-3">
              {incidents.length === 0 && !loading ? <div className="text-sm text-slate-500">No incidents published recently.</div> : null}
              {incidents.map((incident) => (
                <div key={incident.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-black text-slate-900">{incident.title}</span>
                    <span className="rounded-full bg-slate-900 px-2 py-1 text-[11px] font-black uppercase text-white">{incident.status}</span>
                    <span className="rounded-full border border-slate-300 px-2 py-1 text-[11px] font-black uppercase text-slate-600">{incident.impact}</span>
                  </div>
                  {incident.body ? <p className="mt-2 text-sm leading-6 text-slate-700">{incident.body}</p> : null}
                  {incident.components.length ? <div className="mt-2 text-xs font-semibold text-slate-500">Components: {incident.components.join(", ")}</div> : null}
                </div>
              ))}
            </div>
          </Card>
        </section>
      </>
    </PublicLayout>
  );
}

export function BlogPage(): JSX.Element {
  const [posts, setPosts] = useState<PublicBlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    void api.get<{ items: PublicBlogPost[] }>("/public/blog/posts")
      .then(({ data }) => {
        if (!alive) return;
        setPosts(data.items || []);
      })
      .catch(() => {
        if (!alive) return;
        setPosts([]);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  return (
    <PublicLayout
      title="FlowLyra blog"
      subtitle="Product updates, operational playbooks, and support/sales best practices."
    >
      <>
        <section className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
          <div className="grid gap-4">
            {loading ? <Card className="p-6 text-sm text-slate-500">Loading posts...</Card> : null}
            {!loading && posts.length === 0 ? <Card className="p-6 text-sm text-slate-500">No posts published yet.</Card> : null}
            {posts.map((post) => (
              <Card key={post.id} className="p-6">
                <div className="text-xs font-black uppercase text-slate-500">{post.published_at ? formatDate(post.published_at) : "Draft"}</div>
                <h2 className="mt-2 text-2xl font-black text-slate-950"><Link to={`/blog/${post.slug}`} className="hover:underline">{post.title}</Link></h2>
                <p className="mt-2 text-sm leading-7 text-slate-600">{post.excerpt || "No excerpt provided."}</p>
                {post.tags.length ? <div className="mt-3 flex flex-wrap gap-2">{post.tags.map((tag) => <span key={tag} className="rounded-full border border-slate-200 px-2 py-1 text-xs font-bold text-slate-600">{tag}</span>)}</div> : null}
              </Card>
            ))}
          </div>
        </section>
      </>
    </PublicLayout>
  );
}

export function BlogPostPage(): JSX.Element {
  const { slug = "" } = useParams();
  const [post, setPost] = useState<PublicBlogPost | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    if (!slug) return () => {
      alive = false;
    };
    void api.get<{ item: PublicBlogPost }>(`/public/blog/posts/${slug}`)
      .then(({ data }) => {
        if (!alive) return;
        setPost(data.item ?? null);
      })
      .catch(() => {
        if (!alive) return;
        setPost(null);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [slug]);

  return (
    <PublicLayout
      title={post?.title || "Blog article"}
      subtitle={post?.excerpt || "Latest updates from the FlowLyra team."}
    >
      <>
        <section className="mx-auto w-full max-w-4xl px-4 py-12 sm:px-6 sm:py-16">
          {loading ? <Card className="p-6 text-sm text-slate-500">Loading article...</Card> : null}
          {!loading && !post ? <Card className="p-6 text-sm text-slate-500">Article not found.</Card> : null}
          {post ? (
            <Card className="p-6 sm:p-8">
              <div className="text-xs font-black uppercase text-slate-500">{post.published_at ? formatDate(post.published_at) : "Draft"}</div>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">{post.title}</h1>
              {post.tags.length ? <div className="mt-3 flex flex-wrap gap-2">{post.tags.map((tag) => <span key={tag} className="rounded-full border border-slate-200 px-2 py-1 text-xs font-bold text-slate-600">{tag}</span>)}</div> : null}
              <div className="prose prose-slate mt-6 max-w-none">
                {renderMarkdownAsParagraphs(post.content_markdown)}
              </div>
            </Card>
          ) : null}
        </section>
      </>
    </PublicLayout>
  );
}

export function PrivacyPage(): JSX.Element {
  return (
    <PublicLayout
      title="Privacy policy"
      subtitle="How FlowLyra handles customer and operational data in the platform."
    >
      <>
        <section className="mx-auto w-full max-w-4xl px-4 py-12 sm:px-6 sm:py-16">
          <Card className="grid gap-4 p-6 text-sm leading-7 text-slate-700">
            <h2 className="text-xl font-black text-slate-950">Data handling principles</h2>
            <p>FlowLyra processes support conversation data, operator metadata, and configuration settings to provide service functionality and reporting.</p>
            <p>Data is accessed according to role-based permissions, and operational access should be restricted to authorized staff only.</p>
            <p>For production use, customers should configure retention policies and compliance workflows based on their legal requirements.</p>
          </Card>
        </section>
      </>
    </PublicLayout>
  );
}

export function TermsPage(): JSX.Element {
  return (
    <PublicLayout
      title="Terms of service"
      subtitle="Core service usage terms for teams operating FlowLyra in production environments."
    >
      <>
        <section className="mx-auto w-full max-w-4xl px-4 py-12 sm:px-6 sm:py-16">
          <Card className="grid gap-4 p-6 text-sm leading-7 text-slate-700">
            <h2 className="text-xl font-black text-slate-950">Service terms overview</h2>
            <p>Users are responsible for lawful use of messaging channels, data processing, and customer communication practices.</p>
            <p>Account owners manage team permissions, billing obligations, and integration usage under their organization workspace.</p>
            <p>FlowLyra may update platform functionality over time to maintain reliability, security, and product quality.</p>
          </Card>
        </section>
      </>
    </PublicLayout>
  );
}

export function SignupPage(): JSX.Element {
  const signup = useAuthStore((state) => state.signup);
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [organizationSlug, setOrganizationSlug] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent): Promise<void> {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await signup({
        full_name: fullName,
        email,
        password,
        organization_name: organizationName,
        organization_slug: organizationSlug || undefined
      });
      navigate("/inbox");
    } catch {
      setError("Signup failed. Please review your details and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PublicLayout
      title="Start your FlowLyra trial"
      subtitle="Create your workspace and deploy a production-ready support flow in minutes."
    >
      <>
        <section className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
          <Card className="p-6 sm:p-7">
            <form onSubmit={(event) => void submit(event)}>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2 text-sm font-semibold text-slate-700">
                Full name
                <input required className="h-10 rounded-lg border border-slate-300 px-3" placeholder="Muhammad Ahsan" value={fullName} onChange={(event) => setFullName(event.target.value)} />
              </label>
              <label className="grid gap-2 text-sm font-semibold text-slate-700">
                Work email
                <input required type="email" className="h-10 rounded-lg border border-slate-300 px-3" placeholder="you@company.com" value={email} onChange={(event) => setEmail(event.target.value)} />
              </label>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2 text-sm font-semibold text-slate-700">
                Company
                <input required className="h-10 rounded-lg border border-slate-300 px-3" placeholder="Company name" value={organizationName} onChange={(event) => setOrganizationName(event.target.value)} />
              </label>
              <label className="grid gap-2 text-sm font-semibold text-slate-700">
                Workspace slug
                <input className="h-10 rounded-lg border border-slate-300 px-3" placeholder="my-company" value={organizationSlug} onChange={(event) => setOrganizationSlug(event.target.value)} />
              </label>
            </div>
            <label className="mt-4 grid gap-2 text-sm font-semibold text-slate-700">
              Password
              <input required minLength={8} type="password" className="h-10 rounded-lg border border-slate-300 px-3" placeholder="At least 8 characters" value={password} onChange={(event) => setPassword(event.target.value)} />
            </label>
            {error && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{error}</p>}
            <Button type="submit" disabled={submitting} variant="primary" className="mt-5">{submitting ? "Creating..." : "Create workspace"}</Button>
            </form>
          </Card>
        </section>
      </>
    </PublicLayout>
  );
}

function renderMarkdownAsParagraphs(markdown: string): JSX.Element[] {
  return markdown
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      if (line.startsWith("### ")) return <h3 key={`${index}:${line}`} className="mt-6 text-xl font-black">{line.slice(4)}</h3>;
      if (line.startsWith("## ")) return <h2 key={`${index}:${line}`} className="mt-8 text-2xl font-black">{line.slice(3)}</h2>;
      if (line.startsWith("# ")) return <h1 key={`${index}:${line}`} className="mt-8 text-3xl font-black">{line.slice(2)}</h1>;
      return <p key={`${index}:${line}`}>{line}</p>;
    });
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(date);
}

export function NotFoundPage(): JSX.Element {
  return (
    <div className="grid min-h-screen place-items-center bg-slate-50 px-4">
      <Card className="w-full max-w-md p-7 text-center">
        <h1 className="text-3xl font-black text-slate-950">Page not found</h1>
        <p className="mt-2 text-sm text-slate-600">The page you requested does not exist in FlowLyra.</p>
        <div className="mt-5 flex justify-center gap-2">
          <Link to="/"><Button variant="primary">Go home</Button></Link>
          <Link to="/login"><Button variant="secondary">Go to app</Button></Link>
        </div>
      </Card>
    </div>
  );
}
