import {
  ArrowRight, Bot, CheckCircle2, ChevronDown, ChevronRight, CreditCard, Globe2,
  Headphones, Layers3, LifeBuoy, LineChart, Lock, Mail, MessageSquareText,
  Network, Play, ShieldCheck, Sparkles, Star, TrendingUp, Truck, Users, Workflow,
  Zap, Send, type LucideIcon,
} from "lucide-react";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Button, Card, Pill, cx } from "../components/ui";
import flowlyraLogo from "../assets/flowlyra-logo.svg";
import flowlyraMark from "../assets/flowlyra-mark.svg";
import { api } from "../lib/api";
import { useAuthStore } from "../stores/authStore";
import { MarketingNavigation } from "../components/MarketingNavigation";

/* ================================================================
   DATA
   ================================================================ */

const topNav = [
  { to: "/features", label: "Product" },
  { to: "/solutions/customer-support", label: "Solutions" },
  { to: "/pricing", label: "Pricing" },
  { to: "/customers", label: "Customers" },
  { to: "/integrations", label: "Resources" },
];

const solutionLinks = [
  { to: "/solutions/customer-support", label: "Customer Support" },
  { to: "/solutions/sales-marketing", label: "Sales & Marketing" },
  { to: "/solutions/enterprise", label: "Enterprise" },
];

const coreFeatures = [
  { icon: MessageSquareText, title: "Chat tools", items: ["Canned responses", "File sharing", "Chat tags", "Chat transfers"] },
  { icon: Workflow, title: "Engagement automation", items: ["Targeted greetings", "Routing rules", "Availability schedules", "Chat assignment"] },
  { icon: Globe2, title: "Messaging channels", items: ["Website widget", "Email handoff", "Social channels", "Mobile-ready experience"] },
  { icon: LineChart, title: "Reporting", items: ["Agent performance", "Chat satisfaction", "Response-time trends", "Conversion tracking"] },
  { icon: ShieldCheck, title: "Security", items: ["Access controls", "Audit-friendly logs", "Secure data handling", "Role-based permissions"] },
  { icon: Sparkles, title: "AI copilots", items: ["Reply assistance", "Conversation summaries", "Tag suggestions", "Tone improvements"] },
];

const integrationsList = [
  "Shopify", "WordPress", "HubSpot", "Salesforce", "Slack", "Zapier",
  "Mailchimp", "Google Analytics", "BigCommerce", "Meta", "WhatsApp", "Stripe",
  "Intercom", "Zendesk", "Jira", "Notion", "Pipedrive", "Freshdesk",
];

const heroPhrases = ["Increase online sales", "Improve customer satisfaction", "Automate customer service"];

const marqueeNames = [
  "Acme Corp", "Globex Inc", "Initech", "Umbrella Co", "Stark Industries",
  "Wayne Ent.", "Cyberdyne", "Aperture", "Oscorp", "Massive Dynamic",
];

const salesFeatures = [
  { icon: MessageSquareText, label: "Pre-set messages" },
  { icon: CreditCard, label: "Product cards" },
  { icon: TrendingUp, label: "Proactive engagement" },
  { icon: Zap, label: "Quick replies" },
];

const satisfactionFeatures = [
  { icon: MessageSquareText, label: "Unified inbox" },
  { icon: Users, label: "Customer data panel" },
  { icon: Zap, label: "Fast response times" },
];

const aiFeatures = [
  { icon: Sparkles, label: "AI Copilot" },
  { icon: Bot, label: "Chatbot builder" },
  { icon: Network, label: "Smart routing" },
  { icon: Mail, label: "Text enhancement" },
];

const testimonials = [
  { name: "Sarah Chen", company: "TechRetail Co", role: "VP of Customer Success", quote: "FlowLyra reduced our first response time by 62% and our CSAT scores jumped 18 points in the first quarter.", rating: 5 },
  { name: "Marcus Rodriguez", company: "GrowthStack", role: "Head of Sales", quote: "We saw a 3.2x increase in qualified leads after deploying FlowLyra's proactive chat on our product pages.", rating: 5 },
  { name: "Emma Johansson", company: "Nordic SaaS AB", role: "COO", quote: "The AI Copilot handles 40% of routine inquiries automatically. Our agents focus on high-value conversations now.", rating: 5 },
];

const homepagePlans = [
  { name: "Starter", price: "$19", period: "/mo", audience: "Small teams", points: ["1 agent seat", "Basic live chat", "Email support", "14-day history", "1 website"], cta: "Get started", highlighted: false },
  { name: "Team", price: "$39", period: "/agent/mo", audience: "Growing teams", points: ["Unlimited agents", "AI suggestions", "Integrations", "Reports & analytics", "3 websites", "1-year history", "Chatbot"], cta: "Start free trial", highlighted: true },
  { name: "Business", price: "$59", period: "/agent/mo", audience: "Established teams", points: ["Everything in Team", "Automation workflows", "Advanced chatbot", "AI Copilot", "5 websites", "Unlimited history", "SLA policies"], cta: "Start free trial", highlighted: false },
];

/* ================================================================
   INTERFACES
   ================================================================ */

interface PublicIncident {
  id: string; title: string; body: string; status: string; impact: string; components: string[];
  started_at?: string | null; resolved_at?: string | null;
}

interface PublicBlogPost {
  id: string; slug: string; title: string; excerpt: string; content_markdown: string;
  cover_image_url?: string | null; tags: string[]; published_at?: string | null;
}

/* ================================================================
   SHARED HELPERS (used by all pages including Home/Pricing)
   ================================================================ */

function Metric({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div className="flex items-center justify-between rounded-lg bg-navy-50 px-3 py-2">
      <span className="font-semibold text-navy-500">{label}</span>
      <span className="font-bold text-navy-700">{value}</span>
    </div>
  );
}

function FooterColumn({ title, links }: { title: string; links: Array<{ to: string; label: string }> }): JSX.Element {
  return (
    <div>
      <h2 className="text-sm font-black uppercase tracking-wide text-navy-400">{title}</h2>
      <div className="mt-3 grid gap-2">
        {links.map((link) => (
          <Link key={link.to} to={link.to} className="text-sm font-medium text-navy-400 hover:text-white transition-colors">{link.label}</Link>
        ))}
      </div>
    </div>
  );
}

/* ================================================================
   SITE FOOTER (shared by Home & Pricing standalone pages)
   ================================================================ */

function SiteFooter(): JSX.Element {
  return (
    <footer className="bg-navy-900 text-navy-300" role="contentinfo">
      <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-6">
        <div className="lg:col-span-1">
          <Link to="/" className="inline-flex items-center gap-2.5">
            <img src={flowlyraMark} alt="" className="h-9 w-9 rounded-xl" />
            <span className="font-display text-lg font-extrabold text-white">FlowLyra</span>
          </Link>
          <p className="mt-4 text-sm leading-6 text-navy-400">Conversations that move.</p>
          {/* Social icons */}
          <div className="mt-5 flex gap-3">
            {["X", "Li", "Gh", "Yt"].map((s) => (
              <span key={s} className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-white/5 text-xs font-bold text-navy-400 hover:bg-white/10 hover:text-white transition-colors cursor-pointer">{s}</span>
            ))}
          </div>
        </div>
        <FooterColumn title="Product" links={[{ to: "/features", label: "Features" }, { to: "/pricing", label: "Pricing" }, { to: "/integrations", label: "Integrations" }, { to: "/product-tour", label: "Product Tour" }, { to: "/help", label: "Help Center" }]} />
        <FooterColumn title="Solutions" links={solutionLinks} />
        <FooterColumn title="Resources" links={[{ to: "/customers", label: "Customers" }, { to: "/blog", label: "Blog" }, { to: "/help", label: "Documentation" }, { to: "/help", label: "API Reference" }]} />
        <FooterColumn title="Company" links={[{ to: "/contact", label: "Contact" }, { to: "/customers", label: "About" }, { to: "/status", label: "Status" }, { to: "/blog", label: "Careers" }]} />
        <FooterColumn title="Legal" links={[{ to: "/privacy", label: "Privacy" }, { to: "/terms", label: "Terms" }, { to: "/privacy", label: "Security" }, { to: "/terms", label: "Cookies" }]} />
      </div>
      <div className="border-t border-white/5">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-5 sm:flex-row sm:px-6">
          <p className="text-xs text-navy-400">&copy; {new Date().getFullYear()} FlowLyra. All rights reserved.</p>
          <p className="text-xs text-navy-400">Built with care for customer-obsessed teams.</p>
        </div>
      </div>
    </footer>
  );
}

/* ================================================================
   HOME PAGE
   ================================================================ */

function HeroChatMockup(): JSX.Element {
  return (
    <div className="relative mx-auto w-full max-w-lg">
      <div className="absolute -inset-6 rounded-[2.5rem] bg-gradient-to-br from-brand-200/40 to-brand-100/20 blur-3xl animate-float" />
      <Card className="relative overflow-hidden rounded-3xl border-white/80 bg-white/95 p-5 shadow-lift sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <img src={flowlyraLogo} alt="FlowLyra" className="h-10 w-auto" />
          <Pill tone="green" className="rounded-full">Live</Pill>
        </div>
        <div className="mt-5 rounded-2xl bg-navy-900 p-4 text-white">
          <div className="flex items-center gap-2 text-xs font-bold text-brand-300"><span className="h-2 w-2 animate-pulse-dot rounded-full bg-brand-500" /> Visitor on pricing page</div>
          <div className="mt-4 rounded-xl bg-white/10 p-3 text-sm">Hi, do you offer team routing and AI features?</div>
          <div className="ml-auto mt-2.5 max-w-[85%] rounded-xl bg-brand-500 p-3 text-sm shadow-lg shadow-brand/20">Yes! FlowLyra routes by team, stores history, and includes AI copilot assistance.</div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[11px] font-bold text-navy-400">
            <div className="rounded-lg bg-white/5 p-2 hover:bg-white/10 transition-colors cursor-pointer">AI draft</div>
            <div className="rounded-lg bg-white/5 p-2 hover:bg-white/10 transition-colors cursor-pointer">Transfer</div>
            <div className="rounded-lg bg-white/5 p-2 hover:bg-white/10 transition-colors cursor-pointer">Tag lead</div>
          </div>
        </div>
        <div className="mt-4 grid gap-2 text-sm">
          <Metric label="Live channels" value="Web + social + email" />
          <Metric label="Automation" value="Rules + AI assistance" />
          <Metric label="Analytics" value="Team and conversion reporting" />
        </div>
      </Card>
    </div>
  );
}

function SocialProofBar(): JSX.Element {
  return (
    <section className="relative overflow-hidden border-b border-navy-100/60 bg-navy-50/50 dark:border-navy-800/60 dark:bg-navy-900/30">
      <p className="py-5 text-center text-xs font-bold uppercase tracking-widest text-navy-400">Trusted by 35,000+ companies worldwide</p>
      <div className="relative">
        <div className="absolute left-0 top-0 z-10 h-full w-24 bg-gradient-to-r from-slate-50/80 to-transparent dark:from-navy-900/80" />
        <div className="absolute right-0 top-0 z-10 h-full w-24 bg-gradient-to-l from-slate-50/80 to-transparent dark:from-navy-900/80" />
        <div className="marquee-track" aria-hidden="true">
          {[...marqueeNames, ...marqueeNames].map((name, i) => (
            <div key={`${name}-${i}`} className="mx-3 flex h-12 w-32 shrink-0 items-center justify-center rounded-xl border border-navy-100/80 bg-white px-4 text-sm font-bold text-navy-400 dark:border-navy-700/60 dark:bg-navy-800/60 dark:text-navy-400">
              {name}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FeatureRow({ title, subtitle, features, reversed, accent }: { title: string; subtitle: string; features: Array<{ icon: LucideIcon; label: string }>; reversed?: boolean; accent?: string }): JSX.Element {
  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-20 sm:px-6 sm:py-28">
      <div className={cx("grid items-center gap-12 lg:grid-cols-2 lg:gap-20", reversed && "lg:direction-rtl")}>
        <div className={cx(reversed && "lg:order-2")}>
          <Pill tone="orange" className="rounded-full">{accent || "Feature"}</Pill>
          <h2 className="font-display mt-4 text-3xl font-extrabold tracking-tight text-navy-700 sm:text-4xl dark:text-white">{title}</h2>
          <p className="mt-4 max-w-lg text-base leading-7 text-navy-500 dark:text-navy-400">{subtitle}</p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {features.map((f) => (
              <div key={f.label} className="inline-flex items-center gap-3 rounded-xl border border-navy-100 bg-white p-3.5 shadow-xs dark:border-navy-800 dark:bg-navy-800/50">
                <div className="inline-grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-500 dark:bg-brand-950/30"><f.icon size={20} /></div>
                <span className="text-sm font-semibold text-navy-700 dark:text-navy-200">{f.label}</span>
              </div>
            ))}
          </div>
        </div>
        <div className={cx(reversed && "lg:order-1")}>
          <div className="relative">
            <div className="absolute -inset-4 rounded-3xl bg-gradient-to-br from-brand-100/40 to-transparent blur-2xl dark:from-brand-900/20" />
            <Card className="relative overflow-hidden rounded-3xl border-white/80 bg-gradient-to-br from-white to-navy-50/80 p-8 shadow-lift dark:from-navy-800 dark:to-navy-900 dark:border-navy-700">
              <div className="grid gap-3">
                <div className="h-3 w-3/5 rounded-full bg-brand-200/60 dark:bg-brand-900/30" />
                <div className="h-3 w-4/5 rounded-full bg-navy-200/60 dark:bg-navy-700/30" />
                <div className="h-3 w-2/5 rounded-full bg-navy-200/40 dark:bg-navy-700/20" />
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-brand-50 p-4 dark:bg-brand-950/20"><div className="h-8 w-8 rounded-lg bg-brand-200/50 dark:bg-brand-800/30" /></div>
                  <div className="rounded-xl bg-navy-50 p-4 dark:bg-navy-800/50"><div className="h-8 w-8 rounded-lg bg-navy-200/50 dark:bg-navy-700/30" /></div>
                </div>
                <div className="mt-2 h-24 rounded-xl bg-navy-100/80 dark:bg-navy-800/30" />
              </div>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
}

function IntegrationsSection(): JSX.Element {
  return (
    <section className="border-y border-navy-100/60 bg-white dark:border-navy-800/60 dark:bg-navy-900/20">
      <div className="mx-auto w-full max-w-7xl px-4 py-20 sm:px-6 sm:py-28">
        <div className="text-center">
          <Pill tone="orange" className="rounded-full">Integrations</Pill>
          <h2 className="font-display mt-4 text-3xl font-extrabold tracking-tight text-navy-700 sm:text-4xl dark:text-white">200+ integrations</h2>
          <p className="mx-auto mt-3 max-w-2xl text-base text-navy-500 dark:text-navy-400">Connect FlowLyra to the tools your team already uses.</p>
        </div>
        <div className="mt-10 grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
          {integrationsList.map((name) => (
            <div key={name} className="flex items-center justify-center rounded-xl border border-navy-100 bg-navy-50 p-4 text-sm font-semibold text-navy-500 transition-all hover:border-brand-200 hover:bg-brand-50 hover:text-brand-600 hover:shadow-xs dark:border-navy-800 dark:bg-navy-800/40 dark:text-navy-400 dark:hover:border-brand-800 dark:hover:bg-brand-950/20 dark:hover:text-brand-400 cursor-default">
              {name}
            </div>
          ))}
        </div>
        <div className="mt-8 text-center">
          <Link to="/integrations" className="inline-flex items-center gap-1.5 text-sm font-bold text-brand-500 hover:text-brand-600 transition-colors">
            View all integrations <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </section>
  );
}

function TestimonialsSection(): JSX.Element {
  return (
    <section className="bg-navy-50/50 dark:bg-navy-950/30">
      <div className="mx-auto w-full max-w-7xl px-4 py-20 sm:px-6 sm:py-28">
        <div className="text-center">
          <Pill tone="orange" className="rounded-full">Testimonials</Pill>
          <h2 className="font-display mt-4 text-3xl font-extrabold tracking-tight text-navy-700 sm:text-4xl dark:text-white">Loved by support teams everywhere</h2>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {testimonials.map((t) => (
            <Card key={t.name} className="p-6 dark:bg-navy-800/60 dark:border-navy-700/50">
              <div className="flex gap-0.5">
                {Array.from({ length: t.rating }).map((_, i) => <Star key={i} size={16} className="fill-brand-400 text-brand-400" />)}
              </div>
              <p className="mt-4 text-sm leading-7 text-navy-600 dark:text-navy-300">&ldquo;{t.quote}&rdquo;</p>
              <div className="mt-5 flex items-center gap-3 border-t border-navy-100 pt-4 dark:border-navy-700/50">
                <div className="grid h-10 w-10 place-items-center rounded-full bg-brand-100 text-sm font-bold text-brand-600 dark:bg-brand-900/30 dark:text-brand-400">{t.name[0]}</div>
                <div>
                  <div className="text-sm font-bold text-navy-700 dark:text-white">{t.name}</div>
                  <div className="text-xs text-navy-400">{t.role}, {t.company}</div>
                </div>
              </div>
            </Card>
          ))}
        </div>
        <div className="mt-12 grid grid-cols-2 gap-6 md:grid-cols-4">
          {[
            { stat: "35,000+", label: "Companies" },
            { stat: "98%", label: "Customer satisfaction" },
            { stat: "2.4s", label: "Avg. response time" },
            { stat: "24/7", label: "Availability" },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <div className="font-display text-3xl font-extrabold gradient-text">{s.stat}</div>
              <div className="mt-1 text-sm font-semibold text-navy-400">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function PricingPreviewSection(): JSX.Element {
  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-20 sm:px-6 sm:py-28">
      <div className="text-center">
        <Pill tone="orange" className="rounded-full">Pricing</Pill>
        <h2 className="font-display mt-4 text-3xl font-extrabold tracking-tight text-navy-700 sm:text-4xl dark:text-white">Simple, transparent pricing</h2>
        <p className="mx-auto mt-3 max-w-2xl text-base text-navy-500 dark:text-navy-400">Start free. No credit card required.</p>
      </div>
      <div className="mt-12 grid gap-5 md:grid-cols-3">
        {homepagePlans.map((plan) => (
          <Card
            key={plan.name}
            className={cx(
              "relative p-6 transition-shadow dark:bg-navy-800/60 dark:border-navy-700/50",
              plan.highlighted && "ring-2 ring-brand-400 shadow-glow dark:ring-brand-500"
            )}
          >
            {plan.highlighted && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand-500 px-3 py-1 text-xs font-bold text-white shadow-glow">Most popular</span>
            )}
            <h3 className="font-display text-lg font-bold text-navy-700 dark:text-white">{plan.name}</h3>
            <p className="text-sm text-navy-400">{plan.audience}</p>
            <div className="mt-4 flex items-baseline gap-1">
              <span className="font-display text-4xl font-extrabold text-navy-700 dark:text-white">{plan.price}</span>
              <span className="text-sm font-medium text-navy-400">{plan.period}</span>
            </div>
            <div className="mt-5 grid gap-2.5 text-sm text-navy-500 dark:text-navy-400">
              {plan.points.map((pt) => (
                <div key={pt} className="flex items-center gap-2"><CheckCircle2 size={16} className="shrink-0 text-brand-500" />{pt}</div>
              ))}
            </div>
            <Link
              to="/signup"
              className={cx(
                "mt-6 flex h-11 w-full items-center justify-center rounded-xl text-sm font-bold transition-all",
                plan.highlighted
                  ? "bg-brand-500 text-white shadow-glow hover:bg-brand-600 hover:shadow-glow-lg"
                  : "border border-navy-100 bg-white text-navy-700 hover:border-brand-200 hover:bg-brand-50 dark:border-navy-700 dark:bg-navy-800 dark:text-navy-200 dark:hover:border-brand-800"
              )}
            >
              {plan.cta}
            </Link>
          </Card>
        ))}
      </div>
      <div className="mt-8 text-center">
        <Link to="/pricing" className="inline-flex items-center gap-1.5 text-sm font-bold text-brand-500 hover:text-brand-600 transition-colors">
          See all plans <ArrowRight size={16} />
        </Link>
      </div>
    </section>
  );
}

function CTASection(): JSX.Element {
  const [email, setEmail] = useState("");
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-brand-500 via-brand-600 to-brand-700">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.15),transparent_50%)]" />
      <div className="relative mx-auto w-full max-w-7xl px-4 py-20 sm:px-6 sm:py-28">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-extrabold tracking-tight text-white sm:text-4xl lg:text-5xl">
            Ready to transform your customer conversations?
          </h2>
          <p className="mt-4 text-base leading-7 text-brand-100">
            Join 35,000+ companies using FlowLyra to deliver exceptional customer experiences.
          </p>
          <form
            className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center"
            onSubmit={(e) => { e.preventDefault(); toast.success("Welcome! Check your email."); setEmail(""); }}
          >
            <input
              type="email"
              required
              placeholder="Enter your work email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-12 w-full rounded-xl border-2 border-white/20 bg-white/10 px-4 text-sm text-white placeholder-white/60 backdrop-blur-sm outline-none transition-all focus:border-white/40 focus:ring-4 focus:ring-white/10 sm:max-w-sm"
              aria-label="Work email"
            />
            <button
              type="submit"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-white px-6 text-sm font-bold text-brand-600 shadow-lg transition-all hover:bg-brand-50 hover:shadow-xl sm:w-auto"
            >
              Start free trial <ArrowRight size={16} />
            </button>
          </form>
          <p className="mt-4 text-xs text-brand-200">No credit card required. 14-day free trial on all plans.</p>
        </div>
      </div>
    </section>
  );
}

/* ================================================================
   EXPORTED: HomePage
   ================================================================ */

export function HomePage(): JSX.Element {
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [phraseVisible, setPhraseVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setPhraseVisible(false);
      setTimeout(() => {
        setPhraseIndex((prev) => (prev + 1) % heroPhrases.length);
        setPhraseVisible(true);
      }, 300);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-white font-sans text-navy-700 dark:bg-navy-950 dark:text-navy-100">
      <MarketingNavigation />

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute -left-32 top-0 h-[600px] w-[600px] rounded-full bg-brand-100/30 blur-3xl dark:bg-brand-900/10" />
          <div className="pointer-events-none absolute -right-32 bottom-0 h-[500px] w-[500px] rounded-full bg-brand-50/40 blur-3xl dark:bg-brand-950/10" />
          <div className="relative mx-auto grid w-full max-w-7xl items-center gap-10 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-2 lg:gap-16 lg:py-32">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3.5 py-2 text-xs font-bold text-brand-600 dark:border-brand-800 dark:bg-brand-950/30 dark:text-brand-400">
                <Sparkles size={14} /> Now with AI Copilot
              </div>
              <h1 className="font-display mt-6 max-w-2xl text-4xl font-extrabold tracking-[-0.03em] text-navy-700 sm:text-5xl lg:text-6xl dark:text-white">
                Conversations that <span className="gradient-text">move</span>
              </h1>
              <div className="mt-4 h-8 overflow-hidden">
                <p
                  className={cx(
                    "font-display text-lg font-semibold text-brand-500 transition-all duration-300 sm:text-xl",
                    phraseVisible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
                  )}
                >
                  {heroPhrases[phraseIndex]}
                </p>
              </div>
              <p className="mt-2 max-w-xl text-base leading-7 text-navy-500 dark:text-navy-400">
                Increase conversions, improve support quality, and automate repetitive work with a production-ready chat and workflow suite.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link to="/signup" className="inline-flex h-12 items-center gap-2 rounded-xl bg-brand-500 px-6 text-sm font-bold text-white shadow-glow transition-all hover:bg-brand-600 hover:shadow-glow-lg">
                  Start free trial <ArrowRight size={16} />
                </Link>
                <Link
                  to="/product-tour"
                  className="inline-flex h-12 items-center gap-2 rounded-xl border border-navy-100 bg-white px-6 text-sm font-bold text-navy-700 shadow-xs transition-all hover:border-brand-200 hover:bg-brand-50 dark:border-navy-700 dark:bg-navy-800 dark:text-navy-200 dark:hover:border-brand-800"
                >
                  <Play size={16} /> Watch demo
                </Link>
              </div>
              <div className="mt-10 grid max-w-md grid-cols-3 gap-3">
                <div className="rounded-xl border border-navy-100 bg-white p-3 text-center shadow-xs dark:border-navy-800 dark:bg-navy-800/50">
                  <div className="font-display text-xl font-extrabold text-navy-700 dark:text-white">2.4s</div>
                  <div className="mt-0.5 text-xs font-semibold text-navy-400">Avg reply</div>
                </div>
                <div className="rounded-xl border border-navy-100 bg-white p-3 text-center shadow-xs dark:border-navy-800 dark:bg-navy-800/50">
                  <div className="font-display text-xl font-extrabold text-navy-700 dark:text-white">98%</div>
                  <div className="mt-0.5 text-xs font-semibold text-navy-400">CSAT goal</div>
                </div>
                <div className="rounded-xl border border-navy-100 bg-white p-3 text-center shadow-xs dark:border-navy-800 dark:bg-navy-800/50">
                  <div className="font-display text-xl font-extrabold text-navy-700 dark:text-white">24/7</div>
                  <div className="mt-0.5 text-xs font-semibold text-navy-400">Coverage</div>
                </div>
              </div>
            </div>
            <HeroChatMockup />
          </div>
        </section>

        {/* Social proof marquee */}
        <SocialProofBar />

        {/* Feature: Increase Sales */}
        <FeatureRow
          accent="Increase Sales"
          title="Turn conversations into revenue"
          subtitle="Engage visitors with targeted messages, product recommendations, and proactive outreach that drives conversions."
          features={salesFeatures}
        />

        {/* Feature: Improve Satisfaction */}
        <FeatureRow
          accent="Improve Satisfaction"
          title="Deliver exceptional support experiences"
          subtitle="Unify every conversation in one inbox, access full customer context, and respond faster than ever."
          features={satisfactionFeatures}
          reversed
        />

        {/* Feature: AI Automation */}
        <FeatureRow
          accent="Automate with AI"
          title="Let AI handle the heavy lifting"
          subtitle="From drafting replies to building chatbots, FlowLyra's AI tools reduce repetitive work so your team can focus on what matters."
          features={aiFeatures}
        />

        {/* Integrations */}
        <IntegrationsSection />

        {/* Testimonials */}
        <TestimonialsSection />

        {/* Pricing preview */}
        <PricingPreviewSection />

        {/* Final CTA */}
        <CTASection />
      </main>

      <SiteFooter />
    </div>
  );
}

/* ================================================================
   EXPORTED: PricingPage (full standalone page)
   ================================================================ */

const pricingFaqs = [
  { q: "Can I try FlowLyra for free?", a: "Yes! Every plan comes with a 14-day free trial. No credit card required to get started." },
  { q: "What happens when I exceed my plan limits?", a: "We'll notify you before any overages occur. You can upgrade at any time, and changes take effect immediately." },
  { q: "Can I switch plans later?", a: "Absolutely. You can upgrade or downgrade at any time. Changes are prorated automatically." },
  { q: "Do you offer discounts for annual billing?", a: "Yes, annual billing saves you 20% compared to monthly billing on all paid plans." },
  { q: "Is my data secure?", a: "All data is encrypted in transit and at rest. We're SOC 2 compliant and follow industry-standard security practices." },
  { q: "What payment methods do you accept?", a: "We accept all major credit cards, ACH bank transfers, and can accommodate purchase orders for Enterprise plans." },
];

function AccordionItem({ question, answer, isOpen, onToggle }: { question: string; answer: string; isOpen: boolean; onToggle: () => void }): JSX.Element {
  const ref = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    if (ref.current) setHeight(ref.current.scrollHeight);
  }, [answer]);

  return (
    <div className="border-b border-navy-100 dark:border-navy-700/50">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-4 py-5 text-left"
        aria-expanded={isOpen}
      >
        <span className="text-sm font-bold text-navy-700 dark:text-white">{question}</span>
        <ChevronDown
          size={18}
          className={cx("shrink-0 text-navy-400 transition-transform duration-200", isOpen && "rotate-180")}
        />
      </button>
      <div className="overflow-hidden transition-all duration-300 ease-in-out" style={{ maxHeight: isOpen ? height : 0 }}>
        <div ref={ref} className="pb-5 text-sm leading-7 text-navy-500 dark:text-navy-400">{answer}</div>
      </div>
    </div>
  );
}

export function PricingPage(): JSX.Element {
  const [annual, setAnnual] = useState(true);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const plans = [
    {
      name: "Starter", audience: "Small teams", priceMonthly: "$19", priceAnnual: "$15", period: "/mo",
      features: ["1 agent seat", "Basic live chat", "Email support", "14-day chat history", "1 website"],
      cta: "Get started", highlighted: false,
    },
    {
      name: "Team", audience: "Growing support teams", priceMonthly: "$39", priceAnnual: "$31", period: "/agent/mo",
      features: ["Unlimited agents", "AI suggestions", "Integrations", "Reports & analytics", "3 websites", "1-year history", "Chatbot"],
      cta: "Start free trial", highlighted: true, badge: "Recommended",
    },
    {
      name: "Business", audience: "Established departments", priceMonthly: "$59", priceAnnual: "$47", period: "/agent/mo",
      features: ["Everything in Team", "Automation workflows", "Advanced chatbot", "AI Copilot", "5 websites", "Unlimited history", "SLA policies"],
      cta: "Start free trial", highlighted: false,
    },
    {
      name: "Enterprise", audience: "Large organizations", priceMonthly: "Custom", priceAnnual: "Custom", period: "",
      features: ["Everything in Business", "Unlimited everything", "SSO / SAML", "Dedicated support", "SLA guarantee", "Custom contracts"],
      cta: "Contact sales", highlighted: false,
    },
  ];

  return (
    <div className="min-h-screen bg-white font-sans text-navy-700 dark:bg-navy-950 dark:text-navy-100">
      <MarketingNavigation />

      <main>
        {/* Header */}
        <section className="relative overflow-hidden border-b border-navy-100/60 dark:border-navy-800/60">
          <div className="pointer-events-none absolute -left-32 top-0 h-[400px] w-[400px] rounded-full bg-brand-100/30 blur-3xl dark:bg-brand-900/10" />
          <div className="relative mx-auto max-w-7xl px-4 py-16 text-center sm:px-6 sm:py-24">
            <h1 className="font-display text-4xl font-extrabold tracking-tight text-navy-700 sm:text-5xl dark:text-white">
              Simple, transparent pricing
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-navy-500 dark:text-navy-400">
              Start free. No credit card required. Choose the plan that fits your team.
            </p>
            {/* Toggle */}
            <div className="mt-8 inline-flex items-center gap-3 rounded-xl border border-navy-100 bg-navy-50 p-1 dark:border-navy-700 dark:bg-navy-800/50">
              <button
                type="button"
                onClick={() => setAnnual(false)}
                className={cx(
                  "rounded-lg px-4 py-2 text-sm font-bold transition-all",
                  !annual ? "bg-white text-navy-700 shadow-sm dark:bg-navy-700 dark:text-white" : "text-navy-400 dark:text-navy-400"
                )}
              >
                Monthly
              </button>
              <button
                type="button"
                onClick={() => setAnnual(true)}
                className={cx(
                  "rounded-lg px-4 py-2 text-sm font-bold transition-all",
                  annual ? "bg-white text-navy-700 shadow-sm dark:bg-navy-700 dark:text-white" : "text-navy-400 dark:text-navy-400"
                )}
              >
                Annual
                <span className="ml-1.5 rounded-full bg-brand-100 px-2 py-0.5 text-xs font-bold text-brand-600 dark:bg-brand-900/30 dark:text-brand-400">Save 20%</span>
              </button>
            </div>
          </div>
        </section>

        {/* Pricing Cards */}
        <section className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 sm:py-20">
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {plans.map((plan) => (
              <Card
                key={plan.name}
                className={cx(
                  "relative flex flex-col p-6 transition-shadow dark:bg-navy-800/60 dark:border-navy-700/50",
                  plan.highlighted && "ring-2 ring-brand-400 shadow-glow dark:ring-brand-500"
                )}
              >
                {plan.badge && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand-500 px-3 py-1 text-xs font-bold text-white shadow-glow">{plan.badge}</span>
                )}
                <h3 className="font-display text-lg font-bold text-navy-700 dark:text-white">{plan.name}</h3>
                <p className="text-sm text-navy-400">{plan.audience}</p>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="font-display text-4xl font-extrabold text-navy-700 dark:text-white">
                    {annual ? plan.priceAnnual : plan.priceMonthly}
                  </span>
                  <span className="text-sm font-medium text-navy-400">{plan.period}</span>
                </div>
                <div className="mt-6 flex-1 grid gap-2.5 text-sm text-navy-500 dark:text-navy-400">
                  {plan.features.map((f) => (
                    <div key={f} className="flex items-center gap-2"><CheckCircle2 size={16} className="shrink-0 text-brand-500" />{f}</div>
                  ))}
                </div>
                <Link
                  to={plan.name === "Enterprise" ? "/contact" : "/signup"}
                  className={cx(
                    "mt-6 flex h-11 w-full items-center justify-center rounded-xl text-sm font-bold transition-all",
                    plan.highlighted
                      ? "bg-brand-500 text-white shadow-glow hover:bg-brand-600 hover:shadow-glow-lg"
                      : plan.name === "Enterprise"
                        ? "border-2 border-navy-200 bg-white text-navy-700 hover:border-navy-300 dark:border-navy-600 dark:bg-navy-800 dark:text-navy-200"
                        : "border border-navy-100 bg-white text-navy-700 hover:border-brand-200 hover:bg-brand-50 dark:border-navy-700 dark:bg-navy-800 dark:text-navy-200 dark:hover:border-brand-800"
                  )}
                >
                  {plan.cta}
                </Link>
              </Card>
            ))}
          </div>
        </section>

        {/* What's included */}
        <section className="mx-auto w-full max-w-7xl px-4 pb-16 sm:px-6">
          <Card className="p-6 sm:p-8 dark:bg-navy-800/40 dark:border-navy-700/50">
            <h3 className="font-display text-xl font-bold text-navy-700 dark:text-white">What every plan includes</h3>
            <div className="mt-5 grid gap-3 text-sm text-navy-500 sm:grid-cols-2 dark:text-navy-400">
              {[
                "Real-time messaging workspace",
                "Widget deployment and customization",
                "Routing and automation tools",
                "Analytics dashboards and exports",
                "Secure data encryption",
                "24/7 infrastructure uptime",
              ].map((item) => (
                <div key={item} className="flex items-center gap-2"><CheckCircle2 size={16} className="shrink-0 text-brand-500" />{item}</div>
              ))}
            </div>
          </Card>
        </section>

        {/* FAQ */}
        <section className="border-t border-navy-100/60 dark:border-navy-800/60">
          <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-20">
            <h2 className="font-display text-center text-3xl font-extrabold tracking-tight text-navy-700 dark:text-white">Frequently asked questions</h2>
            <div className="mt-10">
              {pricingFaqs.map((faq, i) => (
                <AccordionItem
                  key={faq.q}
                  question={faq.q}
                  answer={faq.a}
                  isOpen={openFaq === i}
                  onToggle={() => setOpenFaq(openFaq === i ? null : i)}
                />
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <CTASection />
      </main>

      <SiteFooter />
    </div>
  );
}

/* ================================================================
   PUBLIC LAYOUT (used by remaining pages)
   ================================================================ */

function PublicLayout({ title, subtitle, children }: { title: string; subtitle: string; children: JSX.Element | JSX.Element[] }): JSX.Element {
  return (
    <div className="min-h-screen bg-white text-navy-700 dark:bg-navy-950 dark:text-navy-100">
      <MarketingNavigation />

      <main>
        <section className="relative border-b border-navy-100 bg-navy-50 dark:border-navy-800 dark:bg-navy-900/30">
          <div className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-brand-100/40 blur-3xl dark:bg-brand-900/10" />
          <div className="pointer-events-none absolute right-0 top-32 h-80 w-80 rounded-full bg-brand-50/50 blur-3xl dark:bg-brand-950/10" />
          <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-14 sm:px-6 lg:grid-cols-[minmax(0,1fr)_430px] lg:items-center lg:py-20">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3 py-2 text-sm font-bold text-brand-600 dark:border-brand-800 dark:bg-brand-950/30 dark:text-brand-400"><Sparkles size={16} /> FlowLyra</div>
              <h1 className="font-display mt-5 max-w-4xl text-4xl font-extrabold tracking-[-0.04em] text-navy-700 sm:text-5xl lg:text-6xl dark:text-white">{title}</h1>
              <p className="mt-5 max-w-2xl text-base leading-8 text-navy-500 sm:text-lg dark:text-navy-400">{subtitle}</p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link to="/signup"><Button className="h-12 rounded-xl px-6 bg-brand-500 text-white hover:bg-brand-600 shadow-glow hover:shadow-glow-lg">Start free</Button></Link>
                <Link to="/product-tour"><Button variant="secondary" className="h-12 rounded-xl px-6">View product tour</Button></Link>
              </div>
            </div>
            <div className="relative">
              <div className="absolute -inset-4 rounded-[2rem] bg-brand-100/30 blur-2xl dark:bg-brand-900/10" />
              <Card className="relative overflow-hidden rounded-[2rem] border-white/80 bg-white/90 p-5 shadow-lift backdrop-blur sm:p-6 dark:bg-navy-800/80 dark:border-navy-700/50">
                <div className="flex items-center justify-between gap-3">
                  <img src={flowlyraLogo} alt="FlowLyra logo" className="h-12 w-auto" />
                  <Pill tone="green" className="rounded-full">Live</Pill>
                </div>
                <div className="mt-5 rounded-3xl bg-navy-900 p-4 text-white dark:bg-navy-950">
                  <div className="flex items-center gap-2 text-xs font-bold text-brand-300"><span className="h-2 w-2 rounded-full bg-brand-500" /> Visitor from page</div>
                  <div className="mt-4 rounded-2xl bg-white/10 p-3 text-sm">Hi, I'd like to learn more about your features.</div>
                  <div className="ml-auto mt-3 max-w-[85%] rounded-2xl bg-brand-500 p-3 text-sm shadow-lg">Of course! I can walk you through everything.</div>
                </div>
                <div className="mt-5 grid gap-2 text-sm">
                  <Metric label="Live channels" value="Web + social + email" />
                  <Metric label="Automation" value="Rules + AI assistance" />
                </div>
              </Card>
            </div>
          </div>
        </section>

        {children}
      </main>

      <footer className="border-t border-navy-100 bg-navy-900 text-navy-300 dark:border-navy-800">
        <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-4">
          <div>
            <Link to="/" className="inline-flex items-center gap-2">
              <img src={flowlyraMark} alt="" className="h-9 w-9 rounded-xl" />
              <span className="font-display text-lg font-extrabold text-white">FlowLyra</span>
            </Link>
            <p className="mt-3 text-sm leading-6 text-navy-400">Conversations that move.</p>
          </div>
          <FooterColumn title="Product" links={[{ to: "/features", label: "Features" }, { to: "/pricing", label: "Pricing" }, { to: "/product-tour", label: "Product Tour" }, { to: "/integrations", label: "Integrations" }]} />
          <FooterColumn title="Solutions" links={solutionLinks} />
          <FooterColumn title="Company" links={[{ to: "/customers", label: "Customers" }, { to: "/contact", label: "Contact" }, { to: "/help", label: "Help Center" }, { to: "/status", label: "System Status" }, { to: "/privacy", label: "Privacy" }, { to: "/terms", label: "Terms" }]} />
        </div>
        <div className="border-t border-white/5">
          <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6">
            <p className="text-center text-xs text-navy-400">&copy; {new Date().getFullYear()} FlowLyra. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ================================================================
   SHARED SECTIONS (for non-Home/Pricing pages)
   ================================================================ */

function FeatureGrid(): JSX.Element {
  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
      <div className="mb-6 flex items-center justify-between gap-3">
        <h2 className="font-display text-2xl font-extrabold tracking-tight text-navy-700 sm:text-3xl dark:text-white">Everything needed for production support operations</h2>
        <Link to="/features" className="hidden items-center gap-1 text-sm font-semibold text-brand-500 hover:text-brand-600 sm:inline-flex">All features <ChevronRight size={16} /></Link>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {coreFeatures.map((feature) => (
          <Card key={feature.title} className="p-5 dark:bg-navy-800/60 dark:border-navy-700/50">
            <div className="inline-grid h-10 w-10 place-items-center rounded-lg bg-brand-50 text-brand-500 dark:bg-brand-950/30 dark:text-brand-400"><feature.icon size={20} /></div>
            <h3 className="font-display mt-3 text-lg font-bold text-navy-700 dark:text-white">{feature.title}</h3>
            <div className="mt-3 grid gap-2">
              {feature.items.map((item) => (
                <div key={item} className="inline-flex items-center gap-2 text-sm text-navy-500 dark:text-navy-400"><CheckCircle2 size={15} className="text-brand-500" />{item}</div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}

function IntegrationsBlock(): JSX.Element {
  return (
    <section className="border-y border-navy-100 bg-white dark:border-navy-800 dark:bg-navy-900/20">
      <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
        <h2 className="font-display text-2xl font-extrabold tracking-tight text-navy-700 sm:text-3xl dark:text-white">Connect FlowLyra to your existing stack</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-navy-500 sm:text-base dark:text-navy-400">Prebuilt integrations and webhook-ready APIs keep your data in sync.</p>
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {integrationsList.map((item) => (
            <div key={item} className="rounded-lg border border-navy-100 bg-navy-50 px-3 py-3 text-center text-sm font-semibold text-navy-500 dark:border-navy-700 dark:bg-navy-800/40 dark:text-navy-400">{item}</div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTASectionInner(): JSX.Element {
  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
      <Card className="overflow-hidden bg-gradient-to-br from-brand-500 to-brand-700 p-8 text-white dark:from-brand-600 dark:to-brand-800">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div>
            <h2 className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">Launch-ready customer operations</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-brand-100 sm:text-base">Deploy FlowLyra with production routing, analytics, and multi-team collaboration.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link to="/signup"><Button className="bg-white text-brand-600 hover:bg-brand-50 border-0">Start free trial</Button></Link>
            <Link to="/contact"><Button variant="secondary" className="border-white/30 bg-white/10 text-white hover:bg-white/20">Talk to sales</Button></Link>
          </div>
        </div>
      </Card>
    </section>
  );
}

/* ================================================================
   REMAINING EXPORTED PAGES
   ================================================================ */

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
            <Card className="p-6 dark:bg-navy-800/60 dark:border-navy-700/50">
              <h3 className="font-display text-xl font-bold text-navy-700 dark:text-white">Team management</h3>
              <p className="mt-2 text-sm leading-6 text-navy-500 dark:text-navy-400">Groups, roles, workload controls, and routing logic keep agents efficient and conversations assigned correctly.</p>
              <div className="mt-4 grid gap-2 text-sm text-navy-500 dark:text-navy-400">
                <div className="inline-flex items-center gap-2"><Users size={16} className="text-brand-500" />Agent roles and permissions</div>
                <div className="inline-flex items-center gap-2"><Layers3 size={16} className="text-brand-500" />Multi-team routing groups</div>
                <div className="inline-flex items-center gap-2"><LifeBuoy size={16} className="text-brand-500" />Escalation-safe transfer flow</div>
              </div>
            </Card>
            <Card className="p-6 dark:bg-navy-800/60 dark:border-navy-700/50">
              <h3 className="font-display text-xl font-bold text-navy-700 dark:text-white">Platform reliability</h3>
              <p className="mt-2 text-sm leading-6 text-navy-500 dark:text-navy-400">Production environments need observability, consistency, and secure controls by default.</p>
              <div className="mt-4 grid gap-2 text-sm text-navy-500 dark:text-navy-400">
                <div className="inline-flex items-center gap-2"><Lock size={16} className="text-brand-500" />Role-based access boundaries</div>
                <div className="inline-flex items-center gap-2"><Network size={16} className="text-brand-500" />API + widget integration patterns</div>
                <div className="inline-flex items-center gap-2"><Headphones size={16} className="text-brand-500" />Operational workflows for busy teams</div>
              </div>
            </Card>
          </div>
        </section>
        <CTASectionInner />
      </>
    </PublicLayout>
  );
}

function SolutionPage({ title, subtitle, points }: { title: string; subtitle: string; points: Array<{ icon: JSX.Element; title: string; detail: string }> }): JSX.Element {
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
              <Card key={point.title} className="p-5 dark:bg-navy-800/60 dark:border-navy-700/50">
                <div className="inline-grid h-10 w-10 place-items-center rounded-lg bg-brand-50 text-brand-500 dark:bg-brand-950/30 dark:text-brand-400">{point.icon}</div>
                <h3 className="font-display mt-3 text-lg font-bold text-navy-700 dark:text-white">{point.title}</h3>
                <p className="mt-2 text-sm leading-6 text-navy-500 dark:text-navy-400">{point.detail}</p>
              </Card>
            ))}
          </div>
        </section>
        <CTASectionInner />
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
        { icon: <LineChart size={20} />, title: "Quality tracking", detail: "Monitor CSAT, wait time, and resolution patterns to improve team-level performance." },
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
        { icon: <LineChart size={20} />, title: "Conversion analytics", detail: "Track chat-driven outcomes and tune scripts, routing, and handoff workflows." },
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
        { icon: <Users size={20} />, title: "Large-team operations", detail: "Coordinate many teams with clear ownership, routing, and escalation patterns." },
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
            <Card className="p-6 dark:bg-navy-800/60 dark:border-navy-700/50">
              <h3 className="font-display text-xl font-bold text-navy-700 dark:text-white">Marketplace integrations</h3>
              <p className="mt-2 text-sm leading-6 text-navy-500 dark:text-navy-400">Quickly connect tools already used by support, marketing, and commerce teams.</p>
            </Card>
            <Card className="p-6 dark:bg-navy-800/60 dark:border-navy-700/50">
              <h3 className="font-display text-xl font-bold text-navy-700 dark:text-white">Developer-friendly APIs</h3>
              <p className="mt-2 text-sm leading-6 text-navy-500 dark:text-navy-400">Use webhooks and APIs for custom workflows, event pipelines, and enterprise sync jobs.</p>
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
              { stat: "24/7", label: "Always-on customer coverage through asynchronous messaging" },
            ].map((item) => (
              <Card key={item.label} className="p-6 text-center dark:bg-navy-800/60 dark:border-navy-700/50">
                <div className="font-display text-4xl font-extrabold gradient-text">{item.stat}</div>
                <p className="mt-2 text-sm text-navy-500 dark:text-navy-400">{item.label}</p>
              </Card>
            ))}
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {testimonials.map((t) => (
              <Card key={t.name} className="p-6 dark:bg-navy-800/60 dark:border-navy-700/50">
                <div className="flex gap-0.5">
                  {Array.from({ length: t.rating }).map((_, i) => <Star key={i} size={14} className="fill-brand-400 text-brand-400" />)}
                </div>
                <p className="mt-3 text-sm leading-6 text-navy-600 dark:text-navy-300">&ldquo;{t.quote}&rdquo;</p>
                <div className="mt-3 text-sm font-bold text-navy-700 dark:text-white">{t.name}</div>
                <div className="text-xs text-navy-400">{t.role}, {t.company}</div>
              </Card>
            ))}
          </div>
        </section>
        <CTASectionInner />
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
            {[
              { title: "Operator workspace", desc: "Inbox, tickets, contacts, and unified chat handling for day-to-day operations." },
              { title: "Admin console", desc: "Routing, triggers, widget config, team management, and install controls." },
              { title: "Analytics and quality", desc: "Track response speed, CSAT, staffing pressure, and team output trends." },
              { title: "Deployment readiness", desc: "Widget embed snippets, API endpoints, and environment templates for production rollout." },
            ].map((item) => (
              <Card key={item.title} className="p-6 dark:bg-navy-800/60 dark:border-navy-700/50">
                <h3 className="font-display text-xl font-bold text-navy-700 dark:text-white">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-navy-500 dark:text-navy-400">{item.desc}</p>
              </Card>
            ))}
          </div>
        </section>
      </>
    </PublicLayout>
  );
}

function FAQCard({ q, a }: { q: string; a: string }): JSX.Element {
  return (
    <Card className="p-6 dark:bg-navy-800/60 dark:border-navy-700/50">
      <h3 className="font-display text-lg font-bold text-navy-700 dark:text-white">{q}</h3>
      <p className="mt-2 text-sm leading-6 text-navy-500 dark:text-navy-400">{a}</p>
    </Card>
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
      await api.post("/public/contact", { full_name: fullName, email, company: company || undefined, message });
      toast.success("Request sent");
      setFullName(""); setEmail(""); setCompany(""); setMessage("");
    } catch {
      toast.error("Could not send request");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PublicLayout title="Contact FlowLyra" subtitle="Speak with product and implementation support for pricing, migration, and production launch planning.">
      <>
        <section className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
          <Card className="p-6 sm:p-7 dark:bg-navy-800/60 dark:border-navy-700/50">
            <form onSubmit={(event) => void submit(event)}>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2 text-sm font-semibold text-navy-600 dark:text-navy-300">
                  Full name
                  <input required className="h-10 rounded-lg border border-navy-200 bg-white px-3 dark:border-navy-600 dark:bg-navy-800 dark:text-white" placeholder="Your name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
                </label>
                <label className="grid gap-2 text-sm font-semibold text-navy-600 dark:text-navy-300">
                  Work email
                  <input required type="email" className="h-10 rounded-lg border border-navy-200 bg-white px-3 dark:border-navy-600 dark:bg-navy-800 dark:text-white" placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} />
                </label>
              </div>
              <label className="mt-4 grid gap-2 text-sm font-semibold text-navy-600 dark:text-navy-300">
                Company
                <input className="h-10 rounded-lg border border-navy-200 bg-white px-3 dark:border-navy-600 dark:bg-navy-800 dark:text-white" placeholder="Company name" value={company} onChange={(e) => setCompany(e.target.value)} />
              </label>
              <label className="mt-4 grid gap-2 text-sm font-semibold text-navy-600 dark:text-navy-300">
                Message
                <textarea required minLength={10} className="min-h-28 rounded-lg border border-navy-200 bg-white px-3 py-2 dark:border-navy-600 dark:bg-navy-800 dark:text-white" placeholder="Tell us what you need" value={message} onChange={(e) => setMessage(e.target.value)} />
              </label>
              <Button type="submit" disabled={submitting} className="mt-5 bg-brand-500 text-white hover:bg-brand-600">{submitting ? "Sending..." : "Send request"}</Button>
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
      .then(({ data }) => { if (!alive) return; setIncidents(data.items || []); })
      .catch(() => { if (!alive) return; setIncidents([]); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  const active = incidents.filter((item) => item.status !== "resolved");
  const stateText = loading ? "Checking..." : active.length ? `${active.length} active incident${active.length === 1 ? "" : "s"}` : "All systems operational";

  return (
    <PublicLayout title="System status" subtitle="Current service health for chat delivery, widget infrastructure, and API platform.">
      <>
        <section className="mx-auto w-full max-w-4xl px-4 py-12 sm:px-6 sm:py-16">
          <Card className="p-6 dark:bg-navy-800/60 dark:border-navy-700/50">
            <div className={cx("inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold", active.length ? "bg-amber-50 text-amber-800" : "bg-green-50 text-green-700")}>
              <CheckCircle2 size={16} /> {stateText}
            </div>
            <div className="mt-5 grid gap-3 text-sm">
              {["Realtime chat", "Widget CDN", "REST API", "Agent dashboard"].map((s) => <Metric key={s} label={s} value="Operational" />)}
            </div>
            <div className="mt-6 grid gap-3">
              {incidents.length === 0 && !loading ? <div className="text-sm text-navy-400">No incidents published recently.</div> : null}
              {incidents.map((incident) => (
                <div key={incident.id} className="rounded-xl border border-navy-100 bg-navy-50 p-4 dark:border-navy-700 dark:bg-navy-900/40">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-bold text-navy-700 dark:text-white">{incident.title}</span>
                    <span className="rounded-full bg-navy-900 px-2 py-1 text-[11px] font-bold uppercase text-white dark:bg-navy-700">{incident.status}</span>
                    <span className="rounded-full border border-navy-200 px-2 py-1 text-[11px] font-bold uppercase text-navy-500 dark:border-navy-600">{incident.impact}</span>
                  </div>
                  {incident.body ? <p className="mt-2 text-sm leading-6 text-navy-600 dark:text-navy-300">{incident.body}</p> : null}
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
      .then(({ data }) => { if (!alive) return; setPosts(data.items || []); })
      .catch(() => { if (!alive) return; setPosts([]); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  return (
    <PublicLayout title="FlowLyra blog" subtitle="Product updates, operational playbooks, and support/sales best practices.">
      <>
        <section className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
          <div className="grid gap-4">
            {loading ? <Card className="p-6 text-sm text-navy-400 dark:bg-navy-800/60 dark:border-navy-700/50">Loading posts...</Card> : null}
            {!loading && posts.length === 0 ? <Card className="p-6 text-sm text-navy-400 dark:bg-navy-800/60 dark:border-navy-700/50">No posts published yet.</Card> : null}
            {posts.map((post) => (
              <Card key={post.id} className="p-6 dark:bg-navy-800/60 dark:border-navy-700/50">
                <div className="text-xs font-bold uppercase text-navy-400">{post.published_at ? formatDate(post.published_at) : "Draft"}</div>
                <h2 className="font-display mt-2 text-2xl font-bold text-navy-700 dark:text-white"><Link to={`/blog/${post.slug}`} className="hover:underline">{post.title}</Link></h2>
                <p className="mt-2 text-sm leading-7 text-navy-500 dark:text-navy-400">{post.excerpt || "No excerpt provided."}</p>
                {post.tags.length ? <div className="mt-3 flex flex-wrap gap-2">{post.tags.map((tag) => <span key={tag} className="rounded-full border border-brand-200 bg-brand-50 px-2 py-1 text-xs font-bold text-brand-600 dark:border-brand-800 dark:bg-brand-950/30 dark:text-brand-400">{tag}</span>)}</div> : null}
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
    if (!slug) return () => { alive = false; };
    void api.get<{ item: PublicBlogPost }>(`/public/blog/posts/${slug}`)
      .then(({ data }) => { if (!alive) return; setPost(data.item ?? null); })
      .catch(() => { if (!alive) return; setPost(null); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [slug]);

  return (
    <PublicLayout title={post?.title || "Blog article"} subtitle={post?.excerpt || "Latest updates from the FlowLyra team."}>
      <>
        <section className="mx-auto w-full max-w-4xl px-4 py-12 sm:px-6 sm:py-16">
          {loading ? <Card className="p-6 text-sm text-navy-400">Loading article...</Card> : null}
          {!loading && !post ? <Card className="p-6 text-sm text-navy-400">Article not found.</Card> : null}
          {post ? (
            <Card className="p-6 sm:p-8 dark:bg-navy-800/60 dark:border-navy-700/50">
              <div className="text-xs font-bold uppercase text-navy-400">{post.published_at ? formatDate(post.published_at) : "Draft"}</div>
              <h1 className="font-display mt-2 text-3xl font-bold tracking-tight text-navy-700 dark:text-white">{post.title}</h1>
              {post.tags.length ? <div className="mt-3 flex flex-wrap gap-2">{post.tags.map((tag) => <span key={tag} className="rounded-full border border-brand-200 bg-brand-50 px-2 py-1 text-xs font-bold text-brand-600">{tag}</span>)}</div> : null}
              <div className="prose prose-slate mt-6 max-w-none dark:prose-invert">
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
    <PublicLayout title="Privacy policy" subtitle="How FlowLyra handles customer and operational data in the platform.">
      <section className="mx-auto w-full max-w-4xl px-4 py-12 sm:px-6 sm:py-16">
        <Card className="grid gap-4 p-6 text-sm leading-7 text-navy-600 dark:bg-navy-800/60 dark:border-navy-700/50 dark:text-navy-300">
          <h2 className="font-display text-xl font-bold text-navy-700 dark:text-white">Data handling principles</h2>
          <p>FlowLyra processes support conversation data, operator metadata, and configuration settings to provide service functionality and reporting.</p>
          <p>Data is accessed according to role-based permissions, and operational access should be restricted to authorized staff only.</p>
          <p>For production use, customers should configure retention policies and compliance workflows based on their legal requirements.</p>
        </Card>
      </section>
    </PublicLayout>
  );
}

export function TermsPage(): JSX.Element {
  return (
    <PublicLayout title="Terms of service" subtitle="Core service usage terms for teams operating FlowLyra in production environments.">
      <section className="mx-auto w-full max-w-4xl px-4 py-12 sm:px-6 sm:py-16">
        <Card className="grid gap-4 p-6 text-sm leading-7 text-navy-600 dark:bg-navy-800/60 dark:border-navy-700/50 dark:text-navy-300">
          <h2 className="font-display text-xl font-bold text-navy-700 dark:text-white">Service terms overview</h2>
          <p>Users are responsible for lawful use of messaging channels, data processing, and customer communication practices.</p>
          <p>Account owners manage team permissions, billing obligations, and integration usage under their organization workspace.</p>
          <p>FlowLyra may update platform functionality over time to maintain reliability, security, and product quality.</p>
        </Card>
      </section>
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
      await signup({ full_name: fullName, email, password, organization_name: organizationName, organization_slug: organizationSlug || undefined });
      navigate("/inbox");
    } catch {
      setError("Signup failed. Please review your details and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PublicLayout title="Start your FlowLyra trial" subtitle="Create your workspace and deploy a production-ready support flow in minutes.">
      <>
        <section className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
          <Card className="p-6 sm:p-7 dark:bg-navy-800/60 dark:border-navy-700/50">
            {error && <div className="mb-4 rounded-xl bg-danger-50 p-3 text-sm font-semibold text-danger-500">{error}</div>}
            <form onSubmit={(event) => void submit(event)}>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2 text-sm font-semibold text-navy-600 dark:text-navy-300">
                  Full name
                  <input required className="h-10 rounded-lg border border-navy-200 bg-white px-3 dark:border-navy-600 dark:bg-navy-800 dark:text-white" placeholder="Your name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
                </label>
                <label className="grid gap-2 text-sm font-semibold text-navy-600 dark:text-navy-300">
                  Work email
                  <input required type="email" className="h-10 rounded-lg border border-navy-200 bg-white px-3 dark:border-navy-600 dark:bg-navy-800 dark:text-white" placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} />
                </label>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2 text-sm font-semibold text-navy-600 dark:text-navy-300">
                  Company
                  <input required className="h-10 rounded-lg border border-navy-200 bg-white px-3 dark:border-navy-600 dark:bg-navy-800 dark:text-white" placeholder="Company name" value={organizationName} onChange={(e) => setOrganizationName(e.target.value)} />
                </label>
                <label className="grid gap-2 text-sm font-semibold text-navy-600 dark:text-navy-300">
                  Workspace slug
                  <input className="h-10 rounded-lg border border-navy-200 bg-white px-3 dark:border-navy-600 dark:bg-navy-800 dark:text-white" placeholder="my-company" value={organizationSlug} onChange={(e) => setOrganizationSlug(e.target.value)} />
                </label>
              </div>
              <label className="mt-4 grid gap-2 text-sm font-semibold text-navy-600 dark:text-navy-300">
                Password
                <input required type="password" minLength={8} className="h-10 rounded-lg border border-navy-200 bg-white px-3 dark:border-navy-600 dark:bg-navy-800 dark:text-white" placeholder="Min. 8 characters" value={password} onChange={(e) => setPassword(e.target.value)} />
              </label>
              <Button type="submit" disabled={submitting} className="mt-5 w-full bg-brand-500 text-white hover:bg-brand-600">{submitting ? "Creating workspace..." : "Create free account"}</Button>
            </form>
          </Card>
        </section>
      </>
    </PublicLayout>
  );
}

export function NotFoundPage(): JSX.Element {
  return (
    <PublicLayout title="404" subtitle="The page you're looking for doesn't exist.">
      <section className="mx-auto grid max-w-md place-items-center px-4 py-20 text-center">
        <div className="font-display text-8xl font-extrabold gradient-text">404</div>
        <p className="mt-4 text-navy-500 dark:text-navy-400">This page could not be found. Check the URL or head back to the homepage.</p>
        <Link to="/" className="mt-6 inline-flex h-11 items-center gap-2 rounded-xl bg-brand-500 px-5 text-sm font-bold text-white hover:bg-brand-600">Back to homepage</Link>
      </section>
    </PublicLayout>
  );
}

/* ================================================================
   UTILITIES
   ================================================================ */

function renderMarkdownAsParagraphs(markdown: string): JSX.Element[] {
  return markdown.split(/\n\n+/).map((block, i) => {
    if (block.startsWith("### ")) return <h3 key={i} className="font-display mt-6 text-lg font-bold text-navy-700 dark:text-white">{block.replace("### ", "")}</h3>;
    if (block.startsWith("## ")) return <h2 key={i} className="font-display mt-8 text-xl font-bold text-navy-700 dark:text-white">{block.replace("## ", "")}</h2>;
    if (block.startsWith("# ")) return <h1 key={i} className="font-display mt-8 text-2xl font-bold text-navy-700 dark:text-white">{block.replace("# ", "")}</h1>;
    return <p key={i} className="mt-3 leading-7 text-navy-500 dark:text-navy-400">{block.replace(/\n/g, "<br />")}</p>;
  });
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}
